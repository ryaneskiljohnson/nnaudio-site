# Amazon SES Setup – support@newnationllc.com

The app sends email **from** `support@newnationllc.com` (NNAudio Support). This doc covers SES identities and DNS for that address.

## Status (this account)

- **Account**: SES sending enabled. **Sandbox mode** (200 emails/day, 1/sec). Recipients must be verified unless you request production access.
- **newnationllc.com** (domain): Identity created. **Pending** until you add the DNS record below.
- **support@newnationllc.com**: Verification email sent by AWS. **Pending** until someone clicks the link in that inbox.
- **Configuration set**: `nnaud-email-events` created (optional; used for tracking).

## 1. DNS records for newnationllc.com

Add these at your **newnationllc.com** DNS provider (e.g. Cloudflare, Route53, Namecheap).

### Domain verification (required)

| Type | Name | Value |
|------|------|-------|
| TXT | `_amazonses` | `F/W91Vcc5xQLa0JArawf9C/nU4XHvlKd+poL625vvvY=` |

### DKIM (recommended after domain is verified)

| Type | Name | Value |
|------|------|-------|
| CNAME | `rg7vomlrsfygoq27t7nebxlrkkjem4i2._domainkey` | `rg7vomlrsfygoq27t7nebxlrkkjem4i2.dkim.amazonses.com` |
| CNAME | `bpgkfunzmr7glszfb6yi4lg2epmnel75._domainkey` | `bpgkfunzmr7glszfb6yi4lg2epmnel75.dkim.amazonses.com` |
| CNAME | `w3njgr3ew6ppyyegfdgigi4fnh5yqcor._domainkey` | `w3njgr3ew6ppyyegfdgigi4fnh5yqcor.dkim.amazonses.com` |

*(If your DNS uses full names: e.g. `rg7vomlrsfygoq27t7nebxlrkkjem4i2._domainkey.newnationllc.com` → `rg7vomlrsfygoq27t7nebxlrkkjem4i2.dkim.amazonses.com`.)*

## 2. Verify support@newnationllc.com

- AWS has sent a verification email to **support@newnationllc.com**.
- Open that inbox and click the verification link.
- No DNS changes needed for the address.

## 3. Check verification status

```bash
aws ses get-identity-verification-attributes --identities newnationllc.com support@newnationllc.com
```

When both show `VerificationStatus: Success`, you can send from `support@newnationllc.com` (and from any address at `newnationllc.com` once the domain is verified).

## 4. Sandbox vs production

- **Sandbox**: You can only send **to** verified addresses (and from verified identities). Limit 200/day, 1/sec.
- **Production**: You can send to any address. Request in SES console:
  1. [SES Console](https://console.aws.amazon.com/ses/) → Account dashboard
  2. **Request production access**
  3. Describe use case (e.g. transactional: support, receipts, campaigns)

## 5. Environment variables

Used by the app (e.g. in `.env.local` and Vercel):

- `AWS_ACCESS_KEY_ID` – IAM access key with SES sending
- `AWS_SECRET_ACCESS_KEY` – IAM secret key
- `AWS_REGION=us-east-1`
- `SENDER_EMAIL=support@newnationllc.com`
- `SENDER_NAME=NNAudio Support`
- `SES_CONFIGURATION_SET=nnaud-email-events` (optional; omit to skip config set)

## 6. Quick reference commands

```bash
# List identities
aws sesv2 list-email-identities

# Domain + DKIM status
aws sesv2 get-email-identity --email-identity newnationllc.com

# Account (sandbox vs production, quotas)
aws sesv2 get-account
```

## Optional: nnaud.io identities

The same SES account also has identities for **nnaud.io** and **support@nnaud.io**. They are optional if you only send from support@newnationllc.com. See git history for nnaud.io DNS values if you need them.
