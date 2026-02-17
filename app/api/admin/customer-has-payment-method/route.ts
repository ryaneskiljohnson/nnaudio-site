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

    // Check if customer has any payment methods on file
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      limit: 1,
    });

    // Also check if customer has a default payment method set
    const customer = await stripe.customers.retrieve(customerId);
    const hasDefaultPaymentMethod = customer.deleted ? false : !!customer.invoice_settings?.default_payment_method;

    const hasPaymentMethod = paymentMethods.data.length > 0 || hasDefaultPaymentMethod;

    return NextResponse.json({
      success: true,
      hasPaymentMethod,
    });
  } catch (error) {
    console.error('Error checking payment method:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check payment method',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

