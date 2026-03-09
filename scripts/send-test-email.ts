/**
 * One-off script to send a test email via SendGrid.
 * Loads .env.local and sends to the given address.
 * Usage: bun run scripts/send-test-email.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { sendEmail } from "../utils/email";

const TO = "ryaneskiljohnson@gmail.com";

async function main() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ SENDGRID_API_KEY is not set. Use .env.local or export.");
    process.exit(1);
  }
  console.log("📤 Sending test email to", TO, "...");
  const result = await sendEmail({
    to: TO,
    subject: "SendGrid test from NNAudio",
    text: "This is a test email sent via SendGrid from the NNAudio site.",
    html: "<p>This is a test email sent via <strong>SendGrid</strong> from the NNAudio site.</p>",
    from: "NNAudio Support <support@nnaud.io>",
    replyTo: "support@nnaud.io",
  });
  if (result.success) {
    console.log("✅ Sent successfully. Message ID:", result.messageId);
  } else {
    console.error("❌ Send failed:", result.error);
    process.exit(1);
  }
}

main();
