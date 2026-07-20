import { describe, expect, test } from "bun:test"
import type { CardContent } from "../model"
import { createCardShareText, type FileShareTarget, shareCardImage } from "./card-output"

describe("card share text", () => {
  test("uses the entered introduction in place of the default greeting", () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "Cloud",
      introduction: "  함께 이야기 나누고 싶어요.  ",
      schedules: ["oct09", "oct11"],
    }

    expect(createCardShareText(content)).toBe(
      "FUR:RAID 2026 자기소개 카드\n구름 / Cloud\n함께 이야기 나누고 싶어요.\n\n#퍼레이드2026 #FURRAID2026",
    )
  })

  test("uses the default greeting when the introduction is blank", () => {
    const content: CardContent = {
      nickname: "",
      characterName: "",
      introduction: "  \n  ",
      schedules: [],
    }

    expect(createCardShareText(content)).toContain("이번 행사에 참여할 예정이에요! 잘 부탁드려요!")
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
    expect(payloads[0]?.text).toContain("카드에 들어가는 소개")
    expect(payloads[0]?.text).not.toContain("이번 행사에 참여할 예정이에요! 잘 부탁드려요!")
  })

  test("hands an animated GIF file to a target that supports GIF sharing", async () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "Cloud",
      introduction: "GIF 공유 테스트",
      schedules: ["oct10"],
    }
    const payloads: ShareData[] = []
    const target: FileShareTarget = {
      canShare: (data) => data?.files?.[0]?.type === "image/gif",
      share: (data) => {
        if (data) payloads.push(data)
        return Promise.resolve()
      },
    }

    const result = await shareCardImage(
      { blob: new Blob(["gif"], { type: "image/gif" }), content },
      target,
    )

    expect(result).toBe("shared")
    expect(payloads[0]?.files?.[0]?.name).toBe("furraid-introduction-card.gif")
    expect(payloads[0]?.files?.[0]?.type).toBe("image/gif")
    expect(payloads[0]?.text).toContain("GIF 공유 테스트")
  })

  test("reports GIF sharing as unavailable when the target rejects GIF files", async () => {
    const content: CardContent = {
      nickname: "구름",
      characterName: "",
      introduction: "",
      schedules: ["oct10"],
    }
    let shareCalled = false
    const target: FileShareTarget = {
      canShare: () => false,
      share: () => {
        shareCalled = true
        return Promise.resolve()
      },
    }

    const result = await shareCardImage(
      { blob: new Blob(["gif"], { type: "image/gif" }), content },
      target,
    )

    expect(result).toBe("unavailable")
    expect(shareCalled).toBe(false)
  })
})
