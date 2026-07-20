const MAX_INLINE_SIZE_CQW = 7.505
const MIN_INLINE_SIZE_CQW = 3.23
const FULL_SIZE_LENGTH = 9
const MAX_LENGTH = 20
const BASE_INLINE_WEIGHT = 600
const MAX_INLINE_WEIGHT = 650

const getShrinkProgress = (text: string): number => {
  const length = Math.min(Array.from(text).length, MAX_LENGTH)
  if (length <= FULL_SIZE_LENGTH) return 0
  return (length - FULL_SIZE_LENGTH) / (MAX_LENGTH - FULL_SIZE_LENGTH)
}

export const getInlineFieldFontSize = (text: string): string => {
  const progress = getShrinkProgress(text)
  if (progress === 0) return `${MAX_INLINE_SIZE_CQW}cqw`
  const size = MAX_INLINE_SIZE_CQW - progress * (MAX_INLINE_SIZE_CQW - MIN_INLINE_SIZE_CQW)
  return `${size.toFixed(3)}cqw`
}

export const getInlineFieldFontWeight = (text: string): string => {
  const progress = getShrinkProgress(text)
  return `${Math.round(BASE_INLINE_WEIGHT + progress * (MAX_INLINE_WEIGHT - BASE_INLINE_WEIGHT))}`
}
