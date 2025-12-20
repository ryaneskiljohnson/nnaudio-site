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
    </MosaicContainer>
  );
}
