/**
 * @fileoverview Records the homepage hero tour as the mobile video asset.
 * Launches headless Chromium at a phone-shaped viewport, loads `/` with
 * `?heroAutoTour=1&tourCap=N` (auto-starts the live tour and caps the
 * credit list), records until the tour parks on its closing wide shot,
 * then transcodes the webm to a faststart H.264 MP4 at
 * `public/videos/hero-tour-mobile.mp4`.
 *
 * The header, headline overlay, and Next.js dev tools are hidden via an
 * injected stylesheet so the capture is only the board — the live page
 * overlays its own headline and CTAs on top of the video.
 *
 * Usage:
 *   bun run scripts/record-hero-tour.ts [--cap 15] [--url http://127.0.0.1:3000]
 *
 * @note Requires a running dev or prod server and ffmpeg on PATH.
 * @module scripts/record-hero-tour
 */

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Mobile-layout viewport (<= 768px CSS triggers the compact hero). */
const VIEWPORT = { width: 720, height: 1560 };
/** Default credit stops recorded (sun + synth + 13 moons ≈ 80s loop). */
const DEFAULT_CAP = 15;
/** Hard stop if the parked attribute never appears. */
const PARK_TIMEOUT_MS = 10 * 60 * 1000;
/** Seconds trimmed from the head of the capture (page load, poster). */
const HEAD_TRIM_SEC = 1.0;
/** Final asset the homepage serves. */
const OUT_PATH = "public/videos/hero-tour-mobile.mp4";

/**
 * @brief Reads one `--flag value` pair from argv.
 * @param flag Flag name including dashes.
 * @returns The value after the flag, or undefined.
 */
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const cap = Number.parseInt(argValue("--cap") ?? "", 10) || DEFAULT_CAP;
  const base = argValue("--url") ?? "http://127.0.0.1:3000";
  const target = `${base}/?heroAutoTour=1&tourCap=${cap}`;
  const videoDir = mkdtempSync(path.join(tmpdir(), "hero-tour-"));

  console.log(`Recording ${target} at ${VIEWPORT.width}x${VIEWPORT.height}…`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: videoDir, size: VIEWPORT },
  });
  const page = await context.newPage();
  await page.goto(target, { waitUntil: "domcontentloaded" });

  // Capture only the board: hide chrome, headline overlay, and dev tools.
  await page.addStyleTag({
    content: `
      .marketing-header-wrap { display: none !important; }
      [data-hero-headline] { display: none !important; }
      nextjs-portal { display: none !important; }
    `,
  });

  // The tour parks on the closing wide shot after one loop (mobile).
  console.log("Tour running — waiting for the parked frame…");
  await page.waitForSelector("[data-parked]", {
    state: "attached",
    timeout: PARK_TIMEOUT_MS,
  });
  // Let the parked wide shot linger so the video ends on a clean pose.
  await page.waitForTimeout(1500);
  await context.close();
  await browser.close();

  const webm = readdirSync(videoDir).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error(`No webm produced in ${videoDir}`);
  const webmPath = path.join(videoDir, webm);

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  console.log(`Transcoding ${webmPath} → ${OUT_PATH}…`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(HEAD_TRIM_SEC),
      "-i",
      webmPath,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "23",
      "-maxrate",
      "1800k",
      "-bufsize",
      "3600k",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      OUT_PATH,
    ],
    { stdio: "inherit" }
  );
  rmSync(videoDir, { recursive: true, force: true });
  console.log(`Done: ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
