import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/service';

// GET /api/products - List all products (with filters)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = await createClient();
    
    let query = supabase
      .from('products')
      .select('*, product_reviews(rating)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calculate average rating for each product
    const productsWithRatings = products?.map(product => {
      const reviews = product.product_reviews || [];
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0;
      
      return {
        ...product,
        average_rating: avgRating,
        review_count: reviews.length,
        product_reviews: undefined // Remove from response
      };
    });

    return NextResponse.json({
      success: true,
      products: productsWithRatings,
      count: products?.length || 0
    });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/products:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('user', user.id)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const adminSupabase = createAdminClient();

    // Create slug from name if not provided
    const slug = body.slug || body.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: product, error } = await adminSupabase
      .from('products')
      .insert([{
        name: body.name,
        slug,
        tagline: body.tagline,
        description: body.description,
        short_description: body.short_description,
        price: body.price,
        sale_price: body.sale_price,
        category: body.category,
        status: body.status || 'draft',
        is_featured: body.is_featured || false,
        featured_image_url: body.featured_image_url,
        logo_url: body.logo_url,
        background_image_url: body.background_image_url,
        background_video_url: body.background_video_url,
        gallery_images: body.gallery_images || [],
        features: body.features || [],
        specifications: body.specifications || {},
        requirements: body.requirements || {},
        demo_video_url: body.demo_video_url,
        audio_samples: body.audio_samples || [],
        download_url: body.download_url,
        download_version: body.download_version,
        meta_title: body.meta_title,
        meta_description: body.meta_description,
        meta_keywords: body.meta_keywords,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/products:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

