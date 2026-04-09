/**
 * @fileoverview Email sending via SendGrid.
 * @module utils/email
 *
 * Uses dynamic import of @sendgrid/mail to avoid bundling issues when loading API routes.
 * Replaces previous AWS SES implementation.
 *
 * All sends are deduplicated: the same email (by idempotencyKey or by to+subject) is not
 * sent again within DEDUPE_WINDOW_MS, preventing duplicate emails from double-clicks, race
 * conditions, or retries.
 */

import { getPublicSiteUrlForEmail } from "@/utils/public-site-url";

/** Time window in ms during which the same logical email is not sent twice. */
const DEDUPE_WINDOW_MS = 90_000; // 90 seconds

/** Recent sends: key -> timestamp. Pruned when checking. */
const recentSends = new Map<string, number>();

/** Verified-style From when env is missing or invalid (must match SendGrid sender auth). */
const FALLBACK_FROM_EMAIL = "support@nnaud.io";

/**
 * @brief Normalizes SENDER_EMAIL from env (trim, strip wrapping quotes) and validates shape.
 * @returns Parsed email or null if unusable.
 * @note Vercel/dashboard copy-paste often leaves quotes around the value, which breaks SendGrid From.
 */
function normalizeEnvSenderEmail(raw: string | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  // Pragmatic check: no spaces, angle brackets, or obvious garbage
  if (!/^[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+$/.test(s)) return null;
  return s;
}

/**
 * @brief Resolves default From name/email from env with safe fallbacks.
 * @returns Display name and email for SendGrid `from`.
 */
function getDefaultSenderFromEnv(): { email: string; name: string } {
  const email = normalizeEnvSenderEmail(process.env.SENDER_EMAIL);
  const rawName = (process.env.SENDER_NAME || "NNAudio Support").trim();
  const name =
    rawName.replace(/[\r\n<>]/g, "").slice(0, 128).trim() || "NNAudio Support";
  if (!email) {
    if (process.env.SENDER_EMAIL?.trim()) {
      console.warn(
        "[email] SENDER_EMAIL is invalid after normalize (check for quotes/typos); using",
        FALLBACK_FROM_EMAIL
      );
    }
    return { email: FALLBACK_FROM_EMAIL, name: "NNAudio Support" };
  }
  return { email, name };
}

/**
 * @brief RFC-style From header string for defaults (Name <email>).
 */
function defaultFromHeaderString(): string {
  const { email, name } = getDefaultSenderFromEnv();
  return `${name} <${email}>`;
}

function pruneRecentSends(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  for (const [key, ts] of recentSends) {
    if (now - ts > DEDUPE_WINDOW_MS) toDelete.push(key);
  }
  toDelete.forEach((k) => recentSends.delete(k));
}

function getDedupeKey(params: {
  to?: string | string[];
  bcc?: string[];
  subject: string;
  idempotencyKey?: string;
}): string {
  if (params.idempotencyKey) return params.idempotencyKey;
  if (params.bcc) {
    const normalized = [...params.bcc].sort().join(",");
    return `batch:${normalized}:${params.subject}`;
  }
  const to = params.to;
  const normalized =
    typeof to === "string" ? to : Array.isArray(to) ? [...to].sort().join(",") : "";
  return `to:${normalized}:${params.subject}`;
}

interface SendBatchEmailParams {
  /** BCC recipients (SendGrid supports up to 1000 per request; we use BCC for batch). */
  bcc: string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string | string[];
  listUnsubscribe?: string;
  /** If set, same key within DEDUPE_WINDOW_MS prevents sending again. */
  idempotencyKey?: string;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string | string[];
  listUnsubscribe?: string;
  /** If set, same key within DEDUPE_WINDOW_MS prevents sending again. */
  idempotencyKey?: string;
}

/**
 * Sends an email using SendGrid with proper headers for deliverability.
 * @param params - Email parameters (to, subject, text/html, from, replyTo, listUnsubscribe).
 * @returns Promise with { success, messageId? } or { success: false, error }.
 * @note Callers store messageId in email_sends.message_id for webhook correlation.
 * @example
 *   const r = await sendEmail({ to: 'u@example.com', subject: 'Hi', html: '<p>Hi</p>' });
 *   if (r.success) console.log(r.messageId);
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from = defaultFromHeaderString(),
  replyTo,
  listUnsubscribe,
  idempotencyKey,
}: SendEmailParams): Promise<
  { success: true; messageId: string } | { success: false; error: string }
> {
  const dedupeKey = getDedupeKey({ to, subject, idempotencyKey });
  pruneRecentSends();
  const lastSent = recentSends.get(dedupeKey);
  if (lastSent != null && Date.now() - lastSent < DEDUPE_WINDOW_MS) {
    console.log("📧 Email deduplicated (same send within window):", { subject, to });
    return { success: true, messageId: "deduplicated" };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error("❌ SENDGRID_API_KEY is not set.");
    return { success: false, error: "SENDGRID_API_KEY is not set" };
  }

  try {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(apiKey);
  } catch (e) {
    console.error("❌ Failed to load SendGrid client:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load SendGrid client",
    };
  }

  const toAddresses = Array.isArray(to) ? to : [to];
  const replyToAddresses = replyTo
    ? Array.isArray(replyTo)
      ? replyTo
      : [replyTo]
    : [from.match(/<(.+)>/)?.[1] || from];

  const fromEmail = from.match(/<(.+)>/)?.[1] || from;
  const fromName = from.match(/^(.+?)\s*</)?.[1] || "NNAudio Support";

  const defaultUnsubscribe = getPublicSiteUrlForEmail();
  const unsubscribeUrl = listUnsubscribe || `${defaultUnsubscribe}/dashboard/support`;

  const headers: Record<string, string> = {
    "X-Mailer": "NNAudio Support System",
    "X-Priority": "3",
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };

  const msg = {
    to: toAddresses,
    from: { email: fromEmail, name: fromName },
    replyTo: replyToAddresses[0],
    subject,
    text: text ?? (html ? "" : " "),
    html: html ?? (text ? "" : " "),
    headers,
  };

  console.log("📤 Sending email via SendGrid...", {
    to: toAddresses,
    from: fromEmail,
    subject,
  });

  try {
    const sgMail = (await import("@sendgrid/mail")).default;
    const result = await sgMail.send(msg);
    const response = Array.isArray(result) ? result[0] : result;
    const headers = response?.headers as Record<string, string> | undefined;
    const messageId =
      headers?.["x-message-id"] || headers?.["X-Message-Id"] || "";
    console.log("✅ Email sent via SendGrid, X-Message-Id:", messageId || "(none)");
    recentSends.set(dedupeKey, Date.now());
    return { success: true, messageId: messageId || `sg-${Date.now()}` };
  } catch (error: unknown) {
    const err = error as { response?: { body?: unknown; statusCode?: number } };
    const body = err.response?.body;
    const statusCode = err.response?.statusCode;
    const message =
      typeof body === "object" && body !== null && "errors" in body
        ? JSON.stringify((body as { errors: unknown }).errors)
        : error instanceof Error
          ? error.message
          : "Unknown error sending email";
    console.error("❌ SendGrid error:", statusCode, body ?? message);
    return { success: false, error: message };
  }
}

/**
 * Sends a batch email using BCC to multiple recipients (up to 1000 per SendGrid request).
 * @param params - Batch email parameters.
 * @returns Promise with { success, messageId?, recipientCount } or { success: false, error, recipientCount? }.
 * @note Recipients see only their own address; others are in BCC for privacy.
 */
export async function sendBatchEmail({
  bcc,
  subject,
  text,
  html,
  from = defaultFromHeaderString(),
  replyTo,
  listUnsubscribe,
  idempotencyKey,
}: SendBatchEmailParams): Promise<
  | { success: true; messageId: string; recipientCount: number }
  | { success: false; error: string; recipientCount?: number }
> {
  const dedupeKey = getDedupeKey({ bcc, subject, idempotencyKey });
  pruneRecentSends();
  const lastSent = recentSends.get(dedupeKey);
  if (lastSent != null && Date.now() - lastSent < DEDUPE_WINDOW_MS) {
    console.log("📧 Batch email deduplicated (same send within window):", { subject, recipientCount: bcc.length });
    return { success: true, messageId: "deduplicated", recipientCount: bcc.length };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error("❌ SENDGRID_API_KEY is not set.");
    return { success: false, error: "SENDGRID_API_KEY is not set", recipientCount: bcc.length };
  }

  try {
    await import("@sendgrid/mail");
  } catch (e) {
    console.error("❌ Failed to load SendGrid client:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load SendGrid client",
      recipientCount: bcc.length,
    };
  }

  const MAX_BCC = 1000;
  if (bcc.length === 0) {
    return { success: false, error: "No BCC recipients provided", recipientCount: 0 };
  }
  if (bcc.length > MAX_BCC) {
    return {
      success: false,
      error: `Too many BCC recipients. Maximum ${MAX_BCC} per email. Got ${bcc.length}`,
      recipientCount: bcc.length,
    };
  }

  const replyToAddresses = replyTo
    ? Array.isArray(replyTo)
      ? replyTo
      : [replyTo]
    : [from.match(/<(.+)>/)?.[1] || from];
  const fromEmail = from.match(/<(.+)>/)?.[1] || from;
  const fromName = from.match(/^(.+?)\s*</)?.[1] || "NNAudio Support";
  const defaultUnsubscribe = getPublicSiteUrlForEmail();
  const unsubscribeUrl = listUnsubscribe || `${defaultUnsubscribe}/dashboard/support`;

  const headers: Record<string, string> = {
    "X-Mailer": "NNAudio Support System",
    "X-Priority": "3",
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };

  const msg = {
    to: fromEmail,
    bcc,
    from: { email: fromEmail, name: fromName },
    replyTo: replyToAddresses[0],
    subject,
    text: text ?? (html ? "" : " "),
    html: html ?? (text ? "" : " "),
    headers,
  };

  console.log(`📤 Sending batch email via SendGrid to ${bcc.length} recipients (BCC)...`);

  try {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(apiKey);
    const result = await sgMail.send(msg);
    const response = Array.isArray(result) ? result[0] : result;
    const headers = response?.headers as Record<string, string> | undefined;
    const messageId =
      headers?.["x-message-id"] || headers?.["X-Message-Id"] || "";
    console.log(
      "✅ Batch email sent via SendGrid, X-Message-Id:",
      messageId || "(none)",
      "Recipients:",
      bcc.length
    );
    recentSends.set(dedupeKey, Date.now());
    return {
      success: true,
      messageId: messageId || `sg-batch-${Date.now()}`,
      recipientCount: bcc.length,
    };
  } catch (error: unknown) {
    const err = error as { response?: { body?: unknown; statusCode?: number } };
    const body = err.response?.body;
    const message =
      typeof body === "object" && body !== null && "errors" in body
        ? JSON.stringify((body as { errors: unknown }).errors)
        : error instanceof Error
          ? error.message
          : "Unknown error sending batch email";
    console.error("❌ SendGrid batch error:", err.response?.statusCode, body ?? message);
    return {
      success: false,
      error: message,
      recipientCount: bcc.length,
    };
  }
}
