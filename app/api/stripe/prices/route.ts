import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PlanType, PriceData, PricesResponse } from "@/types/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(): Promise<NextResponse<PricesResponse>> {
  try {
    // Get the price IDs from environment variables
    const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;
    const lifetimePriceId = process.env.STRIPE_PRICE_ID_LIFETIME;

    // If Stripe price IDs are not configured, return fallback prices silently
    // (Bundles are now the primary subscription system)
    if (!monthlyPriceId || !annualPriceId || !lifetimePriceId) {
      const fallbackPrices: Record<PlanType, PriceData> = {
        monthly: {
          id: "",
          type: "monthly",
          amount: 0,
          currency: "usd",
          name: "Monthly Plan",
        },
        annual: {
          id: "",
          type: "annual",
          amount: 0,
          currency: "usd",
          name: "Annual Plan",
        },
        lifetime: {
          id: "",
          type: "lifetime",
          amount: 0,
          currency: "usd",
          name: "Lifetime Plan",
        },
      };

      return NextResponse.json({
        success: true,
        prices: fallbackPrices,
      });
    }

    // Fetch prices from Stripe individually to handle errors per price
    const priceResults = await Promise.allSettled([
      stripe.prices.retrieve(monthlyPriceId, { expand: ["product"] }),
      stripe.prices.retrieve(annualPriceId, { expand: ["product"] }),
      stripe.prices.retrieve(lifetimePriceId, { expand: ["product"] }),
    ]);

    const monthlyPrice = priceResults[0].status === 'fulfilled' ? priceResults[0].value : null;
    const annualPrice = priceResults[1].status === 'fulfilled' ? priceResults[1].value : null;
    const lifetimePrice = priceResults[2].status === 'fulfilled' ? priceResults[2].value : null;

    // Collect any errors
    const errors: string[] = [];
    if (priceResults[0].status === 'rejected') {
      errors.push(`Monthly price (${monthlyPriceId}): ${priceResults[0].reason.message || 'Not found'}`);
    }
    if (priceResults[1].status === 'rejected') {
      errors.push(`Annual price (${annualPriceId}): ${priceResults[1].reason.message || 'Not found'}`);
    }
    if (priceResults[2].status === 'rejected') {
      errors.push(`Lifetime price (${lifetimePriceId}): ${priceResults[2].reason.message || 'Not found'}`);
    }

    // Get product name from first available price
    const productName =
      (monthlyPrice?.product as Stripe.Product)?.name ||
      (annualPrice?.product as Stripe.Product)?.name ||
      (lifetimePrice?.product as Stripe.Product)?.name ||
      "Pro Plan";

    // Format response with available prices, use fallback for missing ones
    const prices: Record<PlanType, PriceData> = {
      monthly: monthlyPrice ? {
        id: monthlyPrice.id,
        type: "monthly",
        amount: monthlyPrice.unit_amount || 0,
        currency: monthlyPrice.currency,
        interval: monthlyPrice.recurring?.interval,
        name: `${productName} (Monthly)`,
      } : {
        id: "",
        type: "monthly",
        amount: 0,
        currency: "usd",
        name: "Monthly Plan",
      },
      annual: annualPrice ? {
        id: annualPrice.id,
        type: "annual",
        amount: annualPrice.unit_amount || 0,
        currency: annualPrice.currency,
        interval: annualPrice.recurring?.interval,
        name: `${productName} (Annual)`,
      } : {
        id: "",
        type: "annual",
        amount: 0,
        currency: "usd",
        name: "Annual Plan",
      },
      lifetime: lifetimePrice ? {
        id: lifetimePrice.id,
        type: "lifetime",
        amount: lifetimePrice.unit_amount || 0,
        currency: lifetimePrice.currency,
        name: `${productName} (Lifetime)`,
      } : {
        id: "",
        type: "lifetime",
        amount: 0,
        currency: "usd",
        name: "Lifetime Plan",
      },
    };

    // If there are errors, return fallback prices silently
    // (Bundles are now the primary subscription system, so legacy price errors are not critical)
    if (errors.length > 0) {
      // Don't return error - just use fallback prices
      // This prevents error messages from showing since bundles handle subscriptions
      return NextResponse.json({
        success: true,
        prices,
      });
    }

    return NextResponse.json({
      success: true,
      prices,
    });
  } catch (error) {
    console.error("Error fetching prices:", error);

    // Return fallback prices in case of error
    const fallbackPrices: Record<PlanType, PriceData> = {
      monthly: {
        id: "",
        type: "monthly",
        amount: 0,
        currency: "usd",
        name: "Monthly Plan",
      },
      annual: {
        id: "",
        type: "annual",
        amount: 0,
        currency: "usd",
        name: "Annual Plan",
      },
      lifetime: {
        id: "",
        type: "lifetime",
        amount: 0,
        currency: "usd",
        name: "Lifetime Plan",
      },
    };

    // Do NOT surface 500 to the app; return fallback prices with success false
    // so the UI can handle gracefully without blocking render.
    return NextResponse.json({
        success: false,
        prices: fallbackPrices,
      error: error instanceof Error ? error.message : "Failed to fetch prices",
    });
  }
}
