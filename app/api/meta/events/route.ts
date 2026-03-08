/**
 * Meta Conversions API Events Endpoint
 * 
 * POST /api/meta/events
 * 
 * Receives conversion events from the frontend and forwards them to Meta's Conversions API.
 * This is server-side tracking that works even with ad blockers and browser privacy features.
 * 
 * Environment Variables Required:
 * - NEXT_PUBLIC_META_PIXEL_ID: The Meta Pixel ID
 * - META_CONVERSIONS_API_TOKEN: Access token for Meta API (from Meta Business Account)
 * 
 * Request body example:
 * {
 *   "eventName": "Purchase",
 *   "userData": {
 *     "email": "user@example.com",
 *     "phone": "+1234567890",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "city": "New York",
 *     "state": "NY",
 *     "zip": "10001",
 *     "country": "US",
 *     "userId": "123456",
 *     "clientIp": "192.168.1.1",
 *     "clientUserAgent": "Mozilla/5.0...",
 *     "fbpId": "fb_pixel_id"
 *   },
 *   "customData": {
 *     "value": 99.99,
 *     "currency": "USD",
 *     "content_ids": ["product_1"],
 *     "num_items": 1,
 *     "status": "completed"
 *   },
 *   "testEventCode": "TEST12345" // Optional, for testing in Meta Events Manager
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  buildMetaEvent,
  normalizeMetaUserData,
  MetaEvent,
  META_EVENT_NAMES,
} from '@/utils/meta-conversions-api';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

// Type for request body
interface MetaEventRequest {
  eventName: string;
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    userId?: string;
    clientIp?: string;
    clientUserAgent?: string;
    fbpId?: string;
    fbcId?: string;
  };
  customData?: Record<string, any>;
  eventId?: string;
  testEventCode?: string;
  url?: string;
}

// Environment variables (trim token to avoid "Malformed access token" from trailing newlines)
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = (process.env.META_CONVERSIONS_API_TOKEN ?? '').trim().replace(/\r?\n/g, '');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_MODE = process.env.NODE_ENV === 'development';

// Meta API endpoint
const META_API_VERSION = 'v18.0';
const META_API_ENDPOINT = `https://graph.facebook.com/${META_API_VERSION}/${PIXEL_ID}/events`;

/**
 * Log event to Supabase for debugging/compliance
 */
async function logEventToSupabase(
  eventData: MetaEvent,
  request: MetaEventRequest,
  status: 'success' | 'failed' | 'test',
  error?: string
) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️ Supabase not configured, skipping event logging');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to insert into meta_conversion_events table
    // If table doesn't exist, just log to console
    const { error: insertError } = await (supabase as any)
      .from('meta_conversion_events')
      .insert({
        event_name: request.eventName,
        event_id: request.eventId,
        status,
        user_email: request.userData.email || null,
        user_id: request.userData.userId || null,
        custom_data: request.customData || null,
        error_message: error || null,
        client_ip: request.userData.clientIp || null,
        created_at: new Date().toISOString(),
      });

    if (insertError && !insertError.message.includes('relation')) {
      console.error('❌ Error logging to Supabase:', insertError);
    }
  } catch (err) {
    console.error('❌ Error in logEventToSupabase:', err);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Send event to Meta Conversions API
 */
async function sendToMetaAPI(
  events: MetaEvent[],
  testEventCode?: string
): Promise<{ success: boolean; error?: string; facebookId?: string }> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return {
      success: false,
      error: 'Missing Meta Pixel ID or Access Token in environment variables',
    };
  }

  try {
    const payload: Record<string, any> = { data: events };
    // Add test event code for debugging in Meta Events Manager
    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    // Meta requires access_token as query parameter (not in body)
    const url = new URL(META_API_ENDPOINT);
    url.searchParams.set('access_token', ACCESS_TOKEN);

    console.log(`📤 Sending ${events.length} event(s) to Meta API...`);

    // Add 10 second timeout to Meta API call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await response.json();
      clearTimeout(timeout);

      return handleMetaResponse(response, data);
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('⏱️ Meta API request timed out after 10 seconds');
        return {
          success: false,
          error: 'Meta API request timed out after 10 seconds',
        };
      }
      throw fetchError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error sending to Meta API:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle Meta API response
 */
function handleMetaResponse(response: Response, data: any) {
  if (!response.ok) {
    console.error('❌ Meta API error:', data);
    return {
      success: false,
      error: data.error?.message || 'Unknown Meta API error',
    };
  }

  console.log('✅ Event(s) sent to Meta successfully:', data);

  return {
    success: true,
    facebookId: data.events?.[0]?.facebookId,
  };
}

/**
 * Main POST handler
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Rate limiting: 100 requests per minute per IP
  if (!checkRateLimit(clientIp, 100, 60)) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${clientIp}`);
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    // Parse request body
    const body: MetaEventRequest = await request.json();

    // Validate required fields
    if (!body.eventName) {
      return NextResponse.json(
        { error: 'Missing required field: eventName' },
        { status: 400 }
      );
    }

    if (!body.userData || Object.keys(body.userData).length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: userData' },
        { status: 400 }
      );
    }

    // Validate event name (optional, but good practice)
    const validEventNames = Object.values(META_EVENT_NAMES);
    if (!validEventNames.includes(body.eventName as any)) {
      console.warn(`⚠️ Unusual event name: ${body.eventName}`);
      // Don't fail - allow custom event names
    }

    // Normalize user data (hash PII)
    const normalizedUserData = normalizeMetaUserData({
      ...body.userData,
      clientIp,
      clientUserAgent: request.headers.get('user-agent') || undefined,
    });

    // Build Meta event
    const metaEvent = buildMetaEvent(
      body.eventName,
      normalizedUserData,
      body.customData,
      {
        eventId: body.eventId,
        eventSourceUrl: body.url,
      }
    );

    // Log to Supabase (before sending to Meta)
    await logEventToSupabase(metaEvent as MetaEvent, body, 'success');

    // In test mode, just log and return success
    if (TEST_MODE && body.testEventCode) {
      console.log('🧪 Test mode - Event would be sent with test code:', body.testEventCode);
      return NextResponse.json({
        success: true,
        message: 'Event logged (test mode)',
        event: metaEvent,
      });
    }

    // Send to Meta API
    const result = await sendToMetaAPI([metaEvent as MetaEvent], body.testEventCode);

    if (!result.success) {
      await logEventToSupabase(metaEvent as MetaEvent, body, 'failed', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send event to Meta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event sent to Meta Conversions API',
      facebookId: result.facebookId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in /api/meta/events:', errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

