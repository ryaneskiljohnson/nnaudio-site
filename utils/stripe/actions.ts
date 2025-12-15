"use server";

import Stripe from "stripe";
import { SubscriptionType } from "@/utils/supabase/types";
import { PlanType, PriceData } from "@/types/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Server action to initiate checkout process
 * @param planType The selected plan type
 * @param email Optional user email
 * @param collectPaymentMethod Whether to collect payment method during checkout (extends trial)
 */
export async function initiateCheckout(
  planType: PlanType,
  email?: string,
  customerId?: string,
  collectPaymentMethod: boolean = false
): Promise<{ url: string | null; error?: string }> {
  try {
    let resolved_customer_id: string | undefined;

    // If email is provided, find or create customer
    if (!customerId && email) {
      resolved_customer_id = await findOrCreateCustomer(email);
    } else if (customerId) {
      resolved_customer_id = customerId;
    }
    // Create checkout session with or without customer ID
    return await createCheckoutSession(
      resolved_customer_id,
      planType,
      collectPaymentMethod
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return {
      url: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Fetches all plan prices for the product
 * @returns Object containing the prices for each plan type
 */
export async function getPrices(): Promise<{
  prices: Record<PlanType, PriceData>;
  error?: string;
}> {
  try {
    // Get the price IDs from environment variables
    const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY!;
    const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL!;
    const lifetimePriceId = process.env.STRIPE_PRICE_ID_LIFETIME!;

    // Fetch prices from Stripe
    const [monthlyPrice, annualPrice, lifetimePrice] = await Promise.all([
      stripe.prices.retrieve(monthlyPriceId, { expand: ["product"] }),
      stripe.prices.retrieve(annualPriceId, { expand: ["product"] }),
      stripe.prices.retrieve(lifetimePriceId, { expand: ["product"] }),
    ]);

    // Fetch active promotions/coupons
    // const promotions = await stripe.promotionCodes.list({
    //   active: true,
    //   limit: 10,
    //   expand: ["data.coupon"],
    // });

    // console.log(JSON.stringify(promotions));

    // Find the best applicable discount
    // Get the first active promotion with the highest percent_off or amount_off
    // const getActivePromotion = () => {
    //   if (!promotions.data.length) return undefined;

    //   // Sort by percent_off (descending), then by amount_off (descending)
    //   const sortedPromotions = [...promotions.data].sort((a, b) => {
    //     // Compare percent_off first (higher is better)
    //     const percentOffA = a.coupon?.percent_off || 0;
    //     const percentOffB = b.coupon?.percent_off || 0;
    //     if (percentOffA !== percentOffB) {
    //       return percentOffB - percentOffA;
    //     }

    //     // If percent_off is the same, compare amount_off
    //     const amountOffA = a.coupon?.amount_off || 0;
    //     const amountOffB = b.coupon?.amount_off || 0;
    //     return amountOffB - amountOffA;
    //   });

    //   // Return the best promotion
    //   const bestPromotion = sortedPromotions[0];
    //   if (!bestPromotion || !bestPromotion.coupon) return undefined;

    //   return {
    //     id: bestPromotion.id,
    //     name: bestPromotion.coupon.name || "Special Offer",
    //     percent_off: bestPromotion.coupon.percent_off || undefined,
    //     amount_off: bestPromotion.coupon.amount_off || undefined,
    //     currency: bestPromotion.coupon.currency || undefined,
    //     promotion_code: bestPromotion.id, // Save promotion code ID
    //     promotion_display: bestPromotion.coupon.name || "Special Offer",
    //   };
    // };

    // // Get the best active promotion
    // const activePromotion = getActivePromotion();

    // Get product name
    const productName =
      (monthlyPrice.product as Stripe.Product).name || "Pro Plan";

    // Format response
    const prices: Record<PlanType, PriceData> = {
      monthly: {
        id: monthlyPrice.id,
        type: "monthly",
        amount: monthlyPrice.unit_amount || 0,
        currency: monthlyPrice.currency,
        interval: monthlyPrice.recurring?.interval,
        name: `${productName} (Monthly)`,
        // discount: activePromotion,
      },
      annual: {
        id: annualPrice.id,
        type: "annual",
        amount: annualPrice.unit_amount || 0,
        currency: annualPrice.currency,
        interval: annualPrice.recurring?.interval,
        name: `${productName} (Annual)`,
        // discount: activePromotion,
      },
      lifetime: {
        id: lifetimePrice.id,
        type: "lifetime",
        amount: lifetimePrice.unit_amount || 0,
        currency: lifetimePrice.currency,
        name: `${productName} (Lifetime)`,
        // discount: activePromotion,
      },
    };

    return { prices };
  } catch (error) {
    console.error("Error fetching prices:", error);
    return {
      prices: {
        monthly: {
          id: "",
          type: "monthly",
          amount: 0,
          currency: "usd",
          name: "Monthly",
        },
        annual: {
          id: "",
          type: "annual",
          amount: 0,
          currency: "usd",
          name: "Annual",
        },
        lifetime: {
          id: "",
          type: "lifetime",
          amount: 0,
          currency: "usd",
          name: "Lifetime",
        },
      },
      error: error instanceof Error ? error.message : "Failed to fetch prices",
    };
  }
}

/**
 * Creates a Stripe checkout session for the selected plan
 * @param customerId Optional Stripe customer ID
 * @param planType The selected plan type (monthly, annual or lifetime)
 * @param collectPaymentMethod Whether to collect payment method during checkout (extends trial)
 * @returns Checkout session URL
 */
export async function createCheckoutSession(
  customerId: string | undefined,
  planType: PlanType,
  collectPaymentMethod: boolean = false
): Promise<{ url: string | null; error?: string }> {
  try {
    // Return error if customer ID is not provided
    if (!customerId) {
      return { url: null, error: "Customer ID is required for checkout" };
    }

    let priceId: string;
    let mode: "payment" | "subscription";

    // Choose the correct price ID based on plan type
    switch (planType) {
      case "monthly":
        priceId = process.env.STRIPE_PRICE_ID_MONTHLY!;
        mode = "subscription";
        break;
      case "annual":
        priceId = process.env.STRIPE_PRICE_ID_ANNUAL!;
        mode = "subscription";
        break;
      case "lifetime":
        priceId = process.env.STRIPE_PRICE_ID_LIFETIME!;
        mode = "payment";
        break;
      default:
        throw new Error("Invalid plan type");
    }

    const return_url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/checkout-result?session_id={CHECKOUT_SESSION_ID}`;
    // Create checkout session with optional customer ID
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: return_url,
      cancel_url: return_url,
      customer: customerId,
    };

    // Add payment_intent_data and invoice_creation for lifetime purchases to ensure metadata is set
    // This ensures metadata is on both payment intent AND invoice for all lifetime purchases
    if (planType === "lifetime") {
      sessionConfig.payment_intent_data = {
        metadata: {
          purchase_type: "lifetime",
        },
      };
      // Also set metadata on invoice when it's created
      sessionConfig.invoice_creation = {
        enabled: true,
        invoice_data: {
          metadata: {
            purchase_type: "lifetime",
          },
        },
      };
    }

    // Enable entering promotion codes on the Checkout page
    sessionConfig.allow_promotion_codes = true;

    // Set payment method collection for subscription plans
    if (mode === "subscription") {
      sessionConfig.payment_method_collection = collectPaymentMethod
        ? "always"
        : "if_required";
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return { url: session.url };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      url: null,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

/**
 * Finds a customer by email or creates a new one if not found
 * @param email Customer email to search for
 * @returns The customer ID
 */
export async function findOrCreateCustomer(email: string): Promise<string> {
  try {
    // Normalize email: lowercase and trim to prevent duplicates from case differences
    const normalizedEmail = email.toLowerCase().trim();

    // Search for existing customers with this email (Stripe search is case-insensitive, but we normalize for consistency)
    const customers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 10, // Get more results to handle potential duplicates
    });

    // If a customer exists, return the first one (most recent)
    if (customers.data.length > 0) {
      // If there are multiple customers with the same email, log a warning
      if (customers.data.length > 1) {
        console.warn(
          `Found ${customers.data.length} Stripe customers with email ${normalizedEmail}. Using the most recent one.`
        );
      }
      // Return the most recently created customer (first in list is typically most recent)
      return customers.data[0].id;
    }

    // Otherwise create a new customer
    // Use hour-based idempotency key to prevent duplicate creation in race conditions
    // Key includes current hour so failed attempts can be retried after an hour
    // All signups within the same hour use the same key, preventing duplicates from spam clicking
    const now = new Date();
    const hourKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}`;
    const idempotencyKey = `cust_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}_${hourKey}`;
    
    try {
      const customer = await stripe.customers.create(
        {
          email: normalizedEmail,
        },
        {
          idempotencyKey: idempotencyKey.substring(0, 255), // Stripe has 255 char limit
        }
      );

      return customer.id;
    } catch (createError: any) {
      // If customer creation fails, it could be due to:
      // 1. Idempotency key collision (another request is creating the same customer)
      // 2. Network/API error
      // 3. Customer was created between our check and create (race condition)
      
      // Always retry the lookup - another process may have created the customer
      // Wait a brief moment to allow concurrent request to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const retryCustomers = await stripe.customers.list({
        email: normalizedEmail,
        limit: 1,
      });

      if (retryCustomers.data.length > 0) {
        console.log(`Customer found on retry after creation error: ${retryCustomers.data[0].id}`);
        return retryCustomers.data[0].id;
      }

      // If retry also fails, check for specific error codes
      if (
        createError?.code === 'idempotency_key_in_use' ||
        createError?.type === 'StripeIdempotencyError'
      ) {
        // Idempotency key collision - wait a bit longer and retry lookup
        await new Promise(resolve => setTimeout(resolve, 500));
        const finalRetry = await stripe.customers.list({
          email: normalizedEmail,
          limit: 1,
        });
        if (finalRetry.data.length > 0) {
          return finalRetry.data[0].id;
        }
      }

      // If all retries fail, throw the original error
      throw createError;
    }
  } catch (error) {
    console.error("Error finding or creating customer:", error);
    throw error;
  }
}



export type CustomerPurchasedProResponse = {
  success: boolean;
  subscription: SubscriptionType;
  trial_end_date?: Date; // Unix timestamp when trial ends
  subscription_expiration?: Date; // Unix timestamp when subscription expires
  error?: Error | unknown;
};

export async function cancelSubscription(
  customerId: string,
  subscriptionId: string
): Promise<{ success: boolean; error?: Error | unknown }> {
  try {
    console.log(
      `Cancelling subscription ${subscriptionId} for customer ${customerId} who upgraded to lifetime`
    );

    // Cancel the subscription immediately
    await stripe.subscriptions.cancel(subscriptionId, {
      invoice_now: false, // Don't generate a final invoice
      prorate: false, // Prorate any unused time
    });

    console.log(`Successfully cancelled subscription ${subscriptionId}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to cancel subscription ${subscriptionId}:`, error);
    return { success: false, error: error as Error };
  }
}

/**
 * Fetches the result of a checkout session by ID
 * @param sessionId The Stripe checkout session ID
 * @returns Session details including status, subscription, and customer info
 */
export async function getCheckoutSessionResult(sessionId: string): Promise<{
  success: boolean;
  status: string;
  customerId?: string;
  customerEmail?: string;
  subscriptionId?: string;
  paymentStatus?: string;
  mode?: string;
  hasTrialPeriod?: boolean;
  subscription?: Stripe.Subscription | string;
  metadata?: Record<string, string>;
  error?: string;
}> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription", "payment_intent"],
    });

    // Handle the customer field which can be string ID or expanded Customer object
    let customerId: string | undefined;
    let customerEmail: string | undefined;

    if (session.customer) {
      if (typeof session.customer === "string") {
        customerId = session.customer;
      } else if ("id" in session.customer) {
        customerId = session.customer.id;
        // Only access email if it's a full Customer object (not DeletedCustomer)
        if (!session.customer.deleted && "email" in session.customer) {
          customerEmail = session.customer.email || undefined;
        }
      }
    }

    // Handle subscription field
    let subscriptionId: string | undefined;
    let hasTrialPeriod: boolean = false;
    let subscription: Stripe.Subscription | string | undefined = undefined;

    if (session.subscription) {
      subscription = session.subscription;
      subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

      // Check if the subscription includes a trial period
      if (typeof session.subscription !== "string") {
        hasTrialPeriod = !!session.subscription.trial_end;
      }
    }

    // Handle payment_intent field
    let paymentStatus: string | undefined;
    if (session.payment_intent && typeof session.payment_intent !== "string") {
      paymentStatus = session.payment_intent.status;
    }

    return {
      success: true,
      status: session.status || "unknown",
      customerId,
      customerEmail,
      subscriptionId,
      paymentStatus,
      mode: session.mode || undefined,
      hasTrialPeriod,
      subscription,
      metadata: session.metadata || undefined,
    };
  } catch (error) {
    console.error("Error fetching checkout session:", error);
    return {
      success: false,
      status: "error",
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Gets the upcoming invoice for a customer to show accurate first charge amount
 */
export async function getUpcomingInvoice(customerId: string | null): Promise<{
  amount: number;
  error: string | null;
  due_date: Date | null;
}> {
  try {
    if (!customerId) {
      return { amount: 0, error: "No customer ID provided", due_date: null };
    }

    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });

    return {
      amount: upcomingInvoice.amount_due / 100,
      error: null,
      due_date: upcomingInvoice.due_date
        ? new Date(upcomingInvoice.due_date * 1000)
        : null,
    };
  } catch (error: unknown) {
    // Handle the case where there are no upcoming invoices gracefully
    // This is common for lifetime customers, canceled subscriptions, or customers without active subscriptions
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("No upcoming invoices") ||
      errorMessage.includes("no upcoming invoice") ||
      errorMessage.includes("No invoice found")
    ) {
      // This is not really an error - just means no upcoming charges
      return { amount: 0, error: null, due_date: null };
    }

    // For other types of errors, still log them but don't expose the full error to the UI
    console.error("Error fetching upcoming invoice:", error);
    return { amount: 0, error: null, due_date: null };
  }
}

/**
 * Updates a customer's subscription to a new plan type
 * @param customerId The Stripe customer ID
 * @param planType The new plan type to change to (monthly or annual only)
 * @returns Object indicating success and any errors
 */
export async function updateSubscription(
  customerId: string,
  planType: "monthly" | "annual"
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!customerId) {
      return { success: false, error: "Missing customer ID" };
    }

    // Get price ID for the new plan
    let priceId: string;
    switch (planType) {
      case "monthly":
        priceId = process.env.STRIPE_PRICE_ID_MONTHLY!;
        break;
      case "annual":
        priceId = process.env.STRIPE_PRICE_ID_ANNUAL!;
        break;
      default:
        return {
          success: false,
          error: "Invalid plan type for subscription update",
        };
    }

    // Find the customer's active subscriptions
    const active_sub = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const trialing_sub = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    });

    if (!active_sub.data.length && !trialing_sub.data.length) {
      return { success: false, error: "No active subscription found" };
    }

    const subscription = active_sub.data.length
      ? active_sub.data[0]
      : trialing_sub.data[0];

    const subscriptionId = subscription.id;

    const updateParams: Stripe.SubscriptionUpdateParams = {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
    };

    await stripe.subscriptions.update(subscriptionId, updateParams);

    return { success: true };
  } catch (error) {
    console.error("Error updating subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Checks if a Stripe customer with the given email exists and has prior transactions or active subscriptions
 * @param email Customer email to check
 * @returns Object indicating if customer exists, has prior transactions, and has an active subscription
 */
export async function checkExistingCustomer(email: string): Promise<{
  exists: boolean;
  hasPriorTransactions: boolean;
  hasActiveSubscription: boolean;
  error?: string;
}> {
  try {
    // Search for existing customers with this email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    // If no customer exists, return false for all flags
    if (customers.data.length === 0) {
      return {
        exists: false,
        hasPriorTransactions: false,
        hasActiveSubscription: false,
      };
    }

    const customerId = customers.data[0].id;

    // Get customer's subscriptions to check if they're already subscribed
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    // Check for any payments (invoice or charge history)
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 10,
    });

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });

    // Check if customer has any prior transactions (completed charges or paid invoices)
    const hasPriorTransactions =
      charges.data.some((charge) => charge.paid) ||
      invoices.data.some((invoice) => invoice.paid) ||
      subscriptions.data.some(
        (sub) =>
          sub.status === "trialing" ||
          sub.status === "active" ||
          sub.status === "past_due"
      );

    // Check if they have an active subscription
    const hasActiveSubscription = subscriptions.data.some(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );

    // Return the customer status information
    return {
      exists: true,
      hasPriorTransactions,
      hasActiveSubscription,
    };
  } catch (error) {
    console.error("Error checking existing customer:", error);
    return {
      exists: false,
      hasPriorTransactions: false,
      hasActiveSubscription: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Creates a Stripe customer portal session for managing billing
 * @param customerId The Stripe customer ID
 * @returns URL to the customer portal
 */
export async function createCustomerPortalSession(
  customerId: string
): Promise<{ url: string | null; error?: string }> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    });

    return { url: session.url };
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    return {
      url: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create portal session",
    };
  }
}

/**
 * Refund a payment intent (one-time purchase)
 * @param paymentIntentId The payment intent ID to refund
 * @param amount Optional partial refund amount in cents (if not provided, full refund)
 * @param reason Optional reason for the refund
 */
export async function refundPaymentIntent(
  paymentIntentId: string,
  amount?: number,
  reason?: "duplicate" | "fraudulent" | "requested_by_customer"
): Promise<{ success: boolean; refund?: any; error?: string }> {
  try {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: reason || "requested_by_customer",
    };

    // Add amount if partial refund
    if (amount) {
      refundData.amount = amount;
    }

    const refund = await stripe.refunds.create(refundData);

    // Serialize the refund object
    const serializedRefund = {
      id: refund.id,
      object: refund.object,
      amount: refund.amount,
      charge: refund.charge,
      created: refund.created,
      currency: refund.currency,
      metadata: refund.metadata,
      payment_intent: refund.payment_intent,
      reason: refund.reason,
      receipt_number: refund.receipt_number,
      source_transfer_reversal: refund.source_transfer_reversal,
      status: refund.status,
      transfer_reversal: refund.transfer_reversal,
    };

    return {
      success: true,
      refund: serializedRefund,
    };
  } catch (error) {
    console.error("Error refunding payment intent:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to process refund",
    };
  }
}

/**
 * Refund an invoice by creating a credit note
 * @param invoiceId The invoice ID to refund
 * @param amount Optional partial refund amount in cents (if not provided, full refund)
 * @param reason Optional reason for the refund
 */
export async function refundInvoice(
  invoiceId: string,
  amount?: number,
  reason?: Stripe.CreditNoteCreateParams.Reason
): Promise<{ success: boolean; creditNote?: any; error?: string }> {
  try {
    // First, get the invoice to check its status and amount
    const invoice = await stripe.invoices.retrieve(invoiceId);

    if (invoice.status !== "paid") {
      return {
        success: false,
        error: "Invoice must be paid to create a refund",
      };
    }

    const creditNoteData: Stripe.CreditNoteCreateParams = {
      invoice: invoiceId,
      reason: reason || "duplicate",
    };

    // Add amount if partial refund
    if (amount) {
      creditNoteData.amount = amount;
    }

    const creditNote = await stripe.creditNotes.create(creditNoteData);

    // Serialize the credit note object
    const serializedCreditNote = {
      id: creditNote.id,
      object: creditNote.object,
      amount: creditNote.amount,
      created: creditNote.created,
      currency: creditNote.currency,
      customer:
        typeof creditNote.customer === "string"
          ? creditNote.customer
          : {
              id: creditNote.customer.id,
              email:
                "email" in creditNote.customer
                  ? creditNote.customer.email
                  : null,
            },
      customer_balance_transaction: creditNote.customer_balance_transaction,
      discount_amount: creditNote.discount_amount,
      discount_amounts: creditNote.discount_amounts,
      invoice: creditNote.invoice,
      lines: creditNote.lines,
      livemode: creditNote.livemode,
      memo: creditNote.memo,
      metadata: creditNote.metadata,
      number: creditNote.number,
      out_of_band_amount: creditNote.out_of_band_amount,
      pdf: creditNote.pdf,
      reason: creditNote.reason,
      refund: creditNote.refund,
      status: creditNote.status,
      subtotal: creditNote.subtotal,
      tax_amounts: creditNote.tax_amounts,
      total: creditNote.total,
      type: creditNote.type,
      voided_at: creditNote.voided_at,
    };

    return {
      success: true,
      creditNote: serializedCreditNote,
    };
  } catch (error) {
    console.error("Error refunding invoice:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to process refund",
    };
  }
}

/**
 * Get refund history for a payment intent
 * @param paymentIntentId The payment intent ID
 */
export async function getPaymentIntentRefunds(
  paymentIntentId: string
): Promise<{ refunds: any[]; error?: string }> {
  try {
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
    });

    // Serialize the refunds
    const serializedRefunds = refunds.data.map((refund) => ({
      id: refund.id,
      object: refund.object,
      amount: refund.amount,
      charge: refund.charge,
      created: refund.created,
      currency: refund.currency,
      metadata: refund.metadata,
      payment_intent: refund.payment_intent,
      reason: refund.reason,
      receipt_number: refund.receipt_number,
      source_transfer_reversal: refund.source_transfer_reversal,
      status: refund.status,
      transfer_reversal: refund.transfer_reversal,
    }));

    return {
      refunds: serializedRefunds,
    };
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return {
      refunds: [],
      error: error instanceof Error ? error.message : "Failed to fetch refunds",
    };
  }
}

/**
 * Get credit notes for an invoice
 * @param invoiceId The invoice ID
 */
export async function getInvoiceCreditNotes(
  invoiceId: string
): Promise<{ creditNotes: any[]; error?: string }> {
  try {
    const creditNotes = await stripe.creditNotes.list({
      invoice: invoiceId,
    });

    // Serialize the credit notes
    const serializedCreditNotes = creditNotes.data.map((creditNote) => ({
      id: creditNote.id,
      object: creditNote.object,
      amount: creditNote.amount,
      created: creditNote.created,
      currency: creditNote.currency,
      customer:
        typeof creditNote.customer === "string"
          ? creditNote.customer
          : {
              id: creditNote.customer.id,
              email:
                "email" in creditNote.customer
                  ? creditNote.customer.email
                  : null,
            },
      customer_balance_transaction: creditNote.customer_balance_transaction,
      discount_amount: creditNote.discount_amount,
      discount_amounts: creditNote.discount_amounts,
      invoice: creditNote.invoice,
      lines: creditNote.lines,
      livemode: creditNote.livemode,
      memo: creditNote.memo,
      metadata: creditNote.metadata,
      number: creditNote.number,
      out_of_band_amount: creditNote.out_of_band_amount,
      pdf: creditNote.pdf,
      reason: creditNote.reason,
      refund: creditNote.refund,
      status: creditNote.status,
      subtotal: creditNote.subtotal,
      tax_amounts: creditNote.tax_amounts,
      total: creditNote.total,
      type: creditNote.type,
      voided_at: creditNote.voided_at,
    }));

    return {
      creditNotes: serializedCreditNotes,
    };
  } catch (error) {
    console.error("Error fetching credit notes:", error);
    return {
      creditNotes: [],
      error:
        error instanceof Error ? error.message : "Failed to fetch credit notes",
    };
  }
}

/**
 * Create a one-time use coupon
 * @param discountType Type of discount ('percent' or 'amount')
 * @param discountValue Value of the discount (percentage or amount in cents)
 * @param name Optional name for the coupon
 * @param currency Currency for amount-based coupons (required if discountType is 'amount')
 */
export async function createOneTimeCoupon(
  discountType: "percent" | "amount",
  discountValue: number,
  name?: string,
  currency: string = "usd"
): Promise<{ success: boolean; coupon?: any; error?: string }> {
  try {
    const couponData: Stripe.CouponCreateParams = {
      duration: "once", // One-time use
      name:
        name ||
        `${
          discountType === "percent"
            ? discountValue + "%"
            : "$" + discountValue / 100
        } off`,
    };

    // Set discount value based on type
    if (discountType === "percent") {
      couponData.percent_off = discountValue;
    } else {
      couponData.amount_off = discountValue;
      couponData.currency = currency;
    }

    const coupon = await stripe.coupons.create(couponData);

    // Serialize the coupon object to plain object
    const serializedCoupon = {
      id: coupon.id,
      object: coupon.object,
      amount_off: coupon.amount_off,
      created: coupon.created,
      currency: coupon.currency,
      duration: coupon.duration,
      duration_in_months: coupon.duration_in_months,
      livemode: coupon.livemode,
      max_redemptions: coupon.max_redemptions,
      metadata: coupon.metadata,
      name: coupon.name,
      percent_off: coupon.percent_off,
      redeem_by: coupon.redeem_by,
      times_redeemed: coupon.times_redeemed,
      valid: coupon.valid,
    };

    return {
      success: true,
      coupon: serializedCoupon,
    };
  } catch (error) {
    console.error("Error creating coupon:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create coupon",
    };
  }
}

/**
 * Create a promotion code for a coupon
 * @param couponId The coupon ID to create a promotion code for
 * @param code Optional custom code (if not provided, Stripe generates one)
 * @param maxRedemptions Maximum number of times this code can be used (default: 1)
 * @param expiresAt Optional expiration timestamp
 */
export async function createPromotionCode(
  couponId: string,
  code?: string,
  maxRedemptions: number = 1,
  expiresAt?: number
): Promise<{ success: boolean; promotionCode?: any; error?: string }> {
  try {
    const promotionCodeData: Stripe.PromotionCodeCreateParams = {
      coupon: couponId,
      max_redemptions: maxRedemptions,
    };

    // Add custom code if provided
    if (code) {
      promotionCodeData.code = code.toUpperCase();
    }

    // Add expiration if provided
    if (expiresAt) {
      promotionCodeData.expires_at = expiresAt;
    }

    const promotionCode = await stripe.promotionCodes.create(promotionCodeData);

    // Serialize the promotion code object to plain object
    const serializedPromotionCode = {
      id: promotionCode.id,
      object: promotionCode.object,
      active: promotionCode.active,
      code: promotionCode.code,
      coupon:
        typeof promotionCode.coupon === "string"
          ? promotionCode.coupon
          : {
              id: promotionCode.coupon.id,
              object: promotionCode.coupon.object,
              amount_off: promotionCode.coupon.amount_off,
              created: promotionCode.coupon.created,
              currency: promotionCode.coupon.currency,
              duration: promotionCode.coupon.duration,
              duration_in_months: promotionCode.coupon.duration_in_months,
              livemode: promotionCode.coupon.livemode,
              max_redemptions: promotionCode.coupon.max_redemptions,
              metadata: promotionCode.coupon.metadata,
              name: promotionCode.coupon.name,
              percent_off: promotionCode.coupon.percent_off,
              redeem_by: promotionCode.coupon.redeem_by,
              times_redeemed: promotionCode.coupon.times_redeemed,
              valid: promotionCode.coupon.valid,
            },
      created: promotionCode.created,
      customer: promotionCode.customer,
      expires_at: promotionCode.expires_at,
      livemode: promotionCode.livemode,
      max_redemptions: promotionCode.max_redemptions,
      metadata: promotionCode.metadata,
      restrictions: promotionCode.restrictions,
      times_redeemed: promotionCode.times_redeemed,
    };

    return {
      success: true,
      promotionCode: serializedPromotionCode,
    };
  } catch (error) {
    console.error("Error creating promotion code:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create promotion code",
    };
  }
}

/**
 * Create a complete one-time use discount code (coupon + promotion code)
 * @param discountType Type of discount ('percent' or 'amount')
 * @param discountValue Value of the discount
 * @param options Additional options for the discount code
 */
export async function createOneTimeDiscountCode(
  discountType: "percent" | "amount",
  discountValue: number,
  options?: {
    code?: string;
    name?: string;
    currency?: string;
    expiresAt?: number;
    maxRedemptions?: number;
  }
): Promise<{
  success: boolean;
  coupon?: any;
  promotionCode?: any;
  code?: string;
  error?: string;
}> {
  try {
    // Create the coupon first
    const couponResult = await createOneTimeCoupon(
      discountType,
      discountValue,
      options?.name,
      options?.currency
    );

    if (!couponResult.success || !couponResult.coupon) {
      return {
        success: false,
        error: couponResult.error || "Failed to create coupon",
      };
    }

    // Create the promotion code
    const promotionCodeResult = await createPromotionCode(
      couponResult.coupon.id,
      options?.code,
      options?.maxRedemptions || 1,
      options?.expiresAt
    );

    if (!promotionCodeResult.success || !promotionCodeResult.promotionCode) {
      return {
        success: false,
        error: promotionCodeResult.error || "Failed to create promotion code",
      };
    }

    return {
      success: true,
      coupon: couponResult.coupon,
      promotionCode: promotionCodeResult.promotionCode,
      code: promotionCodeResult.promotionCode.code,
    };
  } catch (error) {
    console.error("Error creating discount code:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create discount code",
    };
  }
}

/**
 * List all promotion codes with optional filters
 * @param options Filter options
 */
export async function listPromotionCodes(options?: {
  active?: boolean;
  coupon?: string;
  limit?: number;
}): Promise<{ promotionCodes: any[]; error?: string }> {
  try {
    const listParams: Stripe.PromotionCodeListParams = {
      limit: options?.limit || 100,
      expand: ["data.coupon"], // Expand coupon data
    };

    if (options?.active !== undefined) {
      listParams.active = options.active;
    }

    if (options?.coupon) {
      listParams.coupon = options.coupon;
    }

    const promotionCodes = await stripe.promotionCodes.list(listParams);

    // Serialize the promotion codes to plain objects
    const serializedPromotionCodes = promotionCodes.data.map(
      (promotionCode) => ({
        id: promotionCode.id,
        object: promotionCode.object,
        active: promotionCode.active,
        code: promotionCode.code,
        coupon:
          typeof promotionCode.coupon === "string"
            ? promotionCode.coupon
            : {
                id: promotionCode.coupon.id,
                object: promotionCode.coupon.object,
                amount_off: promotionCode.coupon.amount_off,
                created: promotionCode.coupon.created,
                currency: promotionCode.coupon.currency,
                duration: promotionCode.coupon.duration,
                duration_in_months: promotionCode.coupon.duration_in_months,
                livemode: promotionCode.coupon.livemode,
                max_redemptions: promotionCode.coupon.max_redemptions,
                metadata: promotionCode.coupon.metadata,
                name: promotionCode.coupon.name,
                percent_off: promotionCode.coupon.percent_off,
                redeem_by: promotionCode.coupon.redeem_by,
                times_redeemed: promotionCode.coupon.times_redeemed,
                valid: promotionCode.coupon.valid,
              },
        created: promotionCode.created,
        customer: promotionCode.customer,
        expires_at: promotionCode.expires_at,
        livemode: promotionCode.livemode,
        max_redemptions: promotionCode.max_redemptions,
        metadata: promotionCode.metadata,
        restrictions: promotionCode.restrictions,
        times_redeemed: promotionCode.times_redeemed,
      })
    );

    return {
      promotionCodes: serializedPromotionCodes,
    };
  } catch (error) {
    console.error("Error listing promotion codes:", error);
    return {
      promotionCodes: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to list promotion codes",
    };
  }
}

/**
 * List all coupons with optional filters
 * @param options Filter options
 */
export async function listCoupons(options?: {
  limit?: number;
}): Promise<{ coupons: any[]; error?: string }> {
  try {
    const listParams: Stripe.CouponListParams = {
      limit: options?.limit || 100,
    };

    const coupons = await stripe.coupons.list(listParams);

    // Serialize the coupons to plain objects
    const serializedCoupons = coupons.data.map((coupon) => ({
      id: coupon.id,
      object: coupon.object,
      amount_off: coupon.amount_off,
      created: coupon.created,
      currency: coupon.currency,
      duration: coupon.duration,
      duration_in_months: coupon.duration_in_months,
      livemode: coupon.livemode,
      max_redemptions: coupon.max_redemptions,
      metadata: coupon.metadata,
      name: coupon.name,
      percent_off: coupon.percent_off,
      redeem_by: coupon.redeem_by,
      times_redeemed: coupon.times_redeemed,
      valid: coupon.valid,
    }));

    return {
      coupons: serializedCoupons,
    };
  } catch (error) {
    console.error("Error listing coupons:", error);
    return {
      coupons: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to list coupons",
    };
  }
}

/**
 * Deactivate a promotion code
 * @param promotionCodeId The promotion code ID to deactivate
 */
export async function deactivatePromotionCode(
  promotionCodeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await stripe.promotionCodes.update(promotionCodeId, {
      active: false,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deactivating promotion code:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to deactivate promotion code",
    };
  }
}

/**
 * Cancel a subscription immediately (admin function)
 * @param subscriptionId The subscription ID to cancel
 * @param reason Optional reason for cancellation
 */
export async function cancelSubscriptionAdmin(
  subscriptionId: string,
  reason?: string
): Promise<{ success: boolean; subscription?: any; error?: string }> {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId, {
      invoice_now: false,
      prorate: false,
    });

    // Serialize the subscription object
    const serializedSubscription = {
      id: subscription.id,
      object: subscription.object,
      cancel_at: subscription.cancel_at,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
      created: subscription.created,
      current_period_end: subscription.current_period_end,
      current_period_start: subscription.current_period_start,
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : {
              id: subscription.customer.id,
              email:
                "email" in subscription.customer
                  ? subscription.customer.email
                  : null,
            },
      status: subscription.status,
      metadata: subscription.metadata,
    };

    return {
      success: true,
      subscription: serializedSubscription,
    };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription",
    };
  }
}

/**
 * Reactivate a canceled subscription (admin function)
 * @param subscriptionId The subscription ID to reactivate
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<{ success: boolean; subscription?: any; error?: string }> {
  try {
    // Update the subscription to remove the cancellation
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // Serialize the subscription object
    const serializedSubscription = {
      id: subscription.id,
      object: subscription.object,
      cancel_at: subscription.cancel_at,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
      created: subscription.created,
      current_period_end: subscription.current_period_end,
      current_period_start: subscription.current_period_start,
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : {
              id: subscription.customer.id,
              email:
                "email" in subscription.customer
                  ? subscription.customer.email
                  : null,
            },
      status: subscription.status,
      metadata: subscription.metadata,
    };

    return {
      success: true,
      subscription: serializedSubscription,
    };
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to reactivate subscription",
    };
  }
}

/**
 * Change subscription plan (admin function)
 * @param subscriptionId The subscription ID to modify
 * @param newPriceId The new price ID to change to
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<{ success: boolean; subscription?: any; error?: string }> {
  try {
    // Get the current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(
      subscriptionId
    );

    if (!currentSubscription.items.data.length) {
      return {
        success: false,
        error: "No subscription items found",
      };
    }

    // Update the subscription with the new price
    // Preserve the current billing cycle end date by anchoring billing to the end of current period
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: "none", // No prorations - just change the plan
      billing_cycle_anchor: "now", // Keep the current billing cycle end date
    });

    // Serialize the subscription object
    const serializedSubscription = {
      id: subscription.id,
      object: subscription.object,
      cancel_at: subscription.cancel_at,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
      created: subscription.created,
      current_period_end: subscription.current_period_end,
      current_period_start: subscription.current_period_start,
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : {
              id: subscription.customer.id,
              email:
                "email" in subscription.customer
                  ? subscription.customer.email
                  : null,
            },
      status: subscription.status,
      metadata: subscription.metadata,
      items: subscription.items.data.map((item) => ({
        id: item.id,
        price: {
          id: item.price.id,
          unit_amount: item.price.unit_amount,
          currency: item.price.currency,
          recurring: item.price.recurring,
        },
        quantity: item.quantity,
      })),
    };

    return {
      success: true,
      subscription: serializedSubscription,
    };
  } catch (error) {
    console.error("Error changing subscription plan:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to change subscription plan",
    };
  }
}

/**
 * Get subscription details (admin function)
 * @param subscriptionId The subscription ID to retrieve
 */
export async function getSubscriptionDetails(
  subscriptionId: string
): Promise<{ success: boolean; subscription?: any; error?: string }> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price", "customer"],
    });

    // Serialize the subscription object
    const serializedSubscription = {
      id: subscription.id,
      object: subscription.object,
      cancel_at: subscription.cancel_at,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
      created: subscription.created,
      current_period_end: subscription.current_period_end,
      current_period_start: subscription.current_period_start,
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : {
              id: subscription.customer.id,
              email:
                "email" in subscription.customer
                  ? subscription.customer.email
                  : null,
            },
      status: subscription.status,
      metadata: subscription.metadata,
      items: subscription.items.data.map((item) => ({
        id: item.id,
        price: {
          id: item.price.id,
          unit_amount: item.price.unit_amount,
          currency: item.price.currency,
          recurring: item.price.recurring,
          nickname: item.price.nickname,
        },
        quantity: item.quantity,
      })),
      trial_end: subscription.trial_end,
      trial_start: subscription.trial_start,
    };

    return {
      success: true,
      subscription: serializedSubscription,
    };
  } catch (error) {
    console.error("Error getting subscription details:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get subscription details",
    };
  }
}

/**
 * List all subscriptions for a customer (admin function)
 * @param customerId The customer ID
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<{ success: boolean; subscriptions?: any[]; error?: string }> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all", // Include all subscriptions including cancelled ones
      expand: ["data.items.data.price"],
    });

    // Serialize the subscriptions
    const serializedSubscriptions = subscriptions.data.map((subscription) => ({
      id: subscription.id,
      object: subscription.object,
      cancel_at: subscription.cancel_at,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
      created: subscription.created,
      current_period_end: subscription.current_period_end,
      current_period_start: subscription.current_period_start,
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : {
              id: subscription.customer.id,
              email:
                "email" in subscription.customer
                  ? subscription.customer.email
                  : null,
            },
      status: subscription.status,
      metadata: subscription.metadata,
      items: subscription.items.data.map((item) => ({
        id: item.id,
        price: {
          id: item.price.id,
          unit_amount: item.price.unit_amount,
          currency: item.price.currency,
          recurring: item.price.recurring,
          nickname: item.price.nickname,
        },
        quantity: item.quantity,
      })),
      trial_end: subscription.trial_end,
      trial_start: subscription.trial_start,
    }));

    return {
      success: true,
      subscriptions: serializedSubscriptions,
    };
  } catch (error) {
    console.error("Error getting customer subscriptions:", error);
    return {
      success: false,
      subscriptions: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to get customer subscriptions",
    };
  }
}
