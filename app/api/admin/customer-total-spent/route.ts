import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkAdmin } from "@/app/actions/user-management";
import { stripe } from "@/utils/stripe/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      );
    }

    // Fetch all charges for this customer - most accurate method
    // Charges are the source of truth for actual money charged
    const allCharges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
    });

    // Use a Set to track charge IDs to prevent double counting
    // (in case there are any duplicates in the response)
    const seenChargeIds = new Set<string>();
    
    // Sum all successful, paid charges that haven't been fully refunded
    // amount_refunded is the amount that was refunded, so we subtract it
    const totalSpentCents = allCharges.data
      .filter((charge) => {
        // Only count each charge once (deduplicate by ID)
        if (seenChargeIds.has(charge.id)) {
          return false;
        }
        seenChargeIds.add(charge.id);
        
        // Only count paid, non-refunded charges
        return charge.paid && !charge.refunded;
      })
      .reduce((sum, charge) => {
        // amount is the original charge amount, amount_refunded is what was refunded
        // So net amount = amount - amount_refunded
        const netAmount = charge.amount - (charge.amount_refunded || 0);
        return sum + netAmount;
      }, 0);

    // Convert from cents to dollars
    const totalSpent = totalSpentCents / 100;

    return NextResponse.json({
      success: true,
      totalSpent,
    });
  } catch (error) {
    console.error('Error calculating total spent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate total spent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

