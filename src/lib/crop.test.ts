import { describe, expect, test } from "bun:test"
import type { PhotoCrop } from "../model"
import { clampPan, getDisplayBox, getSourceCrop, zoomPhotoAt } from "./crop"

const makePhoto = (overrides: Partial<PhotoCrop> = {}): PhotoCrop => ({
  file: new File(["photo"], "photo.png", { type: "image/png" }),
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

  test("zooming at the center keeps a centered photo centered", () => {
    expect(zoomPhotoAt(makePhoto(), 2, { x: 0.5, y: 0.5 })).toEqual(makePhoto({ zoom: 2 }))
  })

  test("zooming preserves the image point beneath an off-center focal point", () => {
    const photo = makePhoto()
    const focalPoint = { x: 0.75, y: 0.5 }
    const before = getDisplayBox(photo)
    const beforeImageX = (focalPoint.x - before.left) / before.width
    const zoomed = zoomPhotoAt(photo, 2, focalPoint)
    const after = getDisplayBox(zoomed)
    const afterImageX = (focalPoint.x - after.left) / after.width

    expect(afterImageX).toBeCloseTo(beforeImageX, 10)
  })

  test("gesture zoom is limited to the supported one-to-three range", () => {
    expect(zoomPhotoAt(makePhoto(), 9, { x: 0.5, y: 0.5 }).zoom).toBe(3)
    expect(zoomPhotoAt(makePhoto({ zoom: 2 }), 0.1, { x: 0.5, y: 0.5 }).zoom).toBe(1)
  })
})
