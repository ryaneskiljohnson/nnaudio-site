/**
 * @fileoverview Test helper for SendGrid Event Webhook: POSTs sample events to the webhook.
 * @module app/api/webhooks/sendgrid/test
 *
 * GET or POST with ?event=delivered|bounce|spamreport&messageId=... to simulate events.
 * Only for development; protect or disable in production.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return postTestEvent(request);
}

export async function POST(request: NextRequest) {
  return postTestEvent(request);
}

async function postTestEvent(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("event") || "delivered";
    const messageId = searchParams.get("messageId") || "test-message-id";

    const baseEvent = {
      email: "test@example.com",
      timestamp: Math.floor(Date.now() / 1000),
      sg_message_id: messageId,
      "smtp-id": `<${messageId}@ismtpd-555>`,
      sg_event_id: `test-${Date.now()}`,
    };

    let events: Record<string, unknown>[];
    switch (eventType) {
      case "delivered":
        events = [{ ...baseEvent, event: "delivered", response: "250 OK" }];
        break;
      case "bounce":
        events = [
          {
            ...baseEvent,
            event: "bounce",
            type: "bounce",
            reason: "500 unknown recipient",
            status: "5.0.0",
            bounce_classification: "Invalid Address",
          },
        ];
        break;
      case "spamreport":
        events = [{ ...baseEvent, event: "spamreport" }];
        break;
      case "processed":
        events = [{ ...baseEvent, event: "processed" }];
        break;
      default:
        return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/webhooks/sendgrid`;
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events),
    });
    const body = await response.text();

    return NextResponse.json({
      message: "Test webhook sent",
      eventType,
      messageId,
      webhookResponse: { status: response.status, body },
    });
  } catch (error) {
    console.error("SendGrid test webhook error:", error);
    return NextResponse.json(
      { error: "Failed to send test webhook" },
      { status: 500 }
    );
  }
}
