"use client";

import React, { memo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaShoppingCart, FaArrowRight } from "react-icons/fa";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { cleanHtmlText } from "@/utils/stringUtils";

const ProductCardContainer = styled(motion.div)`
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 420px;
  
  &:hover {
    transform: translateY(-10px);
    border-color: rgba(138, 43, 226, 0.5);
    box-shadow: 0 20px 40px rgba(138, 43, 226, 0.2);
  }
`;

const ProductImageContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #1a1a1a;
  overflow: hidden;
  flex-shrink: 0;
`;

const ProductImage = styled(Image)`
  object-fit: cover;
`;

const ProductInfo = styled.div`
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
`;

const ProductName = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  text-align: center;
`;

const ProductTagline = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.25rem;
  line-height: 1.3;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  text-align: center;
`;

const PluginType = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #ff8c42;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
  text-align: center;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
`;

const ProductPrice = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #4ecdc4;
  margin-top: 0.25rem;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  text-align: center;
  width: 100%;
  flex: 1;
`;

const PriceRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.5rem;
  width: 100%;
`;

const CartButton = styled(motion.button)`
  position: absolute;
  right: 0;
  top: 50%;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
  transition: opacity 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) scale(0.8);
  
  ${ProductCardContainer}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(-50%) scale(1);
  }
  
  &:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 6px 20px rgba(138, 43, 226, 0.6);
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
  
  svg {
    font-size: 1rem;
  }
`;

const ViewPricingButton = styled(motion.button)`
  width: 100%;
  padding: 12px 24px;
  border-radius: 50px;
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
  transition: all 0.3s ease;
  margin-top: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 99, 255, 0.5);
    background: linear-gradient(135deg, #7c73ff, #9a3bf2);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    font-size: 0.9rem;
  }
`;

interface ProductCardProps {
  product: {
    id: string | number;
    name: string;
    slug?: string;
    tagline?: string;
    short_description?: string;
    description?: string; // Full description - NOT used in cards, only for product pages
    category?: string; // Used for fallback subtitle generation
    price: number;
    sale_price?: number | null;
    featured_image_url?: string | null;
    logo_url?: string | null;
    // For landing page compatibility
    image?: string;
  };
  index?: number;
  showCartButton?: boolean;
  showPluginType?: boolean; // Show plugin type label (default: true)
}

// Generate a default subtitle based on product name and category
function getDefaultSubtitle(name: string, category?: string): string {
  const categoryMap: Record<string, string> = {
    plugin: 'Professional music production plugin',
    pack: 'Curated collection of sounds and samples',
    bundle: 'Complete bundle of premium products',
    preset: 'Ready-to-use presets',
    template: 'Production template',
  };
  
  const categoryText = category ? categoryMap[category] || 'Premium product' : 'Premium product';
  return categoryText;
}

function ProductCard({ product, index = 0, showCartButton = true, showPluginType = true }: ProductCardProps) {
  const { addItem } = useCart();
  const { success } = useToast();
  const router = useRouter();
  const [imageError, setImageError] = React.useState(false);

  // NNAudio logo fallback
  const NNAUDIO_LOGO = '/images/nnaud-io/NNPurp1.png';

  // Handle both API product format and landing page format
  // Check for truthy values (not null, undefined, or empty string)
  const featuredImg = product.featured_image_url?.trim() || null;
  const logoImg = product.logo_url?.trim() || null;
  const imageImg = product.image?.trim() || null;
  const primaryImageUrl = featuredImg || logoImg || imageImg;
  const shouldUseLogo = imageError || !primaryImageUrl;
  const displayPrice = product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;
  // Card views should ONLY use tagline or short_description, never the full description
  // Clean HTML entities and truncate to 100 characters max for card display
  const rawTagline = product.tagline || product.short_description || '';
  const cleanedTagline = cleanHtmlText(rawTagline);
  const tagline = cleanedTagline.length > 100 ? cleanedTagline.substring(0, 100).trim() + '...' : cleanedTagline;
  
  // Check if this is an elite bundle and get the correct slug
  const getEliteBundleSlug = (name: string, slug?: string): string | null => {
    // First check slug directly (most reliable)
    if (slug) {
      const lowerSlug = slug.toLowerCase();
      if (lowerSlug === 'producers-arsenal' || lowerSlug === 'ultimate-bundle' || lowerSlug === 'beat-lab') {
        return lowerSlug;
      }
    }
    
    // Fallback to checking name
    const lowerName = name.toLowerCase();
    if (lowerName.includes("producer's") || lowerName.includes('producers')) {
      return 'producers-arsenal';
    }
    if (lowerName.includes('ultimate')) {
      return 'ultimate-bundle';
    }
    if (lowerName.includes('beat lab')) {
      return 'beat-lab';
    }
    return null;
  };
  
  const bundleSlug = getEliteBundleSlug(product.name, product.slug);
  const isEliteBundle = bundleSlug !== null;
  
  // Determine the correct route - elite bundles go to bundle pages
  const productUrl = product.slug 
    ? (isEliteBundle ? `/bundles/${bundleSlug}` : `/product/${product.slug}`)
    : '#';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: String(product.id),
      name: product.name,
      slug: product.slug || '',
      price: product.price,
      sale_price: product.sale_price || undefined,
      featured_image_url: product.featured_image_url || undefined,
      logo_url: product.logo_url || undefined,
    });
    success(`${product.name} added to cart!`, 3000);
  };

  return (
    <ProductCardContainer
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link 
        href={productUrl} 
        style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%', height: '100%' }}
      >
        <ProductImageContainer>
          {shouldUseLogo ? (
            // Use regular img tag for logo to avoid Next.js placeholder
            <img
              src={NNAUDIO_LOGO}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <ProductImage
              src={primaryImageUrl}
              alt={product.name}
              fill
              style={{ objectFit: 'cover' }}
              onError={() => {
                // If image fails to load, use NNAudio logo
                if (!imageError) {
                  setImageError(true);
                }
              }}
            />
          )}
        </ProductImageContainer>
        
        <ProductInfo>
          <ProductName>{product.name}</ProductName>
          <ProductTagline>
            {tagline || getDefaultSubtitle(product.name, product.category)}
          </ProductTagline>
          {showPluginType && product.category === 'instrument-plugin' && (
            <PluginType>Instrument</PluginType>
          )}
          {showPluginType && product.category === 'audio-fx-plugin' && (
            <PluginType>Audio FX</PluginType>
          )}
          {isEliteBundle ? (
            <ViewPricingButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/bundles/${bundleSlug}`);
              }}
            >
              View Pricing
              <FaArrowRight />
            </ViewPricingButton>
          ) : (
          <PriceRow>
            <ProductPrice>
              {product.sale_price && product.sale_price > 0 ? (
                <>
                  <span style={{ 
                    textDecoration: 'line-through', 
                    fontSize: '1rem', 
                    opacity: 0.6, 
                    marginRight: '8px',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    ${product.price}
                  </span>
                  ${product.sale_price}
                </>
              ) : (product.price === 0 || product.sale_price === 0 || (product.sale_price === null && product.price === 0)) ? (
                <>
                  {(product.sale_price === 0 && product.price > 0) && (
                    <span style={{ 
                      textDecoration: 'line-through', 
                      fontSize: '1rem', 
                      opacity: 0.6, 
                      marginRight: '8px',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      ${product.price}
                    </span>
                  )}
                  FREE
                </>
              ) : (
                `$${product.price}`
              )}
            </ProductPrice>
            {showCartButton && (
              <CartButton
                onClick={handleAddToCart}
                aria-label={`Add ${product.name} to cart`}
              >
                <FaShoppingCart />
              </CartButton>
            )}
          </PriceRow>
          )}
        </ProductInfo>
      </Link>
    </ProductCardContainer>
  );
}

export default memo(ProductCard);

