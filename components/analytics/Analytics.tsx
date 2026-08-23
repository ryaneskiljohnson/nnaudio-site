"use client";

/**
 * @fileoverview Conditionally loads GTM, GA, and Meta Pixel from public
 * env ids. Homepage GTM is deferred so the container does not compete
 * with LCP / TBT on first mobile paint.
 * @module components/analytics/Analytics
 */

import Script from "next/script";
import { usePathname } from "next/navigation";
import { GoogleAnalytics, MetaPixel } from "@/components/common/NextScript";

/**
 * @brief Renders tracking scripts when the matching public env vars exist.
 * @returns GTM / GA / Meta snippets, or nothing when ids are unset.
 * @note GTM uses `afterInteractive` on `/` and `beforeInteractive` elsewhere
 * so marketing first paint is not blocked by the tag container.
 */
export default function Analytics() {
  const pathname = usePathname();
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gtmStrategy =
    pathname === "/" ? "afterInteractive" : "beforeInteractive";

  return (
    <>
      {gtmId && (
        <>
          <Script
            id="gtm-datalayer"
            strategy={gtmStrategy}
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
              `,
            }}
          />
          <Script
            id="gtm-container"
            strategy={gtmStrategy}
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {gaId && !gtmId && <GoogleAnalytics id={gaId} />}

      {metaPixelId && <MetaPixel pixelId={metaPixelId} />}
    </>
  );
}
