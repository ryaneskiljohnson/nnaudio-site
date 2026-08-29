/**
 * @fileoverview Contentful Suspense fallback for the homepage while the
 * catalog seed resolves. Shows the hero headline and a catalog shell so
 * the page never paints a blank 100svh hole.
 * @module components/sections/HomeCatalogFallback
 */

import HeroReloadDebugMark from "@/components/HeroReloadDebugMark";

/** Rendered Cymasphere planet used by the idle hero poster. */
const CYMASPHERE_SUN_POSTER = "/images/cymasphere-sun-sphere-hero.webp";

/**
 * @brief Static first paint while {@link getHomepageCatalogSeed} runs.
 * @returns Hero shell + catalog placeholder (no empty main).
 */
export default function HomeCatalogFallback() {
  return (
    <>
      <HeroReloadDebugMark source="home-fallback" />
      <section
        id="home"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          height: "100svh",
          minHeight: "100svh",
          width: "100%",
          marginBottom: 28,
          overflow: "hidden",
          background: "#02030a",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "relative",
            flex: "1 1 auto",
            minHeight: 0,
            width: "100%",
          }}
        >
          <img
            src={CYMASPHERE_SUN_POSTER}
            alt=""
            width={1280}
            height={1280}
            decoding="async"
            style={{
              position: "absolute",
              left: "50%",
              top: "46%",
              width: "min(42vw, 220px)",
              height: "min(42vw, 220px)",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              objectFit: "cover",
            }}
          />
        </div>
        <div
          data-hero-headline=""
          style={{
            position: "absolute",
            left: "50%",
            bottom: 28,
            zIndex: 4,
            width: "min(560px, calc(100% - 2rem))",
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <h1>
            Worlds of sound.
            <br />
            Orbiting in harmony.
          </h1>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a className="hero-cta hero-cta-primary" href="/product/cymasphere">
              Explore <span className="hero-nowrap whitespace-nowrap">Cymasphere</span>
            </a>
            <a className="hero-cta hero-cta-secondary" href="#catalog">
              Browse The Universe
            </a>
          </div>
        </div>
      </section>
      <section
        id="catalog"
        className="marketing-catalog"
        aria-busy="true"
        aria-label="Catalog loading"
      >
        <div className="marketing-catalog-inner">
          <p className="marketing-catalog-eyebrow">The catalog</p>
          <h2 className="marketing-catalog-title">Find what you need</h2>
          <p className="marketing-catalog-sub">
            Every product works on its own. Together they answer to Cymasphere.
          </p>
        </div>
      </section>
    </>
  );
}
