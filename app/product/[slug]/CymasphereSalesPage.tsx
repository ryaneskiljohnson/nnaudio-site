/**
 * @fileoverview Server-rendered Cymasphere sales page. Copy is in the initial
 * HTML so crawlers and ad previews are not stuck on "Loading product…".
 * @module app/product/[slug]/CymasphereSalesPage
 */

import Image from "next/image";
import {
  CYMASPHERE_FORMATS,
  CYMASPHERE_META,
  CYMASPHERE_PRESS,
  CYMASPHERE_PRICE_LABEL,
  CYMASPHERE_PRICE_NOTE,
  CYMASPHERE_PRICE_USD,
  CYMASPHERE_SALES,
} from "@/lib/cymasphere-sales";
import type { PublicProduct } from "@/utils/products/get-public-product-by-slug";
import CymasphereBuyButton from "./CymasphereBuyButton";
import styles from "./cymasphere-sales.module.css";

interface CymasphereSalesPageProps {
  product: PublicProduct | null;
}

/**
 * @brief Renders the Cymasphere offer, formats, and press proof in SSR HTML.
 */
export default function CymasphereSalesPage({
  product,
}: CymasphereSalesPageProps) {
  const imageSrc =
    product?.featured_image_url ||
    product?.logo_url ||
    "/images/cymasphere-logo.png";
  const imageIsRemote = /^https?:\/\//i.test(imageSrc);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cymasphere",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Windows, macOS, iPadOS",
    description: CYMASPHERE_META.description,
    offers: {
      "@type": "Offer",
      price: CYMASPHERE_PRICE_USD,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.visual}>
            <Image
              src={imageSrc}
              alt="Cymasphere"
              fill
              priority
              unoptimized={imageIsRemote}
              style={{ objectFit: "contain", padding: 24 }}
            />
          </div>

          <div>
            <p className={styles.eyebrow}>{CYMASPHERE_SALES.eyebrow}</p>
            <h1 className={styles.headline}>{CYMASPHERE_SALES.name}</h1>
            <p className={styles.lede}>{CYMASPHERE_SALES.lede}</p>
            <div className={styles.priceRow}>
              <p className={styles.price}>{CYMASPHERE_PRICE_LABEL}</p>
              <p className={styles.priceNote}>{CYMASPHERE_PRICE_NOTE}</p>
            </div>
            <ul className={styles.formats}>
              {CYMASPHERE_FORMATS.map((format) => (
                <li key={format} className={styles.format}>
                  {format}
                </li>
              ))}
            </ul>
            <CymasphereBuyButton product={product} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{CYMASPHERE_SALES.whatItIsTitle}</h2>
        <div className={styles.copy}>
          {CYMASPHERE_SALES.whatItIs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{CYMASPHERE_SALES.howTitle}</h2>
        <div className={styles.grid}>
          {CYMASPHERE_SALES.howItems.map((item) => (
            <article key={item.title} className={styles.card}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{CYMASPHERE_SALES.formatsTitle}</h2>
        <ul className={styles.formats}>
          {CYMASPHERE_FORMATS.map((format) => (
            <li key={`spec-${format}`} className={styles.format}>
              {format}
            </li>
          ))}
        </ul>
        <p className={styles.formatsNote}>{CYMASPHERE_SALES.formatsNote}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Press</h2>
        <div className={styles.proof}>
          {CYMASPHERE_PRESS.map((item) => (
            <article key={item.source} className={styles.card}>
              <cite className={styles.cite}>{item.source}</cite>
              <blockquote className={styles.quote}>“{item.quote}”</blockquote>
              <p className={styles.context}>{item.context}</p>
              <a
                className={styles.link}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ctaWrap}>
        <h2 className={styles.srOnly}>Buy Cymasphere</h2>
        <p className={styles.lede}>
          {CYMASPHERE_PRICE_LABEL} {CYMASPHERE_PRICE_NOTE.toLowerCase()}. VST3,
          AU, standalone, and iPad.
        </p>
        <CymasphereBuyButton product={product} />
      </section>
    </main>
  );
}
