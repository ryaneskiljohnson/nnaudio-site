# Email to Maciej - Meta Purchase Event Fix

---

Hey Maciej,

Good catch! I found the issue with the Purchase event not sending `value` and `currency` to Meta. There were actually **two problems**:

## Problem 1: GTM Variable Paths Are Incorrect ❌

Your GTM variables are configured for nested paths, but our dataLayer uses **top-level fields**.

**What GTM currently has (INCORRECT):**
- `purchase.value` ❌
- `purchase.currency` ❌
- `purchase.name` ❌

**Actual dataLayer structure:**
```javascript
{
  event: 'purchase',
  event_id: 'cs_test_abc123...',
  user: {
    user_id: 'user-uuid-here',
    email_sha256: 'hashed-email'
  },
  value: 149.00,              // ⚠️ TOP LEVEL, not purchase.value
  currency: 'USD',            // ⚠️ TOP LEVEL, not purchase.currency
  transaction_id: 'cs_test_abc123...',
  items: [{                   // ⚠️ TOP LEVEL ARRAY, not purchase.items
    item_id: 'lifetime',
    item_name: 'Cymasphere Lifetime',  // Inside items[0]
    category: 'software',
    quantity: 1,
    price: 149.00
  }]
}
```

## Problem 2: Relying Only on GTM Forwarding

If GTM isn't configured correctly, Meta doesn't receive the parameters at all.

---

## ✅ The Fix (Already Deployed)

I've made two changes:

### 1. Direct Meta Pixel Firing
The checkout-success page now fires the Meta Pixel Purchase event **directly** with all parameters, so Meta receives `value` and `currency` even if GTM isn't configured correctly.

This means Purchase events are now working immediately, without waiting for GTM fixes.

### 2. Proper Event Deduplication
Added `eventID` parameter to prevent duplicate events between browser pixel and server-side Conversions API.

---

## 🔧 GTM Configuration Fix (For You)

To fix GTM forwarding, update your Data Layer Variables:

### Step 1: Update "value" Variable
1. Go to GTM → Variables → Find your "value" variable
2. Edit it:
   - Variable Type: `Data Layer Variable`
   - Data Layer Variable Name: `value` (remove "purchase." prefix)
   - Data Layer Version: `Version 2`
3. Save

### Step 2: Update "currency" Variable
1. Find your "currency" variable
2. Edit it:
   - Variable Type: `Data Layer Variable`
   - Data Layer Variable Name: `currency` (remove "purchase." prefix)
   - Data Layer Version: `Version 2`
3. Save

### Step 3: Update "name" Variable (if you have one)
1. Find your product name variable
2. Edit it:
   - Variable Type: `Data Layer Variable`
   - Data Layer Variable Name: `items.0.item_name` (or `items[0].item_name` depending on GTM version)
   - Data Layer Version: `Version 2`
3. Save

### Step 4: Publish Changes
1. Click "Submit" in GTM
2. Version Name: "Fix Purchase event parameters"
3. Publish

---

## 🧪 Testing

### Immediate Test (Without GTM Changes)
1. Make a test purchase on staging/production
2. Go to Meta Events Manager → Test Events
3. You should now see Purchase events with `value` and `currency` parameters ✅

This works immediately because we're firing Meta Pixel directly.

### After GTM Fix
1. Make another test purchase
2. Open browser DevTools → Console
3. Type: `window.dataLayer`
4. Find the `purchase` event object
5. Verify GTM variables are pulling the correct data

### Verify in Console
You can also check the dataLayer structure before purchase:
```javascript
// In browser console on checkout-success page
console.log(window.dataLayer);
// Look for the purchase event with value and currency at top level
```

---

## 📊 What You'll See in Meta Events Manager

After the fix, each Purchase event should show:
- ✅ **Event Name:** Purchase
- ✅ **Value:** 149.00 (or actual purchase amount)
- ✅ **Currency:** USD
- ✅ **Content IDs:** ["lifetime"]
- ✅ **Contents:** [{id: "lifetime", quantity: 1, item_price: 149.00}]
- ✅ **Event ID:** cs_test_... (for deduplication)

---

## 📄 Documentation

I've created detailed documentation in the repo:
- **File:** `META_PURCHASE_EVENT_STRUCTURE.md`
- **Location:** Root of repository
- **Contents:** Complete dataLayer structure, GTM configuration steps, and examples

---

## Summary

✅ **Immediate fix deployed:** Meta Pixel now fires directly with parameters (no GTM needed)  
🔧 **GTM fix needed:** Update 3 variables to remove "purchase." prefix  
📊 **Result:** Meta will receive value and currency for all Purchase events  
⏱️ **ETA:** Should work immediately for new purchases, GTM fix is optional but recommended

Let me know if you see the parameters coming through now, or if you need help with the GTM configuration!

Best,
Ryan

