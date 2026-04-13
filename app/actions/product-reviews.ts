"use server";

/**
 * @fileoverview Server actions for customer-submitted product reviews and admin moderation.
 * @module app/actions/product-reviews
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { getAccessibleProductIds } from "@/utils/nnaudio-access/access";
import { checkAdmin } from "@/app/actions/user-management";
import { issueReviewReward } from "@/utils/reviews/review-system";

export interface ProductReviewSubmissionInput {
  productId: string;
  rating: number;
  reviewText: string;
}

export interface ProductReviewSummary {
  id: string;
  product_id: string;
  rating: number;
  review_text: string | null;
  moderation_status: string;
  rejection_reason: string | null;
  is_approved: boolean | null;
  updated_at: string | null;
  reward_claimed_at: string | null;
  reward_code: string | null;
}

export interface AdminProductReviewRecord {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  customer_name: string | null;
  customer_email: string | null;
  rating: number;
  review_text: string | null;
  moderation_status: string;
  rejection_reason: string | null;
  is_approved: boolean | null;
  is_verified_purchase: boolean | null;
  submission_source: string;
  stripe_payment_intent_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  reward_claimed_at: string | null;
  reward_code: string | null;
  reward_email_sent_at: string | null;
}

/**
 * @brief Builds a customer display name from profile data.
 * @param profile Profile row with name and email fields.
 * @returns Friendly name string for the review row.
 * @example
 * buildCustomerName({ first_name: "Alex", last_name: "Keys", email: "alex@example.com" });
 */
function buildCustomerName(profile: {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
}): string {
  const fullName = profile.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  const composed = [profile.first_name?.trim(), profile.last_name?.trim()]
    .filter(Boolean)
    .join(" ");
  if (composed) {
    return composed;
  }

  if (profile.email) {
    return profile.email.split("@")[0];
  }

  return "NNAudio Customer";
}

/**
 * @brief Validates the logged-in user and loads the profile needed for review actions.
 * @returns Auth user plus profile data, or an error payload.
 * @example
 * const auth = await getAuthenticatedReviewUser();
 */
async function getAuthenticatedReviewUser(): Promise<
  | {
      user: { id: string; email?: string | null };
      profile: {
        id: string;
        email: string | null;
        customer_id: string | null;
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
      };
    }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, customer_id, first_name, last_name, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  return {
    user,
    profile,
  };
}

/**
 * @brief Validates that the current user owns the reviewed product.
 * @param userId Supabase auth user ID.
 * @param profile Current profile data used by the access helper.
 * @param productId Product UUID being reviewed.
 * @returns Boolean indicating ownership.
 * @example
 * await userOwnsProduct("user-uuid", { email: "alex@example.com", customer_id: "cus_123" }, "product-uuid");
 */
async function userOwnsProduct(
  userId: string,
  profile: { email: string | null; customer_id: string | null },
  productId: string
): Promise<boolean> {
  const access = await getAccessibleProductIds(userId, {
    email: profile.email,
    customer_id: profile.customer_id,
  });

  return access.productIds.has(productId);
}

/**
 * @brief Loads the most relevant follow-up order row for a reviewed product.
 * @param userId Reviewing user ID.
 * @param productId Reviewed product ID.
 * @returns Matching order metadata for the review row.
 * @example
 * await getLatestReviewFollowup("user-uuid", "product-uuid");
 */
async function getLatestReviewFollowup(
  userId: string,
  productId: string
): Promise<{ payment_intent_id: string | null } | null> {
  const adminSupabase = await createSupabaseServiceRole();
  const { data: followup } = await (adminSupabase as any)
    .from("review_followups")
    .select("payment_intent_id")
    .eq("user_id", userId)
    .eq("is_refunded", false)
    .contains("purchased_product_ids", [productId])
    .order("purchase_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return followup ?? null;
}

/**
 * @brief Submits or edits the current user's product review.
 * @param input Review form payload from My Products.
 * @returns Save result and reward status.
 * @note Customer review edits always return the row to pending moderation.
 * @example
 * await submitProductReview({ productId: "product-uuid", rating: 5, reviewText: "Love it." });
 */
export async function submitProductReview(input: ProductReviewSubmissionInput): Promise<{
  success: boolean;
  message?: string;
  review?: ProductReviewSummary;
  rewardGranted?: boolean;
  error?: string;
}> {
  try {
    const auth = await getAuthenticatedReviewUser();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }

    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5." };
    }

    const trimmedReviewText = input.reviewText.trim();
    if (trimmedReviewText.length < 10) {
      return { success: false, error: "Please add a little more detail to your review." };
    }

    const ownsProduct = await userOwnsProduct(auth.user.id, auth.profile, input.productId);
    if (!ownsProduct) {
      return { success: false, error: "You can only review products you own." };
    }

    const adminSupabase = await createSupabaseServiceRole();
    const latestFollowup = await getLatestReviewFollowup(auth.user.id, input.productId);
    const productResponse = await (adminSupabase as any)
      .from("products")
      .select("slug")
      .eq("id", input.productId)
      .maybeSingle();
    const productSlug = productResponse.data?.slug ?? null;

    const customerName = buildCustomerName(auth.profile);
    const now = new Date().toISOString();
    const basePayload = {
      rating: input.rating,
      review_text: trimmedReviewText,
      title: null,
      customer_name: customerName,
      customer_email: auth.profile.email,
      user_id: auth.user.id,
      is_verified_purchase: true,
      is_approved: false,
      moderation_status: "pending",
      rejection_reason: null,
      moderated_at: null,
      moderated_by: null,
      submission_source: "customer",
      stripe_payment_intent_id: latestFollowup?.payment_intent_id ?? null,
      updated_at: now,
    };

    const { data: existingReview } = await (adminSupabase as any)
      .from("product_reviews")
      .select("id, moderation_status")
      .eq("user_id", auth.user.id)
      .eq("product_id", input.productId)
      .maybeSingle();

    if (existingReview?.id && existingReview.moderation_status !== "pending") {
      return {
        success: false,
        error: "This review can no longer be edited.",
      };
    }

    let reviewId: string;
    if (existingReview?.id) {
      const { error: updateError } = await (adminSupabase as any)
        .from("product_reviews")
        .update(basePayload)
        .eq("id", existingReview.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
      reviewId = existingReview.id;
    } else {
      const { data: insertedReview, error: insertError } = await (adminSupabase as any)
        .from("product_reviews")
        .insert({
          id: crypto.randomUUID(),
          product_id: input.productId,
          created_at: now,
          ...basePayload,
        })
        .select("id")
        .single();

      if (insertError || !insertedReview) {
        throw new Error(insertError?.message || "Failed to save review");
      }
      reviewId = insertedReview.id;
    }

    const rewardResult =
      auth.profile.email
        ? await issueReviewReward({
            reviewId,
            userId: auth.user.id,
            productId: input.productId,
            customerEmail: auth.profile.email,
            customerName,
          })
        : { granted: false };

    const { data: reviewRow } = await (adminSupabase as any)
      .from("product_reviews")
      .select("id, product_id, rating, review_text, moderation_status, rejection_reason, is_approved, updated_at")
      .eq("id", reviewId)
      .single();

    const rewardFollowup =
      reviewId
        ? (
            await (adminSupabase as any)
              .from("review_followups")
              .select("reward_claimed_at, stripe_promotion_code")
              .eq("reward_review_id", reviewId)
              .maybeSingle()
          ).data
        : null;

    if (productSlug) {
      revalidatePath("/my-products");
      revalidatePath(`/product/${productSlug}`);
      revalidatePath("/products");
    }

    return {
      success: true,
      message: rewardResult.granted
        ? "Review submitted. Your $10 reward code has been emailed separately."
        : "Review submitted. Thanks!",
      rewardGranted: rewardResult.granted,
      review: {
        ...(reviewRow as ProductReviewSummary),
        reward_claimed_at: rewardFollowup?.reward_claimed_at ?? null,
        reward_code: rewardFollowup?.stripe_promotion_code ?? null,
      },
    };
  } catch (error) {
    console.error("[ProductReviews] submitProductReview error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit review",
    };
  }
}

/**
 * @brief Lists product reviews for the admin moderation page.
 * @returns Reviews enriched with product and reward metadata.
 * @example
 * await getAdminProductReviews();
 */
export async function getAdminProductReviews(): Promise<{
  success: boolean;
  reviews: AdminProductReviewRecord[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return { success: false, reviews: [], error: "Unauthorized" };
    }

    const adminSupabase = await createSupabaseServiceRole();
    const { data: reviews, error } = await (adminSupabase as any)
      .from("product_reviews")
      .select(`
        id,
        product_id,
        customer_name,
        customer_email,
        rating,
        review_text,
        moderation_status,
        rejection_reason,
        is_approved,
        is_verified_purchase,
        submission_source,
        stripe_payment_intent_id,
        created_at,
        updated_at,
        products(name, slug)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const reviewIds = (reviews || []).map((review: { id: string }) => review.id);
    const rewardRows =
      reviewIds.length > 0
        ? (
            await (adminSupabase as any)
              .from("review_followups")
              .select("reward_review_id, reward_claimed_at, stripe_promotion_code, reward_email_sent_at")
              .in("reward_review_id", reviewIds)
          ).data || []
        : [];

    const rewardMap = new Map<
      string,
      { reward_claimed_at: string | null; stripe_promotion_code: string | null; reward_email_sent_at: string | null }
    >(
      rewardRows.map(
        (row: {
          reward_review_id: string;
          reward_claimed_at: string | null;
          stripe_promotion_code: string | null;
          reward_email_sent_at: string | null;
        }) => [
          row.reward_review_id,
          {
            reward_claimed_at: row.reward_claimed_at,
            stripe_promotion_code: row.stripe_promotion_code,
            reward_email_sent_at: row.reward_email_sent_at,
          },
        ]
      )
    );

    return {
      success: true,
      reviews: (reviews || []).map((review: any) => {
        const reward = rewardMap.get(review.id);
        return {
          id: review.id,
          product_id: review.product_id,
          product_name: review.products?.name ?? "Unknown product",
          product_slug: review.products?.slug ?? "",
          customer_name: review.customer_name,
          customer_email: review.customer_email,
          rating: review.rating,
          review_text: review.review_text,
          moderation_status: review.moderation_status ?? (review.is_approved ? "approved" : "pending"),
          rejection_reason: review.rejection_reason,
          is_approved: review.is_approved,
          is_verified_purchase: review.is_verified_purchase,
          submission_source: review.submission_source ?? "seed",
          stripe_payment_intent_id: review.stripe_payment_intent_id,
          created_at: review.created_at,
          updated_at: review.updated_at,
          reward_claimed_at: reward?.reward_claimed_at ?? null,
          reward_code: reward?.stripe_promotion_code ?? null,
          reward_email_sent_at: reward?.reward_email_sent_at ?? null,
        } satisfies AdminProductReviewRecord;
      }),
    };
  } catch (error) {
    console.error("[ProductReviews] getAdminProductReviews error:", error);
    return {
      success: false,
      reviews: [],
      error: error instanceof Error ? error.message : "Failed to load reviews",
    };
  }
}

/** @brief One pending review row for the admin dashboard notifications panel. */
export type PendingReviewNotification = {
  id: string;
  product_name: string;
  rating: number;
  preview: string;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
};

/**
 * @brief Recent pending reviews for the admin dashboard (mirrors support ticket notification feed).
 * @param limit Max rows (default 5).
 * @returns Pending reviews ordered by `created_at` descending.
 * @note Same moderation queue as `/admin/reviews`; polled on the dashboard like support messages.
 * @example
 * await getRecentPendingProductReviewsForNotificationsAdmin(5);
 */
export async function getRecentPendingProductReviewsForNotificationsAdmin(
  limit: number = 5,
): Promise<{ reviews: PendingReviewNotification[]; error?: string }> {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return { reviews: [], error: "Unauthorized" };
    }

    const adminSupabase = await createSupabaseServiceRole();
    const { data: rows, error } = await (adminSupabase as any)
      .from("product_reviews")
      .select(
        `
        id,
        rating,
        review_text,
        customer_name,
        customer_email,
        created_at,
        products(name)
      `,
      )
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(1, limit), 25));

    if (error) {
      console.error("[ProductReviews] pending notifications query:", error);
      return { reviews: [], error: error.message };
    }

    const reviews: PendingReviewNotification[] = (rows || []).map((row: any) => {
      const text = (row.review_text as string | null)?.trim() || "";
      const preview =
        text.length > 160 ? `${text.slice(0, 157)}…` : text || "(No review text)";
      return {
        id: row.id,
        product_name: row.products?.name ?? "Unknown product",
        rating: Number(row.rating) || 0,
        preview,
        customer_name: row.customer_name ?? null,
        customer_email: row.customer_email ?? null,
        created_at: row.created_at,
      };
    });

    return { reviews };
  } catch (error) {
    console.error("[ProductReviews] getRecentPendingProductReviewsForNotificationsAdmin:", error);
    return {
      reviews: [],
      error:
        error instanceof Error ? error.message : "Failed to load pending reviews",
    };
  }
}

/**
 * @brief Approves or rejects a product review as an admin.
 * @param reviewId Review row ID to moderate.
 * @param decision Moderation outcome.
 * @returns Mutation result.
 * @example
 * await moderateProductReview("review-uuid", "approved");
 */
export async function moderateProductReview(
  reviewId: string,
  decision: "approved" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const adminSupabase = await createSupabaseServiceRole();
    const { data: review, error: reviewError } = await (adminSupabase as any)
      .from("product_reviews")
      .select("id, product_id, products(slug)")
      .eq("id", reviewId)
      .maybeSingle();

    if (reviewError || !review) {
      return { success: false, error: reviewError?.message || "Review not found" };
    }

    const now = new Date().toISOString();
    const { error: updateError } = await (adminSupabase as any)
      .from("product_reviews")
      .update({
        is_approved: decision === "approved",
        moderation_status: decision,
        moderated_at: now,
        moderated_by: user.id,
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", reviewId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/admin/reviews");
    revalidatePath("/my-products");
    if (review.products?.slug) {
      revalidatePath(`/product/${review.products.slug}`);
    }
    revalidatePath("/products");

    return { success: true };
  } catch (error) {
    console.error("[ProductReviews] moderateProductReview error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to moderate review",
    };
  }
}

/**
 * @brief Deletes a product review as an admin (hard delete).
 * @param reviewId Review row ID to delete.
 * @returns Mutation result.
 * @note review_followups.reward_review_id is ON DELETE SET NULL, so follow-ups are unchanged.
 * @example
 * await deleteProductReview("review-uuid");
 */
export async function deleteProductReview(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return { success: false, error: "Unauthorized" };
    }

    const adminSupabase = await createSupabaseServiceRole();
    const { data: review, error: reviewError } = await (adminSupabase as any)
      .from("product_reviews")
      .select("id, product_id, products(slug)")
      .eq("id", reviewId)
      .maybeSingle();

    if (reviewError || !review) {
      return { success: false, error: reviewError?.message || "Review not found" };
    }

    const { error: deleteError } = await (adminSupabase as any)
      .from("product_reviews")
      .delete()
      .eq("id", reviewId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath("/admin/reviews");
    revalidatePath("/my-products");
    if (review.products?.slug) {
      revalidatePath(`/product/${review.products.slug}`);
    }
    revalidatePath("/products");

    return { success: true };
  } catch (error) {
    console.error("[ProductReviews] deleteProductReview error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete review",
    };
  }
}
