import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/auth/require-cron", () => ({
  isAuthorizedCronRequest: vi.fn(() => true),
}));

import { GET } from "../route";

describe("GET /api/check-aws-env", () => {
  it("returns only presence booleans, never key material", async () => {
    process.env.AWS_ACCESS_KEY_ID = "AKIAEXAMPLE";
    process.env.AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG";
    const request = new NextRequest("http://localhost/api/check-aws-env");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.environment.hasAccessKeyId).toBe(true);
    expect(data.environment.hasSecretAccessKey).toBe(true);
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("AKIAEXAMPLE");
    expect(serialized).not.toContain("wJalrXUtnFEMI");
  });
});
