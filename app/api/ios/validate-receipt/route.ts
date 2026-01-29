"use server";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { createHash } from "crypto";

/**
 * ============================================================================
 * iOS RECEIPT VALIDATION API ENDPOINT
 * ============================================================================
 *
 * This endpoint handles validation of iOS StoreKit receipts from the Apple App Store.
 * It supports both production receipts (validated with Apple's servers) and test receipts
 * (validated locally for development/testing purposes).
 *
 * ## Receipt Validation Flow
 *
 * ### 1. Production Receipts (Normal Flow)
 *
 *   1. Receipt data is received as Base64-encoded string
 *   2. Receipt is cleaned and validated (Base64 format check)
 *   3. Receipt is sent to Apple's validation servers (following Apple's official recommendation):
 *      - First tries production environment (https://buy.itunes.apple.com/verifyReceipt)
 *      - If status 21007 is returned, receipt is from sandbox - tries sandbox URL
 *      - This ensures seamless validation during App Review (which tests in sandbox)
 *   4. Apple's response is parsed to extract subscription information
 *   5. Subscription is stored in `ios_subscriptions` table with `validation_status = "valid"` or `"test"`
 *   6. User's profile is updated with subscription status
 *
 * ### 2. Test Receipts (Development/Testing Flow)
 *
 *   Test receipts are identified by Apple's `environment` field in the validation response.
 *
 *   Detection:
 *   - Apple returns `environment: "Sandbox"` for test receipts
 *   - Apple returns `environment: "Production"` for real receipts
 *   - This is determined automatically from Apple's response after successful validation
 *
 *   Storage:
 *   - Stored with `validation_status = "test"` if environment is "Sandbox"
 *   - Stored with `validation_status = "valid"` if environment is "Production"
 *   - Test receipts use actual expiration dates from Apple (not 6-hour expiration)
 *
 *   Cleanup:
 *   - Expired test receipts are automatically deleted when `updateUserProStatus()` runs
 *   - Prevents database bloat from accumulated test data
 *
 * ## Request Body
 *
 * ```typescript
 * {
 *   receiptData: string;      // Base64-encoded receipt data (required)
 *   userId?: string;          // User ID (optional if accessToken provided)
 *   accessToken?: string;     // Supabase access token (optional if userId provided)
 *   productId?: string;       // Product ID for test receipts (optional)
 * }
 * ```
 *
 * ## Response
 *
 * Success (200):
 * ```typescript
 * {
 *   success: true,
 *   subscription: {
 *     type: "monthly" | "annual" | "lifetime",
 *     expiresDate: string,      // ISO 8601 date string
 *     isActive: boolean,
 *     transactionId: string,
 *     isTestReceipt: boolean    // true if this was a test receipt
 *   }
 * }
 * ```
 *
 * Error (400/401/404/500):
 * ```typescript
 * {
 *   error: string,
 *   details?: string
 * }
 * ```
 *
 * ## Apple Status Codes
 *
 * - `0`: Success - Receipt is valid
 * - `21004`: Shared secret mismatch or receipt invalid (often indicates test receipt)
 * - `21005`: Receipt server unavailable
 * - `21007`: Receipt is from production but sent to sandbox
 * - `21008`: Receipt is from sandbox but sent to production
 * - `21010`: Receipt data is malformed
 *
 * ## Test Receipt Handling
 *
 * Test receipts are identified by Apple's `environment` field in the validation response.
 * When Apple successfully validates a receipt, it includes `environment: "Sandbox"` for
 * test receipts or `environment: "Production"` for real receipts.
 *
 * **How test receipts are identified:**
 * - After successful Apple validation, check `response.environment === "Sandbox"`
 * - No need for complex status code detection or local validation
 * - Simpler and more reliable than the old approach
 *
 * **When are test receipts deleted?**
 * - When `updateUserProStatus()` is called and finds expired test receipts
 * - Only receipts with `validation_status = "test"` and `expires_date < now` are deleted
 * - This happens automatically on every subscription status check
 *
 * ## Database Schema
 *
 * Receipts are stored in the `ios_subscriptions` table:
 * - `validation_status`: "valid" (production) or "test" (sandbox/test receipt)
 * - `expires_date`: Actual expiration date from Apple (same for both test and production)
 * - `receipt_data`: Original Base64 receipt data
 * - `apple_validation_response`: Full JSON response from Apple (includes environment field)
 *
 * @route POST /api/ios/validate-receipt
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[validate-receipt] Received receipt validation request");
    const body = await request.json();
    const { receiptData, userId, accessToken, productId } = body;

    console.log("[validate-receipt] Request body:", {
      hasReceiptData: !!receiptData,
      receiptDataLength: receiptData?.length || 0,
      receiptDataType: typeof receiptData,
      receiptDataPreview: receiptData?.substring(0, 50) || "N/A",
      hasUserId: !!userId,
      hasAccessToken: !!accessToken,
    });

    if (!receiptData) {
      console.log("[validate-receipt] Error: No receipt data provided");
      return NextResponse.json(
        { error: "Receipt data is required" },
        { status: 400 }
      );
    }

    // Clean receipt data - remove any whitespace/newlines that might have been added
    // Base64 strings should not have whitespace, but we preserve the original for comparison
    let cleanedReceiptData = receiptData.trim().replace(/\s/g, "");
    console.log(
      "[validate-receipt] Cleaned receipt data length:",
      cleanedReceiptData.length
    );
    console.log(
      "[validate-receipt] Original receipt data length:",
      receiptData.length
    );

    // Validate that receipt data is valid base64 and fix any padding issues
    try {
      const decoded = Buffer.from(cleanedReceiptData, "base64");
      console.log(
        "[validate-receipt] Receipt data is valid base64, decoded size:",
        decoded.length,
        "bytes"
      );

      // Re-encode to ensure it's properly formatted (this fixes any padding issues)
      const reencoded = decoded.toString("base64");
      if (reencoded !== cleanedReceiptData) {
        console.log(
          "[validate-receipt] WARNING - Receipt data re-encoding doesn't match original (fixing padding issues)"
        );
        console.log(
          "[validate-receipt] Original length:",
          cleanedReceiptData.length,
          "Re-encoded length:",
          reencoded.length
        );
        // Use the properly re-encoded version to ensure correct padding
        cleanedReceiptData = reencoded;
        console.log(
          "[validate-receipt] Using re-encoded receipt data with proper padding"
        );
      } else {
        console.log("[validate-receipt] Receipt data padding is correct");
      }
    } catch (base64Error) {
      console.error(
        "[validate-receipt] ERROR - Receipt data is NOT valid base64:",
        base64Error
      );
      console.error(
        "[validate-receipt] Receipt data preview (first 100 chars):",
        receiptData.substring(0, 100)
      );
      return NextResponse.json(
        { error: "Invalid receipt data format (not valid base64)" },
        { status: 400 }
      );
    }

    if (!userId && !accessToken) {
      return NextResponse.json(
        { error: "Either userId or accessToken is required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServiceRole();
    console.log("[validate-receipt] Supabase service role client created");

    // If accessToken is provided, get userId from it
    let resolvedUserId = userId;
    if (!resolvedUserId && accessToken) {
      console.log("[validate-receipt] Resolving userId from accessToken...");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        console.log(
          "[validate-receipt] ERROR - Invalid access token:",
          authError
        );
        return NextResponse.json(
          { error: "Invalid access token" },
          { status: 401 }
        );
      }
      resolvedUserId = user.id;
      console.log(
        "[validate-receipt] Resolved userId:",
        resolvedUserId,
        "Email:",
        user.email
      );
    } else if (resolvedUserId) {
      console.log("[validate-receipt] Using provided userId:", resolvedUserId);
    } else {
      console.log(
        "[validate-receipt] ERROR - No userId or accessToken provided"
      );
    }

    // Validate receipt with Apple
    console.log("[validate-receipt] Starting Apple receipt validation...");
    const validationResult = await validateReceiptWithApple(cleanedReceiptData);
    console.log("[validate-receipt] Apple validation result:", {
      valid: validationResult.valid,
      error: validationResult.error,
      hasAppleResponse: !!validationResult.appleResponse,
      isTestReceipt: validationResult.isTestReceipt,
    });

    // If validation failed, return error
    if (!validationResult.valid) {
      console.log(
        "[validate-receipt] ERROR - Apple validation failed:",
        validationResult.error
      );
      return NextResponse.json(
        {
          error: "Receipt validation failed",
          details: validationResult.error,
        },
        { status: 400 }
      );
    }

    // Determine if this is a test receipt based on Apple's environment field
    // Apple returns environment: "Sandbox" for test receipts, "Production" for real ones
    const isTestReceipt = validationResult.isTestReceipt ?? false;
    console.log(
      "[validate-receipt] Receipt is test receipt:",
      isTestReceipt,
      "(based on Apple environment field)"
    );

    console.log(
      "[validate-receipt] Receipt validation successful, proceeding to extract subscription info..."
    );

    // Validate bundle ID to ensure receipt is from the correct app
    const expectedBundleId = "com.NNAudio.Cymasphere";
    const receiptBundleId = validationResult.appleResponse?.receipt?.bundle_id;

    if (receiptBundleId && receiptBundleId !== expectedBundleId) {
      console.log("[validate-receipt] ERROR - Bundle ID mismatch!");
      console.log("[validate-receipt] Expected:", expectedBundleId);
      console.log("[validate-receipt] Received:", receiptBundleId);
      return NextResponse.json(
        {
          error: "Receipt bundle ID does not match expected app",
          details: `Expected ${expectedBundleId}, got ${receiptBundleId}`,
        },
        { status: 400 }
      );
    } else if (!receiptBundleId) {
      console.log(
        "[validate-receipt] WARNING - No bundle_id in Apple response, skipping bundle ID validation"
      );
    } else {
      console.log(
        "[validate-receipt] Bundle ID validated successfully:",
        receiptBundleId
      );
    }

    // Extract subscription information from Apple's response
    console.log("Extracting subscription info from Apple response...");
    const subscriptionInfo = extractSubscriptionInfo(
      validationResult.appleResponse
    );

    if (!subscriptionInfo) {
      console.log(
        "No valid subscription found in receipt. Apple response:",
        JSON.stringify(validationResult.appleResponse, null, 2)
      );
      return NextResponse.json(
        { error: "No valid subscription found in receipt" },
        { status: 400 }
      );
    }

    console.log("Subscription info extracted:", {
      productId: subscriptionInfo.productId,
      isActive: subscriptionInfo.isActive,
      expiresDate: subscriptionInfo.expiresDate,
      transactionId: subscriptionInfo.transactionId,
    });

    // Map iOS product ID to subscription type
    console.log(
      "[validate-receipt] Mapping product ID to subscription type:",
      subscriptionInfo.productId
    );
    const subscriptionType = mapProductIdToSubscriptionType(
      subscriptionInfo.productId
    );
    console.log(
      "[validate-receipt] Mapped subscription type:",
      subscriptionType
    );

    if (subscriptionType === "none") {
      console.log(
        "[validate-receipt] ERROR - Unknown product ID:",
        subscriptionInfo.productId
      );
      return NextResponse.json(
        { error: "Unknown product ID: " + subscriptionInfo.productId },
        { status: 400 }
      );
    }

    // Get user's profile
    console.log(
      "[validate-receipt] Fetching user profile for userId:",
      resolvedUserId
    );
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", resolvedUserId)
      .single();

    if (profileError || !profile) {
      console.log(
        "[validate-receipt] ERROR - User profile not found:",
        profileError
      );
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }
    console.log("[validate-receipt] User profile found:", profile.id);

    // Check if subscription already exists
    console.log(
      "[validate-receipt] Checking for existing subscription with transaction_id:",
      subscriptionInfo.transactionId
    );
    const { data: existingSubscription, error: existingError } = await (supabase as any)
      .from("ios_subscriptions")
      .select("*")
      .eq("transaction_id", subscriptionInfo.transactionId)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      // PGRST116 = not found, which is OK
      console.log(
        "[validate-receipt] ERROR checking existing subscription:",
        existingError
      );
    } else if (existingSubscription) {
      console.log(
        "[validate-receipt] Found existing subscription, will update:",
        existingSubscription.id
      );
    } else {
      console.log(
        "[validate-receipt] No existing subscription found, will create new one"
      );
    }

    // Use the actual expiration date from Apple (same for both test and production receipts)
    const finalExpiresDate = subscriptionInfo.expiresDate;
    console.log(
      "[validate-receipt] Using expiration date from Apple:",
      finalExpiresDate.toISOString(),
      isTestReceipt ? "(test receipt)" : "(production receipt)"
    );

    if (existingSubscription) {
      // Update existing subscription
      console.log(
        "[validate-receipt] Updating existing iOS subscription in database..."
      );
      const { error: updateError } = await (supabase as any)
        .from("ios_subscriptions")
        .update({
          subscription_type: subscriptionType,
          expires_date: finalExpiresDate.toISOString(),
          receipt_data: receiptData,
          receipt_validated_at: new Date().toISOString(),
          validation_status: isTestReceipt ? "test" : "valid",
          apple_validation_response: validationResult.appleResponse,
          is_active: subscriptionInfo.isActive,
          auto_renew_status: subscriptionInfo.autoRenewStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", subscriptionInfo.transactionId);

      if (updateError) {
        console.error(
          "[validate-receipt] ERROR - Failed to update iOS subscription:",
          updateError
        );
        return NextResponse.json(
          { error: "Failed to update subscription" },
          { status: 500 }
        );
      }
      console.log(
        "[validate-receipt] Successfully updated iOS subscription in database"
      );
    } else {
      // Create new subscription record
      console.log(
        "[validate-receipt] Creating new iOS subscription in database..."
      );
      const { error: insertError } = await supabase
        .from("ios_subscriptions")
        .insert({
          user_id: resolvedUserId,
          profile_id: profile.id,
          transaction_id: subscriptionInfo.transactionId,
          original_transaction_id: subscriptionInfo.originalTransactionId,
          product_id: subscriptionInfo.productId,
          subscription_type: subscriptionType,
          purchase_date: subscriptionInfo.purchaseDate.toISOString(),
          expires_date: finalExpiresDate.toISOString(),
          receipt_data: receiptData,
          receipt_validated_at: new Date().toISOString(),
          validation_status: isTestReceipt ? "test" : "valid",
          apple_validation_response: validationResult.appleResponse,
          is_active: subscriptionInfo.isActive,
          auto_renew_status: subscriptionInfo.autoRenewStatus,
        });

      if (insertError) {
        console.error(
          "[validate-receipt] ERROR - Failed to insert iOS subscription:",
          insertError
        );
        return NextResponse.json(
          { error: "Failed to save subscription" },
          { status: 500 }
        );
      }
      console.log(
        "[validate-receipt] Successfully created iOS subscription in database"
      );
    }

    // Update user's profile subscription status
    // Check if user has active iOS subscription
    console.log(
      "[validate-receipt] Checking for active iOS subscriptions for user..."
    );
    const { data: activeSubscription, error: activeSubError } = await (supabase as any)
      .from("ios_subscriptions")
      .select("subscription_type, expires_date")
      .eq("user_id", resolvedUserId)
      .eq("is_active", true)
      .eq("validation_status", "valid")
      .gt("expires_date", new Date().toISOString())
      .order("expires_date", { ascending: false })
      .limit(1)
      .single();

    if (activeSubError && activeSubError.code !== "PGRST116") {
      console.log(
        "[validate-receipt] ERROR checking active subscriptions:",
        activeSubError
      );
    } else if (activeSubscription) {
      console.log(
        "[validate-receipt] Found active iOS subscription:",
        activeSubscription
      );
    } else {
      console.log("[validate-receipt] No active iOS subscription found");
    }

    // Also check Stripe subscription
    const { data: profileWithStripe } = await supabase
      .from("profiles")
      .select("customer_id")
      .eq("id", resolvedUserId)
      .single();

    let finalSubscriptionType: "none" | "monthly" | "annual" | "lifetime" =
      "none";
    let finalExpiration: string | null = null;

    if (activeSubscription) {
      finalSubscriptionType = activeSubscription.subscription_type;
      finalExpiration = activeSubscription.expires_date;
    } else if (profileWithStripe?.customer_id) {
      // Check Stripe subscription (import from existing utility)
      const { customerPurchasedProFromSupabase } = await import(
        "@/utils/stripe/supabase-stripe"
      );
      const stripeResult = await customerPurchasedProFromSupabase(
        profileWithStripe.customer_id
      );

      if (stripeResult.success && stripeResult.subscription !== "none") {
        finalSubscriptionType = stripeResult.subscription;
        if (stripeResult.subscription_expiration) {
          finalExpiration = stripeResult.subscription_expiration.toISOString();
        }
      }
    }

    // Update profile with subscription and source
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        subscription: finalSubscriptionType,
        subscription_expiration: finalExpiration,
        subscription_source: "ios", // Mark subscription as coming from iOS App Store
      })
      .eq("id", resolvedUserId);

    if (profileUpdateError) {
      console.error("Error updating profile subscription:", profileUpdateError);
      // Don't fail the request, subscription is saved
    }

    return NextResponse.json({
      success: true,
      subscription: {
        type: subscriptionType,
        expiresDate: finalExpiresDate.toISOString(),
        isActive: subscriptionInfo.isActive,
        transactionId: subscriptionInfo.transactionId,
        isTestReceipt: isTestReceipt,
      },
    });
  } catch (error) {
    console.error("[validate-receipt] ========== EXCEPTION ==========");
    console.error("[validate-receipt] Error validating iOS receipt:", error);
    console.error(
      "[validate-receipt] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * ============================================================================
 * APPLE RECEIPT VALIDATION FUNCTION
 * ============================================================================
 *
 * Validates a receipt with Apple's App Store validation servers.
 *
 * ## Validation Strategy
 *
 * Following Apple's official recommendation (Technical Note TN2413):
 *
 * 1. **Production First**: Always tries production environment first
 *    - Production URL: https://buy.itunes.apple.com/verifyReceipt
 *    - Production requires shared secret
 *    - This ensures seamless validation during App Review (which tests in sandbox)
 *
 * 2. **Sandbox Fallback**: If production fails with 21007, tries sandbox
 *    - Status 21007 = receipt is from sandbox but sent to production
 *    - Sandbox URL: https://sandbox.itunes.apple.com/verifyReceipt
 *    - Sandbox shared secret is optional
 *
 * 3. **Test Receipt Detection**: Identifies test receipts from Apple's response
 *    - Checks `environment` field in Apple's response
 *    - Returns `isTestReceipt: true` if `environment === "Sandbox"`
 *
 * ## Apple Validation URLs
 *
 * Following Apple's official recommendation (Technical Note TN2413):
 *
 * - **Production First**: `https://buy.itunes.apple.com/verifyReceipt`
 *   - Always validate against production first
 *   - Requires shared secret
 *   - If status 21007 is returned, receipt is from sandbox
 *
 * - **Sandbox Fallback**: `https://sandbox.itunes.apple.com/verifyReceipt`
 *   - Used when production returns status 21007
 *   - Shared secret is optional
 *   - This approach ensures seamless validation during App Review
 *
 * ## Request Format
 *
 * ```json
 * {
 *   "receipt-data": "<base64_receipt>",
 *   "password": "<shared_secret>",  // Optional for sandbox
 *   "exclude-old-transactions": false
 * }
 * ```
 *
 * ## Response Format
 *
 * Success (status: 0):
 * ```json
 * {
 *   "status": 0,
 *   "environment": "Sandbox" | "Production",
 *   "receipt": { ... },
 *   "latest_receipt_info": [ ... ],
 *   "pending_renewal_info": [ ... ]
 * }
 * ```
 *
 * Error (status: non-zero):
 * ```json
 * {
 *   "status": 21004,  // Error code
 *   "receipt": { ... } // May contain bundle_id even on error
 * }
 * ```
 *
 * @param receiptData - Base64-encoded receipt data to validate
 * @returns Validation result with Apple's response or error details
 * @returns isTestReceipt - Flag indicating if this might be a test receipt
 */
async function validateReceiptWithApple(receiptData: string): Promise<{
  valid: boolean;
  appleResponse?: any;
  error?: string;
  isTestReceipt?: boolean;
}> {
  try {
    // Follow Apple's official recommendation: Always try production first, then sandbox if 21007
    // See: https://developer.apple.com/library/archive/technotes/tn2413/_index.html
    // This ensures seamless validation during App Review (which tests in sandbox)
    const sharedSecret = process.env.APPLE_SHARED_SECRET;

    if (!sharedSecret) {
      console.warn(
        "[validate-receipt] WARNING: APPLE_SHARED_SECRET not set. Production validation requires shared secret."
      );
    }

    const validateWithURL = async (url: string, useSecret: boolean = true) => {
      const body: any = {
        "receipt-data": receiptData,
        "exclude-old-transactions": false,
      };

      // Include shared secret for production (required) and optionally for sandbox
      if (useSecret && sharedSecret) {
        body.password = sharedSecret;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return await response.json();
    };

    // Step 1: Try production first (Apple's official recommendation)
    console.log(
      "[validate-receipt] Trying production validation URL first (Apple's recommended approach)..."
    );
    let result = await validateWithURL(
      "https://buy.itunes.apple.com/verifyReceipt",
      true // Production requires shared secret
    );
    console.log(
      "[validate-receipt] Production validation result status:",
      result.status
    );

    // Status 0 = valid receipt
    if (result.status === 0) {
      console.log(
        "[validate-receipt] Receipt validated successfully with production"
      );
      const isTestReceipt = result.environment === "Sandbox";
      console.log(
        "[validate-receipt] Environment:",
        result.environment,
        "- Test receipt:",
        isTestReceipt
      );
      return { valid: true, appleResponse: result, isTestReceipt };
    }

    // Step 2: If production returns 21007, receipt is from sandbox - try sandbox URL
    // Status 21007 = receipt is from sandbox but sent to production
    if (result.status === 21007) {
      console.log(
        "[validate-receipt] Got status 21007 - receipt is from sandbox, trying sandbox URL..."
      );
      // Try sandbox without secret first (it's optional)
      result = await validateWithURL(
        "https://sandbox.itunes.apple.com/verifyReceipt",
        false
      );
      console.log(
        "[validate-receipt] Sandbox validation (without secret) result status:",
        result.status
      );

      if (result.status === 0) {
        console.log(
          "[validate-receipt] Receipt validated successfully with sandbox"
        );
        const isTestReceipt = result.environment === "Sandbox";
        console.log(
          "[validate-receipt] Environment:",
          result.environment,
          "- Test receipt:",
          isTestReceipt
        );
        return { valid: true, appleResponse: result, isTestReceipt };
      }

      // If sandbox validation fails with 21004 and we have a shared secret, try with secret
      if (result.status === 21004 && sharedSecret) {
        console.log(
          "[validate-receipt] Got 21004 without secret, retrying sandbox WITH shared secret..."
        );
        result = await validateWithURL(
          "https://sandbox.itunes.apple.com/verifyReceipt",
          true
        );
        console.log(
          "[validate-receipt] Sandbox validation (with secret) result status:",
          result.status
        );
        if (result.status === 0) {
          console.log(
            "[validate-receipt] Receipt validated successfully with sandbox (with secret)"
          );
          const isTestReceipt = result.environment === "Sandbox";
          console.log(
            "[validate-receipt] Environment:",
            result.environment,
            "- Test receipt:",
            isTestReceipt
          );
          return { valid: true, appleResponse: result, isTestReceipt };
        }
      }
    }

    console.log(
      "[validate-receipt] Final validation failed with status:",
      result.status
    );
    console.log(
      "[validate-receipt] Full Apple response:",
      JSON.stringify(result, null, 2)
    );

    // Log ALL available fields from Apple response (even on error)
    console.log("[validate-receipt] Apple response keys:", Object.keys(result));
    console.log("[validate-receipt] Apple response status:", result.status);
    console.log(
      "[validate-receipt] Apple response environment:",
      result.environment
    );

    // Log receipt bundle ID if available (even in error response)
    if (result.receipt) {
      console.log(
        "[validate-receipt] Receipt object exists, keys:",
        Object.keys(result.receipt)
      );
      if (result.receipt.bundle_id) {
        console.log(
          "[validate-receipt] Receipt bundle ID from Apple:",
          result.receipt.bundle_id
        );
        console.log(
          "[validate-receipt] Expected bundle ID: com.NNAudio.Cymasphere"
        );
        console.log(
          "[validate-receipt] Bundle ID match:",
          result.receipt.bundle_id === "com.NNAudio.Cymasphere"
        );
        if (result.receipt.bundle_id !== "com.NNAudio.Cymasphere") {
          console.log("[validate-receipt] *** BUNDLE ID MISMATCH DETECTED ***");
          console.log(
            "[validate-receipt] Receipt has:",
            result.receipt.bundle_id
          );
          console.log("[validate-receipt] Expected:", "com.NNAudio.Cymasphere");
        }
      } else {
        console.log(
          "[validate-receipt] WARNING - No bundle_id in receipt object"
        );
      }
      if (result.receipt.application_version) {
        console.log(
          "[validate-receipt] Receipt app version:",
          result.receipt.application_version
        );
      }
      if (result.receipt.original_application_version) {
        console.log(
          "[validate-receipt] Receipt original app version:",
          result.receipt.original_application_version
        );
      }
    } else {
      console.log(
        "[validate-receipt] WARNING - No receipt object in Apple response"
      );
    }

    // Log if receipt has any subscription data
    if (result.receipt && result.receipt.in_app) {
      console.log(
        "[validate-receipt] Receipt contains",
        result.receipt.in_app.length,
        "in-app purchases"
      );
      if (result.receipt.in_app.length > 0) {
        console.log(
          "[validate-receipt] First IAP product_id:",
          result.receipt.in_app[0].product_id
        );
      }
    }

    if (result.latest_receipt_info) {
      console.log(
        "[validate-receipt] Receipt contains",
        result.latest_receipt_info.length,
        "latest receipt info items"
      );
      if (result.latest_receipt_info.length > 0) {
        console.log(
          "[validate-receipt] First latest_receipt_info product_id:",
          result.latest_receipt_info[0].product_id
        );
      }
    }

    // Special handling for 21004 - might mean receipt is invalid/expired or wrong app
    if (result.status === 21004) {
      console.log("[validate-receipt] ERROR 21004 - Possible causes:");
      console.log(
        "[validate-receipt] 1. Receipt is invalid or expired (sandbox receipts expire quickly)"
      );
      console.log(
        "[validate-receipt] 2. Receipt is from a different app/bundle ID"
      );
      console.log("[validate-receipt] 3. Receipt format is corrupted");
      console.log(
        "[validate-receipt] 4. Shared secret mismatch (but we tried without secret too)"
      );
      console.log(
        "[validate-receipt] 5. Receipt might be empty (no active subscriptions)"
      );

      // Check if receipt has any data that might help debug
      console.log(
        "[validate-receipt] Receipt data length:",
        receiptData.length
      );
      console.log(
        "[validate-receipt] Receipt data preview:",
        receiptData.substring(0, 100)
      );
      console.log(
        "[validate-receipt] Receipt data ends with:",
        receiptData.substring(Math.max(0, receiptData.length - 50))
      );

      // Try to decode and inspect receipt structure (if possible)
      try {
        // Base64 decode the receipt to check if it's valid
        const decoded = Buffer.from(receiptData, "base64");
        console.log(
          "[validate-receipt] Receipt decoded successfully, size:",
          decoded.length,
          "bytes"
        );
        console.log(
          "[validate-receipt] Receipt is valid base64, but Apple rejected it with 21004"
        );
        console.log("[validate-receipt] This likely means:");
        console.log(
          "[validate-receipt] - The receipt is expired (sandbox receipts expire quickly)"
        );
        console.log(
          "[validate-receipt] - The bundle ID doesn't match the app in App Store Connect"
        );
        console.log(
          "[validate-receipt] - The receipt is from a different Apple Developer account"
        );
        console.log(
          "[validate-receipt] - The in-app purchases are not created in App Store Connect"
        );
        console.log(
          "[validate-receipt] - The in-app purchases are not associated with the app"
        );
        console.log(
          "[validate-receipt] - The in-app purchases are not in a valid state for testing"
        );
      } catch (decodeError) {
        console.log(
          "[validate-receipt] Receipt is NOT valid base64:",
          decodeError
        );
      }
    }

    // Build a more helpful error message
    let errorMessage = `Apple validation failed with status: ${result.status}`;
    if (result.status === 21004) {
      errorMessage +=
        ". Receipt may be invalid, expired, or from a different app/bundle ID.";

      // Include bundle ID information if available (even in error response)
      if (result.receipt && result.receipt.bundle_id) {
        const receiptBundleId = result.receipt.bundle_id;
        const expectedBundleId = "com.NNAudio.Cymasphere";
        errorMessage += ` Receipt bundle ID: "${receiptBundleId}"`;
        if (receiptBundleId !== expectedBundleId) {
          errorMessage += ` (Expected: "${expectedBundleId}") - BUNDLE ID MISMATCH!`;
        } else {
          errorMessage += " (matches expected bundle ID)";
        }
      } else {
        errorMessage +=
          " (No bundle ID in Apple response - receipt may be completely invalid)";
      }

      errorMessage += " For sandbox testing, verify in App Store Connect:";
      errorMessage +=
        ' 1. The app is created (even if not submitted) with bundle ID "com.NNAudio.Cymasphere"';
      errorMessage += " 2. The in-app purchases are created:";
      errorMessage += "    - com.NNAudio.Cymasphere.annual.plan";
      errorMessage += "    - com.NNAudio.Cymasphere.monthly.plan";
      errorMessage += " 3. The in-app purchases are associated with your app";
      errorMessage +=
        " 4. You are signed in with a sandbox tester account on your device";
      errorMessage +=
        " 5. Try restoring purchases if this is a fresh purchase (sandbox receipts may take a moment to propagate)";
    }

    return {
      valid: false,
      error: errorMessage,
      appleResponse: result,
      isTestReceipt: false,
    };
  } catch (error) {
    console.error("Error validating with Apple:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * ============================================================================
 * SUBSCRIPTION INFO EXTRACTION FUNCTION
 * ============================================================================
 *
 * Extracts subscription information from Apple's validation response.
 *
 * ## Data Sources (Priority Order)
 *
 * 1. **latest_receipt_info** (Primary)
 *    - Contains most recent subscription transactions
 *    - Includes expiration dates for active subscriptions
 *    - Preferred source for subscription data
 *
 * 2. **receipt.in_app** (Fallback)
 *    - Contains all in-app purchase transactions
 *    - Used if latest_receipt_info is not available
 *    - Takes the last transaction (most recent)
 *
 * ## Extracted Information
 *
 * - **transactionId**: Unique transaction ID from StoreKit
 * - **originalTransactionId**: Original transaction ID (for renewals)
 * - **productId**: Product ID from App Store Connect
 * - **purchaseDate**: When the subscription was purchased
 * - **expiresDate**: When the subscription expires
 * - **isActive**: Whether subscription is currently active (not expired)
 * - **autoRenewStatus**: Whether subscription is set to auto-renew
 *
 * ## Date Handling
 *
 * Apple provides dates as milliseconds since epoch:
 * - `purchase_date_ms`: Purchase timestamp in milliseconds
 * - `expires_date_ms`: Expiration timestamp in milliseconds
 *
 * These are converted to JavaScript Date objects for processing.
 *
 * ## Active Status Calculation
 *
 * A subscription is considered active if:
 * - `expires_date_ms > current_time`
 * - This ensures expired subscriptions are not treated as active
 *
 * @param appleResponse - Apple's validation response object
 * @returns Extracted subscription information or null if no valid subscription found
 */
function extractSubscriptionInfo(appleResponse: any): {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: Date;
  expiresDate: Date;
  isActive: boolean;
  autoRenewStatus: boolean;
} | null {
  try {
    console.log(
      "[validate-receipt] Extracting subscription info from Apple response..."
    );
    console.log(
      "[validate-receipt] Apple response keys:",
      Object.keys(appleResponse)
    );

    // For auto-renewable subscriptions, data is in latest_receipt_info
    // Check this first as it's the primary source for subscription data
    const latestReceiptInfo = appleResponse.latest_receipt_info;

    if (
      latestReceiptInfo &&
      Array.isArray(latestReceiptInfo) &&
      latestReceiptInfo.length > 0
    ) {
      console.log(
        "[validate-receipt] Found latest_receipt_info with",
        latestReceiptInfo.length,
        "transactions"
      );

      // Get the most recent active subscription transaction
      // Filter for transactions with expires_date_ms (subscriptions) and sort by expiration date
      const activeSubscriptions = latestReceiptInfo
        .filter((item: any) => item.expires_date_ms)
        .sort((a: any, b: any) => {
          const aTime = parseInt(a.expires_date_ms || "0");
          const bTime = parseInt(b.expires_date_ms || "0");
          return bTime - aTime; // Most recent first
        });

      if (activeSubscriptions.length === 0) {
        console.log(
          "[validate-receipt] No subscriptions with expiration dates found in latest_receipt_info"
        );
        return null;
      }

      const subscriptionTransaction = activeSubscriptions[0];
      console.log("[validate-receipt] Using subscription transaction:", {
        product_id: subscriptionTransaction.product_id,
        transaction_id: subscriptionTransaction.transaction_id,
        expires_date_ms: subscriptionTransaction.expires_date_ms,
      });

      const transactionId = subscriptionTransaction.transaction_id;
      const originalTransactionId =
        subscriptionTransaction.original_transaction_id || transactionId;
      const productId = subscriptionTransaction.product_id;

      // Parse dates (Apple provides timestamps in milliseconds)
      const purchaseDateMs = parseInt(
        subscriptionTransaction.purchase_date_ms || "0"
      );
      const expiresDateMs = parseInt(
        subscriptionTransaction.expires_date_ms || "0"
      );

      if (!expiresDateMs || expiresDateMs === 0) {
        console.log(
          "[validate-receipt] No expiration date found for subscription"
        );
        return null;
      }

      const purchaseDate = new Date(purchaseDateMs);
      const expiresDate = new Date(expiresDateMs);

      // Check if subscription is active (not expired)
      const now = Date.now();
      const isActive = expiresDateMs > now;

      // Get auto-renew status from pending_renewal_info
      const pendingRenewal = appleResponse.pending_renewal_info?.find(
        (info: any) => info.original_transaction_id === originalTransactionId
      );
      const autoRenewStatus = pendingRenewal?.auto_renew_status === "1";

      console.log("[validate-receipt] Extracted subscription info:", {
        productId,
        transactionId,
        isActive,
        expiresDate: expiresDate.toISOString(),
        autoRenewStatus,
      });

      return {
        transactionId,
        originalTransactionId,
        productId,
        purchaseDate,
        expiresDate,
        isActive,
        autoRenewStatus,
      };
    }

    // Fallback to receipt.in_app if latest_receipt_info is not available
    const receipt = appleResponse.receipt;
    if (receipt && receipt.in_app && receipt.in_app.length > 0) {
      console.log(
        "[validate-receipt] Falling back to receipt.in_app with",
        receipt.in_app.length,
        "transactions"
      );
      const latestTransaction = receipt.in_app[receipt.in_app.length - 1];

      const transactionId = latestTransaction.transaction_id;
      const originalTransactionId =
        latestTransaction.original_transaction_id || transactionId;
      const productId = latestTransaction.product_id;

      // Parse dates
      const purchaseDateMs = parseInt(
        latestTransaction.purchase_date_ms || "0"
      );
      const expiresDateMs = parseInt(
        latestTransaction.expires_date_ms ||
          latestTransaction.purchase_date_ms ||
          "0"
      );

      if (!expiresDateMs || expiresDateMs === 0) {
        console.log(
          "[validate-receipt] No expiration date found in receipt.in_app"
        );
        return null;
      }

      const purchaseDate = new Date(purchaseDateMs);
      const expiresDate = new Date(expiresDateMs);

      const now = Date.now();
      const isActive = expiresDateMs > now;

      const pendingRenewal = appleResponse.pending_renewal_info?.find(
        (info: any) => info.original_transaction_id === originalTransactionId
      );
      const autoRenewStatus = pendingRenewal?.auto_renew_status === "1";

      return {
        transactionId,
        originalTransactionId,
        productId,
        purchaseDate,
        expiresDate,
        isActive,
        autoRenewStatus,
      };
    }

    console.log(
      "[validate-receipt] No subscription data found in Apple response"
    );
    console.log(
      "[validate-receipt] Full Apple response structure:",
      JSON.stringify(appleResponse, null, 2)
    );
    return null;
  } catch (error) {
    console.error("Error extracting subscription info:", error);
    return null;
  }
}

/**
 * ============================================================================
 * PRODUCT ID TO SUBSCRIPTION TYPE MAPPING
 * ============================================================================
 *
 * Maps iOS product IDs from App Store Connect to internal subscription types.
 *
 * ## Product ID Mapping
 *
 * | Product ID | Subscription Type | Description |
 * |------------|------------------|-------------|
 * | `com.NNAudio.Cymasphere.basic` | `lifetime` | One-time lifetime purchase |
 * | `com.NNAudio.Cymasphere.monthly.plan` | `monthly` | Monthly recurring subscription |
 * | `com.NNAudio.Cymasphere.annual.plan` | `annual` | Annual recurring subscription |
 * | (unknown) | `none` | Unknown or invalid product ID |
 *
 * ## Usage
 *
 * This mapping is used to:
 * - Determine subscription tier from Apple's product ID
 * - Store subscription type in database
 * - Enable subscription priority resolution (lifetime > annual > monthly)
 *
 * @param productId - Product ID from App Store Connect
 * @returns Internal subscription type or "none" if product ID is unknown
 */
function mapProductIdToSubscriptionType(
  productId: string
): "none" | "monthly" | "annual" | "lifetime" {
  // Map based on your App Store Connect product IDs
  const productIdMap: Record<string, "monthly" | "annual" | "lifetime"> = {
    "com.NNAudio.Cymasphere.basic": "lifetime", // Assuming basic is lifetime
    "com.NNAudio.Cymasphere.monthly.plan": "monthly",
    "com.NNAudio.Cymasphere.annual.plan": "annual",
  };

  return productIdMap[productId] || "none";
}

/**
 * ============================================================================
 * TEST RECEIPT LOCAL VALIDATION FUNCTION
 * ============================================================================
 *
 * Validates test receipts locally without contacting Apple's servers.
 *
 * ## What Are Test Receipts?
 *
 * Test receipts are receipts that cannot be validated with Apple's servers, typically:
 * - Receipts from development/test devices
 * - Receipts when App Store Connect isn't fully configured
 * - Receipts from test accounts that haven't propagated to Apple's systems
 * - Receipts that fail validation with status codes 21004, 21005, or 21010
 *
 * ## Local Validation Process
 *
 * 1. **Base64 Validation**: Verifies receipt data is valid Base64
 *    - Decodes receipt to ensure it's properly formatted
 *    - Checks that receipt is not empty
 *
 * 2. **Mock Response Generation**: Creates a mock Apple response structure
 *    - Generates unique transaction ID from receipt hash (SHA-256)
 *    - Uses format: `test_<first_16_chars_of_hash>`
 *    - Ensures uniqueness even for duplicate test receipts
 *
 * 3. **Product ID Handling**:
 *    - Uses provided `productId` from request if available
 *    - Defaults to `com.NNAudio.Cymasphere.monthly.plan` if not provided
 *    - Allows testers to specify which subscription type to test
 *
 * 4. **Expiration Setting**:
 *    - Sets expiration to 6 hours from validation time
 *    - NOT from purchase date (test receipts don't have real purchase dates)
 *    - Ensures test receipts expire automatically
 *
 * ## Mock Response Structure
 *
 * Creates a response that matches Apple's format:
 * ```json
 * {
 *   "status": 0,
 *   "environment": "Sandbox",
 *   "receipt": {
 *     "bundle_id": "com.NNAudio.Cymasphere",
 *     "application_version": "1.0"
 *   },
 *   "latest_receipt_info": [{
 *     "transaction_id": "test_<hash>",
 *     "original_transaction_id": "test_<hash>",
 *     "product_id": "<provided_or_default>",
 *     "purchase_date_ms": "<current_time>",
 *     "expires_date_ms": "<current_time + 6_hours>"
 *   }],
 *   "pending_renewal_info": [{
 *     "original_transaction_id": "test_<hash>",
 *     "auto_renew_status": "1"
 *   }]
 * }
 * ```
 *
 * ## Why Local Validation?
 *
 * - **Development Flexibility**: Allows testing without full App Store Connect setup
 * - **Offline Testing**: Works when Apple's servers are unavailable
 * - **Rapid Iteration**: No need to wait for Apple's validation during development
 *
 * ## Limitations
 *
 * - **No Real Validation**: Cannot verify receipt authenticity
 * - **Time-Limited**: Only valid for 6 hours
 * - **Development Only**: Should never be used in production
 * - **No Renewal Tracking**: Cannot track actual subscription renewals
 *
 * ## Security Considerations
 *
 * - Test receipts are clearly marked with `validation_status = "test"`
 * - Automatic expiration prevents long-term abuse
 * - Automatic cleanup removes expired test receipts
 * - Production receipts always go through Apple validation
 *
 * @param receiptData - Base64-encoded receipt data
 * @param productId - Optional product ID from request (defaults to monthly if not provided)
 * @returns Validation result with mock Apple response if valid, or error details
 */
function validateTestReceiptLocally(
  receiptData: string,
  productId?: string
): {
  valid: boolean;
  appleResponse?: any;
  error?: string;
} {
  try {
    console.log(
      "[validate-receipt] Attempting local validation of test receipt..."
    );

    // Decode the receipt to check if it's valid base64
    let decodedReceipt: Buffer;
    try {
      decodedReceipt = Buffer.from(receiptData, "base64");
      if (decodedReceipt.length === 0) {
        return { valid: false, error: "Receipt data is empty" };
      }
    } catch (error) {
      return { valid: false, error: "Receipt data is not valid base64" };
    }

    // For test receipts, we'll create a mock Apple response structure
    // We'll extract what we can from the receipt structure and make reasonable assumptions
    // Since we can't decode the actual receipt content (it's encrypted), we'll use
    // a default structure that allows the receipt to be processed

    // Generate a mock transaction ID from the receipt hash (for uniqueness)
    const receiptHash = createHash("sha256").update(receiptData).digest("hex");
    const mockTransactionId = `test_${receiptHash.substring(0, 16)}`;

    // For test receipts, use provided product ID or default to monthly subscription
    // Test receipts expire 6 hours from validation
    const now = Date.now();
    const purchaseDate = new Date(now);
    const expiresDate = new Date(now + 6 * 60 * 60 * 1000); // 6 hours from now

    // Use provided product ID or default to monthly
    const testProductId = productId || "com.NNAudio.Cymasphere.monthly.plan";

    // Create a mock Apple response structure
    const mockAppleResponse = {
      status: 0, // Success status
      environment: "Sandbox",
      receipt: {
        bundle_id: "com.NNAudio.Cymasphere",
        application_version: "1.0",
      },
      latest_receipt_info: [
        {
          transaction_id: mockTransactionId,
          original_transaction_id: mockTransactionId,
          product_id: testProductId,
          purchase_date_ms: purchaseDate.getTime().toString(),
          expires_date_ms: expiresDate.getTime().toString(),
        },
      ],
      pending_renewal_info: [
        {
          original_transaction_id: mockTransactionId,
          auto_renew_status: "1",
        },
      ],
    };

    console.log(
      "[validate-receipt] Test receipt validated locally with mock structure"
    );
    return {
      valid: true,
      appleResponse: mockAppleResponse,
    };
  } catch (error) {
    console.error(
      "[validate-receipt] Error validating test receipt locally:",
      error
    );
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to validate test receipt locally",
    };
  }
}
