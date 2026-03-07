#!/usr/bin/env bash
# Set META_CONVERSIONS_API_TOKEN in .env.local (NNAudio CAPI).
# Usage: ./scripts/set-meta-token.sh 'YOUR_TOKEN_HERE'
# Get token: Events Manager → NNAudio pixel → Settings → Conversions API → Generate access token.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV="$ROOT/.env.local"
TOKEN="${1:?Usage: $0 YOUR_META_CAPI_TOKEN}"

if [[ ! -f "$ENV" ]]; then
  echo "META_CONVERSIONS_API_TOKEN=$TOKEN" >> "$ENV"
  echo "Added META_CONVERSIONS_API_TOKEN to $ENV"
else
  if grep -q '^META_CONVERSIONS_API_TOKEN=' "$ENV" 2>/dev/null; then
    grep -v '^META_CONVERSIONS_API_TOKEN=' "$ENV" > "${ENV}.tmp"
    echo "META_CONVERSIONS_API_TOKEN=$TOKEN" >> "${ENV}.tmp"
    mv "${ENV}.tmp" "$ENV"
  else
    echo "META_CONVERSIONS_API_TOKEN=$TOKEN" >> "$ENV"
  fi
  echo "Updated META_CONVERSIONS_API_TOKEN in $ENV"
fi
