/**
 * Validates that a redirect URL is safe and local to prevent open redirect attacks
 * @param redirectUrl - The URL to validate
 * @returns boolean - true if the URL is safe to redirect to
 */
export function isValidLocalRedirect(redirectUrl: string): boolean {
  if (!redirectUrl || typeof redirectUrl !== "string") {
    return false;
  }

  // Decode the URL to catch encoded attacks
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(redirectUrl);
  } catch {
    // If decoding fails, it's likely malformed
    return false;
  }

  // Reject control characters (CR/LF/NUL/etc.) BEFORE trimming, so header
  // injection / smuggling payloads like "/path%0d%0aLocation:..." are rejected
  // rather than silently normalized.
  if (/[\u0000-\u001F\u007F]/.test(decodedUrl)) {
    return false;
  }

  // The decoded value must not contain leading/trailing whitespace (a trim
  // asymmetry between validation and return would otherwise let " /evil" pass).
  if (decodedUrl !== decodedUrl.trim()) {
    return false;
  }

  // Must start with a single forward slash (local path)
  if (!decodedUrl.startsWith("/")) {
    return false;
  }

  // Must NOT start with double slash (protocol-relative URL)
  if (decodedUrl.startsWith("//")) {
    return false;
  }

  // Must NOT start with backslash variations
  if (decodedUrl.startsWith("\\") || decodedUrl.includes("\\\\")) {
    return false;
  }

  // Check for protocol schemes that could be dangerous
  const protocolPattern = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
  if (protocolPattern.test(decodedUrl)) {
    return false;
  }

  // Check for common attack patterns
  const dangerousPatterns = [
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /file:/i,
    /ftp:/i,
    /mailto:/i,
    /tel:/i,
    /%2F%2F/i, // Encoded //
    /%5C%5C/i, // Encoded \\
    /\s*javascript:/i, // With whitespace
  ];

  if (dangerousPatterns.some((pattern) => pattern.test(decodedUrl))) {
    return false;
  }

  // Additional check: make sure it's a valid pathname
  try {
    const url = new URL(decodedUrl, "http://localhost");
    // Should be same origin after parsing
    if (url.hostname !== "localhost" || url.protocol !== "http:") {
      return false;
    }
  } catch {
    // If URL parsing fails with localhost base, it's likely invalid
    return false;
  }

  return true;
}

/**
 * Safely gets a redirect URL, returning null if invalid
 * @param redirectUrl - The URL to validate and return
 * @returns string | null - The validated URL or null if invalid
 */
export function getSafeRedirectUrl(redirectUrl: string | null): string | null {
  if (!redirectUrl || !isValidLocalRedirect(redirectUrl)) {
    return null;
  }

  // Return the normalized (decoded + trimmed) value that passed validation.
  return decodeURIComponent(redirectUrl).trim();
}
