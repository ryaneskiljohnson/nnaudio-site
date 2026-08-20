/**
 * @fileoverview Short nnaud.io homepage: utility line plus three doors.
 * Cymasphere’s long $199 lander stays on /product/cymasphere.
 * @module components/sections/StorefrontHome
 */

import Link from "next/link";
import {
  CYMASPHERE_PRICE_LABEL,
  CYMASPHERE_SALES,
} from "@/lib/cymasphere-sales";
import styles from "./storefront-home.module.css";

const CATALOG_HREF = "/products";
const FREE_HREF = "/free-tools";

/**
 * @brief Renders the three-door storefront and no below-the-fold reprints.
 */
export default function StorefrontHome() {
  return (
    <main className={styles.page}>
      <p className={styles.utility}>
        NN Audio · plugins, packs, MIDI · Michigan. NNAudio Access — download,
        install, update, library. Mac &amp; Windows.
      </p>

      <div className={styles.doors}>
        <article className={styles.door}>
          <h2>Free</h2>
          <p>Get the tools in the session. No card.</p>
          <p>FreeQ, Freelay, Freeverb, Sterfreeo, Cowboy Harp.</p>
          <Link className={styles.cta} href={FREE_HREF}>
            Get the free tools
          </Link>
        </article>

        <article className={styles.door}>
          <h2>Cymasphere · {CYMASPHERE_PRICE_LABEL} one-time</h2>
          <p>
            MIDI harmony engine. Progressions, voicings, voice leading. Not a
            subscription.
          </p>
          <Link className={styles.cta} href="/product/cymasphere">
            {CYMASPHERE_SALES.ctaLabel}
          </Link>
        </article>

        <article className={styles.door}>
          <h2>Catalog</h2>
          <p>The rest of the shop. Plugins, packs, MIDI, bundles.</p>
          <Link className={styles.cta} href={CATALOG_HREF}>
            Browse
          </Link>
        </article>
      </div>
    </main>
  );
}
