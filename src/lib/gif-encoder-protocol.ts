export type GifEncoderCommand =
  | { readonly kind: "start" }
  | {
      readonly kind: "card-frame"
      readonly rgba: ArrayBuffer
      readonly delay: number
      readonly width: number
      readonly height: number
      readonly photoWidth: number
      readonly photoHeight: number
    }
  | {
      readonly kind: "photo-frame"
      readonly rgba: ArrayBuffer
      readonly delay: number
      readonly width: number
      readonly height: number
    }
  | { readonly kind: "finish" }

export type GifEncoderResponse =
  | { readonly kind: "ready" }
  | { readonly kind: "frame-written" }
  | { readonly kind: "finished"; readonly bytes: ArrayBuffer }
  | { readonly kind: "error"; readonly message: string }
