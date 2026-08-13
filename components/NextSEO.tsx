"use client";

import React, { ReactNode, useEffect } from "react";
import { absoluteAssetUrl } from "@/utils/seo/absolute-asset-url";

interface NextSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: string;
  noindex?: boolean;
  children?: ReactNode;
}

const DEFAULT_OG_IMAGE =
  "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/meta/og-image.webp";

function upsertMeta(
  selector: string,
  attrs: Record<string, string>,
  content: string
) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Client-side document head updater for App Router pages that cannot use next/head.
 * Public routes should still export generateMetadata from a server layout.
 */
const NextSEO: React.FC<NextSEOProps> = ({
  title = "NNAudio - Discover Sound in a New Way",
  description = "A platform for exploring and creating with sound in a new dimension.",
  keywords = "music, sound, visualization, audio, synthesis",
  canonical = "",
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  twitterCard = "summary_large_image",
  noindex = false,
  children,
}) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const canonicalUrl = canonical
    ? absoluteAssetUrl(canonical, siteUrl)
    : siteUrl;
  const imageUrl = absoluteAssetUrl(ogImage, siteUrl);

  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description" }, description);
    upsertMeta('meta[name="keywords"]', { name: "keywords" }, keywords);
    upsertMeta('meta[property="og:title"]', { property: "og:title" }, title);
    upsertMeta(
      'meta[property="og:description"]',
      { property: "og:description" },
      description
    );
    upsertMeta('meta[property="og:type"]', { property: "og:type" }, ogType);
    upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    upsertMeta('meta[property="og:image"]', { property: "og:image" }, imageUrl);
    upsertMeta(
      'meta[property="og:site_name"]',
      { property: "og:site_name" },
      "NNAudio"
    );
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, twitterCard);
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
    upsertMeta(
      'meta[name="twitter:description"]',
      { name: "twitter:description" },
      description
    );
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, imageUrl);

    if (noindex) {
      upsertMeta(
        'meta[name="robots"]',
        { name: "robots" },
        "noindex,nofollow"
      );
    }

    if (canonicalUrl) {
      let link = document.head.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
    }
  }, [
    title,
    description,
    keywords,
    canonicalUrl,
    ogType,
    imageUrl,
    twitterCard,
    noindex,
  ]);

  return <>{children}</>;
};

export default NextSEO;
