/**
 * @fileoverview APNs sender and payload builders for the NNAudio admin iOS wrapper.
 * @module lib/admin-push
 *
 * Paid orders and support-ticket events fan out an alert to every registered
 * device token. Free orders never produce a payload. Delivery failures are
 * logged and never thrown to callers.
 *
 * @example
 * const payload = buildPaidOrderPush({
 *   amountCents: 4900,
 *   currency: "usd",
 *   itemNames: ["Reiya"],
 * });
 * if (payload) await sendAdminPush(payload);
 */

import http2 from "node:http2";
import jwt from "jsonwebtoken";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

const APNS_PRODUCTION_HOST = "api.push.apple.com";
const APNS_SANDBOX_HOST = "api.sandbox.push.apple.com";
const DEVICE_TOKEN_HEX = /^[0-9a-fA-F]{16,256}$/;

/**
 * @brief Alert payload stored on the APNs notification and used for tap navigation.
 */
export interface AdminPushPayload {
  title: string;
  body: string;
  path: string;
}

/**
 * @brief Support-ticket push variant.
 */
export type AdminTicketPushKind = "new_ticket" | "customer_reply";

/**
 * @brief Inputs for a paid-order alert.
 */
export interface PaidOrderPushInput {
  amountCents: number;
  currency: string;
  itemNames: string[];
}

/**
 * @brief Inputs for a support-ticket alert.
 */
export interface TicketPushInput {
  kind: AdminTicketPushKind;
  ticketId: string;
  ticketNumber: string;
  subject: string;
}

/**
 * @brief Formats cents as a locale currency string for the push body.
 * @param amountCents Amount in the smallest currency unit
 * @param currency ISO currency code (e.g. usd)
 * @returns Formatted amount such as `$12.00`
 */
export function formatPushCurrency(amountCents: number, currency: string): string {
  const code = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(amountCents / 100);
  } catch {
    return `${code} ${(amountCents / 100).toFixed(2)}`;
  }
}

/**
 * @brief Builds a paid-order alert, or null when the order is free.
 * @param input Amount, currency, and line-item names
 * @returns Payload for `/admin/orders`, or null when amountCents <= 0
 * @note Free orders never notify admins.
 * @example
 * buildPaidOrderPush({ amountCents: 0, currency: "usd", itemNames: ["Free"] }); // null
 */
export function buildPaidOrderPush(
  input: PaidOrderPushInput
): AdminPushPayload | null {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    return null;
  }

  const amount = formatPushCurrency(input.amountCents, input.currency);
  const names = input.itemNames.map((name) => name.trim()).filter(Boolean);
  const first = names[0];
  const extra = names.length > 1 ? ` (+${names.length - 1})` : "";
  const body = first ? `${amount} — ${first}${extra}` : amount;

  return {
    title: "Paid order",
    body,
    path: "/admin/orders",
  };
}

/**
 * @brief Builds a new-ticket or customer-reply alert.
 * @param input Ticket id, number, subject, and kind
 * @returns Payload that opens the ticket modal on the admin tickets page
 * @example
 * buildTicketPush({
 *   kind: "new_ticket",
 *   ticketId: "abc",
 *   ticketNumber: "TKT-1",
 *   subject: "Download help",
 * });
 */
export function buildTicketPush(input: TicketPushInput): AdminPushPayload {
  const ticketNumber = input.ticketNumber.trim() || "Ticket";
  const subject = input.subject.trim() || "Support";
  return {
    title: input.kind === "new_ticket" ? "New support ticket" : "Ticket reply",
    body: `${ticketNumber}: ${subject}`,
    path: `/admin/support-tickets?ticket=${encodeURIComponent(input.ticketId)}`,
  };
}

/**
 * @brief True when a hex string looks like an APNs device token.
 * @param token Candidate token
 * @returns Whether the token is 16–256 hex characters
 */
export function isApnsDeviceToken(token: string): boolean {
  return DEVICE_TOKEN_HEX.test(token);
}

/**
 * @brief Wraps a raw p8 body in PEM headers when the env var omitted them.
 * @param raw APNS_KEY_P8 value
 * @returns PEM private key
 */
function normalizeApnsKey(raw: string): string {
  const trimmed = raw.replace(/\\n/g, "\n").trim();
  if (trimmed.includes("BEGIN PRIVATE KEY")) {
    return trimmed;
  }
  return `-----BEGIN PRIVATE KEY-----\n${trimmed}\n-----END PRIVATE KEY-----`;
}

/**
 * @brief Signs a short-lived APNs provider JWT.
 * @returns Bearer token, or null when env is incomplete
 */
function createApnsJwt(): string | null {
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const keyP8 = process.env.APNS_KEY_P8?.trim();
  if (!keyId || !teamId || !keyP8) {
    console.error("[admin push] Missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_KEY_P8");
    return null;
  }

  try {
    return jwt.sign({}, normalizeApnsKey(keyP8), {
      algorithm: "ES256",
      keyid: keyId,
      issuer: teamId,
      expiresIn: "50m",
    });
  } catch (error) {
    console.error("[admin push] Failed to sign APNs JWT:", error);
    return null;
  }
}

/**
 * @brief POSTs one alert to APNs over HTTP/2.
 * @param host Production or sandbox APNs host
 * @param deviceToken Hex device token
 * @param providerToken Signed provider JWT
 * @param bundleId apns-topic (bundle id)
 * @param payload Alert title, body, and admin path
 * @returns HTTP status and optional APNs reason
 */
function postApnsNotification(
  host: string,
  deviceToken: string,
  providerToken: string,
  bundleId: string,
  payload: AdminPushPayload
): Promise<{ status: number; reason?: string }> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    client.on("error", (error) => {
      client.close();
      reject(error);
    });

    const body = JSON.stringify({
      aps: {
        alert: {
          title: payload.title,
          body: payload.body,
        },
        sound: "default",
      },
      path: payload.path,
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });

    let responseStatus = 0;
    let responseBody = "";

    req.on("response", (headers) => {
      responseStatus = Number(headers[":status"] ?? 0);
    });
    req.on("data", (chunk) => {
      responseBody += chunk;
    });
    req.on("end", () => {
      client.close();
      let reason: string | undefined;
      if (responseBody) {
        try {
          const parsed = JSON.parse(responseBody) as { reason?: string };
          reason = parsed.reason;
        } catch {
          reason = responseBody;
        }
      }
      resolve({ status: responseStatus, reason });
    });
    req.on("error", (error) => {
      client.close();
      reject(error);
    });

    req.end(body);
  });
}

/**
 * @brief True when APNs says the token should be deleted.
 * @param status HTTP status
 * @param reason APNs reason string
 * @returns Whether the device row is dead
 */
function shouldPruneDevice(status: number, reason?: string): boolean {
  if (status === 410) return true;
  return status === 400 && reason === "BadDeviceToken";
}

/**
 * @brief Sends an alert to every registered admin iOS device.
 * @param payload Title, body, and tap path
 * @returns Promise that resolves after fan-out (never throws)
 * @note Missing APNs env or an empty device table is a no-op.
 * @example
 * await sendAdminPush({ title: "Paid order", body: "$49.00 — Reiya", path: "/admin/orders" });
 */
export async function sendAdminPush(payload: AdminPushPayload): Promise<void> {
  try {
    const bundleId = process.env.APNS_BUNDLE_ID?.trim() || "io.nnaud";
    const providerToken = createApnsJwt();
    if (!providerToken) return;

    const supabase = await createSupabaseServiceRole();
    const { data: devices, error } = await supabase
      .from("admin_push_devices")
      .select("device_token, sandbox");

    if (error) {
      console.error("[admin push] Failed to load devices:", error.message);
      return;
    }
    if (!devices?.length) {
      console.log("[admin push] No registered devices");
      return;
    }

    for (const device of devices) {
      const token = device.device_token;
      if (!isApnsDeviceToken(token)) {
        continue;
      }
      const host = device.sandbox ? APNS_SANDBOX_HOST : APNS_PRODUCTION_HOST;
      try {
        const result = await postApnsNotification(
          host,
          token,
          providerToken,
          bundleId,
          payload
        );
        if (result.status >= 200 && result.status < 300) {
          continue;
        }
        console.error(
          "[admin push] APNs rejected token",
          token.slice(0, 8),
          result.status,
          result.reason
        );
        if (shouldPruneDevice(result.status, result.reason)) {
          const { error: deleteError } = await supabase
            .from("admin_push_devices")
            .delete()
            .eq("device_token", token);
          if (deleteError) {
            console.error(
              "[admin push] Failed to prune token:",
              deleteError.message
            );
          }
        }
      } catch (sendError) {
        console.error("[admin push] Send failed:", sendError);
      }
    }
  } catch (error) {
    console.error("[admin push] sendAdminPush failed:", error);
  }
}
