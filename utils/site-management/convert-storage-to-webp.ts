/**
 * @fileoverview Converts Supabase storage images (PNG/JPEG) to WebP and updates DB refs only after upload succeeds.
 * @module utils/site-management/convert-storage-to-webp
 *
 * Strategy: For each image URL in products/bundles that points to .png/.jpg/.jpeg in our storage,
 * download via Supabase storage API (authenticated), convert to WebP, upload to the same bucket
 * with .webp path, then update the DB. DB is updated only after the .webp file exists in storage.
 * Uses storage.download() rather than fetching the public URL to avoid 400 from referrer/origin restrictions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

const IMAGE_EXT_REGEX = /\.(png|jpeg|jpg)$/i;
const WEBP_EXT = ".webp";

/** Supabase public storage URL: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/PATH */
const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/";

export interface ConvertStorageToWebPResult {
  /** Unique source URLs processed (fetch + convert + upload) */
  converted: number;
  /** DB rows updated (products + bundles) */
  productsUpdated: number;
  bundlesUpdated: number;
  /** URLs that were skipped (already .webp, or not our storage, or fetch/convert/upload failed) */
  skipped: string[];
  /** URLs removed from DB because object not found in storage and no .webp */
  refsRemoved: string[];
  errors: string[];
}

export interface ConvertStorageToWebPOptions {
  dryRun?: boolean;
  /** When set, used to fetch via authenticated storage endpoint when download() fails (avoids 400 on public URL). */
  supabaseUrl?: string;
  serviceRoleKey?: string;
}

/**
 * Parses a Supabase storage public URL into bucket and path.
 * @returns { bucket, path } or null if not a Supabase storage URL we handle.
 */
function parseStorageUrl(
  url: string | null | undefined
): { bucket: string; path: string; webpPath: string } | null {
  if (url == null || typeof url !== "string") return null;
  if (!IMAGE_EXT_REGEX.test(url)) return null;
  const idx = url.indexOf(STORAGE_PUBLIC_PREFIX);
  if (idx === -1) return null;
  const after = url.slice(idx + STORAGE_PUBLIC_PREFIX.length);
  const parts = after.split("/");
  if (parts.length < 2) return null;
  const bucket = parts[0];
  const path = parts.slice(1).join("/");
  const webpPath = path.replace(IMAGE_EXT_REGEX, WEBP_EXT);
  return { bucket, path, webpPath };
}

/**
 * Gets image bytes from Supabase storage (download or fetch), converts to WebP, uploads at webpPath.
 * Tries storage.download() first; on failure tries createSignedUrl + fetch(signedUrl); finally
 * falls back to fetch(public imageUrl) with Accept/User-Agent headers so storage accepts the request.
 * @returns { url, error, removeRef } with new public URL on success, error message on failure, or removeRef true to clear the DB field.
 */
async function fetchConvertAndUpload(
  supabase: SupabaseClient,
  imageUrl: string,
  bucket: string,
  path: string,
  webpPath: string,
  dryRun: boolean,
  credentials?: { supabaseUrl: string; serviceRoleKey: string }
): Promise<{ url: string | null; error: string | null; removeRef?: boolean }> {
  if (dryRun) {
    return { url: imageUrl.replace(IMAGE_EXT_REGEX, WEBP_EXT), error: null };
  }

  const client = supabase as any;

  try {
    let buffer: Buffer;
    const { data: downloadData, error: downloadError } = await client.storage.from(bucket).download(path);
    if (downloadError || !downloadData) {
      if (credentials?.supabaseUrl && credentials?.serviceRoleKey) {
        // Same path as SDK download(): GET /storage/v1/object/{bucket}/{path} with Bearer token (no "authenticated" segment).
        const objectPath = `${bucket}/${path}`;
        const authUrl = `${credentials.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${objectPath}`;
        const authRes = await fetch(authUrl, {
          cache: "no-store",
          headers: {
            apikey: credentials.serviceRoleKey,
            Authorization: `Bearer ${credentials.serviceRoleKey}`,
          },
        });
        if (authRes.ok) {
          buffer = Buffer.from(await authRes.arrayBuffer());
        } else {
          const bodyText = await authRes.text();
          let body: { error?: string; message?: string } | null = null;
          try {
            body = bodyText ? JSON.parse(bodyText) : null;
          } catch {
            /* ignore */
          }
          const isNotFound =
            body?.error === "not_found" || (body?.message ?? "").toLowerCase().includes("object not found");
          if (isNotFound) {
            const { data: webpExists } = await client.storage.from(bucket).exists(webpPath);
            if (webpExists) {
              const { data: urlData } = client.storage.from(bucket).getPublicUrl(webpPath);
              return { url: urlData?.publicUrl ?? null, error: null };
            }
            return { url: null, error: null, removeRef: true };
          }
          buffer = Buffer.alloc(0);
          const { data: signedData, error: signedError } = await client.storage
            .from(bucket)
            .createSignedUrl(path, 60);
          if (!signedError && signedData?.signedUrl) {
            const res = await fetch(signedData.signedUrl, { cache: "no-store" });
            if (res.ok) buffer = Buffer.from(await res.arrayBuffer());
          }
          if (buffer.length === 0) {
            return { url: null, error: `download failed${downloadError ? `: ${downloadError.message}` : ""}; ${authRes.status}` };
          }
        }
      } else {
        const { data: signedData, error: signedError } = await client.storage
          .from(bucket)
          .createSignedUrl(path, 60);
        const fetchOpts = {
          cache: "no-store" as RequestCache,
          headers: {
            Accept: "image/*,*/*",
            "User-Agent": "Mozilla/5.0 (compatible; NNAudio-Site-Management/1.0)",
          },
        };
        if (!signedError && signedData?.signedUrl) {
          const res = await fetch(signedData.signedUrl, fetchOpts);
          if (res.ok) {
            buffer = Buffer.from(await res.arrayBuffer());
          } else {
            const fallback = await fetch(imageUrl, fetchOpts);
            if (!fallback.ok) {
              return { url: null, error: `fetch: ${fallback.status} ${fallback.statusText}` };
            }
            buffer = Buffer.from(await fallback.arrayBuffer());
          }
        } else {
          const res = await fetch(imageUrl, fetchOpts);
          if (!res.ok) {
            return { url: null, error: `fetch: ${res.status} ${res.statusText}` };
          }
          buffer = Buffer.from(await res.arrayBuffer());
        }
      }
    } else {
      buffer = Buffer.from(await downloadData.arrayBuffer());
    }
    if (buffer.length === 0) {
      return { url: null, error: "empty file" };
    }

    let webpBuffer: Buffer;
    try {
      webpBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();
    } catch (sharpErr) {
      const msg = sharpErr instanceof Error ? sharpErr.message : String(sharpErr);
      return { url: null, error: `sharp: ${msg}` };
    }

    const { error } = await client.storage
      .from(bucket)
      .upload(webpPath, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) {
      return { url: null, error: `upload: ${error.message}` };
    }

    const { data: urlData } = client.storage.from(bucket).getPublicUrl(webpPath);
    return { url: urlData?.publicUrl ?? null, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url: null, error: msg };
  }
}

/**
 * Converts storage images referenced in products/bundles to WebP and updates DB only after upload.
 * @param supabase - Supabase client (service role for storage upload + DB update).
 * @param options.dryRun - If true, no uploads and no DB updates; returns what would be done.
 */
export async function convertStorageToWebP(
  supabase: SupabaseClient,
  options: ConvertStorageToWebPOptions = {}
): Promise<ConvertStorageToWebPResult> {
  const { dryRun = false, supabaseUrl, serviceRoleKey } = options;
  const credentials =
    supabaseUrl && serviceRoleKey ? { supabaseUrl, serviceRoleKey } : undefined;
  const result: ConvertStorageToWebPResult = {
    converted: 0,
    productsUpdated: 0,
    bundlesUpdated: 0,
    skipped: [],
    refsRemoved: [],
    errors: [],
  };

  const client = supabase as any;

  /** Map original URL -> new WebP URL (so we only convert each file once) */
  const urlToWebp = new Map<string, string>();

  const resolveUrl = async (
    url: string | null | undefined
  ): Promise<string | null | undefined> => {
    if (url == null || typeof url !== "string") return url;
    if (/\.webp$/i.test(url)) return url;
    const parsed = parseStorageUrl(url);
    if (!parsed) {
      result.skipped.push(url);
      return url;
    }
    const cached = urlToWebp.get(url);
    if (cached !== undefined) return cached;
    const { url: newUrl, error: convertError, removeRef } = await fetchConvertAndUpload(
      supabase,
      url,
      parsed.bucket,
      parsed.path,
      parsed.webpPath,
      dryRun,
      credentials
    );
    if (newUrl) {
      urlToWebp.set(url, newUrl);
      result.converted++;
      return newUrl;
    }
    if (removeRef) {
      result.refsRemoved.push(url);
      return null;
    }
    result.errors.push(
      convertError ? `Failed to convert: ${url} — ${convertError}` : `Failed to convert: ${url}`
    );
    return url;
  };

  const resolveValue = async (
    value: string | string[] | null | undefined
  ): Promise<string | string[] | null | undefined> => {
    if (value == null) return value;
    if (Array.isArray(value)) {
      const out: string[] = [];
      for (const item of value) {
        if (typeof item === "string") {
          const r = await resolveUrl(item);
          if (r != null) out.push(r);
        } else {
          out.push(item);
        }
      }
      return out;
    }
    return resolveUrl(value);
  };

  try {
    const { data: products, error: productsError } = await client
      .from("products")
      .select("id, featured_image_url, logo_url, background_image_url, gallery_images");

    if (productsError) {
      result.errors.push(`products fetch: ${productsError.message}`);
      return result;
    }

    for (const row of products ?? []) {
      const featured = await resolveUrl(row.featured_image_url);
      const logo = await resolveUrl(row.logo_url);
      const background = await resolveUrl(row.background_image_url);
      const gallery = await resolveValue(row.gallery_images);

      const changed =
        featured !== row.featured_image_url ||
        logo !== row.logo_url ||
        background !== row.background_image_url ||
        (Array.isArray(gallery) &&
          Array.isArray(row.gallery_images) &&
          gallery.some((v, i) => v !== row.gallery_images[i]));

      if (!changed) continue;

      result.productsUpdated++;

      if (!dryRun) {
        const updates: Record<string, unknown> = {};
        if (featured !== row.featured_image_url) updates.featured_image_url = featured;
        if (logo !== row.logo_url) updates.logo_url = logo;
        if (background !== row.background_image_url) updates.background_image_url = background;
        if (gallery !== row.gallery_images) updates.gallery_images = gallery;

        const { error: updateError } = await client
          .from("products")
          .update(updates)
          .eq("id", row.id);

        if (updateError) {
          result.errors.push(`products ${row.id}: ${updateError.message}`);
        }
      }
    }

    const { data: bundles, error: bundlesError } = await client
      .from("bundles")
      .select("id, featured_image_url, logo_url, background_image_url, mosaic_image_url");

    if (bundlesError) {
      result.errors.push(`bundles fetch: ${bundlesError.message}`);
      return result;
    }

    for (const row of bundles ?? []) {
      const featured = await resolveUrl(row.featured_image_url);
      const logo = await resolveUrl(row.logo_url);
      const background = await resolveUrl(row.background_image_url);
      const mosaic = await resolveUrl(row.mosaic_image_url);

      const changed =
        featured !== row.featured_image_url ||
        logo !== row.logo_url ||
        background !== row.background_image_url ||
        mosaic !== row.mosaic_image_url;

      if (!changed) continue;

      result.bundlesUpdated++;

      if (!dryRun) {
        const updates: Record<string, unknown> = {};
        if (featured !== row.featured_image_url) updates.featured_image_url = featured;
        if (logo !== row.logo_url) updates.logo_url = logo;
        if (background !== row.background_image_url) updates.background_image_url = background;
        if (mosaic !== row.mosaic_image_url) updates.mosaic_image_url = mosaic;

        const { error: updateError } = await client
          .from("bundles")
          .update(updates)
          .eq("id", row.id);

        if (updateError) {
          result.errors.push(`bundles ${row.id}: ${updateError.message}`);
        }
      }
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    return result;
  }
}
