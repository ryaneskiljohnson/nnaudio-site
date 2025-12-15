#!/usr/bin/env node

/**
 * Apply combined migrations in chunks via MCP
 * This reads the combined_migrations.sql file and applies it in manageable chunks
 */

import { readFileSync } from 'fs';

const SQL_FILE = '/Users/rjmacbookpro/Development/nnaudio-site/combined_migrations.sql';

console.log('📦 Reading combined migrations file...\n');

const content = readFileSync(SQL_FILE, 'utf-8');

// Split by migration boundaries
const migrations = content.split(/-- ============================================================================\n-- Migration:/);

console.log(`Found ${migrations.length} migration sections\n`);

// The first section is the header
const header = migrations[0];
const migrationSections = migrations.slice(1);

console.log('⚠️  Due to size limitations, you have two options:\n');
console.log('Option 1: Apply via Supabase Dashboard SQL Editor');
console.log('   1. Go to: https://supabase.com/dashboard/project/znecvzfogwkzinkduyuq/sql/new');
console.log('   2. Copy and paste the contents of: combined_migrations.sql');
console.log('   3. Click "Run"\n');

console.log('Option 2: Apply key migrations individually via MCP');
console.log('   This will apply the most important migrations first\n');

// Extract key migrations to apply
const keyMigrations = [
  'create_customers_table',
  'add_admin_subscription_type', 
  'create_support_tickets_system',
  'create_email_campaigns_system',
  'create_promotions_table',
  'create_user_management_table'
];

console.log(`📋 Key migrations to apply: ${keyMigrations.length}\n`);

// Show summary
console.log('📊 Migration Summary:');
console.log(`   Total migrations: ${migrationSections.length}`);
console.log(`   File size: ${(content.length / 1024).toFixed(2)} KB`);
console.log(`   Total lines: ${content.split('\n').length}\n`);

console.log('💡 Recommendation: Use Supabase Dashboard SQL Editor for the full import');
console.log('   The combined_migrations.sql file is ready to use.\n');

