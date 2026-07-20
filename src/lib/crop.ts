import type { PhotoCrop, Point } from "../model"

export type CropBox = {
  readonly sourceX: number
  readonly sourceY: number
  readonly sourceSize: number
}

export type DisplayBox = {
  readonly width: number
  readonly height: number
  readonly left: number
  readonly top: number
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))

export const clampPan = (photo: PhotoCrop, pan: Point, zoom = photo.zoom): Point => {
  const baseScale = Math.max(1 / photo.width, 1 / photo.height)
  const displayWidth = photo.width * baseScale * zoom
  const displayHeight = photo.height * baseScale * zoom
  const limitX = Math.max(0, (displayWidth - 1) / 2)
  const limitY = Math.max(0, (displayHeight - 1) / 2)

  return {
    x: limitX === 0 ? 0 : clamp(pan.x, -limitX, limitX),
    y: limitY === 0 ? 0 : clamp(pan.y, -limitY, limitY),
  }
}

export const getDisplayBox = (photo: PhotoCrop): DisplayBox => {
  const baseScale = Math.max(1 / photo.width, 1 / photo.height)
  const width = photo.width * baseScale * photo.zoom
  const height = photo.height * baseScale * photo.zoom

  return {
    width,
    height,
    left: (1 - width) / 2 + photo.pan.x,
    top: (1 - height) / 2 + photo.pan.y,
  }
}

export const getSourceCrop = (photo: PhotoCrop): CropBox => {
  const sourceSize = Math.min(photo.width, photo.height) / photo.zoom
  const baseScale = Math.max(1 / photo.width, 1 / photo.height)
  const renderedScale = baseScale * photo.zoom
  const centerX = photo.width / 2 - photo.pan.x / renderedScale
  const centerY = photo.height / 2 - photo.pan.y / renderedScale

  return {
    sourceX: clamp(centerX - sourceSize / 2, 0, photo.width - sourceSize),
    sourceY: clamp(centerY - sourceSize / 2, 0, photo.height - sourceSize),
    sourceSize,
  }
}
