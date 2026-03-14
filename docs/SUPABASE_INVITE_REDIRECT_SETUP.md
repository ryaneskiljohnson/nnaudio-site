# Supabase Invite Redirect URL Setup

## Overview

When inviting users via the NFR admin page, Supabase sends an email with a verification link. After the user clicks the link, Supabase redirects them to the URL specified by `redirectTo`. For invite links to land on `/reset-password` (where users set their password), the redirect URL must be in Supabase's allowlist.

If the redirect URL is not in the allowlist, Supabase falls back to the **Site URL** (base domain only), causing users to land on the homepage instead of the reset-password page.

## Setup Steps

1. Open **Supabase Dashboard** > **Authentication** > **URL Configuration**.
2. Add the following to **Redirect URLs**:
   - `http://localhost:3000/reset-password` (local development)
   - `https://nnaud.io/reset-password` (production)
   - Or use wildcards for flexibility:
     - `http://localhost:3000/**` (matches all localhost paths)
     - `https://nnaud.io/**` (matches all production paths)
3. Ensure **Site URL** is correct:
   - Local: `http://localhost:3000`
   - Production: `https://nnaud.io` (or your primary domain)

**If verification links show "Your connection is not private"**, turn off Click Tracking in SendGrid and ensure only SendGrid is used for auth SMTP; see [SUPABASE_VERIFICATION_EMAIL_SSL.md](./SUPABASE_VERIFICATION_EMAIL_SSL.md).

## Reference

- [Supabase Redirect URLs docs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase troubleshooting: wrong redirect URL](https://supabase.com/docs/guides/troubleshooting/why-am-i-being-redirected-to-the-wrong-url-when-using-auth-redirectto-option-_vqIeO)
