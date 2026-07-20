export const SCHEDULES = [
  { id: "oct09", label: "10/9" },
  { id: "oct10", label: "10/10" },
  { id: "oct11", label: "10/11" },
] as const

export type ScheduleId = (typeof SCHEDULES)[number]["id"]

export type Point = {
  readonly x: number
  readonly y: number
}

export type PhotoCrop = {
  readonly url: string
  readonly width: number
  readonly height: number
  readonly zoom: number
  readonly pan: Point
}

export type CardContent = {
  readonly nickname: string
  readonly characterName: string
  readonly introduction: string
  readonly schedules: readonly ScheduleId[]
}

export type CardValidationIssue = "photo" | "nickname" | "schedule"

export const getCardValidationIssue = (
  content: CardContent,
  hasPhoto: boolean,
): CardValidationIssue | null => {
  if (!hasPhoto) return "photo"
  if (!content.nickname.trim()) return "nickname"
  if (content.schedules.length === 0) return "schedule"
  return null
}

export const EMPTY_CONTENT: CardContent = {
  nickname: "",
  characterName: "",
  introduction: "",
  schedules: [],
}
