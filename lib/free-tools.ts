/**
 * @fileoverview Named free plugins that ship on nnaud.io.
 * @module lib/free-tools
 */

export const NNAUD_FREE_PLUGINS = [
  {
    name: "FreeQ",
    kind: "EQ",
    href: "/product/freeq-free-eq-module-plugin",
  },
  {
    name: "Freelay",
    kind: "Delay",
    href: "/product/freelay-free-delay-module-plugin",
  },
  {
    name: "Freeverb",
    kind: "Reverb",
    href: "/product/freeverb-free-reverb-module-plugin",
  },
  {
    name: "Sterfreeo",
    kind: "Stereo",
    href: "/product/sterfreeo-free-stereo-module-plugin",
  },
  {
    name: "Cowboy Harp",
    kind: "Harp",
    href: "/product/cowboy-harp-free-jaw-harp-plugin",
  },
] as const;

export const NNAUD_FREE_PLUGIN_NAMES = [
  "FreeQ",
  "Freelay",
  "Freeverb",
  "Sterfreeo",
  "Cowboy Harp",
] as const;

export const NNAUD_FREE_PLUGIN_HREFS: Record<
  (typeof NNAUD_FREE_PLUGIN_NAMES)[number],
  string
> = {
  FreeQ: "/product/freeq-free-eq-module-plugin",
  Freelay: "/product/freelay-free-delay-module-plugin",
  Freeverb: "/product/freeverb-free-reverb-module-plugin",
  Sterfreeo: "/product/sterfreeo-free-stereo-module-plugin",
  "Cowboy Harp": "/product/cowboy-harp-free-jaw-harp-plugin",
};

export interface NamedCatalogItem {
  name: string;
  slug?: string | null;
  featured_image_url?: string | null;
  logo_url?: string | null;
}

export function freePluginLabel(plugin: {
  name: string;
  kind: string;
}): string {
  return `${plugin.name} ${plugin.kind}`;
}

export function matchNamedFreeProduct(
  name: string,
  products: NamedCatalogItem[]
): NamedCatalogItem | undefined {
  return products.find((product) =>
    product.name.toLowerCase().includes(name.toLowerCase())
  );
}
