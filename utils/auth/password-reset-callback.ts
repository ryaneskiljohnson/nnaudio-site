/**
 * @fileoverview Pure helpers for password-reset email callbacks (query + hash).
 * @module utils/auth/password-reset-callback
 */

export type PasswordResetCallback =
  | { kind: "error"; message: string }
  | { kind: "pkce"; code: string }
  | {
      kind: "hash-session";
      accessToken: string;
      refreshToken: string;
      type: string | null;
    }
  | { kind: "none" };

const EXPIRED_LINK_MESSAGE =
  "The password reset link is invalid or has expired. Please request a new one.";

/**
 * @brief Parses a URL hash fragment into query-style parameters.
 * @param hash Raw `location.hash`, with or without a leading `#`.
 */
export function parseAuthHash(hash: string): URLSearchParams {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(trimmed);
}

/**
 * @brief True when the callback type should show the set-password form.
 */
export function isPasswordSetCallbackType(type: string | null): boolean {
  return type === "recovery" || type === "invite";
}

function firstParam(
  query: Pick<URLSearchParams, "get">,
  hashParams: URLSearchParams,
  key: string
): string | null {
  return query.get(key) || hashParams.get(key);
}

function humanizeErrorDescription(description: string): string {
  return description.replace(/\+/g, " ").trim();
}

/**
 * @brief Classifies a password-reset landing URL (query string + hash fragment).
 * @param searchParams Query parameters from the current URL.
 * @param hash `window.location.hash` (may be empty).
 * @returns Discriminated callback kind for the reset-password page to handle.
 *
 * @note Errors win over tokens so a failed Supabase redirect is not treated as
 * a valid PKCE/implicit callback. Hash session tokens are accepted for both
 * `recovery` and `invite` (the page previously ignored `type=recovery`).
 */
export function inspectPasswordResetCallback(
  searchParams: Pick<URLSearchParams, "get">,
  hash: string
): PasswordResetCallback {
  const hashParams = parseAuthHash(hash);
  const error = firstParam(searchParams, hashParams, "error");
  const errorCode = firstParam(searchParams, hashParams, "error_code");
  const errorDescription = firstParam(
    searchParams,
    hashParams,
    "error_description"
  );

  if (
    error === "access_denied" ||
    error === "invalid_link" ||
    errorCode === "otp_expired" ||
    errorCode === "otp_disabled"
  ) {
    return { kind: "error", message: EXPIRED_LINK_MESSAGE };
  }

  if (error || errorCode) {
    return {
      kind: "error",
      message: errorDescription
        ? humanizeErrorDescription(errorDescription)
        : EXPIRED_LINK_MESSAGE,
    };
  }

  const code = searchParams.get("code");
  if (code) {
    return { kind: "pkce", code };
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    return {
      kind: "hash-session",
      accessToken,
      refreshToken,
      type: hashParams.get("type"),
    };
  }

  return { kind: "none" };
}
