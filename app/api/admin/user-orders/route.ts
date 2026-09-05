/**
 * @fileoverview Admin API: return orders (Stripe + product grants) for a user.
 * Used by support tickets and user profile modals to show what was purchased.
 * @module api/admin/user-orders
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import Stripe from "stripe";
import { stripe } from "@/utils/stripe/client";
import {
  parseStripeCartItems,
  productNamesFromPaymentIntent,
} from "@/utils/stripe/payment-intent-products";
import { stripeCustomerIdsForProfile } from "@/utils/stripe/profile-customers";

/**
 * @brief Catalog (or name-only) product on an admin order row.
 */
export type AdminOrderProduct = {
  id?: string | null;
  name: string;
  slug?: string | null;
  featured_image_url?: string | null;
};

/**
 * @brief Unified order row for admin user-order lists.
 */
export type AdminUserOrderRow = {
  id: string;
  type: "stripe" | "grant";
  amountCents: number;
  created: string | null;
  productName?: string | null;
  productNames?: string[];
  products?: AdminOrderProduct[];
};

type CatalogProduct = {
  id: string;
  name: string;
  slug?: string | null;
  featured_image_url?: string | null;
};

/**
 * @brief Maps cart line items to display products, enriching from the catalog.
 * @param cartItems Parsed Stripe cart_items.
 * @param catalogById Catalog rows keyed by product id.
 * @returns Deduped products with name and optional slug/image.
 */
function productsFromCartItems(
  cartItems: Array<{ id?: string; name?: string }>,
  catalogById: Map<string, CatalogProduct>
): AdminOrderProduct[] {
  const seen = new Set<string>();
  const products: AdminOrderProduct[] = [];
  for (const item of cartItems) {
    const catalog = item.id ? catalogById.get(item.id) : undefined;
    const name = item.name?.trim() || catalog?.name || "";
    if (!name) continue;
    const key = catalog?.id || item.id || name;
    if (seen.has(key)) continue;
    seen.add(key);
    products.push({
      id: catalog?.id ?? item.id ?? null,
      name,
      slug: catalog?.slug ?? null,
      featured_image_url: catalog?.featured_image_url ?? null,
    });
  }
  return products;
}

/**
 * @brief Builds name-only product rows when cart/catalog ids are unavailable.
 * @param names Display names from metadata or invoice lines.
 * @returns Products with names only.
 */
function productsFromNames(names: string[]): AdminOrderProduct[] {
  return names.map((name) => ({
    name,
    id: null,
    slug: null,
    featured_image_url: null,
  }));
}

/**
 * @brief Collects invoice line descriptions keyed by PaymentIntent id.
 * @param customerId Stripe customer id.
 * @returns Map of payment-intent id → invoice line descriptions.
 * @note Uses invoice payments (2026 Stripe API) to link invoices back to PIs.
 */
async function invoiceLineDescriptionsByPaymentIntent(
  customerId: string
): Promise<Map<string, string[]>> {
  const byPi = new Map<string, string[]>();
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
      expand: ["data.payments"],
    });
    for (const invoice of invoices.data) {
      const lines = (invoice.lines?.data ?? [])
        .map((line) => line.description?.trim() ?? "")
        .filter((name) => name.length > 0);
      if (lines.length === 0) continue;
      const payments = invoice.payments?.data ?? [];
      for (const invoicePayment of payments) {
        const paymentRef = invoicePayment.payment?.payment_intent;
        const piId =
          typeof paymentRef === "string" ? paymentRef : paymentRef?.id;
        if (piId && !byPi.has(piId)) {
          byPi.set(piId, lines);
        }
      }
    }
  } catch (error) {
    console.error("[user-orders] Invoice line lookup failed:", error);
  }
  return byPi;
}

/**
 * GET /api/admin/user-orders?user_id=...
 * Returns { count, orders } for the given user (Stripe succeeded PIs + product grants).
 * Each order includes productNames for what was purchased or granted.
 * @param request - Next request; user_id query param required
 * @returns 200 JSON with count and orders; 400 if user_id missing; 401 if not admin; 500 on error
 * @example
 * GET /api/admin/user-orders?user_id=00000000-0000-0000-0000-000000000000
 * → { "count": 2, "orders": [{ "id": "pi_...", "type": "stripe", "productNames": ["CymaSynth"] }] }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = await createSupabaseServiceRole();
    await serviceSupabase.auth.admin.getUserById(userId);

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", userId)
      .single();

    const customerIds = await stripeCustomerIdsForProfile({
      customer_id: profile?.customer_id,
      email: profile?.email,
    });

    const orders: AdminUserOrderRow[] = [];

    if (customerIds.length > 0) {
      const paymentIntentsById = new Map<string, Stripe.PaymentIntent>();
      const invoiceLinesByPi = new Map<string, string[]>();
      for (const customerId of customerIds) {
        const [{ data: paymentIntents }, invoiceLines] = await Promise.all([
          stripe.paymentIntents.list({
            customer: customerId,
            limit: 100,
          }),
          invoiceLineDescriptionsByPaymentIntent(customerId),
        ]);
        for (const pi of paymentIntents) {
          if (!paymentIntentsById.has(pi.id)) {
            paymentIntentsById.set(pi.id, pi);
          }
        }
        for (const [piId, lines] of invoiceLines) {
          if (!invoiceLinesByPi.has(piId)) {
            invoiceLinesByPi.set(piId, lines);
          }
        }
      }

      const succeeded = Array.from(paymentIntentsById.values()).filter(
        (pi) => pi.status === "succeeded"
      );
      const catalogIds = new Set<string>();
      for (const pi of succeeded) {
        for (const item of parseStripeCartItems(pi.metadata?.cart_items)) {
          if (item.id) catalogIds.add(item.id);
        }
      }

      const catalogById = new Map<string, CatalogProduct>();
      if (catalogIds.size > 0) {
        const { data: catalogProducts } = await (serviceSupabase as any)
          .from("products")
          .select("id, name, slug, featured_image_url")
          .in("id", Array.from(catalogIds));
        for (const product of (catalogProducts ?? []) as CatalogProduct[]) {
          if (product?.id && product?.name) {
            catalogById.set(product.id, product);
          }
        }
      }

      for (const pi of succeeded) {
        const cartItems = parseStripeCartItems(pi.metadata?.cart_items);
        let products = productsFromCartItems(cartItems, catalogById);
        if (products.length === 0) {
          products = productsFromNames(
            productNamesFromPaymentIntent(
              pi.metadata,
              pi.description,
              invoiceLinesByPi.get(pi.id)
            )
          );
        }
        const productNames = products.map((product) => product.name);

        orders.push({
          id: pi.id,
          type: "stripe",
          amountCents: pi.amount,
          created: pi.created
            ? new Date(pi.created * 1000).toISOString()
            : null,
          productNames,
          productName: productNames[0] ?? null,
          products,
        });
      }
    }

    {
      const { data: grants } = await (serviceSupabase as any)
        .from("product_grants")
        .select(
          `
          id,
          amount,
          granted_at,
          products:product_id ( id, name, slug, featured_image_url )
        `
        )
        .eq("user_id", userId)
        .order("granted_at", { ascending: false });

      const grantList = (grants ?? []) as Array<{
        id: string;
        amount: number;
        granted_at: string;
        products?: CatalogProduct | null;
      }>;
      for (const g of grantList) {
        const amountCents = Math.round(Number(g.amount ?? 0) * 100);
        const granted = g.products;
        const name = granted?.name ?? null;
        const products = granted?.name
          ? [
              {
                id: granted.id ?? null,
                name: granted.name,
                slug: granted.slug ?? null,
                featured_image_url: granted.featured_image_url ?? null,
              },
            ]
          : [];
        orders.push({
          id: g.id,
          type: "grant",
          amountCents,
          created: g.granted_at ?? null,
          productName: name,
          productNames: name ? [name] : [],
          products,
        });
      }
    }

    orders.sort((a, b) => {
      if (!a.created || !b.created) return 0;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

    return NextResponse.json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("[user-orders] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to load user orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
