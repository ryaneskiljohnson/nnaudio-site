# Legacy Product ID Migration

## Overview

This migration adds support for legacy product IDs from the old WooCommerce system, allowing NNAudio plugins to continue using numeric product IDs without requiring code changes.

## Problem

- NNAudio plugins are hardcoded with numeric product IDs from the old WooCommerce system (e.g., `3822`, `3918`, etc.)
- The new Supabase system uses UUIDs for product IDs
- Changing product IDs in all plugins would be time-consuming and error-prone

## Solution

1. **Added `legacy_product_id` field** to the `products` table
2. **Updated authorization endpoint** to accept both UUID and legacy product IDs
3. **Created import script** to map legacy IDs to products

## Database Changes

### Migration: `20250122000000_add_legacy_product_id.sql`

- Adds `legacy_product_id TEXT` column to `products` table
- Creates index for faster lookups
- Creates unique constraint to prevent duplicate legacy IDs
- Allows NULL values (not all products may have legacy IDs)

## API Changes

### `/api/nnaudio-access/product` Endpoint

**Before:**
- Only accepted UUID product IDs
- Looked up product by UUID only

**After:**
- Accepts both UUID and legacy product IDs
- First tries UUID lookup
- Falls back to `legacy_product_id` lookup if UUID fails
- Uses the actual UUID for authorization checks

**Example:**
```typescript
// Plugin can now use either:
POST /api/nnaudio-access/product
product_id: "3822"  // Legacy ID ✅
// OR
product_id: "uuid-here"  // UUID ✅
```

## Import Script

### `scripts/import-legacy-product-ids.ts`

**Usage:**
```bash
bun run scripts/import-legacy-product-ids.ts [path-to-csv]
```

**Default CSV path:** `/Volumes/T7/Auth/product_list_simple.csv`

**What it does:**
1. Reads CSV file with `ID,Name` format
2. Matches products by name (case-insensitive, normalized)
3. Updates `legacy_product_id` field for matched products
4. Reports success/failure for each product

**CSV Format:**
```csv
ID,Name
3822,Lofi Jamz
3918,Cthulhu Godz 1
4083,Albanju
...
```

## Product Matching

The script matches products by name using:
1. **Exact match** (case-insensitive)
2. **Normalized match** (removes special chars, normalizes whitespace)

If a product isn't found, it's reported in the summary for manual matching.

## Admin UI Updates

The admin product edit page should include:
- **Legacy Product ID** field (text input)
- Display current legacy ID if set
- Allow editing/updating legacy ID

## Testing

1. Run migration:
   ```bash
   # Apply migration via Supabase dashboard or CLI
   ```

2. Import legacy IDs:
   ```bash
   bun run scripts/import-legacy-product-ids.ts
   ```

3. Test plugin authorization:
   - Plugin sends legacy ID: `3822`
   - API finds product by `legacy_product_id = "3822"`
   - API checks access using product UUID
   - Returns product details if authorized

## Benefits

✅ **No plugin code changes required** - plugins can continue using legacy IDs
✅ **Backward compatible** - still supports UUID lookups
✅ **Flexible** - can gradually migrate plugins to UUIDs if desired
✅ **Safe** - unique constraint prevents duplicate legacy IDs

## Future Considerations

- Consider migrating plugins to UUIDs over time
- Legacy IDs can be removed once all plugins are migrated
- Keep legacy IDs for historical reference

