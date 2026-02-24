import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/service";
import { getDownloadFileSize } from "@/utils/product-downloads";
import { stripe } from "@/utils/stripe/client";

// GET /api/products/[id] - Get single product (uses admin client when caller is admin so all fields load)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // If user is admin, use service-role client so we get full product (name, slug, etc.) regardless of RLS
    let client: any = supabase;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: adminRow } = await supabase.from('admins').select('user').eq('user', user.id).maybeSingle();
      if (adminRow) {
        client = await createAdminClient();
      }
    }

    const { data: product, error } = await (client as any)
      .from('products')
      .select(`
        *,
        product_reviews(rating, title, review_text, customer_name, created_at, is_approved)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch related products separately (tables may not be in generated DB types)
    const { data: relationships, error: relError } = await (supabase as any)
      .from('product_relationships')
      .select(`
        id,
        related_product:products!product_relationships_related_product_id_fkey(
          id, name, slug, price, sale_price, featured_image_url, logo_url, category
        )
      `)
      .eq('product_id', id);

    const relatedProducts = relationships?.map((rel: any) => ({
      ...rel.related_product,
      relationship_id: rel.id
    })) || [];

    if (error) {
      console.error('Error fetching product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    // Calculate average rating
    const reviews = product.product_reviews || [];
    const approvedReviews = reviews.filter((r: any) => r.is_approved);
    const avgRating = approvedReviews.length > 0
      ? approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / approvedReviews.length
      : 0;

    return NextResponse.json(
      {
        success: true,
        product: {
          ...product,
          average_rating: avgRating,
          review_count: approvedReviews.length,
          reviews: approvedReviews,
          related_products: relatedProducts,
          product_reviews: undefined,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error('Unexpected error in GET /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const adminSupabase = await createAdminClient();

    // Get existing product to check current values and Stripe IDs
      const { data: existingProduct } = await (adminSupabase as any)
        .from('products')
        .select('stripe_product_id, stripe_price_id, stripe_sale_price_id, name, description, short_description, price, sale_price, legacy_product_id')
        .eq('id', id)
        .single();
      
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate legacy_product_id uniqueness if being changed
    if (body.legacy_product_id !== undefined) {
      const newLegacyId = body.legacy_product_id?.trim() || null;
      const currentLegacyId = existingProduct.legacy_product_id;
      
      // Only check if the value is actually changing and is not empty
      if (newLegacyId !== currentLegacyId && newLegacyId !== null && newLegacyId !== '') {
        const { data: conflictingProduct, error: checkError } = await (adminSupabase as any)
          .from('products')
          .select('id, name')
          .eq('legacy_product_id', newLegacyId)
          .neq('id', id) // Exclude current product
          .single();

        if (conflictingProduct && !checkError) {
          return NextResponse.json(
            { 
              success: false, 
              error: `A product with legacy_product_id "${newLegacyId}" already exists: ${conflictingProduct.name} (${conflictingProduct.id})` 
            },
            { status: 400 }
          );
        }
      }
      
      // Normalize legacy_product_id (set to null if empty string)
      if (body.legacy_product_id === '' || body.legacy_product_id === null) {
        body.legacy_product_id = null;
      } else if (body.legacy_product_id) {
        body.legacy_product_id = body.legacy_product_id.trim();
      }
    }

    // Check if name, price, sale_price, or description changed - if so, sync to Stripe
    const nameChanged = body.name !== undefined && body.name !== existingProduct.name;
    const priceChanged = body.price !== undefined && body.price !== existingProduct.price;
    const salePriceChanged = body.sale_price !== undefined && body.sale_price !== existingProduct.sale_price;
    const descriptionChanged = (body.description !== undefined && body.description !== existingProduct.description) ||
                               (body.short_description !== undefined && body.short_description !== existingProduct.short_description);
    
    const shouldSyncStripe = nameChanged || priceChanged || salePriceChanged || descriptionChanged;
    
    const existingStripeIds = {
          stripe_product_id: existingProduct.stripe_product_id,
          stripe_price_id: existingProduct.stripe_price_id,
          stripe_sale_price_id: existingProduct.stripe_sale_price_id,
        };

    // Backfill file_size for downloads when path is set but size missing (so NNAudio Access has stored size)
    let downloadsPayload = body.downloads;
    if (Array.isArray(body.downloads) && body.downloads.length > 0) {
      const enrichedDownloads = await Promise.all(
        body.downloads.map(async (d: { path?: string; file_size?: number | null; [k: string]: unknown }) => {
          const pathOrUrl = (d.path || (d as { url?: string }).url)?.trim();
          const needsSize = pathOrUrl && (d.file_size == null || d.file_size === 0);
          if (!needsSize) return d;
          const fileSize = await getDownloadFileSize(pathOrUrl, adminSupabase as any);
          return fileSize != null ? { ...d, file_size: fileSize } : d;
        })
      );
      downloadsPayload = enrichedDownloads;
    }

    // Build explicit update payload so name, slug, and all editable fields are persisted (avoids dropped/ignored keys)
    const updatePayload: Record<string, unknown> = {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      slug: body.slug !== undefined ? String(body.slug).trim() : undefined,
      tagline: body.tagline !== undefined ? (body.tagline == null ? null : String(body.tagline).trim()) : undefined,
      description: body.description !== undefined ? (body.description == null ? null : String(body.description)) : undefined,
      short_description: body.short_description !== undefined ? (body.short_description == null ? null : String(body.short_description).trim()) : undefined,
      price: body.price !== undefined ? Number(body.price) : undefined,
      sale_price: body.sale_price !== undefined && body.sale_price !== '' && body.sale_price !== null ? Number(body.sale_price) : body.sale_price === '' || body.sale_price === null ? null : undefined,
      category: body.category !== undefined ? body.category : undefined,
      status: body.status !== undefined ? body.status : undefined,
      is_featured: body.is_featured !== undefined ? Boolean(body.is_featured) : undefined,
      featured_image_url: body.featured_image_url !== undefined ? (body.featured_image_url == null ? null : String(body.featured_image_url).trim()) : undefined,
      featured_image_url_png: body.featured_image_url_png !== undefined ? (body.featured_image_url_png == null ? null : String(body.featured_image_url_png).trim()) : undefined,
      logo_url: body.logo_url !== undefined ? (body.logo_url == null ? null : String(body.logo_url).trim()) : undefined,
      background_image_url: body.background_image_url !== undefined ? (body.background_image_url == null ? null : String(body.background_image_url).trim()) : undefined,
      background_video_url: body.background_video_url !== undefined ? (body.background_video_url == null ? null : String(body.background_video_url).trim()) : undefined,
      demo_video_url: body.demo_video_url !== undefined ? (body.demo_video_url == null ? null : String(body.demo_video_url).trim()) : undefined,
      meta_title: body.meta_title !== undefined ? (body.meta_title == null ? null : String(body.meta_title).trim()) : undefined,
      meta_description: body.meta_description !== undefined ? (body.meta_description == null ? null : String(body.meta_description)) : undefined,
      meta_keywords: body.meta_keywords !== undefined ? (body.meta_keywords == null ? null : String(body.meta_keywords)) : undefined,
      legacy_product_id: body.legacy_product_id !== undefined ? (body.legacy_product_id == null || body.legacy_product_id === '' ? null : String(body.legacy_product_id).trim()) : undefined,
      plugin_bundle_name: body.plugin_bundle_name !== undefined ? (body.plugin_bundle_name == null || body.plugin_bundle_name === '' ? null : String(body.plugin_bundle_name).trim()) : undefined,
      features: Array.isArray(body.features) ? body.features : undefined,
      audio_samples: Array.isArray(body.audio_samples) ? body.audio_samples : undefined,
      demo_videos: Array.isArray(body.demo_videos) ? body.demo_videos : undefined,
      downloads: downloadsPayload !== undefined ? downloadsPayload : undefined,
    };
    // Omit keys that were not sent (undefined) so we don't overwrite with undefined
    const cleanedPayload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updatePayload)) {
      if (v !== undefined) cleanedPayload[k] = v;
    }

    const { data: product, error } = await (adminSupabase as any)
      .from('products')
      .update(cleanedPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // When a bundle-category product's images change, mirror them to the bundles table.
    // The bundles table has a product_id FK pointing to this product row, so we can
    // update the bundle directly without any slug/name guessing.
    if (product?.category === 'bundle') {
      const imageChanged = cleanedPayload.featured_image_url !== undefined || cleanedPayload.logo_url !== undefined;
      if (imageChanged) {
        const bundleImageUpdate: Record<string, unknown> = {};
        if (cleanedPayload.featured_image_url !== undefined) {
          bundleImageUpdate.featured_image_url = cleanedPayload.featured_image_url || null;
        }
        if (cleanedPayload.logo_url !== undefined) {
          bundleImageUpdate.logo_url = cleanedPayload.logo_url || null;
        }
        const { error: bundleSyncError } = await (adminSupabase as any)
          .from('bundles')
          .update(bundleImageUpdate)
          .eq('product_id', id);
        if (bundleSyncError) {
          // Non-fatal: log but don't fail the product save
          console.error('Failed to sync image to bundles table:', bundleSyncError);
        }
      }
    }

    // Sync to Stripe if name, price, or description changed
    if (shouldSyncStripe && product && product.price !== null && product.price !== undefined) {
      try {
        const { syncProductToStripe } = await import('@/utils/stripe/product-sync');
        
        const syncResult = await syncProductToStripe(
          product.id,
          product.name,
          product.description || product.short_description || '',
          product.price,
          product.sale_price,
          existingStripeIds.stripe_product_id,
          existingStripeIds.stripe_price_id,
          existingStripeIds.stripe_sale_price_id
        );

        if (syncResult.success) {
          // Update product with Stripe IDs (clear sale price ID since we don't use it)
          await (adminSupabase as any)
            .from('products')
            .update({
              stripe_product_id: syncResult.stripe_product_id,
              stripe_price_id: syncResult.stripe_price_id,
              stripe_sale_price_id: null, // Clear sale price ID - not used
            })
            .eq('id', id);
          
          // Refresh product data to include Stripe IDs
          const { data: updatedProduct } = await (adminSupabase as any)
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
          
          return NextResponse.json({
            success: true,
            product: updatedProduct || product,
            stripe_synced: true,
          });
        } else {
          console.error('Stripe sync failed:', syncResult.error);
          // Still return success for product update, but log Stripe error
          return NextResponse.json({
            success: true,
            product,
            stripe_synced: false,
            stripe_error: syncResult.error,
          });
        }
      } catch (stripeError: any) {
        console.error('Error syncing to Stripe:', stripeError);
        // Still return success for product update
        return NextResponse.json({
          success: true,
          product,
          stripe_synced: false,
          stripe_error: stripeError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error: any) {
    console.error('Unexpected error in PUT /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const adminSupabase = await createAdminClient();

    // Get product to check for Stripe IDs before deletion
    const { data: product } = await (adminSupabase as any)
      .from('products')
      .select('stripe_product_id, stripe_price_id, stripe_sale_price_id')
      .eq('id', id)
      .single();

    // Delete from Stripe if product exists there
    if (product?.stripe_product_id) {
      try {
        // Archive prices first (can't delete prices that have been used)
        if (product.stripe_price_id) {
          try {
            await stripe.prices.update(product.stripe_price_id, {
              active: false,
            });
          } catch (error: any) {
            console.error('Error archiving Stripe price:', error);
            // Continue even if price archiving fails
          }
        }

        if (product.stripe_sale_price_id) {
          try {
            await stripe.prices.update(product.stripe_sale_price_id, {
              active: false,
            });
          } catch (error: any) {
            console.error('Error archiving Stripe sale price:', error);
            // Continue even if sale price archiving fails
          }
        }

        // Archive the product (can't delete products that have been used)
        try {
          await stripe.products.update(product.stripe_product_id, {
            active: false,
          });
        } catch (error: any) {
          console.error('Error archiving Stripe product:', error);
          // Continue even if product archiving fails
        }
      } catch (stripeError: any) {
        console.error('Error deleting from Stripe:', stripeError);
        // Continue with database deletion even if Stripe deletion fails
      }
    }

    // Delete from database
    const { error } = await (adminSupabase as any)
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      stripe_deleted: !!product?.stripe_product_id
    });
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

