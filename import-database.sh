#!/bin/bash

# Script to import database from cymasphere-website to new Supabase project
# This will apply all migrations and import data

set -e

SOURCE_DIR="/Users/rjmacbookpro/Development/cymasphere-website"
TARGET_PROJECT_ID="znecvzfogwkzinkduyuq"

echo "🚀 Starting database import process..."
echo "Source: $SOURCE_DIR"
echo "Target Project: $TARGET_PROJECT_ID"
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Check if migrations directory exists
MIGRATIONS_DIR="$SOURCE_DIR/supabase/migrations"
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

echo "📋 Found migrations directory"
echo ""

# Count migrations
MIGRATION_COUNT=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "📊 Found $MIGRATION_COUNT migration files"
echo ""

echo "⚠️  IMPORTANT: This script requires manual execution of migrations"
echo "   Use the Supabase MCP tools or CLI to apply migrations"
echo ""
echo "Next steps:"
echo "1. Apply migrations from: $MIGRATIONS_DIR"
echo "2. Import data from: $SOURCE_DIR/cymasphere_data_export.sql"
echo "3. For large tables, export separately from old project"
echo ""

