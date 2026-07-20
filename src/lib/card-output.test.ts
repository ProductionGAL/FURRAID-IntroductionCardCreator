import { describe, expect, test } from "bun:test"
import type { CardContent } from "../model"
import { createCardShareText, type FileShareTarget, shareCardImage } from "./card-output"

describe("card share text", () => {
  test("includes compact identity and schedule details without repeating the introduction", () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "Cloud",
      introduction: "이 소개는 카드 이미지 안에서만 보여요.",
      schedules: ["oct09", "oct11"],
    }

    expect(createCardShareText(content)).toBe(
      "FUR:RAID 2026 자기소개 카드\n닉네임: 구름\n캐릭터 이름: Cloud\n참가 일정: 10/9, 10/11\n#FURRAID2026",
    )
  })

  test("hands a PNG file and card text to a supported native share target", async () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "Cloud",
      introduction: "카드에 들어가는 소개",
      schedules: ["oct10"],
    }
    const payloads: ShareData[] = []
    const target: FileShareTarget = {
      canShare: (data) => data?.files?.[0]?.type === "image/png",
      share: (data) => {
        if (data) payloads.push(data)
        return Promise.resolve()
      },
    }

    const result = await shareCardImage(
      { blob: new Blob(["png"], { type: "image/png" }), content },
      target,
    )

    expect(result).toBe("shared")
    expect(payloads[0]?.files?.[0]?.name).toBe("furraid-introduction-card.png")
    expect(payloads[0]?.text).toContain("닉네임: 구름")
  })
})
