# Email Campaigns — Study Guide

Study guide for the NNAudio email campaigns system: architecture, flows, and where to look in the codebase.

---

## 1. Overview

The system supports:

- **Draft** → save campaigns without sending
- **Immediate send** → send now to selected audiences
- **Scheduled send** → cron runs every minute and sends campaigns whose `scheduled_at` has passed
- **Test send** → send a single email to a test address with `[TEST]` in the subject

Status flow: `draft` → `scheduled` → `sending` → `sent` / `failed`.

---

## 2. Key Documentation

| Doc | Purpose |
|-----|--------|
| `docs/SCHEDULED_CAMPAIGNS_README.md` | Scheduled campaigns: cron, status flow, env, troubleshooting |
| `docs/EMAIL_TRACKING_DEBUG.md` | Open/click tracking, pixel blocking, testing |
| `docs/README_IMAGE_STORAGE.md` | Image upload for campaigns (`POST /api/email-campaigns/upload-image`) |

---

## 3. Database (Supabase)

### Core tables

- **`email_campaigns`** — Name, subject, sender, preheader, `html_content` / `text_content`, status, `scheduled_at`, `sent_at`, stats.
- **`email_campaign_audiences`** — Campaign ↔ audience (many-to-many), with `is_excluded` for exclude lists.
- **`email_audiences`** — Audience name, description, `filters` (e.g. `audience_type`: static/dynamic, rules).
- **`email_audience_subscribers`** — Static audience membership (audience_id, subscriber_id).
- **`subscribers`** — Email, status (e.g. active/INACTIVE), metadata (first_name, last_name).
- **`email_sends`** — Per-recipient send: campaign_id, subscriber_id, status, `sent_at`, `message_id`, used for tracking.

### Status and scheduling

- Campaign status: `draft` | `scheduled` | `sending` | `sent` | `failed`.
- Scheduled: `status = 'scheduled'` and `scheduled_at <= NOW()`.
- Cron uses **service role** Supabase client (bypasses RLS).

Migrations: `supabase/migrations/` (e.g. `20241221000000_create_email_campaigns_system.sql`, `20250626072846_fix_campaign_schema_fields.sql`).

---

## 4. API Routes

| Route | Method | Purpose |
|-------|--------|--------|
| `/api/email-campaigns/campaigns` | GET | List campaigns (paginated), with audience relations |
| `/api/email-campaigns/campaigns` | POST | Create campaign + optional audience relations |
| `/api/email-campaigns/campaigns/[id]` | GET/PATCH/DELETE | Single campaign CRUD |
| `/api/email-campaigns/process-scheduled` | POST | **Cron**: find due campaigns, resolve audiences, send, update status |
| `/api/email-campaigns/track/open` | GET | Tracking pixel (open); records open, returns 1×1 PNG |
| `/api/email-campaigns/track/click` | GET | Click redirect; records click, redirects to `url` param |
| `/api/email-campaigns/upload-image` | POST | Upload image for campaign content |

All campaign APIs assume admin (enforced via RLS or auth checks). Process-scheduled is secured by Vercel cron signature or `Authorization: Bearer {CRON_SECRET}`.

---

## 5. Server Actions (app/actions/email-campaigns)

- **`send.ts`** — Main send logic:
  - **Test email**: if `testEmail` is set, send one email with `[TEST]` subject and return.
  - **Draft**: validate and return success without sending.
  - **Scheduled**: validate date/time, ensure `scheduled_at` is in the future, update campaign `scheduled_at` and `status = 'scheduled'`; actual send is done by cron.
  - **Immediate**: resolve subscribers from `audienceIds` / `excludedAudienceIds`, create/use campaign row, generate HTML/text (with tracking), create `email_sends` rows, call `sendEmail()` per recipient, update campaign stats and `html_content`.
- **Audience resolution** in `send.ts`: supports **static** audiences (from `email_audience_subscribers`) and **dynamic** audiences (from `subscribers` + `filters.rules`, e.g. status, subscription). Excluded audiences remove subscribers from the final list. Unsubscribed (e.g. status `INACTIVE` / `unsubscribed`) are filtered out.
- **Safety**: `DEVELOPMENT_MODE` / `TEST_MODE` and `SAFE_TEST_EMAILS` / `TEST_AUDIENCE_NAMES` restrict who receives in dev (currently both set to `false`).

Other actions in `app/actions/email-campaigns/`: e.g. `getCampaign`, `getAudiences`, `getTemplates`, `calculateReach`, `previewEmail` — used by the admin create/edit campaign UI.

---

## 6. Email Generation & Tracking

- **`utils/email-campaigns/email-generation.ts`**
  - `generateHtmlFromElements(emailElements, subject, campaignId?, subscriberId?, sendId?, preheader?)` — Builds HTML from visual editor elements; injects open-tracking pixel and rewrites links to `/api/email-campaigns/track/click?c=&u=&s=&url=`.
  - `generateTextFromElements(elements)` — Plain text version.
  - `personalizeContent(htmlOrText, subscriber)` — Replaces `{{firstName}}`, `{{lastName}}`, `{{email}}`, etc.
- **`utils/email-tracking.ts`** — Used by process-scheduled route: `injectEmailTracking`, `createSendRecord` (align with how send action creates `email_sends` and injects tracking in HTML).

Open tracking is image-based; many clients block images by default, so opens may be undercounted (see `docs/EMAIL_TRACKING_DEBUG.md`). Click tracking is more reliable.

---

## 7. Scheduled Send Flow (Cron)

1. **Trigger**: Vercel cron every minute (`vercel.json` → `path: "/api/email-campaigns/process-scheduled"`).
2. **Auth**: Request must have Vercel cron signature or `Authorization: Bearer {CRON_SECRET}`.
3. **Client**: Supabase **service role** client (no user session).
4. **Query**: Campaigns where `status = 'scheduled'` and `scheduled_at <= NOW()`.
5. **Per campaign**:
   - Set status to `sending`.
   - Resolve recipients from `email_campaign_audiences` (included/excluded) and audience/subscriber tables.
   - For each recipient: create/update send record, generate personalized HTML (with tracking), send via `sendEmail` (or batch if `ENABLE_BATCH_EMAIL_SENDING=true`).
   - Update campaign: `sent_at`, counts, `status = 'sent'` or `'failed'`.
6. **Config**: Optional env vars: `CRON_SECRET`, `ENABLE_BATCH_EMAIL_SENDING`, `EMAIL_PARALLEL_BATCH_SIZE`, `EMAIL_BATCH_DELAY_MS`.

Details: `docs/SCHEDULED_CAMPAIGNS_README.md` and `app/api/email-campaigns/process-scheduled/route.ts`.

---

## 8. Admin UI

- **Create/Edit**: `app/(private)/(admin)/admin/email-campaigns/campaigns/create/page.tsx` (and edit via same page with `editId`).
- Uses: `getCampaign`, `getAudiences`, `getTemplates`, `calculateReach`, `sendCampaign`, `previewEmail` from `@/app/actions/email-campaigns`, and `VisualEditor` from `@/components/email-campaigns`.
- Flow: User sets name, subject, sender, reply-to, preheader, audiences (included/excluded), content (visual elements), then either Save as draft, Send now, or Schedule for later. Schedule writes `scheduled_at` and `status = 'scheduled'` via the same send action that handles scheduling.

---

## 9. Sending & Deliverability

- **Outbound email**: Implemented in `utils/email.ts` (e.g. `sendEmail`, and optionally `sendBatchEmail`). No SMTP/config detail in this study doc; check that file and env (e.g. Resend, SendGrid, SES).
- **From/reply-to**: Campaign has `sender_name`, `sender_email`, `reply_to_email`; default in code is NNAudio / support@nnaud.io.

---

## 10. Quick Reference — Where to Look

- **List/create/update campaigns**: `app/api/email-campaigns/campaigns/route.ts`, `app/api/email-campaigns/campaigns/[id]/route.ts`.
- **Send logic (immediate + schedule persistence)**: `app/actions/email-campaigns/send.ts`.
- **Cron send**: `app/api/email-campaigns/process-scheduled/route.ts`.
- **HTML/text generation and personalization**: `utils/email-campaigns/email-generation.ts`.
- **Tracking**: `app/api/email-campaigns/track/open/route.ts`, `app/api/email-campaigns/track/click/route.ts`, `utils/email-tracking.ts`.
- **Types**: `database.types.ts` (generated from Supabase) for `email_campaigns`, `email_sends`, etc.

Use this as a map to “study” email campaigns: start with the docs above, then follow the flows through the routes and actions listed here.
