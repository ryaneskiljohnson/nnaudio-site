import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/service';

// GET /api/bundles/[slug] - Get single bundle with products and pricing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();
    const { slug } = await params;

    // Admins can load draft/archived bundles (e.g. for edit modal); public only gets active
    // Use service role to check admin and fetch bundle so RLS cannot block
    let restrictActive = true;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: adminById } = await (adminSupabase as any).from('admins').select('user').eq('user', user.id).maybeSingle();
      const { data: adminByEmail } = user.email
        ? await (adminSupabase as any).from('admins').select('user').eq('user', user.email).maybeSingle()
        : { data: null };
      restrictActive = !(adminById ?? adminByEmail);
    }

    let bundleQuery = (adminSupabase as any).from('bundles').select('*').eq('slug', slug);
    if (restrictActive) {
      bundleQuery = bundleQuery.eq('status', 'active');
    }
    const { data: bundle, error: bundleError } = await bundleQuery.single();

    if (bundleError || !bundle) {
      return NextResponse.json(
        { success: false, error: bundleError?.message || 'Bundle not found' },
        { status: 404 }
      );
    }

    // Get subscription tiers
    const { data: tiers, error: tiersError } = await (adminSupabase as any)
      .from('bundle_subscription_tiers')
      .select('*')
      .eq('bundle_id', (bundle as { id: string }).id)
      .eq('active', true)
      .order('subscription_type', { ascending: true });

    if (tiersError) {
      console.error('Error fetching bundle tiers:', tiersError);
    }

    // Get products in bundle (service role so all rows returned)
    const { data: bundleProducts, error: productsError } = await (adminSupabase as any)
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

    // Check if this is an elite subscription bundle (has monthly or annual tiers)
    // Bundles with ONLY lifetime tiers are considered regular one-time purchase bundles
    const isEliteBundle = (tiers || []).some((t: any) => t.subscription_type === 'monthly' || t.subscription_type === 'annual');

    // Filter out products that don't exist or are inactive
    // For elite subscription bundles, also filter out bundle products (only include plugins, packs, etc.)
    const validProducts = (bundleProducts || [])
      .filter((bp: any) => {
        if (!bp.product || bp.product.status !== 'active') return false;
        // Elite subscription bundles should not include other bundle products
        if (isEliteBundle && bp.product.category === 'bundle') return false;
        return true;
      })
      .map((bp: any) => ({
        ...bp.product,
        display_order: bp.display_order,
      }));

    // Calculate total value
    const totalValue = validProducts.reduce((sum: number, product: Record<string, unknown>) => {
      const price = (product.sale_price as number) && (product.sale_price as number) > 0
        ? (product.sale_price as number)
        : (product.price as number);
      return sum + (price || 0);
    }, 0);

    // Organize pricing by subscription type
    const pricing = {
      monthly: tiers?.find((t: any) => t.subscription_type === 'monthly'),
      annual: tiers?.find((t: any) => t.subscription_type === 'annual'),
      lifetime: tiers?.find((t: any) => t.subscription_type === 'lifetime'),
    };

    // Calculate savings
    const calculateSavings = (tier: any, subscriptionType: string) => {
      if (!tier || !tier.price) return null;
      const discountPrice = tier.sale_price || tier.price;
      
      // For annual, compare to monthly * 12
      if (subscriptionType === 'annual' && pricing.monthly) {
        const monthlyPrice = pricing.monthly.sale_price || pricing.monthly.price;
        const annualMonthlyCost = monthlyPrice * 12;
        const savings = annualMonthlyCost - discountPrice;
        const savingsPercent = annualMonthlyCost > 0 ? (savings / annualMonthlyCost) * 100 : 0;
        return {
          amount: savings,
          percent: Math.round(savingsPercent),
        };
      }
      
      // For lifetime, compare to total value
      if (subscriptionType === 'lifetime') {
        const savings = totalValue - discountPrice;
        const savingsPercent = totalValue > 0 ? (savings / totalValue) * 100 : 0;
        return {
          amount: savings,
          percent: Math.round(savingsPercent),
        };
      }
      
      // For monthly, compare to total value
      const savings = totalValue - discountPrice;
      const savingsPercent = totalValue > 0 ? (savings / totalValue) * 100 : 0;
      return {
        amount: savings,
        percent: Math.round(savingsPercent),
      };
    };

    // Check if this is an elite subscription bundle (has monthly or annual tiers)
    // Bundles with ONLY lifetime tiers are considered regular one-time purchase bundles
    const isSubscriptionBundle = (tiers || []).some((t: any) => t.subscription_type === 'monthly' || t.subscription_type === 'annual');

    return NextResponse.json({
      success: true,
      bundle: {
        ...bundle,
        products: validProducts,
        bundleProducts: bundleProducts || [],
        totalValue,
        pricing,
        isSubscriptionBundle,
        savings: {
          monthly: calculateSavings(pricing.monthly, 'monthly'),
          annual: calculateSavings(pricing.annual, 'annual'),
          lifetime: calculateSavings(pricing.lifetime, 'lifetime'),
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

