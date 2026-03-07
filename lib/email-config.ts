/**
 * @fileoverview Centralized email configuration for NNAudio (send from support@newnationllc.com)
 * @module lib/email-config
 */

/** Default support email address (verified in Amazon SES) */
export const SUPPORT_EMAIL =
  process.env.SENDER_EMAIL || "support@newnationllc.com";

/** Default sender display name */
export const SENDER_NAME =
  process.env.SENDER_NAME || "NNAudio Support";

/** Full From header value for outgoing emails */
export const DEFAULT_FROM = `${SENDER_NAME} <${SUPPORT_EMAIL}>`;
