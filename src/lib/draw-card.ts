import { toCanvas } from "html-to-image"
import type { PhotoCrop } from "../model"
import { getSourceCrop } from "./crop"

export const CARD_WIDTH = 1380
export const CARD_HEIGHT = 2167
const EDITABLE_WIDTH = 1200

class ImageLoadError extends Error {
  readonly source: string

  constructor(source: string) {
    super("이미지를 불러오지 못했습니다.")
    this.name = "ImageLoadError"
    this.source = source
  }
}

const loadImage = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => {
      void image.decode().then(
        () => resolve(image),
        () => reject(new ImageLoadError(source)),
      )
    }
    image.onerror = () => reject(new ImageLoadError(source))
    image.src = source
  })

const getLoadedPhoto = (source: HTMLElement, photo: PhotoCrop): Promise<HTMLImageElement> => {
  const image = source.querySelector<HTMLImageElement>(".inline-card__photo img")
  if (!image || image.src !== photo.url) return Promise.reject(new ImageLoadError(photo.url))

  const isCurrentPhoto = (): boolean =>
    image.src === photo.url &&
    image.naturalWidth === photo.width &&
    image.naturalHeight === photo.height

  if (image.complete) {
    return isCurrentPhoto() ? Promise.resolve(image) : Promise.reject(new ImageLoadError(photo.url))
  }

  return new Promise((resolve, reject) => {
    const handleLoad = (): void => {
      cleanup()
      if (isCurrentPhoto()) resolve(image)
      else reject(new ImageLoadError(photo.url))
    }
    const handleError = (): void => {
      cleanup()
      reject(new ImageLoadError(photo.url))
    }
    const cleanup = (): void => {
      image.removeEventListener("load", handleLoad)
      image.removeEventListener("error", handleError)
    }
    image.addEventListener("load", handleLoad)
    image.addEventListener("error", handleError)
  })
}

const synchronizeFormValues = (source: HTMLElement, clone: HTMLElement): void => {
  const sourceInputs = source.querySelectorAll("input")
  const clonedInputs = clone.querySelectorAll("input")
  for (const [index, sourceInput] of sourceInputs.entries()) {
    const clonedInput = clonedInputs.item(index)
    if (!clonedInput) continue
    clonedInput.checked = sourceInput.checked
    if (sourceInput.checked) clonedInput.setAttribute("checked", "")
    else clonedInput.removeAttribute("checked")
    if (sourceInput.type === "file") continue
    clonedInput.value = sourceInput.value
    clonedInput.setAttribute("value", sourceInput.value)
  }

  const sourceTextareas = source.querySelectorAll("textarea")
  const clonedTextareas = clone.querySelectorAll("textarea")
  for (const [index, sourceTextarea] of sourceTextareas.entries()) {
    const clonedTextarea = clonedTextareas.item(index)
    if (!clonedTextarea) continue
    clonedTextarea.value = sourceTextarea.value
    clonedTextarea.textContent = sourceTextarea.value
  }
}

const createNativeEditorClone = (
  source: HTMLElement,
): { readonly host: HTMLDivElement; readonly editor: HTMLElement } => {
  const clonedNode = source.cloneNode(true)
  if (!(clonedNode instanceof HTMLElement))
    throw new TypeError("카드 편집 영역을 복제하지 못했습니다.")

  const host = document.createElement("div")
  Object.assign(host.style, {
    position: "fixed",
    top: "0",
    left: "-100000px",
    width: `${EDITABLE_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
  })
  clonedNode.style.width = `${EDITABLE_WIDTH}px`
  clonedNode.style.height = `${CARD_HEIGHT}px`
  clonedNode.style.background = "transparent"
  clonedNode.setAttribute("aria-hidden", "true")
  clonedNode.inert = true
  clonedNode.querySelector(".inline-card__frame")?.remove()
  clonedNode.querySelector(".inline-card__photo")?.remove()
  for (const element of clonedNode.querySelectorAll("[id]")) element.removeAttribute("id")
  synchronizeFormValues(source, clonedNode)
  host.append(clonedNode)
  document.body.append(host)
  return { host, editor: clonedNode }
}

type RenderInput = {
  readonly canvas: HTMLCanvasElement
  readonly frameUrl: string
  readonly photo: PhotoCrop
  readonly source: HTMLElement
}

export const renderCard = async (input: RenderInput): Promise<void> => {
  const context = input.canvas.getContext("2d")
  if (!context) throw new TypeError("2D canvas context is unavailable")

  input.canvas.width = CARD_WIDTH
  input.canvas.height = CARD_HEIGHT
  await document.fonts.ready
  const { host, editor } = createNativeEditorClone(input.source)

  try {
    const [editorCanvas, frame, photo] = await Promise.all([
      toCanvas(editor, {
        width: EDITABLE_WIDTH,
        height: CARD_HEIGHT,
        canvasWidth: EDITABLE_WIDTH,
        canvasHeight: CARD_HEIGHT,
        pixelRatio: 1,
        preferredFontFormat: "woff2",
        skipAutoScale: true,
      }),
      loadImage(input.frameUrl),
      getLoadedPhoto(input.source, input.photo),
    ])
    const crop = getSourceCrop(input.photo)
    context.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
    context.drawImage(frame, 0, 0, CARD_WIDTH, CARD_HEIGHT)
    context.drawImage(
      photo,
      crop.sourceX,
      crop.sourceY,
      crop.sourceSize,
      crop.sourceSize,
      0,
      0,
      EDITABLE_WIDTH,
      EDITABLE_WIDTH,
    )
    context.drawImage(editorCanvas, 0, 0, EDITABLE_WIDTH, CARD_HEIGHT)
  } finally {
    host.remove()
  }
}
