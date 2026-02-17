"use client";

import dynamic from "next/dynamic";
import LoadingComponent from "@/components/common/LoadingComponent";

const EditTemplatePageContent = dynamic(
  () => import("./EditTemplatePageContent"),
  {
    loading: () => <LoadingComponent fullScreen text="Loading..." />,
  }
);

/**
 * Admin email template edit page. Heavy content is code-split so the main admin bundle stays smaller.
 * @module app/(private)/(admin)/admin/email-campaigns/templates/edit/[id]/page
 */
export default function EditTemplatePage() {
  return <EditTemplatePageContent />;
}
