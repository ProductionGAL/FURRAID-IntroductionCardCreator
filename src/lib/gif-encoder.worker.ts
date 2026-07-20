/// <reference lib="webworker" />

import type { GifEncoderInstance } from "gifenc"
import { applyPalette, GIFEncoder, quantize } from "gifenc"
import type { GifEncoderCommand, GifEncoderResponse } from "./gif-encoder-protocol"

let encoder: GifEncoderInstance | null = null
const STATIC_COLOR_BUDGET = 96

const respond = (response: GifEncoderResponse): void => postMessage(response)

const sameColor = (left: readonly number[], right: readonly number[]): boolean =>
  left[0] === right[0] && left[1] === right[1] && left[2] === right[2]

const createCardPalette = (
  rgba: Uint8ClampedArray,
  frameWidth: number,
  frameHeight: number,
  photoWidth: number,
  photoHeight: number,
): number[][] => {
  const photo = new Uint8ClampedArray(photoWidth * photoHeight * 4)
  const staticArea = new Uint8ClampedArray(
    (frameWidth * frameHeight - photoWidth * photoHeight) * 4,
  )
  let photoOffset = 0
  let staticOffset = 0

  for (let y = 0; y < frameHeight; y += 1) {
    const rowOffset = y * frameWidth * 4
    if (y < photoHeight) {
      const photoRowEnd = rowOffset + photoWidth * 4
      photo.set(rgba.subarray(rowOffset, photoRowEnd), photoOffset)
      photoOffset += photoWidth * 4
      staticArea.set(rgba.subarray(photoRowEnd, rowOffset + frameWidth * 4), staticOffset)
      staticOffset += (frameWidth - photoWidth) * 4
    } else {
      const rowEnd = rowOffset + frameWidth * 4
      staticArea.set(rgba.subarray(rowOffset, rowEnd), staticOffset)
      staticOffset += frameWidth * 4
    }
  }

  const staticPalette = quantize(staticArea, STATIC_COLOR_BUDGET)
  const photoPalette = quantize(photo, 256 - staticPalette.length)
  const palette = [...staticPalette]
  for (const color of photoPalette) {
    if (!palette.some((existing) => sameColor(existing, color))) palette.push(color)
  }
  return palette.slice(0, 256)
}

const writeFrame = (
  rgba: Uint8ClampedArray,
  frameWidth: number,
  frameHeight: number,
  delay: number,
  palette: number[][],
): void => {
  if (!encoder) throw new TypeError("GIF encoder is not ready")
  encoder.writeFrame(applyPalette(rgba, palette), frameWidth, frameHeight, {
    palette,
    delay,
    repeat: 0,
    dispose: 1,
  })
}

const handleCommand = (command: GifEncoderCommand): void => {
  switch (command.kind) {
    case "start":
      encoder = GIFEncoder()
      respond({ kind: "ready" })
      return
    case "card-frame": {
      const rgba = new Uint8ClampedArray(command.rgba)
      const palette = createCardPalette(
        rgba,
        command.width,
        command.height,
        command.photoWidth,
        command.photoHeight,
      )
      writeFrame(rgba, command.width, command.height, command.delay, palette)
      respond({ kind: "frame-written" })
      return
    }
    case "photo-frame": {
      const rgba = new Uint8ClampedArray(command.rgba)
      writeFrame(rgba, command.width, command.height, command.delay, quantize(rgba, 256))
      respond({ kind: "frame-written" })
      return
    }
    case "finish": {
      if (!encoder) throw new TypeError("GIF encoder is not ready")
      encoder.finish()
      const bytes = encoder.bytes()
      const output = bytes.slice().buffer
      encoder = null
      respond({ kind: "finished", bytes: output })
      return
    }
  }
}

self.onmessage = (event: MessageEvent<GifEncoderCommand>): void => {
  try {
    handleCommand(event.data)
  } catch (error: unknown) {
    respond({
      kind: "error",
      message: error instanceof Error ? error.message : "GIF encoding failed",
    })
  }
}
