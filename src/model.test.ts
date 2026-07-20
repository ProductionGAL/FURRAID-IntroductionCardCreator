import { describe, expect, test } from "bun:test"
import { type CardContent, getCardValidationIssue } from "./model"

describe("card output validation", () => {
  test("requires an uploaded photo", () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "Cloud",
      introduction: "",
      schedules: ["oct09"],
    }

    expect(getCardValidationIssue(content, false)).toBe("photo")
  })

  test("requires a non-blank nickname", () => {
    const content: CardContent = {
      nickname: "  ",
      characterName: "Cloud",
      introduction: "",
      schedules: ["oct09"],
    }

    expect(getCardValidationIssue(content, true)).toBe("nickname")
  })

  test("accepts a blank optional character name", () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: " \n ",
      introduction: "",
      schedules: ["oct09"],
    }

    expect(getCardValidationIssue(content, true)).toBeNull()
  })

  test("requires at least one schedule", () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "Cloud",
      introduction: "",
      schedules: [],
    }

    expect(getCardValidationIssue(content, true)).toBe("schedule")
  })

  test("accepts one or multiple schedules", () => {
    const oneSchedule: CardContent = {
      nickname: "구름",
      characterName: "Cloud",
      introduction: "",
      schedules: ["oct09"],
    }
    const multipleSchedules: CardContent = {
      ...oneSchedule,
      schedules: ["oct09", "oct11"],
    }

    expect(getCardValidationIssue(oneSchedule, true)).toBeNull()
    expect(getCardValidationIssue(multipleSchedules, true)).toBeNull()
  })
})
