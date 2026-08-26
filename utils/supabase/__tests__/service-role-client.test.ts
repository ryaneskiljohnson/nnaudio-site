/**
 * @fileoverview Unit tests for the lazy service-role client.
 * @module utils/supabase/__tests__/service-role-client.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("getServiceRoleClient", () => {
  it("throws before createClient when the service-role key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { getServiceRoleClient } = await import(
      "@/utils/supabase/service-role-client"
    );
    expect(() => getServiceRoleClient()).toThrow(
      /service role is not configured/
    );
  });
});
