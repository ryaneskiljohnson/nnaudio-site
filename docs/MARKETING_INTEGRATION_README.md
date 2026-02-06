# 🎯 Marketing & Analytics Integration - Complete Setup

This README summarizes the complete marketing and analytics integration implemented for Cymasphere.

## ✅ What's Included

### 1. Tracking Infrastructure
- ✅ **Google Tag Manager** - Central tag management
- ✅ **Google Analytics 4** - Website analytics
- ✅ **Meta Pixel** - Facebook/Instagram pixel tracking
- ✅ **Meta Conversions API** - Server-side conversion tracking (no Stape.io needed!)

### 2. Complete API Implementation
- ✅ `/api/meta/events` - Server-side conversion tracking endpoint
- ✅ PII hashing (SHA-256) - Automatic hashing of emails, phones, names
- ✅ Event deduplication - Built-in deduplication system
- ✅ Rate limiting - 100 requests per IP per 60 seconds
- ✅ Comprehensive logging - All events logged to Supabase

### 3. Utility Functions
- ✅ `trackMetaConversion()` - Easy-to-use conversion tracking
- ✅ `trackEvent()` - GA/GTM event tracking
- ✅ `trackPageView()` - Page view tracking
- ✅ `trackPurchase()` - Purchase event tracking
- ✅ Plus 10+ more specialized tracking functions

### 4. Documentation
- ✅ Quick start guide (7 steps)
- ✅ Comprehensive setup guide
- ✅ Meta cAPI documentation
- ✅ 10+ real-world integration examples
- ✅ Troubleshooting & FAQ

---

## 🚀 Quick Start (5 minutes)

### Step 1: Get Your Credentials

**Meta Pixel ID** (from Events Manager):
```
https://business.facebook.com/events_manager2 → Copy numeric ID
```

**Meta API Token** (from Business Suite):
```
https://business.facebook.com → Settings → Data Sources → Generate Token
```

### Step 2: Add Environment Variables

```bash
# .env.local
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
META_CONVERSIONS_API_TOKEN=your_token_here

# Optional (for GTM/GA)
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Step 3: Apply Database Migration

```bash
npx supabase migration apply
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

### Step 5: Test It

```typescript
import { trackMetaConversion } from '@/utils/analytics';

// In any user action handler:
await trackMetaConversion('Purchase', {
  email: user.email,
  value: 99.99,
  currency: 'USD',
  transactionId: order.id,
});
```

### Step 6: Verify in Meta

1. Go to https://business.facebook.com/events_manager2
2. Add `testEventCode: 'TEST123'` to tracking call
3. Go to Test Events tab
4. Should see your event within 5 seconds

### Step 7: Deploy!

```bash
git add .
git commit -m "Add Meta Conversions API integration"
git push
```

---

## 📁 Files Created/Modified

### New Files

**API Endpoint:**
- `app/api/meta/events/route.ts` - Meta cAPI endpoint (250+ lines)

**Utilities:**
- `utils/meta-conversions-api.ts` - Meta event utilities (400+ lines)
- `utils/analytics.ts` - Analytics functions (382 lines)

**Components:**
- `components/analytics/Analytics.tsx` - Analytics loader component

**Database:**
- `supabase/migrations/20250115000001_create_meta_conversion_events.sql` - Event logging table

**Documentation:**
- `docs/MARKETING_ANALYTICS_SETUP.md` - Full setup guide
- `docs/META_CONVERSIONS_API.md` - cAPI documentation
- `docs/META_CAPI_QUICK_START.md` - Quick reference
- `docs/INTEGRATION_SUMMARY.md` - Complete summary
- `docs/INTEGRATION_EXAMPLES.md` - 10+ code examples

**This File:**
- `MARKETING_INTEGRATION_README.md` - You are here

### Modified Files

- `components/common/NextScript.tsx` - Added GTM & Meta Pixel components
- `app/layout.tsx` - Integrated Analytics component

---

## 🎯 Usage Examples

### Track a Purchase

```typescript
import { trackMetaConversion } from '@/utils/analytics';

await trackMetaConversion('Purchase', {
  email: user.email,
  value: 99.99,
  currency: 'USD',
  transactionId: order.id,
  numItems: 1,
});
```

### Track a Sign Up

```typescript
await trackMetaConversion('CompleteRegistration', {
  email: newUser.email,
  firstName: newUser.firstName,
  lastName: newUser.lastName,
  country: 'US',
});
```

### Track a Lead

```typescript
await trackMetaConversion('Lead', {
  email: formData.email,
  phone: formData.phone,
  firstName: formData.firstName,
  lastName: formData.lastName,
});
```

### Track in Stripe Webhook

```typescript
// app/api/stripe/webhook/route.ts
if (event.type === 'charge.succeeded') {
  const charge = event.data.object;
  await trackMetaConversion('Purchase', {
    email: charge.billing_details.email,
    value: charge.amount / 100,
    currency: charge.currency.toUpperCase(),
    transactionId: charge.id,
  });
}
```

See `docs/INTEGRATION_EXAMPLES.md` for 10+ more examples!

---

## 🔑 Environment Variables

### Required for Meta cAPI

```bash
# Your Meta Pixel ID (numeric)
NEXT_PUBLIC_META_PIXEL_ID=123456789012345

# Meta API Access Token (keep SECRET!)
META_CONVERSIONS_API_TOKEN=your_access_token_here
```

### Optional for GTM/GA

```bash
# Google Tag Manager Container ID
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX

# Google Analytics Measurement ID
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 🧪 Testing Checklist

```bash
☐ Environment variables set
☐ Dev server restarted
☐ Database migration applied
☐ Call trackMetaConversion in browser console
☐ Check Network tab for /api/meta/events POST (should be 200)
☐ Check Supabase: SELECT * FROM meta_conversion_events
☐ Add testEventCode and check Meta Events Manager
☐ All tests pass!
```

---

## 📚 Documentation Index

1. **[Quick Start](docs/META_CAPI_QUICK_START.md)** ⚡
   - 7-step setup
   - Quick code examples
   - Verification checklist

2. **[Full Setup Guide](docs/MARKETING_ANALYTICS_SETUP.md)** 📖
   - GTM/GA/Pixel setup
   - Team member invitations
   - Complete testing procedures

3. **[Meta cAPI Documentation](docs/META_CONVERSIONS_API.md)** 🔍
   - Architecture explanation
   - All event types
   - Best practices
   - Monitoring & maintenance
   - FAQ & troubleshooting

4. **[Integration Examples](docs/INTEGRATION_EXAMPLES.md)** 💡
   - Stripe webhook integration
   - Email campaign tracking
   - User signup tracking
   - Contact form tracking
   - Video view tracking
   - And 5+ more examples

5. **[Complete Summary](docs/INTEGRATION_SUMMARY.md)** 📊
   - Full feature overview
   - Architecture diagram
   - Setup checklist
   - Monitoring queries
   - Next steps

---

## 🔄 How It Works

```
User Action
    ↓
trackMetaConversion('Purchase', {...})
    ↓
POST /api/meta/events
    ↓
Backend:
  1. Validate
  2. Hash PII (SHA-256)
  3. Log to Supabase
  4. Send to Meta API
    ↓
Meta Conversions API
    ↓
Your Ad Account
```

---

## ⭐ Key Features

### ✨ Automatic PII Hashing
All personally identifiable information is automatically hashed:
- Emails → SHA-256
- Phone numbers → SHA-256 (digits only)
- First names → SHA-256
- Last names → SHA-256
- City, state, zip → SHA-256

### 🔄 Event Deduplication
- Built-in deduplication using event IDs
- Prevents double-counting from pixel + cAPI
- Meta handles deduplication server-side

### 📊 Comprehensive Logging
All events logged to Supabase for:
- Debugging issues
- Compliance audits
- Error tracking
- Success rate monitoring

### 🛡️ Rate Limiting
Built-in rate limiting: 100 requests per IP per 60 seconds

### ⚡ Non-Blocking
Tracking failures don't interrupt user experience

---

## 🐛 Troubleshooting

### Events Not in Meta

1. Check environment variables are correct
2. Verify token hasn't expired
3. Use testEventCode to test
4. Check /api/meta/events in Network tab (should be 200)
5. Check Supabase logs for errors

### Rate Limited (429)

Normal if testing aggressively. Wait 60 seconds and retry.

### PII Hashing Issues

- Verify data consistency (same email for same user)
- Check phone numbers are complete
- Ensure names are correct

See `docs/META_CONVERSIONS_API.md` for complete troubleshooting guide.

---

## 🎯 Why Build It Ourselves vs Stape.io?

### ✅ Building It Ourselves
- You own the code and integration
- No monthly fees ($50-200+)
- Full control over data
- Better for privacy/compliance
- Can customize event data
- Full audit trail in your database

### ❌ Stape.io Alternative
- Monthly subscription cost
- Vendor lock-in
- Less control
- Still need GTM anyway
- Hidden complexity

**We chose to build it ourselves** because you have:
- Custom Next.js backend ✓
- Supabase database ✓
- Server-side capabilities ✓
- Privacy requirements ✓

---

## 🚀 Next Steps

1. **This Week**
   - [ ] Add environment variables
   - [ ] Run database migration
   - [ ] Test locally with testEventCode
   - [ ] Deploy to production

2. **Next Week**
   - [ ] Invite team members to Meta Business Account
   - [ ] Set up GTM & GA (optional)
   - [ ] Monitor conversion tracking accuracy
   - [ ] Add tracking to key user flows

3. **Ongoing**
   - [ ] Monitor Supabase logs daily
   - [ ] Check Meta Events Manager weekly
   - [ ] Run SQL monitoring queries
   - [ ] Optimize event tracking

---

## 📞 Support

### Documentation
- Complete setup: `docs/MARKETING_ANALYTICS_SETUP.md`
- cAPI docs: `docs/META_CONVERSIONS_API.md`
- Code examples: `docs/INTEGRATION_EXAMPLES.md`

### Official Resources
- Meta cAPI: https://developers.facebook.com/docs/marketing-api/conversions-api
- Events Manager: https://business.facebook.com/events_manager2
- GTM: https://support.google.com/tagmanager
- GA4: https://support.google.com/analytics

### Debugging Tools
- Google Tag Assistant (Chrome Extension)
- Meta Pixel Helper (Chrome Extension)
- Browser DevTools Network tab
- Supabase Dashboard

---

## 📝 Summary

You now have:

✅ **Google Tag Manager** - Central tracking hub  
✅ **Google Analytics** - Website behavior  
✅ **Meta Pixel** - Ads retargeting  
✅ **Meta Conversions API** - Reliable server-side tracking  
✅ **Comprehensive logging** - Supabase audit trail  
✅ **Easy-to-use functions** - `trackMetaConversion()` anywhere  
✅ **Production-ready** - Rate limiting, error handling, docs  
✅ **Real-world examples** - 10+ integration examples  

**Total investment**: 2 environment variables + run migration

**Monthly cost**: $0 (vs $50-200+ with Stape.io)

**Setup time**: 5-10 minutes

Let's get tracking! 🚀

---

**Questions?** Check the docs or start with `docs/META_CAPI_QUICK_START.md`




