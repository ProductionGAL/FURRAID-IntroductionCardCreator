import type { PhotoCrop } from "../model"

export class UnsupportedImageError extends Error {
  constructor() {
    super("JPG, PNG, WebP 또는 GIF 이미지 파일을 선택해 주세요.")
    this.name = "UnsupportedImageError"
  }
}

export class OversizedImageError extends Error {
  constructor() {
    super("이미지는 200MB 이하만 사용할 수 있습니다.")
    this.name = "OversizedImageError"
  }
}

class ImageDecodeError extends Error {
  constructor() {
    super("이 이미지 파일을 읽을 수 없습니다. 다른 파일을 선택해 주세요.")
    this.name = "ImageDecodeError"
  }
}

export class UndersizedImageError extends Error {
  constructor() {
    super("사진은 가로와 세로 모두 최소 500px 이상이어야 합니다.")
    this.name = "UndersizedImageError"
  }
}

const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_FILE_SIZE = 200 * 1024 * 1024

export const isGifFile = (file: File): boolean =>
  file.type.toLowerCase() === "image/gif" || file.name.toLowerCase().endsWith(".gif")

export const hasMinimumImageSize = (width: number, height: number): boolean =>
  width >= 500 && height >= 500

export const createPhotoCrop = (file: File): Promise<PhotoCrop> => {
  if (!SUPPORTED_TYPES.has(file.type) && !isGifFile(file)) {
    return Promise.reject(new UnsupportedImageError())
  }
  if (file.size > MAX_FILE_SIZE) return Promise.reject(new OversizedImageError())

  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      if (!hasMinimumImageSize(image.naturalWidth, image.naturalHeight)) {
        URL.revokeObjectURL(url)
        reject(new UndersizedImageError())
        return
      }
      resolve({
        file,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
        zoom: 1,
        pan: { x: 0, y: 0 },
      })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageDecodeError())
    }
    image.src = url
  })
}
