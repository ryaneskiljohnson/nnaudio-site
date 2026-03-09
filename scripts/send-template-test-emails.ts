/**
 * Sends test emails for order confirmation and refund templates to a given address.
 * Loads .env.local; requires SENDGRID_API_KEY.
 * Usage: bun run scripts/send-template-test-emails.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sendEmail } from "../utils/email";
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
} from "../utils/order-confirmation-email";
import {
  buildRefundEmailHtml,
  buildRefundEmailText,
} from "../utils/refund-email";

const TO = "ryaneskiljohnson@gmail.com";

const orderConfirmationData = {
  customerEmail: TO,
  customerName: "Ryan",
  orderNumber: "TEST-ORDER-001",
  lineItems: [
    { name: "NNAudio Bundle – Monthly", quantity: 1, amount: "$6.00" },
    { name: "Prodigious – Orchestral Plugin", quantity: 1, amount: "$149.00" },
    { name: "Sound Pack: Cinematic Strings", quantity: 2, amount: "$29.00" },
  ],
  subtotal: "$213.00",
  total: "$213.00",
  receiptUrl: "https://dashboard.stripe.com/test/receipts/receipt_xxx",
  date: new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
};

const refundFullData = {
  customerEmail: TO,
  customerName: "Ryan",
  refundAmount: "$149.00",
  isPartial: false,
  originalAmount: null as string | null,
  reason: "requested_by_customer",
  date: new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
};

const refundPartialData = {
  customerEmail: TO,
  customerName: null as string | null,
  refundAmount: "$29.00",
  isPartial: true,
  originalAmount: "$213.00",
  reason: "requested_by_customer",
  date: new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
};

async function main() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ SENDGRID_API_KEY is not set. Use .env.local or export.");
    process.exit(1);
  }

  const from = "NNAudio Support <support@nnaud.io>";
  const replyTo = "support@nnaud.io";

  // 1. Order confirmation
  console.log("📤 Sending order confirmation test to", TO, "...");
  const orderResult = await sendEmail({
    to: TO,
    subject: "Your order confirmation – NNAud.io (test)",
    html: buildOrderConfirmationHtml(orderConfirmationData),
    text: buildOrderConfirmationText(orderConfirmationData),
    from,
    replyTo,
  });
  if (orderResult.success) {
    console.log("✅ Order confirmation sent. Message ID:", orderResult.messageId);
  } else {
    console.error("❌ Order confirmation failed:", orderResult.error);
    process.exit(1);
  }

  // 2. Refund (full)
  console.log("📤 Sending full refund test to", TO, "...");
  const refundFullResult = await sendEmail({
    to: TO,
    subject: "Your refund has been processed – NNAud.io (test – full refund)",
    html: buildRefundEmailHtml(refundFullData),
    text: buildRefundEmailText(refundFullData),
    from,
    replyTo,
  });
  if (refundFullResult.success) {
    console.log("✅ Full refund email sent. Message ID:", refundFullResult.messageId);
  } else {
    console.error("❌ Full refund email failed:", refundFullResult.error);
    process.exit(1);
  }

  // 3. Refund (partial)
  console.log("📤 Sending partial refund test to", TO, "...");
  const refundPartialResult = await sendEmail({
    to: TO,
    subject: "Your refund has been processed – NNAud.io (test – partial refund)",
    html: buildRefundEmailHtml(refundPartialData),
    text: buildRefundEmailText(refundPartialData),
    from,
    replyTo,
  });
  if (refundPartialResult.success) {
    console.log("✅ Partial refund email sent. Message ID:", refundPartialResult.messageId);
  } else {
    console.error("❌ Partial refund email failed:", refundPartialResult.error);
    process.exit(1);
  }

  console.log("\n✅ All three test emails sent to", TO);
}

main();
