declare module "gifenc" {
  export type GifPalette = number[][]

  export type GifFrameOptions = {
    readonly palette?: GifPalette
    readonly delay?: number
    readonly repeat?: number
    readonly dispose?: number
  }

  export type GifEncoderInstance = {
    readonly writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      options?: GifFrameOptions,
    ) => void
    readonly finish: () => void
    readonly bytes: () => Uint8Array
  }

  export const GIFEncoder: () => GifEncoderInstance
  export const quantize: (rgba: Uint8Array | Uint8ClampedArray, maxColors: number) => GifPalette
  export const applyPalette: (
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
  ) => Uint8Array
}
