/**
 * @fileoverview Canonical `type` values for `products.downloads` JSON entries and NNAudio Access download payloads (`file`, `name`, `type`, …).
 * @module lib/product-download-types
 */

/**
 * @brief Ordered list of allowed download type discriminator strings stored in the database and returned by access APIs.
 */
export const PRODUCT_DOWNLOAD_TYPES = [
  "plugin",
  "samples",
  "docs",
  "midi",
  "loops",
  "kit",
  "application",
  "installer",
] as const;

/**
 * @brief Union of valid download type strings.
 */
export type ProductDownloadType = (typeof PRODUCT_DOWNLOAD_TYPES)[number];

/**
 * @brief Human-readable labels for admin UI and tooling.
 */
export const PRODUCT_DOWNLOAD_TYPE_LABELS: Record<ProductDownloadType, string> =
  {
    plugin: "Plugin",
    samples: "Samples",
    docs: "Documentation",
    midi: "MIDI Pack",
    loops: "Loops",
    kit: "Construction Kit",
    application: "Application",
    installer: "Installer",
  };
