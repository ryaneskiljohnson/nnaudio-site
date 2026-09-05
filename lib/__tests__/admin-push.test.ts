/**
 * @fileoverview Unit tests for admin APNs payload builders and free-order skip.
 * @module lib/__tests__/admin-push
 */

import { describe, expect, it } from "vitest";
import {
  buildPaidOrderPush,
  buildTicketPush,
  formatPushCurrency,
  isApnsDeviceToken,
} from "@/lib/admin-push";

describe("buildPaidOrderPush", () => {
  it("returns null for a free order", () => {
    expect(
      buildPaidOrderPush({
        amountCents: 0,
        currency: "usd",
        itemNames: ["Free plugin"],
      })
    ).toBeNull();
  });

  it("returns null for a negative or non-finite amount", () => {
    expect(
      buildPaidOrderPush({
        amountCents: -1,
        currency: "usd",
        itemNames: ["Reiya"],
      })
    ).toBeNull();
    expect(
      buildPaidOrderPush({
        amountCents: Number.NaN,
        currency: "usd",
        itemNames: ["Reiya"],
      })
    ).toBeNull();
  });

  it("builds a single-item paid-order alert", () => {
    expect(
      buildPaidOrderPush({
        amountCents: 4900,
        currency: "usd",
        itemNames: ["Reiya"],
      })
    ).toEqual({
      title: "Paid order",
      body: "$49.00 — Reiya",
      path: "/admin/orders",
    });
  });

  it("appends extra item count when there are multiple line items", () => {
    expect(
      buildPaidOrderPush({
        amountCents: 12900,
        currency: "usd",
        itemNames: ["Reiya", "Noker", "Curio"],
      })
    ).toEqual({
      title: "Paid order",
      body: "$129.00 — Reiya (+2)",
      path: "/admin/orders",
    });
  });

  it("omits the item name when the list is empty", () => {
    expect(
      buildPaidOrderPush({
        amountCents: 1000,
        currency: "usd",
        itemNames: [],
      })
    ).toEqual({
      title: "Paid order",
      body: "$10.00",
      path: "/admin/orders",
    });
  });
});

describe("buildTicketPush", () => {
  it("builds a new-ticket alert that opens the ticket modal", () => {
    expect(
      buildTicketPush({
        kind: "new_ticket",
        ticketId: "abc-123",
        ticketNumber: "TKT-XYZ",
        subject: "Download help",
      })
    ).toEqual({
      title: "New support ticket",
      body: "TKT-XYZ: Download help",
      path: "/admin/support-tickets?ticket=abc-123",
    });
  });

  it("builds a customer-reply alert", () => {
    expect(
      buildTicketPush({
        kind: "customer_reply",
        ticketId: "ticket id",
        ticketNumber: "TKT-1",
        subject: "Still broken",
      })
    ).toEqual({
      title: "Ticket reply",
      body: "TKT-1: Still broken",
      path: `/admin/support-tickets?ticket=${encodeURIComponent("ticket id")}`,
    });
  });
});

describe("formatPushCurrency", () => {
  it("formats usd cents", () => {
    expect(formatPushCurrency(1999, "usd")).toBe("$19.99");
  });
});

describe("isApnsDeviceToken", () => {
  it("accepts 64-character hex tokens", () => {
    expect(isApnsDeviceToken("a".repeat(64))).toBe(true);
  });

  it("rejects empty or non-hex values", () => {
    expect(isApnsDeviceToken("")).toBe(false);
    expect(isApnsDeviceToken("not-a-token")).toBe(false);
  });
});
