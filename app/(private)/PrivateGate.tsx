"use client";

/**
 * @fileoverview Client auth gate for /dashboard, /admin, and other private
 * routes. Redirects anonymous visitors to login.
 * @module app/(private)/PrivateGate
 */

import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import LoadingComponent from "@/components/common/LoadingComponent";
import { getSafeRedirectUrl } from "@/utils/redirectValidation";

/**
 * @brief Blocks private pages until AuthContext has a signed-in user.
 * @param children Protected route tree.
 * @returns Children for an authenticated session, otherwise a loading screen
 * while redirecting to /login.
 */
export default function PrivateGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth.user && !auth.loading) {
      const safeRedirect = getSafeRedirectUrl(pathname ?? "");
      const redirectParam = safeRedirect
        ? encodeURIComponent(safeRedirect)
        : "";
      router.push(redirectParam ? `/login?redirect=${redirectParam}` : "/login");
    }
  }, [auth.user, router, auth.loading, pathname]);

  if (!auth.user || auth.loading) {
    return <LoadingComponent fullScreen text="Loading..." />;
  }

  return <>{children}</>;
}
