import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (must be declared before importing the module under test) ---------
const productsRows: Array<{
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  status: string;
}> = [];

// Promotions query returns no active shop promotion by default.
const promoRows: any[] = [];

vi.mock("@/utils/supabase/service", () => ({
  createSupabaseServiceRole: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "products") {
        // .select(...).in('id', ids).eq('status','active') -> { data, error }
        return {
          select: () => ({
            in: (_col: string, ids: string[]) => ({
              eq: (_c2: string, _status: string) =>
                Promise.resolve({
                  data: productsRows.filter(
                    (r) => ids.includes(r.id) && r.status === "active"
                  ),
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "promotions") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: promoRows, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  })),
}));

vi.mock("@/utils/timezoneUtils", () => ({
  isPSTDateAfterNow: () => false,
  isPSTDateBeforeNow: () => false,
}));

import { repriceShopCartLines, RepriceError } from "@/utils/checkout/reprice-cart";

beforeEach(() => {
  productsRows.length = 0;
  promoRows.length = 0;
});

describe("repriceShopCartLines", () => {
  it("uses the DB price and IGNORES client-supplied prices", async () => {
    productsRows.push({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Real Product",
      price: 49,
      sale_price: null,
      status: "active",
    });

    const result = await repriceShopCartLines([
      // Attacker sends price/sale_price = 0.5; these must be ignored.
      { id: "11111111-1111-1111-1111-111111111111", quantity: 1, price: 0.5, sale_price: 0.5 } as any,
    ]);

    expect(result.subtotal).toBe(49);
    expect(result.lines[0].unitPrice).toBe(49);
    expect(result.lines[0].name).toBe("Real Product");
  });

  it("applies DB sale_price when present", async () => {
    productsRows.push({
      id: "22222222-2222-2222-2222-222222222222",
      name: "On Sale",
      price: 100,
      sale_price: 30,
      status: "active",
    });

    const result = await repriceShopCartLines([
      { id: "22222222-2222-2222-2222-222222222222", quantity: 2 },
    ]);

    expect(result.lines[0].unitPrice).toBe(30);
    expect(result.subtotal).toBe(60);
  });

  it("clamps quantity to a sane range", async () => {
    productsRows.push({
      id: "33333333-3333-3333-3333-333333333333",
      name: "Qty",
      price: 10,
      sale_price: null,
      status: "active",
    });

    const result = await repriceShopCartLines([
      { id: "33333333-3333-3333-3333-333333333333", quantity: 100000 },
    ]);

    expect(result.lines[0].quantity).toBe(99);
  });

  it("rejects unknown / inactive products", async () => {
    await expect(
      repriceShopCartLines([{ id: "44444444-4444-4444-4444-444444444444", quantity: 1 }])
    ).rejects.toBeInstanceOf(RepriceError);
  });

  it("rejects an empty cart", async () => {
    await expect(repriceShopCartLines([])).rejects.toBeInstanceOf(RepriceError);
  });
});
