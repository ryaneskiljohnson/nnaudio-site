/**
 * @fileoverview Shared constants for admin APNs registration, WAF bypass, and tap navigation.
 * @module PushConfig
 *
 * `nnaudioAppPushSecret` must match the server `NNAUDIO_APP_PUSH_SECRET` env var.
 */

import Foundation

/// Header sent so Vercel Firewall can bypass Attack Challenge for this client only.
let nnaudioAppBypassHeaderName = "X-NNAudio-App"
let nnaudioAppBypassHeaderValue = "1"

/// Shared secret for POST /api/admin/push-devices.
let nnaudioAppPushSecretHeaderName = "X-NNAudio-App-Push-Secret"
let nnaudioAppPushSecret = "8f5abb29816e2a21cc405408a544924bde21c0125ffec99ec01bbf3bebf9b2b3"

let nnaudioSiteOrigin = "https://nnaud.io"
let nnaudioPushDevicesURLString = "https://nnaud.io/api/admin/push-devices"

extension Notification.Name {
    /// Posted with a `/admin…` path string when a push is tapped.
    static let nnaudioOpenAdminPath = Notification.Name("nnaudioOpenAdminPath")
}

/**
 * @brief Holds a pending admin path across cold start until the WebView is ready.
 */
enum AdminPushNavigation {
    static var pendingPath: String?

    /**
     * @brief Accepts only relative `/admin` paths (no scheme).
     * @param path Raw path from the APNs payload
     * @returns Sanitized path, or nil when the value is not an admin path
     */
    static func sanitize(_ path: String) -> String? {
        let trimmed = path.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("/admin"), !trimmed.contains("://") else {
            return nil
        }
        return trimmed
    }

    /**
     * @brief Stores a path and notifies a live WebViewController if one exists.
     * @param path Raw path from the notification userInfo
     */
    static func setPath(_ path: String) {
        guard let safe = sanitize(path) else { return }
        pendingPath = safe
        NotificationCenter.default.post(name: .nnaudioOpenAdminPath, object: safe)
    }

    /**
     * @brief Returns and clears the pending path.
     * @returns Stored admin path, if any
     */
    static func consumePendingPath() -> String? {
        let path = pendingPath
        pendingPath = nil
        return path
    }
}
