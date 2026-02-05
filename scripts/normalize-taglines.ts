#!/usr/bin/env tsx
/**
 * @fileoverview Normalize all product taglines: title case + remove version numbers
 * @module scripts/normalize-taglines
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/** Convert to title case: first letter of every word uppercase, including after hyphens */
function toTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      // Handle hyphenated words: "Multi-guitar" -> "Multi-Guitar"
      return word
        .split('-')
        .map((part) => {
          if (part.length === 0) return part;
          const firstChar = part[0];
          const rest = part.slice(1).toLowerCase();
          // Keep numbers/symbols as-is; capitalize first letter
          return /[0-9$#@]/.test(firstChar) ? part : firstChar.toUpperCase() + rest;
        })
        .join('-');
    })
    .join(' ');
}

/** Remove version numbers (v1.0, 2.3.1, "| Version 1.3.1", etc.) */
function removeVersionNumber(str: string): string {
  return str
    .replace(/\s*\|\s*[vV]ersion\s+\d+(\.\d+)*\s*$/gi, '') // | Version 1.3.1
    .replace(/\s+[vV]?\d+(\.\d+)*\s*$/g, '') // v1.0, v2.3.1, 1.0 at end
    .replace(/\s+[vV]ersion\s+\d+(\.\d+)*\s*$/gi, '') // version 1.0
    .replace(/\s*\(\s*[vV]?\d+(\.\d+)*\s*\)\s*$/g, '') // (v1.0) or (1.0)
    .trim();
}

/** Normalize common acronyms (EQ, FX) after title case */
function normalizeAcronyms(str: string): string {
  return str
    .replace(/\bEq\b/g, 'EQ')
    .replace(/\beq\b/g, 'EQ')
    .replace(/\bFx\b/g, 'FX')
    .replace(/\bfx\b/g, 'FX');
}

function normalizeTagline(tagline: string): string {
  const withoutVersion = removeVersionNumber(tagline);
  const titleCased = toTitleCase(withoutVersion).trim();
  return normalizeAcronyms(titleCased);
}

async function updateTaglines(
  table: 'products' | 'bundles',
  idField: string,
  nameField: string
) {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${nameField}, tagline`)
    .not('tagline', 'is', null)
    .neq('tagline', '');

  if (error) {
    console.error(`❌ Failed to fetch ${table}:`, error.message);
    return 0;
  }

  let updated = 0;
  for (const row of rows || []) {
    const original = row.tagline as string;
    const normalized = normalizeTagline(original);
    if (normalized === original) continue;

    const { error: updateError } = await supabase
      .from(table)
      .update({ tagline: normalized })
      .eq('id', row.id);

    if (updateError) {
      console.error(`  ❌ ${row[nameField]}: ${updateError.message}`);
    } else {
      console.log(`  ✓ ${row[nameField]}`);
      console.log(`    "${original}" → "${normalized}"`);
      updated++;
    }
  }
  return updated;
}

async function main() {
  console.log('=== Normalizing Product Taglines ===\n');

  const productsUpdated = await updateTaglines('products', 'id', 'name');
  console.log(`\n--- Bundles ---\n`);
  const bundlesUpdated = await updateTaglines('bundles', 'id', 'name');

  console.log(`\n✅ Updated ${productsUpdated} product taglines, ${bundlesUpdated} bundle taglines`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
