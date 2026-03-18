/**
 * @fileoverview API route to generate and download branded PDF with serial code redemption instructions
 * @module api/admin/reseller-codes/redeem-instructions-pdf
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkAdmin } from "@/app/actions/user-management";

/**
 * @brief GET redeem instructions PDF (admin only)
 * @param request - Query params: serial_code (optional), product_name (optional)
 * @returns PDF file (application/pdf)
 *
 * @example
 * GET /api/admin/reseller-codes/redeem-instructions-pdf
 * GET /api/admin/reseller-codes/redeem-instructions-pdf?serial_code=ABC123&product_name=My%20Product
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
    const serial_code = searchParams.get("serial_code")?.trim() || undefined;
    const product_name = searchParams.get("product_name")?.trim() || undefined;

    const { generateRedeemInstructionsPdf } = await import("@/utils/redeemInstructionsPdf");
    const pdfBytes = generateRedeemInstructionsPdf({
      serial_code,
      product_name,
    });

    const filename = serial_code
      ? `nnaudio-redeem-instructions-${serial_code.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}.pdf`
      : "nnaudio-redeem-instructions.pdf";

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error: unknown) {
    console.error("[Redeem instructions PDF] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
