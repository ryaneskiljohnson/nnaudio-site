"use client";

/**
 * @fileoverview Polls the admin presence API while the tab is visible.
 * @module hooks/useLiveVisitorCount
 */

import { useCallback, useEffect, useState } from "react";
import {
  PRESENCE_ADMIN_POLL_INTERVAL_MS,
  type AdminPresenceResponse,
} from "@/utils/presence";

export type LiveVisitorSnapshot = AdminPresenceResponse;

/**
 * @brief Fetches the live on-site visitor count on an interval.
 * @param enabled - When false, does not poll (e.g. user is not admin yet).
 */
export function useLiveVisitorCount(enabled = true): {
  snapshot: LiveVisitorSnapshot | null;
  loading: boolean;
} {
  const [snapshot, setSnapshot] = useState<LiveVisitorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/admin/presence", { signal });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as LiveVisitorSnapshot;
      if (typeof data.count === "number") {
        setSnapshot({
          count: data.count,
          pages: Array.isArray(data.pages) ? data.pages : [],
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    void fetchCount(controller.signal);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void fetchCount();
    }, PRESENCE_ADMIN_POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, fetchCount]);

  return { snapshot, loading };
}
