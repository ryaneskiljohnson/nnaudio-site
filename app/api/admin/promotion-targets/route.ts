/**
 * @fileoverview Lists selectable promotion targets for the admin Promotions UI.
 * @module app/api/admin/promotion-targets/route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type TargetOption = {
  key: string;
  label: string;
  group: string;
  /** @brief List price in USD for admin sale preview; null if unknown. */
  list_price: number | null;
};

const TIERS = ["monthly", "annual", "lifetime"] as const;

/**
 * @brief GET — subscription product tiers (`subscription_stripe_prices`), shop SKUs, elite bundle tiers.
 * @returns JSON `{ success, targets }` each with optional `list_price` for preview, or 401/403/500.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminCheck } = await supabase
      .from("admins")
      .select("user")
      .eq("user", user.id)
      .single();

    if (!adminCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targets: TargetOption[] = [];

    const { data: subProducts, error: subErr } = await (supabase as any)
      .from("products")
      .select("id, name, subscription_stripe_prices")
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(5000);

    if (subErr) {
      console.error("[promotion-targets] subscription products", subErr);
    } else {
      for (const p of subProducts || []) {
        const ss = p.subscription_stripe_prices;
        if (!ss || typeof ss !== "object") continue;
        for (const tier of TIERS) {
          const row = (ss as Record<string, unknown>)[tier];
          if (!row || typeof row !== "object") continue;
          const o = row as Record<string, unknown>;
          if (
            (typeof o.stripe_price_id === "string" &&
              o.stripe_price_id.trim()) ||
            (typeof o.list_price === "number" && Number.isFinite(o.list_price))
          ) {
            const label = `${p.name || p.id} — ${
              tier.charAt(0).toUpperCase() + tier.slice(1)
            }`;
            const listPrice =
              typeof o.list_price === "number" && Number.isFinite(o.list_price)
                ? o.list_price
                : null;
            targets.push({
              key: `product:${p.id}:${tier}`,
              label,
              group: "Subscription checkout",
              list_price: listPrice,
            });
          }
        }
      }
    }

    const { data: products, error: prodErr } = await (supabase as any)
      .from("products")
      .select("id, name, category, price")
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(5000);

    if (prodErr) {
      console.error("[promotion-targets] products", prodErr);
    } else {
      for (const p of products || []) {
        const listPrice =
          typeof p.price === "number" && Number.isFinite(p.price)
            ? p.price
            : null;
        targets.push({
          key: `product:${p.id}`,
          label: p.name || p.id,
          group: "Shop products",
          list_price: listPrice,
        });
      }
    }

    const { data: bundles, error: bunErr } = await (supabase as any)
      .from("bundles")
      .select(
        `
        id,
        name,
        slug,
        bundle_subscription_tiers(subscription_type, price, active)
      `
      )
      .eq("status", "active");

    if (bunErr) {
      console.error("[promotion-targets] bundles", bunErr);
    } else {
      for (const b of bundles || []) {
        const tiers = (b.bundle_subscription_tiers || []).filter(
          (t: { active?: boolean }) => t.active
        );
        for (const t of tiers) {
          const st = t.subscription_type as string;
          if (!TIERS.includes(st as (typeof TIERS)[number])) continue;
          const label = `${b.name} — ${st.charAt(0).toUpperCase()}${st.slice(1)}`;
          const raw = t.price;
          const listPrice =
            typeof raw === "number" && Number.isFinite(raw)
              ? raw
              : typeof raw === "string"
                ? Number.parseFloat(raw)
                : NaN;
          targets.push({
            key: `bundle:${b.id}:${st}`,
            label,
            group: "Elite bundle tiers",
            list_price: Number.isFinite(listPrice) ? listPrice : null,
          });
        }
      }
    }

    return NextResponse.json({ success: true, targets });
  } catch (e) {
    console.error("GET /api/admin/promotion-targets", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
