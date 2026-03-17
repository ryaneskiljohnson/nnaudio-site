/**
 * @fileoverview Canonical product taxonomy for the public storefront. Ensures every
 * product family has one unmistakable home and consistent labels across nav, filters,
 * and catalog pages.
 * @module utils/catalog-taxonomy
 */

/** DB enum value for products.category (product_category in Supabase). */
export type ProductCategory =
  | "audio-fx-plugin"
  | "instrument-plugin"
  | "midi-fx-plugin"
  | "plugin"
  | "pack"
  | "bundle"
  | "application"
  | "preset"
  | "template";

/**
 * @brief Storefront family: a single "home" in the nav and one URL that lists all products in that family.
 */
export interface ProductFamily {
  /** URL path for this family (e.g. /plugins, /products?category=application). */
  path: string;
  /** Short label for nav and buttons. */
  label: string;
  /** DB categories that belong to this family. Empty for families served by another source (e.g. bundles table). */
  categories: ProductCategory[];
}

/**
 * @brief Ordered list of storefront families. Defines nav order and "one home" per family.
 */
export const PRODUCT_FAMILIES: ProductFamily[] = [
  {
    path: "/free-tools",
    label: "Free Tools",
    categories: [], // Free is a filter (price/sale_price), not a category
  },
  {
    path: "/plugins",
    label: "Plugins",
    categories: ["audio-fx-plugin", "instrument-plugin", "midi-fx-plugin", "plugin"],
  },
  {
    path: "/packs",
    label: "Packs",
    categories: ["pack"],
  },
  {
    path: "/bundles",
    label: "Bundles",
    categories: [], // Bundles come from bundles table; products.category=bundle is for bundle products that are also in bundles
  },
  {
    path: "/products?category=application",
    label: "Apps",
    categories: ["application"],
  },
  {
    path: "/products",
    label: "All Products",
    categories: [], // All categories
  },
];

/**
 * @brief Human-readable label for each DB category (filters, breadcrumbs, meta).
 */
export const CATEGORY_LABELS: Record<string, string> = {
  all: "All Products",
  "audio-fx-plugin": "Audio FX",
  "instrument-plugin": "Instruments",
  "midi-fx-plugin": "MIDI FX",
  plugin: "Creative Tools",
  pack: "Packs",
  bundle: "Bundles",
  application: "Apps",
  preset: "Presets",
  template: "Templates",
};

/**
 * @brief All DB categories that appear in the products table, in display order for filters.
 */
export const ALL_CATEGORIES: ProductCategory[] = [
  "audio-fx-plugin",
  "instrument-plugin",
  "midi-fx-plugin",
  "plugin",
  "pack",
  "bundle",
  "application",
  "preset",
  "template",
];

/**
 * @brief DB categories that belong to the "Plugins" storefront family.
 */
export const PLUGIN_CATEGORIES: ProductCategory[] = [
  "audio-fx-plugin",
  "instrument-plugin",
  "midi-fx-plugin",
  "plugin",
];

/**
 * @brief Returns the storefront family that owns the given category, or null.
 */
export function getFamilyForCategory(category: string | null | undefined): ProductFamily | null {
  if (!category) return null;
  return PRODUCT_FAMILIES.find((f) => f.categories.includes(category as ProductCategory)) ?? null;
}

/**
 * @brief Returns the canonical filter label for a category.
 */
export function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return "All Products";
  return CATEGORY_LABELS[category] ?? category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
