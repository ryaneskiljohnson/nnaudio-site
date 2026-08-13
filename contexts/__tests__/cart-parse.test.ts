import { describe, it, expect } from "vitest";
import { parseStoredCartItems } from "@/contexts/CartContext";

describe("parseStoredCartItems", () => {
  it("accepts a well-formed cart", () => {
    const items = parseStoredCartItems(
      JSON.stringify([
        {
          id: "p1",
          name: "Plugin",
          slug: "plugin",
          price: 49,
          quantity: 2,
        },
      ])
    );
    expect(items).toEqual([
      { id: "p1", name: "Plugin", slug: "plugin", price: 49, quantity: 2 },
    ]);
  });

  it("rejects non-arrays and malformed rows", () => {
    expect(parseStoredCartItems("{not json")).toEqual([]);
    expect(parseStoredCartItems(JSON.stringify({ id: "x" }))).toEqual([]);
    expect(
      parseStoredCartItems(
        JSON.stringify([{ id: "p1", name: "x", price: "nope", quantity: 1 }])
      )
    ).toEqual([]);
  });

  it("clamps quantity and drops rows with negative prices", () => {
    const items = parseStoredCartItems(
      JSON.stringify([
        { id: "a", name: "A", slug: "a", price: 10, quantity: 500 },
        { id: "b", name: "B", slug: "b", price: -1, quantity: 1 },
      ])
    );
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(99);
  });
});
