/**
 * Generate NNAudio iOS app icons. Run from repo root: node scripts/generate-ios-app-icon.mjs
 */
import fs from "fs";
import path from "path";
import https from "https";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "ios/NNAudioSite/NNAudioSite/Assets.xcassets/AppIcon.appiconset");
// NNAudio logo: CLI arg, then project copy, then other locals, then fallback URL.
const LOCAL_CANDIDATES = [
  path.join(ROOT, "public/images/nnaud-io/NNAudio_Logo_Avatar.png"),
  path.join(ROOT, "public/images/nnaud-io/logo-icon.webp"),
  path.join(ROOT, "public/images/nnaud-io/NNAudio-logo-white.webp"),
  path.join(ROOT, "public/images/nnaud-io/nnaudio-logo.png"),
  path.join(ROOT, "public/images/nnaud-io/NNAudio-logo-white.png"),
];
const FALLBACK_URL = "https://nnaud.io/images/nnaud-io/NNAudio-logo-white.png";

const SIZES = [
  [20, "Icon-Notification-20.png"],
  [40, "Icon-Notification-20@2x.png"],
  [60, "Icon-Notification-20@3x.png"],
  [29, "Icon-29.png"],
  [58, "Icon-29@2x.png"],
  [87, "Icon-29@3x.png"],
  [40, "Icon-Spotlight-40.png"],
  [80, "Icon-Spotlight-40@2x.png"],
  [120, "Icon-Spotlight-40@3x.png"],
  [120, "Icon-60@2x.png"],
  [180, "Icon-@3x.png"],
  [20, "Icon-Notifications-20.png"],
  [76, "Icon-76.png"],
  [152, "Icon-76@2x.png"],
  [167, "Icon-83.5@2x.png"],
  [1024, "Icon-AppStore-1024.png"],
];

const seen = new Set();
const unique = SIZES.filter(([_, f]) => {
  if (seen.has(f)) return false;
  seen.add(f);
  return true;
});

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(OUT)) throw new Error("AppIcon set not found: " + OUT);
  let buf;
  const cliPath = process.argv[2];
  if (cliPath && fs.existsSync(cliPath)) {
    buf = fs.readFileSync(cliPath);
  } else {
    const localPath = LOCAL_CANDIDATES.find((p) => fs.existsSync(p));
    if (localPath) {
      buf = fs.readFileSync(localPath);
    } else {
      buf = await get(FALLBACK_URL);
    }
  }
  let img = sharp(buf);
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const s = Math.min(w, h);
  if (w !== h && s > 0) {
    const left = Math.floor((w - s) / 2);
    const top = Math.floor((h - s) / 2);
    img = img.extract({ left, top, width: s, height: s });
  }
  const base = await img.resize(1024, 1024).png().toBuffer();
  for (const [size, filename] of unique) {
    await sharp(base).resize(size, size).png().toFile(path.join(OUT, filename));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
