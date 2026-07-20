import type { CardContent } from "../model"

const CARD_FILE_NAME = "furraid-introduction-card.png"
const CARD_SHARE_TITLE = "FUR:RAID 2026 자기소개 카드"

export type FileShareTarget = {
  readonly canShare: (data?: ShareData) => boolean
  readonly share: (data?: ShareData) => Promise<void>
}

type ShareCardInput = {
  readonly blob: Blob
  readonly content: CardContent
}

export type CardShareResult = "shared" | "unavailable"

const getNativeFileShareTarget = (): FileShareTarget | null => {
  if (typeof navigator === "undefined") return null
  if (typeof navigator.canShare !== "function" || typeof navigator.share !== "function") return null
  return navigator
}

export const createCardShareText = (content: CardContent): string => {
  const lines = [CARD_SHARE_TITLE]
  const nickname = content.nickname.trim()
  const characterName = content.characterName.trim()

  lines.push("FUR:RAID 2026 FIELDTRIP")
  if (nickname && characterName) lines.push(`${nickname} / ${characterName}`)
  lines.push("이번 행사에 참여할 예정이에요! 잘 부탁드려요!")
  lines.push("")
  lines.push("#퍼레이드2026 #FURRAID2026")
  return lines.join("\n")
}

export const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new TypeError("PNG 이미지를 생성하지 못했습니다."))
    }, "image/png")
  })

export const downloadCardImage = (blob: Blob): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = CARD_FILE_NAME
  anchor.click()
  URL.revokeObjectURL(url)
}

export const shareCardImage = async (
  input: ShareCardInput,
  target: FileShareTarget | null = getNativeFileShareTarget(),
): Promise<CardShareResult> => {
  if (!target) return "unavailable"

  const file = new File([input.blob], CARD_FILE_NAME, { type: "image/png" })
  const files = [file]
  if (!target.canShare({ files })) return "unavailable"

  await target.share({
    files,
    title: CARD_SHARE_TITLE,
    text: createCardShareText(input.content),
  })
  return "shared"
}
