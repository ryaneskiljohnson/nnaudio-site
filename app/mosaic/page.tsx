"use client";

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const MosaicPageContainer = styled.div`
  min-height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  background: #0a0a0a;
`;

const MosaicCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 1;
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
  background: rgba(0, 0, 0, 0.7);
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.2rem;
  z-index: 2;
`;

export default function MosaicPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const NNAUDIO_LOGO = '/images/nnaud-io/NNPurp1.png';

  useEffect(() => {
    const fetchProductsAndGenerate = async () => {
      try {
        const response = await fetch('/api/products?status=active&limit=100');
        const data = await response.json();
        
        if (!data.success || !data.products) {
          setError('Failed to fetch products');
          setIsLoading(false);
          return;
        }

        const products = data.products
          .filter((p: any) => p.category !== 'bundle')
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
          }));

        const filteredProducts = products.filter((product: any) => {
          const name = product.name.toLowerCase();
          return !name.includes('nnaudio access') && 
                 !name.includes('mutahad');
        });
        
        const maiTaiSeen = new Set();
        const deduplicatedProducts = filteredProducts.filter((product: any) => {
          const name = product.name.toLowerCase();
          if (name.includes('mai tai')) {
            if (maiTaiSeen.has('mai tai')) {
              return false;
            }
            maiTaiSeen.add('mai tai');
          }
          return true;
        });

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) {
          setError('Canvas not available');
          setIsLoading(false);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas not supported');
          setIsLoading(false);
          return;
        }

        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        
        const scale = Math.min(window.devicePixelRatio || 2, 3);
        canvas.width = containerWidth * scale;
        canvas.height = containerHeight * scale;
        
        ctx.scale(scale, scale);

        const shuffledProducts = [...deduplicatedProducts].sort(() => Math.random() - 0.5);

        const rows = 6;
        const cols = 12;
        const maxProducts = rows * cols;
        
        const cellWidth = containerWidth / cols;
        const cellHeight = containerHeight / rows;
        
        const seenImages = new Map<string, boolean>();
        
        const imagePromises = shuffledProducts.slice(0, maxProducts).map((product: any, index: number) => {
          return new Promise<void>((resolve) => {
            const featuredImageUrl = product.featured_image_url;
            const logoUrl = product.logo_url;
            
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
              
              const imgAspect = img.width / img.height;
              const cellAspect = cellWidth / cellHeight;
              
              let sx = 0, sy = 0, sw = img.width, sh = img.height;
              
              if (imgAspect > cellAspect) {
                sw = img.height * cellAspect;
                sx = (img.width - sw) / 2;
              } else {
                sh = img.width / cellAspect;
                sy = (img.height - sh) / 2;
              }
              
              ctx.drawImage(img, sx, sy, sw, sh, x, y, cellWidth, cellHeight);
              resolve();
            };
            
            img.onerror = () => {
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

        await Promise.all(imagePromises);
        setIsLoading(false);
      } catch (err) {
        console.error('Error generating mosaic:', err);
        setError('Failed to generate mosaic');
        setIsLoading(false);
      }
    };

    fetchProductsAndGenerate();
  }, []);

  if (error) {
    return (
      <MosaicPageContainer>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>{error}</div>
      </MosaicPageContainer>
    );
  }

  return (
    <MosaicPageContainer ref={containerRef}>
      {isLoading && (
        <LoadingOverlay>
          Generating mosaic...
        </LoadingOverlay>
      )}
      <MosaicCanvas ref={canvasRef} />
    </MosaicPageContainer>
  );
}
