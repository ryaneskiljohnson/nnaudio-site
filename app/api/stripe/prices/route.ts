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

    // If Stripe price IDs are not configured, return fallback prices
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

    // Fetch prices from Stripe
    const [monthlyPrice, annualPrice, lifetimePrice] = await Promise.all([
      stripe.prices.retrieve(monthlyPriceId, { expand: ["product"] }),
      stripe.prices.retrieve(annualPriceId, { expand: ["product"] }),
      stripe.prices.retrieve(lifetimePriceId, { expand: ["product"] }),
    ]);

    // Get product name
    const productName =
      (monthlyPrice.product as Stripe.Product).name || "Pro Plan";

    // Format response
    const prices: Record<PlanType, PriceData> = {
      monthly: {
        id: monthlyPrice.id,
        type: "monthly",
        amount: monthlyPrice.unit_amount || 0,
        currency: monthlyPrice.currency,
        interval: monthlyPrice.recurring?.interval,
        name: `${productName} (Monthly)`,
      },
      annual: {
        id: annualPrice.id,
        type: "annual",
        amount: annualPrice.unit_amount || 0,
        currency: annualPrice.currency,
        interval: annualPrice.recurring?.interval,
        name: `${productName} (Annual)`,
      },
      lifetime: {
        id: lifetimePrice.id,
        type: "lifetime",
        amount: lifetimePrice.unit_amount || 0,
        currency: lifetimePrice.currency,
        name: `${productName} (Lifetime)`,
      },
    };

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
