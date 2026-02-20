import UIKit
import WebKit

class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private var loadingIndicator: UIActivityIndicatorView!
    private var refreshButton: UIButton!
    
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
        webView.reload()
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
        view.addSubview(webView)
        
        // Enable debugging output
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
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
        
        let request = URLRequest(url: url)
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
        
        // Only show error if it's not a cancelled load
        if (error as NSError).code != NSURLErrorCancelled {
            showError(message: error.localizedDescription)
        }
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