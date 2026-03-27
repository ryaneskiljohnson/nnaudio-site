/**
 * @fileoverview Slug for the product that uses `/api/stripe/checkout` (multi-tier membership).
 * @module utils/products/membership-product
 */

/**
 * @brief Slug of the `products` row used for plan checkout (default cymasphere).
 * @returns Trimmed env `NEXT_PUBLIC_MEMBERSHIP_PRODUCT_SLUG` or `cymasphere`.
 */
export function getMembershipProductSlug(): string {
  return (
    process.env.NEXT_PUBLIC_MEMBERSHIP_PRODUCT_SLUG?.trim() || "cymasphere"
  );
}
