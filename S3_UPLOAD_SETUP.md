# S3 Direct Upload Setup

## Get S3 Credentials

1. Go to **Supabase Dashboard** → **Project Settings** → **Storage** → **S3 Configuration**
2. Click **"+ New access key"** to create access keys
3. Copy the **Access Key ID** and **Secret Access Key**
4. Note the **Endpoint** and **Region** (usually `us-west-2`)

## Add to .env.local

Add these to your `.env.local` file:

```bash
SUPABASE_S3_ACCESS_KEY_ID=your_access_key_id_here
SUPABASE_S3_SECRET_ACCESS_KEY=your_secret_access_key_here
SUPABASE_S3_REGION=us-west-2
```

## Usage

### Upload Single File

```bash
bun run scripts/upload-via-s3.ts "/path/to/file.zip" "products/product-slug/samples.zip"
```

### Upload All Sample Libraries

```bash
bun run scripts/upload-all-samples-via-s3.ts
```

## Benefits

- ✅ **Better for large files** - S3 handles multipart uploads automatically
- ✅ **More reliable** - Direct S3 connection, no API timeouts
- ✅ **Faster** - Uses optimized storage endpoint
- ✅ **Resumable** - Can resume interrupted uploads

## Reference

- [Supabase S3 Authentication Docs](https://supabase.com/docs/guides/storage/s3/authentication)
- Endpoint format: `https://{project_ref}.storage.supabase.co/storage/v1/s3`

