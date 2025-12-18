"use client";

import React, { useEffect, useRef, useState } from 'react';
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
`;

const MosaicCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
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

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  z-index: 1;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NNAudio logo fallback
  const NNAUDIO_LOGO = '/images/nnaud-io/NNPurp1.png';

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || products.length === 0) {
      setIsLoading(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Canvas not supported');
      setIsLoading(false);
      return;
    }

    // Get container dimensions - use the mosaic container itself (which fills the hero)
    const containerWidth = container.offsetWidth || window.innerWidth;
    const containerHeight = container.offsetHeight || window.innerHeight;
    
    // Set canvas size with high resolution for retina displays
    const scale = Math.min(window.devicePixelRatio || 2, 3);
    canvas.width = containerWidth * scale;
    canvas.height = containerHeight * scale;
    
    // Scale the context to match
    ctx.scale(scale, scale);

    // Filter out specific products
    const filteredProducts = products.filter(product => {
      const name = product.name.toLowerCase();
      return !name.includes('nnaudio access') && 
             !name.includes('mutahad');
    });
    
    // Remove duplicate "Mai Tai MIDI" - keep only one
    const maiTaiSeen = new Set();
    const deduplicatedProducts = filteredProducts.filter(product => {
      const name = product.name.toLowerCase();
      if (name.includes('mai tai')) {
        if (maiTaiSeen.has('mai tai')) {
          return false; // Skip duplicate
        }
        maiTaiSeen.add('mai tai');
      }
      return true;
    });

    // Shuffle products for variety
    const shuffledProducts = [...deduplicatedProducts].sort(() => Math.random() - 0.5);

    // Fixed grid: 12 columns x 6 rows = 72 products
    const rows = 6;
    const cols = 12;
    const maxProducts = rows * cols; // 72 products
    
    const cellWidth = containerWidth / cols;
    const cellHeight = containerHeight / rows;
    
    // Track seen images to handle duplicates
    const seenImages = new Map<string, boolean>();
    
    // Load and draw images (limit to 72 for 12x6 grid)
    const imagePromises = shuffledProducts.slice(0, maxProducts).map((product, index) => {
      return new Promise<void>((resolve) => {
        const featuredImageUrl = product.featured_image_url;
        const logoUrl = product.logo_url;
        
        // Check for duplicates
        const isDuplicate = featuredImageUrl && seenImages.has(featuredImageUrl);
        
        let imageUrl: string | undefined;
        if (isDuplicate && logoUrl) {
          imageUrl = logoUrl;
        } else {
          imageUrl = featuredImageUrl || logoUrl;
          if (featuredImageUrl) {
            seenImages.set(featuredImageUrl, true);
          }
        }
        
        // Fallback to NNAudio logo
        if (!imageUrl) {
          imageUrl = NNAUDIO_LOGO;
        }
        
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellWidth;
          const y = row * cellHeight;
          
          // Calculate crop to maintain aspect ratio (center crop)
          const imgAspect = img.width / img.height;
          const cellAspect = cellWidth / cellHeight;
          
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          
          if (imgAspect > cellAspect) {
            // Image is wider - crop sides
            sw = img.height * cellAspect;
            sx = (img.width - sw) / 2;
          } else {
            // Image is taller - crop top/bottom
            sh = img.width / cellAspect;
            sy = (img.height - sh) / 2;
          }
          
          ctx.drawImage(img, sx, sy, sw, sh, x, y, cellWidth, cellHeight);
          resolve();
        };
        
        img.onerror = () => {
          // Try NNAudio logo as fallback
          if (imageUrl !== NNAUDIO_LOGO) {
            const fallbackImg = new window.Image();
            fallbackImg.crossOrigin = 'anonymous';
            fallbackImg.onload = () => {
              const col = index % cols;
              const row = Math.floor(index / cols);
              const x = col * cellWidth;
              const y = row * cellHeight;
              
              const size = Math.min(fallbackImg.width, fallbackImg.height);
              const sx = (fallbackImg.width - size) / 2;
              const sy = (fallbackImg.height - size) / 2;
              
              ctx.drawImage(fallbackImg, sx, sy, size, size, x, y, cellWidth, cellHeight);
              resolve();
            };
            fallbackImg.onerror = () => resolve();
            fallbackImg.src = NNAUDIO_LOGO;
          } else {
            resolve();
          }
        };
        
        img.src = imageUrl;
      });
    });

    Promise.all(imagePromises)
      .then(() => {
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error creating hero mosaic:', err);
        setError('Failed to create mosaic');
        setIsLoading(false);
      });
  }, [products]);

  if (error || products.length === 0) {
    return null; // Don't render anything if there's an error or no products
  }

  return (
    <MosaicContainer
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.3 }}
    >
      {isLoading && (
        <LoadingOverlay>
          Loading products...
        </LoadingOverlay>
      )}
      <MosaicCanvas ref={canvasRef} />
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
