# API Routes Analysis and Conversion Plan

## Overview

This document categorizes all API routes to determine which can be converted to server functions and which must remain as API routes.

## Routes That MUST Remain as API Routes

### Webhooks (External Services)

These are called by external services and must remain as API routes:

- ✅ `/api/stripe/webhook` - Stripe webhook (signature verification required)
- ✅ `/api/webhooks/sendgrid` - SendGrid Event Webhook (optional signature verification)
- ✅ `/api/facebook-ads/callback` - Facebook OAuth callback (external redirect)

### Public Endpoints (No Authentication)

These are accessed publicly without authentication:

- ✅ `/api/unsubscribe` - Public unsubscribe endpoint (called from emails)
- ✅ `/api/email-campaigns/track/open` - Email tracking pixel (called from emails)
- ✅ `/api/email-campaigns/track/click` - Email click tracking (called from emails)
- ✅ `/api/contact` - Contact form (public page)

### Cron Jobs / Background Jobs

These are called by cron services:

- ✅ `/api/automation-engine/process-jobs` - Cron job (with auth header)
- ✅ `/api/automation-engine/process-events` - Cron job (with auth header)
- ✅ `/api/email-campaigns/process-scheduled` - Cron job (with auth header)

### Checkout/Redirect Callbacks

These handle external redirects:

- ✅ `/api/checkout-result` - Stripe checkout redirect callback

## Routes That CAN Be Converted to Server Functions

### Tutorial Routes (All internal, authenticated)

All these routes require authentication and can be server functions:

- 🔄 `/api/tutorials/videos` - GET videos (with filters)
- 🔄 `/api/tutorials/videos/[videoId]` - GET/PATCH video
- 🔄 `/api/tutorials/videos/[videoId]/progress` - GET/POST video progress
- 🔄 `/api/tutorials/videos/[videoId]/script` - GET video script
- 🔄 `/api/tutorials/videos-with-durations` - GET videos with durations
- 🔄 `/api/tutorials/playlists` - GET/POST playlists
- 🔄 `/api/tutorials/playlists/[id]` - GET/PATCH/DELETE playlist
- 🔄 `/api/tutorials/playlists/[id]/videos` - GET playlist videos
- 🔄 `/api/tutorials/playlists/[id]/progress` - GET playlist progress
- 🔄 `/api/tutorials/generate-playlist` - POST generate playlist
- 🔄 `/api/tutorials/user-profile` - GET user profile
- 🔄 `/api/tutorials/user-analytics` - GET user analytics
- 🔄 `/api/tutorials/progress` - GET/POST progress
- 🔄 `/api/tutorials/refresh-durations` - POST refresh durations (admin only)

### Email Campaign Routes (All admin, authenticated)

All these routes require admin authentication:

- 🔄 `/api/email-campaigns/campaigns` - GET/POST campaigns
- 🔄 `/api/email-campaigns/campaigns/[id]` - GET/PATCH/DELETE campaign
- 🔄 `/api/email-campaigns/campaigns/calculate-reach` - POST calculate reach
- 🔄 `/api/email-campaigns/campaigns/batch-reach` - POST batch reach
- 🔄 `/api/email-campaigns/audiences` - GET/POST audiences
- 🔄 `/api/email-campaigns/audiences/[id]` - GET/PATCH/DELETE audience
- 🔄 `/api/email-campaigns/audiences/[id]/subscribers` - GET/POST/DELETE audience subscribers
- 🔄 `/api/email-campaigns/subscribers` - GET subscribers
- 🔄 `/api/email-campaigns/subscribers/[id]` - GET subscriber
- 🔄 `/api/email-campaigns/subscribers/[id]/audience-memberships` - GET audience memberships
- 🔄 `/api/email-campaigns/templates` - GET/POST templates
- 🔄 `/api/email-campaigns/templates/[id]` - GET/PATCH/DELETE template
- 🔄 `/api/email-campaigns/send` - POST send campaign (admin only)
- 🔄 `/api/email-campaigns/preview` - GET preview (admin only)
- 🔄 `/api/email-campaigns/list-media` - GET list media (admin only)
- 🔄 `/api/email-campaigns/upload-media` - POST upload media (admin only)
- 🔄 `/api/email-campaigns/upload-image` - POST upload image (admin only)
- 🔄 `/api/email-campaigns/analytics` - GET analytics (admin only)
- 🔄 `/api/email-campaigns/deliverability` - GET deliverability (admin only)

### Stripe Routes (Internal, authenticated)

- 🔄 `/api/stripe/prices` - GET prices (can be public or authenticated)
- 🔄 `/api/stripe/checkout` - POST checkout (authenticated)
- 🔄 `/api/stripe/check-customer` - POST check customer (authenticated)
- 🔄 `/api/stripe/check-trial-status` - POST check trial (authenticated)

### Facebook Ads Routes (All admin, authenticated)

- 🔄 `/api/facebook-ads/connect` - POST connect (admin only)
- 🔄 `/api/facebook-ads/connection-status` - GET status (admin only)
- 🔄 `/api/facebook-ads/campaigns` - GET/POST campaigns (admin only)
- 🔄 `/api/facebook-ads/campaigns/[id]` - GET/DELETE campaign (admin only)
- 🔄 `/api/facebook-ads/campaigns/[id]/play` - POST play (admin only)
- 🔄 `/api/facebook-ads/campaigns/[id]/pause` - POST pause (admin only)
- 🔄 `/api/facebook-ads/adsets` - GET/POST adsets (admin only)
- 🔄 `/api/facebook-ads/ads` - GET/POST ads (admin only)
- 🔄 `/api/facebook-ads/audiences` - GET/POST audiences (admin only)
- 🔄 `/api/facebook-ads/stats` - GET stats (admin only)

### Utility Routes

- 🔄 `/api/get-current-user` - GET current user (can use server component)
- 🔄 `/api/translations` - GET translations (can be server component)
- 🔄 `/api/chat` - POST chat (authenticated, but might need streaming - keep as API route)
- 🔄 `/api/quickstart-guide` - GET guide (can be server component)
- 🔄 `/api/check-aws-env` - GET check (can be server function)

## Routes That MUST Remain as API Routes (Desktop App Compatibility)

### Auth Routes

These must remain as API routes for desktop app compatibility:

- ✅ `/api/auth/login` - POST login
- ✅ `/api/auth/logout` - POST logout
- ✅ `/api/auth/register` - POST register
- ✅ `/api/auth/confirm` - GET confirm
- ✅ `/api/auth/refresh` - POST refresh
- ✅ `/api/auth/sessions` - GET sessions

**Note:** These are required for desktop app HTTP-based authentication and cannot be converted to server functions.

### Scheduler Route

- ⚠️ `/api/scheduler` - Unknown usage, needs review

## Conversion Priority

### High Priority (Most Used)

1. Tutorial routes (heavily used in admin dashboard)
2. Email campaign routes (core admin functionality)
3. Stripe routes (used in billing/pricing)

### Medium Priority

4. Facebook Ads routes (admin functionality)
5. Utility routes (translations, current user)

### Low Priority

6. Debug routes (can be converted but not critical)
7. Scheduler route (needs review)

## Benefits of Converting to Server Functions

1. **Type Safety**: Better TypeScript support
2. **Simpler Code**: No need for `fetch()` calls, direct function calls
3. **Better Error Handling**: Native try/catch instead of response parsing
4. **Automatic Revalidation**: Built-in Next.js revalidation support
5. **Reduced Bundle Size**: Server functions don't add to client bundle
6. **Better Security**: Server-side only, no client exposure

## Implementation Plan

1. Create server functions in appropriate directories:

   - `app/actions/tutorials/` - Tutorial functions
   - `app/actions/email-campaigns/` - Email campaign functions
   - `app/actions/stripe/` - Stripe functions
   - `app/actions/facebook-ads/` - Facebook Ads functions

2. Update client components to use server functions instead of fetch

3. Keep API routes for routes that must remain (webhooks, public endpoints, cron jobs)

4. Test thoroughly to ensure functionality remains the same
