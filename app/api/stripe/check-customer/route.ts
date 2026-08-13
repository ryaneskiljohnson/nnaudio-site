import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/utils/stripe/client";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";

export async function POST(request: NextRequest) {
  try {
    // Throttle to limit email/account enumeration.
    const ip = getClientIp(request);
    if (!checkRateLimit(`check-customer:${ip}`, 15, 60)) {
      return NextResponse.json(
        {
          exists: false,
          hasPriorTransactions: false,
          hasActiveSubscription: false,
          error: "Too many requests",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email }: { email: string } = body;

    if (!email) {
      return NextResponse.json(
        {
          exists: false,
          hasPriorTransactions: false,
          hasActiveSubscription: false,
          error: "Email is required",
        },
        { status: 400 }
      );
    }

    const result = await checkExistingCustomer(email);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking customer:", error);
    return NextResponse.json(
      {
        exists: false,
        hasPriorTransactions: false,
        hasActiveSubscription: false,
        error:
          error instanceof Error ? error.message : "Failed to check customer",
      },
      { status: 500 }
    );
  }
}

async function checkExistingCustomer(email: string): Promise<{
  exists: boolean;
  hasPriorTransactions: boolean;
  hasActiveSubscription: boolean;
  error?: string;
}> {
  try {
    // Search for existing customers with this email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10, // Get up to 10 customers with this email
    });

    if (customers.data.length === 0) {
      return {
        exists: false,
        hasPriorTransactions: false,
        hasActiveSubscription: false,
      };
    }

    let hasPriorTransactions = false;
    let hasActiveSubscription = false;

    // Check each customer for transactions and subscriptions
    for (const customer of customers.data) {
      // Check for payment intents (completed purchases)
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 1,
      });

      if (paymentIntents.data.length > 0) {
        // Check if any payment intents are successful
        const successfulPayments = paymentIntents.data.filter(
          (pi) => pi.status === "succeeded"
        );
        if (successfulPayments.length > 0) {
          hasPriorTransactions = true;
        }
      }

      // Check for invoices (subscription billing)
      const invoices = await stripe.invoices.list({
        customer: customer.id,
        limit: 1,
      });

      if (invoices.data.length > 0) {
        // Check if any invoices are paid
        const paidInvoices = invoices.data.filter(
          (invoice) => invoice.status === "paid"
        );
        if (paidInvoices.length > 0) {
          hasPriorTransactions = true;
        }
      }

      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        hasActiveSubscription = true;
        hasPriorTransactions = true; // Active subscription implies prior transaction
      }

      // Check for trialing subscriptions
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "trialing",
        limit: 1,
      });

      if (trialingSubscriptions.data.length > 0) {
        hasActiveSubscription = true;
        // Trialing might not have prior payment, so don't set hasPriorTransactions here
      }
    }

    return {
      exists: true,
      hasPriorTransactions,
      hasActiveSubscription,
    };
  } catch (error) {
    console.error("Error in checkExistingCustomer:", error);
    return {
      exists: false,
      hasPriorTransactions: false,
      hasActiveSubscription: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
