/**
 * @fileoverview Admin API to resolve file size from a product download path or URL.
 * @module api/admin/products/download-file-size
 *
 * Used by the product edit UI so file_size can be set when the download link
 * changes, without NNAudio Access having to calculate it every time.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/service";
import { getDownloadFileSize } from "@/utils/product-downloads";

/**
 * @brief GET - Resolve file size in bytes for a download path or URL.
 * @param request Next request; expects search param: path (storage path or URL)
 * @returns JSON { file_size: number | null }
 * @example GET /api/admin/products/download-file-size?path=products/apache-flute/plugin.zip
 * Response: { "file_size": 37811823 }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminData, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const pathParam = request.nextUrl.searchParams.get("path");
    if (pathParam == null || pathParam.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty path parameter" },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminClient();
    const fileSize = await getDownloadFileSize(pathParam.trim(), adminSupabase);

    return NextResponse.json({ file_size: fileSize });
  } catch (error) {
    console.error("[download-file-size]", error);
    return NextResponse.json(
      { error: "Failed to resolve file size" },
      { status: 500 }
    );
  }
}
