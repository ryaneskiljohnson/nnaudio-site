# Lifetime Purchase Metadata Audit

## Summary
This audit ensures that all lifetime purchases (identified by lifetime price ID) get `purchase_type: "lifetime"` metadata set on the payment intent, going forward.

## Current Implementation

### ✅ Checkout Session Creation
1. **`app/api/stripe/checkout/route.ts`** (lines 496-503)
   - Sets `payment_intent_data.metadata.purchase_type = "lifetime"` when `planType === "lifetime"`
   - ✅ CORRECT

2. **`utils/stripe/actions.ts`** (lines 237-244)
   - Sets `payment_intent_data.metadata.purchase_type = "lifetime"` when `planType === "lifetime"`
   - ✅ CORRECT

### ✅ Webhook Fixes (Updated)
1. **`app/api/stripe/webhook/route.ts` - `checkout.session.completed`** (lines 195-249)
   - **BEFORE**: Only checked `metadata.plan_type === "lifetime"` from checkout session
   - **AFTER**: Now also checks invoice line items for lifetime price ID
   - Checks:
     - Checkout session metadata (`plan_type === "lifetime"`)
     - Invoice line items containing `STRIPE_PRICE_ID_LIFETIME` or `LIFETIME_PRICE_ID_2`
   - ✅ FIXED - Now detects lifetime purchases even if checkout session metadata is missing

2. **`app/api/stripe/webhook/route.ts` - `charge.succeeded`** (lines 356-387)
   - **BEFORE**: Only handled subscription charges
   - **AFTER**: Now also checks one-time payments (lifetime) and sets metadata
   - Checks invoice line items for lifetime price ID when invoice has no subscription
   - ✅ FIXED - Backup check for lifetime purchases

## How It Works Now

### Flow for New Lifetime Purchases:
1. **Checkout Session Created** → Sets `payment_intent_data.metadata.purchase_type = "lifetime"`
2. **Payment Completed** → Stripe creates payment intent (may or may not copy metadata)
3. **Webhook: `checkout.session.completed`** → 
   - Checks checkout session metadata OR invoice line items
   - If lifetime detected and metadata missing → Updates payment intent metadata
4. **Webhook: `charge.succeeded`** → 
   - Backup check: If invoice has lifetime price ID and no subscription → Updates payment intent metadata

### Detection Methods (in order of reliability):
1. ✅ Invoice line items with lifetime price ID (most reliable)
2. ✅ Checkout session metadata `plan_type === "lifetime"`
3. ✅ Payment intent metadata `purchase_type === "lifetime"` (what we're setting)

## Testing Checklist
- [ ] Create new lifetime checkout session → Verify metadata is set
- [ ] Complete lifetime purchase → Verify webhook sets metadata if missing
- [ ] Check payment intent in Stripe dashboard → Should have `purchase_type: "lifetime"`
- [ ] Verify subscription check function can detect lifetime purchase

## Known Issues (Fixed)
- ❌ **BEFORE**: Webhook only checked checkout session metadata, missed cases where metadata wasn't copied
- ✅ **AFTER**: Webhook now checks invoice line items, catches all lifetime purchases

## Files Modified
- `app/api/stripe/webhook/route.ts` - Enhanced lifetime detection in both `checkout.session.completed` and `charge.succeeded` events

