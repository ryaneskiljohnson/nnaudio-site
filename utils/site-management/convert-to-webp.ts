/**
 * @fileoverview Shared logic for converting PNG/JPEG to WebP and updating refs.
 * Used by CLI script and admin API.
 * @module utils/site-management/convert-to-webp
 */

import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const EXTENSIONS = [".png", ".jpg", ".jpeg"];
const WEBP_EXT = ".webp";
const PUBLIC_DIR = path.join(process.cwd(), "public");

const SOURCE_DIRS = [
  "app",
  "components",
  "contexts",
  "hooks",
  "lib",
  "styles",
  "utils",
  "config",
  "types",
  "docs",
];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"];
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "chrome-profile"]);

export interface ConvertToWebPResult {
  imageCount: number;
  converted: number;
  skipped: number;
  /** Files skipped because they are empty or not valid PNG/JPEG (e.g. HTML saved as .png). */
  skippedInvalid: string[];
  errors: string[];
  refsUpdated: number;
  filesUpdated: string[];
}

export interface ConvertToWebPOptions {
  dryRun?: boolean;
  refsOnly?: boolean;
}

function collectImageFiles(dir: string, exts: Set<string>): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !IGNORE_DIRS.has(e.name)) {
      results.push(...collectImageFiles(full, exts));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (exts.has(ext)) results.push(full);
    }
  }
  return results;
}

function publicRelativePath(absolutePath: string, publicDir: string): string | null {
  const rel = path.relative(publicDir, absolutePath);
  if (rel.startsWith("..")) return null;
  return rel.replace(/\\/g, "/");
}

function collectSourceFiles(
  rootDir: string,
  dirs: string[],
  exts: Set<string>,
  publicDir: string
): string[] {
  const results: string[] = [];
  for (const d of dirs) {
    const dir = path.join(rootDir, d);
    if (!fs.existsSync(dir)) continue;
    const walk = (dirPath: string) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dirPath, e.name);
        if (e.isDirectory()) {
          if (!IGNORE_DIRS.has(e.name)) walk(full);
        } else if (exts.has(path.extname(e.name).toLowerCase())) {
          results.push(full);
        }
      }
    };
    walk(dir);
  }
  const publicJson = path.join(publicDir, "manifest.json");
  if (fs.existsSync(publicJson)) results.push(publicJson);
  return results;
}

function replaceReferences(
  content: string,
  oldRelPath: string,
  webpRelPath: string
): string {
  const withSlash = "/" + oldRelPath;
  const webpWithSlash = "/" + webpRelPath;
  let next = content;
  if (next.includes(withSlash)) next = next.split(withSlash).join(webpWithSlash);
  if (next.includes(oldRelPath)) next = next.split(oldRelPath).join(webpRelPath);
  return next;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** PNG magic: 89 50 4E 47 0D 0A 1A 0A. JPEG: FF D8 FF. */
function isValidImageFile(filePath: string): { valid: boolean; reason?: string } {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return { valid: false, reason: "empty file" };
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff]);
    if (buf.subarray(0, 8).equals(pngMagic)) return { valid: true };
    if (buf.subarray(0, 3).equals(jpegMagic)) return { valid: true };
    return { valid: false, reason: "not a valid PNG/JPEG (wrong file format or corrupted)" };
  } catch {
    return { valid: false, reason: "could not read file" };
  }
}

/**
 * Run PNG/JPEG → WebP conversion and update codebase references.
 * @param options.dryRun - If true, no files are written.
 * @param options.refsOnly - If true, only update references (assume WebP files exist).
 * @returns Summary of conversions and ref updates.
 */
export async function runConvertToWebP(
  options: ConvertToWebPOptions = {}
): Promise<ConvertToWebPResult> {
  const { dryRun = false, refsOnly = false } = options;
  const result: ConvertToWebPResult = {
    imageCount: 0,
    converted: 0,
    skipped: 0,
    skippedInvalid: [],
    errors: [],
    refsUpdated: 0,
    filesUpdated: [],
  };

  const extSet = new Set(EXTENSIONS.map((e) => e.toLowerCase()));
  const imageFiles = collectImageFiles(PUBLIC_DIR, extSet);
  result.imageCount = imageFiles.length;

  const converted = new Map<string, string>();

  if (!refsOnly) {
    for (const f of imageFiles) {
      const rel = publicRelativePath(f, PUBLIC_DIR);
      if (!rel) continue;
      const parsed = path.parse(f);
      const outPath = path.join(parsed.dir, parsed.name + WEBP_EXT);
      if (fs.existsSync(outPath)) {
        result.skipped++;
        const webpRel = publicRelativePath(outPath, PUBLIC_DIR);
        if (webpRel) converted.set(rel, webpRel);
        continue;
      }
      if (dryRun) {
        const check = isValidImageFile(f);
        if (!check.valid) {
          result.skippedInvalid.push(`${path.relative(process.cwd(), f)}: ${check.reason ?? "invalid"}`);
          continue;
        }
        converted.set(rel, rel.replace(/\.(png|jpg|jpeg)$/i, WEBP_EXT));
        result.converted++;
        continue;
      }
      const check = isValidImageFile(f);
      if (!check.valid) {
        result.skippedInvalid.push(`${path.relative(process.cwd(), f)}: ${check.reason ?? "invalid"}`);
        continue;
      }
      try {
        await sharp(f)
          .webp({ quality: 85 })
          .toFile(outPath);
        const webpRel = publicRelativePath(outPath, PUBLIC_DIR);
        if (webpRel) converted.set(rel, webpRel);
        result.converted++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${path.relative(process.cwd(), f)}: ${msg}`);
      }
    }
  } else {
    for (const f of imageFiles) {
      const rel = publicRelativePath(f, PUBLIC_DIR);
      if (!rel) continue;
      converted.set(rel, rel.replace(/\.(png|jpg|jpeg)$/i, WEBP_EXT));
    }
  }

  const rootDir = process.cwd();
  const srcExtSet = new Set(SOURCE_EXTENSIONS.map((e) => e.toLowerCase()));
  const sourceFiles = collectSourceFiles(rootDir, SOURCE_DIRS, srcExtSet, PUBLIC_DIR);

  for (const filePath of sourceFiles) {
    let content = fs.readFileSync(filePath, "utf-8");
    let changed = false;
    for (const [oldRel, webpRel] of converted) {
      const before = content;
      content = replaceReferences(content, oldRel, webpRel);
      if (content !== before) {
        changed = true;
        result.refsUpdated +=
          (before.match(new RegExp(escapeRegex(oldRel), "g")) || []).length;
      }
    }
    if (changed && !dryRun) {
      fs.writeFileSync(filePath, content, "utf-8");
      result.filesUpdated.push(path.relative(rootDir, filePath));
    } else if (changed && dryRun) {
      result.filesUpdated.push(path.relative(rootDir, filePath));
    }
  }

  return result;
}
