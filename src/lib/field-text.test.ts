import { describe, expect, test } from "bun:test"
import { getInlineFieldFontSize, getInlineFieldFontWeight } from "./field-text"

describe("getInlineFieldFontSize", () => {
  test("keeps the full visual size through 9 characters", () => {
    expect(getInlineFieldFontSize("가".repeat(9))).toBe("7.505cqw")
  })

  test("starts shrinking at 10 characters and reaches the minimum at 20", () => {
    const nineCharacters = Number.parseFloat(getInlineFieldFontSize("가".repeat(9)))
    const tenCharacters = Number.parseFloat(getInlineFieldFontSize("가".repeat(10)))
    const twentyCharacters = Number.parseFloat(getInlineFieldFontSize("가".repeat(20)))

    expect(nineCharacters).toBeGreaterThan(tenCharacters)
    expect(tenCharacters).toBeGreaterThan(twentyCharacters)
    expect(twentyCharacters).toBe(3.23)
  })

  test("slightly reinforces the weight as the font size shrinks", () => {
    expect(getInlineFieldFontWeight("가".repeat(9))).toBe("600")
    expect(Number(getInlineFieldFontWeight("가".repeat(10)))).toBeGreaterThan(600)
    expect(getInlineFieldFontWeight("가".repeat(20))).toBe("650")
  })
})
