"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styled from 'styled-components';

const MosaicContainer = styled.div`
  width: 100%;
  height: 300px;
  margin-bottom: 1.5rem;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    height: 250px;
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

    // Set canvas size
    const containerWidth = canvas.offsetWidth || 400;
    const containerHeight = canvas.offsetHeight || 300;
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Calculate grid dimensions
    // Try to make it as square as possible
    // Use all products, no limit
    const productCount = products.length;
    const cols = Math.ceil(Math.sqrt(productCount));
    const rows = Math.ceil(productCount / cols);
    
    const cellWidth = containerWidth / cols;
    const cellHeight = containerHeight / rows;

    // Load and draw images
    const imagePromises = products.map((product, index) => {
      return new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          
          const x = col * cellWidth;
          const y = row * cellHeight;
          
          // Draw square crop (center crop)
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          
          ctx.drawImage(
            img,
            sx, sy, size, size, // Source: square crop from center
            x, y, cellWidth, cellHeight // Destination: grid cell
          );
          
          resolve();
        };
        
        img.onerror = () => {
          // Draw placeholder for failed images
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellWidth;
          const y = row * cellHeight;
          
          ctx.fillStyle = 'rgba(108, 99, 255, 0.3)';
          ctx.fillRect(x, y, cellWidth, cellHeight);
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            product.name.charAt(0).toUpperCase(),
            x + cellWidth / 2,
            y + cellHeight / 2
          );
          
          resolve();
        };
        
        const imageUrl = product.featured_image_url || product.logo_url;
        if (imageUrl) {
          img.src = imageUrl;
        } else {
          img.onerror(new Event('error'));
        }
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

