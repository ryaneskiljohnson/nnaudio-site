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

## Security Considerations

- For production deployment, update the NSAppTransportSecurity settings in Info.plist to only allow your specific domain
- Consider implementing SSL certificate pinning for additional security
- Review and update the allowed orientations and device capabilities as needed 