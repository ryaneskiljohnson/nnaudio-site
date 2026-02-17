"use client";

import dynamic from "next/dynamic";
import LoadingComponent from "@/components/common/LoadingComponent";

const SupportPageContent = dynamic(() => import("./SupportPageContent"), {
  loading: () => <LoadingComponent fullScreen text="Loading..." />,
});

/**
 * Dashboard support tickets page. Heavy content is code-split so the main dashboard bundle stays smaller.
 * @module app/(private)/(dashboard)/support/page
 */
export default function SupportPage() {
  return <SupportPageContent />;
}
