"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styled from 'styled-components';

const MosaicContainer = styled.div`
  width: 100%;
  aspect-ratio: 1;
  margin-bottom: 1.5rem;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    aspect-ratio: 1;
  }
`;

const MosaicCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MosaicOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.2) 60%,
    rgba(0, 0, 0, 0.6) 100%
  );
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  pointer-events: none;
`;

const ProductCountBadge = styled.div`
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  padding: 0.6rem 1.2rem;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 700;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
  letter-spacing: 0.5px;
`;

interface BundleMosaicProps {
  products: Array<{
    id: string;
    name: string;
    featured_image_url?: string;
    logo_url?: string;
  }>;
  totalCount: number;
}

export default function BundleMosaic({ products, totalCount }: BundleMosaicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NNAudio logo fallback
  const NNAUDIO_LOGO = '/images/nnaud-io/NNPurp1.png';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || products.length === 0) {
      setIsLoading(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Canvas not supported');
      setIsLoading(false);
      return;
    }

    // Set canvas size - use high resolution (4x for retina/HD displays)
    const containerWidth = canvas.offsetWidth || 400;
    const containerHeight = canvas.offsetHeight || 300;
    const scale = 4; // 4x resolution multiplier
    const canvasSize = Math.max(containerWidth, containerHeight); // Keep it square
    canvas.width = canvasSize * scale;
    canvas.height = canvasSize * scale;
    
    // Scale the context to match the high resolution
    ctx.scale(scale, scale);

    // Randomize the order of products
    const shuffledProducts = [...products].sort(() => Math.random() - 0.5);

    // Calculate grid dimensions
    // Try to make it as square as possible
    // Use all products, no limit
    const productCount = shuffledProducts.length;
    const cols = Math.ceil(Math.sqrt(productCount));
    const rows = Math.ceil(productCount / cols);
    
    // Use the square canvas size for calculations (already scaled)
    const cellWidth = canvasSize / cols;
    const cellHeight = canvasSize / rows;
    
    // Track seen featured images to detect duplicates
    const seenFeaturedImages = new Map<string, boolean>();
    
    // Load and draw images
    const imagePromises = shuffledProducts.map((product, index) => {
      return new Promise<void>((resolve) => {
        const featuredImageUrl = product.featured_image_url;
        const logoUrl = product.logo_url;
        
        // Check if this featured image has been seen before
        const isDuplicate = featuredImageUrl && seenFeaturedImages.has(featuredImageUrl);
        
        // If duplicate, use logo instead; otherwise use featured image, then logo as fallback
        let imageUrl: string | undefined;
        if (isDuplicate && logoUrl) {
          imageUrl = logoUrl;
        } else {
          imageUrl = featuredImageUrl || logoUrl;
          if (featuredImageUrl) {
            seenFeaturedImages.set(featuredImageUrl, true);
          }
        }
        
        // If no image at all, use NNAudio logo as fallback
        if (!imageUrl) {
          imageUrl = NNAUDIO_LOGO;
        }
        
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // Draw the image
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellWidth;
          const y = row * cellHeight;
          
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          
          ctx.drawImage(img, sx, sy, size, size, x, y, cellWidth, cellHeight);
          resolve();
        };
        
        img.onerror = () => {
          // If image fails to load, try NNAudio logo as fallback
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
            fallbackImg.onerror = () => {
              // If even the logo fails, just skip it
              resolve();
            };
            fallbackImg.src = NNAUDIO_LOGO;
          } else {
            // Logo already failed, just skip it
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
        console.error('Error creating mosaic:', err);
        setError('Failed to create mosaic');
        setIsLoading(false);
      });
  }, [products]);

  if (error) {
    return (
      <MosaicContainer>
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.5)'
        }}>
          {error}
        </div>
      </MosaicContainer>
    );
  }

  return (
    <MosaicContainer>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.5)',
          color: 'rgba(255, 255, 255, 0.7)',
          zIndex: 1
        }}>
          Loading mosaic...
        </div>
      )}
      <MosaicCanvas ref={canvasRef} />
      <MosaicOverlay>
        <ProductCountBadge>
          {totalCount} {totalCount === 1 ? 'Product' : 'Products'} Included
        </ProductCountBadge>
      </MosaicOverlay>
    </MosaicContainer>
  );
}

