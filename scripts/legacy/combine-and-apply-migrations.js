#!/usr/bin/env node

/**
 * Script to combine all migrations from cymasphere-website and apply them
 * to the new Supabase project
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const SOURCE_DIR = '/Users/rjmacbookpro/Development/cymasphere-website/supabase/migrations';
const OUTPUT_FILE = '/Users/rjmacbookpro/Development/nnaudio-site/combined_migrations.sql';

console.log('📦 Combining migrations...\n');

// Get all migration files and sort them
const files = readdirSync(SOURCE_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} migration files\n`);

// Combine all migrations
let combined = `-- ============================================================================
-- Combined Migrations from cymasphere-website
-- Total migrations: ${files.length}
-- Generated: ${new Date().toISOString()}
-- ============================================================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

`;

for (const file of files) {
  const filePath = join(SOURCE_DIR, file);
  const content = readFileSync(filePath, 'utf-8');
  
  combined += `\n-- ============================================================================
-- Migration: ${file}
-- ============================================================================

${content}

`;
}

combined += `
-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- ============================================================================
-- End of Combined Migrations
-- ============================================================================
`;

// Write combined file
writeFileSync(OUTPUT_FILE, combined);

console.log(`✅ Combined ${files.length} migrations into: ${OUTPUT_FILE}`);
console.log(`   File size: ${(combined.length / 1024).toFixed(2)} KB\n`);
console.log('📋 Next step: Apply this combined migration to your Supabase project');
console.log('   You can use the Supabase MCP tool or SQL Editor\n');

