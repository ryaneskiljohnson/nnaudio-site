"use server";

import { type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  validateToken,
  getAccessibleProductIds,
} from "@/utils/nnaudio-access/access";

function formatError(message: string): string {
  return JSON.stringify({ success: false, message });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const token = body.get("token")?.toString() || "";
    const productId = body.get("product_id")?.toString() || "";

    if (!productId) {
      return new Response(formatError("product_id is required"), { status: 400 });
    }

    // Validate token
    const { valid, userId } = await validateToken(token);
    if (!valid || !userId) {
      return new Response(formatError("Token is invalid"), { status: 400 });
    }

    // Use admin client to access profiles table (same as products endpoint logic)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify user has access: product grants + one-time Stripe purchases (individual or bundles)
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", userId)
      .single();

    const { productIds } = await getAccessibleProductIds(userId, profile || {});

    // First, try to find the product by UUID or legacy_product_id
    // This allows plugins to use either the new UUID or the old numeric ID
    let product: any = null;
    let actualProductId: string = productId;

    // Try UUID first (most common case)
    let { data: productByUuid, error: uuidError } = await (adminSupabase as any)
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("status", "active")
      .single();

    if (productByUuid && !uuidError) {
      product = productByUuid;
      actualProductId = product.id;
      console.log(`[NNAudio Access Product] Found product by UUID: ${productId}`);
    } else {
      // Try legacy_product_id if UUID lookup failed
      console.log(`[NNAudio Access Product] UUID lookup failed, trying legacy_product_id: ${productId}`);
      const { data: productByLegacyId, error: legacyError } = await (adminSupabase as any)
        .from("products")
        .select("*")
        .eq("legacy_product_id", productId)
        .eq("status", "active")
        .single();

      if (productByLegacyId && !legacyError) {
        product = productByLegacyId;
        actualProductId = product.id;
        console.log(`[NNAudio Access Product] Found product by legacy_product_id: ${productId} -> ${product.id}`);
      }
    }

    if (!product) {
      console.log(`[NNAudio Access Product] Product not found: ${productId} (tried UUID and legacy_product_id)`);
      return new Response(formatError("Product not found"), { status: 404 });
    }

    // Check if the user has access to this product (using the actual UUID)
    const hasAccess = productIds.has(actualProductId);
    console.log(`[NNAudio Access Product] Product ${actualProductId} in accessible products: ${hasAccess}`);
    console.log(`[NNAudio Access Product] Total accessible products: ${productIds.size}`);
    console.log(`[NNAudio Access Product] Accessible product IDs:`, Array.from(productIds).slice(0, 10));
    
    if (!hasAccess) {
      console.log(`[NNAudio Access Product] Access denied for user ${userId} (${profile?.email}) and product ${actualProductId}`);
      console.log(`[NNAudio Access Product] Debug info:`, {
        requestedProductId: productId,
        actualProductId,
        productName: product.name,
        productIdsSize: productIds.size,
      });
      return new Response(formatError("Access denied"), { status: 403 });
    }
    
    console.log(`[NNAudio Access Product] ✅ Access granted for ${product.name} (${actualProductId})`);

    // Format response to match WooCommerce format expected by desktop app
    const formattedProduct: any = {
      success: true, // Explicit success flag for plugin compatibility
      id: product.id,
      name: product.name,
      images: [],
      downloads: [],
    };

    // Add image if available (use PNG for NNAudio Access - macOS doesn't support WebP)
    const imageUrl =
      product.featured_image_url_png || product.featured_image_url;
    if (imageUrl) {
      formattedProduct.images.push({
        src: imageUrl,
        alt: product.name,
      });
    }

    // Add downloads from the downloads JSON field
    // Support both new downloads array and legacy download_url field
    if (product.downloads && Array.isArray(product.downloads) && product.downloads.length > 0) {
      // New format: downloads array with path, name, type, etc.
      // Generate signed URLs for storage paths
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      const downloadsWithUrls = await Promise.all(
        product.downloads.map(async (download: any) => {
          // If path looks like a storage path (doesn't start with http), generate signed URL
          if (download.path && !download.path.startsWith("http")) {
            try {
              const { data: signedUrlData } = await adminSupabase.storage
                .from("product-downloads")
                .createSignedUrl(download.path, 3600); // 1 hour expiry

              return {
                file: signedUrlData?.signedUrl || download.path,
                name: download.name || product.name,
                type: download.type || "plugin",
                version: download.version || product.download_version || null,
                file_size: download.file_size || null,
              };
            } catch (error) {
              console.error(
                `Error generating signed URL for ${download.path}:`,
                error
              );
              // Fallback to path if signed URL generation fails
              return {
                file: download.path,
                name: download.name || product.name,
                type: download.type || "plugin",
                version: download.version || product.download_version || null,
                file_size: download.file_size || null,
              };
            }
          } else {
            // Already a full URL (legacy or external)
            return {
              file: download.path || download.url,
              name: download.name || product.name,
              type: download.type || "plugin",
              version: download.version || product.download_version || null,
              file_size: download.file_size || null,
            };
          }
        })
      );

      formattedProduct.downloads = downloadsWithUrls;
      
      // Extract version from downloads array (preferred method)
      if (downloadsWithUrls.length > 0 && downloadsWithUrls[0].version) {
        formattedProduct.version = downloadsWithUrls[0].version;
      }
    } else if (product.download_url) {
      // Legacy format: single download_url field
      formattedProduct.downloads.push({
        file: product.download_url,
        name: product.name,
      });
    }

    // If version not found in downloads array, fall back to deprecated download_version field
    if (!formattedProduct.version && product.download_version) {
      formattedProduct.version = product.download_version;
    }

    return new Response(JSON.stringify(formattedProduct), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[NNAudio Access Product] Error:", error);
    return new Response(formatError("Unable to handle product request"), {
      status: 500,
    });
  }
}

