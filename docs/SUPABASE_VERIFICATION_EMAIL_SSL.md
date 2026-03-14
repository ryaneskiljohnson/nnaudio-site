# Supabase Verification Email — SendGrid Click Tracking

## What to do

Auth emails (signup confirm, password reset, invite) must use **direct** verification links so users land on `https://nnaud.io/api/auth/confirm?...` with no SSL errors.

- **SendGrid:** Turn **off** Click Tracking (Settings → Tracking). Auth emails sent via Supabase SMTP will then contain direct links. The email campaign builder is unaffected — it uses the app’s own click/open tracking on nnaud.io.
- **Supabase:** Keep Custom SMTP set to SendGrid. Set **Site URL** to `https://nnaud.io` and add **Redirect URLs** (e.g. `https://nnaud.io/**`, `http://localhost:3000/**`).

See [SUPABASE_INVITE_REDIRECT_SETUP.md](./SUPABASE_INVITE_REDIRECT_SETUP.md) for invite/reset redirects.

## Quick checklist

1. [ ] SendGrid **Click Tracking** is **OFF** (Settings → Tracking).
2. [ ] Supabase **Custom SMTP** = SendGrid (smtp.sendgrid.net, port 587, API key).
3. [ ] Supabase **Site URL** = `https://nnaud.io`, **Redirect URLs** include `https://nnaud.io/**` and localhost for dev.
