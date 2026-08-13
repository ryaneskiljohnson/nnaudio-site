/**
 * @fileoverview Server-side cart repricing. Never trust client-supplied prices.
 * @module utils/checkout/reprice-cart
 *
 * Resolves each cart line's price from the `products` table (service role),
 * applies the same active shop-wide catalog promotion that `/api/products` uses
 * so the charged unit price matches what the storefront displayed, clamps
 * quantities, and rejects unknown/inactive products.
 */

import "server-only";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { isPSTDateAfterNow, isPSTDateBeforeNow } from "@/utils/timezoneUtils";
import {
  computePromotionalUnitPrice,
  isShopProductIncluded,
  mergeManualAndPromotionalSalePrice,
} from "@/utils/promotions/apply-promotion";

export interface ClientCartLine {
  id?: unknown;
  quantity?: unknown;
}

export interface PricedLine {
  id: string;
  name: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  lineTotal: number;
}

export interface RepriceResult {
  lines: PricedLine[];
  subtotal: number;
  catalogPromotionId: string | null;
}

export class RepriceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "RepriceError";
    this.status = status;
  }
}

const MIN_QTY = 1;
const MAX_QTY = 99;

interface ShopPromoRow {
  id: string;
  promotion_target_mode: string | null;
  included_targets: string[] | null;
  discount_type: string | null;
  discount_value: number | null;
  start_date: string | null;
  end_date: string | null;
  priority: number | null;
}

/**
 * @brief Loads the highest-priority active promotion that affects shop products.
 */
async function loadActiveShopCatalogPromotion(
  admin: Awaited<ReturnType<typeof createSupabaseServiceRole>>
): Promise<ShopPromoRow | null> {
  const { data: promoRows } = await (admin as any)
    .from("promotions")
    .select(
      "id, promotion_target_mode, included_targets, discount_type, discount_value, start_date, end_date, priority"
    )
    .eq("active", true)
    .order("priority", { ascending: false });

  const scheduleOk = (promo: ShopPromoRow) => {
    if (promo.start_date && isPSTDateAfterNow(promo.start_date)) return false;
    if (promo.end_date && isPSTDateBeforeNow(promo.end_date)) return false;
    return true;
  };
  const affectsShop = (promo: ShopPromoRow) => {
    if (promo.promotion_target_mode === "all") return true;
    const t = promo.included_targets || [];
    return t.some((x) => typeof x === "string" && x.startsWith("product:"));
  };

  return (
    ((promoRows as ShopPromoRow[]) || []).find(
      (p) => scheduleOk(p) && affectsShop(p)
    ) || null
  );
}

/**
 * @brief Reprices client cart lines from authoritative DB data.
 * @throws {RepriceError} when the cart is empty or a product is unknown/inactive.
 */
export async function repriceShopCartLines(
  clientItems: ClientCartLine[]
): Promise<RepriceResult> {
  const normalized: { id: string; quantity: number }[] = [];
  for (const raw of clientItems || []) {
    if (!raw || typeof raw.id !== "string" || raw.id.length === 0) continue;
    const qtyNum = Math.floor(Number(raw.quantity));
    const quantity = Number.isFinite(qtyNum)
      ? Math.max(MIN_QTY, Math.min(MAX_QTY, qtyNum))
      : MIN_QTY;
    normalized.push({ id: raw.id, quantity });
  }
  if (normalized.length === 0) {
    throw new RepriceError("Cart is empty", 400);
  }

  const admin = await createSupabaseServiceRole();
  const ids = [...new Set(normalized.map((i) => i.id))];

  const { data: rows, error } = await (admin as any)
    .from("products")
    .select("id, name, price, sale_price, status")
    .in("id", ids)
    .eq("status", "active");

  if (error) {
    throw new RepriceError("Failed to load products", 500);
  }

  const byId = new Map<string, { id: string; name: string; price: number; sale_price: number | null }>(
    ((rows as any[]) || []).map((r) => [r.id, r])
  );
  for (const id of ids) {
    if (!byId.has(id)) {
      throw new RepriceError("One or more products are unavailable.", 400);
    }
  }

  const shopPromo = await loadActiveShopCatalogPromotion(admin);

  const lines: PricedLine[] = normalized.map(({ id, quantity }) => {
    const product = byId.get(id)!;
    const listPrice = Number(product.price);
    if (!Number.isFinite(listPrice) || listPrice < 0) {
      throw new RepriceError("One or more products are unavailable.", 400);
    }

    let promoUnit: number | null = null;
    if (shopPromo && isShopProductIncluded(id, shopPromo as any)) {
      promoUnit = computePromotionalUnitPrice(
        listPrice,
        String(shopPromo.discount_type),
        Number(shopPromo.discount_value)
      );
    }
    const merged = mergeManualAndPromotionalSalePrice(
      listPrice,
      product.sale_price,
      promoUnit
    );
    const unitPrice = merged !== null ? merged : listPrice;

    return {
      id,
      name: product.name,
      quantity,
      listPrice,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { lines, subtotal, catalogPromotionId: shopPromo?.id ?? null };
}
