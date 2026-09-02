/**
 * @fileoverview Shared rules for which support-ticket statuses still need admin attention.
 * @module utils/support/is-active-support-ticket-status
 */

/**
 * Statuses that can still require an admin reply.
 */
export const ACTIVE_SUPPORT_TICKET_STATUSES = ["open", "in_progress"] as const;

/**
 * @brief True when a ticket is still being worked (open or in progress).
 * @param status Ticket status from `support_tickets.status`
 * @returns Whether the ticket is eligible to show "Needs reply"
 * @note Resolved and closed tickets are finished work, even if the last message is from the customer.
 * @example
 * ```ts
 * isActiveSupportTicketStatus("resolved"); // false
 * isActiveSupportTicketStatus("open"); // true
 * ```
 */
export function isActiveSupportTicketStatus(
  status: string | null | undefined,
): boolean {
  return (
    status === "open" || status === "in_progress"
  );
}

/**
 * @brief True when the admin UI should show a "Needs reply" indicator.
 * @param awaitingAdminResponse Latest customer message is unanswered and not dismissed
 * @param status Current ticket status
 * @returns Whether to surface the needs-reply badge
 * @note A resolved or closed ticket never needs a reply, even if the customer wrote last.
 * @example
 * ```ts
 * supportTicketNeedsReply(true, "resolved"); // false
 * supportTicketNeedsReply(true, "open"); // true
 * ```
 */
export function supportTicketNeedsReply(
  awaitingAdminResponse: boolean | undefined,
  status: string | null | undefined,
): boolean {
  return Boolean(awaitingAdminResponse) && isActiveSupportTicketStatus(status);
}
