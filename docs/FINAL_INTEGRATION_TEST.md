# Final Marketing Integration Test Checklist

## ✅ PART 1: Environment Variables

### Local Environment (.env.local)
- [ ] `NEXT_PUBLIC_GTM_ID=GTM-MJSV92T9` present
- [ ] `NEXT_PUBLIC_META_PIXEL_ID=915245002872239` present
- [ ] `META_CONVERSIONS_API_TOKEN` present
- [ ] `NEXT_PUBLIC_SUPABASE_URL` present
- [ ] `SUPABASE_SERVICE_ROLE_KEY` present

### Vercel Environment Variables
- [ ] `NEXT_PUBLIC_GTM_ID` in Production
- [ ] `NEXT_PUBLIC_GTM_ID` in Preview
- [ ] `NEXT_PUBLIC_GTM_ID` in Development
- [ ] `NEXT_PUBLIC_META_PIXEL_ID` in Production
- [ ] `META_CONVERSIONS_API_TOKEN` in Production (encrypted)

---

## ✅ PART 2: Code Integration

### Analytics Component
- [ ] `components/analytics/Analytics.tsx` exists
- [ ] Loads GTM when `NEXT_PUBLIC_GTM_ID` is set
- [ ] Loads Meta Pixel when `NEXT_PUBLIC_META_PIXEL_ID` is set
- [ ] DataLayer initialization before GTM container
- [ ] NoScript fallback for both

### API Endpoint
- [ ] `/api/meta/events/route.ts` exists
- [ ] Has AbortController timeout (10 seconds)
- [ ] Logs to Supabase `meta_conversion_events`
- [ ] Rate limiting (100 requests per IP per 60 seconds)
- [ ] PII hashing (SHA-256)

### Utility Functions
- [ ] `utils/analytics.ts` exists
- [ ] `utils/meta-conversions-api.ts` exists
- [ ] `trackMetaConversion()` function available
- [ ] Event hashing functions working

### Database
- [ ] Migration `20250115000001_create_meta_conversion_events.sql` applied
- [ ] `meta_conversion_events` table exists in Supabase
- [ ] Table has RLS policies configured
- [ ] Indexes created for performance

---

## ✅ PART 3: Local Testing (npm run dev)

### 1. Server Starts Without Errors
- [ ] `npm run dev` starts successfully
- [ ] No build errors in console
- [ ] Server running on http://localhost:3000

### 2. GTM Script Loads
- [ ] Open http://localhost:3000 in browser
- [ ] Open DevTools (F12)
- [ ] Go to **Network** tab
- [ ] Filter by "gtm.js"
- [ ] Should see request to `https://www.googletagmanager.com/gtm.js?id=GTM-MJSV92T9`
- [ ] Status should be **200**

### 3. DataLayer Initialized
- [ ] Open DevTools **Console** tab
- [ ] Type: `window.dataLayer`
- [ ] Should return an array (not undefined)

### 4. Meta Pixel Loads
- [ ] Filter Network tab by "fbevents.js"
- [ ] Should see request to `https://connect.facebook.net/en_US/fbevents.js`
- [ ] Status should be **200**

### 5. Meta Pixel Cookie
- [ ] In Console, type: `fbq`
- [ ] Should return a function (not undefined)
- [ ] Pixel is loaded and ready

---

## ✅ PART 4: API Endpoint Test

### Test 1: Test Mode Event
```bash
curl -X POST http://localhost:3000/api/meta/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "Purchase",
    "userData": {"email": "test@cymasphere.com"},
    "testEventCode": "TEST123"
  }'
```

**Expected Response:**
- Status: 200
- Response: `{"success":true,"message":"Event logged (test mode)",...}`
- Response time: < 1 second

### Test 2: Production Mode Event
```bash
curl -X POST http://localhost:3000/api/meta/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "Lead",
    "userData": {"email": "lead@cymasphere.com"}
  }'
```

**Expected Response:**
- Status: 200 (or 200 with timeout error if Meta API is slow)
- Response: `{"success":true,"message":"Event sent to Meta Conversions API"}`

### Test 3: Database Logging
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM meta_conversion_events;
```

**Expected:**
- Should return a count of events
- Events are being logged to database

---

## ✅ PART 5: GTM Configuration Test

### 1. GTM Container Published
- [ ] Go to https://tagmanager.google.com
- [ ] Select container: GTM-MJSV92T9
- [ ] Check that latest version is **Published** (not Draft)

### 2. GTM Preview Mode Test
- [ ] Click **"Preview"** button in GTM
- [ ] Enter URL: `http://localhost:3000`
- [ ] Click **"Connect"**
- [ ] Navigate your site in another tab
- [ ] GTM Preview panel should show:
  - Page view events
  - GTM container loading
  - Any configured tags firing

### 3. GA4 Configuration Tag (if configured)
- [ ] In GTM, go to **Tags**
- [ ] Should see **"GA4 - Configuration"** tag
- [ ] Should see **"GA4 - Event"** tag (if created)
- [ ] Both should have **"All Pages"** or similar trigger

---

## ✅ PART 6: Team Access Verification

### GTM Team Access
- [ ] `matterandrew@gmail.com` invited with **"Edit"** permissions
- [ ] `willradio08@gmail.com` invited with **"Edit"** permissions
- [ ] `maciej.raszke@gmail.com` invited with **"Edit"** permissions

### GA4 Team Access
- [ ] `willradio08@gmail.com` invited with **"Viewer"** permissions
- [ ] `matterandrew@gmail.com` invited with **"Viewer"** permissions

---

## ✅ PART 7: Production Readiness

### Git & Deployment
- [ ] All changes committed to git
- [ ] No merge conflicts
- [ ] Latest commit: Meta API endpoint fix + GTM/GA4 setup
- [ ] Ready to push to production

### Environment Variables Set in Vercel
- [ ] All 3 GTM env vars in Vercel (Production, Preview, Dev)
- [ ] Meta Pixel ID in Vercel
- [ ] Meta API Token in Vercel (encrypted)

### No Hardcoded Credentials
- [ ] No API tokens in code
- [ ] No IDs in code (all from env vars)
- [ ] `.env.local` in `.gitignore`

---

## 📊 Final Checklist Summary

**Required for Launch:**
- [ ] All env variables set (local + Vercel)
- [ ] GTM container ID working
- [ ] Meta Pixel loading
- [ ] Meta API endpoint responding (with timeout)
- [ ] Database logging events
- [ ] Team members invited to GTM & GA4
- [ ] No errors in browser console
- [ ] No build errors

**Optional but Recommended:**
- [ ] GA4 tags configured in GTM
- [ ] GA4 real-time data visible
- [ ] GTM Preview mode working
- [ ] Custom events tracked

---

## 🚀 If All Green ✅

You're ready to:
1. Push to production: `git push origin main`
2. Deploy to Vercel (automatic)
3. Monitor real-time data in GTM Preview
4. Monitor conversion events in GA4 & Meta

## ⚠️ If Any Red ❌

Check the troubleshooting guide in `GTM_NEXT_STEPS.md` or `GA_SETUP_NEXT_STEPS.md`




