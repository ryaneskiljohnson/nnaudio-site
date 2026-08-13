import { describe, it, expect } from "vitest";
import {
  isStripeCheckoutSessionId,
  isStripePaymentIntentId,
  isStripeCheckoutLookupId,
} from "@/utils/stripe/ids";
import { chatSchema } from "@/utils/apiSchemas";

describe("Stripe checkout lookup ids", () => {
  it("accepts live and test checkout session ids", () => {
    expect(isStripeCheckoutSessionId("cs_test_a1B2c3D4e5F6g7H8")).toBe(true);
    expect(isStripeCheckoutSessionId("cs_live_a1B2c3D4e5F6g7H8")).toBe(true);
    expect(isStripeCheckoutLookupId("cs_test_a1B2c3D4e5F6g7H8")).toBe(true);
  });

  it("accepts payment intent ids", () => {
    expect(isStripePaymentIntentId("pi_3abcDEF123456789")).toBe(true);
    expect(isStripeCheckoutLookupId("pi_3abcDEF123456789")).toBe(true);
  });

  it("rejects quote injection and free-form strings", () => {
    expect(isStripeCheckoutSessionId("cs_test_abc'; DROP TABLE")).toBe(false);
    expect(isStripePaymentIntentId("pi_abc' OR '1'='1")).toBe(false);
    expect(isStripeCheckoutLookupId("free-order")).toBe(false);
    expect(isStripeCheckoutLookupId("")).toBe(false);
  });
});

describe("chatSchema", () => {
  it("accepts a short conversation", () => {
    const parsed = chatSchema.safeParse({
      message: "hello",
      conversationHistory: [
        {
          id: "1",
          text: "hi",
          isUser: true,
          timestamp: new Date().toISOString(),
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects oversized history arrays", () => {
    const parsed = chatSchema.safeParse({
      message: "hello",
      conversationHistory: Array.from({ length: 51 }, (_, i) => ({
        id: String(i),
        text: "x",
        isUser: true,
        timestamp: new Date().toISOString(),
      })),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized history text", () => {
    const parsed = chatSchema.safeParse({
      message: "hello",
      conversationHistory: [
        {
          id: "1",
          text: "x".repeat(4001),
          isUser: true,
          timestamp: new Date().toISOString(),
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
