"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import LoadingComponent from "@/components/common/LoadingComponent";
import { getSafeRedirectUrl } from "@/utils/redirectValidation";

export default function RootLayout({
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
