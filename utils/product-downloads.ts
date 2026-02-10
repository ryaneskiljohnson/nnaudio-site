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
    if (!fileInfo?.metadata?.size) return null;

    return fileInfo.metadata.size as number;
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
  try {
    const res = await fetch(url, { method: "HEAD" });
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
