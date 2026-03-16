/**
 * @fileoverview Full-screen WKWebView loading the NNAudio admin site; handles loading state and refresh.
 * @note Uses a Safari-like User-Agent and a custom header so Vercel WAF can bypass the app without disabling Attack Challenge Mode.
 */
import UIKit
import WebKit

/// Header sent by the iOS app so Vercel Firewall can bypass Attack Challenge for this client only. Must match the WAF rule value.
private let nnaudioAppBypassHeaderName = "X-NNAudio-App"
private let nnaudioAppBypassHeaderValue = "1"

class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private var loadingIndicator: UIActivityIndicatorView!
    private var refreshButton: UIButton!
    /// True when we triggered a load with the bypass header; avoid cancelling it so we don't get "frame load interrupted".
    private var loadingWithBypassHeader = false
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupWebView()
        setupLoadingIndicator()
        setupRefreshButton()
        loadWebContent()
    }
    
    private func setupNavigationBar() {
        // Hide navigation bar completely
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    private func setupRefreshButton() {
        // Create floating refresh button with dark theme
        refreshButton = UIButton(type: .system)
        refreshButton.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshButton.tintColor = .white
        refreshButton.backgroundColor = UIColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 0.9)
        refreshButton.layer.cornerRadius = 25
        refreshButton.layer.shadowColor = UIColor.black.cgColor
        refreshButton.layer.shadowOffset = CGSize(width: 0, height: 2)
        refreshButton.layer.shadowOpacity = 0.5
        refreshButton.layer.shadowRadius = 6
        refreshButton.addTarget(self, action: #selector(refreshButtonTapped), for: .touchUpInside)
        
        // Add button to view and bring to front
        view.addSubview(refreshButton)
        view.bringSubviewToFront(refreshButton)
        
        // Set up constraints for bottom right position
        refreshButton.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            refreshButton.widthAnchor.constraint(equalToConstant: 50),
            refreshButton.heightAnchor.constraint(equalToConstant: 50),
            refreshButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            refreshButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20)
        ])
    }
    
    @objc private func refreshButtonTapped() {
        print("Refresh button tapped")
        refreshButton.isEnabled = false
        loadWebContent()
    }
    
    private func setupWebView() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.javaScriptEnabled = true
        
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        
        // Use Safari iOS User-Agent so the server doesn't block the WebView (e.g. 403 Forbidden).
        // Default WKWebView UA can be blocked by CDNs/hosts; matching Safari avoids this.
        webView.customUserAgent = safariLikeUserAgent()
        
        view.addSubview(webView)
        
        // Enable debugging output
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
    }
    
    /// Returns a Safari-on-iOS User-Agent so Vercel and other hosts recognize the request as a real browser.
    /// Matches the exact format Safari sends (Version, Safari build, Mobile token).
    /// - Returns: A User-Agent string matching Safari on the current iOS version.
    private func safariLikeUserAgent() -> String {
        let v = ProcessInfo.processInfo.operatingSystemVersion
        let osToken = "\(v.majorVersion)_\(v.minorVersion)_\(v.patchVersion)"
        let versionString = "\(v.majorVersion).\(v.minorVersion).\(v.patchVersion)"
        return "Mozilla/5.0 (iPhone; CPU iPhone OS \(osToken) like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/\(versionString) Mobile/15E148 Safari/605.1.15"
    }
    
    private func setupLoadingIndicator() {
        loadingIndicator = UIActivityIndicatorView(style: .large)
        loadingIndicator.center = view.center
        loadingIndicator.hidesWhenStopped = true
        view.addSubview(loadingIndicator)
    }
    
    private func loadWebContent() {
        let urlString = "https://nnaud.io/admin"
        print("Initial load - Attempting to load URL: \(urlString)")
        
        guard let url = URL(string: urlString) else {
            print("Error: Invalid URL")
            showError(message: "Invalid URL configuration")
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(nnaudioAppBypassHeaderValue, forHTTPHeaderField: nnaudioAppBypassHeaderName)
        loadingWithBypassHeader = true
        webView.load(request)
        loadingIndicator.startAnimating()
    }
    
    private func showError(message: String) {
        print("Error occurred: \(message)")
        
        // Prevent multiple alerts from showing
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Retry", style: .default) { [weak self] _ in
                self?.loadWebContent()
            })
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            
            self.present(alert, animated: true, completion: nil)
        }
    }
    
    // MARK: - WKNavigationDelegate
    
    /// Send the bypass header on every main-frame request (redirects, link clicks). Our own loads are allowed so we don't get "frame load interrupted".
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if loadingWithBypassHeader {
            loadingWithBypassHeader = false
            decisionHandler(.allow)
            return
        }
        let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
        guard isMainFrame,
              let url = navigationAction.request.url,
              url.host?.lowercased().hasSuffix("nnaud.io") == true else {
            decisionHandler(.allow)
            return
        }
        if navigationAction.request.value(forHTTPHeaderField: nnaudioAppBypassHeaderName) != nil {
            decisionHandler(.allow)
            return
        }
        decisionHandler(.cancel)
        var request = URLRequest(url: url)
        request.setValue(nnaudioAppBypassHeaderValue, forHTTPHeaderField: nnaudioAppBypassHeaderName)
        loadingWithBypassHeader = true
        webView.load(request)
    }
    
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        print("Started loading...")
        loadingIndicator.startAnimating()
        refreshButton.isEnabled = false
        refreshButton.alpha = 0.5
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("Finished loading successfully")
        loadingIndicator.stopAnimating()
        refreshButton.isEnabled = true
        refreshButton.alpha = 1.0
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("Navigation failed with error: \(error.localizedDescription)")
        loadingIndicator.stopAnimating()
        refreshButton.isEnabled = true
        refreshButton.alpha = 1.0
        showError(message: error.localizedDescription)
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("Provisional navigation failed with error: \(error.localizedDescription)")
        loadingIndicator.stopAnimating()
        refreshButton.isEnabled = true
        refreshButton.alpha = 1.0
        
        // Don't show alert for cancelled or interrupted loads (we cancel to re-load with bypass header).
        let nsErr = error as NSError
        if nsErr.code == NSURLErrorCancelled { return }
        if nsErr.domain == "WebKitErrorDomain" && nsErr.code == 102 { return } // Frame load interrupted
        if error.localizedDescription.lowercased().contains("interrupted") { return }
        showError(message: error.localizedDescription)
    }
}

// MARK: - WKURLSchemeHandler
extension WebViewController: WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        // Handle custom URL scheme if needed
    }
    
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Handle stopping custom URL scheme task if needed
    }
} 