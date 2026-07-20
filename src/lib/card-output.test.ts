import { describe, expect, test } from "bun:test"
import type { CardContent } from "../model"
import { createCardShareText, type FileShareTarget, shareCardImage } from "./card-output"

describe("card share text", () => {
  test("includes the compact identity only when both names are present", () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "Cloud",
      introduction: "이 소개는 카드 이미지 안에서만 보여요.",
      schedules: ["oct09", "oct11"],
    }

    expect(createCardShareText(content)).toBe(
      "FUR:RAID 2026 자기소개 카드\n구름 / Cloud\n이번 행사에 참여할 예정이에요! 잘 부탁드려요!\n\n#퍼레이드2026 #FURRAID2026",
    )
  })

  test("omits the identity line when either name is missing", () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "",
      introduction: "카드에 들어가는 소개",
      schedules: ["oct10"],
    }

    expect(createCardShareText(content)).not.toContain("구름 / ")
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
    expect(payloads[0]?.text).toContain("구름 / Cloud")
  })
})
