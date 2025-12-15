#!/bin/bash

# Script to apply combined migrations using psql
# This requires the database password from .env.local

set -e

PROJECT_ID="znecvzfogwkzinkduyuq"
DB_HOST="db.${PROJECT_ID}.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PORT="5432"

# Get password from .env.local
ENV_FILE="/Users/rjmacbookpro/Development/nnaudio-site/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.local file not found"
    exit 1
fi

DB_PASSWORD=$(grep "^SUPABASE_DB_PASSWORD=" "$ENV_FILE" | cut -d '=' -f2)

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ SUPABASE_DB_PASSWORD not found in .env.local"
    exit 1
fi

SQL_FILE="/Users/rjmacbookpro/Development/nnaudio-site/combined_migrations.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Combined migrations file not found: $SQL_FILE"
    exit 1
fi

echo "🚀 Applying migrations to Supabase project: $PROJECT_ID"
echo "📁 SQL file: $SQL_FILE"
echo ""

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Apply migrations
echo "Applying SQL file..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations applied successfully!"
else
    echo ""
    echo "❌ Error applying migrations"
    exit 1
fi

# Unset password
unset PGPASSWORD

