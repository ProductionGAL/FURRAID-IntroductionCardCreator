import { chromium } from "playwright"

declare global {
  interface Window {
    sharedCard?: File
  }
}

class ShareRenderFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ShareRenderFailure"
  }
}

const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:4173/editor/"
const minimumBluePixels = 50_000
const minimumPhotoPixels = 50_000

const browser = await chromium.launch({ channel: "chrome", headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })

try {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true })
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        window.sharedCard = data.files?.[0]
      },
    })
  })

  const page = await context.newPage()
  await page.goto(previewUrl, { waitUntil: "networkidle" })
  await page
    .locator('.inline-card__photo input[type="file"]')
    .setInputFiles("public/PreviewImage.png")
  await page.getByRole("button", { name: "이 위치로 적용" }).click()
  await page.getByRole("textbox", { name: "닉네임" }).fill("구름")
  await page.getByRole("textbox", { name: "캐릭터 이름" }).fill("Cloud")
  await page.locator(".inline-schedule input").first().check()
  await page.evaluate(() => {
    const nativeFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      if (/\/assets\/Frame-.*\.png/.test(url)) {
        throw new TypeError("simulated transient template fetch failure")
      }
      if (url.startsWith("blob:")) {
        throw new TypeError("simulated transient uploaded photo fetch failure")
      }
      return nativeFetch(input, init)
    }
  })

  await page.getByRole("button", { name: /X로 공유/ }).click()
  await page.waitForFunction(
    () => Boolean(window.sharedCard) || Boolean(document.querySelector('[role="alert"]')),
  )

  const result = await page.evaluate(async () => {
    if (!window.sharedCard) {
      return {
        shared: false,
        alert: document.querySelector('[role="alert"]')?.textContent ?? "",
        bluePixels: 0,
        photoPixels: 0,
      }
    }

    const bitmap = await createImageBitmap(window.sharedCard)
    const canvas = document.createElement("canvas")
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new TypeError("2D canvas context is unavailable")
    context.drawImage(bitmap, 0, 0)

    const pixels = context.getImageData(0, 0, 1200, 2167).data
    let bluePixels = 0
    let photoPixels = 0
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 0
      const green = pixels[index + 1] ?? 0
      const blue = pixels[index + 2] ?? 0
      if (blue > red + 35 && blue > green + 10) bluePixels += 1
      const pixelIndex = index / 4
      const y = Math.floor(pixelIndex / 1200)
      if (y < 1200 && red > 120 && blue > 100 && red > green + 10) photoPixels += 1
    }
    return { shared: true, alert: "", bluePixels, photoPixels }
  })

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (!result.shared) throw new ShareRenderFailure(result.alert || "shared PNG was not created")
  if (result.bluePixels < minimumBluePixels) {
    throw new ShareRenderFailure(
      `template pixels ${result.bluePixels} fell below ${minimumBluePixels}`,
    )
  }
  if (result.photoPixels < minimumPhotoPixels) {
    throw new ShareRenderFailure(
      `uploaded photo pixels ${result.photoPixels} fell below ${minimumPhotoPixels}`,
    )
  }
} finally {
  await context.close()
  await browser.close()
}
