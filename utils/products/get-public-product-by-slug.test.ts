import { describe, expect, it } from "vitest";
import { getPublicProductBySlug } from "./get-public-product-by-slug";

describe("getPublicProductBySlug", () => {
  it("returns null for an empty slug without querying", async () => {
    await expect(getPublicProductBySlug("")).resolves.toBeNull();
    await expect(getPublicProductBySlug("   ")).resolves.toBeNull();
  });
});
