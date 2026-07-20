import type { GifEncoderCommand, GifEncoderResponse } from "./gif-encoder-protocol"

export class GifEncodingError extends Error {
  constructor(message = "GIF 이미지를 생성하지 못했습니다.") {
    super(message)
    this.name = "GifEncodingError"
  }
}

const sendCommand = (
  worker: Worker,
  command: GifEncoderCommand,
  transfer: Transferable[] = [],
): Promise<GifEncoderResponse> =>
  new Promise((resolve, reject) => {
    const cleanup = (): void => {
      worker.removeEventListener("message", handleMessage)
      worker.removeEventListener("error", handleError)
    }
    const handleMessage = (event: MessageEvent<GifEncoderResponse>): void => {
      cleanup()
      if (event.data.kind === "error") reject(new GifEncodingError(event.data.message))
      else resolve(event.data)
    }
    const handleError = (): void => {
      cleanup()
      reject(new GifEncodingError())
    }
    worker.addEventListener("message", handleMessage)
    worker.addEventListener("error", handleError)
    worker.postMessage(command, { transfer })
  })

export type GifFrameEncoder = {
  readonly addCardFrame: (
    rgba: Uint8ClampedArray,
    delay: number,
    photoWidth: number,
    photoHeight: number,
  ) => Promise<void>
  readonly addPhotoFrame: (
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    delay: number,
  ) => Promise<void>
  readonly finish: () => Promise<Blob>
  readonly dispose: () => void
}

export const createGifFrameEncoder = async (
  width: number,
  height: number,
): Promise<GifFrameEncoder> => {
  const worker = new Worker(new URL("./gif-encoder.worker.ts", import.meta.url), { type: "module" })
  const started = await sendCommand(worker, { kind: "start" })
  if (started.kind !== "ready") {
    worker.terminate()
    throw new GifEncodingError()
  }

  return {
    addCardFrame: async (rgba, delay, photoWidth, photoHeight) => {
      const pixels = rgba.slice().buffer
      const response = await sendCommand(
        worker,
        {
          kind: "card-frame",
          rgba: pixels,
          delay,
          width,
          height,
          photoWidth,
          photoHeight,
        },
        [pixels],
      )
      if (response.kind !== "frame-written") throw new GifEncodingError()
    },
    addPhotoFrame: async (rgba, frameWidth, frameHeight, delay) => {
      const pixels = rgba.slice().buffer
      const response = await sendCommand(
        worker,
        {
          kind: "photo-frame",
          rgba: pixels,
          delay,
          width: frameWidth,
          height: frameHeight,
        },
        [pixels],
      )
      if (response.kind !== "frame-written") throw new GifEncodingError()
    },
    finish: async () => {
      const response = await sendCommand(worker, { kind: "finish" })
      worker.terminate()
      if (response.kind !== "finished") throw new GifEncodingError()
      return new Blob([response.bytes], { type: "image/gif" })
    },
    dispose: () => worker.terminate(),
  }
}
