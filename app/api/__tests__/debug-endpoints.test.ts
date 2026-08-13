import { describe, it, expect, afterEach } from "vitest";
import { GET } from "../test-env/route";
import { GET as sendgridTestGet, POST as sendgridTestPost } from "../webhooks/sendgrid/test/route";
import { NextRequest } from "next/server";

describe("debug endpoints in production", () => {
  const original = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = original;
  });

  it("GET /api/test-env returns 404 in production", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("GET /api/webhooks/sendgrid/test returns 404 in production", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    const request = new NextRequest("http://localhost/api/webhooks/sendgrid/test");
    const response = await sendgridTestGet(request);
    expect(response.status).toBe(404);
  });

  it("POST /api/webhooks/sendgrid/test returns 404 in production", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    const request = new NextRequest("http://localhost/api/webhooks/sendgrid/test", {
      method: "POST",
    });
    const response = await sendgridTestPost(request);
    expect(response.status).toBe(404);
  });
});
