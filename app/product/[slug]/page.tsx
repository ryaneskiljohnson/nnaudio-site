/**
 * @fileoverview Server-rendered product route. Cymasphere is a dedicated sales
 * page; other slugs hydrate the existing catalog product UI from SSR data so
 * crawlers do not see an empty "Loading product…" shell.
 * @module app/product/[slug]/page
 */

import { notFound } from "next/navigation";
import { isCymasphereSlug } from "@/lib/cymasphere-sales";
import { getPublicProductBySlug } from "@/utils/products/get-public-product-by-slug";
import CymasphereSalesPage from "./CymasphereSalesPage";
import ProductPageClient from "./ProductPageClient";

/**
 * @brief Loads the public product and renders the matching storefront page.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (isCymasphereSlug(slug)) {
    return <CymasphereSalesPage product={product} />;
  }

  if (!product) {
    notFound();
  }

  return <ProductPageClient key={slug} slug={slug} initialProduct={product} />;
}
