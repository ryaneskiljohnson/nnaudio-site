# NNAudio Plugin Authorization Flow

## Overview

NNAudio plugins (JUCE-based VST/AU plugins) rely on the **NNAudio Access** desktop app for authentication. The plugins read the auth token from shared storage and use it to verify access to specific products via the web API.

## Authorization Architecture

```
┌─────────────────────┐
│  NNAudio Access     │
│  Desktop App        │
│  (JUCE)             │
└──────────┬──────────┘
           │
           │ 1. User logs in
           │ 2. Gets Supabase token
           │ 3. Stores token in Keychain/UserDefaults
           │
           ▼
┌─────────────────────┐
│  Shared Storage     │
│  (macOS Keychain/   │
│   UserDefaults)     │
└──────────┬──────────┘
           │
           │ 4. Plugin reads token
           │
           ▼
┌─────────────────────┐
│  NNAudio Plugin     │
│  (JUCE VST/AU)      │
└──────────┬──────────┘
           │
           │ 5. Plugin calls API with token + product_id
           │
           ▼
┌─────────────────────┐
│  Web API            │
│  /api/nnaudio-access│
│  /product           │
└─────────────────────┘
```

## Step-by-Step Flow

### 1. User Authentication (NNAudio Access App)

**Endpoint**: `POST /api/nnaudio-access/login`

**Request**:
```form-data
username: user@example.com
password: user_password
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsImtpZCI6...",
  "user_email": "user@example.com",
  "user_nicename": "User Name",
  "user_display_name": "User Name"
}
```

**Storage**: The NNAudio Access app stores the `token` in:
- **macOS**: Keychain or `UserDefaults` (shared between apps)
- **Windows**: Registry or shared config file

### 2. Plugin Initialization

When a plugin loads, it:
1. Reads the stored token from shared storage (Keychain/UserDefaults)
2. Identifies its own `product_id` (hardcoded in plugin or from metadata)
3. Calls the authorization endpoint

### 3. Plugin Authorization Check

**Endpoint**: `POST /api/nnaudio-access/product`

**Request**:
```form-data
token: eyJhbGciOiJIUzI1NiIsImtpZCI6...
product_id: uuid-of-plugin-product
```

**Authorization Logic** (server-side):

The endpoint checks if the user has access via **three priority levels**:

#### Priority 1: NFR (Not For Resale) License
- Checks `user_management` table for `pro=true`
- If found, grants access to **all products**

#### Priority 2: Active Subscription
- Checks `profiles.subscription` field
- If `subscription` is `monthly`, `annual`, or `lifetime`, grants access to **all products**

#### Priority 3: Individual Purchase
- Queries Stripe payment intents for the user
- Checks if `product_id` was in the purchased cart items
- Grants access only to **specifically purchased products**

**Response (Authorized)**:
```json
{
  "id": "uuid",
  "name": "Product Name",
  "images": [{"src": "url", "alt": "name"}],
  "downloads": [
    {
      "file": "https://signed-url...",
      "name": "Product Name",
      "type": "plugin",
      "version": "1.0.0",
      "file_size": 52428800
    }
  ],
  "version": "1.0.0"
}
```

**Response (Unauthorized)**:
```json
{
  "success": false,
  "message": "Access denied"
}
```

### 4. Plugin Behavior

**If Authorized**:
- Plugin loads normally
- User can use all features
- Plugin may cache authorization status locally

**If Unauthorized**:
- Plugin shows authorization error
- Plugin may run in demo/trial mode
- User is prompted to log in via NNAudio Access app

## Token Sharing Mechanism

The token is shared between NNAudio Access and plugins via:

### macOS
- **Keychain**: Secure storage accessible by apps with same bundle identifier prefix
- **UserDefaults**: Shared app group container (e.g., `group.com.nnaudio.access`)

### Windows
- **Registry**: `HKEY_CURRENT_USER\Software\NNAudio\Access\Token`
- **Shared Config File**: `%APPDATA%\NNAudio\access_token.txt`

## API Endpoint Details

### `/api/nnaudio-access/product`

**Purpose**: Verify plugin authorization and get product details

**Authentication**: Token-based (Supabase JWT)

**Access Control**:
- Validates token with Supabase `auth.getUser()`
- Checks user's subscription status
- Checks individual purchases from Stripe
- Checks NFR licenses

**Returns**:
- Product details with signed download URLs
- Only if user has access (subscription, purchase, or NFR)

**Error Handling**:
- Invalid token → `400 Bad Request`
- No access → `403 Forbidden` (or `200` with `success: false`)
- Product not found → `404 Not Found`

## Security Considerations

1. **Token Storage**: Tokens are stored securely in system Keychain/Registry
2. **Token Validation**: Every plugin authorization request validates the token server-side
3. **Token Expiration**: Supabase tokens expire after 1 hour; plugins may need to refresh via NNAudio Access app
4. **Product ID Verification**: Server verifies the `product_id` matches the user's accessible products
5. **Signed URLs**: Download URLs are signed with 1-hour expiration for security

## Token Refresh Flow

If a plugin's token expires:

1. Plugin detects expired token (401 response)
2. Plugin prompts user to refresh in NNAudio Access app
3. User opens NNAudio Access app (auto-refreshes token on launch)
4. Plugin re-reads token from shared storage
5. Plugin retries authorization

## Implementation Notes

### Plugin Side (JUCE)
- Token reading from Keychain/UserDefaults is handled in plugin code
- Plugin should handle network errors gracefully
- Plugin should cache authorization status to avoid repeated API calls

### Server Side
- All authorization logic is centralized in `/api/nnaudio-access/product`
- Same logic used by NNAudio Access app (`/api/nnaudio-access/products`)
- Ensures consistency between app and plugins

## Related Endpoints

- **`/api/nnaudio-access/login`**: Get auth token
- **`/api/nnaudio-access/products`**: List all accessible products (used by desktop app)
- **`/api/nnaudio-access/product`**: Verify access to specific product (used by plugins)
- **`/api/nnaudio-access/download`**: Get signed download URL for a file

## Example Plugin Authorization Request

```cpp
// Pseudo-code (JUCE)
String token = Keychain::readToken("com.nnaudio.access.token");
String productId = "uuid-of-this-plugin";

FormData formData;
formData.append("token", token);
formData.append("product_id", productId);

auto response = httpClient.post("https://nnaud.io/api/nnaudio-access/product", formData);

if (response.isOk() && response.hasJson()) {
    auto json = response.getJson();
    if (json["success"] != false) {
        // Authorized - load plugin normally
        loadPlugin();
    } else {
        // Unauthorized - show error or demo mode
        showAuthorizationError();
    }
}
```

