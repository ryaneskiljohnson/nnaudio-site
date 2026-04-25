"use server";

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { stripe, type Stripe } from "@/utils/stripe/client";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  quantity: number;
  product_image?: string | null;
  product_slug?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  amount: number;
  currency: string;
  items: OrderItem[];
  metadata: {
    original_total?: string;
    discount_amount?: string;
    total_amount?: string;
    promotion_code?: string;
    grant_id?: string;
    grant_type?: string;
    redemption_code?: string;
    reseller_name?: string;
    notes?: string | null;
    bundle_slug?: string;
    tier?: string;
  };
  receiptUrl: string | null;
  invoiceId: string | null;
  refundedAmount: number;
  isRefunded: boolean;
  isPartiallyRefunded: boolean;
  refunds: Array<{
    id: string;
    amount: number;
    reason: string | null;
    status: string;
    created: number;
  }>;
}

export async function getOrders(): Promise<{
  success: boolean;
  orders: Order[];
  productGrants: Order[];
  productRedemptions: Order[];
  error?: string;
  debug?: {
    totalOrders: number;
    grantOrders: number;
    redemptionOrders: number;
    regularOrders: number;
    grantedProductsCount: number;
  };
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        orders: [],
        productGrants: [],
        productRedemptions: [],
        error: "Not authenticated",
      };
    }

    // Get user's profile to find customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        orders: [],
        productGrants: [],
        productRedemptions: [],
        error: "Failed to fetch profile",
      };
    }

    let paymentIntents: Stripe.PaymentIntent[] = [];
    const allPaymentIntents = new Map<string, Stripe.PaymentIntent>();

    // Method 1: Try to fetch by customer_id from profile
    if (profile?.customer_id) {
      try {
        const customerPayments = await stripe.paymentIntents.list({
          customer: profile.customer_id,
          limit: 100,
        });
        customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
      } catch (error) {
        console.error("[Orders] Error fetching by customer_id:", error);
      }
    }

    // Method 2: Search by user_id in metadata
    try {
      const searchResult = await stripe.paymentIntents.search({
        query: `metadata['user_id']:'${user.id}'`,
        limit: 100,
      });
      searchResult.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
    } catch (error) {
      console.log("[Orders] Search API not available");
    }

    // Method 3: If we have an email, find customers by email and get their payment intents
    if (profile?.email) {
      try {
        const customers = await stripe.customers.list({
          email: profile.email,
          limit: 10,
        });
        
        for (const customer of customers.data) {
          try {
            const customerPayments = await stripe.paymentIntents.list({
              customer: customer.id,
              limit: 100,
            });
            customerPayments.data.forEach(pi => allPaymentIntents.set(pi.id, pi));
          } catch (error) {
            console.error("[Orders] Error fetching payment intents for customer:", error);
          }
        }
      } catch (error) {
        console.error("[Orders] Error searching customers by email:", error);
      }
    }

    // Include paid subscription invoices: payment intents may not always appear in paymentIntents.list
    if (profile?.customer_id) {
      try {
        const paidInvoices = await stripe.invoices.list({
          customer: profile.customer_id,
          status: "paid",
          limit: 100,
          expand: ["data.payments"],
        });
        for (const inv of paidInvoices.data) {
          if (!inv.parent?.subscription_details?.subscription) continue;
          const payments = inv.payments?.data ?? [];
          for (const invoicePayment of payments) {
            const paymentRef = invoicePayment.payment?.payment_intent;
            const piId =
              typeof paymentRef === "string" ? paymentRef : paymentRef?.id;
            if (piId && !allPaymentIntents.has(piId)) {
              try {
                const pi = await stripe.paymentIntents.retrieve(piId);
                if (pi.status === "succeeded")
                  allPaymentIntents.set(pi.id, pi);
              } catch {
                // ignore
              }
            }
          }
        }
      } catch (error) {
        console.error("[Orders] Error fetching paid invoices:", error);
      }
    }

    paymentIntents = Array.from(allPaymentIntents.values());

    // Filter to only successful payment intents (completed orders)
    const successfulPayments = paymentIntents.filter(
      (pi) => pi.status === "succeeded"
    );

    // Get product grants to show as orders (with recorded amount for historical record)
    let grantedProducts: Array<{
      id: string;
      product_id: string;
      granted_at: string;
      notes: string | null;
      amount?: number;
    }> = [];
    
    {
      const adminSupabase = await createSupabaseServiceRole();
      const { data: grants, error: grantsError } = await (adminSupabase as any)
        .from("product_grants")
        .select("id, product_id, granted_at, notes, amount")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: false });

      if (grantsError) {
        console.error("[Orders] Error fetching product grants:", grantsError);
      }

      if (grants) {
        grantedProducts = grants as typeof grantedProducts;
      }
    }

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

        // Fetch product details from Supabase for each item
        if (items.length > 0) {
          const productIds = items.map(item => item.id).filter(Boolean);
          if (productIds.length > 0) {
            try {
              const adminSupabase = await createSupabaseServiceRole();
              const { data: products, error: productsError } = await (adminSupabase as any)
                .from("products")
                .select("id, name, slug, featured_image_url")
                .in("id", productIds);

              if (!productsError && products) {
                const productMap = new Map((products as { id: string; featured_image_url?: string | null; slug?: string | null }[]).map(p => [p.id, p]));
                items = items.map(item => ({
                  ...item,
                  product_image: productMap.get(item.id)?.featured_image_url || null,
                  product_slug: productMap.get(item.id)?.slug || null,
                }));
              }
            } catch (error) {
              console.error("Error fetching product details:", error);
            }
          }
        }

        // Subscription/bundle orders: build items from invoice or PI metadata when cart_items is empty
        // PaymentIntent may include invoice (for invoice-backed PIs); not in current Stripe SDK types
        const piInvoiceRef = (pi as Stripe.PaymentIntent & { invoice?: string | Stripe.Invoice }).invoice;
        if (items.length === 0 && (piInvoiceRef || pi.metadata?.bundle_slug || pi.metadata?.checkout_type === "bundle")) {
          try {
            if (piInvoiceRef) {
              const invoiceId = typeof piInvoiceRef === "string" ? piInvoiceRef : piInvoiceRef.id;
              const invoice = await stripe.invoices.retrieve(invoiceId, {
                expand: ["parent.subscription_details.subscription"],
              });
              const sub = (invoice.parent?.subscription_details?.subscription ?? null) as Stripe.Subscription | null;
              const bundleSlug = (typeof sub?.metadata?.bundle_slug === "string" && sub.metadata.bundle_slug)
                ? sub.metadata.bundle_slug
                : (pi.metadata?.bundle_slug as string | undefined);
              const tier = (typeof sub?.metadata?.tier === "string" && sub.metadata.tier)
                ? sub.metadata.tier
                : (pi.metadata?.tier as string | undefined);
              const bundleName =
                (bundleSlug && bundleSlug.length > 0)
                  ? bundleSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : null;
              const lineLabel =
                bundleName && tier
                  ? `${bundleName} (${tier})`
                  : invoice.lines?.data?.[0]?.description ?? "Subscription";
              const amount = (invoice.amount_paid ?? pi.amount) / 100;
              items = [
                {
                  id: sub && typeof sub === "object" ? sub.id : pi.id,
                  name: lineLabel,
                  price: amount,
                  quantity: 1,
                  product_image: null,
                  product_slug: bundleSlug ?? null,
                },
              ];
            } else if (pi.metadata?.bundle_slug) {
              const bundleSlug = pi.metadata.bundle_slug as string;
              const tier = (pi.metadata.tier as string) ?? "";
              const bundleName = bundleSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              items = [
                {
                  id: pi.id,
                  name: tier ? `${bundleName} (${tier})` : bundleName,
                  price: pi.amount / 100,
                  quantity: 1,
                  product_image: null,
                  product_slug: bundleSlug,
                },
              ];
            }
          } catch (err) {
            console.error("Error building subscription/bundle order items:", err);
          }
        }

        // Get promotion code name if available
        let promotionCodeName: string | null = null;
        if (pi.metadata?.promotion_code) {
          try {
            const promoCodeId = pi.metadata.promotion_code;
            if (promoCodeId.startsWith('promo_')) {
              const promoCode = await stripe.promotionCodes.retrieve(promoCodeId);
              promotionCodeName = promoCode.code || promoCodeId;
            } else {
              promotionCodeName = promoCodeId;
            }
          } catch (error) {
            promotionCodeName = pi.metadata.promotion_code;
          }
        }

        // Get charge details if available
        let receiptUrl: string | null = null;
        let invoiceId: string | null = null;
        let refundedAmount = 0;
        let isRefunded = false;
        let isPartiallyRefunded = false;
        let refunds: Array<{
          id: string;
          amount: number;
          reason: string | null;
          status: string;
          created: number;
        }> = [];
        
        if (pi.latest_charge) {
          try {
            const charge = await stripe.charges.retrieve(
              typeof pi.latest_charge === "string"
                ? pi.latest_charge
                : pi.latest_charge.id,
              { expand: ['refunds'] }
            );
            receiptUrl = charge.receipt_url;
            
            if (charge.refunded) {
              isRefunded = true;
              refundedAmount = charge.amount_refunded / 100;
            } else if (charge.amount_refunded > 0) {
              isPartiallyRefunded = true;
              refundedAmount = charge.amount_refunded / 100;
            }

            if (charge.refunds && charge.refunds.data) {
              refunds = charge.refunds.data.map((refund) => ({
                id: refund.id,
                amount: refund.amount / 100,
                reason: refund.reason,
                status: refund.status ?? '',
                created: refund.created,
              }));
            } else if (charge.amount_refunded > 0) {
              try {
                const refundsList = await stripe.refunds.list({
                  charge: charge.id,
                  limit: 100,
                });
                refunds = refundsList.data.map((refund) => ({
                  id: refund.id,
                  amount: refund.amount / 100,
                  reason: refund.reason,
                  status: refund.status ?? '',
                  created: refund.created,
                }));
              } catch (error) {
                console.error("Error fetching refunds:", error);
              }
            }
          } catch (error) {
            console.error("Error fetching charge:", error);
          }
        }

        // Try to get invoice if available
        if (piInvoiceRef) {
          try {
            const invoiceIdForReceipt = typeof piInvoiceRef === "string" ? piInvoiceRef : piInvoiceRef.id;
            const invoice = await stripe.invoices.retrieve(invoiceIdForReceipt);
            invoiceId = invoice.id;
            if (!receiptUrl && invoice.hosted_invoice_url) {
              receiptUrl = invoice.hosted_invoice_url;
            }
          } catch (error) {
            console.error("Error fetching invoice:", error);
          }
        }

        return {
          id: pi.id,
          orderNumber: pi.id.substring(3, 11).toUpperCase(),
          date: new Date(pi.created * 1000).toISOString(),
          status: pi.status,
          amount: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
          items,
          metadata: {
            original_total: pi.metadata?.original_total,
            discount_amount: pi.metadata?.discount_amount,
            total_amount: pi.metadata?.total_amount,
            promotion_code: promotionCodeName || pi.metadata?.promotion_code,
            bundle_slug: pi.metadata?.bundle_slug,
            tier: pi.metadata?.tier,
          },
          receiptUrl,
          invoiceId,
          refundedAmount,
          isRefunded,
          isPartiallyRefunded,
          refunds,
        } as Order;
      })
    );

    // Add product grants and redemptions as $0 orders
    if (grantedProducts.length > 0) {
      const grantProductIds = grantedProducts.map(g => g.product_id);
      const adminSupabase = await createSupabaseServiceRole();
      const { data: grantProducts } = await (adminSupabase as any)
        .from("products")
        .select("id, name, slug, featured_image_url")
        .in("id", grantProductIds)
        .eq("status", "active");

      if (grantProducts) {
        const productMap = new Map((grantProducts as { id: string; name: string; slug?: string | null; featured_image_url?: string | null }[]).map(p => [p.id, p]));
        
        // Collect redemption serial codes to look up reseller info
        const redemptionCodes: string[] = [];
        const redemptionGrants: Array<{ grant: any; serialCode: string }> = [];
        
        for (const grant of grantedProducts) {
          const isRedemption = grant.notes && grant.notes.includes("Redeemed via reseller code:");
          if (isRedemption) {
            const serialCodeMatch = grant.notes?.match(/Redeemed via reseller code: ([^\s]+)/);
            const serialCode = serialCodeMatch ? serialCodeMatch[1] : null;
            if (serialCode) {
              redemptionCodes.push(serialCode);
              redemptionGrants.push({ grant, serialCode });
            }
          }
        }
        
        // Fetch reseller information for redemptions
        const resellerMap = new Map<string, string>();
        if (redemptionCodes.length > 0) {
          const { data: resellerCodes } = await (adminSupabase as any)
            .from("reseller_codes")
            .select(`
              serial_code,
              resellers:reseller_id (
                name
              )
            `)
            .in("serial_code", redemptionCodes);
          
          if (resellerCodes) {
            (resellerCodes as { serial_code: string; resellers: { name?: string } | null }[]).forEach((code) => {
              const resellerName = code.resellers?.name ?? null;
              if (resellerName) {
                resellerMap.set(code.serial_code, resellerName);
              }
            });
          }
        }

        // Group grants by (user_email, minute) so batches created together appear as one order
        const MINUTE_MS = 60 * 1000;
        const grantGroups = new Map<
          string,
          Array<{
            grant: typeof grantedProducts[0];
            product: { id: string; name: string; slug?: string | null; featured_image_url?: string | null };
            isRedemption: boolean;
            serialCode: string;
            resellerName: string | null;
            recordedAmount: number;
          }>
        >();

        for (const grant of grantedProducts) {
          const product = productMap.get(grant.product_id);
          if (!product) continue;

          const isRedemption = !!(grant.notes && grant.notes.includes("Redeemed via reseller code:"));
          const serialCodeMatch = grant.notes?.match(/Redeemed via reseller code: ([^\s]+)/);
          const resellerMatch = grant.notes?.match(/from (.+)$/);
          const serialCode = serialCodeMatch ? serialCodeMatch[1] : "Unknown";
          const resellerName = resellerMatch ? resellerMatch[1] : (resellerMap.get(serialCode) || null);
          const recordedAmount = Number(grant.amount) || 0;

          const minuteBucket = Math.floor(new Date(grant.granted_at).getTime() / MINUTE_MS);
          const groupKey = `${(profile?.email ?? "").toLowerCase()}|${minuteBucket}`;

          if (!grantGroups.has(groupKey)) {
            grantGroups.set(groupKey, []);
          }
          grantGroups.get(groupKey)!.push({
            grant,
            product,
            isRedemption,
            serialCode,
            resellerName,
            recordedAmount,
          });
        }

        for (const [, group] of grantGroups) {
          const first = group[0];
          const totalAmount = group.reduce((sum, g) => sum + g.recordedAmount, 0);
          const items = group.map((g) => ({
            id: g.product.id,
            name: g.product.name,
            quantity: 1,
            price: g.recordedAmount,
            product_image: g.product.featured_image_url || null,
            product_slug: g.product.slug || null,
          }));
          const grantIds = group.map((g) => g.grant.id);
          const allRedemptions = group.every((g) => g.isRedemption);
          const notesNorm = first.grant.notes?.trim().toLowerCase() ?? "";
          const isFreeProductCheckout =
            !allRedemptions && notesNorm === "free checkout";

          orders.push({
            id: group.length > 1 ? `batch_${first.grant.id}` : (allRedemptions ? `redemption_${first.grant.id}` : `grant_${first.grant.id}`),
            orderNumber: allRedemptions ? `REDEEM-${first.grant.id.substring(0, 8).toUpperCase()}` : `GRANT-${first.grant.id.substring(0, 8).toUpperCase()}`,
            date: first.grant.granted_at,
            status: "succeeded",
            amount: totalAmount,
            currency: "USD",
            items,
            metadata: {
              grant_id: grantIds.length === 1 ? grantIds[0] : undefined,
              grant_ids: grantIds.length > 1 ? grantIds : undefined,
              grant_type: allRedemptions
                ? "redemption"
                : isFreeProductCheckout
                  ? "free_checkout"
                  : "free_license",
              redemption_code: allRedemptions ? first.serialCode : undefined,
              reseller_name: allRedemptions ? first.resellerName : undefined,
              notes: first.grant.notes,
            },
            receiptUrl: null,
            invoiceId: null,
            refundedAmount: 0,
            isRefunded: false,
            isPartiallyRefunded: false,
            refunds: [],
          } as Order);
        }
      }
    }

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Separate regular orders, product grants, and product redemptions
    const regularOrders: Order[] = [];
    const productGrants: Order[] = [];
    const productRedemptions: Order[] = [];
    
    orders.forEach((order) => {
      if (order.metadata?.grant_type === "redemption") {
        productRedemptions.push(order);
      } else if (order.metadata?.grant_type === "free_checkout") {
        regularOrders.push(order);
      } else if (order.metadata?.grant_type === "free_license") {
        productGrants.push(order);
      } else {
        regularOrders.push(order);
      }
    });

    return {
      success: true,
      orders: regularOrders,
      productGrants,
      productRedemptions,
      debug: {
        totalOrders: orders.length,
        grantOrders: productGrants.length,
        redemptionOrders: productRedemptions.length,
        regularOrders: regularOrders.length,
        grantedProductsCount: grantedProducts.length,
      },
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      success: false,
      orders: [],
      productGrants: [],
      productRedemptions: [],
      error: error instanceof Error ? error.message : "Failed to fetch orders",
    };
  }
}

