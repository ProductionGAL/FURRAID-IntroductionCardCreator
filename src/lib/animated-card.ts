import type { ParsedFrameWithoutPatch, ParsedGif } from "gifuct-js"
import { decompressFrame, parseGIF } from "gifuct-js"
import type { PhotoCrop } from "../model"
import { getSourceCrop } from "./crop"
import { CARD_HEIGHT, CARD_WIDTH, drawCardFrame, prepareCardLayers } from "./draw-card"
import { createGifFrameEncoder } from "./gif-encoder"

const PHOTO_OUTPUT_SIZE = 1200

type SourceGifFrame = Extract<ParsedGif["frames"][number], { image: unknown }>

type AnimatedCardInput = {
  readonly canvas: HTMLCanvasElement
  readonly frameUrl: string
  readonly photo: PhotoCrop
  readonly source: HTMLElement
  readonly onProgress?: (progress: number) => void
}

type PreviousFrame = {
  readonly disposalType: number
  readonly dims: ParsedFrameWithoutPatch["dims"]
  readonly restore: ImageData | null
}

export class GifDecodeError extends Error {
  constructor() {
    super("GIF 애니메이션을 읽지 못했습니다.")
    this.name = "GifDecodeError"
  }
}

const isSourceGifFrame = (frame: ParsedGif["frames"][number]): frame is SourceGifFrame =>
  "image" in frame

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

const getContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new TypeError("2D canvas context is unavailable")
  return context
}

const applyPreviousDisposal = (
  context: CanvasRenderingContext2D,
  previous: PreviousFrame | null,
): void => {
  if (!previous) return
  if (previous.disposalType === 2) {
    context.clearRect(
      previous.dims.left,
      previous.dims.top,
      previous.dims.width,
      previous.dims.height,
    )
  } else if (previous.disposalType === 3 && previous.restore) {
    context.putImageData(previous.restore, 0, 0)
  }
}

type DrawGifPatchInput = {
  readonly context: CanvasRenderingContext2D
  readonly patchCanvas: HTMLCanvasElement
  readonly patchContext: CanvasRenderingContext2D
  readonly frame: ParsedFrameWithoutPatch
}

const drawGifPatch = (input: DrawGifPatchInput): void => {
  const { dims } = input.frame
  input.patchCanvas.width = dims.width
  input.patchCanvas.height = dims.height
  const rgba = new Uint8ClampedArray(dims.width * dims.height * 4)

  for (const [index, paletteIndex] of input.frame.pixels.entries()) {
    if (paletteIndex === input.frame.transparentIndex) continue
    const color = input.frame.colorTable[paletteIndex]
    if (!color) continue
    const offset = index * 4
    rgba[offset] = color[0]
    rgba[offset + 1] = color[1]
    rgba[offset + 2] = color[2]
    rgba[offset + 3] = 255
  }

  input.patchContext.putImageData(new ImageData(rgba, dims.width, dims.height), 0, 0)
  input.context.drawImage(input.patchCanvas, dims.left, dims.top)
}

export const renderAnimatedCard = async (input: AnimatedCardInput): Promise<Blob> => {
  const parsed = parseGIF(await input.photo.file.arrayBuffer())
  const frames = parsed.frames.filter(isSourceGifFrame)
  if (frames.length === 0) throw new GifDecodeError()
  if (parsed.lsd.width !== input.photo.width || parsed.lsd.height !== input.photo.height) {
    throw new GifDecodeError()
  }
  input.onProgress?.(0)

  const [layers, encoder] = await Promise.all([
    prepareCardLayers(input),
    createGifFrameEncoder(CARD_WIDTH, CARD_HEIGHT),
  ])
  const sourceCanvas = createCanvas(parsed.lsd.width, parsed.lsd.height)
  const sourceContext = getContext(sourceCanvas)
  const patchCanvas = createCanvas(1, 1)
  const patchContext = getContext(patchCanvas)
  const photoCanvas = createCanvas(PHOTO_OUTPUT_SIZE, PHOTO_OUTPUT_SIZE)
  const photoContext = getContext(photoCanvas)
  const crop = getSourceCrop(input.photo)
  let previous: PreviousFrame | null = null
  input.onProgress?.(5)

  try {
    for (const [index, sourceFrame] of frames.entries()) {
      applyPreviousDisposal(sourceContext, previous)
      const frame = decompressFrame(sourceFrame, parsed.gct, false)
      const restore =
        frame.disposalType === 3
          ? sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
          : null
      drawGifPatch({ context: sourceContext, patchCanvas, patchContext, frame })
      const delay = Math.max(20, frame.delay || 100)
      if (index === 0) {
        const outputContext = drawCardFrame({
          canvas: input.canvas,
          layers,
          photo: sourceCanvas,
          crop: input.photo,
        })
        const rgba = outputContext.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT).data
        await encoder.addCardFrame(rgba, delay, PHOTO_OUTPUT_SIZE, PHOTO_OUTPUT_SIZE)
      } else {
        photoContext.clearRect(0, 0, PHOTO_OUTPUT_SIZE, PHOTO_OUTPUT_SIZE)
        photoContext.drawImage(
          sourceCanvas,
          crop.sourceX,
          crop.sourceY,
          crop.sourceSize,
          crop.sourceSize,
          0,
          0,
          PHOTO_OUTPUT_SIZE,
          PHOTO_OUTPUT_SIZE,
        )
        const rgba = photoContext.getImageData(0, 0, PHOTO_OUTPUT_SIZE, PHOTO_OUTPUT_SIZE).data
        await encoder.addPhotoFrame(rgba, PHOTO_OUTPUT_SIZE, PHOTO_OUTPUT_SIZE, delay)
      }
      input.onProgress?.(5 + Math.round(((index + 1) / frames.length) * 90))
      previous = { disposalType: frame.disposalType, dims: frame.dims, restore }
    }
    const blob = await encoder.finish()
    input.onProgress?.(100)
    return blob
  } finally {
    encoder.dispose()
  }
}
