/**
 * @brief Builds an absolute asset URL without doubling the site origin when
 * the asset is already absolute.
 */
export function absoluteAssetUrl(
  asset: string | undefined,
  siteUrl: string
): string {
  const value = (asset || "").trim();
  if (!value) return siteUrl;
  if (/^https?:\/\//i.test(value)) return value;
  const origin = siteUrl.replace(/\/$/, "");
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}
