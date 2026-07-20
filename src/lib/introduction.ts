export const DEFAULT_INTRODUCTION = "이번 행사에 참여할 예정이에요! 잘 부탁드려요!"

export const getCardIntroduction = (introduction: string): string =>
  introduction.trim() || DEFAULT_INTRODUCTION
