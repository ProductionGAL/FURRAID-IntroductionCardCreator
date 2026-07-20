import { toCanvas } from "html-to-image"

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
  for (const element of clonedNode.querySelectorAll("[id]")) element.removeAttribute("id")
  synchronizeFormValues(source, clonedNode)
  host.append(clonedNode)
  document.body.append(host)
  return { host, editor: clonedNode }
}

type RenderInput = {
  readonly canvas: HTMLCanvasElement
  readonly frameUrl: string
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
    const [editorCanvas, frame] = await Promise.all([
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
    ])
    context.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
    context.drawImage(frame, 0, 0, CARD_WIDTH, CARD_HEIGHT)
    context.drawImage(editorCanvas, 0, 0, EDITABLE_WIDTH, CARD_HEIGHT)
  } finally {
    host.remove()
  }
}
