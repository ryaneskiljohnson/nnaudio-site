/**
 * @fileoverview Server-rendered Cymasphere $149 one-time sales page.
 * @module app/product/[slug]/CymasphereSalesPage
 */

import Image from "next/image";
import Link from "next/link";
import {
  CYMASPHERE_ATTACK,
  CYMASPHERE_FAQ,
  CYMASPHERE_FORMATS,
  CYMASPHERE_META,
  CYMASPHERE_PRICE_LABEL,
  CYMASPHERE_PRICE_USD,
  CYMASPHERE_SALES,
  CYMASPHERE_SOS,
} from "@/lib/cymasphere-sales";
import type { PublicProduct } from "@/utils/products/get-public-product-by-slug";
import { MultiVideoPlayer } from "@/app/components/MultiVideoPlayer";
import CymasphereBuyButton from "./CymasphereBuyButton";
import styles from "./cymasphere-sales.module.css";

interface CymasphereSalesPageProps {
  product: PublicProduct | null;
}

interface DemoVideo {
  url: string;
  order: number;
}

function getDemoVideos(product: PublicProduct | null): DemoVideo[] {
  const raw = product?.demo_videos;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((item, index) => {
        const rec = item as { url?: unknown; order?: unknown };
        const url = typeof rec.url === "string" ? rec.url.trim() : "";
        const order =
          typeof rec.order === "number" ? rec.order : index + 1;
        return { url, order };
      })
      .filter((item) => item.url.length > 0)
      .sort((a, b) => a.order - b.order);
  }
  const legacy =
    typeof product?.demo_video_url === "string"
      ? product.demo_video_url.trim()
      : "";
  return legacy ? [{ url: legacy, order: 1 }] : [];
}

/**
 * @brief Renders the locked Cymasphere offer and supplied sales copy in SSR HTML.
 */
export default function CymasphereSalesPage({
  product,
}: CymasphereSalesPageProps) {
  const imageSrc =
    product?.featured_image_url ||
    product?.logo_url ||
    "/images/cymasphere-logo.png";
  const imageIsRemote = /^https?:\/\//i.test(imageSrc);
  const videos = getDemoVideos(product);

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
              sizes="(max-width: 860px) 100vw, 480px"
              unoptimized={imageIsRemote}
              style={{ objectFit: "contain", padding: 24 }}
            />
          </div>

          <div>
            <p className={styles.eyebrow}>{CYMASPHERE_SALES.eyebrow}</p>
            <h1 className={styles.headline}>{CYMASPHERE_SALES.headline}</h1>
            <p className={styles.lede}>{CYMASPHERE_SALES.lede}</p>
            <p className={styles.priceLine}>{CYMASPHERE_SALES.priceLine}</p>
            <ul className={styles.formats}>
              {CYMASPHERE_FORMATS.map((format) => (
                <li key={format} className={styles.format}>
                  {format}
                </li>
              ))}
            </ul>
            <div className={styles.ctaRow}>
              <CymasphereBuyButton product={product} />
              {videos.length > 0 ? (
                <a className={styles.secondaryCta} href="#hear-it">
                  {CYMASPHERE_SALES.hearItLabel}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.lead}>{CYMASPHERE_SALES.valueLead}</p>
        <ul className={styles.bullets}>
          {CYMASPHERE_SALES.valueBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className={styles.copyTight}>{CYMASPHERE_SALES.valueCloser}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{CYMASPHERE_SALES.aisleTitle}</h2>
        {CYMASPHERE_SALES.aisleBody.map((paragraph) => (
          <p key={paragraph} className={styles.copyP}>
            {paragraph}
          </p>
        ))}
        {CYMASPHERE_ATTACK.quotes.map((quote) => (
          <blockquote key={quote} className={styles.quote}>
            “{quote}”
          </blockquote>
        ))}
        <p className={styles.context}>
          {CYMASPHERE_ATTACK.source}, {CYMASPHERE_ATTACK.date}
        </p>
        <a
          className={styles.link}
          href={CYMASPHERE_ATTACK.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          Attack Magazine
        </a>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{CYMASPHERE_SALES.howTitle}</h2>
        <ol className={styles.steps}>
          {CYMASPHERE_SALES.howSteps.map((step, index) => (
            <li key={step.title}>
              <h3>
                {index + 1}. {step.title}
              </h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <p className={styles.formatsNote}>{CYMASPHERE_SALES.formatsNote}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{CYMASPHERE_SALES.limitsTitle}</h2>
        {CYMASPHERE_SALES.limitsBody.map((paragraph) => (
          <p key={paragraph} className={styles.copyP}>
            {paragraph}
          </p>
        ))}
        <blockquote className={styles.quote}>
          “{CYMASPHERE_SOS.limitQuotes[0]}”
        </blockquote>
        <p className={styles.context}>
          {CYMASPHERE_SOS.source} ({CYMASPHERE_SOS.author})
        </p>
        <blockquote className={styles.quote}>
          “{CYMASPHERE_SOS.limitQuotes[1]}”
        </blockquote>
        <p className={styles.context}>
          {CYMASPHERE_SOS.source} (that version)
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Press</h2>
        <article className={styles.card}>
          <cite className={styles.cite}>
            {CYMASPHERE_SOS.source} — {CYMASPHERE_SOS.author},{" "}
            {CYMASPHERE_SOS.date}
          </cite>
          {CYMASPHERE_SOS.quotes.map((quote) => (
            <blockquote key={quote} className={styles.quote}>
              “{quote}”
            </blockquote>
          ))}
          <a
            className={styles.link}
            href={CYMASPHERE_SOS.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Sound on Sound review
          </a>
        </article>
      </section>

      {videos.length > 0 ? (
        <section className={styles.section} id="hear-it">
          <h2 className={styles.sectionTitle}>Hear it</h2>
          <MultiVideoPlayer videos={videos} />
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{CYMASPHERE_SALES.accessTitle}</h2>
        <p className={styles.copyP}>{CYMASPHERE_SALES.accessBody}</p>
        <Link className={styles.link} href="/product/nnaudio-access">
          NNAudio Access
        </Link>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{CYMASPHERE_SALES.faqTitle}</h2>
        <dl className={styles.faq}>
          {CYMASPHERE_FAQ.map((item) => (
            <div key={item.q} className={styles.faqItem}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.ctaWrap}>
        <h2 className={styles.sectionTitle}>Get Cymasphere</h2>
        <p className={styles.priceLine}>{CYMASPHERE_SALES.buyLine}</p>
        <p className={styles.srOnly}>{CYMASPHERE_PRICE_LABEL} one-time.</p>
        <CymasphereBuyButton product={product} />
      </section>
    </main>
  );
}
