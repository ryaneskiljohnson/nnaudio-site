import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/bundles/[slug] - Get single bundle with products and pricing
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    const { slug } = params;

    // Get bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('bundles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (bundleError || !bundle) {
      return NextResponse.json(
        { success: false, error: bundleError?.message || 'Bundle not found' },
        { status: 404 }
      );
    }

    // Get subscription tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('bundle_subscription_tiers')
      .select('*')
      .eq('bundle_id', bundle.id)
      .eq('active', true)
      .order('subscription_type', { ascending: true });

    if (tiersError) {
      console.error('Error fetching bundle tiers:', tiersError);
    }

    // Get products in bundle
    const { data: bundleProducts, error: productsError } = await supabase
      .from('bundle_products')
      .select(`
        id,
        display_order,
        product:products!inner(
          id,
          name,
          slug,
          tagline,
          price,
          sale_price,
          featured_image_url,
          logo_url,
          category,
          short_description,
          status
        )
      `)
      .eq('bundle_id', bundle.id)
      .order('display_order', { ascending: true });

    if (productsError) {
      console.error('Error fetching bundle products:', productsError);
    }

    // Check if this is an elite bundle (has subscription tiers)
    const isEliteBundle = (tiers || []).length > 0;

    // Filter out products that don't exist or are inactive
    // For elite bundles, also filter out bundle products (only include plugins, packs, etc.)
    const validProducts = (bundleProducts || [])
      .filter((bp: any) => {
        if (!bp.product || bp.product.status !== 'active') return false;
        // Elite bundles should not include other bundle products
        if (isEliteBundle && bp.product.category === 'bundle') return false;
        return true;
      })
      .map((bp: any) => ({
        ...bp.product,
        display_order: bp.display_order,
      }));

    // Calculate total value
    const totalValue = validProducts.reduce((sum: number, product: any) => {
      const price = product.sale_price && product.sale_price > 0 
        ? product.sale_price 
        : product.price;
      return sum + (price || 0);
    }, 0);

    // Organize pricing by subscription type
    const pricing = {
      monthly: tiers?.find((t: any) => t.subscription_type === 'monthly'),
      annual: tiers?.find((t: any) => t.subscription_type === 'annual'),
      lifetime: tiers?.find((t: any) => t.subscription_type === 'lifetime'),
    };

    // Calculate savings
    const calculateSavings = (tier: any) => {
      if (!tier || !tier.price) return null;
      const discountPrice = tier.sale_price || tier.price;
      const savings = totalValue - discountPrice;
      const savingsPercent = totalValue > 0 ? (savings / totalValue) * 100 : 0;
      return {
        amount: savings,
        percent: Math.round(savingsPercent),
      };
    };

    // Check if this is an elite bundle (has subscription tiers)
    const isSubscriptionBundle = (tiers || []).length > 0;

    return NextResponse.json({
      success: true,
      bundle: {
        ...bundle,
        products: validProducts,
        totalValue,
        pricing,
        isSubscriptionBundle,
        savings: {
          monthly: calculateSavings(pricing.monthly),
          annual: calculateSavings(pricing.annual),
          lifetime: calculateSavings(pricing.lifetime),
        },
      }
    });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/bundles/[slug]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

