# AI Growth Autonomy Policy (Day 1)

## Purpose

Set conservative controls for autonomous growth execution so the system starts modest, scales only with positive feedback, and avoids runaway spend.

## Launch Mode: Modest by Default

- Default launch budget per campaign: **$20/day**
- Hard per-campaign budget cap: **$75/day**
- Max budget increase step: **+15%**
- Minimum time between scale actions: **48 hours**
- Maximum new campaigns/day: **1**

## Scale-Up Criteria (all must pass)

- Conversions >= **3**
- ROAS >= **1.30**
- CPA <= **$40**
- Last scale action >= **48h** ago
- Required readiness gates are green

If any condition fails, AI must keep budget flat or reduce/pause based on risk.

## Required Readiness Gates (Block Automation if Missing)

- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_AD_ACCOUNT_ID`
- `SENDGRID_API_KEY`
- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- Active Facebook access token in current admin session cookie

## Recommended Readiness Gates (Warn, but do not hard-block)

- `NEXT_PUBLIC_META_PIXEL_ID`
- `META_CONVERSIONS_API_TOKEN`
- `NEXT_PUBLIC_GTM_ID`

## What AI Can Execute Without Human Approval

- Readiness checks and health reporting
- Scheduled email campaign processing
- Campaign pause actions when guardrails are violated
- Conservative budget increases when all scale-up criteria pass

## What Requires Human Approval

- Raising budget caps
- Adding new ad accounts
- Broad targeting expansion
- Pricing/offer changes
- Overriding required readiness gates

## Daily Operator Checklist

1. Run `bun run env:growth`
2. Check `/api/admin/growth-ops-readiness`
3. Confirm no blocking issues
4. Run only one controlled change at a time (budget **or** creative **or** audience)
5. Log decisions and outcomes

## Day 2 Queue Endpoints

- `POST /api/admin/growth-ops/actions` to enqueue an autonomous action
- `GET /api/admin/growth-ops/actions` to inspect queue status/history
- `GET /api/admin/growth-ops/decisions` to view normalized recent sweep decisions (`pause`/`hold`/`scale`)
- `POST /api/admin/growth-ops/process-actions` to process pending actions (admin or cron-auth)

Supported action types:

- `email_process_scheduled`
- `facebook_pause_campaign`
- `facebook_resume_campaign`
- `facebook_guardrail_sweep`
- `facebook_scale_campaign_budget`

## Production Scheduling

- Configure Vercel cron to call `POST /api/admin/growth-ops/process-actions` every minute.
- Queue processor supports cron auth using `Authorization: Bearer ${CRON_SECRET}`.
- Keep batch size conservative to avoid bursty spend or large concurrent state changes.
- Manual run support: operators can call `POST /api/admin/growth-ops/process-actions` with `{ "seed_baseline": false }` for deterministic test runs.
- Baseline queue seeding is automatic by default (`AI_GROWTH_AUTO_ENQUEUE_BASELINE=true`) and creates one idempotent `email_process_scheduled` action per UTC minute.
- Guardrail sweeps are also auto-seeded by default (`AI_GROWTH_AUTO_ENQUEUE_GUARDRAIL_SWEEP=true`) on `AI_GROWTH_GUARDRAIL_SWEEP_INTERVAL_MINUTES` buckets (default 15).
- Auto-scale enqueue from sweeps is enabled by default (`AI_GROWTH_AUTO_ENQUEUE_SCALE=true`) and only triggers when all scale-up criteria pass plus budget headroom exists.
- Local test mode: set `FACEBOOK_MOCK_CONNECTION=true` (non-production only) to exercise guardrail sweep/pause/scale queue logic without live Meta token calls.
- Handler smoke test: run `bun run test:growth-smoke` to validate pause/sweep/scale action handlers in mock mode with `queueActions: false` (no queue writes).

