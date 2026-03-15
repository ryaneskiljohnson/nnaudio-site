/**
 * @fileoverview Branded order confirmation / receipt email (NNAudio).
 * @module utils/order-confirmation-email
 *
 * Dark theme, #6c63ff / #4ecdc4, NNAud.io logo, NNAudio footer.
 */

/** Public logo URL for email clients (Supabase storage). */
const LOGO_URL =
  "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/images/NNAudio-logo-white.png";

/** Base URL for links (my-products page, etc.). */
const SITE_BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SITE_URL) ||
  "https://nnaud.io";
const MY_PRODUCTS_URL = `${SITE_BASE_URL.replace(/\/$/, "")}/my-products`;

export interface OrderLineItem {
  name: string;
  quantity: number;
  amount: string; // e.g. "$29.00"
}

export interface OrderConfirmationData {
  customerEmail: string;
  customerName?: string | null;
  orderNumber?: string | null;
  lineItems: OrderLineItem[];
  subtotal: string;
  total: string;
  receiptUrl: string | null;
  date: string;
  /** When true, message says order completed (no payment) instead of payment successful. */
  isFreeOrder?: boolean;
}

const BASE_STYLES = `
body, html { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f7f7f7; color: #333333; line-height: 1.6; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; overflow: hidden; border: 1px solid rgba(108, 99, 255, 0.3); }
.header { background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%); padding: 30px 20px; text-align: center; border-bottom: 1px solid rgba(108, 99, 255, 0.2); }
.logo { width: 180px; margin: 0 auto; display: block; height: auto; border: 0; }
.content { padding: 30px; color: #ffffff; background-color: #121212; }
.title { font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; color: #ffffff; }
.title span { background: linear-gradient(90deg, #6c63ff, #4ecdc4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.message { margin-bottom: 20px; font-size: 16px; color: #b3b3b3; }
.field { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.field:last-child { border-bottom: none; }
.label { font-weight: bold; color: #6c63ff; display: block; margin-bottom: 5px; }
.message-box { margin-top: 25px; padding: 15px; background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #6c63ff; }
.timestamp { color: #666666; font-size: 12px; margin-top: 25px; text-align: right; }
.footer { padding: 15px; text-align: center; font-size: 12px; background-color: #0a0a0a; color: #666666; border-top: 1px solid rgba(255, 255, 255, 0.05); }
.footer a { color: #6c63ff; text-decoration: none; }
.footer-link { margin-bottom: 10px; }
.copyright { margin: 0; color: #666666; }
.divider { height: 3px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); width: 100%; margin: 0; padding: 0; }
.btn { display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #6c63ff, #5a52e0); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px; }
.btn:hover { opacity: 0.9; }
.item-row { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; }
.item-row:last-child { border-bottom: none; }
.total-row { font-size: 18px; font-weight: bold; color: #6c63ff; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(108, 99, 255, 0.3); }
`;

/**
 * Builds HTML for order confirmation email (NNAudio branding).
 * @param data - Order details (items, total, receipt URL, etc.)
 * @returns HTML string
 */
export function buildOrderConfirmationHtml(data: OrderConfirmationData): string {
  const {
    customerName,
    orderNumber,
    lineItems,
    subtotal,
    total,
    receiptUrl,
    date,
    isFreeOrder,
  } = data;
  const messageParagraph = isFreeOrder
    ? "Your order was successfully completed (no payment was made). Here's a summary of your purchase."
    : "Your payment was successful. Here's a summary of your purchase.";

  const itemRows = lineItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #ffffff; font-size: 14px;">${escapeHtml(item.name)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #b3b3b3; font-size: 14px; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #b3b3b3; font-size: 14px; text-align: right;">${item.amount}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - NNAud.io</title>
  <!--[if mso]>
  <style type="text/css">table{border-collapse:collapse;} div,td{padding:0;}</style>
  <![endif]-->
  <style type="text/css">${BASE_STYLES}</style>
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
          <h1 class="title" style="font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; color: #ffffff;">Thank you for your <span style="color: #6c63ff;">order</span></h1>
          <p class="message" style="margin-bottom: 20px; font-size: 16px; color: #b3b3b3;">${escapeHtml(messageParagraph)}</p>
          ${customerName ? `<div class="field" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);"><span class="label" style="font-weight: bold; color: #6c63ff;">Name</span><span style="color: #ffffff;">${escapeHtml(customerName)}</span></div>` : ""}
          ${orderNumber ? `<div class="field" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);"><span class="label" style="font-weight: bold; color: #6c63ff;">Order</span><span style="color: #ffffff;">${escapeHtml(orderNumber)}</span></div>` : ""}
          <div class="message-box" style="margin-top: 25px; padding: 15px; background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #6c63ff;">
            <span class="label" style="font-weight: bold; color: #6c63ff; display: block; margin-bottom: 10px;">Order details</span>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; margin-top: 8px;">
              <thead>
                <tr>
                  <th style="padding: 8px 12px; text-align: left; font-weight: bold; color: #6c63ff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(108, 99, 255, 0.3);">Item</th>
                  <th style="padding: 8px 12px; text-align: center; font-weight: bold; color: #6c63ff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(108, 99, 255, 0.3);">Qty</th>
                  <th style="padding: 8px 12px; text-align: right; font-weight: bold; color: #6c63ff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(108, 99, 255, 0.3);">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                <tr>
                  <td colspan="2" style="padding: 12px 12px 4px; color: #b3b3b3; font-size: 14px;">Subtotal</td>
                  <td style="padding: 12px 12px 4px; color: #b3b3b3; font-size: 14px; text-align: right;">${subtotal}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 12px 12px 10px; font-size: 18px; font-weight: bold; color: #6c63ff; border-top: 1px solid rgba(108, 99, 255, 0.3);">Total</td>
                  <td style="padding: 12px 12px 10px; font-size: 18px; font-weight: bold; color: #6c63ff; text-align: right; border-top: 1px solid rgba(108, 99, 255, 0.3);">${total}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style="margin-top: 20px; text-align: center;">
            <a href="${escapeHtml(MY_PRODUCTS_URL)}" class="btn" style="display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #6c63ff, #5a52e0); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold;">View products</a>
            ${receiptUrl ? ` <a href="${escapeHtml(receiptUrl)}" class="btn" style="display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #6c63ff, #5a52e0); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin-left: 10px;">View receipt</a>` : ""}
          </p>
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
 * Builds plain-text version of order confirmation.
 */
export function buildOrderConfirmationText(data: OrderConfirmationData): string {
  const { customerName, orderNumber, lineItems, subtotal, total, receiptUrl, date, isFreeOrder } = data;
  const intro = isFreeOrder
    ? "Your order was successfully completed (no payment was made)."
    : "Thank you for your order.";
  const lines: string[] = [intro, "", "Order details:", ...lineItems.map((i) => `  ${i.name} × ${i.quantity} - ${i.amount}`), "", `Subtotal: ${subtotal}`, `Total: ${total}`, "", `View products: ${MY_PRODUCTS_URL}`];
  if (customerName) lines.unshift(`Name: ${customerName}`, "");
  if (orderNumber) lines.splice(2, 0, `Order: ${orderNumber}`, "");
  if (receiptUrl) lines.push(`View receipt: ${receiptUrl}`);
  lines.push("", date);
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
