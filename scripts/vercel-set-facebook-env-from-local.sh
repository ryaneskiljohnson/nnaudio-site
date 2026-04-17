#!/usr/bin/env bash
# @fileoverview Pushes FACEBOOK_SYSTEM_USER_TOKEN and FACEBOOK_AD_ACCOUNT_ID from .env.local
# into the linked Vercel project (production) using the Vercel CLI only.
# @note Requires a Vercel login that can access this repo's .vercel/project.json project.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "error: .env.local not found in $ROOT" >&2
  exit 1
fi

if ! vercel env ls >/dev/null 2>&1; then
  echo "error: \`vercel env ls\` failed for this directory." >&2
  echo "Your CLI session cannot read the linked project (nnaudio-site). Typical fix:" >&2
  echo "  vercel logout" >&2
  echo "  vercel login   # use the GitHub / Vercel account that owns nnaud.io / nnaudio-site" >&2
  echo "  cd $ROOT && vercel link   # pick existing nnaudio-site if prompted" >&2
  echo "Then re-run: bun run growth:vercel-cli-env" >&2
  exit 1
fi

read_var() {
  python3 - "$1" <<'PY'
import re, sys
key = sys.argv[1]
raw = open(".env.local", encoding="utf-8").read()
m = re.search(r"^" + re.escape(key) + r"=(.*)$", raw, re.M)
if not m:
    raise SystemExit(f"missing {key} in .env.local")
val = m.group(1).strip().strip('"').strip("'")
if not val:
    raise SystemExit(f"empty {key} in .env.local")
sys.stdout.write(val)
PY
}

FB_TOKEN="$(read_var FACEBOOK_SYSTEM_USER_TOKEN)"
FB_ACT="$(read_var FACEBOOK_AD_ACCOUNT_ID)"

if [[ ${#FB_TOKEN} -lt 150 ]]; then
  echo "error: FACEBOOK_SYSTEM_USER_TOKEN looks truncated (len ${#FB_TOKEN}). Use Meta's Copy button and paste the full token." >&2
  exit 1
fi

printf '%s' "$FB_TOKEN" | vercel env add FACEBOOK_SYSTEM_USER_TOKEN production --sensitive --force
printf '%s' "$FB_ACT" | vercel env add FACEBOOK_AD_ACCOUNT_ID production --sensitive --force

echo "ok: FACEBOOK_SYSTEM_USER_TOKEN and FACEBOOK_AD_ACCOUNT_ID set for production."
echo "Redeploy production (Vercel dashboard → Deployments → … → Redeploy) so new env values load."
