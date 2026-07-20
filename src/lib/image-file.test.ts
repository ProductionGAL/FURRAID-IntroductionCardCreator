import { describe, expect, test } from "bun:test"
import { hasMinimumImageSize } from "./image-file"

describe("minimum image dimensions", () => {
  test("accepts the exact 500 by 500 boundary", () => {
    expect(hasMinimumImageSize(500, 500)).toBe(true)
  })

  test("rejects when either edge is under 500 pixels", () => {
    expect(hasMinimumImageSize(499, 1200)).toBe(false)
    expect(hasMinimumImageSize(1200, 499)).toBe(false)
  })
})
