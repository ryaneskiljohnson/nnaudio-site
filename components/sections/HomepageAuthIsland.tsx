"use client";

/**
 * @fileoverview AuthProvider island for homepage pricing. Kept in its own
 * module so HomeBelowFold can dynamic-import it only when pricing is near
 * the viewport.
 * @module components/sections/HomepageAuthIsland
 */

import { AuthProvider } from "@/contexts/AuthContext";

/**
 * @brief Wraps pricing (and any future auth-aware homepage section).
 * @param children Tree that calls useAuth().
 * @returns Children inside AuthProvider.
 */
export default function HomepageAuthIsland({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
