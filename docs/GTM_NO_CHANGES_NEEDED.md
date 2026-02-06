# GTM Configuration - No Changes Needed

## Question: Do I need to do anything different in Google Tags?

## Answer: **NO** ✅

---

## Why No Changes Are Needed

Your existing GTM tags will automatically capture all the dataLayer events that are being pushed:

### Events GTM Captures Automatically:
1. ✅ `registration_success` (with user data)
2. ✅ `free_trial` (with user data)
3. ✅ `subscription_success` (with value, currency, user data)
4. ✅ `user_data` (user_id and email_sha256)

### Your Current GTM Tags:

**Tag 1: GA4 - Configuration**
- **Measurement ID:** G-TH7Q8MTZDB
- **Trigger:** All Pages
- **Status:** ✅ Working

**Tag 2: GA4 - Event Tracking**
- **Event Name:** `{{Event}}` (dynamic variable)
- **Trigger:** Custom Event
- **Status:** ✅ Working
- **Captures:** All dataLayer events automatically

---

## Where Trial Period (7 vs 14 days) Is Tracked

### ✅ Meta Ads Manager (Primary for Attribution)
**Tracked via:** Stripe webhooks → Meta Conversions API

**Event Structure:**
```javascript
{
  event_name: "Subscribe",
  custom_data: {
    content_name: "monthly_6_trial7",    // ← Trial period included
    trial_days: 7,
    subscription_type: "monthly",
    value: 6,
    currency: "USD"
  }
}
```

**Reports Available:**
- Filter by `monthly_6_trial7` vs `monthly_6_trial14`
- Compare conversion rates by trial period
- Full ad attribution for 14-day window

### ℹ️ GA4 (Basic Analytics)
**Tracked via:** GTM → GA4

**Event Structure:**
```javascript
{
  event: "free_trial",
  user: {
    user_id: "...",
    email_sha256: "..."
  }
}
```

**What's Available:**
- Total free trial count
- User identification (cross-session tracking)
- No distinction between 7-day vs 14-day trials

**Why:** Trial period distinction is most important for Meta ads (already tracked). GA4 gets basic trial events which is sufficient for website analytics.

---

## Current DataLayer Implementation

### Event 1: Registration
```javascript
{
  event: 'user_data',
  user: { user_id: '...', email_sha256: '...' }
}
{
  event: 'registration_success',
  user: { user_id: '...', email_sha256: '...' }
}
```

### Event 2: Free Trial
```javascript
{
  event: 'user_data',
  user: { user_id: '...', email_sha256: '...' }
}
{
  event: 'free_trial',
  user: { user_id: '...', email_sha256: '...' }
}
```

### Event 3: Paid Subscription
```javascript
{
  event: 'user_data',
  user: { user_id: '...', email_sha256: '...' }
}
{
  event: 'subscription_success',
  subscription: { value: 6, currency: 'USD' },
  user: { user_id: '...', email_sha256: '...' }
}
```

---

## Optional Enhancement: Add Trial Period to GA4

**Only needed if:** You want to segment trial periods in GA4 reports (not just Meta)

**Would require:**
1. Passing `trial_days` in URL params from `/api/checkout-result`
2. Adding `trial_days` to dataLayer event
3. Creating custom dimension in GA4
4. Configuring custom parameter in GTM Event tag

**Current recommendation:** Not necessary. Meta has the detailed data you need for ad optimization.

---

## What You CAN See in GA4 Right Now

### Events:
- `registration_success` - User registrations
- `free_trial` - Trial starts (all trials combined)
- `subscription_success` - Paid subscriptions with revenue

### User Properties (via user object):
- `user_id` - Cross-session tracking
- `email_sha256` - Cross-device tracking

### E-commerce:
- `subscription.value` - Revenue per subscription
- `subscription.currency` - Currency

---

## Testing Your GTM Setup

### 1. Check GTM Preview Mode
1. Go to GTM → Click "Preview"
2. Enter your website URL
3. Perform action (register, start trial, subscribe)
4. Check "Data Layer" tab → Verify events appear

### 2. Check GA4 Real-Time
1. Go to GA4 → Reports → Realtime
2. Perform action on your site
3. Look for your custom events:
   - `registration_success`
   - `free_trial`
   - `subscription_success`

### 3. Check Meta Events Manager
1. Go to Meta Events Manager
2. Click "Test Events" tab
3. Enter test event code (if using)
4. Perform checkout
5. Verify events appear with:
   - `content_name` showing trial period
   - `trial_days` field populated

---

## Summary

### ✅ What's Working:
- GTM captures all dataLayer events automatically
- GA4 receives events and user data
- Meta CAPI receives detailed trial period info
- User identification works cross-session
- No configuration changes needed

### ❌ What's NOT Tracked (by design):
- Trial period (7 vs 14 days) in GA4
- This is intentional - Meta has this data where it matters most

### 💡 Recommendation:
**Keep current setup.** It's optimized for:
- Meta ads attribution (primary goal) ✅
- GA4 website analytics ✅
- User identity tracking ✅
- Cross-session/device attribution ✅

---

## Quick Reference: What Gets Tracked Where

| Data Point | Frontend DataLayer | Meta CAPI (Webhook) | GA4 (via GTM) |
|------------|-------------------|---------------------|---------------|
| **User ID** | ✅ Yes | ✅ Yes (hashed) | ✅ Yes |
| **Email** | ✅ Yes (SHA-256) | ✅ Yes (SHA-256) | ✅ Yes (SHA-256) |
| **Registration** | ✅ Yes | ❌ No | ✅ Yes |
| **Trial Start** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Trial Period (7 vs 14)** | ❌ No | ✅ Yes | ❌ No |
| **Plan Name** | ❌ No | ✅ Yes | ❌ No |
| **Subscription Value** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Event Deduplication** | ❌ No | ✅ Yes (event_id) | ❌ No |

---

## Final Answer

**Do you need to do anything different in Google Tags?**

# NO ✅

Your GTM is configured correctly and will automatically capture all the events you're pushing to the dataLayer.

The trial period distinction (7 vs 14 days) is tracked where it matters most: **Meta Conversions API** for ad attribution.

---

**Last Updated:** November 19, 2025  
**Status:** ✅ No changes required
