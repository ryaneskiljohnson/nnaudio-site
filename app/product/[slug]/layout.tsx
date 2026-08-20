import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CYMASPHERE_META, isCymasphereSlug } from "@/lib/cymasphere-sales";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

type ProductSeoRow = {
  name: string | null;
  meta_title: string | null;
  meta_description: string | null;
  short_description: string | null;
  tagline: string | null;
  featured_image_url: string | null;
  status: string | null;
};

async function loadProductBySlug(slug: string): Promise<ProductSeoRow | null> {
  const supabase = await createSupabaseServiceRole();
  const { data } = await supabase
    .from("products")
    .select(
      "name, meta_title, meta_description, short_description, tagline, featured_image_url, status"
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as ProductSeoRow | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProductBySlug(slug);
  if (!product || product.status !== "active") {
    return { title: "Product not found | NNAudio", robots: { index: false } };
  }

  const title = isCymasphereSlug(slug)
    ? CYMASPHERE_META.title
    : product.meta_title || product.name || "NNAudio";
  const description = isCymasphereSlug(slug)
    ? CYMASPHERE_META.description
    : product.meta_description ||
      product.short_description ||
      product.tagline ||
      "NNAudio plugins, packs, and tools.";

  return {
    title: `${title} | NNAudio`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(product.featured_image_url
        ? { images: [{ url: product.featured_image_url }] }
        : {}),
    },
  };
}

export default async function ProductSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProductBySlug(slug);
  if (!product) {
    notFound();
  }
  return children;
}
