# Manual Sample Upload Guide

## Important: File Naming

When uploading sample ZIP files manually to Supabase Storage:

**❌ DON'T use the original filename:**
- `samples_bakers-dozen-bundle.zip` ← This will fail!

**✅ DO rename to simple name:**
- `samples.zip` ← Use this exact name for ALL products

## Upload Steps

1. Go to Supabase Dashboard → Storage → `product-downloads` bucket
2. Navigate to folder: `products/{product-slug}/`
3. Delete the `.placeholder.zip` file (if present)
4. Upload your ZIP file
5. **Rename it to exactly: `samples.zip`** (important!)

## File Mapping

| Source File | Upload To | Rename To |
|------------|-----------|-----------|
| `samples_bakers-dozen-bundle.zip` | `products/bakers-dozen/` | `samples.zip` |
| `samples_albanju-middle-eastern-banjo.zip` | `products/albanju/` | `samples.zip` |
| `samples_apache-native-american-flute.zip` | `products/apache-flute/` | `samples.zip` |
| ... | ... | `samples.zip` |

**All files should be named `samples.zip` in storage!**

## After Upload

Run this script to associate files with products:
```bash
bun run scripts/associate-uploaded-samples.ts
```

