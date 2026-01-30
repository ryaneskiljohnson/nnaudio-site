"use server";

// App Store Server API transaction validation endpoint
// Updated: 2025-01-14 - Added App Store Server API credentials
// Updated: 2025-12-14 - Fixed: Using In-App Purchase key (DL4CMD84C4) instead of App Store Connect API key
// Updated: 2025-12-14 - Try sandbox first for sandbox transaction IDs
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { updateUserProStatus } from "@/utils/subscriptions/check-subscription";
import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";
import { loadAppleRootCertificates } from "@/utils/apple/root-certificates";

/**
 * ============================================================================
 * APP STORE SERVER API TRANSACTION VALIDATION ENDPOINT
 * ============================================================================
 *
 * This endpoint handles validation of App Store transactions using Apple's
 * official App Store Server API library.
 *
 * ## New Validation Method
 *
 * Apple has introduced a new way to validate App Store purchases:
 * - Uses App Store Server API instead of verifyReceipt
 * - Requires JWT authentication with a private key (.p8 file)
 * - Returns JWS (JSON Web Signature) responses that are automatically verified
 * - Supports Transaction and AppTransaction APIs
 * - Uses SHA-256 instead of SHA-1 for receipt signing
 *
 * ## Authentication
 *
 * The App Store Server API requires JWT authentication:
 * - Private key (.p8 file) from App Store Connect
 * - Key ID from App Store Connect
 * - Issuer ID from App Store Connect
 * - JWT signed with ES256 algorithm (handled automatically by the library)
 *
 * Environment variables required:
 * - APPLE_APP_STORE_KEY_ID: Key ID from App Store Connect
 * - APPLE_APP_STORE_ISSUER_ID: Issuer ID from App Store Connect
 * - APPLE_APP_STORE_PRIVATE_KEY: Contents of the .p8 private key file
 * - APPLE_APP_STORE_BUNDLE_ID: Bundle ID of your app (e.g., com.NNAudio.Cymasphere)
 *
 * ## Request Body
 *
 * ```typescript
 * {
 *   transactionId: string;      // Transaction ID from StoreKit (required)
 *   userId?: string;           // User ID (optional if accessToken provided)
 *   accessToken?: string;      // Supabase access token (optional if userId provided)
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
 *     originalTransactionId: string
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
 * @route POST /api/ios/validate-transaction
 * @see https://developer.apple.com/documentation/storekit/validating-receipts-with-the-app-store
 * @see https://github.com/apple/app-store-server-library-node
 */
export async function POST(request: NextRequest) {
  try {
    console.log(
      "[validate-transaction] Received transaction validation request"
    );
    const body = await request.json();
    const { transactionId, userId, accessToken } = body;

    console.log("[validate-transaction] Request body:", {
      hasTransactionId: !!transactionId,
      transactionId: transactionId?.substring(0, 20) || "N/A",
      hasUserId: !!userId,
      hasAccessToken: !!accessToken,
    });

    if (!transactionId) {
      console.log("[validate-transaction] Error: No transaction ID provided");
      return NextResponse.json(
        { error: "Transaction ID is required" },
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
    console.log("[validate-transaction] Supabase service role client created");

    // If accessToken is provided, get userId from it
    let resolvedUserId = userId;
    if (!resolvedUserId && accessToken) {
      console.log(
        "[validate-transaction] Resolving userId from accessToken..."
      );
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        console.log(
          "[validate-transaction] ERROR - Invalid access token:",
          authError
        );
        return NextResponse.json(
          { error: "Invalid access token" },
          { status: 401 }
        );
      }
      resolvedUserId = user.id;
      console.log(
        "[validate-transaction] Resolved userId:",
        resolvedUserId,
        "Email:",
        user.email
      );
    } else if (resolvedUserId) {
      console.log(
        "[validate-transaction] Using provided userId:",
        resolvedUserId
      );
    }

    // Validate transaction with Apple App Store Server API
    console.log(
      "[validate-transaction] Starting Apple transaction validation..."
    );
    const validationResult = await validateTransactionWithApple(transactionId);
    console.log("[validate-transaction] Apple validation result:", {
      valid: validationResult.valid,
      error: validationResult.error,
      hasTransactionData: !!validationResult.transactionData,
    });

    // If validation failed, return error
    if (!validationResult.valid) {
      const errorDetails =
        validationResult.error ||
        (validationResult as { errorMessage?: string }).errorMessage ||
        "Unknown validation error occurred";
      console.error(
        "[validate-transaction] ERROR - Apple validation failed:",
        errorDetails
      );
      console.error(
        "[validate-transaction] Full validation result:",
        JSON.stringify(validationResult, null, 2)
      );
      console.error(
        "[validate-transaction] Transaction ID that failed:",
        transactionId
      );
      return NextResponse.json(
        {
          error: "Transaction validation failed",
          details: errorDetails,
        },
        { status: 400 }
      );
    }

    if (!validationResult.transactionData) {
      console.log(
        "[validate-transaction] ERROR - No transaction data in response"
      );
      return NextResponse.json(
        { error: "No transaction data found in Apple response" },
        { status: 400 }
      );
    }

    const transactionData = validationResult.transactionData;

    // Extract subscription information from transaction data
    console.log(
      "[validate-transaction] Extracting subscription info from transaction data..."
    );
    const subscriptionInfo =
      extractSubscriptionInfoFromTransaction(transactionData);

    if (!subscriptionInfo) {
      console.log(
        "[validate-transaction] No valid subscription found in transaction data"
      );
      return NextResponse.json(
        { error: "No valid subscription found in transaction" },
        { status: 400 }
      );
    }

    console.log("[validate-transaction] Subscription info extracted:", {
      productId: subscriptionInfo.productId,
      isActive: subscriptionInfo.isActive,
      expiresDate: subscriptionInfo.expiresDate,
      transactionId: subscriptionInfo.transactionId,
    });

    // Map iOS product ID to subscription type
    console.log(
      "[validate-transaction] Mapping product ID to subscription type:",
      subscriptionInfo.productId
    );
    const subscriptionType = mapProductIdToSubscriptionType(
      subscriptionInfo.productId
    );
    console.log(
      "[validate-transaction] Mapped subscription type:",
      subscriptionType
    );

    if (subscriptionType === "none") {
      console.log(
        "[validate-transaction] ERROR - Unknown product ID:",
        subscriptionInfo.productId
      );
      return NextResponse.json(
        { error: "Unknown product ID: " + subscriptionInfo.productId },
        { status: 400 }
      );
    }

    // Get user's profile
    console.log(
      "[validate-transaction] Fetching user profile for userId:",
      resolvedUserId
    );
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", resolvedUserId)
      .single();

    if (profileError || !profile) {
      console.log(
        "[validate-transaction] ERROR - User profile not found:",
        profileError
      );
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }
    console.log("[validate-transaction] User profile found:", profile.id);

    // Check if subscription already exists
    console.log(
      "[validate-transaction] Checking for existing subscription with transaction_id:",
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
        "[validate-transaction] ERROR checking existing subscription:",
        existingError
      );
    } else if (existingSubscription) {
      console.log(
        "[validate-transaction] Found existing subscription, will update:",
        existingSubscription.id
      );
    } else {
      console.log(
        "[validate-transaction] No existing subscription found, will create new one"
      );
    }

    const finalExpiresDate = subscriptionInfo.expiresDate;
    console.log(
      "[validate-transaction] Using expiration date:",
      finalExpiresDate.toISOString()
    );

    // Store transaction data as JSON (App Store Server API response)
    const appleResponse = {
      transactionId: subscriptionInfo.transactionId,
      originalTransactionId: subscriptionInfo.originalTransactionId,
      productId: subscriptionInfo.productId,
      purchaseDate: subscriptionInfo.purchaseDate.toISOString(),
      expiresDate: finalExpiresDate.toISOString(),
      environment: transactionData.environment || "Production",
      signedDate: transactionData.signedDate,
    };

    if (existingSubscription) {
      // Update existing subscription
      console.log(
        "[validate-transaction] Updating existing iOS subscription in database..."
      );
      const { error: updateError } = await supabase
        .from("ios_subscriptions")
        .update({
          subscription_type: subscriptionType,
          expires_date: finalExpiresDate.toISOString(),
          receipt_data: transactionId, // Store transaction ID as receipt data
          receipt_validated_at: new Date().toISOString(),
          validation_status: "valid",
          apple_validation_response: appleResponse,
          is_active: subscriptionInfo.isActive,
          auto_renew_status: subscriptionInfo.autoRenewStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", subscriptionInfo.transactionId);

      if (updateError) {
        console.error(
          "[validate-transaction] ERROR - Failed to update iOS subscription:",
          updateError
        );
        return NextResponse.json(
          { error: "Failed to update subscription" },
          { status: 500 }
        );
      }
      console.log(
        "[validate-transaction] Successfully updated iOS subscription in database"
      );
    } else {
      // Create new subscription record
      console.log(
        "[validate-transaction] Creating new iOS subscription in database..."
      );
      const { error: insertError } = await (supabase as any)
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
          receipt_data: transactionId, // Store transaction ID as receipt data
          receipt_validated_at: new Date().toISOString(),
          validation_status: "valid",
          apple_validation_response: appleResponse,
          is_active: subscriptionInfo.isActive,
          auto_renew_status: subscriptionInfo.autoRenewStatus,
        });

      if (insertError) {
        console.error(
          "[validate-transaction] ERROR - Failed to insert iOS subscription:",
          insertError
        );
        return NextResponse.json(
          { error: "Failed to save subscription" },
          { status: 500 }
        );
      }
      console.log(
        "[validate-transaction] Successfully created iOS subscription in database"
      );
    }

    // Update user's profile subscription status using centralized function
    console.log("[validate-transaction] Updating user subscription status...");
    const result = await updateUserProStatus(resolvedUserId);
    console.log(
      `[validate-transaction] Subscription updated: ${result.subscription} (${result.source})`
    );

    return NextResponse.json({
      success: true,
      subscription: {
        type: subscriptionType,
        expiresDate: finalExpiresDate.toISOString(),
        isActive: subscriptionInfo.isActive,
        transactionId: subscriptionInfo.transactionId,
        originalTransactionId: subscriptionInfo.originalTransactionId,
      },
    });
  } catch (error) {
    console.error("[validate-transaction] ========== EXCEPTION ==========");
    console.error(
      "[validate-transaction] Error validating transaction:",
      error
    );
    console.error(
      "[validate-transaction] Error stack:",
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
 * APPLE TRANSACTION VALIDATION FUNCTION (Using Official Library)
 * ============================================================================
 *
 * Validates a transaction with Apple's App Store Server API using the official
 * Apple library (@apple/app-store-server-library).
 *
 * The library handles:
 * - JWT generation and signing
 * - API requests to Apple
 * - JWS verification
 * - Error handling
 *
 * @param transactionId - Transaction ID from StoreKit
 * @returns Validation result with decoded transaction data or error details
 */
async function validateTransactionWithApple(transactionId: string): Promise<{
  valid: boolean;
  transactionData?: {
    transactionId: string;
    originalTransactionId: string;
    productId: string;
    purchaseDate: number;
    expiresDate: number;
    environment: string;
    signedDate: number;
    [key: string]: unknown;
  };
  error?: string;
}> {
  try {
    // Get App Store Server API credentials
    // Trim whitespace/newlines that might have been added when setting env vars
    const keyId = process.env.APPLE_APP_STORE_KEY_ID?.trim();
    const issuerId = process.env.APPLE_APP_STORE_ISSUER_ID?.trim();
    const privateKey = process.env.APPLE_APP_STORE_PRIVATE_KEY?.trim();
    const bundleId =
      (process.env.APPLE_APP_STORE_BUNDLE_ID || "com.NNAudio.Cymasphere").trim();

    if (!keyId || !issuerId || !privateKey) {
      const missing = [];
      if (!keyId) missing.push("APPLE_APP_STORE_KEY_ID");
      if (!issuerId) missing.push("APPLE_APP_STORE_ISSUER_ID");
      if (!privateKey) missing.push("APPLE_APP_STORE_PRIVATE_KEY");

      console.error(
        `[validate-transaction] Missing required environment variables: ${missing.join(
          ", "
        )}`
      );
      const errorMessage = `Missing required environment variables: ${missing.join(
        ", "
      )}. Please configure App Store Server API credentials in App Store Connect. See documentation for setup instructions.`;
      
      console.error(
        `[validate-transaction] ${errorMessage}\n` +
        `To set up App Store Server API credentials:\n` +
        `1. Go to App Store Connect > Users and Access > Keys\n` +
        `2. Create a new key with "App Store Connect API" access\n` +
        `3. Download the .p8 private key file\n` +
        `4. Note the Key ID and Issuer ID\n` +
        `5. Set environment variables: APPLE_APP_STORE_KEY_ID, APPLE_APP_STORE_ISSUER_ID, APPLE_APP_STORE_PRIVATE_KEY\n` +
        `Alternatively, use /api/ios/validate-receipt endpoint which doesn't require these credentials.`
      );
      
      return {
        valid: false,
        error: errorMessage,
      };
    }

    // Prepare private key (ensure it has proper PEM headers if needed)
    let encodedKey = privateKey;
    const hasHeaders = encodedKey.includes("-----BEGIN");
    console.log(
      `[validate-transaction] Private key format check: hasHeaders=${hasHeaders}, length=${encodedKey.length}`
    );
    
    if (!hasHeaders) {
      // If the key doesn't have headers, add them
      console.log(
        `[validate-transaction] Adding PEM headers to private key...`
      );
      encodedKey = `-----BEGIN PRIVATE KEY-----\n${encodedKey.replace(
        /\s/g,
        ""
      )}\n-----END PRIVATE KEY-----`;
    }
    
    // Log credential info (without exposing sensitive data)
    // Show if there are any trailing newlines/whitespace issues
    const keyIdHasNewline = keyId?.includes('\n') || keyId?.endsWith('\n');
    const issuerIdHasNewline = issuerId?.includes('\n') || issuerId?.endsWith('\n');
    const bundleIdHasNewline = bundleId?.includes('\n') || bundleId?.endsWith('\n');
    
    const keyIdPreview = keyId ? `${keyId.substring(0, 4)}...${keyId.substring(keyId.length - 2)}` : "missing";
    const issuerIdPreview = issuerId ? `${issuerId.substring(0, 8)}...${issuerId.substring(issuerId.length - 4)}` : "missing";
    const privateKeyPreview = encodedKey.substring(0, 50) + "..." + encodedKey.substring(encodedKey.length - 30);
    
    console.log(
      `[validate-transaction] Credentials check:`,
      {
        keyId: keyIdPreview,
        keyIdLength: keyId?.length,
        keyIdHasNewline: keyIdHasNewline,
        issuerId: issuerIdPreview,
        issuerIdLength: issuerId?.length,
        issuerIdHasNewline: issuerIdHasNewline,
        privateKeyLength: encodedKey.length,
        privateKeyHasHeaders: encodedKey.includes("-----BEGIN"),
        privateKeyHasEndHeaders: encodedKey.includes("-----END"),
        privateKeyPreview: privateKeyPreview,
        bundleId: bundleId,
        bundleIdLength: bundleId?.length,
        bundleIdHasNewline: bundleIdHasNewline,
      }
    );
    
    // Validate private key format
    if (!encodedKey.includes("-----BEGIN PRIVATE KEY-----") || !encodedKey.includes("-----END PRIVATE KEY-----")) {
      console.error(
        `[validate-transaction] ERROR: Private key missing proper PEM headers`
      );
      return {
        valid: false,
        error: "Private key format is invalid. Must include -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- headers.",
      };
    }

    // In production, only check production environment (no sandbox)
    // In development/preview, allow sandbox checking
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.VERCEL_ENV === 'production';
    
    // Detect if transaction is from sandbox (sandbox transaction IDs typically start with 200000)
    const isLikelySandbox = transactionId.startsWith('200000');
    
    let environments: Array<{ env: Environment; name: string }>;
    
    if (isProduction) {
      // Production: Only check production environment
      environments = [{ env: Environment.PRODUCTION, name: "production" }];
      if (isLikelySandbox) {
        console.warn(
          `[validate-transaction] WARNING: Sandbox transaction ID detected in production environment. ` +
          `Sandbox transactions are not valid in production. This transaction will be rejected.`
        );
      }
    } else {
      // Development/Preview: Try sandbox first for sandbox transactions
      environments = isLikelySandbox
        ? [
            { env: Environment.SANDBOX, name: "sandbox" },
            { env: Environment.PRODUCTION, name: "production" },
          ]
        : [
            { env: Environment.PRODUCTION, name: "production" },
            { env: Environment.SANDBOX, name: "sandbox" },
          ];
      
      if (isLikelySandbox) {
        console.log(
          `[validate-transaction] Transaction ID starts with 200000 - likely sandbox, trying sandbox first`
        );
      }
    }

    for (const { env, name } of environments) {
      try {
        console.log(
          `[validate-transaction] Attempting validation with ${name} environment...`
        );

        // Create API client (handles JWT generation automatically)
        console.log(
          `[validate-transaction] Creating App Store Server API client for ${name}...`
        );
        console.log(
          `[validate-transaction] Client parameters:`,
          {
            keyIdLength: keyId?.length,
            issuerIdLength: issuerId?.length,
            bundleId: bundleId,
            environment: name,
            privateKeyLength: encodedKey.length,
            privateKeyStartsWith: encodedKey.substring(0, 30),
            privateKeyEndsWith: encodedKey.substring(encodedKey.length - 30),
          }
        );
        const client = new AppStoreServerAPIClient(
          encodedKey,
          keyId,
          issuerId,
          bundleId,
          env
        );

        // Get transaction info (returns JWS that needs to be verified)
        console.log(
          `[validate-transaction] Calling getTransactionInfo for transaction ${transactionId}...`
        );
        let transactionInfoResponse;
        try {
          transactionInfoResponse = await client.getTransactionInfo(
            transactionId
          );
          console.log(
            `[validate-transaction] getTransactionInfo succeeded, got JWS response`
          );
        } catch (apiError: any) {
          console.error(
            `[validate-transaction] getTransactionInfo failed:`,
            apiError
          );
          
          // Check for HTTP status code in error object
          const httpStatus = apiError?.httpStatusCode || apiError?.statusCode;
          const apiErrorMessage = apiError?.apiError || apiError?.errorMessage || apiError?.message;
          
          console.error(
            `[validate-transaction] API error details:`,
            {
              httpStatusCode: httpStatus,
              apiError: apiErrorMessage,
              errorMessage: apiError?.errorMessage,
              fullError: JSON.stringify(apiError, Object.getOwnPropertyNames(apiError))
            }
          );
          
          // If it's a 401, provide more helpful error message
          if (httpStatus === 401) {
            const authError = new Error(
              `Authentication failed (401). Please verify: 1. APPLE_APP_STORE_KEY_ID is correct, 2. APPLE_APP_STORE_ISSUER_ID is correct, 3. APPLE_APP_STORE_PRIVATE_KEY is in correct PEM format with headers, 4. The key has proper permissions in App Store Connect. Original error: ${apiErrorMessage || "No error message"}`
            );
            (authError as any).httpStatusCode = 401;
            throw authError;
          }
          
          throw apiError;
        }

        // Verify and decode the JWS using Apple's root certificates
        const signedInfo = transactionInfoResponse.signedTransactionInfo;
        if (!signedInfo) {
          return {
            valid: false,
            error: 'Missing signed transaction info',
          };
        }
        const transactionData = await verifyAndDecodeTransactionJWS(
          signedInfo,
          bundleId,
          env
        );

        if (!transactionData) {
          console.log(
            `[validate-transaction] Failed to verify/decode transaction data from ${name}`
          );
          if (name === "production") {
            continue; // Try sandbox
          }
          return {
            valid: false,
            error: "Failed to verify or decode Apple's transaction response",
          };
        }

        console.log(
          `[validate-transaction] Successfully validated transaction with ${name} environment`
        );
        return {
          valid: true,
          transactionData: {
            ...transactionData,
            environment: name,
          },
        };
      } catch (error) {
        const errorDetails = {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        };

        console.error(
          `[validate-transaction] Error with ${name} environment:`,
          errorDetails
        );

        // If it's a 404, transaction might not exist in this environment, try next
        if (
          error instanceof Error &&
          (error.message.includes("404") ||
            error.message.includes("not found") ||
            error.message.includes("NOT_FOUND"))
        ) {
          console.log(
            `[validate-transaction] Transaction not found in ${name}, trying next environment...`
          );
          if (name === "production") {
            continue; // Try sandbox
          }
          return {
            valid: false,
            error: `Transaction ${transactionId} not found in ${name} environment`,
          };
        }

        // If it's an authentication error, don't try other environments
        const httpStatus = (error as any)?.httpStatusCode;
        if (
          httpStatus === 401 ||
          (error instanceof Error &&
            (error.message.includes("401") ||
              error.message.includes("authentication") ||
              error.message.includes("unauthorized") ||
              error.message.includes("UNAUTHORIZED")))
        ) {
          console.error(
            `[validate-transaction] Authentication error (401) in ${name} environment`
          );
          const authErrorMsg = error instanceof Error && error.message
            ? error.message
            : "Authentication failed (401). Please verify your App Store Server API credentials: APPLE_APP_STORE_KEY_ID, APPLE_APP_STORE_ISSUER_ID, and APPLE_APP_STORE_PRIVATE_KEY are correct and the private key is in proper PEM format.";
          return {
            valid: false,
            error: authErrorMsg,
          };
        }

        // For other errors in production, try sandbox
        if (name === "production") {
          console.log(
            `[validate-transaction] Error in production, will try sandbox:`,
            errorDetails.message
          );
          continue;
        }

        // Return detailed error for sandbox (last attempt)
        const errorMessage =
          errorDetails.message ||
          `Failed to validate transaction with Apple (${name} environment)`;
        console.error(
          `[validate-transaction] Final error after trying all environments:`,
          errorMessage
        );
        return {
          valid: false,
          error: errorMessage,
        };
      }
    }

    return {
      valid: false,
      error: "Transaction not found in production or sandbox environments",
    };
  } catch (error) {
    console.error("[validate-transaction] Error validating with Apple:", error);
    const errorMessage =
      error instanceof Error
        ? error.message || "Unknown error occurred"
        : String(error) || "Unknown error occurred";
    console.error(
      "[validate-transaction] Error message:",
      errorMessage,
      "Error type:",
      typeof error,
      "Error object:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return {
      valid: false,
      error: errorMessage,
    };
  }
}

/**
 * ============================================================================
 * JWS VERIFICATION AND DECODING FUNCTION
 * ============================================================================
 *
 * Verifies and decodes a JWS (JSON Web Signature) response from Apple using
 * the official library's SignedDataVerifier.
 *
 * This function:
 * 1. Loads Apple root certificates
 * 2. Creates a SignedDataVerifier instance
 * 3. Verifies the JWS signature against Apple's certificates
 * 4. Decodes the verified transaction data
 *
 * @param jws - JWS string from Apple
 * @param bundleId - Bundle ID of the app
 * @param environment - Environment (PRODUCTION or SANDBOX)
 * @returns Decoded and verified transaction data or null if verification/decoding failed
 */
async function verifyAndDecodeTransactionJWS(
  jws: string,
  bundleId: string,
  environment: Environment
): Promise<{
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate: number;
  environment: string;
  signedDate: number;
  [key: string]: unknown;
} | null> {
  try {
    // Load Apple root certificates
    const appleRootCAs = loadAppleRootCertificates();

    if (appleRootCAs.length === 0) {
      console.warn(
        "[validate-transaction] No Apple root certificates found. " +
          "JWS signature verification requires Apple root certificates. " +
          "Please set APPLE_ROOT_CERTIFICATES_PATH or APPLE_ROOT_CERT_* environment variables. " +
          "Falling back to unverified decoding (less secure but functional for testing)."
      );
      // Without certificates, we cannot verify the signature
      // For testing/development, allow unverified decoding as fallback
      // In production, you should always provide certificates
      return decodeJWSUnverified(jws);
    }

    // Create verifier
    // enableOnlineChecks: true enables online certificate revocation checking
    // appAppleId: required for production, optional for sandbox
    const appAppleId = process.env.APPLE_APP_STORE_APP_ID;
    const verifier = new SignedDataVerifier(
      appleRootCAs,
      true, // enableOnlineChecks
      environment,
      bundleId,
      environment === Environment.PRODUCTION && appAppleId ? Number(appAppleId) : undefined
    );

    // Verify and decode the JWS using the official library method
    // This verifies the signature against Apple's root certificates
    console.log(
      "[validate-transaction] Verifying JWS signature with Apple root certificates..."
    );

    let verifiedTransaction: {
      transactionId: string;
      originalTransactionId: string;
      productId: string;
      purchaseDate: number;
      expiresDate?: number;
      signedDate: number;
      [key: string]: unknown;
    };

    try {
      // Use verifyAndDecodeTransaction as documented in the official library
      // This method verifies the JWS signature and returns JWSTransactionDecodedPayload
      const decodedPayload = await verifier.verifyAndDecodeTransaction(jws);

      // Extract the transaction data from the decoded payload
      // The payload structure follows Apple's Transaction schema
      verifiedTransaction = {
        transactionId: decodedPayload.transactionId ?? '',
        originalTransactionId:
          decodedPayload.originalTransactionId ?? decodedPayload.transactionId ?? '',
        productId: decodedPayload.productId ?? '',
        purchaseDate: decodedPayload.purchaseDate ?? 0,
        expiresDate: decodedPayload.expiresDate,
        signedDate: decodedPayload.signedDate ?? 0,
      };
    } catch (verificationError) {
      console.error(
        "[validate-transaction] JWS verification failed:",
        verificationError
      );

      // If verification fails, don't proceed with unverified data
      // This ensures we only accept properly verified transactions
      return null;
    }

    if (!verifiedTransaction || !verifiedTransaction.transactionId) {
      console.error("[validate-transaction] JWS verification/decoding failed");
      return null;
    }

    console.log("[validate-transaction] JWS signature verified successfully");

    // Format transaction data for our system
    const transactionData = {
      transactionId: verifiedTransaction.transactionId,
      originalTransactionId: verifiedTransaction.originalTransactionId,
      productId: verifiedTransaction.productId,
      purchaseDate: verifiedTransaction.purchaseDate,
      expiresDate: verifiedTransaction.expiresDate || 0,
      environment:
        environment === Environment.PRODUCTION ? "Production" : "Sandbox",
      signedDate: verifiedTransaction.signedDate,
    };

    return transactionData as {
      transactionId: string;
      originalTransactionId: string;
      productId: string;
      purchaseDate: number;
      expiresDate: number;
      environment: string;
      signedDate: number;
      [key: string]: unknown;
    };
  } catch (error) {
    console.error(
      "[validate-transaction] Error verifying/decoding JWS:",
      error
    );

    // If verification fails but we have certificates, don't fall back
    // This ensures we only accept properly verified transactions
    if (loadAppleRootCertificates().length > 0) {
      console.error(
        "[validate-transaction] JWS verification failed with certificates loaded. " +
          "This may indicate a security issue or certificate problem."
      );
      return null;
    }

    // Only fall back to unverified if no certificates are available
    console.warn(
      "[validate-transaction] Falling back to unverified decoding (certificates not available)"
    );
    return decodeJWSUnverified(jws);
  }
}

/**
 * Unverified JWS decoding (fallback only when certificates are not available)
 *
 * WARNING: This does not verify the signature and should only be used
 * when Apple root certificates are not available. Always use verifyAndDecodeTransactionJWS
 * in production.
 */
function decodeJWSUnverified(jws: string): {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate: number;
  environment: string;
  signedDate: number;
  [key: string]: unknown;
} | null {
  try {
    const parts = jws.split(".");
    if (parts.length !== 3) {
      console.error("[validate-transaction] Invalid JWS format");
      return null;
    }

    // Decode payload (second part) - base64url decode
    const payloadBuffer = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadBuffer.toString("utf-8"));

    return payload as {
      transactionId: string;
      originalTransactionId: string;
      productId: string;
      purchaseDate: number;
      expiresDate: number;
      environment: string;
      signedDate: number;
      [key: string]: unknown;
    };
  } catch (error) {
    console.error(
      "[validate-transaction] Error decoding JWS (unverified):",
      error
    );
    return null;
  }
}

/**
 * Base64 URL decoding (handles padding)
 */
function base64UrlDecode(str: string): Buffer {
  // Add padding if needed
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64");
}

/**
 * ============================================================================
 * SUBSCRIPTION INFO EXTRACTION FROM TRANSACTION DATA
 * ============================================================================
 *
 * Extracts subscription information from decoded transaction data.
 *
 * @param transactionData - Decoded transaction data from Apple
 * @returns Extracted subscription information or null if invalid
 */
function extractSubscriptionInfoFromTransaction(transactionData: {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate: number;
  environment: string;
  signedDate: number;
  [key: string]: unknown;
}): {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: Date;
  expiresDate: Date;
  isActive: boolean;
  autoRenewStatus: boolean;
} | null {
  try {
    const transactionId = transactionData.transactionId;
    const originalTransactionId =
      transactionData.originalTransactionId || transactionId;
    const productId = transactionData.productId;

    if (!transactionId || !productId) {
      console.log(
        "[validate-transaction] Missing required fields in transaction data"
      );
      return null;
    }

    // Parse dates (Apple provides timestamps in milliseconds)
    const purchaseDate = new Date(transactionData.purchaseDate);
    const expiresDate = new Date(transactionData.expiresDate);

    // Check if subscription is active (not expired)
    const now = Date.now();
    const isActive = transactionData.expiresDate > now;

    // Auto-renew status - check if available in transaction data
    // For subscriptions, this might be in a separate field or need to be checked via renewal info endpoint
    const autoRenewStatus =
      (transactionData.autoRenewStatus as boolean) ?? true;

    return {
      transactionId,
      originalTransactionId,
      productId,
      purchaseDate,
      expiresDate,
      isActive,
      autoRenewStatus,
    };
  } catch (error) {
    console.error(
      "[validate-transaction] Error extracting subscription info:",
      error
    );
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
 * This matches the mapping used in the legacy validate-receipt endpoint.
 *
 * @param productId - Product ID from App Store Connect
 * @returns Internal subscription type or "none" if product ID is unknown
 */
function mapProductIdToSubscriptionType(
  productId: string
): "none" | "monthly" | "annual" | "lifetime" {
  const productIdMap: Record<string, "monthly" | "annual" | "lifetime"> = {
    "com.NNAudio.Cymasphere.basic": "lifetime",
    "com.NNAudio.Cymasphere.monthly.plan": "monthly",
    "com.NNAudio.Cymasphere.annual.plan": "annual",
  };

  return productIdMap[productId] || "none";
}
