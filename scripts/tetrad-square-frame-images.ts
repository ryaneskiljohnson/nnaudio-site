/**
 * @fileoverview Place Tetrad plugin screenshots inside a square frame for product cards.
 * @module scripts/tetrad-square-frame-images
 *
 * Uses each plugin's theme background image behind the screenshot, with padding.
 * Reads screenshots from Downloads/Tetrad and backgrounds from public/images/tetrad-backgrounds.
 *
 * @example
 *   TETRAD_SOURCE_DIR=/Users/me/Downloads/Tetrad bun run scripts/tetrad-square-frame-images.ts
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const SQUARE_SIZE = 1024;
/** Padding on left and right (and used for top/bottom) around the screenshot. */
const PADDING = 48;

const DEFAULT_SOURCE = '/Users/rjmacbookpro/Downloads/Tetrad';
const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'tetrad-framed');
const BACKGROUNDS_DIR = path.join(process.cwd(), 'public', 'images', 'tetrad-backgrounds');

const SOURCE_IMAGES: { file: string; slug: string; name: string }[] = [
  { file: 'TetradKeysScreenshot.webp', slug: 'tetrad-keys', name: 'Tetrad Keys' },
  { file: 'TetradGuitarsScreenshot.webp', slug: 'tetrad-guitars', name: 'Tetrad Guitars' },
  { file: 'TetradWindsScreenshot.webp', slug: 'tetrad-winds', name: 'Tetrad Winds' },
];

/**
 * @brief Composite screenshot on top of theme background inside a square, with padding.
 * @param screenshotPath Path to plugin screenshot
 * @param backgroundPath Path to theme background image (used behind screenshot)
 * @param outputPath Path for framed WebP output
 */
async function frameImage(
  screenshotPath: string,
  backgroundPath: string,
  outputPath: string
): Promise<void> {
  const innerWidth = SQUARE_SIZE - 2 * PADDING;
  const innerHeight = SQUARE_SIZE - 2 * PADDING;

  const background = sharp(backgroundPath)
    .resize(SQUARE_SIZE, SQUARE_SIZE, { fit: 'cover', position: 'center' })
    .toBuffer();

  const screenshot = sharp(screenshotPath)
    .resize(innerWidth, innerHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png()
    .toBuffer();

  const [bgBuf, screenshotBuf] = await Promise.all([background, screenshot]);
  const screenshotMeta = await sharp(screenshotBuf).metadata();
  const rw = screenshotMeta.width ?? 0;
  const rh = screenshotMeta.height ?? 0;

  const left = PADDING + Math.floor((innerWidth - rw) / 2);
  const top = PADDING + Math.floor((innerHeight - rh) / 2);

  await sharp(bgBuf)
    .composite([{ input: screenshotBuf, left, top }])
    .webp({ quality: 90 })
    .toFile(outputPath);
}

async function main() {
  const sourceDir = process.env.TETRAD_SOURCE_DIR || DEFAULT_SOURCE;
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  console.log(`Output directory: ${OUT_DIR}\n`);

  for (const { file, slug, name } of SOURCE_IMAGES) {
    const screenshotPath = path.join(sourceDir, file);
    if (!fs.existsSync(screenshotPath)) {
      console.warn(`Skip (missing screenshot): ${file}`);
      continue;
    }
    const backgroundPath = path.join(BACKGROUNDS_DIR, `${slug}-background.png`);
    if (!fs.existsSync(backgroundPath)) {
      console.warn(`Skip (missing background): ${path.basename(backgroundPath)}`);
      continue;
    }
    const outputPath = path.join(OUT_DIR, `${slug}-featured.webp`);
    console.log(`Framing ${name} (background + screenshot) -> ${path.basename(outputPath)}`);
    await frameImage(screenshotPath, backgroundPath, outputPath);
    console.log(`  Written ${outputPath}`);
  }

  console.log('\nDone. Framed images are in public/images/tetrad-framed/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
