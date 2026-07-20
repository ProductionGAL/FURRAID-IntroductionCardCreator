import { describe, expect, test } from "bun:test"
import { hasMinimumImageSize, isGifFile } from "./image-file"

describe("minimum image dimensions", () => {
  test("accepts the exact 500 by 500 boundary", () => {
    expect(hasMinimumImageSize(500, 500)).toBe(true)
  })

  test("rejects when either edge is under 500 pixels", () => {
    expect(hasMinimumImageSize(499, 1200)).toBe(false)
    expect(hasMinimumImageSize(1200, 499)).toBe(false)
  })
})

describe("GIF input detection", () => {
  test("detects GIF files by MIME type or file extension", () => {
    expect(isGifFile(new File(["gif"], "animated.bin", { type: "image/gif" }))).toBe(true)
    expect(isGifFile(new File(["gif"], "animated.GIF", { type: "application/octet-stream" }))).toBe(
      true,
    )
    expect(isGifFile(new File(["png"], "still.png", { type: "image/png" }))).toBe(false)
  })
})
