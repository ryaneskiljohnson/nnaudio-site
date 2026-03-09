/**
 * @fileoverview Branded refund confirmation email (NNAudio).
 * @module utils/refund-email
 *
 * Dark theme, #6c63ff / #4ecdc4, NNAud.io logo, NNAudio footer.
 */

/** Public logo URL for email clients (Supabase storage). */
const LOGO_URL =
  "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/images/NNAudio-logo-white.png";

export interface RefundEmailData {
  customerEmail: string;
  customerName?: string | null;
  refundAmount: string;
  isPartial: boolean;
  originalAmount?: string | null;
  /** Stripe refund reason (e.g. requested_by_customer); displayed as human-readable in the email. */
  reason?: string | null;
  date: string;
}

/** Maps Stripe refund reason API values to human-readable labels. */
const REFUND_REASON_LABELS: Record<string, string> = {
  requested_by_customer: "Requested by customer",
  duplicate: "Duplicate charge",
  fraudulent: "Fraudulent",
  expired_uncaptured_charge: "Expired uncaptured charge",
};

/**
 * Returns a human-readable label for a Stripe refund reason, or null if unknown/empty.
 */
export function getRefundReasonLabel(reason: string | null | undefined): string | null {
  if (!reason || reason === "unknown") return null;
  return REFUND_REASON_LABELS[reason] ?? reason;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds HTML for refund confirmation email (NNAudio branding).
 * @param data - Refund details (amount, partial vs full, reason, date).
 * @returns HTML string
 */
export function buildRefundEmailHtml(data: RefundEmailData): string {
  const { refundAmount, isPartial, originalAmount, reason, date } = data;
  const reasonLabel = getRefundReasonLabel(reason);

  const titleText = isPartial ? "Partial refund processed" : "Refund processed";
  const messageText = isPartial
    ? `A partial refund of ${refundAmount} has been processed for your order.`
    : `Your refund of ${refundAmount} has been processed.`;

  const originalLine =
    isPartial && originalAmount
      ? `
          <div class="field" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <span class="label" style="font-weight: bold; color: #6c63ff;">Original amount</span>
            <span style="color: #ffffff;">${escapeHtml(originalAmount)}</span>
          </div>`
      : "";

  const reasonLine =
    reasonLabel
      ? `
          <div class="field" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <span class="label" style="font-weight: bold; color: #6c63ff;">Reason</span>
            <span style="color: #b3b3b3;">${escapeHtml(reasonLabel)}</span>
          </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Processed - NNAud.io</title>
  <!--[if mso]>
  <style type="text/css">table{border-collapse:collapse;} div,td{padding:0;}</style>
  <![endif]-->
  <style type="text/css">
    body, html { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f7f7f7; color: #333333; line-height: 1.6; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; overflow: hidden; border: 1px solid rgba(108, 99, 255, 0.3); }
    .header { background: #1a1a1a; padding: 30px 20px; text-align: center; border-bottom: 1px solid rgba(108, 99, 255, 0.2); }
    .logo { width: 180px; margin: 0 auto; display: block; height: auto; border: 0; }
    .content { padding: 30px; color: #ffffff; background-color: #121212; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; color: #ffffff; }
    .title span { color: #6c63ff; }
    .message { margin-bottom: 20px; font-size: 16px; color: #b3b3b3; }
    .field { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
    .label { font-weight: bold; color: #6c63ff; display: block; margin-bottom: 5px; }
    .message-box { margin-top: 25px; padding: 15px; background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #6c63ff; }
    .amount { font-size: 22px; font-weight: bold; color: #4ecdc4; }
    .timestamp { color: #666666; font-size: 12px; margin-top: 25px; text-align: right; }
    .footer { padding: 15px; text-align: center; font-size: 12px; background-color: #0a0a0a; color: #666666; border-top: 1px solid rgba(255, 255, 255, 0.05); }
    .footer a { color: #6c63ff; text-decoration: none; }
    .footer-link { margin-bottom: 10px; }
    .copyright { margin: 0; color: #666666; }
    .divider { height: 3px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); width: 100%; margin: 0; padding: 0; }
    .note { font-size: 14px; color: #888; margin-top: 20px; }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr><td>
      <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; overflow: hidden; border: 1px solid rgba(108, 99, 255, 0.3);">
        <div class="divider" style="height: 3px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); width: 100%; margin: 0; padding: 0;"></div>
        <div class="header" style="background: #1a1a1a; padding: 30px 20px; text-align: center; border-bottom: 1px solid rgba(108, 99, 255, 0.2);">
          <img src="${LOGO_URL}" alt="NNAud.io Logo" class="logo" width="180" height="auto" style="width: 180px; max-width: 100%; height: auto; border: 0; display: block; margin: 0 auto;">
        </div>
        <div class="content" style="padding: 30px; color: #ffffff; background-color: #121212;">
          <h1 class="title" style="font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; color: #ffffff;">Your <span style="color: #6c63ff;">refund</span> has been processed</h1>
          <p class="message" style="margin-bottom: 20px; font-size: 16px; color: #b3b3b3;">${messageText}</p>
          <div class="message-box" style="margin-top: 25px; padding: 15px; background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #6c63ff;">
            <span class="label" style="font-weight: bold; color: #6c63ff;">Refund amount</span>
            <div class="amount" style="font-size: 22px; font-weight: bold; color: #4ecdc4; margin-top: 8px;">${escapeHtml(refundAmount)}</div>
          </div>
          ${originalLine}
          ${reasonLine}
          <p class="note" style="font-size: 14px; color: #888; margin-top: 20px;">The refund will appear on your original payment method within 5–10 business days, depending on your bank or card issuer.</p>
          <div class="timestamp" style="color: #666666; font-size: 12px; margin-top: 25px; text-align: right;">${date}</div>
        </div>
        <div class="footer" style="padding: 15px; text-align: center; font-size: 12px; background-color: #0a0a0a; color: #666666; border-top: 1px solid rgba(255, 255, 255, 0.05);">
          <div class="footer-link" style="margin-bottom: 10px;"><a href="https://nnaud.io" style="color: #6c63ff; text-decoration: none;">NNAud.io</a> — Resources for Modern Music Producers</div>
          <p class="copyright" style="margin: 0; color: #666666;">© ${new Date().getFullYear()} NNAud.io. All rights reserved.</p>
        </div>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plain-text version of refund confirmation.
 */
export function buildRefundEmailText(data: RefundEmailData): string {
  const { refundAmount, isPartial, originalAmount, reason, date } = data;
  const reasonLabel = getRefundReasonLabel(reason);
  const lines: string[] = [
    "Your refund has been processed.",
    "",
    isPartial
      ? `Partial refund: ${refundAmount}`
      : `Refund amount: ${refundAmount}`,
  ];
  if (isPartial && originalAmount) lines.push(`Original amount: ${originalAmount}`);
  if (reasonLabel) lines.push(`Reason: ${reasonLabel}`);
  lines.push(
    "",
    "The refund will appear on your original payment method within 5–10 business days.",
    "",
    date
  );
  return lines.join("\n");
}
