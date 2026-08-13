/**
 * @fileoverview Helpers for product download paths and file size resolution.
 * @module utils/product-downloads
 *
 * Used to resolve file_size from a download path (storage path or URL) so
 * NNAudio Access can use stored sizes without recalculating.
 */

import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";

const PRODUCT_DOWNLOADS_BUCKET = "product-downloads";

/**
 * @brief Whether a URL is safe for the server to issue an outbound HEAD to.
 * Only https URLs whose host is the Supabase project host, the site host, or a
 * configured allowlisted host are permitted — this blocks SSRF to internal
 * IPs / cloud metadata endpoints from admin-supplied download URLs.
 */
export function isAllowedFetchUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }

  const allowed = new Set<string>();
  for (const candidate of [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]) {
    if (candidate) {
      try {
        allowed.add(new URL(candidate).host.toLowerCase());
      } catch {
        // ignore
      }
    }
  }
  (process.env.PRODUCT_DOWNLOAD_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .forEach((h) => allowed.add(h));

  const host = parsed.host.toLowerCase();
  return [...allowed].some(
    (a) => host === a || host.endsWith(`.${a}`) || host.endsWith(".supabase.co")
  );
}

/**
 * @brief Format product download file size for display (KB or MB, or GB if large).
 * @param bytes Size in bytes, or null/undefined
 * @returns Human-readable string e.g. "512 KB", "36.07 MB", or "" when no size
 * @example formatProductDownloadFileSize(1024) === "1.0 KB"
 * @example formatProductDownloadFileSize(37811823) === "36.07 MB"
 */
export function formatProductDownloadFileSize(
  bytes: number | null | undefined
): string {
  if (bytes == null || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * @brief Get file size in bytes from a Supabase storage path.
 * @param storagePath Path in product-downloads bucket (e.g. products/slug/file.zip)
 * @param supabase Admin/service Supabase client (must have storage access)
 * @returns File size in bytes or null if not found / error
 */
export async function getFileSizeFromStorage(
  storagePath: string,
  supabase: SupabaseClient
): Promise<number | null> {
  try {
    const dirPath = path.dirname(storagePath);
    const fileName = path.basename(storagePath);

    const { data, error } = await supabase.storage
      .from(PRODUCT_DOWNLOADS_BUCKET)
      .list(dirPath);

    if (error || !data) return null;

    const fileInfo = data.find((f) => f.name === fileName);
    if (!fileInfo) return null;
    const size =
      (fileInfo as { metadata?: { size?: number } }).metadata?.size ??
      (fileInfo as { size?: number }).size;
    return size ?? null;
  } catch {
    return null;
  }
}

/**
 * @brief Get file size in bytes from a URL via HEAD request (Content-Length).
 * @param url Full URL (e.g. https://... or signed Supabase URL)
 * @returns File size in bytes or null if HEAD fails or no Content-Length
 */
export async function getFileSizeFromUrl(url: string): Promise<number | null> {
  if (!isAllowedFetchUrl(url)) return null;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "error" });
    if (!res.ok) return null;
    const contentLength = res.headers.get("content-length");
    if (contentLength == null) return null;
    const size = parseInt(contentLength, 10);
    return Number.isNaN(size) ? null : size;
  } catch {
    return null;
  }
}

/**
 * @brief Get file size and last-modified from a URL via HEAD request.
 * @param url Full public URL (e.g. Supabase object public URL)
 * @returns { size: number | null, lastModified: string | null } (lastModified as ISO string)
 */
export async function getFileMetadataFromUrl(url: string): Promise<{
  size: number | null;
  lastModified: string | null;
}> {
  if (!isAllowedFetchUrl(url)) return { size: null, lastModified: null };
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "error" });
    if (!res.ok) return { size: null, lastModified: null };
    const contentLength = res.headers.get("content-length");
    const lastModified = res.headers.get("last-modified");
    const size =
      contentLength != null
        ? parseInt(contentLength, 10)
        : null;
    return {
      size: size != null && !Number.isNaN(size) ? size : null,
      lastModified: lastModified || null,
    };
  } catch {
    return { size: null, lastModified: null };
  }
}

/**
 * @brief Get file size from a download path (storage path or URL).
 * Storage paths are resolved via Supabase; URLs via HEAD request.
 * @param pathOrUrl Storage path (e.g. products/slug/file.zip) or full URL
 * @param supabase Admin Supabase client (required for storage paths)
 * @returns File size in bytes or null
 */
export async function getDownloadFileSize(
  pathOrUrl: string,
  supabase: SupabaseClient | null
): Promise<number | null> {
  const trimmed = pathOrUrl?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return getFileSizeFromUrl(trimmed);
  }

  if (supabase) {
    return getFileSizeFromStorage(trimmed, supabase);
  }

  return null;
}
