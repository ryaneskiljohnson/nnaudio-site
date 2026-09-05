/**
 * @fileoverview Scene window setup and cold-start notification tap handling.
 * @module SceneDelegate
 */
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    /**
     * @brief Creates the admin WebView window and applies a launch notification path.
     * @param scene Connecting scene
     * @param session Scene session
     * @param connectionOptions May include a notification response from a cold start
     */
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        if let path = connectionOptions.notificationResponse?.notification.request.content.userInfo["path"] as? String {
            AdminPushNavigation.setPath(path)
        }

        let window = UIWindow(windowScene: windowScene)
        let viewController = WebViewController()
        let navigationController = UINavigationController(rootViewController: viewController)
        window.rootViewController = navigationController
        self.window = window
        window.makeKeyAndVisible()
    }

    func sceneDidDisconnect(_ scene: UIScene) {}
    func sceneDidBecomeActive(_ scene: UIScene) {}
    func sceneWillResignActive(_ scene: UIScene) {}
    func sceneWillEnterForeground(_ scene: UIScene) {}
    func sceneDidEnterBackground(_ scene: UIScene) {}
}
