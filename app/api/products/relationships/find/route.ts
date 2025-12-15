import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/products/relationships/find - Find relationship by product IDs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id');
    const relatedProductId = searchParams.get('related_product_id');

    if (!productId || !relatedProductId) {
      return NextResponse.json(
        { success: false, error: 'Missing product_id or related_product_id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: relationship, error } = await supabase
      .from('product_relationships')
      .select('*')
      .eq('product_id', productId)
      .eq('related_product_id', relatedProductId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      relationship
    });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/products/relationships/find:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

