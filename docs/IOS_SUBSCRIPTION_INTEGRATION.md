# iOS In-App Purchase Integration with Supabase/Stripe

This document describes the integration of iOS StoreKit in-app purchases with the existing Stripe/Supabase subscription system.

## Overview

The system now supports subscriptions from two sources:

1. **Stripe** - Web-based subscriptions (existing)
2. **iOS StoreKit** - Native iOS in-app purchases (new)

Both subscription types are stored in Supabase and the system automatically determines the user's active subscription by checking both sources.

## Architecture

### Database Schema

A new table `ios_subscriptions` tracks iOS purchases:

- `transaction_id` - Unique StoreKit transaction ID
- `original_transaction_id` - For subscription renewals
- `product_id` - App Store Connect product ID
- `subscription_type` - Maps to subscription_type enum (monthly, annual, lifetime)
- `receipt_data` - Base64 encoded receipt for validation
- `expires_date` - Subscription expiration
- `is_active` - Whether subscription is currently active
- `validation_status` - Receipt validation status

### API Endpoints

#### Legacy Endpoint: `/api/ios/validate-receipt`

Validates iOS receipts with Apple's legacy verifyReceipt API and syncs to Supabase.

**Request:**

```json
{
  "receiptData": "base64_encoded_receipt",
  "accessToken": "optional_user_access_token",
  "userId": "optional_user_id"
}
```

**Response:**

```json
{
  "success": true,
  "subscription": {
    "type": "monthly|annual|lifetime",
    "expiresDate": "2025-12-31T00:00:00Z",
    "isActive": true,
    "transactionId": "1000000123456789"
  }
}
```

#### New Endpoint: `/api/ios/validate-transaction` (Recommended)

Validates iOS transactions using Apple's new App Store Server API. This is the modern method recommended by Apple.

**Request:**

```json
{
  "transactionId": "1000000123456789",
  "accessToken": "optional_user_access_token",
  "userId": "optional_user_id"
}
```

**Response:**

```json
{
  "success": true,
  "subscription": {
    "type": "monthly|annual|lifetime",
    "expiresDate": "2025-12-31T00:00:00Z",
    "isActive": true,
    "transactionId": "1000000123456789",
    "originalTransactionId": "1000000123456789"
  }
}
```

**Benefits of the new endpoint:**

- Uses Apple's modern App Store Server API
- More secure with JWT authentication
- Better performance and reliability
- Supports SHA-256 receipt signing (required after January 2025)
- Returns JWS (JSON Web Signature) responses for enhanced security

**Note:** The new endpoint requires App Store Server API credentials (see Setup Instructions below).

### iOS App Integration

#### StoreKitManager Updates

1. **Receipt Validation**: After successful purchase, automatically validates receipt with server
2. **Authentication**: Includes user's access token in validation request if available
3. **Subscription Sync**: Server updates user's profile with subscription status

#### Purchase Flow

**Using Legacy Receipt Validation:**

1. User initiates purchase in iOS app
2. StoreKit processes payment
3. On success, app retrieves receipt data
4. App calls `/api/ios/validate-receipt` with receipt
5. Server validates with Apple's verifyReceipt API
6. Server stores subscription in `ios_subscriptions` table
7. Server updates user's `profiles.subscription` field
8. App receives confirmation and updates UI

**Using New Transaction Validation (Recommended):**

1. User initiates purchase in iOS app
2. StoreKit processes payment
3. On success, app retrieves transaction ID from StoreKit
4. App calls `/api/ios/validate-transaction` with transaction ID
5. Server validates with Apple's App Store Server API (JWT authenticated)
6. Server stores subscription in `ios_subscriptions` table
7. Server updates user's `profiles.subscription` field
8. App receives confirmation and updates UI

### Subscription Priority

When checking user subscriptions, the system uses this priority:

1. **Lifetime** (highest)
2. **Annual**
3. **Monthly**
4. **None** (lowest)

If user has subscriptions from both Stripe and iOS, the higher priority subscription is used.

### Product ID Mapping

iOS product IDs map to subscription types:

- `com.NNAudio.Cymasphere.basic` → `lifetime`
- `com.NNAudio.Cymasphere.monthly.plan` → `monthly`
- `com.NNAudio.Cymasphere.annual.plan` → `annual`

## Setup Instructions

### 1. Environment Variables

#### For Legacy Receipt Validation (`/api/ios/validate-receipt`)

Add to `.env`:

```bash
APPLE_SHARED_SECRET=your_apple_shared_secret_from_app_store_connect
```

#### For New Transaction Validation (`/api/ios/validate-transaction`)

Add to `.env`:

```bash
# App Store Server API credentials (from App Store Connect)
APPLE_APP_STORE_KEY_ID=your_key_id_from_app_store_connect
APPLE_APP_STORE_ISSUER_ID=your_issuer_id_from_app_store_connect
APPLE_APP_STORE_PRIVATE_KEY=your_private_key_p8_file_contents
APPLE_APP_STORE_BUNDLE_ID=com.NNAudio.Cymasphere  # Optional, defaults to com.NNAudio.Cymasphere
APPLE_APP_STORE_APP_ID=your_app_apple_id  # Optional, required for production environment

# Apple Root Certificates (for JWS signature verification)
# Option 1: Directory path containing certificate files (.cer, .crt, or .pem)
APPLE_ROOT_CERTIFICATES_PATH=/path/to/apple/certificates

# Option 2: Base64-encoded certificates as environment variables
APPLE_ROOT_CERT_1=base64_encoded_certificate_1
APPLE_ROOT_CERT_2=base64_encoded_certificate_2
# ... add more as needed
```

**Note:** This endpoint uses the official [@apple/app-store-server-library](https://github.com/apple/app-store-server-library-node) which handles JWT generation, API calls, and JWS verification automatically.

**Apple Root Certificates Setup:**

For full JWS signature verification (recommended for production):

1. Visit [Apple's Certificate Authority page](https://www.apple.com/certificateauthority/)
2. Download the Apple Root Certificates (especially "Apple Root CA - G3" and "Apple Root CA")
3. Store them in a directory (e.g., `certs/apple/`) or encode them as base64
4. Set `APPLE_ROOT_CERTIFICATES_PATH` to the directory path, or use `APPLE_ROOT_CERT_*` environment variables

Without certificates, the endpoint will still work but will use unverified JWS decoding (not recommended for production).

**How to get App Store Server API credentials:**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** > **Keys** > **In-App Purchase**
3. Create a new key (or use existing one)
4. Download the `.p8` private key file
5. Note the **Key ID** (shown in the key list)
6. Note the **Issuer ID** (shown at the top of the Keys page)
7. Copy the contents of the `.p8` file to `APPLE_APP_STORE_PRIVATE_KEY` environment variable

**Important:** The private key should include the full PEM format with headers:

```
-----BEGIN PRIVATE KEY-----
[base64 encoded key content]
-----END PRIVATE KEY-----
```

### 2. Database Migration

Run the migration:

```bash
cd cymasphere-website
supabase db push
```

Or manually apply:

```bash
psql -f supabase/migrations/20250130000000_add_ios_subscriptions.sql
```

### 3. App Store Connect Configuration

1. Create subscription products in App Store Connect
2. Configure product IDs to match the mapping above
3. Set up subscription groups
4. Configure pricing and availability

### 4. Testing

#### Sandbox Testing

- Use sandbox test accounts in App Store Connect
- Receipts will be validated against Apple's sandbox environment
- The API automatically handles sandbox/production switching

#### Production Testing

- Test with real purchases (refundable within 14 days)
- Monitor `ios_subscriptions` table for successful validations
- Check user profiles for updated subscription status

## Authentication Flow

When a user logs in:

1. Standard Supabase authentication
2. Check Stripe subscription (existing)
3. **NEW**: Check iOS subscriptions
4. Merge results and use highest priority subscription
5. Update profile with final subscription status
6. Return subscription info to client

## Receipt/Transaction Validation

### Legacy Receipt Validation (`/api/ios/validate-receipt`)

The server validates receipts with Apple's legacy verifyReceipt API:

- Production URL: `https://buy.itunes.apple.com/verifyReceipt`
- Sandbox URL: `https://sandbox.itunes.apple.com/verifyReceipt`

The system automatically retries with sandbox if production validation returns status 21007.

### New Transaction Validation (`/api/ios/validate-transaction`)

The server validates transactions with Apple's App Store Server API:

- Production URL: `https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}`
- Sandbox URL: `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/{transactionId}`

**Authentication:**

- Uses JWT (JSON Web Token) with ES256 algorithm
- JWT is generated using the private key from App Store Connect
- Token is included in the `Authorization: Bearer {jwt}` header

**Response Format:**

- Returns JWS (JSON Web Signature) that needs to be decoded
- Contains transaction information in the decoded payload
- More secure than legacy receipt validation

**Benefits:**

- Modern API recommended by Apple
- Better security with JWT authentication
- Supports SHA-256 receipt signing (required after January 2025)
- More reliable and performant

### Receipt Storage

- Receipts are stored as Base64 strings in `ios_subscriptions.receipt_data`
- Original Apple validation response stored in `apple_validation_response` JSONB field
- Receipts can be re-validated periodically to check for cancellations/refunds

## Subscription Status Checking

### Utility Function

Use `updateUserProStatus()` from `@/utils/subscriptions/check-subscription`:

```typescript
import { updateUserProStatus } from "@/utils/subscriptions/check-subscription";

const result = await updateUserProStatus(userId);
// Returns: { subscription, subscriptionExpiration, source: "stripe" | "ios" | "none" }
```

This function:

1. Checks iOS subscriptions
2. Checks Stripe subscriptions
3. Returns highest priority subscription
4. Updates user's profile automatically

## Monitoring

### Key Metrics

- `ios_subscriptions` table size
- Validation success/failure rates
- Subscription expiration dates
- Active vs expired subscriptions

### Logging

The API endpoint logs:

- Receipt validation attempts
- Apple API responses
- Subscription updates
- Errors and failures

## Troubleshooting

### Receipt/Transaction Validation Fails

**For Legacy Receipt Validation:**

1. Check `APPLE_SHARED_SECRET` is correct
2. Verify receipt is Base64 encoded correctly
3. Check Apple's status codes in logs
4. Ensure product IDs match App Store Connect

**For New Transaction Validation:**

1. Check `APPLE_APP_STORE_KEY_ID`, `APPLE_APP_STORE_ISSUER_ID`, and `APPLE_APP_STORE_PRIVATE_KEY` are set correctly
2. Verify the private key is in PEM format with proper headers (the library will add them if missing)
3. Check that the Key ID and Issuer ID match App Store Connect
4. Verify the transaction ID is valid and from the correct environment (production/sandbox)
5. The official library handles JWT generation automatically - check for API errors in logs
6. Ensure product IDs match App Store Connect
7. Verify `APPLE_APP_STORE_BUNDLE_ID` matches your app's bundle ID (or it will default to com.NNAudio.Cymasphere)

### Subscription Not Updating

1. Check `ios_subscriptions` table for new records
2. Verify `validation_status` is "valid"
3. Check `is_active` is true
4. Verify `expires_date` is in the future
5. Check user's profile was updated

### Duplicate Subscriptions

- System uses `transaction_id` as unique constraint
- Duplicate transactions are updated, not inserted
- Check for `original_transaction_id` matches for renewals

## Security Considerations

1. **Receipt Validation**: Always validate on server, never trust client
2. **Access Tokens**: Receipt validation includes user auth token for security
3. **RLS Policies**: iOS subscriptions table has proper RLS policies
4. **Rate Limiting**: Consider adding rate limiting to validation endpoint

## Future Enhancements

- [x] New App Store Server API endpoint (`/api/ios/validate-transaction`)
- [x] Using official Apple library (@apple/app-store-server-library)
- [x] Full JWS signature verification using Apple's root certificates (using SignedDataVerifier)
- [ ] Periodic receipt re-validation for subscription status
- [ ] Webhook support for App Store Server Notifications V2
- [ ] Subscription renewal tracking
- [ ] Cancellation/refund handling
- [ ] Subscription upgrade/downgrade flows
- [ ] AppTransaction API support for app-level validation
