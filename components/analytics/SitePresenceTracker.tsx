"use client";

/**
 * @fileoverview Anonymous heartbeat that tells admins how many people are on the site.
 * Uses a localStorage visitor id so multiple tabs in one browser count as one person.
 * @module components/analytics/SitePresenceTracker
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  PRESENCE_VISITOR_STORAGE_KEY,
} from "@/utils/presence";

/**
 * @brief Reads or creates a stable visitor UUID in localStorage (sessionStorage fallback).
 */
function getOrCreateVisitorId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stores: Storage[] = [];
  try {
    stores.push(window.localStorage);
  } catch {
    /* private mode */
  }
  try {
    stores.push(window.sessionStorage);
  } catch {
    /* private mode */
  }

  for (const store of stores) {
    const existing = store.getItem(PRESENCE_VISITOR_STORAGE_KEY);
    if (existing) {
      return existing;
    }
  }

  const visitorId = crypto.randomUUID();
  for (const store of stores) {
    try {
      store.setItem(PRESENCE_VISITOR_STORAGE_KEY, visitorId);
      return visitorId;
    } catch {
      /* quota / denied */
    }
  }

  return visitorId;
}

/**
 * @brief Sends a presence heartbeat or leave signal. keepalive survives page unloads.
 */
function sendPresence(visitorId: string, path: string, left = false): void {
  void fetch("/api/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, path, left }),
    keepalive: true,
  }).catch(() => {
    /* presence is best-effort */
  });
}

/**
 * @brief Mounts a site-wide presence heartbeat. Renders nothing.
 */
export default function SitePresenceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) {
      return;
    }

    const path = pathname || "/";
    sendPresence(visitorId, path);

    const intervalId = window.setInterval(() => {
      sendPresence(visitorId, path);
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        return;
      }
      sendPresence(visitorId, path, true);
    };

    const handlePageShow = () => {
      sendPresence(visitorId, path);
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [pathname]);

  return null;
}
