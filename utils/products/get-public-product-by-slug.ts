/**
 * @fileoverview Server-side public product fetch for SSR product pages.
 * Strips download URLs and Stripe IDs. Does not increment view counts.
 * @module utils/products/get-public-product-by-slug
 */

import "server-only";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

export interface PublicProductReview {
  id?: string;
  rating: number;
  title?: string | null;
  review_text?: string | null;
  customer_name?: string | null;
  created_at?: string | null;
  is_verified_purchase?: boolean;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
  category: string | null;
  price: number;
  sale_price: number | null;
  featured_image_url: string | null;
  logo_url: string | null;
  background_image_url?: string | null;
  background_video_url?: string | null;
  gallery_images?: string[] | null;
  features?: unknown;
  requirements?: Record<string, unknown> | null;
  specifications?: Record<string, unknown> | null;
  audio_samples?: unknown;
  demo_videos?: unknown;
  demo_video_url?: string | null;
  download_version?: string | null;
  meta_keywords?: string | null;
  status?: string | null;
  average_rating: number;
  review_count: number;
  reviews: PublicProductReview[];
  [key: string]: unknown;
}

const PUBLIC_STRIP_KEYS = [
  "download_url",
  "downloads",
  "stripe_product_id",
  "stripe_price_id",
  "stripe_sale_price_id",
] as const;

function isApprovedReview(review: {
  is_approved?: boolean;
  moderation_status?: string;
}): boolean {
  return (
    review.is_approved === true || review.moderation_status === "approved"
  );
}

/**
 * @brief Loads one active public product by slug for server-rendered pages.
 * @returns Sanitized product, or null when missing / inactive / on query error.
 */
export async function getPublicProductBySlug(
  slug: string
): Promise<PublicProduct | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  try {
    const supabase = await createSupabaseServiceRole();
    const { data, error } = await (supabase as any)
      .from("products")
      .select(
        `
        *,
        product_reviews(rating, title, review_text, customer_name, created_at, is_approved, moderation_status, is_verified_purchase)
      `
      )
      .eq("slug", trimmed)
      .maybeSingle();

    if (error || !data) return null;
    if (data.status !== "active") return null;

    const reviews = data.product_reviews || [];
    const approved = reviews.filter(isApprovedReview);
    const average_rating =
      approved.length > 0
        ? approved.reduce(
            (sum: number, review: { rating?: number }) =>
              sum + (review.rating || 0),
            0
          ) / approved.length
        : 0;

    const sanitized = { ...data } as Record<string, unknown>;
    for (const key of PUBLIC_STRIP_KEYS) {
      delete sanitized[key];
    }
    delete sanitized.product_reviews;

    return {
      ...(sanitized as PublicProduct),
      average_rating,
      review_count: approved.length,
      reviews: approved,
    };
  } catch (error) {
    console.error("getPublicProductBySlug failed:", error);
    return null;
  }
}
