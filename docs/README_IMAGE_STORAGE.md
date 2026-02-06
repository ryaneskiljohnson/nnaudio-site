# Email Image Storage with Supabase

This document describes the image storage functionality implemented for email campaigns.

## Overview

All images uploaded through the email visual editor are now automatically saved to Supabase storage and made publicly accessible. This replaces the previous approach of converting images to base64 data URIs.

## Benefits

- **Smaller Email Size**: Images are referenced by URL instead of embedded as base64
- **Better Performance**: Email clients can cache images separately
- **Storage Management**: All images are centrally stored and managed
- **Public Access**: Images are accessible from any email client
- **Better Deliverability**: Smaller email size improves deliverability rates

## Implementation

### API Endpoint

`POST /api/email-campaigns/upload-image`

- Accepts image files up to 10MB
- Supports JPG, PNG, GIF, WebP formats
- Creates `email-assets` bucket automatically if it doesn't exist
- Returns public URL for immediate use

### Storage Structure

```
email-assets/
  email-images/
    email-{timestamp}-{random}.{extension}
```

### Visual Editor Integration

- **Upload States**: Shows loading spinners during upload
- **Error Handling**: Displays upload errors to users
- **Drag & Drop**: Supports both click-to-upload and drag-and-drop
- **Progress Feedback**: Visual indicators for upload progress

## Usage

1. **Add Image Element**: Drag or click to add image element to email
2. **Upload Image**: Click the upload area or drag image file
3. **Automatic Storage**: Image is uploaded to Supabase storage
4. **Public URL**: Image element is updated with public URL
5. **Email Sending**: Image is referenced by URL in sent emails

## Technical Details

### Bucket Configuration

- **Name**: `email-assets`
- **Public**: Yes (for email accessibility)
- **File Size Limit**: 10MB
- **Allowed Types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Cache Control**: 3600 seconds (1 hour)

### File Naming

Files are named using the pattern: `email-{timestamp}-{randomString}.{extension}`

This ensures:
- Unique filenames to prevent conflicts
- Chronological organization
- Original file extension preservation

### Security

- Uses Supabase service role for upload operations
- Validates file types and sizes
- Generates unique, non-guessable filenames
- Public bucket is read-only for external access

## Error Handling

The system handles various error scenarios:

- **Invalid File Type**: Only image files are accepted
- **File Too Large**: Maximum 10MB file size
- **Network Errors**: Shows user-friendly error messages
- **Bucket Creation**: Automatically creates bucket if missing
- **Upload Failures**: Retries and provides feedback

## Example Usage

```javascript
// Upload image via API
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/email-campaigns/upload-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.data.publicUrl contains the public URL
```

## Migration Notes

- Existing emails with base64 images will continue to work
- New uploads automatically use Supabase storage
- No manual migration is required
- All new images are stored publicly and permanently

## Monitoring

Monitor storage usage in the Supabase dashboard:
- **Storage Usage**: Track total storage consumption
- **File Count**: Monitor number of uploaded images
- **Bandwidth**: Track image access patterns
- **Errors**: Monitor upload failures

## Future Enhancements

Potential improvements:
- Image optimization/compression
- Multiple size variants (thumbnails)
- Image metadata storage
- Cleanup of unused images
- CDN integration for global distribution 