# Amazon SES Setup for support@nnaud.io

## Status

- **support@nnaud.io** – Verification email sent. Click the link in the inbox to verify.
- **nnaud.io domain** – Pending. Add the DNS record below.

## DNS Records to Add

Add these at your nnaud.io DNS provider (e.g. Cloudflare, Route53, Namecheap):

### 1. Domain verification (required)

| Type | Name | Value |
|------|------|-------|
| TXT | `_amazonses` | `L5ky6rpti+y395+/5qZ/TEqmitlVx9k8B06e+0kEY5c=` |

### 2. DKIM (recommended after domain verification)

After the domain is verified, enable DKIM in SES and add the CNAME records SES provides:

```bash
# Check domain verification status
aws ses get-identity-verification-attributes --identities nnaud.io support@nnaud.io

# After domain is verified, enable DKIM
aws sesv2 put-email-identity-dkim-attributes --email-identity nnaud.io --signing-enabled

# Get DKIM CNAME records to add
aws sesv2 get-email-identity --email-identity nnaud.io
```

## Sandbox Mode

Your SES account is in **sandbox** (200 emails/day, 1/sec). To send to unverified addresses:

1. Open [SES Console](https://console.aws.amazon.com/ses/) → Account dashboard
2. Request production access
3. Describe your use case (transactional emails, marketing, etc.)

## Environment Variables

Add to `.env.local`:

```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
SENDER_EMAIL=support@nnaud.io
SENDER_NAME=NNAudio Support
```

## Verify Status

```bash
source .env.local
aws ses get-identity-verification-attributes --identities support@nnaud.io nnaud.io
```
