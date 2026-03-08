# In-App Ad Manager – Enable and Use

The NNAudio admin includes a **Facebook/Meta Ad Manager**: create and manage campaigns, ad sets, and ads from the admin dashboard instead of using Ads Manager or third-party tools.

## What’s already built

- **OAuth connect** – Connect with Facebook; token stored in httpOnly cookie (long-lived when possible).
- **Dashboard** – Campaign counts, quick actions, connection status.
- **Campaigns** – List, create, edit, pause, resume, delete.
- **Ad sets** – List, create (by campaign).
- **Ads** – List, create (image/video, headline, CTA, destination URL).
- **Audiences** – Custom audience list (read).
- **Analytics** – Performance stats.
- **Settings** – App ID / config (and optional ad account if not using post-connect selection).

After you complete setup below, use: **Admin → Ad Manager** (or `/admin/ad-manager`).

---

## 1. Create a Facebook App (one-time)

1. Go to [Facebook for Developers](https://developers.facebook.com/).
2. **My Apps** → **Create App** → choose **Business**.
3. Add product **Facebook Login** (if not already). Then add **Marketing API**:
   - **App Dashboard** → **Add Product** → **Marketing API** → Set up.
4. Under **Facebook Login** → **Settings**:
   - **Valid OAuth Redirect URIs** – add:
     - `http://localhost:3000/api/facebook-ads/callback` (local)
     - `https://nnaud.io/api/facebook-ads/callback` (production)
   - Save.
5. **App Review** (for production): request **Advanced Access** for:
   - `ads_management`
   - `ads_read`
   - `business_management`
   - `pages_read_engagement`
   - `pages_manage_ads`
   - `email`  
   In **Development** mode, these work for admins/developers/testers of the app without review.

---

## 2. Environment variables

In `.env.local` (and in Vercel for production):

```bash
# Facebook Ad Manager (in-app admin)
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Base URL (must match redirect URI)
NEXT_PUBLIC_SITE_URL=https://nnaud.io
# For local: NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Optional:**

- `FACEBOOK_AD_ACCOUNT_ID` – Numeric ad account ID (e.g. `123456789`). If omitted, the app will **auto-select the first ad account** after you connect (stored in a cookie).
- `FACEBOOK_MOCK_CONNECTION=true` – Use mock data only (no real Facebook API). Useful for UI development.

Do **not** commit `FACEBOOK_APP_SECRET`; keep it in env only.

---

## 3. Connect your ad account in the app

1. Log in as an admin.
2. Open **Admin → Ad Manager** (`/admin/ad-manager`).
3. Click **Connect to Facebook** (or similar). You’ll be sent to Facebook to log in and approve permissions.
4. After redirect back:
   - If you did **not** set `FACEBOOK_AD_ACCOUNT_ID`, the app fetches your ad accounts and uses the **first one** (or you can add a picker later).
   - If you **did** set `FACEBOOK_AD_ACCOUNT_ID`, that account is used.

You can now create campaigns, ad sets, and ads from the dashboard.

---

## 4. Production checklist

- [ ] Facebook App **Valid OAuth Redirect URIs** includes `https://nnaud.io/api/facebook-ads/callback`.
- [ ] `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` set in Vercel (or your host) env.
- [ ] `NEXT_PUBLIC_SITE_URL=https://nnaud.io` in production env.
- [ ] For live use by others: App in **Live** mode and permissions approved in **App Review** (or keep in Development for admin-only use).

---

## 5. Troubleshooting

| Issue | Fix |
|--------|-----|
| “Facebook App ID not configured” | Set `FACEBOOK_APP_ID` (and restart dev server or redeploy). |
| “Invalid redirect URI” | Add the exact callback URL (including `/api/facebook-ads/callback`) in the Facebook app’s OAuth settings; match http vs https and domain. |
| “No Facebook access token” | Click **Connect to Facebook** again; clear cookies for the site and reconnect if needed. |
| “Not connected to Facebook Ads” | Ensure you completed OAuth and were redirected back; check that the cookie is set (same domain, secure in prod). |
| No ad accounts / wrong account | Set `FACEBOOK_AD_ACCOUNT_ID` to the numeric ID of the ad account you want, or (if implemented) use the in-app ad account picker after connect. |
| "Object with ID 'act_...' does not exist" or "missing permissions" | The token can see the account but can’t **create** on it. Ensure the **Facebook user you connected** has **Advertiser** or **Admin** on that ad account: [Meta Business Manager](https://business.facebook.com) → **Business Settings** → **Accounts** → **Ad Accounts** → [your account] → **People** → your user must have **Advertiser** or **Admin** (not only View/Analyze). Then **Disconnect** and **Connect** again in Ad Manager so a fresh token is stored. Confirm the account in the in-app ad account dropdown or set `FACEBOOK_AD_ACCOUNT_ID` to the numeric ID. |

---

## 6. Relation to Pixel and CAPI

- **Pixel + CAPI** (e.g. `NEXT_PUBLIC_META_PIXEL_ID`, `META_CONVERSIONS_API_TOKEN`) are for **tracking** on nnaud.io (events, conversions). They are independent of the in-app Ad Manager.
- The **in-app Ad Manager** uses **Facebook Marketing API** with **OAuth** to create and manage campaigns. It uses its own token (from “Connect to Facebook”) and optional `FACEBOOK_AD_ACCOUNT_ID`.

You can use both: Pixel/CAPI for attribution and the in-app Ad Manager for campaign creation and management.
