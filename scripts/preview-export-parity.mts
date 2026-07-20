import { mkdir, readFile } from "node:fs/promises"
import { chromium } from "playwright"

class ParityFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ParityFailure"
  }
}

const baseUrl = "http://127.0.0.1:4173/editor/"
const evidenceDirectory = ".omo/evidence/preview-export-parity"
const exportedPath = `${evidenceDirectory}/parity-exported-card.png`
const previewPath = `${evidenceDirectory}/parity-preview-native.png`
const maximumDifferenceRatio = 0.012

await mkdir(evidenceDirectory, { recursive: true })

const browser = await chromium.launch({ channel: "chrome", headless: true })
const context = await browser.newContext({
  viewport: { width: 1400, height: 2300 },
  acceptDownloads: true,
})
const page = await context.newPage()

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" })
  await page.locator('.inline-card input[type="file"]').setInputFiles("src/assets/Frame.png")
  await page.getByRole("button", { name: "이 위치로 적용" }).click()
  await page.locator("#nickname").fill("퍼레이드")
  await page.locator("#character-name").fill("하늘여우")
  await page.locator("#introduction").fill("함께 이야기 나누는 시간을 소중히 여겨요.")
  await page.locator(".inline-schedule input").nth(0).check()
  await page.locator(".inline-schedule input").nth(2).check()
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })

  await page.waitForFunction(
    () => !(document.querySelector<HTMLButtonElement>(".desktop-save button")?.disabled ?? true),
  )
  const downloadPromise = page.waitForEvent("download")
  await page.locator(".desktop-save button").click()
  await (await downloadPromise).saveAs(exportedPath)

  await page.addStyleTag({
    content: `
      .poster-app { display: block !important; width: 1200px !important; height: 2167px !important; overflow: hidden !important; }
      .intro-panel, .mobile-save, .privacy-copy, .crop-dialog { display: none !important; }
      .editor-stage { display: block !important; width: 1200px !important; height: 2167px !important; overflow: hidden !important; }
      .inline-card { width: 1200px !important; height: 2167px !important; }
    `,
  })
  const previewBuffer = await page.locator(".inline-card").screenshot({
    path: previewPath,
    animations: "disabled",
  })
  const exportBuffer = await readFile(exportedPath)
  const difference = await page.evaluate(
    async ({ previewUrl, exportUrl, threshold }) => {
      const decode = async (source: string): Promise<HTMLImageElement> => {
        const image = new Image()
        image.src = source
        await image.decode()
        return image
      }
      const [preview, exported] = await Promise.all([decode(previewUrl), decode(exportUrl)])
      const canvas = document.createElement("canvas")
      canvas.width = 1200
      canvas.height = 2167
      const context = canvas.getContext("2d", { willReadFrequently: true })
      if (!context) throw new Error("2D canvas context is unavailable")

      context.drawImage(preview, 0, 0, 1200, 2167)
      const previewPixels = context.getImageData(0, 0, 1200, 2167).data
      context.clearRect(0, 0, 1200, 2167)
      context.drawImage(exported, 0, 0, 1200, 2167, 0, 0, 1200, 2167)
      const exportPixels = context.getImageData(0, 0, 1200, 2167).data

      let differentPixels = 0
      for (let index = 0; index < previewPixels.length; index += 4) {
        const red = Math.abs((previewPixels[index] ?? 0) - (exportPixels[index] ?? 0))
        const green = Math.abs((previewPixels[index + 1] ?? 0) - (exportPixels[index + 1] ?? 0))
        const blue = Math.abs((previewPixels[index + 2] ?? 0) - (exportPixels[index + 2] ?? 0))
        if (Math.max(red, green, blue) > threshold) differentPixels += 1
      }

      const totalPixels = 1200 * 2167
      return { differentPixels, totalPixels, ratio: differentPixels / totalPixels }
    },
    {
      previewUrl: `data:image/png;base64,${previewBuffer.toString("base64")}`,
      exportUrl: `data:image/png;base64,${exportBuffer.toString("base64")}`,
      threshold: 8,
    },
  )

  process.stdout.write(`${JSON.stringify(difference, null, 2)}\n`)
  if (difference.ratio > maximumDifferenceRatio) {
    throw new ParityFailure(
      `preview/export difference ratio ${difference.ratio.toFixed(4)} exceeds ${maximumDifferenceRatio}`,
    )
  }
} finally {
  await context.close()
  await browser.close()
}
