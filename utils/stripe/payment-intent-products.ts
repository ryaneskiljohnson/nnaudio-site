/**
 * @fileoverview Resolve human-readable product names from a Stripe PaymentIntent.
 * Cart checkouts store line items in `metadata.cart_items`; lifetime and bundle
 * payments use other metadata keys. Used by admin order views.
 * @module utils/stripe/payment-intent-products
 */

/**
 * @brief Line item shape stored on PaymentIntent `metadata.cart_items`.
 */
export interface StripeCartItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
}

/**
 * @brief Parses `metadata.cart_items` JSON into line items.
 * @param cartItemsJson Raw JSON string from Stripe metadata, or undefined.
 * @returns Parsed items, or an empty array when missing or invalid.
 * @note Invalid JSON is treated as no items so admin views still render the payment.
 * @example
 * ```ts
 * parseStripeCartItems('[{"id":"abc","name":"CymaSynth"}]');
 * // [{ id: "abc", name: "CymaSynth" }]
 * ```
 */
export function parseStripeCartItems(
  cartItemsJson: string | undefined
): StripeCartItem[] {
  if (!cartItemsJson?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(cartItemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StripeCartItem =>
        item !== null && typeof item === "object"
    );
  } catch {
    return [];
  }
}

/**
 * @brief Turns a bundle slug into a display name (e.g. `elite-bundle` → `Elite Bundle`).
 * @param slug Bundle slug from PaymentIntent metadata.
 * @returns Title-cased name.
 * @example
 * ```ts
 * formatBundleSlugAsName("ultimate-elite-bundle");
 * // "Ultimate Elite Bundle"
 * ```
 */
export function formatBundleSlugAsName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @brief Deduplicates names while preserving first-seen order.
 * @param names Product or line-item names.
 * @returns Unique trimmed names.
 */
function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

/**
 * @brief Resolves product names for a PaymentIntent from cart metadata and fallbacks.
 * @param metadata Stripe PaymentIntent metadata (may be empty).
 * @param description PaymentIntent description, when Stripe set one.
 * @param invoiceLineDescriptions Optional invoice line descriptions for subscription PIs.
 * @returns Display names for what was purchased; empty when nothing can be inferred.
 * @note Prefer `cart_items` names. Lifetime and bundle metadata come next, then invoice
 *   lines, then the PI description. Does not hit Stripe or the catalog.
 * @example
 * ```ts
 * productNamesFromPaymentIntent(
 *   { cart_items: '[{"name":"CymaSynth"}]' },
 *   null
 * );
 * // ["CymaSynth"]
 * ```
 */
export function productNamesFromPaymentIntent(
  metadata: Record<string, string> | null | undefined,
  description?: string | null,
  invoiceLineDescriptions?: string[]
): string[] {
  const items = parseStripeCartItems(metadata?.cart_items);
  const fromCart = uniqueNames(
    items.map((item) => item.name ?? "").filter((name) => name.length > 0)
  );
  if (fromCart.length > 0) return fromCart;

  if (metadata?.purchase_type === "lifetime") {
    return ["Lifetime Access"];
  }

  const bundleSlug = metadata?.bundle_slug?.trim();
  if (bundleSlug) {
    const bundleName = formatBundleSlugAsName(bundleSlug);
    const tier = metadata?.tier?.trim();
    return [tier ? `${bundleName} (${tier})` : bundleName];
  }

  const fromInvoice = uniqueNames(invoiceLineDescriptions ?? []);
  if (fromInvoice.length > 0) return fromInvoice;

  const fromDescription = description?.trim();
  if (fromDescription) return [fromDescription];

  return [];
}

/**
 * @brief Formats an admin order row's product names for a table cell.
 * @param row Order row with optional `productNames` and legacy `productName`.
 * @returns Comma-separated names, or an empty string when none are present.
 * @example
 * ```ts
 * formatOrderProductNames({ productNames: ["CymaSynth", "Cymasphere"] });
 * // "CymaSynth, Cymasphere"
 * ```
 */
export function formatOrderProductNames(row: {
  productName?: string | null;
  productNames?: string[];
}): string {
  if (row.productNames && row.productNames.length > 0) {
    return row.productNames.join(", ");
  }
  return row.productName?.trim() ?? "";
}
