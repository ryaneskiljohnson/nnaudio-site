# Supabase Confirm Signup Email Template

## Overview

For account verification to work and redirect users to the dashboard, the **Confirm signup** email template in Supabase must use a link that points **directly** at this app with `token_hash` and `type` in the query. The default template uses `{{ .ConfirmationURL }}`, which sends users to Supabase’s verify endpoint; after verification Supabase redirects with the session in the URL **fragment**, which the server never sees, so verification would fail or land on the error page.

## Required setup

1. Open **Supabase Dashboard** → **Authentication** → **Email Templates**.
2. Select **Confirm signup**.
3. In the template body, replace the default confirmation link with a link that points at your app and passes the token in the **query**:

   **Production:**
   ```
   https://nnaud.io/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup
   ```

   **Local development** (if you test email confirmation locally):
   ```
   http://localhost:3000/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup
   ```

4. Use that URL as the `href` of the “Confirm” button or link in the email body. Example snippet:
   ```html
   <a href="https://nnaud.io/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
   ```

5. Ensure **Redirect URLs** (Authentication → URL Configuration) include:
   - `https://nnaud.io/api/auth/confirm`
   - `http://localhost:3000/api/auth/confirm` (if testing locally)

6. **Site URL** should be set to `https://nnaud.io` (or your primary domain).

## Flow after setup

1. User signs up and receives the confirmation email.
2. User clicks the link → browser requests `GET /api/auth/confirm?token_hash=...&type=signup`.
3. The app calls `verifyOtp({ type, token_hash })` and redirects to `/dashboard` (or `/reset-password` for recovery/invite).

## Email change template

The **Confirm email change** template needs the same direct-callback treatment so the
app's `/api/auth/confirm` route receives the `token_hash`/`type` and can route the user
to a contextual settings success state. Use:

```
https://nnaud.io/api/auth/confirm?token_hash={{ .TokenHash }}&type=email_change
```

The HTML for this template lives at
[../supabase/templates/nnaudio-email-change.html](../supabase/templates/nnaudio-email-change.html);
upload it via the Dashboard or `scripts/update-supabase-email-templates.ts`.

## Password reset template

The **Reset password** template needs the same direct-callback treatment. Use:

```
https://nnaud.io/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

`GET /api/auth/confirm` verifies the recovery OTP and redirects to `/reset-password`,
where the user sets a new password. The HTML lives at
[../supabase/templates/nnaudio-reset-password.html](../supabase/templates/nnaudio-reset-password.html).

## Reference

- [Supabase Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Redirecting to a server-side endpoint](https://supabase.com/docs/guides/auth/auth-email-templates#redirecting-the-user-to-a-server-side-endpoint) (custom link with `token_hash` in query)
