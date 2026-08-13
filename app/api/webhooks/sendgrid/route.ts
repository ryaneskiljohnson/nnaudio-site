/**
 * @fileoverview SendGrid Event Webhook: receives delivery, bounce, spam report, etc.
 * @module app/api/webhooks/sendgrid/route
 *
 * Configure in SendGrid: Mail Settings → Event Webhook → HTTP Post URL to this route.
 * Events are logged to email_webhook_logs and used to update email_sends and subscribers.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** SendGrid event payload: array of event objects. */
type SendGridEvent = {
  email?: string;
  timestamp?: number;
  event?: string;
  sg_message_id?: string;
  "smtp-id"?: string;
  sg_event_id?: string;
  response?: string;
  reason?: string;
  status?: string;
  type?: string;
  bounce_classification?: string;
  [key: string]: unknown;
};

/**
 * Maps SendGrid deliverability events to subscriber suppression statuses.
 * We only use statuses supported by our DB enum.
 */
function getSuppressionStatusForEvent(
  eventType: string
): "bounced" | "complained" | "unsubscribed" | null {
  switch (eventType) {
    case "bounce":
    case "blocked":
    case "dropped":
      return "bounced";
    case "spamreport":
      return "complained";
    case "unsubscribe":
    case "group_unsubscribe":
      return "unsubscribed";
    default:
      return null;
  }
}

/**
 * Resolve message IDs for lookup. SendGrid uses sg_message_id; we may have stored X-Message-Id from send response.
 * Include sg_message_id, smtp-id (stripped), and prefix parts of sg_message_id in case we stored a shorter form.
 */
function getMessageIds(evt: SendGridEvent): string[] {
  const ids: string[] = [];
  const sg = evt.sg_message_id;
  if (sg) {
    ids.push(sg);
    const parts = sg.split(".");
    for (let i = 1; i < parts.length; i++) {
      ids.push(parts.slice(0, i).join("."));
    }
  }
  const smtpId = evt["smtp-id"];
  if (typeof smtpId === "string") {
    const stripped = smtpId.replace(/^<|>$/g, "");
    if (stripped && !ids.includes(stripped)) ids.push(stripped);
  }
  return ids;
}

/**
 * Find email_sends row by message_id (exact match to sg_message_id or smtp-id we stored when sending).
 */
async function findEmailSendByMessageIds(messageIds: string[]) {
  if (messageIds.length === 0) return { data: null, error: null };
  const { data, error } = await supabase
    .from("email_sends")
    .select("*")
    .in("message_id", messageIds)
    .limit(1)
    .maybeSingle();
  return { data, error };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let events: SendGridEvent[];
    try {
      events = JSON.parse(rawBody) as SendGridEvent[];
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ message: "No events" }, { status: 200 });
    }

    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    const signature = request.headers.get("x-twilio-email-event-webhook-signature");
    const timestamp = request.headers.get("x-twilio-email-event-webhook-timestamp");

    // Fail closed in production: a verification key and a valid signature are required.
    if (process.env.NODE_ENV === "production" && !verificationKey) {
      console.error(
        "❌ SENDGRID_WEBHOOK_VERIFICATION_KEY is not set; refusing unsigned webhook in production"
      );
      return NextResponse.json({ error: "Webhook verification not configured" }, { status: 401 });
    }

    if (verificationKey) {
      if (!signature || !timestamp) {
        return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
      }
      try {
        const { EventWebhook } = await import("@sendgrid/eventwebhook");
        const ew = new EventWebhook();
        const key = ew.convertPublicKeyToECDSA(verificationKey);
        if (!ew.verifySignature(key, rawBody, signature, timestamp)) {
          console.warn("⚠️ SendGrid webhook signature verification failed");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      } catch (e) {
        console.error("❌ SendGrid webhook verification error:", e);
        return NextResponse.json({ error: "Verification failed" }, { status: 401 });
      }
    }

    for (const evt of events) {
      const eventType = evt.event || evt.type || "unknown";
      console.log("📧 SendGrid event:", {
        event: eventType,
        sg_message_id: evt.sg_message_id,
        email: evt.email,
      });

      await supabase.from("email_webhook_logs").insert({
        provider: "sendgrid",
        event_type: eventType,
        webhook_data: evt as unknown as Record<string, unknown>,
        processed: false,
      });

      const messageIds = getMessageIds(evt);
      const { data: emailSend, error: findErr } = await findEmailSendByMessageIds(messageIds);
      if (findErr || !emailSend) {
        if (messageIds.length) {
          console.warn(`⚠️ No email_sends found for message ids: ${messageIds.join(", ")}`);
        }
        continue;
      }

      const ts = evt.timestamp ? new Date(evt.timestamp * 1000).toISOString() : new Date().toISOString();

      switch (eventType) {
        case "processed":
          await supabase
            .from("email_sends")
            .update({ status: "sent", sent_at: ts })
            .eq("id", emailSend.id);
          break;
        case "delivered":
          await supabase
            .from("email_sends")
            .update({ status: "delivered", delivered_at: ts })
            .eq("id", emailSend.id);
          if (emailSend.campaign_id) {
            await supabase.rpc("increment_campaign_delivered", {
              campaign_id: emailSend.campaign_id,
            });
          }
          break;
        case "bounce":
        case "blocked": {
          const reason =
            evt.reason || evt.bounce_classification || "Unknown bounce";
          await supabase
            .from("email_sends")
            .update({
              status: "bounced",
              bounced_at: ts,
              bounce_reason: String(reason),
            })
            .eq("id", emailSend.id);
          if (emailSend.campaign_id) {
            await supabase.rpc("increment_campaign_bounced", {
              campaign_id: emailSend.campaign_id,
            });
          }
          if (emailSend.subscriber_id) {
            await supabase
              .from("subscribers")
              .update({
                status: "bounced",
                bounce_reason: String(reason),
                bounced_at: ts,
              })
              .eq("id", emailSend.subscriber_id);
          }
          break;
        }
        case "dropped": {
          const reason = evt.reason || "Dropped by SendGrid";
          await supabase
            .from("email_sends")
            .update({
              status: "rejected",
              bounce_reason: String(reason),
            })
            .eq("id", emailSend.id);
          if (emailSend.subscriber_id) {
            await supabase
              .from("subscribers")
              .update({
                status: "bounced",
                bounce_reason: String(reason),
                bounced_at: ts,
              })
              .eq("id", emailSend.subscriber_id);
          }
          break;
        }
        case "spamreport":
          if (emailSend.subscriber_id) {
            await supabase
              .from("subscribers")
              .update({ status: "complained", complained_at: ts })
              .eq("id", emailSend.subscriber_id);
          }
          if (emailSend.campaign_id) {
            await supabase.rpc("increment_campaign_spam", {
              campaign_id: emailSend.campaign_id,
            });
          }
          break;
        case "unsubscribe":
        case "group_unsubscribe":
          if (emailSend.subscriber_id) {
            await supabase
              .from("subscribers")
              .update({
                status: "unsubscribed",
              })
              .eq("id", emailSend.subscriber_id);
          }
          break;
        default:
          console.log(`ℹ️ Unhandled SendGrid event type: ${eventType}`);
      }

      // Defensive fallback to ensure suppression is applied even if a new SendGrid event
      // type path is added without explicit subscriber status handling in the switch.
      const suppressionStatus = getSuppressionStatusForEvent(eventType);
      if (suppressionStatus && emailSend?.subscriber_id) {
        await supabase
          .from("subscribers")
          .update({ status: suppressionStatus })
          .eq("id", emailSend.subscriber_id);
      }
    }

    return NextResponse.json({ message: "Webhook processed" }, { status: 200 });
  } catch (error) {
    console.error("❌ SendGrid webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
