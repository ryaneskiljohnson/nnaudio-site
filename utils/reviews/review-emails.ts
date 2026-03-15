/**
 * @fileoverview Email templates for post-purchase review invites and reward codes.
 * @module utils/reviews/review-emails
 */

/** Public logo URL for email clients (Supabase storage). */
const LOGO_URL =
  "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/images/NNAudio-logo-white.png";

/** Base URL for links used in review emails. */
const SITE_BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SITE_URL) ||
  "https://nnaud.io";

const EMAIL_BASE_STYLES = `
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
.product-list { margin: 0; padding-left: 20px; color: #ffffff; }
.product-list li { margin-bottom: 8px; }
.reward-code { font-size: 28px; font-weight: bold; letter-spacing: 0.12em; color: #4ecdc4; text-align: center; margin-top: 12px; }
`;

export interface ReviewEmailProduct {
  name: string;
  slug: string;
}

export interface ReviewInviteEmailData {
  customerName: string | null;
  reviewUrl: string;
  products: ReviewEmailProduct[];
}

export interface ReviewRewardEmailData {
  customerName: string | null;
  promotionCode: string;
  amountOffLabel: string;
  expiresLabel: string | null;
  shopUrl: string;
}

/**
 * @brief Escapes HTML entities for safe email rendering.
 * @param value Raw user or product text.
 * @returns Escaped string safe to interpolate into HTML.
 * @note Keep this lightweight because emails only interpolate plain text fields.
 * @example
 * escapeHtml("Tom & Jerry");
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @brief Builds the greeting used in review emails.
 * @param customerName Optional customer display name.
 * @returns Friendly greeting string.
 * @example
 * buildGreeting("Alex");
 */
function buildGreeting(customerName: string | null): string {
  const trimmedName = customerName?.trim();
  return trimmedName ? `Hi ${trimmedName},` : "Hi there,";
}

/**
 * @brief Builds the HTML body for the delayed review invite email.
 * @param data Invite email template data.
 * @returns Complete HTML email body.
 * @note The CTA points customers to My Products where the review dialog lives.
 * @example
 * buildReviewInviteEmailHtml({ customerName: "Alex", reviewUrl: "https://nnaud.io/my-products", products: [] });
 */
export function buildReviewInviteEmailHtml(
  data: ReviewInviteEmailData
): string {
  const productItems = data.products
    .map(
      (product) =>
        `<li>${escapeHtml(product.name)}</li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review Your Purchase - NNAud.io</title>
  <!--[if mso]>
  <style type="text/css">table{border-collapse:collapse;} div,td{padding:0;}</style>
  <![endif]-->
  <style type="text/css">${EMAIL_BASE_STYLES}</style>
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
          <h1 class="title" style="font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; color: #ffffff;">Share your <span style="color: #6c63ff;">feedback</span></h1>
          <p class="message" style="margin-bottom: 20px; font-size: 16px; color: #b3b3b3;">${escapeHtml(buildGreeting(data.customerName))}</p>
          <p class="message" style="margin-bottom: 20px; font-size: 16px; color: #b3b3b3;">
          It has been about a week since your purchase, and we would love to hear what you think.
          Leave a review for one of the products below and we will send you a one-time <strong style="color: #4ecdc4;">$10 coupon</strong> for a future order.
        </p>
          <div class="message-box" style="margin-top: 25px; padding: 15px; background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #6c63ff;">
            <span class="label" style="font-weight: bold; color: #6c63ff; display: block; margin-bottom: 10px;">Eligible products from your order</span>
            <ul class="product-list" style="margin: 0; padding-left: 20px; color: #ffffff;">
            ${productItems}
            </ul>
          </div>
          <p style="margin-top: 20px; text-align: center;">
            <a href="${escapeHtml(data.reviewUrl)}" class="btn" style="display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #6c63ff, #5a52e0); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold;">Write a review</a>
          </p>
          <p style="margin: 20px 0 0 0; font-size: 14px; color: #888;">
            Reviews are moderated before they appear publicly, and the coupon is sent separately after your review is submitted.
          </p>
        </div>
        <div class="footer" style="padding: 15px; text-align: center; font-size: 12px; background-color: #0a0a0a; color: #666666; border-top: 1px solid rgba(255, 255, 255, 0.05);">
          <div class="footer-link" style="margin-bottom: 10px;"><a href="${SITE_BASE_URL}" style="color: #6c63ff; text-decoration: none;">NNAud.io</a> — Resources for Modern Music Producers</div>
          <p class="copyright" style="margin: 0; color: #666666;">© ${new Date().getFullYear()} NNAud.io. All rights reserved.</p>
        </div>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * @brief Builds the plain-text review invite email body.
 * @param data Invite email template data.
 * @returns Plain-text email body.
 * @example
 * buildReviewInviteEmailText({ customerName: null, reviewUrl: "https://nnaud.io/my-products", products: [] });
 */
export function buildReviewInviteEmailText(
  data: ReviewInviteEmailData
): string {
  const lines = data.products.map((product) => `- ${product.name}`);

  return [
    buildGreeting(data.customerName),
    "",
    "It has been about a week since your purchase, and we would love to hear what you think.",
    "Leave a review for one of the products below and we will send you a one-time $10 coupon for a future order.",
    "",
    "Eligible products:",
    ...lines,
    "",
    `Write your review from My Products: ${data.reviewUrl}`,
    "",
    "Reviews are moderated before they appear publicly, and the coupon is sent separately after your review is submitted.",
  ].join("\n");
}

/**
 * @brief Builds the HTML body for the review reward email.
 * @param data Reward email template data.
 * @returns Complete HTML email body.
 * @example
 * buildReviewRewardEmailHtml({ customerName: null, promotionCode: "REVIEW10", amountOffLabel: "$10 off", expiresLabel: null, shopUrl: "https://nnaud.io/products" });
 */
export function buildReviewRewardEmailHtml(
  data: ReviewRewardEmailData
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Review Reward - NNAud.io</title>
  <!--[if mso]>
  <style type="text/css">table{border-collapse:collapse;} div,td{padding:0;}</style>
  <![endif]-->
  <style type="text/css">${EMAIL_BASE_STYLES}</style>
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
          <h1 class="title" style="font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; color: #ffffff;">Your review <span style="color: #6c63ff;">reward</span></h1>
          <p class="message" style="margin-bottom: 20px; font-size: 16px; color: #b3b3b3;">${escapeHtml(buildGreeting(data.customerName))}</p>
          <p class="message" style="margin-bottom: 20px; font-size: 16px; color: #b3b3b3;">
            Thanks for submitting your review. Here is your one-time <strong style="color: #4ecdc4;">${escapeHtml(data.amountOffLabel)}</strong> reward code.
          </p>
          <div class="message-box" style="margin-top: 25px; padding: 15px; background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #6c63ff; text-align: center;">
            <span class="label" style="font-weight: bold; color: #6c63ff; display: block; margin-bottom: 10px;">Your reward code</span>
            <div class="reward-code" style="font-size: 28px; font-weight: bold; letter-spacing: 0.12em; color: #4ecdc4; text-align: center; margin-top: 12px;">${escapeHtml(data.promotionCode)}</div>
            <div style="margin-top: 12px; font-size: 14px; color: #b3b3b3;">Single use on a future order</div>
          ${
            data.expiresLabel
              ? `<div style="margin-top: 8px; font-size: 14px; color: #b3b3b3;">Expires ${escapeHtml(data.expiresLabel)}</div>`
              : ""
          }
          </div>
          <p style="margin-top: 20px; text-align: center;">
            <a href="${escapeHtml(data.shopUrl)}" class="btn" style="display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #6c63ff, #5a52e0); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold;">Shop products</a>
          </p>
        </div>
        <div class="footer" style="padding: 15px; text-align: center; font-size: 12px; background-color: #0a0a0a; color: #666666; border-top: 1px solid rgba(255, 255, 255, 0.05);">
          <div class="footer-link" style="margin-bottom: 10px;"><a href="${SITE_BASE_URL}" style="color: #6c63ff; text-decoration: none;">NNAud.io</a> — Resources for Modern Music Producers</div>
          <p class="copyright" style="margin: 0; color: #666666;">© ${new Date().getFullYear()} NNAud.io. All rights reserved.</p>
        </div>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * @brief Builds the plain-text reward email body.
 * @param data Reward email template data.
 * @returns Plain-text email body.
 * @example
 * buildReviewRewardEmailText({ customerName: "Alex", promotionCode: "REVIEW10", amountOffLabel: "$10 off", expiresLabel: "April 1, 2026", shopUrl: "https://nnaud.io/products" });
 */
export function buildReviewRewardEmailText(
  data: ReviewRewardEmailData
): string {
  return [
    buildGreeting(data.customerName),
    "",
    `Thanks for submitting your review. Here is your one-time ${data.amountOffLabel} reward code:`,
    "",
    data.promotionCode,
    "",
    "Single use on a future order.",
    data.expiresLabel ? `Expires ${data.expiresLabel}.` : null,
    "",
    `Shop products: ${data.shopUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
