import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?
    private var lastFcmToken: String?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self

        // Set notification center delegate for foreground notifications
        UNUserNotificationCenter.current().delegate = self

        // Request notification authorization — this shows the iOS permission popup
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            print("[AppDelegate] Notification authorization granted: \(granted)")
            if let error = error {
                print("[AppDelegate] Authorization error: \(error.localizedDescription)")
            }
            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }

        return true
    }

    // MARK: - APNs Token Registration
    // Forward the APNs device token to Firebase so it can generate an FCM token
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        // Also notify Capacitor's push plugin
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[AppDelegate] Failed to register for remote notifications: \(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // MARK: - Firebase Messaging Delegate
    // When Firebase provides an FCM token, bridge it to the webview so JS can send it to the backend
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("[AppDelegate] FCM token received: \(token.prefix(20))...")
        lastFcmToken = token
        dispatchFcmTokenToWebview(token)
    }

    /// Dispatch FCM token to the webview. Retries at 2s, 5s, 10s to handle timing issues.
    private func dispatchFcmTokenToWebview(_ token: String) {
        for delay in [2.0, 5.0, 10.0] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                guard let vc = self?.window?.rootViewController as? CAPBridgeViewController else { return }
                let js = "window.dispatchEvent(new CustomEvent('fcmToken', { detail: '\(token)' }))"
                vc.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    // MARK: - UNUserNotificationCenterDelegate
    // Show notifications even when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .badge, .sound])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // Let Capacitor handle the action
        NotificationCenter.default.post(name: NSNotification.Name("capacitorDidReceiveRemoteNotification"), object: response.notification.request.content.userInfo)
        completionHandler()
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Re-dispatch FCM token when app becomes active (e.g., returning from background)
        if let token = lastFcmToken {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                guard let vc = self?.window?.rootViewController as? CAPBridgeViewController else { return }
                let js = "window.dispatchEvent(new CustomEvent('fcmToken', { detail: '\(token)' }))"
                vc.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
