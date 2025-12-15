"use client";

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";

const SectionContainer = styled.section`
  padding: 100px 20px;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  position: relative;
  
  &:nth-child(even) {
    background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 50%, #1a1a2e 100%);
  }
`;

const ContentContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 3rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SectionSubtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  margin-bottom: 4rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ProductCard = styled(motion.div)<{ $bgImage?: string }>`
  background: ${props => props.$bgImage 
    ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%), url(${props.$bgImage})`
    : 'rgba(255, 255, 255, 0.05)'};
  background-size: cover;
  background-position: center;
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  position: relative;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%);
    z-index: 1;
    pointer-events: none;
  }
  
  &:hover {
    transform: translateY(-10px);
    border-color: rgba(138, 43, 226, 0.5);
    box-shadow: 0 20px 40px rgba(138, 43, 226, 0.3);
    
    &::before {
      background: linear-gradient(180deg, transparent 0%, rgba(138, 43, 226, 0.3) 100%);
    }
  }
`;

const ProductImage = styled.div`
  position: relative;
  width: 100%;
  padding-top: 60%; // Adjusted aspect ratio
  background: transparent;
  overflow: hidden;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    object-fit: contain;
    padding: 30px;
    max-width: 80%;
    max-height: 100%;
  }
`;

const ProductInfo = styled.div`
  padding: 1.5rem;
  position: relative;
  z-index: 2;
  margin-top: auto;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 100%);
`;

const ProductName = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: white;
`;

const ProductDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 1rem;
`;

const ProductPrice = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #8a2be2;
  margin-top: 1rem;
`;

const BuyButton = styled(motion.button)`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  width: 100%;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(138, 43, 226, 0.4);
  }
`;

interface Product {
  id: number;
  name: string;
  description: string;
  image: string;
  backgroundImage?: string;
  price: string;
}

interface ProductsSectionProps {
  title: string;
  subtitle: string;
  products: Product[];
  id: string;
}

const ProductsSection: React.FC<ProductsSectionProps> = ({ title, subtitle, products, id }) => {
  return (
    <SectionContainer id={id}>
      <ContentContainer>
        <SectionTitle
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {title}
        </SectionTitle>
        
        <SectionSubtitle
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {subtitle}
        </SectionSubtitle>

        <ProductsGrid>
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              $bgImage={product.backgroundImage}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <ProductImage>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </ProductImage>
              <ProductInfo>
                <ProductName>{product.name}</ProductName>
                <ProductDescription>{product.description}</ProductDescription>
                <ProductPrice>{product.price}</ProductPrice>
                <BuyButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View Details
                </BuyButton>
              </ProductInfo>
            </ProductCard>
          ))}
        </ProductsGrid>
      </ContentContainer>
    </SectionContainer>
  );
};

export default ProductsSection;

