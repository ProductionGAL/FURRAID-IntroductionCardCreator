import {
  ArrowsOutCardinal,
  Check,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react"
import { useRef } from "react"
import { clampPan, getDisplayBox } from "../lib/crop"
import type { PhotoCrop, Point } from "../model"
import { Button } from "./Primitives"

type DragState = {
  readonly pointerId: number
  readonly startClient: Point
  readonly startPan: Point
}

type CropEditorProps = {
  readonly photo: PhotoCrop
  readonly onChange: (photo: PhotoCrop) => void
  readonly onDone: () => void
}

export const CropEditor = ({ photo, onChange, onDone }: CropEditorProps) => {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const display = getDisplayBox(photo)

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPan: photo.pan,
    }
  }

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current
    const viewport = viewportRef.current
    if (!drag || drag.pointerId !== event.pointerId || !viewport) return
    const size = viewport.clientWidth
    const pan = clampPan(photo, {
      x: drag.startPan.x + (event.clientX - drag.startClient.x) / size,
      y: drag.startPan.y + (event.clientY - drag.startClient.y) / size,
    })
    onChange({ ...photo, pan })
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  const setZoom = (zoom: number): void => {
    onChange({ ...photo, zoom, pan: clampPan(photo, photo.pan, zoom) })
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
      <div className="zoom-control">
        <MagnifyingGlassMinus aria-hidden size={18} weight="light" />
        <label className="sr-only" htmlFor="photo-zoom">
          사진 확대 비율
        </label>
        <input
          id="photo-zoom"
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={photo.zoom}
          onChange={(event) => setZoom(event.currentTarget.valueAsNumber)}
        />
        <MagnifyingGlassPlus aria-hidden size={18} weight="light" />
      </div>
      <p className="helper-text">사진을 끌어 위치를 맞추고, 슬라이더로 확대하세요.</p>
      <Button type="button" variant="primary" className="button--full" onClick={onDone}>
        <Check aria-hidden size={18} weight="bold" />이 위치로 적용
      </Button>
    </section>
  )
}
