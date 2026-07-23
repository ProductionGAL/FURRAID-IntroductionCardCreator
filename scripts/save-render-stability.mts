import { chromium } from "playwright"

declare global {
  interface Window {
    capturedExportSvg?: string
  }
}

class SaveRenderFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SaveRenderFailure"
  }
}

const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:4173/editor/"
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  forcedColors: "active",
})

try {
  await context.addInitScript(() => {
    const nativeDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = function decode(): Promise<void> {
      if (this.src.startsWith("blob:")) {
        return Promise.reject(new DOMException("Blob decode rejected", "EncodingError"))
      }
      return nativeDecode.call(this)
    }

    const sourceDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")
    if (!sourceDescriptor?.set || !sourceDescriptor.get) {
      throw new TypeError("Image source descriptor is unavailable")
    }
    const nativeSourceSetter = sourceDescriptor.set
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: sourceDescriptor.enumerable,
      get: sourceDescriptor.get,
      set(value) {
        if (typeof value === "string" && value.startsWith("data:image/svg+xml")) {
          window.capturedExportSvg = value
        }
        nativeSourceSetter.call(this, value)
      },
    })
  })

  const page = await context.newPage()
  await page.goto(previewUrl, { waitUntil: "networkidle" })
  const createFixture = async (color: string): Promise<Buffer> => {
    const base64 = await page.evaluate((fill) => {
      const canvas = document.createElement("canvas")
      canvas.width = 600
      canvas.height = 600
      const context = canvas.getContext("2d")
      if (!context) throw new TypeError("2D canvas context is unavailable")
      context.fillStyle = fill
      context.fillRect(0, 0, canvas.width, canvas.height)
      return canvas.toDataURL("image/png").split(",")[1] ?? ""
    }, color)
    return Buffer.from(base64, "base64")
  }

  await page.locator('.inline-card__photo input[type="file"]').setInputFiles({
    name: "first.png",
    mimeType: "image/png",
    buffer: await createFixture("#0066ff"),
  })
  await page.getByRole("button", { name: /이 위치로 적용/ }).click()
  await page.getByRole("button", { name: "사진 위치 다시 맞추기" }).click()
  await page.locator('.crop-dialog__replace input[type="file"]').setInputFiles({
    name: "latest.png",
    mimeType: "image/png",
    buffer: await createFixture("#f000a0"),
  })
  await page.getByRole("button", { name: /이 위치로 적용/ }).click()
  await page.getByLabel("닉네임").fill("저장 테스트")
  await page.locator(".inline-schedule input").first().check()

  const liveControlColors = await page.evaluate(() => {
    const nickname = document.querySelector("#nickname")
    const defaultIntroduction = document.querySelector(".inline-field--introduction-default")
    const selectedSchedule = document.querySelector(".inline-schedule > span.is-checked")
    if (
      !(nickname instanceof HTMLElement) ||
      !(defaultIntroduction instanceof HTMLElement) ||
      !(selectedSchedule instanceof HTMLElement)
    ) {
      throw new TypeError("Live card controls are unavailable")
    }
    return {
      nickname: getComputedStyle(nickname).backgroundColor,
      defaultIntroduction: getComputedStyle(defaultIntroduction).backgroundColor,
      selectedSchedule: getComputedStyle(selectedSchedule).backgroundColor,
    }
  })
  if (
    liveControlColors.nickname !== "rgb(247, 251, 255)" ||
    liveControlColors.defaultIntroduction !== "rgb(247, 251, 255)" ||
    liveControlColors.selectedSchedule !== "rgb(49, 128, 196)"
  ) {
    throw new SaveRenderFailure(
      `live controls were recolored: ${JSON.stringify(liveControlColors)}`,
    )
  }

  const defaultIntroduction = await page.locator(".inline-field--introduction-default").innerText()
  if (defaultIntroduction !== "이번 행사에 참여할 예정이에요! 잘 부탁드려요!") {
    throw new SaveRenderFailure(`unexpected default introduction: ${defaultIntroduction}`)
  }

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 })
  await page.locator(".mobile-save .save-action").first().click()
  const outcome = await Promise.race([
    downloadPromise.then((download) => ({
      kind: "download" as const,
      name: download.suggestedFilename(),
    })),
    page
      .getByRole("alert")
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(async () => ({
        kind: "error" as const,
        message: await page.getByRole("alert").innerText(),
      })),
  ])

  if (outcome.kind === "error") throw new SaveRenderFailure(outcome.message)
  if (outcome.name !== "furraid-introduction-card.png") {
    throw new SaveRenderFailure(`unexpected file name: ${outcome.name}`)
  }
  const canvasEvidence = await page.locator(".export-canvas").evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("Export canvas is unavailable")
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new TypeError("2D canvas context is unavailable")
    const centerPixel = [...context.getImageData(600, 600, 1, 1).data]
    const introductionPixels = context.getImageData(380, 1750, 720, 180).data
    let blueTextPixels = 0
    for (let index = 0; index < introductionPixels.length; index += 4) {
      const red = introductionPixels[index] ?? 0
      const green = introductionPixels[index + 1] ?? 0
      const blue = introductionPixels[index + 2] ?? 0
      if (blue > red + 25 && blue > green + 5) blueTextPixels += 1
    }
    const getBlackPixelRatio = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
    ): number => {
      const pixels = context.getImageData(x, y, width, height).data
      let blackPixels = 0
      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index] ?? 0
        const green = pixels[index + 1] ?? 0
        const blue = pixels[index + 2] ?? 0
        if (red < 20 && green < 20 && blue < 20) blackPixels += 1
      }
      return blackPixels / (width * height)
    }
    return {
      centerPixel,
      blueTextPixels,
      nicknameBlackRatio: getBlackPixelRatio(context, 350, 1215, 830, 120),
      introductionBlackRatio: getBlackPixelRatio(context, 350, 1735, 830, 260),
    }
  })
  const capturedSvg = await page.evaluate(() => window.capturedExportSvg ?? "")
  const decodedSvg = capturedSvg
    ? decodeURIComponent(capturedSvg.slice(capturedSvg.indexOf(",") + 1))
    : ""
  const hasEmbeddedWantedFont =
    decodedSvg.includes('font-family: "Wanted Sans Variable"') &&
    /src:\s*url\(["']?data:application\/font-woff;base64,/.test(decodedSvg)
  const { centerPixel, blueTextPixels, nicknameBlackRatio, introductionBlackRatio } = canvasEvidence
  const [red = 0, green = 0, blue = 0] = centerPixel
  if (red < 220 || green > 30 || blue < 120) {
    throw new SaveRenderFailure(`export used a stale photo: ${centerPixel.join(",")}`)
  }
  const compatibilityFailures: string[] = []
  if (!hasEmbeddedWantedFont) compatibilityFailures.push("Wanted Sans was not embedded")
  if (nicknameBlackRatio > 0.01) {
    compatibilityFailures.push(`nickname background is black (${nicknameBlackRatio})`)
  }
  if (introductionBlackRatio > 0.01) {
    compatibilityFailures.push(`introduction background is black (${introductionBlackRatio})`)
  }
  if (compatibilityFailures.length > 0) {
    throw new SaveRenderFailure(compatibilityFailures.join("; "))
  }
  if (blueTextPixels < 500) {
    throw new SaveRenderFailure(`default introduction was not rendered: ${blueTextPixels} pixels`)
  }
  process.stdout.write(
    `${JSON.stringify({ ...outcome, defaultIntroduction, centerPixel, blueTextPixels, hasEmbeddedWantedFont, nicknameBlackRatio, introductionBlackRatio })}\n`,
  )
} finally {
  await context.close()
  await browser.close()
}
