import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/service';

// GET /api/bundles - List all bundles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'active';
    const bundleType = searchParams.get('type');
    const featured = searchParams.get('featured');

    const supabase = await createClient();
    
    let query = supabase
      .from('bundles')
      .select(`
        *,
        bundle_subscription_tiers(
          id,
          subscription_type,
          price,
          sale_price,
          active
        ),
        bundle_products(
          product:products(
            id,
            name,
            category,
            featured_image_url,
            logo_url
          )
        )
      `)
      .eq('status', status)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (bundleType) {
      query = query.eq('bundle_type', bundleType);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    const { data: bundles, error } = await query;

    if (error) {
      console.error('Error fetching bundles:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform the data to make it easier to work with
    const transformedBundles = bundles?.map(bundle => {
      const tiers = ((bundle.bundle_subscription_tiers || []) as any[]).filter(t => t.active);
      const pricing = {
        monthly: tiers.find(t => t.subscription_type === 'monthly'),
        annual: tiers.find(t => t.subscription_type === 'annual'),
        lifetime: tiers.find(t => t.subscription_type === 'lifetime'),
      };

      // Check if this is a subscription bundle (has monthly or annual tiers)
      // Bundles with ONLY lifetime tiers are considered regular one-time purchase bundles
      const isSubscriptionBundle = tiers.some(t => t.subscription_type === 'monthly' || t.subscription_type === 'annual');

      // Extract all products with images for mosaic
      // For elite subscription bundles (with monthly/annual), filter out bundle products (only include plugins, packs, etc.)
      // For regular one-time purchase bundles (lifetime only), show all products including bundle products
      const allProducts = ((bundle.bundle_products || []) as any[])
        .map((bp: any) => bp.product)
        .filter((p: any) => {
          if (!p) return false;
          // Only filter out bundle products for elite subscription bundles
          // Regular one-time purchase bundles should show all products
          if (isSubscriptionBundle && p.category === 'bundle') return false;
          return true;
        });
      
      const productsWithImages = allProducts
        .filter((p: any) => p && (p.featured_image_url || p.logo_url));
      
      // Get total count of all products in bundle
      const totalProductCount = allProducts.length;

      return {
        ...bundle,
        pricing,
        products: productsWithImages, // All products with images for mosaic
        totalProductCount, // Total count of all products
        isSubscriptionBundle, // Flag to identify elite subscription bundles (bundles with monthly/annual tiers)
        bundle_subscription_tiers: undefined, // Remove nested data
        bundle_products: undefined, // Remove nested data
      };
    });

    // Sort: elite subscription bundles first, then regular bundles, then by display_order
    const sortedBundles = transformedBundles?.sort((a, b) => {
      // Elite subscription bundles (with monthly/annual tiers) come first
      if (a.isSubscriptionBundle && !b.isSubscriptionBundle) return -1;
      if (!a.isSubscriptionBundle && b.isSubscriptionBundle) return 1;
      
      // If both are elite bundles or both are not, sort by display_order
      const aOrder = a.display_order ?? 999;
      const bOrder = b.display_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Fallback to created_at
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return NextResponse.json({
      success: true,
      bundles: sortedBundles,
      count: sortedBundles?.length || 0
    });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/bundles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/bundles - Create a new bundle (admin only)
export async function POST(request: NextRequest) {
  try {
    const adminSupabase = await createAdminClient();
    const body = await request.json();

    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: bundle, error } = await adminSupabase
      .from('bundles')
      .insert([{
        name: body.name,
        slug,
        tagline: body.tagline,
        description: body.description,
        short_description: body.short_description,
        bundle_type: body.bundle_type,
        featured_image_url: body.featured_image_url,
        logo_url: body.logo_url,
        background_image_url: body.background_image_url,
        status: body.status || 'draft',
        is_featured: body.is_featured || false,
        display_order: body.display_order || 0,
        meta_title: body.meta_title,
        meta_description: body.meta_description,
        meta_keywords: body.meta_keywords,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating bundle:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bundle
    });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/bundles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

