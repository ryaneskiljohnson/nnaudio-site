import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/service';

// GET /api/bundles/products?bundle_id=xxx - Get all products in a bundle
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bundleId = searchParams.get('bundle_id');

    if (!bundleId) {
      return NextResponse.json(
        { success: false, error: 'bundle_id query parameter is required' },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminClient();

    // Get bundle products
    const { data: bundleProducts, error } = await adminSupabase
      .from('bundle_products')
      .select(`
        id,
        display_order,
        product:products!inner(
          id,
          name,
          slug,
          category,
          price,
          sale_price,
          featured_image_url,
          logo_url
        )
      `)
      .eq('bundle_id', bundleId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching bundle products:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      products: bundleProducts || []
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/bundles/products - Add a product to a bundle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bundle_id, product_id } = body;

    if (!bundle_id || !product_id) {
      return NextResponse.json(
        { success: false, error: 'bundle_id and product_id are required' },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminClient();

    // Check if product is already in bundle
    const { data: existing } = await adminSupabase
      .from('bundle_products')
      .select('id')
      .eq('bundle_id', bundle_id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Product is already in this bundle' },
        { status: 400 }
      );
    }

    // Get current max display_order
    const { data: maxOrder } = await adminSupabase
      .from('bundle_products')
      .select('display_order')
      .eq('bundle_id', bundle_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const display_order = (maxOrder?.display_order ?? -1) + 1;

    // Add product to bundle
    const { data, error } = await adminSupabase
      .from('bundle_products')
      .insert({
        bundle_id,
        product_id,
        display_order
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding product to bundle:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bundle_product: data
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/bundles/products?bundle_id=xxx&product_id=xxx - Remove a product from a bundle
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bundleId = searchParams.get('bundle_id');
    const productId = searchParams.get('product_id');

    if (!bundleId || !productId) {
      return NextResponse.json(
        { success: false, error: 'bundle_id and product_id query parameters are required' },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminClient();

    const { error } = await adminSupabase
      .from('bundle_products')
      .delete()
      .eq('bundle_id', bundleId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing product from bundle:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
