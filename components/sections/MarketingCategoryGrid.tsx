/**
 * @fileoverview Server-rendered homepage catalog tiles. No framer-motion
 * and no client JS — counts and cover art come from the catalog seed.
 * Product artwork fills each tile; copy sits on a gradient overlay.
 * @module components/sections/MarketingCategoryGrid
 */

import type { CSSProperties } from "react";
import Link from "next/link";
import type { HomepageCategoryTile } from "@/lib/homepage-hero-seed";

const CATEGORY_RGB: Record<string, string> = {
  instruments: "108, 99, 255",
  effects: "78, 205, 196",
  "midi-fx": "255, 154, 96",
  packs: "255, 110, 160",
  bundles: "255, 210, 110",
  free: "120, 220, 140",
  access: "72, 140, 255",
};

/**
 * @brief Catalog bento grid painted as static HTML.
 * @param categories Seed tiles; zero-count tiles hide unless alwaysShow.
 * @returns The catalog section.
 */
export default function MarketingCategoryGrid({
  categories,
}: {
  categories: HomepageCategoryTile[];
}) {
  const visible = categories.filter((c) => c.count > 0 || c.alwaysShow);
  if (visible.length === 0) return null;

  return (
    <section id="catalog" className="marketing-catalog">
      <div className="marketing-catalog-inner">
        <p className="marketing-catalog-eyebrow">The catalog</p>
        <h2 className="marketing-catalog-title">Find what you need</h2>
        <p className="marketing-catalog-sub">
          Every product works on its own. Together they answer to Cymasphere.
        </p>
        <div className="marketing-catalog-grid">
          {visible.map((tile, index) => {
            const cover = tile.images?.[0];
            return (
              <Link
                key={tile.key}
                href={tile.href}
                prefetch={false}
                className={
                  index < 2
                    ? "marketing-catalog-tile is-wide"
                    : "marketing-catalog-tile"
                }
                style={
                  {
                    "--cat": CATEGORY_RGB[tile.key] ?? "108, 99, 255",
                  } as CSSProperties
                }
              >
                {cover ? (
                  <span className="marketing-catalog-cover" aria-hidden>
                    <img src={cover} alt="" loading="lazy" />
                  </span>
                ) : null}
                <span className="marketing-catalog-copy">
                  <span className="marketing-catalog-count">{tile.count}</span>
                  <span className="marketing-catalog-label">{tile.label}</span>
                  {tile.blurb ? (
                    <span className="marketing-catalog-blurb">{tile.blurb}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
