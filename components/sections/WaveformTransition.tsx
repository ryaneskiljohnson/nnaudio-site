"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

const WaveformContainer = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -60px;
  width: 100vw;
  padding: 0;
  margin: 0;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  z-index: 5;
  pointer-events: none;
  background: none;
  border: none;
  box-shadow: none;
  outline: none;

  @media (max-width: 768px) {
    height: 90px;
    bottom: -45px;
  }
`;

const WaveformWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0;
  padding: 0 20px;
  background: transparent;
  max-width: 100%;
  min-height: 120px;
  contain: layout style paint;
  will-change: contents;

  @media (max-width: 768px) {
    padding: 0 15px;
    min-height: 90px;
  }
`;

const Bar = styled(motion.div)<{ $delay: number; $isVisible: boolean }>`
  width: 3px;
  min-width: 2px;
  height: 60px;
  background: linear-gradient(
    180deg,
    rgba(138, 43, 226, 0.2) 0%,
    rgba(138, 43, 226, 0.9) 30%,
    rgba(78, 205, 196, 0.9) 50%,
    rgba(138, 43, 226, 0.9) 70%,
    rgba(75, 0, 130, 0.2) 100%
  );
  border-radius: 2px;
  position: relative;
  box-shadow: 0 0 10px rgba(138, 43, 226, 0.5);
  align-self: center;
  flex-shrink: 0;
  transform-origin: center center;
  will-change: ${props => props.$isVisible ? 'transform, opacity' : 'auto'};
  contain: layout style paint;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  @media (max-width: 768px) {
    width: 2px;
    min-width: 1.5px;
    height: 45px;
    border-radius: 1px;
    box-shadow: 0 0 8px rgba(138, 43, 226, 0.4);
  }
`;

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TopGradient = styled.div<{ $color: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: transparent;
  pointer-events: none;
  z-index: 2;
`;

const BottomGradient = styled.div<{ $color: string }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: transparent;
  pointer-events: none;
  z-index: 2;
`;

interface WaveformTransitionProps {
  barCount?: number;
  topColor?: string; // Color for top gradient (default: #0a0a0a)
  bottomColor?: string; // Color for bottom gradient (default: #1a1a2e)
}

const WaveformTransition: React.FC<WaveformTransitionProps> = ({ 
  barCount = typeof window !== 'undefined' && window.innerWidth <= 768 ? 60 : 80,
  topColor = '#0a0a0a',
  bottomColor = '#1a1a2e',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      
      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);
  
  // Memoize bar heights - only generate once per instance
  const barHeights = useMemo(() => 
    Array.from({ length: barCount }, () => Math.random() * 0.8 + 0.2),
    [barCount]
  );

  // Memoize animation variants - use transform: scaleY for better performance
  const barVariants = useMemo(() => ({
    animate: (custom: { delay: number; height: number }) => {
      const baseHeight = custom.height; // This is between 0.2 and 1.0
      const maxBarHeight = 60; // Half of container so bars extend up and down
      
      // Simplified animation - fewer keyframes for better performance
      const minScale = Math.max(0.15, baseHeight * 0.15);
      const maxScale = baseHeight;
      const midScale = baseHeight * 0.6;
      
      return {
        scaleY: [minScale, maxScale, midScale, maxScale, minScale],
        opacity: [0.5, 1, 0.7, 1, 0.5],
        transition: {
          duration: 1.2 + Math.random() * 0.8, // Reduced duration range
          repeat: Infinity,
          delay: custom.delay,
          ease: "easeInOut",
        },
      };
    },
  }), []);

  // Intersection Observer to pause animations when not visible
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '50px', // Start animating slightly before entering viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [prefersReducedMotion]);

  return (
    <WaveformContainer ref={containerRef}>
      <TopGradient $color={topColor} />
      <BottomGradient $color={bottomColor} />
      <WaveformWrapper>
        {barHeights.map((height, index) => (
          <Bar
            key={index}
            $delay={index * 0.015}
            $isVisible={isVisible && !prefersReducedMotion}
            custom={{ delay: index * 0.015, height }}
            variants={barVariants}
            animate={isVisible && !prefersReducedMotion ? "animate" : false}
            initial={{ scaleY: Math.max(0.15, height * 0.15), opacity: 0.5 }}
            style={{
              flex: "0 0 auto",
            }}
          />
        ))}
      </WaveformWrapper>
    </WaveformContainer>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(WaveformTransition, (prevProps, nextProps) => {
  // Only re-render if props actually change
  return (
    prevProps.barCount === nextProps.barCount &&
    prevProps.topColor === nextProps.topColor &&
    prevProps.bottomColor === nextProps.bottomColor
  );
});

