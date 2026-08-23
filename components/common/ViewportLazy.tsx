"use client";

/**
 * @fileoverview Defers mounting a below-fold subtree until it nears the
 * viewport so the homepage does not download spotlight/FAQ/pricing JS
 * during first paint.
 * @module components/common/ViewportLazy
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ViewportLazyProps {
  /** Section to mount once the sentinel is near the viewport. */
  children: ReactNode;
  /** Reserved height so late mount does not collapse the page. */
  minHeight?: number | string;
  /**
   * IntersectionObserver rootMargin. Positive values start the load
   * before the section is on screen.
   */
  rootMargin?: string;
}

/**
 * @brief Mounts children on first intersection (or immediately if IO is
 * unavailable).
 * @param children Deferred subtree.
 * @param minHeight Optional reserved slot height.
 * @param rootMargin Observer prefetch margin. Defaults to 240px.
 * @returns A slot that fills with children once visible.
 * @example
 * <ViewportLazy minHeight={600}>
 *   <FAQSection />
 * </ViewportLazy>
 */
export default function ViewportLazy({
  children,
  minHeight,
  rootMargin = "240px 0px",
}: ViewportLazyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown, rootMargin]);

  return (
    <div ref={ref} style={minHeight != null ? { minHeight } : undefined}>
      {shown ? children : null}
    </div>
  );
}
