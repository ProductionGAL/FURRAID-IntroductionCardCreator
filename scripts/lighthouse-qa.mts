import { chromium } from "playwright"
import { playAudit } from "playwright-lighthouse"

type ScoreSet = {
  readonly performance: number
  readonly accessibility: number
  readonly bestPractices: number
  readonly seo: number
}

const readScore = (score: number | null | undefined, category: string): number => {
  if (score === null || score === undefined) throw new TypeError(`${category} score is unavailable`)
  return Math.round(score * 100)
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right)
  const value = sorted[Math.floor(sorted.length / 2)]
  if (value === undefined) throw new TypeError("Cannot calculate an empty median")
  return value
}

const port = 9224
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [`--remote-debugging-port=${port}`],
})
const page = await browser.newPage()

const audit = async (formFactor: "mobile" | "desktop", run: number): Promise<ScoreSet> => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" })
  const mobile = formFactor === "mobile"
  const result = await playAudit({
    page,
    port,
    thresholds: { performance: 0, accessibility: 0, "best-practices": 0, seo: 0 },
    ignoreError: true,
    disableLogs: true,
    reports: {
      formats: { json: true },
      directory: ".omo/evidence/self-card/lighthouse",
      name: `${formFactor}-${run}`,
    },
    config: {
      extends: "lighthouse:default",
      settings: {
        formFactor,
        screenEmulation: mobile
          ? { mobile: true, width: 375, height: 812, deviceScaleFactor: 2, disabled: false }
          : { mobile: false, width: 1280, height: 900, deviceScaleFactor: 1, disabled: false },
        throttlingMethod: "simulate",
        throttling: mobile
          ? {
              rttMs: 150,
              throughputKbps: 1638.4,
              requestLatencyMs: 562.5,
              downloadThroughputKbps: 1474.6,
              uploadThroughputKbps: 675,
              cpuSlowdownMultiplier: 4,
            }
          : {
              rttMs: 40,
              throughputKbps: 10240,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
              cpuSlowdownMultiplier: 1,
            },
      },
    },
  })

  return {
    performance: readScore(result.lhr?.categories.performance?.score, "performance"),
    accessibility: readScore(result.lhr?.categories.accessibility?.score, "accessibility"),
    bestPractices: readScore(result.lhr?.categories["best-practices"]?.score, "best-practices"),
    seo: readScore(result.lhr?.categories.seo?.score, "seo"),
  }
}

const results: Record<"mobile" | "desktop", ScoreSet[]> = { mobile: [], desktop: [] }
for (const formFactor of ["mobile", "desktop"] as const) {
  for (const run of [1, 2, 3]) {
    results[formFactor].push(await audit(formFactor, run))
  }
}

await browser.close()

const summarize = (runs: readonly ScoreSet[]): ScoreSet => ({
  performance: median(runs.map((score) => score.performance)),
  accessibility: median(runs.map((score) => score.accessibility)),
  bestPractices: median(runs.map((score) => score.bestPractices)),
  seo: median(runs.map((score) => score.seo)),
})

process.stdout.write(
  JSON.stringify(
    {
      runs: results,
      median: { mobile: summarize(results.mobile), desktop: summarize(results.desktop) },
    },
    null,
    2,
  ),
)
