/**
 * @fileoverview Admin API: net paid spend for a Stripe customer and/or CRM user.
 * @module api/admin/customer-total-spent
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import {
  stripeCustomerIdsForProfile,
  sumPaidChargeCentsForCustomerIds,
} from "@/utils/stripe/profile-customers";

/**
 * GET /api/admin/customer-total-spent?userId=...&customerId=...
 * @param request Query `userId` and/or `customerId`.
 * @returns 200 `{ success, totalSpent }` in dollars; 400/401/500 on error.
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
    const totalSpentCents = await sumPaidChargeCentsForCustomerIds(customerIds);

    return NextResponse.json({
      success: true,
      totalSpent: totalSpentCents / 100,
    });
  } catch (error) {
    console.error("Error calculating total spent:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate total spent",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
