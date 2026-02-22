"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import { getCanonicalImageKey } from '@/utils/canonicalImageKey';

const MosaicContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
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
  const runIdRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NNAudio logo fallback
  const NNAUDIO_LOGO = '/images/nnaud-io/NNPurp1.webp';

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

    // Increment run id so previous run's async callbacks skip drawing (avoids duplicate cells from race).
    const thisRunId = ++runIdRef.current;

    // Set canvas size - use high resolution (4x for retina/HD displays)
    const containerWidth = canvas.offsetWidth || 400;
    const containerHeight = canvas.offsetHeight || 300;
    const scale = 4; // 4x resolution multiplier
    const canvasSize = Math.max(containerWidth, containerHeight); // Keep it square
    canvas.width = canvasSize * scale;
    canvas.height = canvasSize * scale;
    
    // Scale the context to match the high resolution
    ctx.scale(scale, scale);

    // One cell per unique image: same canonical key = same image = draw once only.
    const seenKey = new Set<string>();
    const imageUrlsToDraw: string[] = [];
    for (const p of products) {
      const url = (p.featured_image_url || p.logo_url || '').trim() || NNAUDIO_LOGO;
      const key = getCanonicalImageKey(url);
      if (!key || seenKey.has(key)) continue;
      seenKey.add(key);
      imageUrlsToDraw.push(url);
    }

    // If nothing to draw, bail
    if (imageUrlsToDraw.length === 0) {
      setIsLoading(false);
      return;
    }

    // Randomize order (stable per effect run; runId prevents stale runs from drawing).
    const shuffledUrls = [...imageUrlsToDraw].sort(() => Math.random() - 0.5);
    const count = shuffledUrls.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellWidth = canvasSize / cols;
    const cellHeight = canvasSize / rows;

    const drawInCell = (col: number, row: number, img: HTMLImageElement) => {
      if (thisRunId !== runIdRef.current) return;
      const x = col * cellWidth;
      const y = row * cellHeight;
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, x, y, cellWidth, cellHeight);
    };

    const imagePromises = shuffledUrls.map((imageUrl, index) => {
      return new Promise<void>((resolve) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          drawInCell(col, row, img);
          resolve();
        };
        img.onerror = () => {
          if (imageUrl !== NNAUDIO_LOGO) {
            const fallbackImg = new window.Image();
            fallbackImg.crossOrigin = 'anonymous';
            fallbackImg.onload = () => {
              drawInCell(col, row, fallbackImg);
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
        if (thisRunId === runIdRef.current) setIsLoading(false);
      })
      .catch((err) => {
        if (thisRunId === runIdRef.current) {
          console.error('Error creating mosaic:', err);
          setError('Failed to create mosaic');
          setIsLoading(false);
        }
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

