# Cymasphere Unified Authorization System

## Overview

The Cymasphere authorization system manages user access through **three distinct sources**, all tracked in Supabase:

1. **NFR (Not For Resale) Licenses** - Manual lifetime access grants
2. **Stripe Subscriptions** - Web-based paid subscriptions
3. **iOS In-App Purchases** - Native iOS StoreKit subscriptions

## Authorization Sources

### 1. NFR Licenses (Highest Priority)

**Table**: `user_management`

**Columns**:

- `user_email` (TEXT, PRIMARY KEY)
- `pro` (BOOLEAN) - If true, grants lifetime access
- `notes` (TEXT) - Admin notes (e.g., "Influencer NFR - 11/13/25")

**Purpose**: Grant lifetime access to specific users (influencers, partners, team members, etc.)

**Priority**: **HIGHEST** - NFR always overrides other subscription types

**Access**: Admin-only via `/admin/nfr` page

**Example**:

```sql
INSERT INTO user_management (user_email, pro, notes)
VALUES ('influencer@example.com', true, 'Influencer NFR - 11/28/25');
```

### 2. Stripe Subscriptions

**Table**: `stripe_tables.stripe_subscriptions` (via Stripe wrapper)

**Subscription Types**:

- `monthly` - $6/month subscription
- `annual` - $59/year subscription
- `lifetime` - $149 one-time payment

**Purpose**: Web-based subscription purchases

**Validation**: Automatically synced via Stripe webhooks

**Priority**: Second (after NFR, competes with iOS based on subscription type)

### 3. iOS In-App Purchases

**Table**: `ios_subscriptions`

**Columns**:

- `user_id` - Links to auth.users
- `transaction_id` - StoreKit transaction ID (unique)
- `product_id` - App Store product ID
- `subscription_type` - monthly, annual, or lifetime
- `expires_date` - Subscription expiration
- `is_active` - Whether subscription is currently active
- `validation_status` - Receipt validation status
- `receipt_data` - Base64 encoded receipt

**Purpose**: iOS native in-app purchases

**Validation**: Validated via `/api/ios/validate-receipt` endpoint

**Priority**: Second (after NFR, competes with Stripe based on subscription type)

## Authorization Priority

When a user logs in, the system checks all three sources and selects the best authorization:

### Priority Order:

1. **NFR (lifetime)** - If user has `pro=true` in `user_management`, they get lifetime access
2. **Lifetime subscription** - From either Stripe or iOS
3. **Annual subscription** - From either Stripe or iOS (whichever expires later)
4. **Monthly subscription** - From either Stripe or iOS (whichever expires later)
5. **None** - No active subscription

### Decision Logic:

```typescript
if (nfr.hasPro) {
  return { subscription: "lifetime", source: "nfr" };
}

const iosPriority = getPriority(iosSubscription);
const stripePriority = getPriority(stripeSubscription);

if (iosPriority > stripePriority) {
  return { subscription: iosSubscription, source: "ios" };
} else if (stripePriority > iosPriority) {
  return { subscription: stripeSubscription, source: "stripe" };
} else if (iosPriority > 0) {
  // Same priority, use the one with later expiration
  return laterExpiration(ios, stripe);
} else {
  return { subscription: "none", source: "none" };
}
```

## Unified Authorization Check

**Function**: `updateUserProStatus(userId)`

**Location**: `/utils/subscriptions/check-subscription.ts`

**Returns**:

```typescript
{
  subscription: SubscriptionType,
  subscriptionExpiration: Date | null,
  source: "nfr" | "stripe" | "ios" | "none"
}
```

**Process**:

1. Check NFR status (user_management table)
2. Clean up expired test receipts (iOS subscriptions with validation_status="test")
3. Check iOS subscriptions (ios_subscriptions table, includes test receipts)
4. Check Stripe subscriptions (stripe_tables.stripe_subscriptions)
5. Determine highest priority subscription
6. Update user's profile.subscription field
7. Return final authorization result

## Integration Points

### Website

#### Login Route (`/api/auth/login`)

```typescript
const result = await updateUserProStatus(user.id);
// Returns subscription from highest priority source
```

#### Refresh Route (`/api/auth/refresh`)

```typescript
const result = await updateUserProStatus(user.id);
// Re-validates authorization on token refresh
```

#### iOS Receipt Validation (`/api/ios/validate-receipt`)

```typescript
// Validates iOS receipt with Apple
// Stores in ios_subscriptions table
// Triggers unified auth check
```

### iOS App

The iOS app receives the `subscription` field from login/refresh API responses:

```cpp
result.subscription = jsonResponse["user"]["subscription"];
```

The app then checks:

```cpp
bool AuthData::hasValidSubscription() const {
  return !subscription.equalsIgnoreCase("none") && !subscription.isEmpty();
}
```

## Database Synchronization

All three authorization sources are tracked in Supabase:

| Source | Table                                | Synced Via             | Updated When                    |
| ------ | ------------------------------------ | ---------------------- | ------------------------------- |
| NFR    | `user_management`                    | Manual admin entry     | Admin updates via `/admin/nfr`  |
| Stripe | `stripe_tables.stripe_subscriptions` | Stripe webhooks        | Subscription events from Stripe |
| iOS    | `ios_subscriptions`                  | Receipt validation API | Purchase/restore in iOS app     |

The `profiles` table always reflects the current authorization status:

- `subscription` - Current subscription type (from highest priority source)
- `subscription_expiration` - Expiration date (null for lifetime/NFR)

## Example Scenarios

### Scenario 1: NFR User with Stripe Subscription

- User: influencer@example.com
- NFR: `pro=true` in user_management
- Stripe: Active monthly subscription
- **Result**: `subscription="lifetime"`, `source="nfr"` (NFR takes priority)

### Scenario 2: User with Both iOS and Stripe

- User: user@example.com
- iOS: Annual subscription (expires 2026-12-31)
- Stripe: Monthly subscription (expires 2025-12-31)
- **Result**: `subscription="annual"`, `source="ios"` (higher priority and later expiration)

### Scenario 3: User with Expired Stripe, Active iOS

- User: user@example.com
- Stripe: Cancelled subscription
- iOS: Active monthly subscription
- **Result**: `subscription="monthly"`, `source="ios"`

### Scenario 4: NFR User (No Other Subscriptions)

- User: team@cymasphere.com
- NFR: `pro=true` in user_management
- Stripe: None
- iOS: None
- **Result**: `subscription="lifetime"`, `source="nfr"`

## API Endpoints

### Login

**POST** `/api/auth/login`

- Checks all three authorization sources
- Returns unified subscription status

### Refresh Token

**POST** `/api/auth/refresh`

- Re-validates authorization on token refresh
- Returns updated subscription status

### iOS Receipt Validation

**POST** `/api/ios/validate-receipt`

- Validates iOS receipt with Apple App Store
- Stores subscription in `ios_subscriptions` table
- Triggers unified authorization check

### NFR Status

**GET** `/api/user/nfr-status`

- Returns user's NFR status from user_management table

## Admin Tools

### NFR Management

**Page**: `/admin/nfr`

**Features**:

- View all NFR licenses
- Add new NFR user (with optional Supabase invite)
- Toggle pro status on/off
- Add/edit notes
- Delete NFR records

### User Management

**Page**: `/admin/users`

**Features**:

- View all users
- See subscription status (includes source: NFR, Stripe, iOS)
- Force refresh subscription status
- View subscription details from all sources

## Flow Diagrams

### User Login Flow

```
User logs in
    ↓
Check user_management (NFR)
    ↓ (if no NFR)
Check ios_subscriptions
    ↓
Check stripe_subscriptions
    ↓
Determine highest priority
    ↓
Update profiles.subscription
    ↓
Return to client with subscription status
```

### iOS Purchase Flow

```
User makes iOS purchase
    ↓
StoreKit processes payment
    ↓
App gets receipt data
    ↓
Call /api/ios/validate-receipt
    ↓
Server validates with Apple
    ↓
Store in ios_subscriptions
    ↓
Run unified auth check
    ↓
Update profiles.subscription
    ↓
Return subscription status
```

### Stripe Purchase Flow

```
User purchases on website
    ↓
Stripe processes payment
    ↓
Stripe webhook fires
    ↓
Update stripe_subscriptions (via wrapper)
    ↓
Update profiles.subscription
    ↓
Next login runs unified check
```

## Database Queries

### Check All Subscriptions for a User

```sql
-- NFR
SELECT 'nfr' as source, user_email, pro, notes
FROM user_management
WHERE user_email = 'user@example.com';

-- Stripe
SELECT 'stripe' as source,
       attrs->>'status' as status,
       (attrs->'current_period_end')::bigint as expires_at
FROM stripe_tables.stripe_subscriptions
WHERE customer = 'cus_xxx';

-- iOS
SELECT 'ios' as source,
       subscription_type,
       expires_date,
       validation_status
FROM ios_subscriptions
WHERE user_id = 'uuid'
  AND is_active = true
  AND expires_date > NOW();
```

### Get Current Authorization

```typescript
import { updateUserProStatus } from "@/utils/subscriptions/check-subscription";

const result = await updateUserProStatus(userId);
// Returns: { subscription, subscriptionExpiration, source }
// Note: isAuthorized can be determined by checking if subscription !== "none"
```

## Environment Variables

Required for iOS subscriptions:

```bash
APPLE_SHARED_SECRET=your_shared_secret_from_app_store_connect
```

Required for Stripe:

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Security Considerations

1. **NFR Table**: Protected by RLS, only admins can manage
2. **iOS Receipts**: Validated with Apple's servers, not client-trusted
3. **Stripe Data**: Synced via secure webhooks
4. **Profile Updates**: Only service role can write subscription status

## Monitoring

Track authorization sources:

```sql
-- Get distribution of authorization sources
SELECT
  COUNT(*) FILTER (WHERE subscription = 'lifetime') as lifetime_total,
  COUNT(*) FILTER (WHERE subscription = 'annual') as annual_total,
  COUNT(*) FILTER (WHERE subscription = 'monthly') as monthly_total,
  COUNT(*) FILTER (WHERE subscription = 'none') as none_total
FROM profiles;

-- Get NFR users
SELECT COUNT(*) as nfr_users
FROM user_management
WHERE pro = true;

-- Get active iOS subscriptions
SELECT COUNT(*) as active_ios
FROM ios_subscriptions
WHERE is_active = true
  AND validation_status = 'valid'
  AND expires_date > NOW();

-- Get active Stripe subscriptions
SELECT COUNT(*) as active_stripe
FROM stripe_tables.stripe_subscriptions
WHERE (attrs->>'status') IN ('active', 'trialing');
```

## Troubleshooting

### User Shows "none" but has NFR

- Check `user_management` table for email match (case-sensitive)
- Verify NFR endpoint is being called in login/refresh
- Check logs for unified auth check results

### iOS Subscription Not Working

- Check `ios_subscriptions` table for transaction
- Verify `validation_status` is "valid"
- Confirm `is_active` is true
- Check `expires_date` is in the future

### Stripe Subscription Not Syncing

- Check Stripe webhooks are configured
- Verify `stripe_tables.stripe_subscriptions` has data
- Check customer_id matches in profiles table

## Testing NFR Authorization

```typescript
// Test ryan@cymasphere.com (has NFR)
import { updateUserProStatus } from "@/utils/subscriptions/check-subscription";

const result = await updateUserProStatus(
  "900f11b8-c901-49fd-bfab-5fafe984ce72"
);
// Expected: { subscription: "lifetime", source: "nfr", subscriptionExpiration: null }
// Note: isAuthorized can be determined by checking if subscription !== "none"
```

## Summary

The unified authorization system ensures all users are properly authorized regardless of how they obtained access (NFR, Stripe, or iOS). The system:

- **Tracks** all subscriptions in Supabase
- **Validates** subscriptions from all sources
- **Prioritizes** subscriptions correctly (NFR > lifetime > annual > monthly)
- **Updates** user profiles with current subscription status
- **Works** seamlessly across web and iOS app
