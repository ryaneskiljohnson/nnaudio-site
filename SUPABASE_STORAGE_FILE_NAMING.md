# Supabase Storage File Naming Rules

## Important: File Name Restrictions

Supabase Storage uses AWS S3 under the hood, which has strict file naming rules:

### ❌ NOT ALLOWED:
- **Spaces** - Use hyphens or underscores instead
- **Special characters** like: `! @ # $ % ^ & * ( ) + = [ ] { } | \ : ; " ' < > , ? /`
- **Non-ASCII characters** (umlauts, accents, etc.)

### ✅ ALLOWED:
- Letters (a-z, A-Z)
- Numbers (0-9)
- Hyphens (-)
- Underscores (_)
- Dots (.) for file extensions
- Forward slashes (/) for paths

## Examples

**❌ Invalid:**
- `samples_Prodigious Samples Archive.zip` (has spaces)
- `file name with spaces.zip` (has spaces)
- `test@file.zip` (has @ symbol)

**✅ Valid:**
- `samples_Prodigious-Samples-Archive.zip` (spaces replaced with hyphens)
- `samples_Prodigious_Samples_Archive.zip` (spaces replaced with underscores)
- `test-file.zip` (hyphens are fine)

## Quick Fix

When uploading files with spaces, rename them first:
- Replace all spaces with hyphens `-` or underscores `_`
- Remove any special characters

