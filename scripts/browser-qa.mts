import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

class QaFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = "QaFailure"
  }
}

const requireCondition = (condition: boolean, message: string): void => {
  if (!condition) throw new QaFailure(message)
}

const baseUrl = "http://127.0.0.1:4173/editor/"
const evidenceDirectory = ".omo/evidence/self-card-redesign"
const validImage = "/tmp/furraid-redesign-valid.png"
const smallImage = "/tmp/furraid-redesign-small.png"

await mkdir(evidenceDirectory, { recursive: true })

const browser = await chromium.launch({ channel: "chrome", headless: true })
const fixtureContext = await browser.newContext({ viewport: { width: 1200, height: 900 } })
const fixturePage = await fixtureContext.newPage()
await fixturePage.setContent(`
  <style>
    html, body { margin: 0; width: 1200px; height: 900px; overflow: hidden; }
    body { background: linear-gradient(145deg, #ffd8c8 0%, #f5aa93 45%, #426b8f 100%); }
    .sun { position: absolute; width: 260px; height: 260px; border-radius: 50%; background: #fff0b0; top: 100px; right: 130px; }
    .hill-a, .hill-b { position: absolute; bottom: -180px; width: 900px; height: 620px; border-radius: 50%; }
    .hill-a { left: -170px; background: #243f5a; transform: rotate(8deg); }
    .hill-b { right: -280px; background: #162b3d; transform: rotate(-12deg); }
  </style>
  <div class="sun"></div><div class="hill-a"></div><div class="hill-b"></div>
`)
await fixturePage.screenshot({ path: validImage })
await fixturePage.setViewportSize({ width: 400, height: 400 })
await fixturePage.setContent('<div style="width:100%;height:100%;background:#3486c7"></div>')
await fixturePage.screenshot({ path: smallImage })
await fixtureContext.close()

const consoleErrors: string[] = []
const externalRequests: string[] = []

const desktopContext = await browser.newContext({
  viewport: { width: 1027, height: 577 },
  acceptDownloads: true,
})
const desktopPage = await desktopContext.newPage()
desktopPage.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text())
})
desktopPage.on("request", (request) => {
  const url = new URL(request.url())
  if (url.origin !== baseUrl) externalRequests.push(request.url())
})

await desktopPage.goto(baseUrl, { waitUntil: "networkidle" })
await desktopPage.locator(".desktop-save button").waitFor()
await desktopPage.waitForFunction(
  () => !(document.querySelector<HTMLButtonElement>(".desktop-save button")?.disabled ?? true),
)
requireCondition(
  await desktopPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  "desktop has horizontal overflow",
)
await desktopPage.screenshot({
  path: `${evidenceDirectory}/desktop-empty.png`,
  animations: "disabled",
})
const desktopLayoutBeforeResize = await desktopPage.evaluate(() => {
  const intro = document.querySelector(".intro-panel")
  const card = document.querySelector(".inline-card")
  const title = document.querySelector(".intro-panel h1")
  if (
    !(intro instanceof HTMLElement) ||
    !(card instanceof HTMLElement) ||
    !(title instanceof HTMLElement)
  ) {
    return null
  }
  return {
    groupLeft: intro.getBoundingClientRect().left,
    titleFontSize: getComputedStyle(title).fontSize,
    outerDifference: Math.abs(
      intro.getBoundingClientRect().left - (window.innerWidth - card.getBoundingClientRect().right),
    ),
  }
})
if (!desktopLayoutBeforeResize) throw new QaFailure("desktop group geometry is unavailable")
requireCondition(desktopLayoutBeforeResize.outerDifference < 1, "desktop group is not centered")
await desktopPage.setViewportSize({ width: 1200, height: 577 })
const desktopLayoutAfterResize = await desktopPage.evaluate(() => {
  const intro = document.querySelector(".intro-panel")
  const title = document.querySelector(".intro-panel h1")
  if (!(intro instanceof HTMLElement) || !(title instanceof HTMLElement)) return null
  return {
    groupLeft: intro.getBoundingClientRect().left,
    titleFontSize: getComputedStyle(title).fontSize,
  }
})
if (!desktopLayoutAfterResize) throw new QaFailure("resized desktop geometry is unavailable")
requireCondition(
  desktopLayoutAfterResize.titleFontSize === desktopLayoutBeforeResize.titleFontSize,
  "desktop title font changed during horizontal resize",
)
requireCondition(
  desktopLayoutAfterResize.groupLeft > desktopLayoutBeforeResize.groupLeft,
  "centered content group did not move during horizontal resize",
)
await desktopPage.setViewportSize({ width: 1027, height: 577 })

const desktopFileInput = desktopPage.locator('.inline-card input[type="file"]')
await desktopFileInput.setInputFiles(smallImage)
await desktopPage.getByRole("alert").waitFor()
await desktopFileInput.setInputFiles(validImage)
await desktopPage.locator(".crop-dialog").waitFor({ state: "visible" })
await desktopPage.screenshot({
  path: `${evidenceDirectory}/desktop-crop-dialog.png`,
  animations: "disabled",
})
await desktopPage.getByRole("button", { name: "이 위치로 적용" }).click()
await desktopPage.locator("#nickname").fill("퍼레이드")
const shortNameFontSize = await desktopPage
  .locator("#nickname")
  .evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize))
await desktopPage.locator("#nickname").fill("가".repeat(20))
const longNameMetrics = await desktopPage.locator("#nickname").evaluate((input) => ({
  fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
  maxLength: input.maxLength,
  fits: input.scrollWidth <= input.clientWidth + 1,
}))
requireCondition(longNameMetrics.fontSize < shortNameFontSize, "20-character name did not shrink")
requireCondition(longNameMetrics.maxLength === 20, "nickname limit is not 20")
requireCondition(longNameMetrics.fits, "20-character name does not fit its field")
await desktopPage.locator("#nickname").fill("퍼레이드")
await desktopPage.locator("#character-name").fill("하늘여우")
requireCondition(
  (await desktopPage.locator("#character-name").getAttribute("maxlength")) === "20",
  "character-name limit is not 20",
)
await desktopPage.locator("#introduction").fill("함께 이야기 나누는 시간을 소중히 여겨요.")
await desktopPage.locator(".inline-schedule input").nth(0).check()
await desktopPage.locator(".inline-schedule input").nth(2).check()
await desktopPage.waitForFunction(
  () => !(document.querySelector<HTMLButtonElement>(".desktop-save button")?.disabled ?? true),
)
await desktopPage.evaluate(() => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  window.scrollTo(0, 0)
})
await desktopPage.waitForTimeout(700)
await desktopPage.screenshot({
  path: `${evidenceDirectory}/desktop-filled-warmup.png`,
  animations: "disabled",
})
await desktopPage.screenshot({
  path: `${evidenceDirectory}/desktop-filled.png`,
  fullPage: true,
  animations: "disabled",
})
const desktopDownloadPromise = desktopPage.waitForEvent("download")
await desktopPage.locator(".desktop-save button").click()
await (await desktopDownloadPromise).saveAs(`${evidenceDirectory}/exported-card.png`)

await desktopPage.reload({ waitUntil: "networkidle" })
requireCondition(
  (await desktopPage.locator("#nickname").inputValue()) === "",
  "input survived refresh",
)
requireCondition(
  (await desktopPage.locator(".inline-schedule input:checked").count()) === 0,
  "schedule survived refresh",
)
await desktopContext.close()

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  acceptDownloads: true,
})
const mobilePage = await mobileContext.newPage()
await mobilePage.goto(baseUrl, { waitUntil: "networkidle" })
requireCondition(
  await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  "mobile has horizontal overflow",
)
await mobilePage.screenshot({
  path: `${evidenceDirectory}/mobile-empty.png`,
  fullPage: true,
  animations: "disabled",
})
await mobilePage.locator('.inline-card input[type="file"]').setInputFiles(validImage)
await mobilePage.locator(".crop-dialog").waitFor({ state: "visible" })
await mobilePage.getByRole("button", { name: "이 위치로 적용" }).click()
await mobilePage.locator("#nickname").fill("모바일퍼리")
await mobilePage.locator("#character-name").fill("구름")
await mobilePage.locator("#introduction").fill("모바일에서도 프레임 위에서 바로 편집해요.")
await mobilePage.locator(".inline-schedule input").nth(1).check()
await mobilePage.evaluate(() => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  window.scrollTo(0, 0)
})
await mobilePage.waitForTimeout(700)
await mobilePage.screenshot({
  path: `${evidenceDirectory}/mobile-filled-warmup.png`,
  fullPage: true,
  animations: "disabled",
})
await mobilePage.screenshot({
  path: `${evidenceDirectory}/mobile-filled.png`,
  fullPage: true,
  animations: "disabled",
})
const mobileDownloadPromise = mobilePage.waitForEvent("download")
await mobilePage.locator(".mobile-save button").click()
await (await mobileDownloadPromise).saveAs(`${evidenceDirectory}/mobile-exported-card.png`)
await mobileContext.close()

await browser.close()
requireCondition(externalRequests.length === 0, `external requests: ${externalRequests.join(", ")}`)
requireCondition(consoleErrors.length === 0, `console errors: ${consoleErrors.join(", ")}`)

process.stdout.write(
  JSON.stringify(
    {
      desktop:
        "direct upload, crop dialog, inline fields, schedules, full PNG export, refresh reset",
      mobile: "responsive inline editor and PNG export",
      externalRequests: externalRequests.length,
      consoleErrors: consoleErrors.length,
    },
    null,
    2,
  ),
)
