# Bundles and Products System - Comprehensive Audit

**Generated:** February 17, 2026  
**Issue Context:** Bundle pricing tiers not automatically created during bundle creation

---

## Executive Summary

### Critical Issues Found

1. **No Admin UI for Bundle Management** - Bundles cannot be created, edited, or managed through the admin panel
2. **Manual Tier Creation Required** - Bundle pricing tiers (`bundle_subscription_tiers`) must be manually inserted via SQL/scripts
3. **Dual Product/Bundle System** - Products table has a 'bundle' category that exists independently of the bundles table, creating confusion
4. **No Cascade Pricing** - When creating bundles, pricing tiers are not automatically generated
5. **Inconsistent Bundle Identification** - System uses both `bundles` table AND `products.category = 'bundle'`

---

## System Architecture

### Tables Overview

#### 1. `products` Table
- **Purpose:** All purchasable items (plugins, packs, bundles, presets, etc.)
- **Pricing:** Direct columns `price` and `sale_price` (numeric)
- **Categories:** `audio-fx-plugin`, `instrument-plugin`, `pack`, `bundle`, `preset`, `template`, `application`
- **Stripe Integration:** `stripe_product_id`, `stripe_price_id`, `stripe_sale_price_id`
- **Status:** `draft`, `active`, `inactive`, `archived`

#### 2. `bundles` Table
- **Purpose:** Subscription/collection bundles (elite bundles with tiers, regular bundles)
- **No Direct Pricing:** Pricing comes from `bundle_subscription_tiers` table
- **Types:** `ultimate`, `plugins`, `midi_loops`, `presets`, `templates`, `custom`
- **Status:** `draft`, `active`, `archived`
- **Note:** Has NO `price` or `sale_price` columns

#### 3. `bundle_subscription_tiers` Table
- **Purpose:** Pricing for bundles (monthly, annual, lifetime)
- **Structure:** `bundle_id`, `subscription_type`, `price`, `sale_price`, `stripe_price_id`, `active`
- **Constraints:** UNIQUE(bundle_id, subscription_type)
- **Cascade:** ON DELETE CASCADE from bundles

#### 4. `bundle_products` Table  
- **Purpose:** Many-to-many junction between bundles and products
- **Structure:** `bundle_id`, `product_id`, `display_order`
- **Constraints:** UNIQUE(bundle_id, product_id)
- **Cascade:** ON DELETE CASCADE from both bundles and products

---

## Creation Workflows

### Product Creation (✅ WORKING)

**Admin UI:** `/admin/products/create`

**Process:**
1. Fill form with name, description, category, price, sale_price, etc.
2. Submit → POST `/api/products`
3. Product inserted into `products` table
4. **Automatic Stripe Sync:** If product has price, `syncProductToStripe()` is called
5. Stripe IDs saved back to product record
6. Returns created product with Stripe IDs

**Fields Required:**
- name, slug (auto-generated), category, price
- Optional: sale_price, description, images, features, downloads, etc.

**Pricing:**
- Direct columns: `price` (required), `sale_price` (optional)
- If both exist, sale_price is what customer pays
- Free products: price = 0 or sale_price = 0

**Edit:** `/admin/products/edit/[id]`
- Full edit form
- Can change to category 'bundle' → triggers bundle data fetch
- When price/sale_price changes → auto Stripe sync

---

### Bundle Creation (❌ BROKEN - No Admin UI)

**Admin UI:** ❌ **DOES NOT EXIST**

**Current Methods:**
1. **Scripts Only** (e.g., `scripts/create-initial-bundles.ts`)
   - Manually creates bundle record
   - Manually inserts pricing tiers (monthly, annual, lifetime)
   - Manually adds products to bundle
   
2. **Direct API Call** POST `/api/bundles`
   - Creates bundle record ONLY
   - ❌ Does NOT create pricing tiers
   - ❌ Does NOT add products
   - ❌ Does NOT sync to Stripe
   - Returns bare bundle object

3. **Via Product Edit** (Workaround)
   - Edit a product → change category to 'bundle'
   - UI fetches matching bundle by name/slug
   - Can add products to the bundle
   - ❌ Still no pricing tier management in UI

**What's Missing:**
- No admin page for creating bundles from scratch
- No UI for managing bundle pricing tiers
- No UI for setting monthly/annual/lifetime prices and sale prices
- No automatic tier creation when bundle is created
- No batch operations for bundles

---

### Bundle Pricing Tier Creation (❌ COMPLETELY MANUAL)

**Current State:** All pricing tiers must be inserted manually via:

1. **SQL Insert:**
```sql
INSERT INTO bundle_subscription_tiers (bundle_id, subscription_type, price, sale_price, active)
VALUES ('bundle-uuid', 'lifetime', 493.00, 20.00, true);
```

2. **Script:** `scripts/create-initial-bundles.ts` has logic to create tiers:
```typescript
for (const [tier, pricing] of Object.entries(bundleDef.pricing)) {
  await supabase.from('bundle_subscription_tiers').insert({
    bundle_id: bundle.id,
    subscription_type: tier,
    price: pricing.price,
    sale_price: pricing.sale_price,
    active: true,
  });
}
```

3. **No API Endpoint** for creating/updating tiers
4. **No Admin UI** for managing tiers

**Problem:** When POST `/api/bundles` creates a bundle, it returns immediately without creating any tiers. The bundle exists but has no pricing, so it won't display properly on the frontend.

---

## Display & Filtering

### Products Page (`/products`)
- Fetches from `products` table via GET `/api/products?status=active`
- Filters by category (including 'bundle')
- Uses `ProductCard` component
- **New:** ProductCard now routes items with `category='bundle'` to `/bundles/{slug}` instead of `/product/{slug}`

### Bundles Page (`/bundles`)
- Fetches from `bundles` table via GET `/api/bundles?status=active`
- **Does NOT query products table at all**
- Separates "elite" (isSubscriptionBundle) from "regular" bundles
- **Requires:** Each bundle must have at least one row in `bundle_subscription_tiers` to show pricing
- Elite = has monthly OR annual tier
- Regular = has ONLY lifetime tier

### Bundle Detail Page (`/bundles/[slug]`)
- Fetches single bundle with tiers and products
- Shows pricing from `bundle_subscription_tiers`
- Lists products from `bundle_products` junction
- **New:** Sticky bar shows "See Pricing" for elite, "Add to Cart" for regular

### Product Detail Page (`/product/[slug]`)
- Fetches single product
- Works for all categories including 'bundle'
- Shows price and sale_price from products table
- **Issue:** Products with category='bundle' may not have corresponding bundle record

---

## Dual Bundle System Problem

### The Confusion

There are **TWO ways** a "bundle" can exist:

#### Option A: Product with category='bundle'
- Record in `products` table
- Has `price` and `sale_price` columns
- Can be added to cart like any product
- Shows on `/products` page when filtered by 'bundle'
- May or may not have a corresponding `bundles` table entry
- Example: "20 For 20 MIDI Bundle" as a product

#### Option B: Record in `bundles` table
- Separate `bundles` table entry
- No direct pricing - pricing comes from `bundle_subscription_tiers`
- Shows on `/bundles` page
- Has associated products via `bundle_products` junction
- May or may not have a corresponding product entry
- Example: "20 For 20 MIDI Bundle" as a bundle

### Current State: "20 For 20 MIDI Bundle"

**In products table:**
- ID: `5b67e835-8f4b-46f7-ae07-cee6a033bfa5`
- price: $493.00
- sale_price: $20.00
- category: (unknown - need to verify)
- Shows pricing directly

**In bundles table:**
- ID: `3e6e4ca2-72ce-4251-aa7f-96a5337df430`
- status: `active` (was `draft`, now fixed)
- bundle_type: `custom`
- ❌ Had ZERO rows in `bundle_subscription_tiers` (now fixed with lifetime tier)

**Result:** Same logical item exists in TWO places with different IDs and pricing mechanisms.

---

## Data Synchronization Issues

### Products ↔ Bundles Sync

**No Automatic Sync Between:**
1. Products table price/sale_price
2. Bundle tiers price/sale_price

**Example of Divergence:**
- Update product sale_price: $20
- Bundle tier sale_price: (not updated automatically)
- Frontend shows different prices in different places

**No Validation:**
- Can create product with category='bundle' without bundles table entry
- Can create bundle without corresponding product entry
- Can have bundle with no pricing tiers (invisible on frontend)
- Can have bundle with products that don't exist or are inactive

---

## Stripe Integration

### Products (✅ Auto-synced)
- On create: `syncProductToStripe()` called automatically
- On update: Syncs when price, sale_price, name, or description changes
- Creates Stripe Product + Price
- Stores IDs: `stripe_product_id`, `stripe_price_id`
- On delete: Archives Stripe product/prices

### Bundles (❌ Manual Only)
- No automatic Stripe sync on create
- Separate endpoint: POST `/api/bundles/create-products`
  - Creates product entries for bundles
  - Syncs each tier to Stripe
  - Must be called manually after bundle creation
- No sync on tier updates
- No deletion handling for tiers

---

## Deletion & Cascade Behavior

### Deleting a Product
**API:** DELETE `/api/products/[id]`

**Process:**
1. Archives Stripe prices (can't delete used prices)
2. Archives Stripe product
3. Deletes from `products` table
4. **Cascade:** If product is in `bundle_products`, those rows are deleted (ON DELETE CASCADE)
5. **Issue:** Bundle is now missing products, but bundle/tiers remain

### Deleting a Bundle
**API:** ❌ **No DELETE endpoint exists** for `/api/bundles/[id]`

**Manual deletion via SQL:**
- `DELETE FROM bundles WHERE id = 'xxx'`
- **Cascades:** 
  - Deletes all rows in `bundle_products` (ON DELETE CASCADE)
  - Deletes all rows in `bundle_subscription_tiers` (ON DELETE CASCADE)
- **Does NOT cascade to products table** (products remain)
- **Does NOT clean up Stripe** (Stripe products/prices remain active)

### Deleting Bundle-Product Association
**API:** DELETE `/api/bundles/products?bundle_id=xxx&product_id=xxx`
- Removes only the association
- Product and bundle remain intact

---

## Missing Features & Gaps

### Bundle Management UI
❌ No admin page for:
- Creating bundles from scratch
- Editing bundle metadata (name, description, images)
- Managing bundle pricing tiers (add, edit, remove monthly/annual/lifetime)
- Setting price vs sale_price for each tier
- Bulk operations (activate, archive, duplicate)

### Pricing Tier Management
❌ No UI or API for:
- POST `/api/bundles/[id]/tiers` - Add a tier
- PUT `/api/bundles/[id]/tiers/[tier_id]` - Update tier pricing
- DELETE `/api/bundles/[id]/tiers/[tier_id]` - Remove a tier
- Batch update all bundle tiers (e.g., apply 20% off to all lifetime tiers)

### Bundle-Product Association UI
✅ **Partially exists** in product edit page:
- Can add products to bundle via "Add Product to Bundle" section
- ❌ Only works if you're editing a product with category='bundle'
- ❌ No standalone bundle editor
- ❌ No drag-and-drop reordering in UI (API supports PATCH for reorder)

### Validation & Integrity
❌ No checks for:
- Bundle with zero products
- Bundle with zero pricing tiers
- Product with category='bundle' but no bundles table entry
- Bundle with no corresponding product entry
- Pricing tier with price=0 or negative
- Inactive products in active bundles

### Reporting & Analytics
❌ No admin views for:
- Bundles without pricing tiers
- Bundles without products
- Orphaned bundle_products (bundle or product deleted)
- Pricing discrepancies (product price vs bundle tier price)

---

## Recommended Architecture Changes

### Short-term Fixes (High Priority)

1. **Auto-create Default Lifetime Tier**
   - When POST `/api/bundles` creates bundle, also insert a default lifetime tier:
   ```typescript
   // After bundle creation
   await supabase.from('bundle_subscription_tiers').insert({
     bundle_id: bundle.id,
     subscription_type: 'lifetime',
     price: 0, // Placeholder - admin must set
     sale_price: null,
     active: false, // Inactive until price set
   });
   ```

2. **Add Bundle Tiers API Endpoints**
   - POST `/api/bundles/[id]/tiers` - Create tier
   - PUT `/api/bundles/[id]/tiers/[tier_id]` - Update tier
   - DELETE `/api/bundles/[id]/tiers/[tier_id]` - Delete tier
   - GET `/api/bundles/[id]/tiers` - List tiers

3. **Add Bundle Admin UI**
   - Create `/admin/bundles` page (list all bundles)
   - Create `/admin/bundles/create` page
   - Create `/admin/bundles/edit/[id]` page with:
     - Basic info fields
     - Pricing tiers management (add/edit monthly/annual/lifetime with price/sale_price)
     - Product association (search, add, remove, reorder)
     - Status management

4. **Add Validation**
   - Prevent bundle activation without at least one pricing tier
   - Warn when bundle has no products
   - Validate tier prices are > 0 (or explicitly 0 for free)
   - Check for duplicate tiers

### Medium-term Improvements

1. **Unify Bundle Representation**
   - Decision: Should bundles exist in BOTH tables or just `bundles`?
   - **Recommended:** Bundles ONLY in `bundles` table
   - Products table: remove 'bundle' category option (or deprecate)
   - Migration: Move existing products with category='bundle' data to bundles table if needed

2. **Bundle-Product Sync**
   - When product price/sale_price changes, optionally update related bundle tiers
   - When bundle tier changes, optionally update product entry (if exists)
   - Add sync warnings/notifications in admin UI

3. **Improved Stripe Integration**
   - Auto-sync bundle tiers to Stripe on tier create/update
   - Handle tier deletion (archive Stripe prices)
   - Sync on bundle activation

4. **Cascade Deletion Improvements**
   - Add DELETE `/api/bundles/[id]` endpoint
   - Archive Stripe products/prices before deleting bundle
   - Optionally soft-delete (status='archived') instead of hard delete

### Long-term Enhancements

1. **Bundle Builder UI**
   - Visual product selector with mosaic preview
   - Auto-calculate total value
   - Pricing recommendations based on product prices
   - Templates for common bundle types

2. **Pricing Intelligence**
   - Suggest pricing based on product sum
   - Discount calculator (e.g., "20% off total value")
   - Compare pricing across tiers
   - Historical pricing analytics

3. **Automated Checks**
   - Daily job to find bundles without tiers → alert admin
   - Find bundles with inactive/missing products → alert
   - Validate pricing consistency
   - Check Stripe sync status

---

## API Endpoints Inventory

### Products APIs (Complete)
- ✅ GET `/api/products` - List products (filters: category, status, featured, free)
- ✅ GET `/api/products/[id]` - Get single product
- ✅ GET `/api/products/slug/[slug]` - Get by slug
- ✅ POST `/api/products` - Create product (auto Stripe sync)
- ✅ PUT `/api/products/[id]` - Update product (auto Stripe sync if pricing/name changes)
- ✅ DELETE `/api/products/[id]` - Delete product (archives Stripe)
- ✅ GET `/api/products/related` - Related products
- ✅ POST/DELETE `/api/products/relationships` - Manage relationships

### Bundles APIs (Partial)
- ✅ GET `/api/bundles` - List bundles (filters: status, type, featured)
- ✅ GET `/api/bundles/[slug]` - Get single bundle with tiers and products
- ✅ POST `/api/bundles` - Create bundle (❌ no tiers, no products, no Stripe)
- ❌ PUT `/api/bundles/[id]` - **MISSING** - Update bundle
- ❌ DELETE `/api/bundles/[id]` - **MISSING** - Delete bundle
- ✅ GET `/api/bundles/products?bundle_id=xxx` - Get products in bundle
- ✅ POST `/api/bundles/products` - Add product to bundle
- ✅ PATCH `/api/bundles/products` - Reorder products
- ✅ DELETE `/api/bundles/products` - Remove product from bundle
- ⚠️ POST `/api/bundles/create-products` - Create product entries for bundles (manual sync)

### Missing Tier APIs
- ❌ GET `/api/bundles/[id]/tiers` - List tiers
- ❌ POST `/api/bundles/[id]/tiers` - Create tier
- ❌ PUT `/api/bundles/[id]/tiers/[tier_id]` - Update tier
- ❌ DELETE `/api/bundles/[id]/tiers/[tier_id]` - Delete tier

---

## Frontend Display Logic

### All Products Page (`/products`)
- Shows products from `products` table
- **New behavior:** Items with `category='bundle'` link to `/bundles/{slug}` (not `/product/{slug}`)
- Shows price/sale_price directly from products table
- ProductCard shows strikethrough + sale price when applicable

### Bundles Page (`/bundles`)
- Shows bundles from `bundles` table
- Requires `bundle_subscription_tiers` to display pricing
- Elite bundles (monthly/annual): show tier options
- Regular bundles (lifetime only): show price + add to cart
- **Bug found:** Bundle without tiers shows no price and no button

### Conditional Rendering
- Elite bundle check: `bundle.pricing?.monthly || bundle.pricing?.annual`
- Regular bundle: has `bundle.pricing?.lifetime` and NOT elite
- Empty bundle: has neither (shows "N/A" or nothing)

---

## Product Category: 'bundle' Behavior

### When a Product has category='bundle'

**In products table:**
- Has price and sale_price like any product
- Can be added to cart directly
- Shows on /products page
- Detail page: `/product/{slug}` (normal product page)

**In product edit UI:**
- Changing category to 'bundle' triggers:
  - Fetch bundle by matching name/slug from `bundles` table
  - Load associated products from `bundle_products`
  - Show "Add Product to Bundle" section
  - Can manage bundle-product associations

**Link behavior:**
- ProductCard now routes to `/bundles/{slug}` if category='bundle'
- Relies on matching slug between products and bundles tables
- If no matching bundle exists: 404 on bundle page

---

## Scripts & Bulk Operations

### Bundle Creation Scripts
- `scripts/create-initial-bundles.ts` - Creates elite bundles with all tiers
- `scripts/create-tetrad-bundle.ts` - Creates Tetrad bundle
- `scripts/create-bundle-records-and-attach-products.ts` - Bulk create + associate

### Product Migration Scripts
- `scripts/attach-products-to-bundles.ts` - Associate existing products to bundles
- `scripts/attach-products-based-on-bundle-names.ts` - Smart matching
- `scripts/verify-all-bundle-products.ts` - Check associations

### Pricing Scripts
- `scripts/update-product-pricing.ts` - Scrape nnaud.io → update products price/sale_price
- ❌ No equivalent for bundle tier pricing updates

### Sync Scripts
- `scripts/sync-all-products-to-stripe.ts` - Batch sync products to Stripe
- `app/api/bundles/create-products/route.ts` - Create product entries for bundles + Stripe sync

---

## Current Workarounds in Use

### Creating a Bundle (Current Flow)
1. Call POST `/api/bundles` with basic info (or run script)
2. **Manually** insert rows into `bundle_subscription_tiers` via SQL:
   ```sql
   INSERT INTO bundle_subscription_tiers ...
   ```
3. **Manually** insert rows into `bundle_products` via SQL or API:
   ```sql
   INSERT INTO bundle_products (bundle_id, product_id, display_order) VALUES ...
   ```
4. Optionally: Create matching product entry with category='bundle'
5. Optionally: Call POST `/api/bundles/create-products` to sync to Stripe

### Editing a Bundle (Current Flow)
1. Find product with category='bundle' and matching slug
2. Go to `/admin/products/edit/[id]`
3. Edit product fields (name, description, price, sale_price on product)
4. Add/remove products via "Add Product to Bundle" section
5. **Cannot** edit bundle tiers (monthly/annual/lifetime pricing) in UI
6. Must use SQL to update `bundle_subscription_tiers`

### Setting Bundle Sale Price
1. If bundle has product entry: update product.sale_price
2. Update `bundle_subscription_tiers` set sale_price via SQL for each tier
3. Hope they stay in sync (no validation)

---

## Root Cause Analysis

### Why "20 For 20" Had No Sale Price on Bundles Page

**Sequence of Events:**
1. Bundle created in `bundles` table (status: draft)
2. Product created in `products` table with price/sale_price
3. Bundle had ZERO rows in `bundle_subscription_tiers`
4. Bundles page API builds pricing from tiers → `pricing.lifetime = undefined`
5. Bundle card on `/bundles` page checks `bundle.pricing?.lifetime?.sale_price` → undefined
6. No pricing displayed, no add to cart shown
7. Bundle was also `status='draft'` so didn't show at all until activated

**Resolution:**
- Set bundle status to 'active'
- Manually inserted lifetime tier with price=$493, sale_price=$20
- Now displays correctly

### Why This Keeps Happening

**Root Cause:** The POST `/api/bundles` endpoint creates ONLY the bundle record. It assumes tiers will be created separately (via script or manual SQL). There's no admin UI to prompt the user to add tiers, and no validation prevents saving a bundle without tiers.

---

## Recommendations Summary

### Immediate (This Week)
1. ✅ **Fix**: Add default lifetime tier on bundle creation (price=0, active=false) so bundle always has structure
2. ✅ **Create**: Bundle tier management API endpoints
3. ✅ **Build**: Basic admin UI for bundles at `/admin/bundles`

### Short-term (This Month)
4. ✅ **Unify**: Decide on single source of truth (bundles table only vs dual system)
5. ✅ **Validate**: Add checks to prevent bundles without tiers from being activated
6. ✅ **Sync**: Auto-sync bundle tiers to Stripe on create/update

### Medium-term (This Quarter)
7. ✅ **Migrate**: If unifying, migrate all products with category='bundle' to bundles table
8. ✅ **Audit**: Create admin dashboard for bundle/tier health checks
9. ✅ **Delete**: Implement proper bundle deletion with Stripe cleanup

### Long-term (Nice to Have)
10. ✅ **Builder**: Visual bundle builder with pricing calculator
11. ✅ **Automation**: Scheduled jobs to detect and fix orphaned data
12. ✅ **Analytics**: Bundle performance tracking

---

## Data Integrity Check Commands

Run these to find issues:

```sql
-- Bundles without any pricing tiers
SELECT b.id, b.name, b.slug, b.status
FROM bundles b
LEFT JOIN bundle_subscription_tiers t ON t.bundle_id = b.id AND t.active = true
WHERE t.id IS NULL;

-- Bundles without products
SELECT b.id, b.name, b.slug, b.status, COUNT(bp.id) as product_count
FROM bundles b
LEFT JOIN bundle_products bp ON bp.bundle_id = b.id
GROUP BY b.id, b.name, b.slug, b.status
HAVING COUNT(bp.id) = 0;

-- Products with category='bundle' but no bundles table entry
SELECT p.id, p.name, p.slug
FROM products p
LEFT JOIN bundles b ON b.slug = p.slug
WHERE p.category = 'bundle' AND b.id IS NULL;

-- Active bundles with inactive/missing products
SELECT b.name as bundle_name, p.name as product_name, p.status
FROM bundles b
JOIN bundle_products bp ON bp.bundle_id = b.id
LEFT JOIN products p ON p.id = bp.product_id
WHERE b.status = 'active' AND (p.id IS NULL OR p.status != 'active');

-- Pricing tier inconsistencies (price = 0 but not explicitly free)
SELECT b.name, t.subscription_type, t.price, t.sale_price, t.active
FROM bundle_subscription_tiers t
JOIN bundles b ON b.id = t.bundle_id
WHERE t.price = 0 AND t.active = true AND b.status = 'active';
```

---

## Conclusion

The bundle system is **partially implemented** with significant gaps in the admin tooling. While the database schema and frontend display work correctly, the creation and management workflows rely heavily on manual SQL or scripts. The lack of pricing tier management UI is the primary cause of issues like "20 For 20" not displaying correctly.

**Most Critical Fix:** Build an admin UI for bundle management with integrated pricing tier controls, or at minimum, auto-create default pricing tiers when bundles are created via POST `/api/bundles`.
