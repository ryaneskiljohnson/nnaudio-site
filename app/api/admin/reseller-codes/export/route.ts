/**
 * @fileoverview API route for exporting reseller codes as CSV
 * @module api/admin/reseller-codes/export
 */

"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/app/actions/user-management";

/**
 * @brief Export reseller codes as CSV (admin only)
 * @param {NextRequest} request - Request with query params: reseller_id, product_id
 * @returns {Promise<NextResponse>} CSV file download
 * 
 * @example
 * GET /api/admin/reseller-codes/export?reseller_id=xxx&product_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const resellerId = searchParams.get("reseller_id");
    const productId = searchParams.get("product_id");

    if (!resellerId || !productId) {
      return NextResponse.json(
        { error: "reseller_id and product_id are required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: codes, error } = await adminSupabase
      .from("reseller_codes")
      .select(`
        serial_code,
        redeemed_at,
        created_at,
        products:product_id (
          name
        ),
        resellers:reseller_id (
          name
        )
      `)
      .eq("reseller_id", resellerId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Reseller Codes Export] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!codes || codes.length === 0) {
      return NextResponse.json(
        { error: "No codes found" },
        { status: 404 }
      );
    }

    // Generate CSV
    const productName = (codes[0] as any)?.products?.name || "Unknown Product";
    const resellerName = (codes[0] as any)?.resellers?.name || "Unknown Reseller";
    
    const csvHeader = "Serial Code,Status,Created At,Redeemed At\n";
    const csvRows = codes.map((code: any) => {
      const status = code.redeemed_at ? "Redeemed" : "Available";
      const createdAt = code.created_at
        ? new Date(code.created_at).toISOString()
        : "";
      const redeemedAt = code.redeemed_at
        ? new Date(code.redeemed_at).toISOString()
        : "";
      
      // Escape commas and quotes in CSV
      const escapeCSV = (str: string) => {
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return `${escapeCSV(code.serial_code)},${status},${createdAt},${redeemedAt}`;
    });

    const csvContent = csvHeader + csvRows.join("\n");

    // Generate filename
    const sanitizeFilename = (str: string) =>
      str.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${sanitizeFilename(resellerName)}_${sanitizeFilename(productName)}_codes_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[Reseller Codes Export] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
