#!/bin/bash
# @fileoverview SES setup script (support@newnationllc.com primary; nnaud.io optional)
# @module scripts/setup-ses-nnaudio
# Run: source .env.local && ./scripts/setup-ses-nnaudio.sh

set -e

echo "=== SES Setup (support@newnationllc.com) ==="
echo ""

# Load env if .env.local exists
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# 1. Verify email identity (idempotent)
echo "1. Verifying support@newnationllc.com..."
aws ses verify-email-identity --email-address support@newnationllc.com 2>/dev/null || true
echo "   Done."
echo ""

# 2. Domain verification (get token from existing identity)
echo "2. nnaud.io domain verification..."
TOKEN=$(aws ses get-identity-verification-attributes --identities nnaud.io --query 'VerificationAttributes.nnaud.io.VerificationToken' --output text 2>/dev/null || echo "")
if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
  echo "   Add this TXT record at your DNS provider (if not already added):"
  echo "   Type: TXT | Name: _amazonses | Value: $TOKEN"
else
  aws ses verify-domain-identity --domain nnaud.io
  echo "   Run this script again to get the verification token."
fi
echo ""

# 3. Check verification status
echo "3. Checking verification status..."
aws ses get-identity-verification-attributes --identities support@newnationllc.com newnationllc.com --output table 2>/dev/null || \
  aws ses get-identity-verification-attributes --identities support@newnationllc.com newnationllc.com
echo ""

# 4. Create configuration set (idempotent - may fail if exists)
echo "4. Creating configuration set nnaud-email-events..."
aws ses create-configuration-set --configuration-set '{"Name":"nnaud-email-events"}' 2>/dev/null && echo "   Created." || echo "   (Already exists or skipped)"
echo ""

# 5. Try to enable DKIM (only works after domain is verified)
echo "5. Enabling DKIM for nnaud.io..."
if aws sesv2 put-email-identity-dkim-attributes --email-identity nnaud.io --signing-enabled 2>/dev/null; then
  echo "   DKIM enabled. Fetching CNAME records..."
  aws sesv2 get-email-identity --email-identity nnaud.io --query 'DkimAttributes.Tokens' --output text | tr '\t' '\n' | while read -r token; do
    [ -n "$token" ] && echo "   Add CNAME: $token._domainkey -> $token.dkim.amazonses.com"
  done
else
  echo "   Domain not yet verified. Add the TXT record above, wait for verification, then run this script again."
fi
echo ""

echo "=== Done ==="
