import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user's profile to find customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.customer_id) {
      // If no customer_id, return empty orders
      return NextResponse.json({ success: true, orders: [] });
    }

    // Fetch payment intents for this customer
    const paymentIntents = await stripe.paymentIntents.list({
      customer: profile.customer_id,
      limit: 100,
    });

    // Filter to only successful payment intents (completed orders)
    const successfulPayments = paymentIntents.data.filter(
      (pi) => pi.status === "succeeded"
    );

    // Transform payment intents into orders
    const orders = await Promise.all(
      successfulPayments.map(async (pi) => {
        // Parse cart items from metadata
        let items: any[] = [];
        try {
          const cartItemsStr = pi.metadata?.cart_items;
          if (cartItemsStr) {
            items = JSON.parse(cartItemsStr);
          }
        } catch (e) {
          console.error("Error parsing cart items:", e);
        }

        // Get charge details if available
        let receiptUrl: string | null = null;
        let invoiceId: string | null = null;
        
        if (pi.latest_charge) {
          const charge = await stripe.charges.retrieve(
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge.id
          );
          receiptUrl = charge.receipt_url;
        }

        // Try to get invoice if available
        if (pi.invoice) {
          const invoice = await stripe.invoices.retrieve(
            typeof pi.invoice === "string" ? pi.invoice : pi.invoice.id
          );
          invoiceId = invoice.id;
          if (!receiptUrl && invoice.hosted_invoice_url) {
            receiptUrl = invoice.hosted_invoice_url;
          }
        }

        return {
          id: pi.id,
          orderNumber: pi.id.substring(3, 11).toUpperCase(), // Use part of payment intent ID as order number
          date: new Date(pi.created * 1000).toISOString(),
          status: pi.status,
          amount: pi.amount / 100, // Convert from cents
          currency: pi.currency.toUpperCase(),
          items: items,
          metadata: {
            original_total: pi.metadata?.original_total,
            discount_amount: pi.metadata?.discount_amount,
            total_amount: pi.metadata?.total_amount,
            promotion_code: pi.metadata?.promotion_code,
          },
          receiptUrl,
          invoiceId,
        };
      })
    );

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}

