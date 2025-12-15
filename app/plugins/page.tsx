"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaStar, FaShoppingCart } from "react-icons/fa";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 120px 20px 80px;
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 3rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
`;

const ProductsGrid = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ProductCard = styled(motion.div)`
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
  margin-bottom: 0.5rem;
  line-height: 1.3;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  text-align: center;
`;

const ProductPrice = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #4ecdc4;
  margin-top: 0.5rem;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  text-align: center;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const CartButton = styled(motion.button)`
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
  transition: all 0.3s ease;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.8);
  
  ${ProductCard}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
  }
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(138, 43, 226, 0.6);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    font-size: 1rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.2rem;
`;

export default function PluginsPage() {
  const { addItem } = useCart();
  const { success } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?category=plugin&status=active&limit=100');
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Premium Plugins</Title>
        <Subtitle>Professional-grade tools for modern music production</Subtitle>
      </Header>

      {loading ? (
        <LoadingContainer>Loading plugins...</LoadingContainer>
      ) : (
        <ProductsGrid>
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <Link href={`/product/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%', height: '100%' }}>
                <ProductImageContainer>
                  {product.featured_image_url || product.logo_url ? (
                    <ProductImage
                      src={product.featured_image_url || product.logo_url || ''}
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
                  {product.tagline && (
                    <ProductTagline>{product.tagline}</ProductTagline>
                  )}
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
                    <CartButton
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem({
                          id: product.id,
                          name: product.name,
                          slug: product.slug,
                          price: product.price,
                          sale_price: product.sale_price,
                          featured_image_url: product.featured_image_url,
                          logo_url: product.logo_url,
                        });
                        success(`${product.name} added to cart!`, 3000);
                      }}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <FaShoppingCart />
                    </CartButton>
                  </PriceRow>
                </ProductInfo>
              </Link>
            </ProductCard>
          ))}
        </ProductsGrid>
      )}
    </Container>
  );
}

