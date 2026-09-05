/**
 * @fileoverview Application delegate: scene configuration and APNs registration.
 * @module AppDelegate
 *
 * Requests notification permission, registers the device token with nnaud.io,
 * and forwards notification taps to the admin WebView.
 */
import UIKit
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var window: UIWindow?

    /**
     * @brief Sets the notification delegate and asks for alert permission.
     * @param application Shared application
     * @param launchOptions Cold-start options (may include a remote notification)
     * @returns Always true
     */
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        requestPushPermissionAndRegister()

        if let userInfo = launchOptions?[.remoteNotification] as? [AnyHashable: Any],
           let path = userInfo["path"] as? String {
            AdminPushNavigation.setPath(path)
        }

        return true
    }

    /**
     * @brief Requests alert/sound permission, then registers for remote notifications.
     */
    private func requestPushPermissionAndRegister() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Push permission error: \(error.localizedDescription)")
            }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
                #if DEBUG
                if granted {
                    self.scheduleDebugTestNotification()
                }
                #endif
            }
        }
    }

    #if DEBUG
    /**
     * @brief Schedules a local alert so we can verify banners/taps before APNs is wired.
     * @note DEBUG only. Fires ~3s after launch; lock the phone or leave the home screen to see it.
     */
    private func scheduleDebugTestNotification() {
        let content = UNMutableNotificationContent()
        content.title = "Paid order"
        content.body = "$49.00 — Reiya (test)"
        content.sound = .default
        content.userInfo = ["path": "/admin/orders"]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 3, repeats: false)
        let request = UNNotificationRequest(
            identifier: "nnaudio.debug.test-push",
            content: content,
            trigger: trigger
        )
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Debug test notification failed: \(error.localizedDescription)")
            } else {
                print("Debug test notification scheduled in 3s")
            }
        }
    }
    #endif

    /**
     * @brief Sends the APNs token to the site so paid-order and ticket alerts can fan out.
     * @param application Shared application
     * @param deviceToken Raw APNs token
     */
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        registerDeviceToken(deviceToken)
    }

    /**
     * @brief Logs APNs registration failures.
     * @param application Shared application
     * @param error Registration error
     */
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs registration failed: \(error.localizedDescription)")
    }

    /**
     * @brief POSTs the hex token to /api/admin/push-devices.
     * @param deviceToken Raw APNs token
     * @note Debug builds mark the token as sandbox; Release uses production.
     */
    private func registerDeviceToken(_ deviceToken: Data) {
        guard let url = URL(string: nnaudioPushDevicesURLString) else { return }
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        #if DEBUG
        let sandbox = true
        #else
        let sandbox = false
        #endif

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(nnaudioAppBypassHeaderValue, forHTTPHeaderField: nnaudioAppBypassHeaderName)
        request.setValue(nnaudioAppPushSecret, forHTTPHeaderField: nnaudioAppPushSecretHeaderName)
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "token": hex,
            "sandbox": sandbox
        ])

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                print("Push register failed: \(error.localizedDescription)")
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            print("Push register status: \(status)")
        }.resume()
    }

    /**
     * @brief Shows banners while the app is foregrounded.
     * @param center Notification center
     * @param notification Incoming notification
     * @param completionHandler Presentation options callback
     */
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .list])
        } else {
            completionHandler([.alert, .sound])
        }
    }

    /**
     * @brief Opens the payload path in the WebView when an alert is tapped.
     * @param center Notification center
     * @param response User's response to the notification
     * @param completionHandler Must be called when handling is finished
     */
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if let path = response.notification.request.content.userInfo["path"] as? String {
            AdminPushNavigation.setPath(path)
        }
        completionHandler()
    }

    // MARK: UISceneSession Lifecycle
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    }
}
