import type { PhotoCrop } from "../model"
import { renderAnimatedCard } from "./animated-card"
import { canvasToPngBlob } from "./card-output"
import { renderCard } from "./draw-card"
import { isGifFile } from "./image-file"

type RenderCardBlobInput = {
  readonly canvas: HTMLCanvasElement
  readonly frameUrl: string
  readonly photo: PhotoCrop
  readonly source: HTMLElement
  readonly onProgress?: (progress: number) => void
}

export const renderCardBlob = async (input: RenderCardBlobInput): Promise<Blob> => {
  if (isGifFile(input.photo.file)) return renderAnimatedCard(input)
  await renderCard(input)
  return canvasToPngBlob(input.canvas)
}
