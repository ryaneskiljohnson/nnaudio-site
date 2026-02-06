/**
 * @fileoverview Server action to fetch related products based on category, keywords, and tags
 * @module app/actions/related-products
 * 
 * @brief Finds products related to a given product by analyzing:
 * - Same or similar category
 * - Matching keywords in meta_keywords
 * - Similar price range
 * - Excludes the current product
 * 
 * @returns Array of related products with their basic details
 */

'use server';

import { createClient } from '@/utils/supabase/server';

export interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  featured_image_url: string | null;
  logo_url: string | null;
  tagline: string | null;
  category: string;
  average_rating: number | null;
  review_count: number | null;
}

/**
 * @brief Fetches products related to the given product
 * 
 * @param productId - ID of the current product
 * @param category - Category of the current product
 * @param keywords - Comma-separated keywords from the product
 * @param limit - Maximum number of related products to return (default: 8)
 * 
 * @returns Object with success status and array of related products
 * 
 * @example
 * const related = await getRelatedProducts('product-id', 'instrument-plugin', 'synth, bass, analog', 6);
 */
export async function getRelatedProducts(
  productId: string,
  category: string,
  keywords: string | null = null,
  limit: number = 8
): Promise<{ success: boolean; products: RelatedProduct[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Parse keywords into array
    const keywordArray = keywords 
      ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
      : [];
    
    // Build the query (use type assertion - products table columns may not match generated types)
    let query = (supabase as any)
      .from('products')
      .select(`
        id,
        name,
        slug,
        price,
        sale_price,
        featured_image_url,
        logo_url,
        tagline,
        category,
        meta_keywords,
        average_rating,
        review_count
      `)
      .neq('id', productId) // Exclude current product
      .eq('status', 'active') // Only active products
      .order('average_rating', { ascending: false, nullsLast: true });
    
    // Prioritize same category
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: sameCategory, error: sameCategoryError } = await query.limit(limit * 2);
    
    if (sameCategoryError) {
      console.error('Error fetching same category products:', sameCategoryError);
    }
    
    // If we don't have enough from same category, get from other categories
    let allRelated = sameCategory || [];
    
    if (allRelated.length < limit) {
      const { data: otherProducts, error: otherError } = await (supabase as any)
        .from('products')
        .select(`
          id,
          name,
          slug,
          price,
          sale_price,
          featured_image_url,
          logo_url,
          tagline,
          category,
          meta_keywords,
          average_rating,
          review_count
        `)
        .neq('id', productId)
        .neq('category', category || '')
        .eq('status', 'active')
        .order('average_rating', { ascending: false, nullsLast: true })
        .limit(limit * 2);
      
      if (!otherError && otherProducts) {
        allRelated = [...allRelated, ...otherProducts];
      }
    }
    
    // Score and sort products by relevance
    const scoredProducts = (allRelated as Array<Record<string, unknown>>).map((product: Record<string, unknown>) => {
      let score = 0;
      
      // Same category gets high score
      if (product.category === category) {
        score += 10;
      }
      
      // Matching keywords
      const metaKeywords = product.meta_keywords as string | null | undefined;
      if (keywordArray.length > 0 && metaKeywords) {
        const productKeywords = metaKeywords
          .toLowerCase()
          .split(',')
          .map((k: string) => k.trim());
        
        const matchCount = keywordArray.filter(kw => 
          productKeywords.some((pk: string) => pk.includes(kw) || kw.includes(pk))
        ).length;
        
        score += matchCount * 5;
      }
      
      // Boost products with good ratings
      const avgRating = product.average_rating as number | null | undefined;
      if (avgRating != null && avgRating >= 4) {
        score += 2;
      }
      
      // Boost products with reviews
      const revCount = product.review_count as number | null | undefined;
      if (revCount != null && revCount > 0) {
        score += 1;
      }
      
      return {
        ...(product as object),
        relevanceScore: score
      };
    });
    
    // Sort by relevance score, then by rating
    scoredProducts.sort((a: { relevanceScore: number; average_rating?: number }, b: { relevanceScore: number; average_rating?: number }) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return ((b.average_rating as number) || 0) - ((a.average_rating as number) || 0);
    });
    
    // Take top products
    const relatedProducts = scoredProducts
      .slice(0, limit)
      .map(({ relevanceScore, ...product }: { relevanceScore: number; [k: string]: unknown }) => product as unknown as RelatedProduct);
    
    return {
      success: true,
      products: relatedProducts
    };
    
  } catch (error) {
    console.error('Error in getRelatedProducts:', error);
    return {
      success: false,
      products: [],
      error: error instanceof Error ? error.message : 'Failed to fetch related products'
    };
  }
}
