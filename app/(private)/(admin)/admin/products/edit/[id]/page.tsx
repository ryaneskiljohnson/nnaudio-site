"use client";

import dynamic from "next/dynamic";
import LoadingComponent from "@/components/common/LoadingComponent";

const EditProductPageContent = dynamic(
  () => import("./EditProductPageContent"),
  {
    loading: () => <LoadingComponent fullScreen text="Loading..." />,
  }
);

/**
 * Admin product edit page. Heavy content is code-split so the main admin bundle stays smaller.
 * @module app/(private)/(admin)/admin/products/edit/[id]/page
 */
export default function EditProductPage() {
  return <EditProductPageContent />;
}
