/**
 * @fileoverview Tests for active support-ticket status and needs-reply visibility.
 * @module utils/__tests__/is-active-support-ticket-status.test
 */

import { describe, expect, it } from "vitest";
import {
  isActiveSupportTicketStatus,
  supportTicketNeedsReply,
} from "@/utils/support/is-active-support-ticket-status";

describe("isActiveSupportTicketStatus", () => {
  it("treats open and in_progress as active", () => {
    expect(isActiveSupportTicketStatus("open")).toBe(true);
    expect(isActiveSupportTicketStatus("in_progress")).toBe(true);
  });

  it("treats resolved and closed as finished", () => {
    expect(isActiveSupportTicketStatus("resolved")).toBe(false);
    expect(isActiveSupportTicketStatus("closed")).toBe(false);
  });
});

describe("supportTicketNeedsReply", () => {
  it("hides needs-reply on resolved tickets even when the customer wrote last", () => {
    expect(supportTicketNeedsReply(true, "resolved")).toBe(false);
  });

  it("shows needs-reply only for unanswered active tickets", () => {
    expect(supportTicketNeedsReply(true, "open")).toBe(true);
    expect(supportTicketNeedsReply(false, "open")).toBe(false);
    expect(supportTicketNeedsReply(true, "closed")).toBe(false);
  });
});
