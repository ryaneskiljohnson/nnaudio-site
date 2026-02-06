# Sample Library Upload Instructions

## Upload Structure

When uploading sample ZIP files to Supabase Storage, use the following simple path structure:

```
products/{product-slug}/samples.zip
```

**Simple naming:**
- Folder: `{product-slug}` (e.g., `blaque`, `natura`)
- File: `samples.zip` (same name for all products)

## Files to Upload

### ✅ Already Uploaded (7 files)
These have been successfully uploaded and associated with products:
- `samples_albanju.zip` → `products/albanju/samples.zip`
- `samples_game-boi-retro-sounds-free-plugin.zip` → `products/game-boi-retro-sounds-free-plugin/samples.zip`
- `samples_gameboi-pack.zip` → `products/gameboi-pack/samples.zip`
- `samples_noker.zip` → `products/noker/samples.zip`
- `samples_perc-gadget.zip` → `products/perc-gadget/samples.zip`
- `samples_percgadget-drum-machine.zip` → `products/percgadget-drum-machine/samples.zip`
- `samples_strange-tingz-free-80s-plugin.zip` → `products/strange-tingz-free-80s-plugin/samples.zip`

### ⚠️ Need Manual Upload (8 files - too large for API)

Upload these files manually via Supabase Dashboard:

1. **samples_blaque.zip** (796 MB)
   - Upload to: `products/blaque/samples.zip`
   - Product: Blaque (blaque)

2. **samples_natura.zip** (1.2 GB)
   - Upload to: `products/natura/samples.zip`
   - Product: Natura (natura)

3. **samples_numb.zip** (113 MB)
   - Upload to: `products/numb/samples.zip`
   - Product: Numb (numb)

4. **samples_obscura-tortured-orchestral-box.zip** (2.1 GB)
   - Upload to: `products/obscura-tortured-orchestral-box/samples.zip`
   - Product: Obscura (obscura-tortured-orchestral-box)

5. **samples_obscura-royal-family-bundle-black-friday.zip** (2.1 GB)
   - Upload to: `products/obscura-royal-family-bundle-black-friday/samples.zip`
   - Product: Obscura + Royal Family Bundle (obscura-royal-family-bundle-black-friday)

6. **samples_prodigious.zip** (1.6 GB)
   - Upload to: `products/prodigious/samples.zip`
   - Product: Prodigious (prodigious)

7. **samples_quoir.zip** (53 MB)
   - Upload to: `products/quoir/samples.zip`
   - Product: Quoir (quoir)

8. **samples_reiya.zip** (1.9 GB)
   - Upload to: `products/reiya/samples.zip`
   - Product: Reiya (reiya)

## Upload Steps

1. Go to Supabase Dashboard → Storage → `product-downloads` bucket
2. Navigate to or create the folder: `products/{product-slug}/`
3. Upload the file and rename it to: `samples.zip` (simple name for all products)
4. After upload, run the association script to update the database

## After Upload - Update Database

After manually uploading the files, run this script to associate them with products:

```bash
bun run scripts/associate-uploaded-samples.ts
```

This will update the `products.downloads` field for each product with the sample download metadata.

