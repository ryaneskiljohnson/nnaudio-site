/**
 * @fileoverview Generate NNAudio favicon and app icons from NNAudio_Logo_Avatar.png.
 * @module scripts/generate-favicon
 *
 * Writes app/icon.png, app/apple-icon.png, app/favicon.ico, and
 * public/images/nnaud-io/ logo-icon variants so dev, build, and Vercel use NNAudio branding.
 */

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import toIco from "to-ico";

const ROOT = path.resolve(__dirname, "..");
const AVATAR_PATH = path.join(
  ROOT,
  "public/images/nnaud-io/NNAudio_Logo_Avatar.png"
);
const APP_DIR = path.join(ROOT, "app");
const PUBLIC_NNAUDIO = path.join(ROOT, "public/images/nnaud-io");

async function main() {
  if (!fs.existsSync(AVATAR_PATH)) {
    console.error("Source not found:", AVATAR_PATH);
    process.exit(1);
  }

  const avatar = sharp(AVATAR_PATH);

  // App Router: Next.js uses these for icon and apple-touch (dev + Vercel)
  const icon32 = await avatar.clone().resize(32, 32).png().toBuffer();
  const icon180 = await avatar.clone().resize(180, 180).png().toBuffer();

  fs.writeFileSync(path.join(APP_DIR, "icon.png"), icon32);
  fs.writeFileSync(path.join(APP_DIR, "apple-icon.png"), icon180);
  console.log("  app/icon.png (32x32)");
  console.log("  app/apple-icon.png (180x180)");

  // app/favicon.ico for legacy /favicon.ico (Next.js serves from app/)
  const icon16 = await avatar.clone().resize(16, 16).png().toBuffer();
  const ico = await toIco([icon16, icon32]);
  fs.writeFileSync(path.join(APP_DIR, "favicon.ico"), ico);
  console.log("  app/favicon.ico");

  // public/images/nnaud-io/ logo-icon.* (referenced by layout metadata)
  const icon48 = await avatar.clone().resize(48, 48);
  await icon48.png().toFile(path.join(PUBLIC_NNAUDIO, "logo-icon.png"));
  await icon48.webp({ quality: 90 }).toFile(path.join(PUBLIC_NNAUDIO, "logo-icon.webp"));
  const icon16Buf = await avatar.clone().resize(16, 16);
  await icon16Buf.png().toFile(path.join(PUBLIC_NNAUDIO, "logo-icon-16x16.png"));
  await icon16Buf.webp({ quality: 90 }).toFile(path.join(PUBLIC_NNAUDIO, "logo-icon-16x16.webp"));
  const icon32Buf = await avatar.clone().resize(32, 32);
  await icon32Buf.png().toFile(path.join(PUBLIC_NNAUDIO, "logo-icon-32x32.png"));
  await icon32Buf.webp({ quality: 90 }).toFile(path.join(PUBLIC_NNAUDIO, "logo-icon-32x32.webp"));
  console.log("  public/images/nnaud-io/logo-icon.* (png + webp)");

  // public/favicon.ico for direct requests (e.g. some crawlers)
  fs.writeFileSync(path.join(ROOT, "public/favicon.ico"), ico);
  console.log("  public/favicon.ico");

  console.log("\nDone. NNAudio favicon and icons generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
