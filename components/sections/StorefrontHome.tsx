/**
 * @fileoverview NN Audio homepage storefront: Cymasphere product, free plugin
 * row, tight catalog, quiet Access line. Not a strategy pamphlet.
 * @module components/sections/StorefrontHome
 */

import Image from "next/image";
import Link from "next/link";
import {
  CYMASPHERE_PRICE_LABEL,
  CYMASPHERE_SALES,
} from "@/lib/cymasphere-sales";
import {
  NNAUD_FREE_PLUGIN_HREFS,
  NNAUD_FREE_PLUGIN_NAMES,
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

function productImage(product?: NamedCatalogItem): string | null {
  const url = product?.featured_image_url?.trim() || product?.logo_url?.trim();
  return url || null;
}

/**
 * @brief Renders a product-first storefront. No door-card manifesto.
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
      <section className={styles.hero} aria-label="Cymasphere">
        <div className={styles.heroCopy}>
          <p className={styles.brand}>NN Audio</p>
          <h1>Cymasphere</h1>
          <p className={styles.heroLine}>
            MIDI harmony engine. Progressions, voicings, voice leading.
          </p>
          <p className={styles.price}>{CYMASPHERE_PRICE_LABEL} one-time</p>
          <Link className={styles.cta} href="/product/cymasphere">
            {CYMASPHERE_SALES.ctaLabel}
          </Link>
        </div>
        <div className={styles.heroArt}>
          <Image
            src={heroSrc}
            alt="Cymasphere"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 480px"
            unoptimized={heroRemote}
            style={{ objectFit: "contain" }}
          />
        </div>
      </section>

      <section className={styles.row} aria-label="Free plugins">
        <div className={styles.rowHead}>
          <h2>Free</h2>
          <Link href="/free-tools">All free tools</Link>
        </div>
        <ul className={styles.freeRow}>
          {NNAUD_FREE_PLUGIN_NAMES.map((name) => {
            const match = matchNamedFreeProduct(name, freeProducts);
            const href = match?.slug
              ? `/product/${match.slug}`
              : NNAUD_FREE_PLUGIN_HREFS[name];
            const image = productImage(match);
            return (
              <li key={name}>
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
                      <span className={styles.tileFallback}>{name}</span>
                    )}
                  </span>
                  <span className={styles.tileName}>{name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.row} aria-label="Catalog">
        <div className={styles.rowHead}>
          <h2>Shop</h2>
          <nav className={styles.cats} aria-label="Catalog">
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

      <p className={styles.access}>
        <Link href="/product/nnaudio-access">NNAudio Access</Link>
        {" — download, install, update, library. Mac & Windows."}
      </p>
    </div>
  );
}

export default StorefrontHome;
