# Cymasphere Authorization System - Complete Summary

## ✅ Implementation Complete

The Cymasphere authorization system now tracks and validates access through **three sources**, all synchronized in Supabase:

### 1. NFR (Not For Resale) Licenses

**Table**: `user_management`

- Simple email-based pro status tracking
- Admins can grant/revoke via `/admin/nfr` page
- **Priority**: Highest - always grants lifetime access
- **Use case**: Influencers, team members, partners, special cases

**Example NFR users**:

- ryan@cymasphere.com (notes: "elite")
- lowheatbeats@gmail.com (notes: "Influencer NFR - 11/13/25")

### 2. Stripe Subscriptions

**Table**: `stripe_tables.stripe_subscriptions`

- Web-based purchases (monthly, annual, lifetime)
- Synced automatically via Stripe webhooks
- **Priority**: Second (competes with iOS based on type/expiration)
- **Use case**: Regular website customers

### 3. iOS In-App Purchases

**Table**: `ios_subscriptions`

- Native iOS StoreKit purchases
- Validated via Apple App Store receipts
- **Priority**: Second (competes with Stripe based on type/expiration)
- **Use case**: iOS app users

## Authorization Flow

### Login/Refresh Process

```
User logs in (web or app)
        ↓
Check NFR (user_management)
  ├─ If NFR → Return "lifetime"
  └─ If no NFR → Continue
        ↓
Check iOS subscriptions
        ↓
Check Stripe subscriptions
        ↓
Compare priorities:
  - lifetime > annual > monthly > none
  - If same priority, use later expiration
        ↓
Update profiles.subscription
        ↓
Return to client
```

### Priority Logic

```typescript
if (NFR.hasPro) {
  return "lifetime" from NFR;
}

if (iOS.type > Stripe.type) {
  return iOS subscription;
} else if (Stripe.type > iOS.type) {
  return Stripe subscription;
} else if (both have subscriptions) {
  return one with later expiration;
} else {
  return "none";
}
```

## Files Modified/Created

### Website (Next.js)

**New Files**:

- `utils/subscriptions/check-subscription.ts` - Centralized pro status update function (includes NFR, Stripe, and iOS support)
- `app/api/ios/validate-receipt/route.ts` - iOS receipt validation endpoint
- `supabase/migrations/20250130000000_add_ios_subscriptions.sql` - iOS table
- `AUTHORIZATION_SYSTEM.md` - Complete documentation

**Modified Files**:

- `app/api/auth/login/route.ts` - Uses unified auth check
- `app/api/auth/refresh/route.ts` - Uses unified auth check

**Existing Files** (unchanged but important):

- `utils/supabase/user-management.ts` - NFR checking functions
- `utils/stripe/supabase-stripe.ts` - Stripe subscription checking
- `app/(private)/(admin)/admin/nfr/page.tsx` - NFR management UI

### iOS App (JUCE/C++)

**New Files**:

- `Source/SDK/iOSKeyboardHelper.h` - iOS keyboard configuration
- `Source/SDK/iOSKeyboardHelper.mm` - Forces wide keyboard

**Modified Files**:

- `Source/SDK/StoreKitManager.cpp` - Validates receipts with server
- `Source/SDK/StoreKitBridge.h` - Added receipt retrieval
- `Source/SDK/StoreKitBridge.mm` - Implements receipt retrieval
- `Source/Authentication/HubAuthComponent.cpp` - Wide keyboard config
- `Source/UI/Generic/RenameWindow.cpp` - Wide keyboard config
- `Source/UI/Songbar/Counter.cpp` - Wide keyboard config
- `Source/UI/Windows/GroovePresetsWindow.cpp` - Wide keyboard config
- `Source/UI/Windows/GenerateGrooveWindow.cpp` - Wide keyboard config
- `Cymasphere.jucer` - Added iOSKeyboardHelper files

**Existing Files** (unchanged):

- `Source/Authentication/AuthenticationManager.cpp` - Receives subscription from API

## How Each Source Works

### NFR Authorization

**Grant NFR**:

1. Admin visits `/admin/nfr`
2. Adds user email with `pro=true`
3. Optionally adds notes

**Check NFR**:

1. User logs in
2. `updateUserProStatus()` queries `user_management`
3. If `pro=true`, returns `subscription="lifetime"`, `source="nfr"`
4. Profile updated with lifetime access

**Admin UI**: Full CRUD interface at `/admin/nfr`

### Stripe Authorization

**Purchase**:

1. User visits website pricing page
2. Selects plan and checks out via Stripe
3. Stripe webhook fires on subscription creation
4. Subscription synced to `stripe_tables.stripe_subscriptions`

**Check Stripe**:

1. User logs in
2. `updateUserProStatus()` queries Stripe tables
3. Returns subscription type and expiration
4. Profile updated

**Automatic**: No manual intervention needed

### iOS Authorization

**Purchase**:

1. User opens iOS app
2. Clicks purchase in app
3. StoreKit processes payment
4. App retrieves receipt
5. App calls `/api/ios/validate-receipt`
6. Server validates with Apple
7. Server stores in `ios_subscriptions`

**Check iOS**:

1. User logs in (web or app)
2. `updateUserProStatus()` queries `ios_subscriptions` (includes test receipts)
3. Returns active, valid, non-expired subscriptions
4. Profile updated

**Validation**: Receipt validated with Apple on each purchase/restore

## Database Schema

### user_management (NFR)

```sql
CREATE TABLE user_management (
  user_email TEXT PRIMARY KEY,
  pro BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT
);
```

### ios_subscriptions (iOS)

```sql
CREATE TABLE ios_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  subscription_type subscription_type NOT NULL,
  expires_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL,
  validation_status TEXT NOT NULL,
  receipt_data TEXT NOT NULL,
  -- ... more fields
);
```

### stripe_tables.stripe_subscriptions (Stripe)

```sql
-- Managed by Stripe Wrapper extension
-- Synced automatically via webhooks
```

### profiles (Consolidated Status)

```sql
-- profiles table stores the FINAL subscription status
subscription: subscription_type  -- Result from unified auth check
subscription_expiration: TIMESTAMPTZ  -- Null for NFR/lifetime
```

## API Endpoints

### `/api/auth/login` (POST)

- Authenticates user
- Runs unified authorization check (NFR → iOS → Stripe)
- Returns subscription status

### `/api/auth/refresh` (POST)

- Refreshes access token
- Re-validates authorization from all sources
- Returns updated subscription status

### `/api/ios/validate-receipt` (POST)

- Validates iOS receipt with Apple
- Stores in `ios_subscriptions` table
- Returns subscription details

### `/api/user/nfr-status` (GET)

- Returns user's NFR status
- Used for displaying NFR badge/info

## Current Status

### Database

- ✅ `user_management` table exists (NFR)
- ✅ `ios_subscriptions` table created
- ✅ `stripe_tables.stripe_subscriptions` exists (via wrapper)
- ✅ All three sources tracked in Supabase

### Code

- ✅ Unified authorization check function
- ✅ Login route uses unified check
- ✅ Refresh route uses unified check
- ✅ iOS receipt validation endpoint
- ✅ iOS app validates receipts with server
- ✅ NFR admin interface

### Tested

- ✅ ryan@cymasphere.com has NFR, profile shows lifetime ✓
- ✅ ryaneskiljohnson@gmail.com has Stripe monthly ✓
- ⏳ iOS subscriptions (pending iOS purchases)

## Example Queries

### Check User's Authorization Sources

```sql
SELECT
  p.email,
  p.subscription as final_subscription,
  um.pro as has_nfr,
  um.notes as nfr_notes,
  (SELECT COUNT(*) FROM ios_subscriptions
   WHERE user_id = p.id AND is_active = true
   AND expires_date > NOW()) as active_ios,
  CASE WHEN p.customer_id IS NOT NULL THEN true ELSE false END as has_stripe
FROM profiles p
LEFT JOIN user_management um ON um.user_email = p.email
WHERE p.email = 'user@example.com';
```

### Get All Active Subscriptions Across All Sources

```sql
SELECT 'NFR' as source, user_email, 'lifetime' as type
FROM user_management WHERE pro = true
UNION ALL
SELECT 'iOS', u.email, ios.subscription_type::text
FROM ios_subscriptions ios
JOIN auth.users u ON u.id = ios.user_id
WHERE ios.is_active = true AND ios.expires_date > NOW()
UNION ALL
SELECT 'Stripe', p.email, p.subscription::text
FROM profiles p
WHERE p.customer_id IS NOT NULL AND p.subscription != 'none';
```

## iOS App Considerations

The iOS app receives `subscription` from the API and uses it for authorization:

```cpp
// AuthData structure
struct AuthData {
  juce::String subscription;  // "none", "monthly", "annual", "lifetime"
  // ...
};

// Authorization check
bool hasValidSubscription() const {
  return !subscription.equalsIgnoreCase("none") && !subscription.isEmpty();
}

bool getAuthenticated() const {
  return authData.hasValidSubscription();
}
```

The app doesn't need to know the source (NFR, Stripe, or iOS) - it only needs to know the subscription type. The server handles determining the source and priority.

## Testing Checklist

- [x] NFR grants lifetime access
- [x] Stripe subscriptions sync correctly
- [x] iOS subscriptions table created
- [x] Login route checks all three sources
- [x] Refresh route checks all three sources
- [x] Profile updates with highest priority subscription
- [ ] iOS purchase flow end-to-end test
- [ ] Subscription expiration handling
- [ ] Subscription upgrades/downgrades

## Notes

- NFR always takes priority (grants lifetime regardless of other subscriptions)
- iOS and Stripe compete based on subscription type and expiration
- All subscriptions are tracked in Supabase
- Profile table always reflects current authorization status
- iOS app receives subscription type in login/refresh responses
- System is backwards compatible with existing users
