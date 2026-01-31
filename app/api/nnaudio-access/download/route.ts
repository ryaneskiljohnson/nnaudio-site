"use server";

import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  validateToken,
  getAccessibleProductIds,
  resolveProductId,
} from "@/utils/nnaudio-access/access";

function formatError(message: string): string {
  return JSON.stringify({ success: false, message });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const token = body.get("token")?.toString() || "";
    const productId = body.get("product_id")?.toString() || "";
    const downloadPath = body.get("path")?.toString() || "";

    if (!productId || !downloadPath) {
      return new Response(
        formatError("product_id and path are required"),
        { status: 400 }
      );
    }

    // Validate token
    const { valid, userId } = await validateToken(token);
    if (!valid || !userId) {
      return new Response(formatError("Token is invalid"), { status: 400 });
    }

    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", userId)
      .single();

    const { productIds: accessibleProductIds } = await getAccessibleProductIds(
      userId,
      profile || {}
    );

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const resolvedProductId = await resolveProductId(adminSupabase, productId);
    if (resolvedProductId === null) {
      return new Response(formatError("Product not found"), { status: 404 });
    }

    if (!accessibleProductIds.has(resolvedProductId)) {
      return new Response(formatError("Access denied"), { status: 403 });
    }

    // Verify the download path belongs to this product
    const { data: product, error: productError } = await adminSupabase
      .from("products")
      .select("downloads")
      .eq("id", resolvedProductId)
      .single();

    if (productError || !product) {
      return new Response(formatError("Product not found"), { status: 404 });
    }

    // Check if download path exists in product's downloads
    const downloads = product.downloads || [];
    const downloadExists = downloads.some(
      (d: any) => d.path === downloadPath
    );

    if (!downloadExists) {
      return new Response(formatError("Download not found for this product"), {
        status: 404,
      });
    }

    // Generate signed URL valid for 1 hour
    const { data: signedUrlData, error: signedUrlError } =
      await adminSupabase.storage
        .from("product-downloads")
        .createSignedUrl(downloadPath, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      console.error("Error generating signed URL:", signedUrlError);
      return new Response(formatError("Unable to generate download URL"), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: signedUrlData.signedUrl,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[NNAudio Access Download] Error:", error);
    return new Response(formatError("Unable to handle download request"), {
      status: 500,
    });
  }
}

