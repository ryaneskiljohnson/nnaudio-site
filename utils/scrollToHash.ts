/**
 * @fileoverview Ensures in-page anchor links scroll reliably on every click.
 * Fixes Next.js/client-side apps where hash links only work on first navigation.
 * @module utils/scrollToHash
 */

/**
 * @brief Scrolls to the element for an in-page hash and updates the URL.
 * @param href - Link href (e.g. "#pricing", "/#faq", "/#bundles")
 * @param pathname - Current pathname from usePathname() (e.g. "/")
 * @returns true if scroll was performed (caller should preventDefault)
 */
export function scrollToHash(href: string, pathname: string): boolean {
  if (!href || !href.includes("#")) return false;
  const hashIndex = href.indexOf("#");
  const pathPart = href.slice(0, hashIndex).trim() || "/";
  const id = href.slice(hashIndex + 1).trim();
  if (!id) return false;
  const pathNorm = pathPart === "" ? "/" : pathPart;
  const isSamePageHash = pathPart === "" || pathPart === "/";
  if (!isSamePageHash && pathname !== pathNorm) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const newUrl = pathname === "/" ? `/#${id}` : `${pathname}#${id}`;
  window.history.pushState(null, "", newUrl);
  return true;
}
