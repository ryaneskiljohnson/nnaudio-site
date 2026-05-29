/**
 * @fileoverview Auth registration API for direct form signups.
 * @module app/api/auth/register/route
 */

"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";
import { registerSchema } from "@/utils/apiSchemas";
import { validateCsrfToken } from "@/utils/csrf";
import {
  ATTRIBUTION_COOKIE_NAME,
  attributionToSubscriberMetadata,
  getSubscriberSource,
  parseAttributionCookie,
} from "@/utils/marketing/attribution";
import { findOrCreateCustomer } from "@/utils/stripe/actions";
import { linkPurchasesToUserByEmail } from "@/utils/stripe/link-purchases-to-user";

/**
 * @brief Handles account registration and initial subscriber creation.
 * @param request - Incoming registration form request.
 * @returns Registration result payload.
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp, 10, 60)) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const data = await request.formData();
    const csrfToken = data.get("csrf_token")?.toString();
    if (!validateCsrfToken(request, csrfToken)) {
      return NextResponse.json(
        { success: false, error: "Invalid security token. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const raw = {
      email: data.get("email")?.toString() ?? "",
      password: data.get("password")?.toString() ?? "",
      name: data.get("name")?.toString(),
    };

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = first.email?.[0] ?? first.password?.[0] ?? "Invalid input";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const attribution = parseAttributionCookie(
      request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value
    );

    const customer_id = await findOrCreateCustomer(email);

    // Register the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split("@")[0],
          customer_id,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/confirm`,
      },
    });

    if (authError) {
      return NextResponse.json(
        {
          success: false,
          error: authError.message,
        },
        { status: 400 }
      );
    }

    // Create subscriber for the new user
    if (authData.user) {
      try {
        await linkPurchasesToUserByEmail({
          userId: authData.user.id,
          email: authData.user.email || email,
          preferredCustomerId: customer_id,
        });
      } catch (linkError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to link purchases on register:", linkError);
        }
      }

      try {
        const { error: subscriberError } = await supabase
          .from('subscribers')
          .insert({
            id: authData.user.id,
            user_id: authData.user.id,
            email: authData.user.email,
            source: getSubscriberSource(attribution),
            status: 'active',
            tags: [
              'free-user',
              ...(attribution?.utm_source ? [`source:${attribution.utm_source}`] : []),
            ],
            metadata: {
              first_name: name?.split(' ')[0] || '',
              last_name: name?.split(' ').slice(1).join(' ') || '',
              subscription: 'none',
              auth_created_at: authData.user.created_at,
              profile_updated_at: new Date().toISOString(),
              ...attributionToSubscriberMetadata(attribution),
            }
          });

        if (subscriberError) {
          if (process.env.NODE_ENV !== "production") {
            console.error("Failed to create subscriber:", subscriberError);
          }
          // Don't fail the signup if subscriber creation fails
        } else if (process.env.NODE_ENV !== "production") {
          console.log("Subscriber created successfully");
        }
      } catch (subscriberError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Error creating subscriber:", subscriberError);
        }
        // Don't fail the signup if subscriber creation fails
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      user: authData.user,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during registration",
      },
      { status: 500 }
    );
  }
}
