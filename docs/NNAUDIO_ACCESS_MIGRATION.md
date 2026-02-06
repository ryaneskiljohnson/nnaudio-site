# NNAudio Access Migration: WooCommerce → Supabase

## Overview

This document outlines the complete migration of NNAudio Access desktop application from WooCommerce/WordPress authentication to Supabase authentication.

## Changes Made

### 1. API Endpoints Created

All endpoints are located at `/api/nnaudio-access/`:

#### `/api/nnaudio-access/login` (POST)
- **Purpose**: Authenticate users with Supabase
- **Input**: `username` (email) and `password` (form data)
- **Output**: WordPress JWT-compatible format:
  ```json
  {
    "token": "supabase_access_token",
    "user_email": "user@example.com",
    "user_nicename": "User Name",
    "user_display_name": "User Name"
  }
  ```
- **Error Format**: `{ "code": "error_code", "message": "error message" }`

#### `/api/nnaudio-access/products` (POST)
- **Purpose**: Fetch user's downloadable products
- **Input**: `token` (form data)
- **Output**: Array of products in WooCommerce format:
  ```json
  [
    {
      "product_id": "uuid",
      "product_name": "Product Name",
      "download_name": "Product Name"
    }
  ]
  ```
- **Logic**: 
  - Returns all products if user has active subscription
  - Returns individually purchased products from Stripe payment intents
  - Validates token before processing

#### `/api/nnaudio-access/product` (POST)
- **Purpose**: Get detailed product information
- **Input**: `token` and `product_id` (form data)
- **Output**: Product details in WooCommerce format:
  ```json
  {
    "id": "uuid",
    "name": "Product Name",
    "images": [{"src": "url", "alt": "name"}],
    "downloads": [{"file": "url", "name": "name"}],
    "version": "1.0.0"
  }
  ```
- **Access Control**: Validates user has access (subscription or purchase)

#### `/api/nnaudio-access/redeem` (POST)
- **Purpose**: Redeem serial keys (placeholder)
- **Input**: `token` and `serial` (form data)
- **Status**: Not yet implemented - returns 501

### 2. Desktop App Updates

#### `Source/Frontend/Services/AuthService.h`
- ✅ Changed base URL from `https://nnaudioaccess.deno.dev/` to `https://nnaud.io/api/nnaudio-access/`
- ✅ Updated comment from "WordPress REST API" to "Supabase REST API"
- ✅ Updated comment for `testConnection` method

#### `Source/Frontend/Services/AuthService.cpp`
- ✅ Updated comment from "WooCommerce API" to "Supabase API"
- ✅ Updated comment in `redeemSerialKey` method

#### `Source/Backend/AuthManager.cpp`
- ✅ Updated comment from "WordPress authentication" to "Supabase authentication"

### 3. Response Format Compatibility

The new Supabase endpoints maintain compatibility with the desktop app's expected formats:

- **Login**: Returns WordPress JWT-compatible format
- **Products**: Returns array format matching WooCommerce downloads
- **Product**: Returns object with `images` and `downloads` arrays matching WooCommerce format
- **Errors**: Uses `{ code, message }` format for login, `{ success: false, message }` for others

## Authentication Flow

1. **Login**:
   - Desktop app sends `username` and `password` to `/api/nnaudio-access/login`
   - Supabase authenticates and returns access token
   - Desktop app stores token for subsequent requests

2. **Fetch Products**:
   - Desktop app sends `token` to `/api/nnaudio-access/products`
   - Server validates token with Supabase
   - Server checks user's subscription status and purchases
   - Returns list of accessible products

3. **Get Product Details**:
   - Desktop app sends `token` and `product_id` to `/api/nnaudio-access/product`
   - Server validates token and access
   - Returns product with download URLs

## Token Validation

All endpoints use Supabase token validation:
- Token is passed in POST data (not Authorization header, to match desktop app)
- Token is validated using Supabase `getUser()` with Authorization header
- User ID is extracted for database queries

## Product Access Logic

Products are accessible if:
1. User has active subscription (monthly, annual, or lifetime)
2. User has individually purchased the product (via Stripe payment intents)
3. Product status is "active" in Supabase

## Remaining Work

1. **Serial Key Redemption**: Implement serial key system in Supabase
2. **Download URLs**: Ensure all products have `download_url` populated
3. **Testing**: Test all endpoints with desktop app
4. **Error Handling**: Verify all error cases are handled correctly

## Files Modified

### Next.js Site
- `app/api/nnaudio-access/login/route.ts` (new)
- `app/api/nnaudio-access/products/route.ts` (new)
- `app/api/nnaudio-access/product/route.ts` (new)
- `app/api/nnaudio-access/redeem/route.ts` (new)

### Desktop App
- `Source/Frontend/Services/AuthService.h`
- `Source/Frontend/Services/AuthService.cpp`
- `Source/Backend/AuthManager.cpp`

## Notes

- The old Deno server at `nnaudioaccess/main.ts` is no longer used but kept for reference
- WordPress plugin files are kept but not used
- All authentication now goes through Supabase
- Product data comes from Supabase `products` table
- Purchase data comes from Stripe payment intents (via Supabase Stripe wrapper)

