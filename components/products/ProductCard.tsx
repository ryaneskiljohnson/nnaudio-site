"use client";

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaShoppingCart } from "react-icons/fa";
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

export default function ProductCard({ product, index = 0, showCartButton = true }: ProductCardProps) {
  const { addItem } = useCart();
  const { success } = useToast();

  // Handle both API product format and landing page format
  const imageUrl = product.featured_image_url || product.logo_url || product.image || '';
  const displayPrice = product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;
  // Card views should ONLY use tagline or short_description, never the full description
  // Clean HTML entities and truncate to 100 characters max for card display
  const rawTagline = product.tagline || product.short_description || '';
  const cleanedTagline = cleanHtmlText(rawTagline);
  const tagline = cleanedTagline.length > 100 ? cleanedTagline.substring(0, 100).trim() + '...' : cleanedTagline;

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
        href={product.slug ? `/product/${product.slug}` : '#'} 
        style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%', height: '100%' }}
      >
        <ProductImageContainer>
          {imageUrl ? (
            <ProductImage
              src={imageUrl}
              alt={product.name}
              fill
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              color: 'rgba(255, 255, 255, 0.3)',
              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(75, 0, 130, 0.2))'
            }}>
              {product.name[0]}
            </div>
          )}
        </ProductImageContainer>
        
        <ProductInfo>
          <ProductName>{product.name}</ProductName>
          <ProductTagline>
            {tagline || getDefaultSubtitle(product.name, product.category)}
          </ProductTagline>
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
              ) : product.price === 0 || product.price === null ? (
                'FREE'
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
        </ProductInfo>
      </Link>
    </ProductCardContainer>
  );
}

