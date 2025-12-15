import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/service";
import { syncProductToStripe } from "@/utils/stripe/product-sync";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const adminSupabase = await createAdminClient();

    // Fetch product from database
    const { data: product, error: productError } = await adminSupabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!product.name || product.price === null || product.price === undefined) {
      return NextResponse.json(
        { success: false, error: "Product name and price are required" },
        { status: 400 }
      );
    }

    // Sync to Stripe
    const syncResult = await syncProductToStripe(
      product.id,
      product.name,
      product.description || product.short_description || "",
      product.price,
      product.sale_price,
      product.stripe_product_id,
      product.stripe_price_id,
      product.stripe_sale_price_id
    );

    if (!syncResult.success) {
      return NextResponse.json(
        { success: false, error: syncResult.error },
        { status: 500 }
      );
    }

    // Update product with Stripe IDs (clear sale price ID since we don't use it)
    const { error: updateError } = await adminSupabase
      .from("products")
      .update({
        stripe_product_id: syncResult.stripe_product_id,
        stripe_price_id: syncResult.stripe_price_id,
        stripe_sale_price_id: null, // Clear sale price ID - not used
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating product with Stripe IDs:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update product with Stripe IDs",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stripe_product_id: syncResult.stripe_product_id,
      stripe_price_id: syncResult.stripe_price_id,
    });
  } catch (error: any) {
    console.error("Unexpected error in POST /api/products/[id]/stripe-sync:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

