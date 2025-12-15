"use client";

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";

const SectionContainer = styled.section`
  padding: 120px 20px;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  position: relative;
  overflow: hidden;
`;

const ContentContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 3.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const FeaturedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 3rem;
  margin-top: 4rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const FeaturedCard = styled(motion.div)<{ $bgImage?: string }>`
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  min-height: 500px;
  background: ${props => props.$bgImage 
    ? `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%), url(${props.$bgImage})`
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'};
  background-size: cover;
  background-position: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(138, 43, 226, 0.2) 50%, rgba(0,0,0,0.9) 100%);
    z-index: 1;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-15px);
    border-color: rgba(138, 43, 226, 0.6);
    box-shadow: 0 30px 60px rgba(138, 43, 226, 0.3);
    
    &::before {
      background: linear-gradient(180deg, transparent 0%, rgba(138, 43, 226, 0.4) 50%, rgba(0,0,0,0.95) 100%);
    }
  }
`;

const CardContent = styled.div`
  padding: 2.5rem;
  position: relative;
  z-index: 2;
`;

const ProductLogo = styled.div`
  position: relative;
  width: 100%;
  max-width: 300px;
  height: 80px;
  margin-bottom: 1.5rem;
  
  img {
    object-fit: contain;
  }
`;

const ProductTitle = styled.h3`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: white;
`;

const ProductDescription = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
  margin-bottom: 1.5rem;
`;

const ProductActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ProductPrice = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #8a2be2;
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(138, 43, 226, 0.4);
  }
`;

interface FeaturedProduct {
  id: number;
  name: string;
  description: string;
  logo: string;
  backgroundImage?: string;
  price: string;
}

interface FeaturedProductsSectionProps {
  title: string;
  products: FeaturedProduct[];
  id: string;
}

const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({ title, products, id }) => {
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

        <FeaturedGrid>
          {products.map((product, index) => (
            <FeaturedCard
              key={product.id}
              $bgImage={product.backgroundImage}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              whileHover={{ scale: 1.02 }}
            >
              <CardContent>
                <ProductLogo>
                  <Image
                    src={product.logo}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </ProductLogo>
                <ProductTitle>{product.name}</ProductTitle>
                <ProductDescription>{product.description}</ProductDescription>
                <ProductActions>
                  <ProductPrice>{product.price}</ProductPrice>
                  <ActionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Learn More
                  </ActionButton>
                </ProductActions>
              </CardContent>
            </FeaturedCard>
          ))}
        </FeaturedGrid>
      </ContentContainer>
    </SectionContainer>
  );
};

export default FeaturedProductsSection;

