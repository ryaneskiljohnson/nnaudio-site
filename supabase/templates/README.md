# NNAudio Email Templates

This directory contains NNAudio-branded email templates for Supabase Auth.

## Templates Included

- **nnaudio-confirmation.html** - Email verification for new signups
- **nnaudio-magic-link.html** - Magic link for passwordless login
- **nnaudio-reset-password.html** - Password reset email
- **nnaudio-invite.html** - User invitation email
- **nnaudio-email-change.html** - Email change confirmation
- **nnaudio-password-changed.html** - Password change confirmation (requires custom implementation)

## Updating Templates in Supabase

### Option 1: Using the Script (Recommended)

1. Get your Supabase Access Token:
   - Go to https://supabase.com/dashboard/account/tokens
   - Create a new access token (or use an existing one)
   - Add it to your `.env.local` file:
     ```
     SUPABASE_ACCESS_TOKEN=your-access-token-here
     ```

2. Run the update script:
   ```bash
   npx tsx scripts/update-supabase-email-templates.ts
   ```

### Option 2: Manual Update via Dashboard

1. Navigate to your Supabase project dashboard
2. Go to Authentication → Email Templates
3. For each template type, copy the content from the corresponding HTML file in this directory
4. Paste it into the template editor in the dashboard
5. Update the subject lines to match:
   - **Confirmation**: "Verify Your NNAudio Email"
   - **Magic Link**: "Your NNAudio Magic Link"
   - **Password Reset**: "Reset Your NNAudio Password"
   - **Invite**: "You've Been Invited to NNAudio"
   - **Email Change**: "Confirm Your NNAudio Email Change"
   - **Password Changed**: "Your NNAudio Password Has Been Changed" (Note: This template is not a standard Supabase template and may need to be sent via custom email/webhook)

## Template Variables

The templates use Supabase's Go template variables:
- `{{ .ConfirmationURL }}` - The confirmation/verification URL
- `{{ .Token }}` - 6-digit OTP (if using OTP instead of links)
- `{{ .TokenHash }}` - Hashed token for custom URL construction
- `{{ .SiteURL }}` - Your application's site URL
- `{{ .RedirectTo }}` - Redirect URL after confirmation
- `{{ .Email }}` - User's email address
- `{{ .NewEmail }}` - New email address (for email change template)

## Branding

All templates feature:
- NNAudio logo (from https://nnaud.io/images/nnaud-io/NNAudio-logo-white.png)
- NNAudio color scheme:
  - Primary: `#6c63ff` (purple)
  - Accent: `#8a2be2` (blue-violet)
  - Background: `#121212` (dark)
- Purple-to-blue gradient accents (`#6c63ff` to `#8a2be2`) matching the Next.js site design
- Responsive design for mobile devices

## Custom callback URL (signup & email change)

The **Confirmation (signup)** and **Email Change** templates must link directly to the
app's `/api/auth/confirm` route with `token_hash` and `type` in the **query** instead of
using the default `{{ .ConfirmationURL }}`. The default `ConfirmationURL` first hits
Supabase's verify endpoint, which then redirects to the app *after* consuming the token.
By the time the app receives that redirect, the query string no longer contains
`token_hash`/`type`, so the callback cannot present a clear success/failure state and
the user briefly sees the login error page before being bounced back.

Use these `href` values in the templates:

- **Confirmation (signup)**:
  ```
  {{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup
  ```
- **Email Change**:
  ```
  {{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email_change
  ```

The other templates (Magic Link, Reset Password, Invite) continue to use
`{{ .ConfirmationURL }}` because their downstream pages (`/reset-password`, etc.) handle
post-verify redirects independently.

After updating `nnaudio-email-change.html` (or `nnaudio-confirmation.html`), upload the
new HTML to Supabase via the Dashboard or by running:

```bash
npx tsx scripts/update-supabase-email-templates.ts
```

Also ensure both production and local `/api/auth/confirm` URLs are present in
**Authentication → URL Configuration → Redirect URLs**. See
[../../docs/SUPABASE_INVITE_REDIRECT_SETUP.md](../../docs/SUPABASE_INVITE_REDIRECT_SETUP.md)
and [../../docs/SUPABASE_CONFIRM_SIGNUP_EMAIL_TEMPLATE.md](../../docs/SUPABASE_CONFIRM_SIGNUP_EMAIL_TEMPLATE.md).

