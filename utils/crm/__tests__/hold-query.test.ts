/**
 * @fileoverview Tests that holdQuery keeps a thenable builder after await.
 * @module utils/crm/__tests__/hold-query.test
 */

import { describe, expect, it } from "vitest";
import { holdQuery } from "@/utils/crm/hold-query";

describe("holdQuery", () => {
  it("keeps .order after an async function returns the builder", async () => {
    const builder = {
      order() {
        return this;
      },
      then(resolve: (value: { executed: boolean }) => void) {
        resolve({ executed: true });
      },
    };

    async function returnRaw() {
      return builder;
    }
    async function returnHeld() {
      return holdQuery(builder);
    }

    const raw = await returnRaw();
    expect(typeof (raw as { order?: unknown }).order).toBe("undefined");

    const held = await returnHeld();
    expect(typeof held.query.order).toBe("function");
  });
});
