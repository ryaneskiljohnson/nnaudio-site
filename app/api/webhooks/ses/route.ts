/**
 * @fileoverview AWS SES/SNS webhook: receives SNS notifications (delivery, bounce, etc.) and subscription confirmations.
 * @module app/api/webhooks/ses/route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import MessageValidator from "sns-validator";

const validator = new MessageValidator();

/** Allowed SNS host pattern for SubscribeURL (prevents SSRF). */
const SNS_HOST_PATTERN = /^sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com(\.cn)?$/;

/**
 * Verifies that a URL is a valid AWS SNS endpoint (https + allowed host).
 * @param urlString - URL to check
 * @returns true if safe to fetch
 */
function isAllowedSnsUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    return u.protocol === "https:" && SNS_HOST_PATTERN.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Validates the raw SNS message body and returns the parsed message if valid.
 * In development, skips signature verification.
 * @param body - Raw request body string
 * @returns Validated SNS message or null if invalid
 */
async function verifySnsMessage(
  body: string
): Promise<Record<string, unknown> | null> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    return parsed;
  }

  return new Promise((resolve) => {
    validator.validate(parsed, (err: Error | null) => {
      if (err) {
        console.error("❌ SNS signature verification failed:", err.message);
        resolve(null);
        return;
      }
      resolve(parsed);
    });
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const snsMessage = await verifySnsMessage(body);
    if (!snsMessage) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const messageType = snsMessage.Type as string;

    if (messageType === "SubscriptionConfirmation") {
      const subscribeUrl = snsMessage.SubscribeURL as string | undefined;
      if (subscribeUrl && isAllowedSnsUrl(subscribeUrl)) {
        try {
          await fetch(subscribeUrl);
          console.log("✅ SNS subscription confirmed");
        } catch (error) {
          console.error("❌ Failed to confirm SNS subscription:", error);
        }
      } else if (subscribeUrl) {
        console.warn("⚠️ SubscribeURL rejected (not an allowed SNS URL)");
      }
      return NextResponse.json({ message: "Subscription confirmed" });
    }

    let message: Record<string, unknown>;
    if (messageType === "Notification") {
      const inner = snsMessage.Message;
      message =
        typeof inner === "string"
          ? (JSON.parse(inner) as Record<string, unknown>)
          : (inner as Record<string, unknown>);
    } else {
      message = snsMessage;
    }

    const eventType = message.eventType as string | undefined;
    const mail = message.mail as Record<string, unknown> | undefined;

    console.log("📧 SES Event received:", {
      eventType,
      messageId: mail?.messageId,
      timestamp: mail?.timestamp,
    });

    await supabase.from("email_webhook_logs").insert({
      provider: "ses",
      event_type: eventType,
      webhook_data: message,
      processed: false,
    });

    await processSESEvent(message);

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Error processing SES webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processSESEvent(event: Record<string, unknown>) {
  const { eventType, mail } = event;
  const mailObj = mail as Record<string, unknown> | undefined;
  const messageId = mailObj?.messageId as string | undefined;

  if (!messageId) {
    console.warn("⚠️ No messageId in SES event, skipping");
    return;
  }

  console.log(`🔄 Processing SES event: ${eventType} for message ${messageId}`);

  try {
    switch (eventType) {
      case "send":
        await handleSendEvent(event);
        break;
      case "delivery":
        await handleDeliveryEvent(event);
        break;
      case "bounce":
        await handleBounceEvent(event);
        break;
      case "complaint":
        await handleComplaintEvent(event);
        break;
      case "reject":
        await handleRejectEvent(event);
        break;
      default:
        console.log(`ℹ️ Unhandled SES event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${eventType} event:`, error);
  }
}

async function handleSendEvent(event: Record<string, unknown>) {
  const mail = event.mail as Record<string, unknown>;
  const messageId = mail.messageId as string;

  const { data: emailSend, error } = await supabase
    .from("email_sends")
    .select("*")
    .eq("message_id", messageId)
    .single();

  if (error || !emailSend) {
    console.warn(`⚠️ No email_sends record found for message ${messageId}`);
    return;
  }

  await supabase
    .from("email_sends")
    .update({
      status: "sent",
      sent_at: new Date((mail.timestamp as string) || 0).toISOString(),
    })
    .eq("id", emailSend.id);
}

async function handleDeliveryEvent(event: Record<string, unknown>) {
  const mail = event.mail as Record<string, unknown>;
  const delivery = event.delivery as Record<string, unknown>;
  const messageId = mail.messageId as string;

  const { data: emailSend, error } = await supabase
    .from("email_sends")
    .select("*")
    .eq("message_id", messageId)
    .single();

  if (error || !emailSend) {
    console.warn(`⚠️ No email_sends record found for message ${messageId}`);
    return;
  }

  await supabase
    .from("email_sends")
    .update({
      status: "delivered",
      delivered_at: new Date((delivery.timestamp as string) || 0).toISOString(),
    })
    .eq("id", emailSend.id);

  await supabase.rpc("increment_campaign_delivered", {
    campaign_id: emailSend.campaign_id,
  });
}

async function handleBounceEvent(event: Record<string, unknown>) {
  const mail = event.mail as Record<string, unknown>;
  const bounce = event.bounce as Record<string, unknown>;
  const messageId = mail.messageId as string;
  const bouncedRecipients = (bounce.bouncedRecipients as Record<string, unknown>[]) || [];
  const bounceReason =
    (bouncedRecipients[0] as Record<string, unknown>)?.diagnosticCode ||
    "Unknown bounce reason";

  const { data: emailSend, error } = await supabase
    .from("email_sends")
    .select("*")
    .eq("message_id", messageId)
    .single();

  if (error || !emailSend) {
    console.warn(`⚠️ No email_sends record found for message ${messageId}`);
    return;
  }

  await supabase
    .from("email_sends")
    .update({
      status: "bounced",
      bounced_at: new Date((bounce.timestamp as string) || 0).toISOString(),
      bounce_reason: String(bounceReason),
    })
    .eq("id", emailSend.id);

  await supabase.rpc("increment_campaign_bounced", {
    campaign_id: emailSend.campaign_id,
  });

  if (bounce.bounceType === "Permanent") {
    await supabase
      .from("subscribers")
      .update({
        status: "bounced",
        bounce_reason: String(bounceReason),
        bounced_at: new Date((bounce.timestamp as string) || 0).toISOString(),
      })
      .eq("id", emailSend.subscriber_id);
  }
}

async function handleComplaintEvent(event: Record<string, unknown>) {
  const mail = event.mail as Record<string, unknown>;
  const complaint = event.complaint as Record<string, unknown>;
  const messageId = mail.messageId as string;

  const { data: emailSend, error } = await supabase
    .from("email_sends")
    .select("*")
    .eq("message_id", messageId)
    .single();

  if (error || !emailSend) {
    console.warn(`⚠️ No email_sends record found for message ${messageId}`);
    return;
  }

  await supabase
    .from("subscribers")
    .update({
      status: "complained",
      complained_at: new Date(
        (complaint.timestamp as string) || 0
      ).toISOString(),
    })
    .eq("id", emailSend.subscriber_id);

  await supabase.rpc("increment_campaign_spam", {
    campaign_id: emailSend.campaign_id,
  });
}

async function handleRejectEvent(event: Record<string, unknown>) {
  const mail = event.mail as Record<string, unknown>;
  const reject = event.reject as Record<string, unknown>;
  const messageId = mail.messageId as string;

  const { data: emailSend, error } = await supabase
    .from("email_sends")
    .select("*")
    .eq("message_id", messageId)
    .single();

  if (error || !emailSend) {
    console.warn(`⚠️ No email_sends record found for message ${messageId}`);
    return;
  }

  await supabase
    .from("email_sends")
    .update({
      status: "rejected",
      bounce_reason:
        (reject.reason as string) || "Email rejected by SES",
    })
    .eq("id", emailSend.id);
}
