/**
 * @fileoverview Generate iOS AppIcon.appiconset from NNAudio logo
 * @module scripts/generate-ios-app-icon
 *
 * Usage: bun run scripts/generate-ios-app-icon.ts [path-to-source-image]
 * Source should be 1024x1024 or larger (will be resized). If no path given,
 * tries public/images/nnaud-io/nnaudio-logo.png then fetches NNAudio logo from Supabase.
 */

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const APPICON_SET = path.join(
  ROOT,
  "ios/NNAudioSite/NNAudioSite/Assets.xcassets/AppIcon.appiconset"
);

const SIZES: { size: number; filename: string }[] = [
  { size: 20, filename: "Icon-Notification-20.png" },
  { size: 40, filename: "Icon-Notification-20@2x.png" },
  { size: 60, filename: "Icon-Notification-20@3x.png" },
  { size: 29, filename: "Icon-29.png" },
  { size: 58, filename: "Icon-29@2x.png" },
  { size: 87, filename: "Icon-29@3x.png" },
  { size: 40, filename: "Icon-Spotlight-40.png" },
  { size: 80, filename: "Icon-Spotlight-40@2x.png" },
  { size: 120, filename: "Icon-Spotlight-40@3x.png" },
  { size: 120, filename: "Icon-60@2x.png" },
  { size: 180, filename: "Icon-@3x.png" },
  { size: 20, filename: "Icon-Notifications-20.png" },
  { size: 40, filename: "Icon-Spotlight-40.png" }, // ipad 1x reuses
  { size: 76, filename: "Icon-76.png" },
  { size: 152, filename: "Icon-76@2x.png" },
  { size: 167, filename: "Icon-83.5@2x.png" },
  { size: 1024, filename: "Icon-AppStore-1024.png" },
];

// Dedupe by filename so we only write each unique size once
const BY_FILENAME = new Map<string, number>();
for (const { size, filename } of SIZES) {
  if (!BY_FILENAME.has(filename) || BY_FILENAME.get(filename)! < size)
    BY_FILENAME.set(filename, size);
}

const UNIQUE_SIZES = Array.from(BY_FILENAME.entries()).map(([filename, size]) => ({
  size,
  filename,
}));

const NNAUDIO_BRAND_LOGO_URL =
  "https://nnaud.io/images/nnaud-io/NNAudio-logo-white.png";

async function getSourceBuffer(sourcePath?: string): Promise<Buffer> {
  const candidates = sourcePath
    ? [path.isAbsolute(sourcePath) ? sourcePath : path.join(ROOT, sourcePath)]
    : [
        path.join(ROOT, "public/images/nnaud-io/logo-icon.webp"),
        path.join(ROOT, "public/images/nnaud-io/NNAudio-logo-white.webp"),
        path.join(ROOT, "public/images/nnaud-io/nnaudio-logo.png"),
        path.join(ROOT, "public/images/nnaud-io/NNAudio-logo-white.png"),
      ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log("Using source:", p);
      return fs.readFileSync(p);
    }
  }

  console.log("No local logo found; fetching NNAudio brand logo from nnaud.io...");
  const res = await fetch(NNAUDIO_BRAND_LOGO_URL);
  if (!res.ok) throw new Error(`Failed to fetch logo: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const sourcePath = process.argv[2];
  const outDir = APPICON_SET;
  if (!fs.existsSync(outDir)) {
    throw new Error(`AppIcon set not found: ${outDir}`);
  }
  const buf = await getSourceBuffer(sourcePath);
  const image = sharp(buf);
  const meta = await image.metadata();
  let pipeline = image;
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const minSize = Math.min(w, h);
  if (w !== h && w && h && minSize > 0) {
    const left = Math.floor((w - minSize) / 2);
    const top = Math.floor((h - minSize) / 2);
    pipeline = pipeline.extract({ left, top, width: minSize, height: minSize });
  }
  const base = await pipeline.resize(1024, 1024).png().toBuffer();

  for (const { size: s, filename } of UNIQUE_SIZES) {
    const outPath = path.join(outDir, filename);
    await sharp(base).resize(s, s).png().toFile(outPath);
    console.log("Wrote", filename, `(${s}x${s})`);
  }

  console.log("\nDone. AppIcon.appiconset updated with NNAudio logo.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
