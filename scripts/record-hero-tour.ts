/**
 * @fileoverview Records the homepage hero tour as desktop and mobile
 * video assets. Launches headless Chromium, loads `/` with
 * `?heroAutoTour=1&hero3d=1&heroPark=1&tourCap=N` (auto-starts
 * CircuitNetwork and parks after one loop), records until `[data-parked]`,
 * then transcodes webm to faststart H.264 MP4s:
 *   public/videos/hero-tour-desktop.mp4  (1920×1080)
 *   public/videos/hero-tour-mobile.mp4   (720×1560)
 *
 * The header, headline overlay, and Next.js dev tools are hidden via an
 * injected stylesheet so the capture is only the board — the live page
 * overlays its own headline, CTAs, and HTML credit cards on top of the
 * video.
 *
 * Usage:
 *   bun run record:hero-tour
 *   bun run scripts/record-hero-tour.ts [--cap 15] [--url http://127.0.0.1:3000]
 *   bun run scripts/record-hero-tour.ts --only desktop
 *   bun run scripts/record-hero-tour.ts --only mobile
 *
 * @note Requires a running dev or prod server and ffmpeg on PATH.
 * @module scripts/record-hero-tour
 */

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
/** Must match `HERO_TOUR_RECORD_CAP` in `utils/hero-tour.ts`. */
const DEFAULT_CAP = 15;
/** Must match `HERO_TOUR_VIDEO_HEAD_TRIM_SEC` in `utils/hero-tour.ts`. */
const HEAD_TRIM_SEC = 1.0;

/** Hard stop if the parked attribute never appears. */
const PARK_TIMEOUT_MS = 10 * 60 * 1000;

type RecordPass = {
  name: "mobile" | "desktop";
  viewport: { width: number; height: number };
  isMobile: boolean;
  outPath: string;
  maxrate: string;
  bufsize: string;
};

const PASSES: RecordPass[] = [
  {
    name: "mobile",
    viewport: { width: 720, height: 1560 },
    isMobile: true,
    outPath: "public/videos/hero-tour-mobile.mp4",
    maxrate: "1800k",
    bufsize: "3600k",
  },
  {
    name: "desktop",
    viewport: { width: 1920, height: 1080 },
    isMobile: false,
    outPath: "public/videos/hero-tour-desktop.mp4",
    maxrate: "5000k",
    bufsize: "10000k",
  },
];

/**
 * @brief Reads one `--flag value` pair from argv.
 * @param flag Flag name including dashes.
 * @returns The value after the flag, or undefined.
 */
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * @brief Records one viewport pass and writes a faststart H.264 MP4.
 * @param pass Viewport and output settings.
 * @param target Homepage URL with recorder query flags.
 */
async function recordPass(pass: RecordPass, target: string): Promise<void> {
  const videoDir = mkdtempSync(path.join(tmpdir(), `hero-tour-${pass.name}-`));
  console.log(
    `Recording ${pass.name} ${target} at ${pass.viewport.width}x${pass.viewport.height}…`
  );
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: pass.viewport,
    deviceScaleFactor: 1,
    isMobile: pass.isMobile,
    hasTouch: pass.isMobile,
    recordVideo: { dir: videoDir, size: pass.viewport },
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

  console.log(`${pass.name}: tour running — waiting for the parked frame…`);
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

  mkdirSync(path.dirname(pass.outPath), { recursive: true });
  console.log(`Transcoding ${webmPath} → ${pass.outPath}…`);
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
      pass.maxrate,
      "-bufsize",
      pass.bufsize,
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      pass.outPath,
    ],
    { stdio: "inherit" }
  );
  rmSync(videoDir, { recursive: true, force: true });
  console.log(`Done: ${pass.outPath}`);
}

async function main(): Promise<void> {
  const cap =
    Number.parseInt(argValue("--cap") ?? "", 10) || DEFAULT_CAP;
  const base = argValue("--url") ?? "http://127.0.0.1:3000";
  const only = argValue("--only");
  const target = `${base}/?heroAutoTour=1&hero3d=1&heroPark=1&tourCap=${cap}`;
  const passes = PASSES.filter((pass) => !only || pass.name === only);
  if (passes.length === 0) {
    throw new Error(`Unknown --only ${only}; use desktop or mobile`);
  }
  for (const pass of passes) {
    await recordPass(pass, target);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
