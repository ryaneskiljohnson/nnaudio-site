# Vercel environment variables for email (SendGrid)

Emails work locally but not on production when the required env vars are missing or different on Vercel. This doc lists what must be set in the Vercel project for SendGrid to work.

**If emails work locally but not on Vercel:** The usual cause is **`SENDGRID_API_KEY` not set in Vercel**. Add it in the Vercel project (Settings → Environment Variables) for **Production** (and Preview if you need email there), then redeploy.

## Required for sending email

| Variable | Description | Example (production) |
|----------|-------------|----------------------|
| **SENDGRID_API_KEY** | SendGrid API key (Mail Send). Create at [SendGrid → API Keys](https://app.sendgrid.com/settings/api_keys). | `SG.xxx...` |

If `SENDGRID_API_KEY` is not set in production, `sendEmail()` returns `{ success: false, error: "SENDGRID_API_KEY is not set" }` and no email is sent.

## Recommended (sender identity and links)

| Variable | Description | Example (production) |
|----------|-------------|----------------------|
| **SENDER_EMAIL** | From address for transactional/campaign emails. | `support@nnaud.io` |
| **SENDER_NAME** | From display name. | `NNAudio Support` |
| **NEXT_PUBLIC_SITE_URL** | Base URL for unsubscribe and links in emails. | `https://nnaud.io` |

If unset, code falls back to `support@nnaud.io` / `NNAudio Support` and `https://nnaud.io`, but setting them in Vercel keeps behavior consistent with local `.env.local`.

## Optional (SendGrid webhook)

| Variable | Description |
|----------|-------------|
| **SENDGRID_WEBHOOK_VERIFICATION_KEY** | For [SendGrid Event Webhook](https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook) signature verification at `/api/webhooks/sendgrid`. |

---

## Making Vercel match local

1. **Check what you have locally** (from project root):
   ```bash
   bun run env:email
   ```
   This prints which email-related vars are SET or MISSING. Ensure the same ones (at least `SENDGRID_API_KEY`) are set in Vercel for Production.

2. **List current Vercel env vars** (from project root):
   ```bash
   vercel env ls
   ```
3. **Add or update in Vercel Dashboard**  
   Project → Settings → Environment Variables. Add the variables above for **Production** (and Preview if you send email in preview deployments).
4. **Or pull from Vercel and compare**  
   ```bash
   vercel env pull .env.vercel
   # Compare with .env.local (do not commit .env.vercel)
   diff <(grep -E '^SENDGRID|^SENDER_|^NEXT_PUBLIC_SITE_URL' .env.local | sort) \
        <(grep -E '^SENDGRID|^SENDER_|^NEXT_PUBLIC_SITE_URL' .env.vercel | sort)
   ```
5. **Redeploy** after changing env vars so the new values are applied.

## Quick check: is SENDGRID_API_KEY set in production?

- In Vercel: Project → Settings → Environment Variables → look for `SENDGRID_API_KEY` under Production.
- Or run a test from the app (e.g. contact form or “Send test email” in admin) and check Vercel function logs for `❌ SENDGRID_API_KEY is not set` or SendGrid errors.
