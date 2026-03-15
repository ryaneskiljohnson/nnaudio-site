/**
 * @fileoverview Sends test emails for review invite and review reward to a given address.
 * @module scripts/send-review-test-emails
 *
 * Loads .env.local; requires SENDGRID_API_KEY.
 * @example bun run scripts/send-review-test-emails.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sendEmail } from "../utils/email";
import {
  buildReviewInviteEmailHtml,
  buildReviewInviteEmailText,
  buildReviewRewardEmailHtml,
  buildReviewRewardEmailText,
} from "../utils/reviews/review-emails";

const TO = "support@newnationllc.com";

const reviewInviteData = {
  customerName: "Test Customer",
  reviewUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://nnaud.io") + "/my-products",
  products: [
    { name: "Prodigious – Orchestral Plugin", slug: "prodigious" },
    { name: "Curves EQ", slug: "curves-eq" },
  ],
};

const reviewRewardData = {
  customerName: "Test Customer",
  promotionCode: "TEST-REVIEW-10",
  amountOffLabel: "$10 off",
  expiresLabel: "April 15, 2026",
  shopUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://nnaud.io") + "/products",
};

async function main() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ SENDGRID_API_KEY is not set. Use .env.local or export.");
    process.exit(1);
  }

  const from = "NNAudio Support <support@nnaud.io>";
  const replyTo = "support@nnaud.io";

  // 1. Review invite
  console.log("📤 Sending review invite test to", TO, "...");
  const inviteResult = await sendEmail({
    to: TO,
    subject: "Review your purchase and get $10 off (test)",
    html: buildReviewInviteEmailHtml(reviewInviteData),
    text: buildReviewInviteEmailText(reviewInviteData),
    from,
    replyTo,
    idempotencyKey: `test-review-invite-${Date.now()}`,
  });
  if (inviteResult.success) {
    console.log("✅ Review invite sent. Message ID:", inviteResult.messageId);
  } else {
    console.error("❌ Review invite failed:", inviteResult.error);
    process.exit(1);
  }

  // 2. Review reward
  console.log("📤 Sending review reward test to", TO, "...");
  const rewardResult = await sendEmail({
    to: TO,
    subject: "Your $10 review reward code (test)",
    html: buildReviewRewardEmailHtml(reviewRewardData),
    text: buildReviewRewardEmailText(reviewRewardData),
    from,
    replyTo,
    idempotencyKey: `test-review-reward-${Date.now()}`,
  });
  if (rewardResult.success) {
    console.log("✅ Review reward email sent. Message ID:", rewardResult.messageId);
  } else {
    console.error("❌ Review reward email failed:", rewardResult.error);
    process.exit(1);
  }

  console.log("\n✅ Both review test emails sent to", TO);
}

main();
