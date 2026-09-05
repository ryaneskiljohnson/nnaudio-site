/**
 * @fileoverview Admin API: whether a CRM user or Stripe customer has a card on file.
 * @module api/admin/customer-has-payment-method
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import {
  anyCustomerHasPaymentMethod,
  stripeCustomerIdsForProfile,
} from "@/utils/stripe/profile-customers";

/**
 * GET /api/admin/customer-has-payment-method?userId=...&customerId=...
 * @param request Query `userId` and/or `customerId`.
 * @returns 200 `{ success, hasPaymentMethod }`; 400/401/500 on error.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const customerId = searchParams.get("customerId");
    if (!userId && !customerId) {
      return NextResponse.json(
        { error: "userId or customerId is required" },
        { status: 400 }
      );
    }

    let email: string | null = null;
    let linkedCustomerId = customerId;
    if (userId) {
      const service = await createSupabaseServiceRole();
      const { data: profile } = await service
        .from("profiles")
        .select("customer_id, email")
        .eq("id", userId)
        .maybeSingle();
      linkedCustomerId = profile?.customer_id ?? linkedCustomerId;
      email = profile?.email ?? null;
    }

    const customerIds = await stripeCustomerIdsForProfile({
      customer_id: linkedCustomerId,
      email,
    });
    const hasPaymentMethod = await anyCustomerHasPaymentMethod(customerIds);

    return NextResponse.json({
      success: true,
      hasPaymentMethod,
    });
  } catch (error) {
    console.error("Error checking payment method:", error);
    return NextResponse.json(
      {
        error: "Failed to check payment method",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
