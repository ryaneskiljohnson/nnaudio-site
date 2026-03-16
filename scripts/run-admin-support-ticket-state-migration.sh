#!/usr/bin/env bash
# Applies the admin_support_ticket_state migration using SUPABASE_DB_PASSWORD from .env.local.
# Usage: ./scripts/run-admin-support-ticket-state-migration.sh
# Or:    bash scripts/run-admin-support-ticket-state-migration.sh
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
MIGRATION_FILE="$ROOT_DIR/supabase/migrations/20260316000000_admin_support_ticket_state.sql"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local. Set SUPABASE_DB_PASSWORD there and retry."
  exit 1
fi

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Missing migration file: $MIGRATION_FILE"
  exit 1
fi

# Load only SUPABASE_DB_PASSWORD (value may contain =)
export SUPABASE_DB_PASSWORD
SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '\r')
if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
  echo "SUPABASE_DB_PASSWORD not set in .env.local"
  exit 1
fi

echo "Applying admin_support_ticket_state migration..."
# Try direct DB host first; if your network blocks it, use Dashboard SQL Editor with the migration file.
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h db.jibirpbauzqhdiwjlrmf.supabase.co -p 5432 -d postgres -U postgres -f "$MIGRATION_FILE"
echo "Done."
