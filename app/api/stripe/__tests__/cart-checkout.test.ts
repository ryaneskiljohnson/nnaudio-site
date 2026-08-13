import { describe, it, expect } from "vitest";
import { POST } from "../cart-checkout/route";

describe("POST /api/stripe/cart-checkout", () => {
  it("is disabled (410 Gone) so client-supplied prices cannot be charged", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});
