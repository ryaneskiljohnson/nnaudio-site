"use server";

/**
 * @fileoverview Loads the authenticated user's owned products and review state.
 * @module app/actions/my-products
 */

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { getAccessibleProductIds } from "@/utils/nnaudio-access/access";

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  featured_image_url: string | null;
  logo_url: string | null;
  short_description: string | null;
  tagline: string | null;
  review_id: string | null;
  review_rating: number | null;
  review_text: string | null;
  review_status: "not_submitted" | "pending" | "approved" | "rejected";
  review_rejection_reason: string | null;
  review_updated_at: string | null;
  reward_eligible: boolean;
  reward_claimed_at: string | null;
}

/**
 * @brief Loads all products the authenticated user can access.
 * @returns Purchased products enriched with the user's review and reward state.
 * @note Ownership is resolved through the shared access helper so bundle expansion stays consistent.
 * @example
 * const result = await getMyProducts();
 */
export async function getMyProducts(): Promise<{
  success: boolean;
  products: Product[];
  source: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        products: [],
        source: "none",
        error: "Not authenticated",
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        products: [],
        source: "none",
        error: "Failed to fetch profile",
      };
    }

    const access = await getAccessibleProductIds(user.id, {
      customer_id: profile.customer_id,
      email: profile.email,
    });
    const productIdsArray = Array.from(access.productIds);

    if (productIdsArray.length === 0) {
      return {
        success: true,
        products: [],
        source: "none",
      };
    }

    const adminSupabase = await createSupabaseServiceRole();
    const { data: products, error: productsError } = await (adminSupabase as any)
      .from("products")
      .select("id, name, slug, category, featured_image_url, logo_url, short_description, tagline")
      .in("id", productIdsArray)
      .eq("status", "active");

    if (productsError) {
      console.error("[My Products] Error fetching purchased products:", productsError);
      return {
        success: false,
        products: [],
        source: "none",
        error: "Failed to fetch products",
      };
    }

    const { data: reviewRows, error: reviewError } = await (adminSupabase as any)
      .from("product_reviews")
      .select(`
        id,
        product_id,
        rating,
        review_text,
        moderation_status,
        rejection_reason,
        is_approved,
        updated_at
      `)
      .eq("user_id", user.id)
      .in("product_id", productIdsArray);

    if (reviewError) {
      console.error("[My Products] Error fetching review state:", reviewError);
    }

    const { data: followupRows, error: followupError } = await (adminSupabase as any)
      .from("review_followups")
      .select("purchased_product_ids, reward_claimed_at, reward_review_id, send_at")
      .eq("user_id", user.id)
      .eq("is_refunded", false);

    if (followupError) {
      console.error("[My Products] Error fetching review followups:", followupError);
    }

    const reviewMap = new Map(
      ((reviewRows as Array<{
        id: string;
        product_id: string;
        rating: number;
        review_text: string | null;
        moderation_status: string | null;
        rejection_reason: string | null;
        is_approved: boolean | null;
        updated_at: string | null;
      }>) || []).map((review) => [review.product_id, review])
    );

    const rewardClaimedByReviewId = new Map<string, string | null>();
    const rewardEligibleByProductId = new Map<string, boolean>();
    const nowMs = Date.now();

    for (const followup of ((followupRows as Array<{
      purchased_product_ids: string[];
      reward_claimed_at: string | null;
      reward_review_id: string | null;
      send_at: string;
    }>) || [])) {
      if (followup.reward_review_id) {
        rewardClaimedByReviewId.set(followup.reward_review_id, followup.reward_claimed_at);
      }

      const eligible =
        !followup.reward_claimed_at &&
        new Date(followup.send_at).getTime() <= nowMs;

      if (eligible) {
        for (const productId of followup.purchased_product_ids || []) {
          rewardEligibleByProductId.set(productId, true);
        }
      }
    }

    const enrichedProducts = ((products ?? []) as Array<{
      id: string;
      name: string;
      slug: string;
      category: string;
      featured_image_url: string | null;
      logo_url: string | null;
      short_description: string | null;
      tagline: string | null;
    }>).map((product) => {
      const review = reviewMap.get(product.id);
      const reviewStatus = review
        ? ((review.moderation_status ??
            (review.is_approved ? "approved" : "pending")) as Product["review_status"])
        : "not_submitted";

      return {
        ...product,
        review_id: review?.id ?? null,
        review_rating: review?.rating ?? null,
        review_text: review?.review_text ?? null,
        review_status: reviewStatus,
        review_rejection_reason: review?.rejection_reason ?? null,
        review_updated_at: review?.updated_at ?? null,
        reward_eligible: rewardEligibleByProductId.get(product.id) ?? false,
        reward_claimed_at: review?.id
          ? rewardClaimedByReviewId.get(review.id) ?? null
          : null,
      } satisfies Product;
    });

    return {
      success: true,
      products: enrichedProducts,
      source: "purchases",
    };
  } catch (error) {
    console.error("[My Products] Error fetching my products:", error);
    return {
      success: false,
      products: [],
      source: "none",
      error: error instanceof Error ? error.message : "Failed to fetch products",
    };
  }
}

