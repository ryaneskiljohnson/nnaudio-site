import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

type BundleSeoRow = {
  name: string | null;
  tagline: string | null;
  short_description: string | null;
  featured_image_url: string | null;
  status: string | null;
};

async function loadBundleBySlug(slug: string): Promise<BundleSeoRow | null> {
  try {
    const supabase = await createSupabaseServiceRole();
    const { data } = await supabase
      .from("bundles")
      .select("name, tagline, short_description, featured_image_url, status")
      .eq("slug", slug)
      .maybeSingle();
    return (data as BundleSeoRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await loadBundleBySlug(slug);
  if (!bundle || bundle.status !== "active") {
    return { title: "Bundle not found | NNAudio", robots: { index: false } };
  }

  const title = bundle.name || "NNAudio Bundle";
  const description =
    bundle.short_description || bundle.tagline || "NNAudio bundle.";

  return {
    title: `${title} | NNAudio`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(bundle.featured_image_url
        ? { images: [{ url: bundle.featured_image_url }] }
        : {}),
    },
  };
}

export default async function BundleSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await loadBundleBySlug(slug);
  if (!bundle) {
    notFound();
  }
  return children;
}
