"use client";

import React from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const MosaicContainer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MosaicImage = styled(Image)`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.6;
`;

const ProductCountBadge = styled(motion.div)`
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.85), rgba(75, 0, 130, 0.85));
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.5);
  z-index: 2;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.5rem 1rem;
    bottom: 1rem;
    right: 1rem;
  }
`;

interface HeroMosaicProps {
  products: Array<{
    id: string;
    name: string;
    featured_image_url?: string;
    logo_url?: string;
  }>;
}

export default function HeroMosaic({ products }: HeroMosaicProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <MosaicContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.3 }}
    >
      <MosaicImage
        src="/images/nnaud-io/hero-mosaic.webp"
        alt="Product Mosaic"
        fill
        priority
        quality={85}
        sizes="100vw"
        style={{ objectFit: 'cover' }}
      />
      <ProductCountBadge
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
      >
        {products.length} Products Available
      </ProductCountBadge>
    </MosaicContainer>
  );
}
