import React, { ReactNode } from "react";
import Head from "next/head";

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

/**
 * SEO component for Next.js
 * This component handles all meta tags for SEO and social sharing
 */
const NextSEO: React.FC<NextSEOProps> = ({
  title = "NNAudio - Discover Sound in a New Way",
  description = "A platform for exploring and creating with sound in a new dimension.",
  keywords = "music, sound, visualization, audio, synthesis",
  canonical = "",
  ogType = "website",
  ogImage = "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/feature-images/meta/og-image.webp",
  twitterCard = "summary_large_image",
  noindex = false,
  children,
}) => {
  // Calculate the canonical URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : siteUrl;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:site_name" content="NNAudio" />

      {/* Twitter Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />

      {/* Additional tags */}
      {children}
    </Head>
  );
};

export default NextSEO;
