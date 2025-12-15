export interface Bundle {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  short_description?: string;
  price: number;
  sale_price?: number;
  status: 'draft' | 'active' | 'archived';
  is_featured: boolean;
  featured_image_url?: string;
  logo_url?: string;
  background_image_url?: string;
  background_video_url?: string;
  gallery_images?: Array<{ url: string; alt?: string }>;
  features?: Array<{ title: string; description?: string }>;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  total_value?: number;
  discount_percentage?: number;
}

export interface BundleProduct {
  bundle_id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    sale_price?: number;
    featured_image_url?: string;
  };
}

export interface BundleWithProducts extends Bundle {
  products: Array<{
    id: string;
    name: string;
    slug: string;
    tagline?: string;
    price: number;
    sale_price?: number;
    featured_image_url?: string;
    logo_url?: string;
    category?: string;
    short_description?: string;
    display_order?: number;
  }>;
  totalValue: number;
  pricing: {
    monthly?: { price: number; sale_price?: number };
    annual?: { price: number; sale_price?: number };
    lifetime?: { price: number; sale_price?: number };
  };
  savings: {
    monthly?: { amount: number; percent: number } | null;
    annual?: { amount: number; percent: number } | null;
    lifetime?: { amount: number; percent: number } | null;
  };
}

