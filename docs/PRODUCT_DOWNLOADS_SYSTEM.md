# Product Downloads System

## Overview

A secure, scalable download management system using Supabase Storage with signed URLs. This replaces the simple `download_url` field with a comprehensive system supporting multiple downloads per product with proper access control.

## Architecture

### Components

1. **Supabase Storage Bucket**: `product-downloads` (private bucket)
2. **Database Field**: `products.downloads` (JSONB array)
3. **API Endpoints**:
   - `/api/nnaudio-access/product` - Returns product details with signed URLs
   - `/api/nnaudio-access/download` - Generates signed URLs on-demand (for future use)

### Security Model

- **Private Bucket**: Files are not publicly accessible
- **Signed URLs**: Time-limited URLs (1 hour expiry) generated only for authorized users
- **Access Control**: Verifies user has purchased product or has active subscription
- **NFR Support**: Checks for Not For Resale licenses

## Database Schema

### `products.downloads` Field

JSONB array of download objects:

```json
[
  {
    "path": "products/apache-flute/v1.0.0/plugin_apache-flute.zip",
    "name": "Apache Flute Plugin",
    "type": "plugin",
    "version": "1.0.0",
    "file_size": 52428800
  },
  {
    "path": "products/apache-flute/v1.0.0/samples_apache-flute.zip",
    "name": "Apache Flute Samples",
    "type": "samples",
    "version": "1.0.0",
    "file_size": 104857600
  }
]
```

**Download Types**:
- `plugin` - Plugin files (VST3, AU, etc.)
- `samples` - Sample library
- `docs` - Documentation
- `midi` - MIDI pack
- `loops` - Loops
- `kit` - Construction kit

## Setup

### 1. Run Migration

The migration adds the `downloads` JSONB field to the products table:

```bash
# Migration is automatically applied via Supabase
# Or run manually if needed
```

### 2. Create Storage Bucket

Run the setup script:

```bash
bun run scripts/setup-product-downloads-bucket.ts
```

This creates:
- Bucket: `product-downloads`
- Private (not public)
- Max file size: 10GB
- Allowed types: ZIP, audio files, PDF, MIDI

### 3. Upload Files

Upload product files to the bucket using:
- Supabase Dashboard
- Admin UI (to be created)
- API endpoint (to be created)

**File Path Structure**:
```
product-downloads/
  products/
    {product-slug}/
      {version}/
        plugin_{product-slug}.zip
        samples_{product-slug}.zip
        docs_{product-slug}.pdf
```

## Usage

### Adding Downloads to a Product

Update the `downloads` field in the products table:

```sql
UPDATE products
SET downloads = '[
  {
    "path": "products/apache-flute/v1.0.0/plugin_apache-flute.zip",
    "name": "Apache Flute Plugin",
    "type": "plugin",
    "version": "1.0.0",
    "file_size": 52428800
  }
]'::jsonb
WHERE id = 'product-uuid';
```

### API Response Format

The `/api/nnaudio-access/product` endpoint automatically:
1. Reads downloads from `products.downloads`
2. Generates signed URLs for storage paths
3. Returns downloads in WooCommerce-compatible format:

```json
{
  "id": "product-uuid",
  "name": "Apache Flute",
  "downloads": [
    {
      "file": "https://...signed-url...",
      "name": "Apache Flute Plugin",
      "type": "plugin",
      "version": "1.0.0",
      "file_size": 52428800
    }
  ]
}
```

### Desktop App Integration

The desktop app works without changes:
- Receives signed URLs in the `file` property
- Downloads files directly using those URLs
- URLs expire after 1 hour (fresh URLs generated on each product fetch)

## Migration from Legacy System

The system supports both formats:

1. **New Format**: `products.downloads` JSONB array
2. **Legacy Format**: `products.download_url` string

If `downloads` array exists, it's used. Otherwise, falls back to `download_url`.

## Future Enhancements

1. **Admin UI**: Upload files and manage downloads via web interface
2. **Version Management**: Track multiple versions per product
3. **Download Analytics**: Track download counts and patterns
4. **On-Demand URLs**: Desktop app requests signed URLs only when downloading (better security)
5. **CDN Integration**: Use CDN for faster downloads

## Security Considerations

- ✅ Private bucket prevents unauthorized access
- ✅ Signed URLs expire after 1 hour
- ✅ Access control verified before URL generation
- ✅ File paths validated against product's downloads array
- ⚠️ Signed URLs in product endpoint expire quickly (consider on-demand generation)
- ⚠️ Large files may need chunked downloads

## Troubleshooting

### "Download not found for this product"
- Verify the path in `products.downloads` matches the file in storage
- Check file exists in `product-downloads` bucket

### "Unable to generate download URL"
- Verify bucket exists and is accessible
- Check service role key has storage permissions
- Verify file path is correct

### "Access denied"
- User must have purchased product or active subscription
- Check NFR license if applicable
- Verify token is valid

