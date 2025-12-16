import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/service';
import { syncProductToStripe } from '@/utils/stripe/product-sync';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/**
 * POST /api/bundles/create-products
 * Creates product entries in the products table for each bundle
 * and creates Stripe products/prices for each bundle subscription tier
 */
export async function POST(request: NextRequest) {
  try {
    const adminSupabase = await createAdminClient();

    // Fetch all active bundles with their subscription tiers
    const { data: bundles, error: bundlesError } = await adminSupabase
      .from('bundles')
      .select(`
        *,
        bundle_subscription_tiers(
          id,
          subscription_type,
          price,
          sale_price,
          active
        )
      `)
      .eq('status', 'active');

    if (bundlesError) {
      console.error('Error fetching bundles:', bundlesError);
      return NextResponse.json(
        { success: false, error: bundlesError.message },
        { status: 500 }
      );
    }

    if (!bundles || bundles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active bundles found',
        created: [],
      });
    }

    const results = [];

    for (const bundle of bundles) {
      const tiers = (bundle.bundle_subscription_tiers || []).filter((t: any) => t.active);
      
      if (tiers.length === 0) {
        console.log(`Skipping bundle ${bundle.name} - no active tiers`);
        continue;
      }

      // Check if product already exists for this bundle
      const { data: existingProduct } = await adminSupabase
        .from('products')
        .select('id, stripe_product_id, stripe_price_id')
        .eq('slug', bundle.slug)
        .eq('category', 'bundle')
        .single();

      let productId: string;
      let productCreated = false;

      if (existingProduct) {
        // Product already exists, use it
        productId = existingProduct.id;
        console.log(`Using existing product for bundle: ${bundle.name}`);
      } else {
        // Create product entry for the bundle
        // Use the lowest price tier as the base price
        const basePrice = Math.min(
          ...tiers.map((t: any) => t.sale_price || t.price)
        );

        const { data: newProduct, error: productError } = await adminSupabase
          .from('products')
          .insert({
            name: bundle.name,
            slug: bundle.slug,
            tagline: bundle.tagline,
            description: bundle.description,
            short_description: bundle.short_description,
            price: basePrice,
            sale_price: null, // Will be handled per tier
            category: 'bundle',
            status: 'active',
            is_featured: bundle.is_featured,
            featured_image_url: bundle.featured_image_url,
            logo_url: bundle.logo_url,
            background_image_url: bundle.background_image_url,
            meta_title: bundle.meta_title,
            meta_description: bundle.meta_description,
            meta_keywords: bundle.meta_keywords,
          })
          .select()
          .single();

        if (productError) {
          console.error(`Error creating product for bundle ${bundle.name}:`, productError);
          results.push({
            bundle: bundle.name,
            success: false,
            error: productError.message,
          });
          continue;
        }

        productId = newProduct.id;
        productCreated = true;
        console.log(`✓ Created product for bundle: ${bundle.name} (${productId})`);
      }

      // Create Stripe products and prices for each tier
      const stripeResults = [];

      // Create one Stripe product for the bundle (shared across all tiers)
      let stripeProduct: Stripe.Product;
      
      if (existingProduct?.stripe_product_id) {
        // Update existing product
        stripeProduct = await stripe.products.update(existingProduct.stripe_product_id, {
          name: bundle.name,
          description: bundle.description || bundle.short_description || undefined,
          metadata: {
            product_id: productId,
            bundle_id: bundle.id,
            bundle_type: bundle.bundle_type,
          },
        });
      } else {
        // Create new Stripe product
        stripeProduct = await stripe.products.create({
          name: bundle.name,
          description: bundle.description || bundle.short_description || undefined,
          metadata: {
            product_id: productId,
            bundle_id: bundle.id,
            bundle_type: bundle.bundle_type,
          },
        });

        // Update product with Stripe product ID
        await adminSupabase
          .from('products')
          .update({
            stripe_product_id: stripeProduct.id,
          })
          .eq('id', productId);
      }

      // Create Stripe prices for each tier
      for (const tier of tiers) {
        const effectivePrice = tier.sale_price || tier.price;

        try {
          // Check if tier already has a Stripe price
          if (tier.stripe_price_id) {
            // Verify the price still exists in Stripe
            try {
              await stripe.prices.retrieve(tier.stripe_price_id);
              console.log(`  ✓ Using existing Stripe ${tier.subscription_type} tier price`);
              stripeResults.push({
                tier: tier.subscription_type,
                stripe_product_id: stripeProduct.id,
                stripe_price_id: tier.stripe_price_id,
                success: true,
                existing: true,
              });
              continue;
            } catch (e) {
              // Price doesn't exist, create a new one
              console.log(`  ⚠ Stripe price ${tier.stripe_price_id} not found, creating new one`);
            }
          }

          // Create Stripe price for this tier
          // For subscriptions, we need recurring prices
          const isRecurring = tier.subscription_type === 'monthly' || tier.subscription_type === 'annual';
          
          const priceData: Stripe.PriceCreateParams = {
            product: stripeProduct.id,
            unit_amount: Math.round(effectivePrice * 100), // Convert to cents
            currency: 'usd',
            metadata: {
              product_id: productId,
              bundle_id: bundle.id,
              subscription_type: tier.subscription_type,
              tier_id: tier.id,
            },
          };

          if (isRecurring) {
            priceData.recurring = {
              interval: tier.subscription_type === 'monthly' ? 'month' : 'year',
            };
          }

          const stripePrice = await stripe.prices.create(priceData);

          // Store the Stripe price ID in the bundle_subscription_tiers table
          await adminSupabase
            .from('bundle_subscription_tiers')
            .update({
              stripe_price_id: stripePrice.id,
              stripe_product_id: stripeProduct.id,
            })
            .eq('id', tier.id);

          // Update product with Stripe price ID (use lifetime tier as primary, or first tier)
          if (tier.subscription_type === 'lifetime' || !existingProduct?.stripe_price_id) {
            await adminSupabase
              .from('products')
              .update({
                stripe_price_id: stripePrice.id,
              })
              .eq('id', productId);
          }

          stripeResults.push({
            tier: tier.subscription_type,
            stripe_product_id: stripeProduct.id,
            stripe_price_id: stripePrice.id,
            success: true,
          });

          console.log(`  ✓ Created Stripe ${tier.subscription_type} tier: $${effectivePrice}`);
        } catch (stripeError: any) {
          console.error(`Error creating Stripe price for ${tier.subscription_type}:`, stripeError);
          stripeResults.push({
            tier: tier.subscription_type,
            success: false,
            error: stripeError.message,
          });
        }
      }

      // Link bundle to product via bundle_products (if not already linked)
      // We'll use a special approach: create a bundle_products entry that links the bundle product to itself
      // Or we can add a bundle_id field to products table
      // For now, let's add metadata to track the relationship
      
      // Get all products in the bundle
      const { data: bundleProducts } = await adminSupabase
        .from('bundle_products')
        .select('product_id')
        .eq('bundle_id', bundle.id);

      if (bundleProducts && bundleProducts.length > 0) {
        // Ensure the bundle product itself is linked (optional - for tracking)
        // The bundle product represents the bundle, and bundle_products links individual products to it
        console.log(`  ✓ Bundle has ${bundleProducts.length} linked products`);
      }

      results.push({
        bundle: bundle.name,
        bundle_id: bundle.id,
        product_id: productId,
        product_created: productCreated,
        stripe_results: stripeResults,
        success: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} bundles`,
      results,
    });
  } catch (error: any) {
    console.error('Error creating bundle products:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

