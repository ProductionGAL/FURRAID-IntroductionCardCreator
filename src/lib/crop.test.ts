import { describe, expect, test } from "bun:test"
import type { PhotoCrop } from "../model"
import { clampPan, getSourceCrop } from "./crop"

const makePhoto = (overrides: Partial<PhotoCrop> = {}): PhotoCrop => ({
  url: "blob:test",
  width: 2000,
  height: 1000,
  zoom: 1,
  pan: { x: 0, y: 0 },
  ...overrides,
})

describe("photo crop math", () => {
  test("wide images start with a centered square source crop", () => {
    expect(getSourceCrop(makePhoto())).toEqual({
      sourceX: 500,
      sourceY: 0,
      sourceSize: 1000,
    })
  })

  test("zoom halves the source square and keeps it centered", () => {
    expect(getSourceCrop(makePhoto({ zoom: 2 }))).toEqual({
      sourceX: 750,
      sourceY: 250,
      sourceSize: 500,
    })
  })

  test("pan is clamped so the crop can never reveal an empty edge", () => {
    expect(clampPan(makePhoto(), { x: 10, y: -10 })).toEqual({ x: 0.5, y: 0 })
  })
})
