"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import HeroMosaic from "./HeroMosaic";

const HeroContainer = styled.section`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 20px 80px;
  position: relative;
  overflow: hidden;
  background: 
    linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%),
    url('/images/nnaud-io/Abstract-Night-Backgrounds-5-scaled-1.webp');
  background-size: cover;
  background-position: center;
  background-blend-mode: overlay;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(138, 43, 226, 0.2), transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(75, 0, 130, 0.2), transparent 50%);
    z-index: 1;
  }
`;

const HeroContent = styled.div`
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  z-index: 2;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(138, 43, 226, 0.4);
  border-radius: 24px;
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    border-radius: 16px;
  }
`;

const LogoContainer = styled(motion.div)`
  margin-bottom: 2rem;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
  
  img {
    max-width: 400px;
    width: 100%;
    height: auto;
    
    @media (max-width: 768px) {
      max-width: 300px;
    }
  }
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 3rem;
  max-width: 700px;
  line-height: 1.6;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6), 0 1px 4px rgba(0, 0, 0, 0.4);
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }
`;

const PrimaryButton = styled(motion.a)`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  padding: 16px 40px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  text-decoration: none;
  display: inline-block;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
  }
`;

const SecondaryButton = styled(motion.a)`
  background: transparent;
  color: white;
  padding: 16px 40px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const NNAudHeroSection = () => {
  const [allProducts, setAllProducts] = useState<Array<{
    id: string;
    name: string;
    featured_image_url?: string;
    logo_url?: string;
  }>>([]);

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        // Fetch all active products (excluding bundles)
        const response = await fetch('/api/products?status=active&limit=100');
        const data = await response.json();
        
        if (data.success && data.products) {
          // Filter out bundles and map to the format we need
          const products = data.products
            .filter((p: any) => p.category !== 'bundle')
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              featured_image_url: p.featured_image_url,
              logo_url: p.logo_url,
            }));
          setAllProducts(products);
        }
      } catch (error) {
        console.error('Error fetching products for hero mosaic:', error);
      }
    };

    fetchAllProducts();
  }, []);

  return (
    <HeroContainer id="home">
      {/* Product Mosaic Background */}
      {allProducts.length > 0 && (
        <HeroMosaic products={allProducts} />
      )}
      
      <HeroContent>
        <LogoContainer
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src="/images/nnaud-io/NNAudio-logo-white.png"
            alt="NNAud.io Logo"
            width={445}
            height={283}
            priority
          />
        </LogoContainer>

        <HeroTitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Resources for Modern Music Producers
        </HeroTitle>

        <HeroSubtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Discover premium plugins, sample packs, and tools designed to elevate your music production workflow
        </HeroSubtitle>

        <ButtonGroup
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <PrimaryButton
            href="#plugins"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Browse Plugins
          </PrimaryButton>
          <SecondaryButton
            href="#packs"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Packs
          </SecondaryButton>
        </ButtonGroup>
      </HeroContent>
    </HeroContainer>
  );
};

export default NNAudHeroSection;

