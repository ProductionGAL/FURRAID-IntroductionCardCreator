import { applyPalette, GIFEncoder, quantize } from "gifenc"
import { decompressFrames, parseGIF } from "gifuct-js"
import { chromium } from "playwright"

declare global {
  interface Window {
    sharedCard?: File
  }
}

class GifOutputFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GifOutputFailure"
  }
}

const fixtureFrameCount = Math.max(2, Number.parseInt(process.env.GIF_QA_FRAME_COUNT ?? "2", 10))

const createGifFixture = (): Buffer => {
  const width = 500
  const height = 500
  const rgba = new Uint8ClampedArray(width * height * 4)
  const encoder = GIFEncoder()
  for (let index = 0; index < fixtureFrameCount; index += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4
        rgba[offset] = (x + index * 43) % 256
        rgba[offset + 1] = (y * 2 + index * 71) % 256
        rgba[offset + 2] = (x + y + index * 29) % 256
        rgba[offset + 3] = 255
      }
    }
    const palette = quantize(rgba, 256)
    encoder.writeFrame(applyPalette(rgba, palette), width, height, {
      palette,
      delay: index === 0 ? 120 : 180,
      repeat: 0,
    })
  }
  encoder.finish()
  return Buffer.from(encoder.bytes())
}

const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:4173/editor/"
const browser = await chromium.launch({ channel: "chrome", headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })

try {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (data?: ShareData) => data?.files?.[0]?.type === "image/gif",
    })
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data?: ShareData) => {
        window.sharedCard = data?.files?.[0]
      },
    })
  })
  const page = await context.newPage()
  await page.goto(previewUrl, { waitUntil: "networkidle" })
  await page.locator('.inline-card__photo input[type="file"]').setInputFiles({
    name: "animated.gif",
    mimeType: "image/gif",
    buffer: createGifFixture(),
  })

  await page.getByRole("button", { name: /이 위치로 적용/ }).waitFor({ state: "visible" })
  const warning = await page.getByRole("alert").innerText()
  const expectedWarning = "경고: GIF 저장은 실험중인 기능으로 정상동작하지 않을 수 있습니다."
  if (warning !== expectedWarning) throw new GifOutputFailure(`unexpected warning: ${warning}`)

  await page.getByRole("button", { name: /이 위치로 적용/ }).click()
  await page.getByLabel("닉네임").fill("GIF 저장 테스트")
  await page.locator(".inline-schedule input").first().check()

  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 })
  const encodingStartedAt = performance.now()
  await page.locator(".mobile-save .save-action").first().click()
  const progress = page.getByRole("progressbar", { name: "GIF 이미지 생성 진행률" })
  await progress.waitFor({ state: "visible", timeout: 2_000 })
  await page.waitForFunction(() => {
    const indicator = document.querySelector('[role="progressbar"]')
    return Number(indicator?.getAttribute("aria-valuenow")) > 5
  })
  const observedProgress = Number(await progress.getAttribute("aria-valuenow"))
  const progressScreenshot = process.env.GIF_QA_PROGRESS_SCREENSHOT
  if (progressScreenshot) await page.screenshot({ path: progressScreenshot, fullPage: true })
  const download = await downloadPromise
  await progress.waitFor({ state: "hidden" })
  const encodingMs = performance.now() - encodingStartedAt
  if (download.suggestedFilename() !== "furraid-introduction-card.gif") {
    throw new GifOutputFailure(`unexpected file name: ${download.suggestedFilename()}`)
  }
  const outputPath = process.env.GIF_QA_OUTPUT_PATH
  if (outputPath) await download.saveAs(outputPath)

  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const staticReference = await page.locator(".export-canvas").evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) return []
    const context = canvas.getContext("2d")
    if (!context) return []
    const { width, height } = canvas
    const rgba = context.getImageData(0, 0, width, height).data
    const samples: number[] = []
    for (let y = 0; y < height; y += 8) {
      for (let x = 0; x < width; x += 8) {
        if (x < 1200 && y < 1200) continue
        const offset = (y * width + x) * 4
        samples.push(rgba[offset] ?? 0, rgba[offset + 1] ?? 0, rgba[offset + 2] ?? 0)
      }
    }
    return samples
  })
  const bytes = new Uint8Array(Buffer.concat(chunks)).slice().buffer
  const gif = parseGIF(bytes)
  const frames = decompressFrames(gif, true)
  if (gif.lsd.width !== 1380 || gif.lsd.height !== 2167) {
    throw new GifOutputFailure(`unexpected dimensions: ${gif.lsd.width}x${gif.lsd.height}`)
  }
  if (frames.length !== fixtureFrameCount) {
    throw new GifOutputFailure(`unexpected frame count: ${frames.length}`)
  }
  for (const frame of frames.slice(1)) {
    if (frame.dims.width !== 1200 || frame.dims.height !== 1200) {
      throw new GifOutputFailure(
        `unexpected partial frame: ${frame.dims.width}x${frame.dims.height}`,
      )
    }
  }
  const firstFrame = frames[0]
  if (!firstFrame) throw new GifOutputFailure("missing first frame")
  let totalStaticError = 0
  let changedStaticChannels = 0
  let sampleIndex = 0
  for (let y = 0; y < gif.lsd.height; y += 8) {
    for (let x = 0; x < gif.lsd.width; x += 8) {
      if (x < 1200 && y < 1200) continue
      const offset = (y * gif.lsd.width + x) * 4
      for (let channel = 0; channel < 3; channel += 1) {
        const error = Math.abs(
          (firstFrame.patch[offset + channel] ?? 0) - (staticReference[sampleIndex] ?? 0),
        )
        totalStaticError += error
        if (error > 0) changedStaticChannels += 1
        sampleIndex += 1
      }
    }
  }
  const staticMeanAbsoluteError = totalStaticError / sampleIndex
  const changedStaticChannelRatio = changedStaticChannels / sampleIndex
  if (staticMeanAbsoluteError > 0.15 || changedStaticChannelRatio > 0.1) {
    throw new GifOutputFailure(
      `static color drift: mae=${staticMeanAbsoluteError}, changed=${changedStaticChannelRatio}, encodingMs=${encodingMs}`,
    )
  }
  await page.getByRole("button", { name: /X로 공유/ }).click()
  await progress.waitFor({ state: "visible", timeout: 2_000 })
  await page.waitForFunction(() => {
    const indicator = document.querySelector('[role="progressbar"]')
    return Number(indicator?.getAttribute("aria-valuenow")) > 5
  })
  const observedShareProgress = Number(await progress.getAttribute("aria-valuenow"))
  await page.waitForFunction(() => Boolean(window.sharedCard))
  await progress.waitFor({ state: "hidden" })
  const shared = await page.evaluate(() => ({
    name: window.sharedCard?.name ?? "",
    type: window.sharedCard?.type ?? "",
    size: window.sharedCard?.size ?? 0,
  }))
  if (shared.name !== "furraid-introduction-card.gif" || shared.type !== "image/gif") {
    throw new GifOutputFailure(`unexpected shared file: ${shared.name} (${shared.type})`)
  }
  process.stdout.write(
    `${JSON.stringify({ name: download.suggestedFilename(), warning, observedProgress, observedShareProgress, width: gif.lsd.width, height: gif.lsd.height, frames: frames.length, delays: frames.map((frame) => frame.delay), staticMeanAbsoluteError, changedStaticChannelRatio, encodingMs, size: Buffer.byteLength(Buffer.concat(chunks)), shared })}\n`,
  )
} finally {
  await context.close()
  await browser.close()
}
