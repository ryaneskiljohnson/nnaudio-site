# Supabase Database Connection Guide

This guide contains direct instructions for connecting to the Supabase database for the **Cymasphere** project.

## Connection Credentials

The connection credentials are stored in the `.env.local` file:

```bash
SUPABASE_DB_PASSWORD=YOUR_DB_PASSWORD_HERE
NEXT_PUBLIC_SUPABASE_URL=https://jibirpbauzqhdiwjlrmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**⚠️ IMPORTANT:** The `SUPABASE_DB_PASSWORD` is required for running migrations and direct database access.

## Method 1: Direct PSQL Connection

The most reliable way to connect to the Supabase PostgreSQL database is using the `psql` command-line tool:

```bash
# Method 1: Separate parameters (recommended for special characters in password)
PGPASSWORD='$SUPABASE_DB_PASSWORD' psql -h db.jibirpbauzqhdiwjlrmf.supabase.co -p 5432 -d postgres -U postgres

# Method 2: URL-encoded connection string
psql "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.jibirpbauzqhdiwjlrmf.supabase.co:5432/postgres"

# Method 3: If db.* doesn't work, try direct project host
PGPASSWORD='$SUPABASE_DB_PASSWORD' psql -h jibirpbauzqhdiwjlrmf.supabase.co -p 5432 -d postgres -U postgres
```

**Note:** Replace `$SUPABASE_DB_PASSWORD` with the actual value from your `.env.local` file, or export it first:
```bash
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)
```

This connects you directly to the PostgreSQL database hosted on Supabase.

### Running SQL Queries

Once connected, you can run SQL queries directly:

```sql
-- View tables in the database
\dt

-- Describe a specific table
\d contacts

-- Query data from a table
SELECT * FROM contacts LIMIT 5;

-- Check indexes on a table
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'contacts';

-- Check foreign keys
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
WHERE tc.constraint_type = 'FOREIGN KEY' AND (ccu.table_name = 'contacts' OR tc.table_name = 'contacts');
```

## Method 2: Supabase CLI

For project management tasks, use the Supabase CLI:

### Prerequisites

1. Install Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref jibirpbauzqhdiwjlrmf
   ```

### Generating Types

Generate TypeScript types from your database schema:

```bash
npx supabase gen types typescript --project-id "jibirpbauzqhdiwjlrmf" --schema public > database.types.ts
```

### Managing Migrations

#### Creating New Migrations

Create a new migration:

```bash
supabase migration new my_migration_name
```

This creates a timestamped SQL file under `supabase/migrations/`.

#### Pulling the Schema

Get the latest schema from the remote database:

```bash
supabase db pull
```

#### Applying Migrations - COMPLETE WORKFLOW

**🚀 SUCCESSFUL MIGRATION WORKFLOW (Tested and Working):**

1. **Set up environment variable:**
   ```bash
   # Export the database password from .env.local
   export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)
   
   # Verify it's set
   echo "Password set: ${SUPABASE_DB_PASSWORD:0:10}..."
   ```

2. **Check current migration status:**
   ```bash
   npx supabase migration list --password "$SUPABASE_DB_PASSWORD"
   ```

3. **Apply migrations:**
   ```bash
   # Standard push (try this first)
   npx supabase db push --password "$SUPABASE_DB_PASSWORD"
   ```

4. **If you get "Found local migration files to be inserted before the last migration" error:**
   ```bash
   # Use include-all flag (this is what we used successfully)
   npx supabase db push --password "$SUPABASE_DB_PASSWORD" --include-all
   ```

5. **Verify migration was applied:**
   ```bash
   npx supabase migration list --password "$SUPABASE_DB_PASSWORD"
   ```

#### Migration Best Practices

- **Always use environment variables**: Never hardcode passwords in scripts
- **Check migration status first**: Use `migration list` before pushing
- **Use `--include-all` when needed**: If migrations are out of order
- **Export password once per session**: Set `SUPABASE_DB_PASSWORD` at the start
- **Never reset the database**: Use `migration repair` instead of `db reset`
- **Test migrations locally first**: Use `supabase start` and `supabase db push` locally

#### Common Migration Scenarios

**Scenario 1: New migration file created**
```bash
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)
npx supabase db push --password "$SUPABASE_DB_PASSWORD"
```

**Scenario 2: Migration files out of order (Most Common)**
```bash
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)
npx supabase db push --password "$SUPABASE_DB_PASSWORD" --include-all
```

**Scenario 3: Migration history mismatch**
```bash
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)

# Check what migrations are missing
npx supabase migration list --password "$SUPABASE_DB_PASSWORD"

# Repair specific migration (replace timestamp)
npx supabase migration repair 20250127000000 --status applied --password "$SUPABASE_DB_PASSWORD"

# Then push normally
npx supabase db push --password "$SUPABASE_DB_PASSWORD"
```

## Troubleshooting

### General Connection Issues

1. If you encounter authentication issues with Supabase CLI commands, make sure your `.env.local` file has the correct credentials.

2. **Direct PSQL connection is NOT recommended** for Supabase - they block direct database connections for security.

3. **Supabase CLI is the preferred method** for running migrations and database operations.

4. **Always use environment variables** - never hardcode passwords in scripts or documentation.

### Migration-Specific Troubleshooting

#### Error: "Found local migration files to be inserted before the last migration"
**Solution:** Use the `--include-all` flag:
```bash
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)
npx supabase db push --password "$SUPABASE_DB_PASSWORD" --include-all
```

#### Error: "Migration history out of sync"
**Solution:** Repair the migration history:
```bash
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)

# Check what migrations are missing
npx supabase migration list --password "$SUPABASE_DB_PASSWORD"

# Repair specific migration (replace timestamp)
npx supabase migration repair 20250127000000 --status applied --password "$SUPABASE_DB_PASSWORD"
```

#### Error: "Connection timeout" or "Hostname not found"
**Solution:** This is expected - Supabase blocks direct database connections. Use the CLI instead:
```bash
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)
npx supabase db push --password "$SUPABASE_DB_PASSWORD"
```

#### Error: "Row Level Security policy violation"
**Symptoms:** API returns 500 error with "new row violates row-level security policy"
**Solution:** The table might be missing proper RLS policies. Check if admin policies exist:
```bash
# Use Supabase CLI to check schema
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)
npx supabase db pull --password "$SUPABASE_DB_PASSWORD"
```

#### Error: "Authentication required" despite being logged in
**Symptoms:** API-level admin check passes but database operations fail
**Solution:** RLS policy might be using different authentication than API. Ensure `is_admin(auth.uid())` function works:
```bash
# Check via Supabase CLI
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)
npx supabase db pull --password "$SUPABASE_DB_PASSWORD"
```

#### Migration Not Applied Despite Success Message
**Solution:** Verify the migration was actually applied:
```bash
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)

# Check migration status
npx supabase migration list --password "$SUPABASE_DB_PASSWORD"

# Check if tables exist via schema pull
npx supabase db pull --password "$SUPABASE_DB_PASSWORD"
```

#### Database Reset Warning
**⚠️ NEVER USE `supabase db reset` ON PRODUCTION DATABASE**
- This will delete all data permanently
- Use `migration repair` instead to fix migration history issues
- If you accidentally run reset, restore from backup immediately

## Quick Migration Reference

**For most migrations, use this simple workflow:**

```bash
# 1. Set password
export SUPABASE_DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.local | cut -d '=' -f2)

# 2. Check status
npx supabase migration list --password "$SUPABASE_DB_PASSWORD"

# 3. Apply migration
npx supabase db push --password "$SUPABASE_DB_PASSWORD" --include-all

# 4. Verify
npx supabase migration list --password "$SUPABASE_DB_PASSWORD"
```

**This workflow successfully applied the INACTIVE status migration and is the recommended approach.** 