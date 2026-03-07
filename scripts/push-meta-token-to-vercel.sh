#!/usr/bin/env bash
# Push META_CONVERSIONS_API_TOKEN from .env.local to Vercel Production (no newline).
# Run after: ./scripts/set-meta-token.sh 'YOUR_NEW_TOKEN'
# Requires: vercel CLI logged in, project linked.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="$ROOT/.env.local"
if [[ ! -f "$ENV" ]]; then
  echo "Missing .env.local. Run: ./scripts/set-meta-token.sh 'YOUR_TOKEN'" >&2
  exit 1
fi
TOKEN=$(grep -E '^META_CONVERSIONS_API_TOKEN=' "$ENV" | sed 's/^META_CONVERSIONS_API_TOKEN=//' | tr -d '\r\n')
if [[ -z "$TOKEN" ]]; then
  echo "META_CONVERSIONS_API_TOKEN not found in .env.local" >&2
  exit 1
fi
cd "$ROOT"
vercel env rm META_CONVERSIONS_API_TOKEN production -y 2>/dev/null || true
printf '%s' "$TOKEN" | vercel env add META_CONVERSIONS_API_TOKEN production
echo "Token pushed. Redeploy production so it takes effect: vercel --prod"
