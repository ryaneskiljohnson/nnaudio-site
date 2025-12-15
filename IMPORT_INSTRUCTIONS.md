# Database Import Instructions

## Overview
This document explains how to import the database schema and data from the old cymasphere-website project into the new nnaudio-site Supabase project.

## Files Prepared

1. **`combined_migrations.sql`** (263KB, 7,380 lines)
   - Contains all 57 migrations from the old project
   - Includes: tables, types, functions, triggers, RLS policies
   - **This creates the complete database schema**

2. **`cymasphere_data_export.sql`** (4.5KB)
   - Contains data for small/medium tables:
     - promotions
     - user_management  
     - email_campaign_audiences
   - **This imports initial data**

## Import Steps

### Step 1: Apply Schema (Combined Migrations)

1. Go to Supabase Dashboard SQL Editor:
   ```
   https://supabase.com/dashboard/project/znecvzfogwkzinkduyuq/sql/new
   ```

2. Open `combined_migrations.sql` in this directory

3. Copy the entire contents

4. Paste into the SQL Editor

5. Click **"Run"** (or press Cmd+Enter)

6. Wait for completion (may take 1-2 minutes)

### Step 2: Import Small Table Data

1. In the same SQL Editor, open a new query

2. Open `cymasphere_data_export.sql` in this directory

3. Copy the entire contents

4. Paste into the SQL Editor

5. Click **"Run"**

### Step 3: Verify Import

Run this query in SQL Editor to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 50+ tables including:
- customers
- profiles
- email_campaigns
- email_subscribers
- email_templates
- support_tickets
- promotions
- user_management
- And many more...

## Large Tables (Optional - Export Separately)

The following tables have significant data and were not included in the data export:

- **profiles**: ~7,586 rows
- **email_sends**: ~7,424 rows
- **email_opens**: ~1,808 rows
- **email_clicks**: ~1,007 rows
- **user_sessions**: ~525 rows
- **automation_events_default**: ~186 rows
- **ios_subscriptions**: ~33 rows
- **support_tickets**: ~12 rows
- **support_messages**: ~55 rows
- **support_attachments**: ~10 rows

### To Export Large Tables from Old Project:

1. Connect to old Supabase project: `jibirpbauzqhdiwjlrmf`
2. Use Supabase CLI:
   ```bash
   supabase db dump --data-only --table profiles -f profiles_export.sql
   supabase db dump --data-only --table email_sends -f email_sends_export.sql
   # etc...
   ```
3. Import each file to new project via SQL Editor

## Troubleshooting

### If migrations fail:
- Check for error messages in SQL Editor
- Some migrations may have dependencies - apply in order
- The combined file should handle dependencies automatically

### If data import fails:
- Check for foreign key constraints
- Some tables may need to be populated in a specific order
- The data export uses `ON CONFLICT DO NOTHING` to handle duplicates

## Notes

- The schema includes all RLS (Row Level Security) policies
- All functions and triggers are included
- Custom types/enums are created automatically
- The import is idempotent (safe to run multiple times)

## Project Details

- **Old Project**: jibirpbauzqhdiwjlrmf (cymasphere-website)
- **New Project**: znecvzfogwkzinkduyuq (nnaudio-site)
- **Total Migrations**: 57
- **Export Date**: 2025-01-28

