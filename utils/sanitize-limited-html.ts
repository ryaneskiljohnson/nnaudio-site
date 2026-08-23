/**
 * @fileoverview Allowlist HTML sanitizer that does not import jsdom or
 * isomorphic-dompurify. Homepage FAQ SSR was 500ing because those packages
 * `require()` an ESM-only encoding module on Node 24.
 * @module utils/sanitize-limited-html
 */

/** Tags FAQ answers may keep. */
const DEFAULT_TAGS = [
  "a",
  "strong",
  "em",
  "br",
  "p",
  "span",
  "ul",
  "ol",
  "li",
] as const;

/** Attributes FAQ links may keep. */
const DEFAULT_ATTRS = ["href", "target", "rel"] as const;

const VOID_TAGS = new Set(["br"]);

/** Tags whose inner text is also dropped (not just the tag). */
const OPAQUE_TAGS = new Set(["script", "style", "iframe", "object", "embed"]);

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\/?>/g;
const ATTR_RE = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const COMMENT_RE = /<!--[\s\S]*?-->/g;

export interface SanitizeLimitedHtmlOptions {
  /** Tag names kept (lowercased). Defaults to the FAQ allowlist. */
  allowedTags?: readonly string[];
  /** Attribute names kept (lowercased). Defaults to href/target/rel. */
  allowedAttrs?: readonly string[];
}

/**
 * @brief True when an href is a same-origin path, hash, or http(s)/mailto.
 * @param href Raw attribute value.
 * @returns False for javascript:, data:, and protocol-relative URLs.
 * @example
 * isSafeHref("/dashboard") // true
 * isSafeHref("javascript:alert(1)") // false
 */
export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("#")) return true;
  const lower = value.toLowerCase();
  return (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("mailto:")
  );
}

/**
 * @brief Keeps only `_self` or `_blank` for target.
 * @param target Raw attribute value.
 * @returns The allowed value, or empty when rejected.
 */
function safeTarget(target: string): string {
  const value = target.trim().toLowerCase();
  return value === "_blank" || value === "_self" ? value : "";
}

/**
 * @brief Keeps only noopener / noreferrer tokens.
 * @param rel Raw attribute value.
 * @returns A space-joined allowlist, or empty.
 */
function safeRel(rel: string): string {
  const kept = rel
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token === "noopener" || token === "noreferrer");
  return [...new Set(kept)].join(" ");
}

/**
 * @brief Rebuilds a tag from allowed attributes only.
 * @param name Lowercased tag name.
 * @param rawAttrs Attribute source string.
 * @param allowedAttrs Attribute allowlist.
 * @param selfClose When true, emit a void tag (`<br>`).
 * @returns Markup, or empty when the tag has no safe form.
 */
function rebuildOpenTag(
  name: string,
  rawAttrs: string,
  allowedAttrs: Set<string>,
  selfClose: boolean
): string {
  const attrs: string[] = [];
  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(rawAttrs))) {
    const key = match[1].toLowerCase();
    if (key.startsWith("on")) continue;
    if (!allowedAttrs.has(key)) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (key === "href") {
      if (!isSafeHref(value)) continue;
      attrs.push(`href="${value.replace(/"/g, "&quot;")}"`);
      continue;
    }
    if (key === "target") {
      const target = safeTarget(value);
      if (target) attrs.push(`target="${target}"`);
      continue;
    }
    if (key === "rel") {
      const rel = safeRel(value);
      if (rel) attrs.push(`rel="${rel}"`);
    }
  }
  const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  return selfClose ? `<${name}${attrStr}>` : `<${name}${attrStr}>`;
}

/**
 * @brief Strips disallowed tags and dangerous attributes without a DOM.
 * FAQ answers only need a handful of inline tags; this keeps SSR off jsdom.
 * @param html Untrusted or CMS/i18n HTML.
 * @param options Optional allowlists; defaults match homepage FAQ.
 * @returns Safe HTML. Unknown tags are dropped; their text is kept.
 * @example
 * sanitizeLimitedHtml('<a href="/x">Go</a><script>alert(1)</script>')
 * // '<a href="/x">Go</a>'
 */
export function sanitizeLimitedHtml(
  html: string,
  options: SanitizeLimitedHtmlOptions = {}
): string {
  if (!html) return "";
  const allowedTags = new Set(
    (options.allowedTags ?? DEFAULT_TAGS).map((tag) => tag.toLowerCase())
  );
  const allowedAttrs = new Set(
    (options.allowedAttrs ?? DEFAULT_ATTRS).map((attr) => attr.toLowerCase())
  );

  const withoutComments = html.replace(COMMENT_RE, "");
  let out = "";
  let last = 0;
  let skipOpaque = 0;
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(withoutComments))) {
    if (skipOpaque === 0) {
      out += withoutComments.slice(last, match.index);
    }
    last = match.index + match[0].length;
    const name = match[1].toLowerCase();
    const closing = match[0].startsWith("</");
    if (OPAQUE_TAGS.has(name)) {
      skipOpaque += closing ? -1 : 1;
      if (skipOpaque < 0) skipOpaque = 0;
      continue;
    }
    if (skipOpaque > 0 || !allowedTags.has(name)) continue;
    if (closing) {
      if (!VOID_TAGS.has(name)) out += `</${name}>`;
      continue;
    }
    out += rebuildOpenTag(name, match[2] ?? "", allowedAttrs, VOID_TAGS.has(name));
  }
  if (skipOpaque === 0) out += withoutComments.slice(last);
  return out;
}
