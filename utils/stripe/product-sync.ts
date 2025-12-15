import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export interface ProductSyncResult {
  success: boolean;
  stripe_product_id?: string;
  stripe_price_id?: string;
  error?: string;
}

/**
 * Syncs a product to Stripe, creating or updating the product and price
 * Note: Only syncs the effective price (what customers pay). If sale_price exists, use that.
 * The regular price is for display/marketing purposes only (shows crossed out when on sale).
 * @param productId - Database product ID
 * @param name - Product name
 * @param description - Product description
 * @param price - Regular price in dollars (e.g., 29.99) - for display/marketing
 * @param salePrice - Sale price in dollars (optional) - this is what customers pay if on sale
 * @param existingStripeProductId - Existing Stripe product ID (if updating)
 * @param existingStripePriceId - Existing Stripe price ID (if updating)
 * @returns Result with Stripe IDs
 */
export async function syncProductToStripe(
  productId: string,
  name: string,
  description: string,
  price: number,
  salePrice?: number | null,
  existingStripeProductId?: string | null,
  existingStripePriceId?: string | null,
  existingStripeSalePriceId?: string | null
): Promise<ProductSyncResult> {
  try {
    // Convert price to cents for Stripe
    const priceInCents = Math.round(price * 100);

    let stripeProduct: Stripe.Product;
    let stripePrice: Stripe.Price;

    // Create or update Stripe product
    if (existingStripeProductId) {
      // Update existing product
      stripeProduct = await stripe.products.update(existingStripeProductId, {
        name,
        description: description || undefined,
        metadata: {
          product_id: productId,
        },
      });
    } else {
      // Create new product
      stripeProduct = await stripe.products.create({
        name,
        description: description || undefined,
        metadata: {
          product_id: productId,
        },
      });
    }

    // Use the effective price - what customers actually pay
    // If there's a sale price, use that. Otherwise use the regular price.
    // The regular price is only for display/marketing (shows crossed out when on sale).
    const effectivePriceInCents = salePrice && salePrice > 0 
      ? Math.round(salePrice * 100) 
      : priceInCents;

    if (existingStripePriceId) {
      // Check if price needs to be updated
      const existingPrice = await stripe.prices.retrieve(existingStripePriceId);
      
      if (existingPrice.unit_amount !== effectivePriceInCents) {
        // Price changed, create new price and archive old one
        await stripe.prices.update(existingStripePriceId, {
          active: false, // Archive old price
        });
        
        stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: effectivePriceInCents,
          currency: "usd",
          metadata: {
            product_id: productId,
            price_type: salePrice && salePrice > 0 ? "sale" : "regular",
          },
        });
      } else {
        stripePrice = existingPrice;
      }
    } else {
      // Create new price
      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: effectivePriceInCents,
        currency: "usd",
        metadata: {
          product_id: productId,
          price_type: salePrice && salePrice > 0 ? "sale" : "regular",
        },
      });
    }

    // Archive any existing sale price IDs since we don't use them anymore
    if (existingStripeSalePriceId) {
      try {
        await stripe.prices.update(existingStripeSalePriceId, {
          active: false,
        });
      } catch (error) {
        // Ignore errors if price doesn't exist
      }
    }

    return {
      success: true,
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
    };
  } catch (error: any) {
    console.error("Error syncing product to Stripe:", error);
    return {
      success: false,
      error: error.message || "Failed to sync product to Stripe",
    };
  }
}

