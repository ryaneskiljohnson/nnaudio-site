"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";

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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-10px);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(138, 43, 226, 0.5);
    box-shadow: 0 20px 40px rgba(138, 43, 226, 0.2);
  }
`;

const ProductImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 200px;
  background: #1a1a1a;
  overflow: hidden;
`;

const ProductInfo = styled.div`
  padding: 1.5rem;
`;

const ProductName = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: white;
`;

const ProductTagline = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
  line-height: 1.4;
`;

const ProductPrice = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #8a2be2;
  margin-top: 1rem;
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
            <Link key={product.id} href={`/product/${product.slug}`}>
              <ProductCard
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <ProductImageContainer>
                  {product.featured_image_url || product.logo_url ? (
                    <Image
                      src={product.featured_image_url || product.logo_url || ''}
                      alt={product.name}
                      fill
                      style={{ objectFit: 'contain', padding: '20px' }}
                    />
                  ) : null}
                </ProductImageContainer>
                
                <ProductInfo>
                  <ProductName>{product.name}</ProductName>
                  {product.tagline && (
                    <ProductTagline>{product.tagline}</ProductTagline>
                  )}
                  <ProductPrice>
                    {product.sale_price ? (
                      <>
                        <span style={{ textDecoration: 'line-through', fontSize: '1rem', opacity: 0.6, marginRight: '8px' }}>
                          ${product.price}
                        </span>
                        ${product.sale_price}
                      </>
                    ) : (
                      `$${product.price}`
                    )}
                  </ProductPrice>
                </ProductInfo>
              </ProductCard>
            </Link>
          ))}
        </ProductsGrid>
      )}
    </Container>
  );
}

