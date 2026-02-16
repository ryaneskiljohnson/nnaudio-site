/**
 * @fileoverview Canonical key for bundle mosaic image deduplication.
 * @module utils/canonicalImageKey
 *
 * Ensures the same image is never shown twice in a mosaic by normalizing URLs
 * so that different URLs pointing to the same image (e.g. Supabase public vs
 * signed, with/without query params, encoded vs decoded path) produce the same key.
 */

/**
 * Returns a canonical key for an image URL so that duplicate images (same file,
 * different URL format) are deduplicated. Same key => same image => show once.
 *
 * @param url - Raw image URL (e.g. featured_image_url or logo_url)
 * @returns Canonical key string, or '' if url is empty/invalid
 *
 * @note
 * - Supabase: strips /object/public/ and /object/sign/ and query so same object = same key
 * - Decodes path so %20 and space match
 * - Normalizes slashes and trailing slash
 */
export function getCanonicalImageKey(url: string): string {
  const u = (url || '').trim();
  if (!u) return '';

  try {
    if (u.startsWith('http://') || u.startsWith('https://')) {
      const parsed = new URL(u);
      let path = (parsed.pathname || '/');
      // Supabase storage: /storage/v1/object/public/BUCKET/path or /object/sign/BUCKET/path?token=...
      const supabaseMatch = path.match(/^\/storage\/v1\/object\/(public|sign)\/(.+)$/i);
      if (supabaseMatch) {
        path = '/' + supabaseMatch[2]; // bucket + object path (same for public and sign)
      }
      try {
        path = decodeURIComponent(path);
      } catch {
        // leave as-is if decode fails
      }
      path = path.toLowerCase().replace(/\/+$/, '').replace(/\/+/g, '/') || '/';
      return `${parsed.origin}${path}`;
    }
    if (u.startsWith('/')) {
      let path = u;
      try {
        path = decodeURIComponent(path);
      } catch {
        path = u;
      }
      return path.toLowerCase().replace(/\/+$/, '').replace(/\/+/g, '/');
    }
    return u.toLowerCase().replace(/#.*$/, '').replace(/\?.*$/, '').replace(/\/+$/, '');
  } catch {
    return u.toLowerCase().replace(/#.*$/, '').replace(/\?.*$/, '').replace(/\/+$/, '');
  }
}
