/**
 * @fileoverview NN Audio homepage storefront: Cymasphere tile, named free
 * plugin tiles, paid catalog grid. Access lives in nav/footer only.
 * @module components/sections/StorefrontHome
 */

import Image from "next/image";
import Link from "next/link";
import { CYMASPHERE_SALES } from "@/lib/cymasphere-sales";
import {
  NNAUD_FREE_PLUGINS,
  freePluginLabel,
  matchNamedFreeProduct,
  type NamedCatalogItem,
} from "@/lib/free-tools";
import styles from "./storefront-home.module.css";

export interface StorefrontCatalogItem {
  name: string;
  href: string;
  imageUrl?: string | null;
  priceLabel: string;
}

interface StorefrontHomeProps {
  cymasphereImageUrl?: string | null;
  freeProducts?: NamedCatalogItem[];
  catalogProducts?: StorefrontCatalogItem[];
}

const CYMASPHERE_ART_FALLBACK = "/images/cymasphere-logo.png";
const CYMASPHERE_TILE_LINE =
  "MIDI harmony engine · $199 one-time · Progressions, voicings, voice leading.";

function productImage(product?: NamedCatalogItem): string | null {
  const url = product?.featured_image_url?.trim() || product?.logo_url?.trim();
  return url || null;
}

/**
 * @brief Renders a product-tile storefront. No door cards or Access hero.
 */
export function StorefrontHome({
  cymasphereImageUrl,
  freeProducts = [],
  catalogProducts = [],
}: StorefrontHomeProps) {
  const heroSrc = cymasphereImageUrl?.trim() || CYMASPHERE_ART_FALLBACK;
  const heroRemote = /^https?:\/\//i.test(heroSrc);

  return (
    <div className={styles.page}>
      <section className={styles.featured} aria-label="Cymasphere">
        <Link className={styles.featuredTile} href="/product/cymasphere">
          <span className={styles.featuredArt}>
            <Image
              src={heroSrc}
              alt="Cymasphere"
              fill
              priority
              sizes="(max-width: 860px) 100vw, 420px"
              unoptimized={heroRemote}
              style={{ objectFit: "contain" }}
            />
          </span>
          <span className={styles.featuredCopy}>
            <h1>Cymasphere</h1>
            <p className={styles.featuredLine}>{CYMASPHERE_TILE_LINE}</p>
            <span className={styles.cta}>{CYMASPHERE_SALES.ctaLabel}</span>
          </span>
        </Link>
      </section>

      <section className={styles.row} aria-label="Free">
        <h2 className={styles.rowTitle}>Free</h2>
        <ul className={styles.freeRow}>
          {NNAUD_FREE_PLUGINS.map((plugin) => {
            const match = matchNamedFreeProduct(plugin.name, freeProducts);
            const href = match?.slug ? `/product/${match.slug}` : plugin.href;
            const image = productImage(match);
            const label = freePluginLabel(plugin);
            return (
              <li key={plugin.name}>
                <Link className={styles.freeTile} href={href}>
                  <span className={styles.tileArt}>
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="160px"
                        unoptimized={/^https?:\/\//i.test(image)}
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <span className={styles.tileFallback}>{label}</span>
                    )}
                  </span>
                  <span className={styles.tileName}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.row} aria-label="Shop">
        <div className={styles.rowHead}>
          <h2>Shop</h2>
          <nav className={styles.cats} aria-label="Shop">
            <Link href="/plugins">Plugins</Link>
            <Link href="/packs">Packs</Link>
            <Link href="/bundles">Bundles</Link>
            <Link href="/products">All</Link>
          </nav>
        </div>
        {catalogProducts.length > 0 ? (
          <ul className={styles.shopGrid}>
            {catalogProducts.map((item) => (
              <li key={item.href}>
                <Link className={styles.shopTile} href={item.href}>
                  <span className={styles.tileArt}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="220px"
                        unoptimized={/^https?:\/\//i.test(item.imageUrl)}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span className={styles.tileFallback}>{item.name}</span>
                    )}
                  </span>
                  <span className={styles.tileName}>{item.name}</span>
                  <span className={styles.tilePrice}>{item.priceLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

export default StorefrontHome;
