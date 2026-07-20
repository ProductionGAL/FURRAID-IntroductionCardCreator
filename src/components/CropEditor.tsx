import { ArrowsOutCardinal, Check } from "@phosphor-icons/react"
import { useEffect, useRef } from "react"
import { clampPan, getDisplayBox, zoomPhotoAt } from "../lib/crop"
import type { PhotoCrop, Point } from "../model"
import { Button } from "./Primitives"

type DragState = {
  readonly kind: "drag"
  readonly pointerId: number
  readonly startClient: Point
  readonly startPan: Point
}

type PinchState = {
  readonly kind: "pinch"
  readonly pointerIds: readonly [number, number]
  readonly startDistance: number
  readonly startMidpoint: Point
  readonly startPhoto: PhotoCrop
}

type GestureState = DragState | PinchState

type CropEditorProps = {
  readonly photo: PhotoCrop
  readonly onChange: (photo: PhotoCrop) => void
  readonly onDone: () => void
}

export const CropEditor = ({ photo, onChange, onDone }: CropEditorProps) => {
  const viewportRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const gestureRef = useRef<GestureState | null>(null)
  const workingPhotoRef = useRef(photo)
  const onChangeRef = useRef(onChange)
  workingPhotoRef.current = photo
  onChangeRef.current = onChange
  const display = getDisplayBox(photo)

  const applyPhoto = (nextPhoto: PhotoCrop): void => {
    workingPhotoRef.current = nextPhoto
    onChangeRef.current(nextPhoto)
  }

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const bounds = viewport.getBoundingClientRect()
      const deltaUnit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1
      const focalPoint = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      }
      const currentPhoto = workingPhotoRef.current
      const zoom = currentPhoto.zoom * Math.exp(-event.deltaY * deltaUnit * 0.0015)
      const nextPhoto = zoomPhotoAt(currentPhoto, zoom, focalPoint)
      workingPhotoRef.current = nextPhoto
      onChangeRef.current(nextPhoto)
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", handleWheel)
  }, [])

  const getPinchState = (): PinchState | null => {
    const viewport = viewportRef.current
    const entries = [...pointersRef.current.entries()]
    if (!viewport || entries.length < 2) return null
    const firstEntry = entries[0]
    const secondEntry = entries[1]
    if (!firstEntry || !secondEntry) return null
    const [firstId, first] = firstEntry
    const [secondId, second] = secondEntry
    const bounds = viewport.getBoundingClientRect()

    return {
      kind: "pinch",
      pointerIds: [firstId, secondId],
      startDistance: Math.hypot(second.x - first.x, second.y - first.y),
      startMidpoint: {
        x: ((first.x + second.x) / 2 - bounds.left) / bounds.width,
        y: ((first.y + second.y) / 2 - bounds.top) / bounds.height,
      },
      startPhoto: workingPhotoRef.current,
    }
  }

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const pinch = getPinchState()
    if (pinch) {
      gestureRef.current = pinch
      return
    }

    gestureRef.current = {
      kind: "drag",
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPan: workingPhotoRef.current.pan,
    }
  }

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const gesture = gestureRef.current
    const viewport = viewportRef.current
    if (!gesture || !viewport) return
    const bounds = viewport.getBoundingClientRect()
    const size = bounds.width

    if (gesture.kind === "pinch") {
      const [firstId, secondId] = gesture.pointerIds
      const first = pointersRef.current.get(firstId)
      const second = pointersRef.current.get(secondId)
      if (!first || !second || gesture.startDistance === 0) return
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      const midpoint = {
        x: ((first.x + second.x) / 2 - bounds.left) / bounds.width,
        y: ((first.y + second.y) / 2 - bounds.top) / bounds.height,
      }
      const zoomed = zoomPhotoAt(
        gesture.startPhoto,
        gesture.startPhoto.zoom * (distance / gesture.startDistance),
        gesture.startMidpoint,
      )
      const pan = clampPan(
        zoomed,
        {
          x: zoomed.pan.x + midpoint.x - gesture.startMidpoint.x,
          y: zoomed.pan.y + midpoint.y - gesture.startMidpoint.y,
        },
        zoomed.zoom,
      )
      applyPhoto({ ...zoomed, pan })
      return
    }

    if (gesture.pointerId !== event.pointerId) return
    const pan = clampPan(workingPhotoRef.current, {
      x: gesture.startPan.x + (event.clientX - gesture.startClient.x) / size,
      y: gesture.startPan.y + (event.clientY - gesture.startClient.y) / size,
    })
    applyPhoto({ ...workingPhotoRef.current, pan })
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    pointersRef.current.delete(event.pointerId)
    const remaining = [...pointersRef.current.entries()]
    if (remaining.length >= 2) {
      gestureRef.current = getPinchState()
      return
    }
    if (remaining.length === 1) {
      const remainingPointer = remaining[0]
      if (!remainingPointer) return
      const [pointerId, point] = remainingPointer
      gestureRef.current = {
        kind: "drag",
        pointerId,
        startClient: point,
        startPan: workingPhotoRef.current.pan,
      }
      return
    }
    gestureRef.current = null
  }

  const zoomFromKeyboard = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const direction = event.key === "+" || event.key === "=" ? 1 : event.key === "-" ? -1 : 0
    if (direction === 0) return
    event.preventDefault()
    const currentPhoto = workingPhotoRef.current
    applyPhoto(zoomPhotoAt(currentPhoto, currentPhoto.zoom + direction * 0.15, { x: 0.5, y: 0.5 }))
  }

  return (
    <section className="crop-editor" aria-labelledby="crop-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">1:1 CROP</span>
          <h3 id="crop-title">사진 위치 맞추기</h3>
        </div>
        <ArrowsOutCardinal aria-hidden size={20} weight="light" />
      </div>
      <div
        ref={viewportRef}
        className="crop-viewport"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={zoomFromKeyboard}
        tabIndex={0}
        role="slider"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={photo.zoom}
        aria-valuetext={`${photo.zoom.toFixed(2)}배 확대`}
        aria-label="사진 크롭. 드래그로 위치를 옮기고, 두 손가락 핀치나 마우스 휠로 확대 또는 축소하세요. 키보드는 더하기와 빼기 키를 사용할 수 있습니다."
      >
        <img
          src={photo.url}
          alt=""
          draggable={false}
          style={{
            width: `${display.width * 100}%`,
            height: `${display.height * 100}%`,
            left: `${display.left * 100}%`,
            top: `${display.top * 100}%`,
          }}
        />
        <div className="crop-viewport__grid" aria-hidden />
        <span className="sr-only">사진을 손가락이나 마우스로 끌어 위치를 조정하세요.</span>
      </div>
      <p className="helper-text">
        <span className="helper-text__desktop">드래그로 위치 이동 · 마우스 휠로 확대/축소</span>
        <span className="helper-text__mobile">드래그로 위치 이동 · 두 손가락으로 확대/축소</span>
      </p>
      <Button type="button" variant="primary" className="button--full" onClick={onDone}>
        <Check aria-hidden size={18} weight="bold" />이 위치로 적용
      </Button>
    </section>
  )
}
