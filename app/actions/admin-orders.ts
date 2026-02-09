/**
 * @fileoverview Admin orders server actions
 * @module actions/admin-orders
 *
 * Server functions for fetching all orders (Stripe purchases, product grants,
 * redemptions) for the admin console.
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

/**
 * @brief Admin order item
 */
export interface AdminOrderItem {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  quantity: number;
  product_image?: string | null;
  product_slug?: string | null;
}

/**
 * @brief Admin order (unified format for purchases, grants, redemptions)
 */
export interface AdminOrder {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  amount: number;
  currency: string;
  items: AdminOrderItem[];
  metadata: {
    original_total?: string;
    discount_amount?: string;
    total_amount?: string;
    promotion_code?: string;
    grant_id?: string;
    grant_ids?: string[];
    grant_type?: string;
    redemption_code?: string;
    reseller_name?: string;
    notes?: string | null;
  };
  customerEmail?: string | null;
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
  orderType?: "purchase" | "grant" | "redemption";
}

/**
 * @brief Fetch paginated grant/redemption orders via direct DB RPC (100k+ scale)
 * @param page 1-based page number
 * @param limit Page size (max 100)
 * @param search Search by email, order #, or product name
 * @param filter 'all' | 'grant' | 'redemption'
 */
export async function getAdminGrantOrdersPaginated(
  page = 1,
  limit = 50,
  search = "",
  filter: "all" | "grant" | "redemption" = "all"
): Promise<{
  success: boolean;
  orders: AdminOrder[];
  totalCount: number;
  page: number;
  limit: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, orders: [], totalCount: 0, page: 1, limit: 50, error: "Unauthorized" };
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (!adminData) {
      return { success: false, orders: [], totalCount: 0, page: 1, limit: 50, error: "Forbidden" };
    }

    const adminSupabase = await createSupabaseServiceRole();
    const { data, error } = await (adminSupabase as any).rpc(
      "get_admin_grant_orders_paginated",
      {
        p_page: page,
        p_limit: limit,
        p_search: search || null,
        p_filter: filter,
      }
    );

    if (error) {
      console.error("[Admin Grant Orders] RPC error:", error);
      return { success: false, orders: [], totalCount: 0, page, limit, error: error.message };
    }

    // Handle RPC response: may be unwrapped {orders, total_count} or wrapped by function name
    let result = data as Record<string, unknown>;
    if (
      result &&
      typeof result === "object" &&
      !Array.isArray((result as any).orders) &&
      (result as any).get_admin_grant_orders_paginated
    ) {
      result = (result as any).get_admin_grant_orders_paginated as Record<string, unknown>;
    }
    if (Array.isArray(result)) {
      const first = result[0];
      result =
        (first && typeof first === "object" && (first as any).get_admin_grant_orders_paginated) ||
        (first as Record<string, unknown>) ||
        {};
    }
    const orders = Array.isArray(result?.orders) ? (result.orders as AdminOrder[]) : [];
    const totalCount = Number(result?.total_count) ?? 0;

    return {
      success: true,
      orders,
      totalCount,
      page: (typeof result?.page === "number" ? result.page : page) as number,
      limit: (typeof result?.limit === "number" ? result.limit : limit) as number,
    };
  } catch (error: any) {
    console.error("[Admin Grant Orders] Error:", error);
    return {
      success: false,
      orders: [],
      totalCount: 0,
      page: 1,
      limit: 50,
      error: error.message || "Failed to fetch grant orders",
    };
  }
}

/**
 * @brief Fetch Stripe purchases only (for Purchases tab)
 * @param limit Max payment intents to fetch (default 50 for performance)
 */
export async function getAdminStripeOrders(limit = 50): Promise<{
  success: boolean;
  orders: AdminOrder[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, orders: [], error: "Unauthorized" };
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (!adminData) {
      return { success: false, orders: [], error: "Forbidden" };
    }

    const effectiveLimit = Math.min(Math.max(limit, 1), 100);
    const adminSupabase = await createSupabaseServiceRole();

    // Single Stripe call with expand - gets customer, charge, refunds in one request (no N+1)
    const allPaymentIntents: Stripe.PaymentIntent[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;
    let useExpand = true;

    while (hasMore) {
      let response: Stripe.ApiList<Stripe.PaymentIntent>;
      try {
        response = await stripe.paymentIntents.list({
          limit: 100,
          ...(startingAfter && { starting_after: startingAfter }),
          ...(useExpand && {
            expand: ["data.customer", "data.latest_charge", "data.latest_charge.refunds"],
          }),
        });
      } catch (err) {
        if (useExpand) {
          useExpand = false;
          startingAfter = undefined;
          hasMore = true;
          allPaymentIntents.length = 0;
          continue;
        }
        throw err;
      }
      const succeeded = response.data.filter((pi) => pi.status === "succeeded");
      allPaymentIntents.push(...succeeded);
      hasMore =
        response.has_more && allPaymentIntents.length < effectiveLimit;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      } else {
        hasMore = false;
      }
      if (allPaymentIntents.length >= effectiveLimit) break;
    }

    const paymentIntentsToProcess = allPaymentIntents.slice(0, effectiveLimit);

    // Batch: all product IDs from all payment intents -> single Supabase query
    const allProductIds = new Set<string>();
    for (const pi of paymentIntentsToProcess) {
      try {
        const cartItemsStr = pi.metadata?.cart_items;
        if (cartItemsStr) {
          const items = JSON.parse(cartItemsStr) as { id?: string }[];
          items.forEach((item: { id?: string }) => {
            if (item?.id) allProductIds.add(item.id);
          });
        }
      } catch {
        /* ignore */
      }
    }
    const productMap = new Map<string, { featured_image_url?: string | null; slug?: string | null }>();
    if (allProductIds.size > 0) {
      const { data: products } = await (adminSupabase as any)
        .from("products")
        .select("id, featured_image_url, slug")
        .in("id", [...allProductIds]);
      if (products) {
        (products as { id: string; featured_image_url?: string | null; slug?: string | null }[]).forEach((p) => {
          productMap.set(p.id, { featured_image_url: p.featured_image_url, slug: p.slug });
        });
      }
    }

    // Batch: unique promo code IDs -> single parallel fetch
    const promoIds = [
      ...new Set(
        paymentIntentsToProcess
          .map((pi) => pi.metadata?.promotion_code)
          .filter((id): id is string => !!id && id.startsWith("promo_"))
      ),
    ];
    const promoCodeMap = new Map<string, string>();
    await Promise.all(
      promoIds.map(async (id) => {
        try {
          const promo = await stripe.promotionCodes.retrieve(id);
          promoCodeMap.set(id, promo.code || id);
        } catch {
          promoCodeMap.set(id, id);
        }
      })
    );

    // Batch: user_id -> email from profiles (for metadata fallback)
    const userIds = [
      ...new Set(
        paymentIntentsToProcess
          .map((pi) => pi.metadata?.user_id)
          .filter((id): id is string => !!id && id !== "anonymous")
      ),
    ];
    const userIdToEmailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await (adminSupabase as any)
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      if (profiles) {
        (profiles as { id: string; email?: string }[]).forEach((p) => {
          if (p.email) userIdToEmailMap.set(p.id, p.email);
        });
      }
    }

    const stripeOrders = paymentIntentsToProcess.map((pi) => {
      const customer = pi.customer as Stripe.Customer | string | null;
      const customerEmail =
        (customer && typeof customer === "object" && !customer.deleted && "email" in customer && customer.email) ||
        (pi.metadata?.user_id && userIdToEmailMap.get(pi.metadata.user_id)) ||
        null;

      let items: AdminOrderItem[] = [];
      try {
        const cartItemsStr = pi.metadata?.cart_items;
        if (cartItemsStr) {
          items = JSON.parse(cartItemsStr);
        }
      } catch {
        /* ignore */
      }
      if (items.length === 0) {
        const source =
          pi.metadata?.Reseller ? `Reseller: ${pi.metadata.Reseller}` :
          pi.metadata?.purchase_type === "lifetime" ? "Lifetime subscription" :
          pi.metadata?.POnumber ? "Reseller order" :
          "Stripe payment";
        items = [{
          id: pi.id,
          name: source,
          price: pi.amount / 100,
          quantity: 1,
          product_image: null,
          product_slug: null,
        }];
      }
      items = items.map((item: any) => ({
        ...item,
        product_image: productMap.get(item.id)?.featured_image_url ?? item.product_image ?? null,
        product_slug: productMap.get(item.id)?.slug ?? item.product_slug ?? null,
      }));

      const promoId = pi.metadata?.promotion_code;
      const promotionCodeName =
        (promoId && promoCodeMap.get(promoId)) || promoId || null;

      const charge = pi.latest_charge as Stripe.Charge | string | null;
      let receiptUrl: string | null = null;
      let refundedAmount = 0;
      let isRefunded = false;
      let isPartiallyRefunded = false;
      let refunds: AdminOrder["refunds"] = [];
      if (charge && typeof charge === "object") {
        receiptUrl = charge.receipt_url ?? null;
        if (charge.refunded) {
          isRefunded = true;
          refundedAmount = charge.amount_refunded / 100;
        } else if (charge.amount_refunded > 0) {
          isPartiallyRefunded = true;
          refundedAmount = charge.amount_refunded / 100;
        }
        if (charge.refunds?.data) {
          refunds = charge.refunds.data.map((r) => ({
            id: r.id,
            amount: r.amount / 100,
            reason: r.reason,
            status: r.status ?? "",
            created: r.created,
          }));
        }
      }

      return {
        id: pi.id,
        orderNumber: pi.id.substring(3, 11).toUpperCase(),
        date: new Date(pi.created * 1000).toISOString(),
        status: pi.status,
        amount: pi.amount / 100,
        currency: (pi.currency || "usd").toUpperCase(),
        items,
        metadata: {
          original_total: pi.metadata?.original_total,
          discount_amount: pi.metadata?.discount_amount,
          total_amount: pi.metadata?.total_amount,
          promotion_code: promotionCodeName ?? pi.metadata?.promotion_code ?? undefined,
          reseller_name: (pi.metadata?.Reseller as string) ?? undefined,
        },
        customerEmail,
        receiptUrl,
        invoiceId: null,
        refundedAmount,
        isRefunded,
        isPartiallyRefunded,
        refunds,
        orderType: "purchase" as const,
      };
    });

    return { success: true, orders: stripeOrders };
  } catch (error: any) {
    console.error("[Admin Stripe Orders] Error:", error);
    return { success: false, orders: [], error: error.message || "Failed to fetch orders" };
  }
}

/**
 * @brief Fetch all orders for admin (Stripe + grants) - legacy, loads all grants into memory
 * @deprecated Use getAdminStripeOrders + getAdminGrantOrdersPaginated for 100k+ scale
 */
export async function getAdminOrders(limit = 200): Promise<{
  success: boolean;
  orders: AdminOrder[];
  error?: string;
  debug?: {
    stripeOrders: number;
    grantOrders: number;
    redemptionOrders: number;
  };
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, orders: [], error: "Unauthorized" };
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("user", user.id)
      .single();

    if (!adminData) {
      return { success: false, orders: [], error: "Forbidden" };
    }

    const effectiveLimit = Math.min(Math.max(limit, 1), 500);
    const adminSupabase = await createSupabaseServiceRole();

    // 1. Fetch ALL successful payment intents from Stripe (paginated)
    const allPaymentIntents: Stripe.PaymentIntent[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.paymentIntents.list({
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      });

      const succeeded = response.data.filter((pi) => pi.status === "succeeded");
      allPaymentIntents.push(...succeeded);

      hasMore = response.has_more && allPaymentIntents.length < effectiveLimit;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      } else {
        hasMore = false;
      }

      if (allPaymentIntents.length >= effectiveLimit) break;
    }

    const paymentIntentsToProcess = allPaymentIntents.slice(0, effectiveLimit);

    // 2. Fetch customer emails for payment intents (batch)
    const customerIds = [
      ...new Set(
        paymentIntentsToProcess
          .map((pi) =>
            typeof pi.customer === "string" ? pi.customer : pi.customer?.id
          )
          .filter(Boolean) as string[]
      ),
    ];

    const customerEmailMap = new Map<string, string>();
    for (const cid of customerIds) {
      try {
        const customer = await stripe.customers.retrieve(cid);
        if (!customer.deleted && "email" in customer && customer.email) {
          customerEmailMap.set(cid, customer.email);
        }
      } catch {
        // Skip if customer not found
      }
    }

    // 3. Get user emails from user_id metadata
    const userIds = [
      ...new Set(
        paymentIntentsToProcess
          .map((pi) => pi.metadata?.user_id)
          .filter((id): id is string => !!id && id !== "anonymous")
      ),
    ];

    const userIdToEmailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await (adminSupabase as any)
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      if (profiles) {
        (profiles as { id: string; email?: string }[]).forEach((p) => {
          if (p.email) userIdToEmailMap.set(p.id, p.email);
        });
      }
    }

    // 4. Transform payment intents to orders
    const stripeOrders = await Promise.all(
      paymentIntentsToProcess.map(async (pi) => {
        const customerId =
          typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
        const customerEmail =
          (customerId && customerEmailMap.get(customerId)) ||
          (pi.metadata?.user_id && userIdToEmailMap.get(pi.metadata.user_id)) ||
          null;

        let items: AdminOrderItem[] = [];
        try {
          const cartItemsStr = pi.metadata?.cart_items;
          if (cartItemsStr) {
            items = JSON.parse(cartItemsStr);
          }
        } catch {
          // ignore
        }

        if (items.length > 0) {
          const productIds = items.map((item: any) => item.id).filter(Boolean);
          if (productIds.length > 0) {
            const { data: products } = await (adminSupabase as any)
              .from("products")
              .select("id, name, slug, featured_image_url")
              .in("id", productIds);

            if (products) {
              const productMap = new Map(
                (
                  products as {
                    id: string;
                    featured_image_url?: string | null;
                    slug?: string | null;
                  }[]
                ).map((p) => [p.id, p])
              );
              items = items.map((item: any) => ({
                ...item,
                product_image:
                  productMap.get(item.id)?.featured_image_url || null,
                product_slug: productMap.get(item.id)?.slug || null,
              }));
            }
          }
        }

        let promotionCodeName: string | null = null;
        if (pi.metadata?.promotion_code) {
          try {
            const promoCodeId = pi.metadata.promotion_code;
            if (promoCodeId.startsWith("promo_")) {
              const promoCode =
                await stripe.promotionCodes.retrieve(promoCodeId);
              promotionCodeName = promoCode.code || promoCodeId;
            } else {
              promotionCodeName = promoCodeId;
            }
          } catch {
            promotionCodeName = pi.metadata.promotion_code;
          }
        }

        let receiptUrl: string | null = null;
        let refundedAmount = 0;
        let isRefunded = false;
        let isPartiallyRefunded = false;
        let refunds: AdminOrder["refunds"] = [];

        if (pi.latest_charge) {
          try {
            const charge = await stripe.charges.retrieve(
              typeof pi.latest_charge === "string"
                ? pi.latest_charge
                : pi.latest_charge.id,
              { expand: ["refunds"] }
            );
            receiptUrl = charge.receipt_url ?? null;
            if (charge.refunded) {
              isRefunded = true;
              refundedAmount = charge.amount_refunded / 100;
            } else if (charge.amount_refunded > 0) {
              isPartiallyRefunded = true;
              refundedAmount = charge.amount_refunded / 100;
            }
            if (charge.refunds?.data) {
              refunds = charge.refunds.data.map((r) => ({
                id: r.id,
                amount: r.amount / 100,
                reason: r.reason,
                status: r.status ?? "",
                created: r.created,
              }));
            }
          } catch {
            // ignore
          }
        }

        return {
          id: pi.id,
          orderNumber: pi.id.substring(3, 11).toUpperCase(),
          date: new Date(pi.created * 1000).toISOString(),
          status: pi.status,
          amount: pi.amount / 100,
          currency: (pi.currency || "usd").toUpperCase(),
          items,
          metadata: {
            original_total: pi.metadata?.original_total,
            discount_amount: pi.metadata?.discount_amount,
            total_amount: pi.metadata?.total_amount,
            promotion_code: promotionCodeName || pi.metadata?.promotion_code,
          },
          customerEmail,
          receiptUrl,
          invoiceId: null,
          refundedAmount,
          isRefunded,
          isPartiallyRefunded,
          refunds,
          orderType: "purchase" as const,
        };
      })
    );

    // 5. Fetch ALL product grants (with amount for historical order records)
    const { data: grants } = await (adminSupabase as any)
      .from("product_grants")
      .select("id, product_id, user_email, granted_at, notes, amount")
      .order("granted_at", { ascending: false });

    const grantOrders: AdminOrder[] = [];
    if (grants && grants.length > 0) {
      const productIds = [...new Set(grants.map((g: any) => g.product_id))];
      const { data: grantProducts } = await (adminSupabase as any)
        .from("products")
        .select("id, name, slug, featured_image_url")
        .in("id", productIds);

      const productMap = new Map(
        (grantProducts || []).map((p: any) => [p.id, p])
      );

      const redemptionCodes: string[] = [];
      for (const g of grants) {
        const isRedemption =
          g.notes && g.notes.includes("Redeemed via reseller code:");
        if (isRedemption) {
          const m = g.notes?.match(/Redeemed via reseller code: ([^\s]+)/);
          if (m) redemptionCodes.push(m[1]);
        }
      }

      const resellerMap = new Map<string, string>();
      if (redemptionCodes.length > 0) {
        const { data: resellerCodes } = await (adminSupabase as any)
          .from("reseller_codes")
          .select("serial_code, resellers:reseller_id(name)")
          .in("serial_code", redemptionCodes);
        if (resellerCodes) {
          (resellerCodes as any[]).forEach((c) => {
            const name = c.resellers?.name ?? null;
            if (name) resellerMap.set(c.serial_code, name);
          });
        }
      }

      // Group grants by (user_email, minute) so batches created together appear as one order
      const MINUTE_MS = 60 * 1000;
      const grantGroups = new Map<
        string,
        Array<{
          grant: any;
          product: any;
          isRedemption: boolean;
          serialCode: string;
          resellerName: string | null;
          recordedAmount: number;
        }>
      >();

      for (const grant of grants) {
        const product = productMap.get(grant.product_id);
        if (!product) continue;

        const isRedemption =
          grant.notes && grant.notes.includes("Redeemed via reseller code:");
        const serialCodeMatch = grant.notes?.match(
          /Redeemed via reseller code: ([^\s]+)/
        );
        const resellerMatch = grant.notes?.match(/from (.+)$/);
        const serialCode = serialCodeMatch ? serialCodeMatch[1] : "Unknown";
        const resellerName =
          resellerMatch?.[1] ?? resellerMap.get(serialCode) ?? null;
        const recordedAmount = Number(grant.amount) || 0;

        const minuteBucket = Math.floor(
          new Date(grant.granted_at).getTime() / MINUTE_MS
        );
        const groupKey = `${(grant.user_email ?? "").toLowerCase()}|${minuteBucket}`;

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
        const items: AdminOrderItem[] = group.map((g) => ({
          id: g.product.id,
          name: g.product.name ?? "",
          quantity: 1,
          price: g.recordedAmount,
          product_image: g.product.featured_image_url || null,
          product_slug: g.product.slug || null,
        }));
        const grantIds = group.map((g) => g.grant.id);
        const allRedemptions = group.every((g) => g.isRedemption);

        grantOrders.push({
          id:
            group.length > 1
              ? `batch_${first.grant.id}`
              : allRedemptions
                ? `redemption_${first.grant.id}`
                : `grant_${first.grant.id}`,
          orderNumber:
            allRedemptions
              ? `REDEEM-${first.grant.id.substring(0, 8).toUpperCase()}`
              : `GRANT-${first.grant.id.substring(0, 8).toUpperCase()}`,
          date: first.grant.granted_at,
          status: "succeeded",
          amount: totalAmount,
          currency: "USD",
          items,
          metadata: {
            grant_id: grantIds.length === 1 ? grantIds[0] : undefined,
            grant_ids: grantIds.length > 1 ? grantIds : undefined,
            grant_type: allRedemptions ? "redemption" : "free_license",
            redemption_code: allRedemptions && first.serialCode ? first.serialCode : undefined,
            reseller_name: allRedemptions ? (first.resellerName ?? undefined) : undefined,
            notes: first.grant.notes,
          },
          customerEmail: first.grant.user_email ?? null,
          receiptUrl: null,
          invoiceId: null,
          refundedAmount: 0,
          isRefunded: false,
          isPartiallyRefunded: false,
          refunds: [],
          orderType: allRedemptions
            ? ("redemption" as const)
            : ("grant" as const),
        });
      }
    }

    const allOrders = [...stripeOrders, ...grantOrders].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      success: true,
      orders: allOrders,
      debug: {
        stripeOrders: stripeOrders.length,
        grantOrders: grantOrders.filter((o) => o.orderType === "grant").length,
        redemptionOrders: grantOrders.filter(
          (o) => o.orderType === "redemption"
        ).length,
      },
    };
  } catch (error: any) {
    console.error("[Admin Orders] Error:", error);
    return {
      success: false,
      orders: [],
      error: error.message || "Failed to fetch orders",
    };
  }
}
