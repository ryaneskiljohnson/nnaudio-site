# NNAudio Site iOS Wrapper

This is a simple iOS application that wraps the NNAudio web site (nnaud.io) in a native iOS WebView.

## Requirements

- Xcode 13.0 or later
- iOS 14.0 or later
- Active Apple Developer account (for deployment to App Store)

## App icon (NNAudio logo)

The app icon is set to the NNAudio logo. To regenerate all icon sizes from the NNAudio logo, from the **project root** (nnaudio-site) run:

```bash
bun run ios:app-icon
```

Or with a custom source image (e.g. a 1024×1024 PNG):

```bash
bun run scripts/generate-ios-app-icon.ts path/to/your/logo.png
```

If no local image is found, the script fetches the NNAudio logo from the project’s Supabase storage.

## Setup Instructions

1. Open the `NNAudioSite.xcodeproj` file in Xcode
2. Update the Bundle Identifier in the project settings to match your Apple Developer account if needed
3. The WebView loads https://nnaud.io/admin by default (configured in `WebViewController.swift`)
4. (Optional) Run `bun run ios:app-icon` from the repo root to refresh the app icon with the NNAudio logo
5. Build and run the application in Xcode

## Configuration

The app is configured to:
- Support both portrait and landscape orientations
- Allow arbitrary loads for development (you may want to restrict this for production)
- Handle basic web navigation and error states
- Show a loading indicator while content is being loaded

## Development Notes

- The app uses WKWebView for optimal web performance
- The app loads https://nnaud.io/admin in the WebView (edit `WebViewController.swift` to change the URL)

## Fix Vercel error 705 (“Failed to verify your browser”)

**Error 705** = Vercel’s “verify your browser” checkpoint. The in-app WebView cannot pass the JS challenge. You can either disable Attack Challenge Mode or add a bypass rule so **only** the app skips the challenge.

### Option A: Bypass only the app (keep Attack Challenge on)

The app sends `X-NNAudio-App: 1` on **every** main-frame request (initial load, redirects, link clicks) so Vercel can allow it through.

1. **Vercel Dashboard** → your **nnaudio-site** project → **Firewall** (sidebar).
2. Click **Configure** (top right) → **Add new rule**.
3. **Name:** e.g. `Bypass NNAudio iOS app`.
4. **If:** Request Header **`x-nnaudio-app`** **Equals** **`1`**.
5. **Then:** **Bypass**.
6. **Save Rule**, then **Apply** / **Publish** the firewall config (so the rule goes live).
7. **Rule order:** Move this rule **to the top** of the list (e.g. drag it above any other rules). It must run first so the bypass applies before the challenge.
8. Rebuild the iOS app and try again.

If it still doesn’t work: try the header **Key** as exactly **`X-NNAudio-App`** (same casing as the app). Some dashboards match header names case-sensitively.

### Option B: Disable Attack Challenge Mode for the project

1. **Firewall** → find **Attack Challenge Mode** → select **Disable** → Save.
2. Reload the app. All traffic (including the app) will no longer be challenged.

## Push notifications (paid orders and support tickets)

The wrapper registers an APNs device token on launch. The site then alerts every registered device when a **paid** order completes or a support ticket is created / gets a customer reply. Tapping the alert opens `/admin/orders` or `/admin/support-tickets?ticket=…` in the WebView.

Push is independent of the admin **email** toggles on `/admin/notifications`. Free orders never notify.

### Apple Developer (required before pushes will deliver)

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → Identifiers → App ID `io.nnaud` → enable **Push Notifications** → Save.
2. [Keys](https://developer.apple.com/account/resources/authkeys/list) → **+** → enable **Apple Push Notifications service (APNs)** → Continue → download the `.p8` once. Note the **Key ID**.
3. Team ID is `QSFW8GQ9MG` (Ethinx LLC — same team that signs the app).

Xcode Debug builds use the APNs **sandbox**. TestFlight / App Store builds use **production**. Rebuild the app after enabling the capability so the device token can register.

### Server environment variables

Set these in Vercel (Production and Preview) and in local `.env`. Values must match the Apple key and the secret compiled into `PushConfig.swift`.

| Variable | Value |
| --- | --- |
| `APNS_KEY_ID` | Key ID from the APNs auth key |
| `APNS_TEAM_ID` | `QSFW8GQ9MG` |
| `APNS_KEY_P8` | Full `.p8` PEM (or the base64 body; the server wraps it) |
| `APNS_BUNDLE_ID` | `io.nnaud` |
| `NNAUDIO_APP_PUSH_SECRET` | Same string as `nnaudioAppPushSecret` in `NNAudioSite/PushConfig.swift` |

After setting Vercel env vars, redeploy the site. After changing the Apple App ID capability, rebuild and reinstall the iOS app, accept the notification prompt, then trigger a paid test order or a ticket.

## Security Considerations

- For production deployment, update the NSAppTransportSecurity settings in Info.plist to only allow your specific domain
- Consider implementing SSL certificate pinning for additional security
- Review and update the allowed orientations and device capabilities as needed 