"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaStar, FaShoppingCart, FaDownload, FaCheck, FaPlay, FaPause, FaMusic, FaVideo, FaChevronRight, FaHome, FaVolumeUp, FaCheckCircle, FaDesktop, FaCog } from "react-icons/fa";
import { useParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { cleanHtmlText } from "@/utils/stringUtils";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
`;

const HeroSection = styled.section.attrs<{ $bgImage?: string }>((props) => ({
  as: 'section'
}))<{ $bgImage?: string }>`
  padding: 140px 20px 40px;
  background: ${props => props.$bgImage 
    ? `linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%), url(${props.$bgImage})`
    : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)'};
  background-size: cover;
  background-position: center;
  position: relative;
`;

const HeroContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const BreadcrumbContainer = styled.div`
  grid-column: 1 / -1;
  margin-bottom: 0.5rem;
`;

const BreadcrumbList = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const BreadcrumbLink = styled(Link)`
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 1);
  }
`;

const BreadcrumbSeparator = styled.span`
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
`;

const BreadcrumbCurrent = styled.span`
  color: rgba(255, 255, 255, 1);
  font-weight: 500;
`;

const ProductImageContainer = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ProductDetails = styled.div`
  color: white;
`;

const ProductName = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const ProductTagline = styled(motion.p)`
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const Rating = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Stars = styled.div`
  display: flex;
  gap: 4px;
  font-size: 1.2rem;
  color: #ffd700;
`;

const ReviewCount = styled.span`
  color: var(--text-secondary);
  font-size: 1rem;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Price = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: #4ecdc4;
`;

const OriginalPrice = styled.div`
  font-size: 1.5rem;
  color: var(--text-secondary);
  text-decoration: line-through;
`;

const FreeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  background: linear-gradient(135deg, #4ecdc4 0%, #44a5a0 100%);
  color: white;
  border-radius: 50px;
  font-size: 1.5rem;
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(78, 205, 196, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const BuyButton = styled(motion.button)`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  padding: 18px 48px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  margin-bottom: 1rem;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
  }
`;

const ContentSection = styled.section`
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  color: white;
  margin-bottom: 1.5rem;
  font-weight: 700;
`;

const Description = styled.div`
  font-size: 1.1rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0;
  
  p {
    margin-bottom: 1rem;
  }
  
  h2, h3, h4 {
    color: rgba(255, 255, 255, 0.95);
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }
  
  h2 {
    font-size: 1.5rem;
  }
  
  h3 {
    font-size: 1.25rem;
  }
  
  h4 {
    font-size: 1.1rem;
  }
  
  ul, ol {
    margin: 1rem 0;
    padding-left: 2rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
  
  strong {
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
  }
  
  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
  }
`;

const FeaturesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 2rem;
`;

const FeatureCard = styled(motion.div)<{ $imageOnLeft?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: ${props => props.$imageOnLeft ? 'row' : 'row-reverse'};
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(138, 43, 226, 0.3);
  }
`;

const FeatureImageContainer = styled.div`
  position: relative;
  width: 50%;
  min-width: 300px;
  aspect-ratio: 16 / 9;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 100%;
    min-width: unset;
  }
`;

const FeatureContent = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const FeatureTitle = styled.h3`
  color: rgba(255, 255, 255, 1);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    color: #4ecdc4;
    font-size: 1.25rem;
    flex-shrink: 0;
  }
`;

const FeatureDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0;
  font-size: 0.95rem;
`;

const OverviewSection = styled.section`
  margin-top: 2rem;
  border-radius: 16px;
  overflow: hidden;
`;

const OverviewBanner = styled.div`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  padding: 1.5rem 2rem;
  text-align: center;
`;

const OverviewTitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
`;

const OverviewContent = styled.div`
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(42, 42, 70, 0.95) 100%);
  padding: 2.5rem;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 3rem;
  align-items: center;
  min-height: 500px;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    min-height: auto;
  }
`;

const OverviewFeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const OverviewFeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.95);
  font-size: 1rem;
  line-height: 1.7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  
  &::before {
    content: '✓';
    color: #8a2be2;
    font-weight: bold;
    font-size: 1.3rem;
    flex-shrink: 0;
    margin-top: 1px;
    line-height: 1;
  }
`;

const OverviewImageContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
  box-shadow: 0 8px 32px rgba(138, 43, 226, 0.4);
  border: 1px solid rgba(138, 43, 226, 0.2);
`;

const CompatibilitySection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const CompatibilityCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(138, 43, 226, 0.3);
    transform: translateY(-2px);
  }
`;

const CompatibilityTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CompatibilityList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CompatibilityItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  line-height: 1.5;
  
  &::before {
    content: '•';
    color: #8a2be2;
    font-weight: bold;
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-top: -2px;
  }
`;

const CompatibilityKey = styled.span`
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-right: 0.5rem;
`;

const CompatibilityValue = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

const ReviewsSection = styled.div`
  margin-top: 1.5rem;
`;

const ReviewsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ReviewsSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const AverageRating = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const RatingNumber = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: #ffd700;
  line-height: 1;
`;

const RatingStars = styled.div`
  display: flex;
  gap: 0.25rem;
  font-size: 1.5rem;
`;

const ReviewsCount = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
`;

const ReviewsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 600px; /* Approximately 3 reviews (each ~180px with padding/gap) */
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(138, 43, 226, 0.5);
    border-radius: 3px;
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(138, 43, 226, 0.7);
    }
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(138, 43, 226, 0.5) rgba(255, 255, 255, 0.05);
`;

const ReviewCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(138, 43, 226, 0.3);
  }
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ReviewAuthor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ReviewName = styled.div`
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ReviewDate = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
`;

const ReviewTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 0.75rem 0;
`;

const ReviewText = styled.p`
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
  margin: 0;
  font-size: 0.95rem;
`;

const VerifiedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(138, 43, 226, 0.2);
  color: #8a2be2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const NoReviewsMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
`;

const StickyAddToCartButton = styled(motion.div)`
  position: fixed;
  bottom: 20px;
  left: 50%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(138, 43, 226, 0.5);
  border-radius: 50px;
  padding: 0.75rem 1.5rem;
  box-shadow: 0 8px 32px rgba(138, 43, 226, 0.4);
  
  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 8px 32px rgba(138, 43, 226, 0.4);
    }
    50% {
      box-shadow: 0 8px 40px rgba(138, 43, 226, 0.7);
    }
  }
  
  animation: pulse 2s ease-in-out infinite;
`;

const StickyButtonContent = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
`;

const StickyProductImage = styled.div`
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StickyProductInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  justify-content: center;
`;

const StickyProductName = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1;
  margin-bottom: -2px;
`;

const StickyPrice = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const StickyPriceMain = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: #8a2be2;
`;

const StickyPriceOriginal = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: line-through;
`;

const StickyButton = styled(motion.button)`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 40px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(138, 43, 226, 0.6);
  }
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const GalleryImage = styled(motion.div)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  
  &:hover {
    border-color: rgba(138, 43, 226, 0.5);
    transform: scale(1.02);
  }
`;

const AudioSection = styled.div`
  margin-top: 2rem;
`;

const PlaylistContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(138, 43, 226, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const PlaylistHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const CurrentTrackInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CurrentTrackName = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TrackCounter = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
`;

const PlayPauseButton = styled.button<{ $isPlaying: boolean }>`
  background: ${props => props.$isPlaying 
    ? 'linear-gradient(135deg, #8a2be2 0%, #4b0082 100%)'
    : 'rgba(138, 43, 226, 0.2)'};
  border: 2px solid ${props => props.$isPlaying ? '#8a2be2' : 'rgba(138, 43, 226, 0.5)'};
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const AudioInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AudioName = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AudioTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.5rem;
`;

const WaveformContainer = styled.div`
  margin-top: 1rem;
  margin-bottom: 1rem;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  height: 120px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.3);
  }
`;

const WaveformCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

const StaticWaveform = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 10px;
  gap: 2px;
`;

const WaveformBar = styled.div<{ $height: number; $isActive?: boolean }>`
  flex: 1;
  background: ${props => props.$isActive 
    ? 'linear-gradient(180deg, #8a2be2 0%, #4b0082 100%)'
    : 'rgba(138, 43, 226, 0.3)'};
  border-radius: 2px;
  min-height: 12px;
  height: ${props => {
    // Ensure minimum height for visibility, scale based on waveform data
    // Height ranges from 20% (min) to 100% (max) based on waveform data
    const minHeightPercent = 20;
    const maxHeightPercent = 100;
    const heightPercent = minHeightPercent + (props.$height * (maxHeightPercent - minHeightPercent));
    return `${Math.max(heightPercent, minHeightPercent)}%`;
  }};
  align-self: flex-end;
  transition: background 0.2s ease, height 0.1s ease;
`;

const ProgressContainer = styled.div`
  margin-top: 1rem;
  position: relative;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #8a2be2 0%, #4b0082 100%);
  border-radius: 3px;
  transition: width 0.1s linear;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    background: #8a2be2;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(138, 43, 226, 0.5);
  }
`;

const VolumeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  margin-left: auto;
  
  ${PlaylistContainer}:hover & {
    opacity: 1;
  }
`;

const Playlist = styled.div`
  margin-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
  max-height: 320px; /* Approximately 5 items (each ~64px with padding) */
  overflow-y: auto;
  overflow-x: hidden;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(138, 43, 226, 0.5);
    border-radius: 3px;
    
    &:hover {
      background: rgba(138, 43, 226, 0.7);
    }
  }
`;

const PlaylistTitle = styled.h3`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.75rem;
  font-weight: 600;
`;

const PlaylistItem = styled.div<{ $isActive: boolean; $isPlaying: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$isActive 
    ? 'rgba(138, 43, 226, 0.2)' 
    : 'transparent'};
  border: 1px solid ${props => props.$isActive 
    ? 'rgba(138, 43, 226, 0.5)' 
    : 'transparent'};
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(138, 43, 226, 0.3);
  }
  
  ${props => props.$isPlaying && `
    background: rgba(138, 43, 226, 0.15);
    border-color: rgba(138, 43, 226, 0.6);
  `}
`;

const PlaylistItemNumber = styled.div<{ $isActive: boolean }>`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.$isActive ? '#8a2be2' : 'rgba(255, 255, 255, 0.6)'};
  background: ${props => props.$isActive 
    ? 'rgba(138, 43, 226, 0.2)' 
    : 'rgba(255, 255, 255, 0.05)'};
  flex-shrink: 0;
`;

const PlaylistItemName = styled.div<{ $isActive: boolean }>`
  flex: 1;
  font-size: 0.95rem;
  color: ${props => props.$isActive 
    ? 'rgba(255, 255, 255, 0.95)' 
    : 'rgba(255, 255, 255, 0.7)'};
  font-weight: ${props => props.$isActive ? '600' : '400'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PlaylistItemDuration = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
`;

const VolumeSlider = styled.input`
  width: 150px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #8a2be2;
    border-radius: 50%;
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #8a2be2;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
`;

const VideoContainer = styled.div`
  margin-top: 2rem;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  aspect-ratio: 16/9;
  position: relative;
`;

const VideoIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const RelatedProducts = styled.div`
  padding: 80px 20px;
  background: rgba(0, 0, 0, 0.3);
`;

const RelatedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 2rem auto 0;
`;

const RelatedCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    border-color: rgba(138, 43, 226, 0.5);
  }
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1.2rem;
`;


export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { addItem } = useCart();
  const { success } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [showStickyButton, setShowStickyButton] = useState(false);
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  // Handle scroll to show/hide sticky button
  useEffect(() => {
    const handleScroll = () => {
      if (!heroSectionRef.current) return;
      
      const heroBottom = heroSectionRef.current.offsetTop + heroSectionRef.current.offsetHeight;
      const scrollPosition = window.scrollY;
      
      // Show sticky button when scrolled past the hero section
      setShowStickyButton(scrollPosition > heroBottom - 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [product]);

  // Initialize audio context and analyser
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update audio source when track changes
  useEffect(() => {
    if (product?.audio_samples && product.audio_samples.length > 0 && mainAudioRef.current) {
      const audio = mainAudioRef.current;
      const audioUrl = product.audio_samples[currentTrackIndex]?.url;
      
      if (!audioUrl) {
        console.warn('No audio URL for track', currentTrackIndex);
        return;
      }

      // Connect audio to analyser if not already connected
      if (audio && audioContextRef.current && analyserRef.current) {
        try {
          if (!(audio as any).__sourceConnected) {
            const source = audioContextRef.current.createMediaElementSource(audio);
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
            (audio as any).__sourceConnected = true;
          }
        } catch (e) {
          // Already connected or error, ignore
          console.warn('Audio context connection:', e);
        }
      }

      audio.pause();
      audio.src = audioUrl;
      audio.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setWaveformData([]);

      // Generate waveform when audio loads
      const handleLoadedData = async () => {
        try {
          await generateWaveform(audio);
        } catch (error) {
          console.warn('Error generating waveform in handleLoadedData:', error);
          // Ensure we have some waveform data even if generation fails
          if (waveformData.length === 0) {
            const fallbackData = Array.from({ length: 200 }, (_, i) => {
              return 0.25 + Math.sin(i / 10) * 0.2 + Math.random() * 0.15;
            });
            setWaveformData(fallbackData);
          }
        }
      };
      
      // Also try to generate waveform if audio is already loaded
      if (audio.readyState >= 2) {
        handleLoadedData();
      }
      
      audio.addEventListener('loadeddata', handleLoadedData);
      
      // Handle errors
      const handleError = (e: any) => {
        const audioElement = e.target || e.currentTarget || audio;
        const error = audioElement?.error;
        if (error && error.code !== undefined) {
          let errorMessage = 'Unknown error';
          switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
              errorMessage = 'Audio loading aborted';
              break;
            case error.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error loading audio (may be CORS issue)';
              break;
            case error.MEDIA_ERR_DECODE:
              errorMessage = 'Audio decode error';
              break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format not supported';
              break;
          }
          console.error('Audio error:', errorMessage, {
            code: error.code,
            message: error.message,
            url: audioUrl
          });
        } else {
          // Empty error object often indicates CORS issue
          console.warn('Audio error (likely CORS):', {
            url: audioUrl,
            readyState: audioElement?.readyState,
            networkState: audioElement?.networkState
          });
        }
      };
      
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [currentTrackIndex, product]);

  // Start/stop waveform animation based on playing state
  useEffect(() => {
    if (isPlaying && analyserRef.current) {
      startWaveformAnimation();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isPlaying]);

  const generateWaveform = async (audio: HTMLAudioElement) => {
    try {
      // Check if audio is ready
      if (!audio || !audio.src) {
        console.warn('Audio element not ready for waveform generation');
        // Create a visible fallback pattern
        const fallbackData = Array.from({ length: 200 }, (_, i) => {
          return 0.2 + Math.sin(i / 10) * 0.15 + Math.random() * 0.1;
        });
        setWaveformData(fallbackData);
        return;
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Try to fetch the audio file
      let arrayBuffer: ArrayBuffer;
      try {
        const response = await fetch(audio.src, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        arrayBuffer = await response.arrayBuffer();
      } catch (fetchError) {
        // If fetch fails (CORS), try using the audio element's source directly
        console.warn('Fetch failed, trying alternative method:', fetchError);
        
        // Create a new audio context and try to decode from the audio element
        // This might work if the audio has already loaded
        if (audio.readyState >= 2) {
          // Audio has loaded enough data
          try {
            // Use the existing audio context if available, or create a new one
            const source = audioContext.createMediaElementSource(audio);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            
            // For static waveform, we'll use a fallback pattern
            // The animated waveform will work when playing
            const fallbackData = Array.from({ length: 200 }, (_, i) => {
              // Create a simple wave pattern so it's visible
              return 0.25 + Math.sin(i / 10) * 0.2 + Math.random() * 0.15;
            });
            setWaveformData(fallbackData);
            return;
          } catch (e) {
            console.warn('Alternative waveform method failed:', e);
          }
        }
        
        // Final fallback: create a simple waveform pattern with variation
        const fallbackData = Array.from({ length: 200 }, (_, i) => {
          // Create a simple wave pattern so it's visible
          return 0.2 + Math.sin(i / 10) * 0.15 + Math.random() * 0.1;
        });
        setWaveformData(fallbackData);
        return;
      }

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const rawData = audioBuffer.getChannelData(0);
      const samples = 200; // Number of points to show
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        filteredData.push(sum / blockSize);
      }

      // Normalize the data
      const max = Math.max(...filteredData);
      if (max > 0) {
        const normalized = filteredData.map(n => n / max);
        setWaveformData(normalized);
      } else {
        setWaveformData(new Array(200).fill(0.1));
      }
    } catch (error) {
      console.warn('Error generating waveform:', error);
      // Fallback: create a visible waveform pattern with variation
      const fallbackData = Array.from({ length: 200 }, (_, i) => {
        return 0.2 + Math.sin(i / 10) * 0.15 + Math.random() * 0.1;
      });
      setWaveformData(fallbackData);
    }
  };

  const startWaveformAnimation = () => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !analyserRef.current || !isPlaying) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying || !canvas) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        return;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#8a2be2');
        gradient.addColorStop(0.5, '#6a1bb2');
        gradient.addColorStop(1, '#4b0082');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/slug/${slug}`);
      const data = await response.json();

      if (data.success) {
        setProduct(data.product);
        // Reset to first track when product loads
        if (data.product.audio_samples && Array.isArray(data.product.audio_samples) && data.product.audio_samples.length > 0) {
          setCurrentTrackIndex(0);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    const audio = mainAudioRef.current;
    if (!audio) {
      console.warn('Audio element not found');
      return;
    }

    // Check if audio has a valid source
    if (!audio.src || audio.src === window.location.href) {
      console.warn('Audio element has no valid source');
      const audioUrl = product.audio_samples?.[currentTrackIndex]?.url;
      if (audioUrl) {
        audio.src = audioUrl;
        audio.load();
        // Wait for audio to be ready
        await new Promise((resolve) => {
          const handleCanPlay = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            resolve(undefined);
          };
          audio.addEventListener('canplay', handleCanPlay);
          // Timeout after 5 seconds
          setTimeout(() => {
            audio.removeEventListener('canplay', handleCanPlay);
            resolve(undefined);
          }, 5000);
        });
      } else {
        console.error('No audio URL available for track', currentTrackIndex);
        return;
      }
    }

    // Resume audio context if suspended (required for autoplay policies)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.warn('Error resuming audio context:', error);
      }
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        // Ensure audio is ready before playing
        if (audio.readyState < 2) {
          // Wait for audio to be ready
          await new Promise((resolve, reject) => {
            const handleCanPlay = () => {
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              resolve(undefined);
            };
            const handleError = (e: any) => {
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              reject(e);
            };
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('error', handleError);
            // Timeout after 5 seconds
            setTimeout(() => {
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              reject(new Error('Audio load timeout'));
            }, 5000);
          });
        }
        await audio.play();
        setIsPlaying(true);
      } catch (error: any) {
        console.error('Error playing audio:', error);
        console.error('Audio src:', audio.src);
        console.error('Audio readyState:', audio.readyState);
        setIsPlaying(false);
        // Try to resume audio context and retry
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          try {
            await audioContextRef.current.resume();
            await audio.play();
            setIsPlaying(true);
          } catch (retryError) {
            console.error('Error retrying play:', retryError);
          }
        }
      }
    }
  };

  const handleTrackSelect = async (index: number) => {
    setCurrentTrackIndex(index);
    // Wait for audio to load, then play if it was playing before
    if (isPlaying && mainAudioRef.current) {
      const audio = mainAudioRef.current;
      // Wait for the audio to be ready
      const playWhenReady = () => {
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
          audio.play().catch((error) => {
            console.error('Error auto-playing after track change:', error);
            setIsPlaying(false);
          });
        } else {
          audio.addEventListener('canplay', playWhenReady, { once: true });
        }
      };
      playWhenReady();
    }
  };

  const handleNextTrack = () => {
    if (product.audio_samples && currentTrackIndex < product.audio_samples.length - 1) {
      handleTrackSelect(currentTrackIndex + 1);
    }
  };

  const handlePreviousTrack = () => {
    if (currentTrackIndex > 0) {
      handleTrackSelect(currentTrackIndex - 1);
    }
  };

  const handleTimeUpdate = () => {
    const audio = mainAudioRef.current;
    if (!audio || isNaN(audio.currentTime)) return;
    
    setCurrentTime(audio.currentTime);
    if (audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = mainAudioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = mainAudioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    const audio = mainAudioRef.current;
    if (audio) {
      audio.volume = newVolume;
    }
    setVolume(newVolume);
  };


  if (loading) {
    return <LoadingContainer>Loading product...</LoadingContainer>;
  }

  if (!product) {
    return <LoadingContainer>Product not found</LoadingContainer>;
  }

  // Use sale_price if it exists (including 0), otherwise use regular price
  const displayPrice = (product.sale_price !== null && product.sale_price !== undefined) ? product.sale_price : product.price;
  const hasDiscount = product.sale_price !== null && product.sale_price !== undefined && product.sale_price > 0 && product.sale_price < product.price;
  // Product is free if sale_price is 0, or if both price and sale_price are 0/null
  const isFree = product.sale_price === 0 || (product.price === 0 && (product.sale_price === null || product.sale_price === undefined));

  return (
    <Container>
      <HeroSection 
        ref={heroSectionRef as any} 
        $bgImage={product.background_image_url || product.background_video_url}
      >
        <HeroContent>
          <BreadcrumbContainer>
            <BreadcrumbList>
              <BreadcrumbLink href="/">
                <FaHome size={14} />
                <span>Home</span>
              </BreadcrumbLink>
              <BreadcrumbSeparator>
                <FaChevronRight size={10} />
              </BreadcrumbSeparator>
              <BreadcrumbLink href="/products">
                <span>Products</span>
              </BreadcrumbLink>
              <BreadcrumbSeparator>
                <FaChevronRight size={10} />
              </BreadcrumbSeparator>
              <BreadcrumbCurrent>
                {product.name}
              </BreadcrumbCurrent>
            </BreadcrumbList>
          </BreadcrumbContainer>
          
          <ProductImageContainer
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {product.featured_image_url || product.logo_url ? (
              <Image
                src={product.featured_image_url || product.logo_url}
                alt={product.name}
                fill
                style={{ objectFit: 'contain', padding: '20px' }}
                priority
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                color: 'var(--text-secondary)'
              }}>
                {product.name[0]}
              </div>
            )}
          </ProductImageContainer>

          <ProductDetails>
            <ProductName
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {product.name}
            </ProductName>
            
            {product.tagline && (
              <ProductTagline
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {cleanHtmlText(product.tagline)}
              </ProductTagline>
            )}

            {product.review_count != null && 
             product.review_count > 0 && 
             product.average_rating != null && 
             product.average_rating > 0 && (
              <Rating>
                <Stars>
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      style={{
                        opacity: i < Math.round(product.average_rating) ? 1 : 0.3
                      }}
                    />
                  ))}
                </Stars>
                <ReviewCount>
                  {product.average_rating.toFixed(1)} ({product.review_count} reviews)
                </ReviewCount>
              </Rating>
            )}

            <PriceContainer>
              {isFree ? (
                <>
                  {(product.sale_price === 0 && product.price > 0) && (
                    <OriginalPrice>${product.price}</OriginalPrice>
                  )}
                  <FreeBadge>FREE</FreeBadge>
                </>
              ) : (
                <>
                  <Price>${displayPrice}</Price>
                  {hasDiscount && (
                    <OriginalPrice>${product.price}</OriginalPrice>
                  )}
                </>
              )}
            </PriceContainer>

            <BuyButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (product) {
                  addItem({
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    sale_price: product.sale_price,
                    featured_image_url: product.featured_image_url,
                    logo_url: product.logo_url,
                  });
                  success(`${product.name} added to cart!`, 3000);
                }
              }}
            >
              <FaShoppingCart /> Add to Cart
            </BuyButton>
            
            {product.download_url && (
              <motion.a
                href={product.download_url}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
                whileHover={{ color: 'var(--text)' }}
              >
                <FaDownload /> Version {product.download_version}
              </motion.a>
            )}
          </ProductDetails>
        </HeroContent>
      </HeroSection>

      {product.description && (
        <ContentSection>
          <SectionTitle>Description</SectionTitle>
          <Description>
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
              {product.description}
            </ReactMarkdown>
          </Description>
        </ContentSection>
      )}

      {product.gallery_images && product.gallery_images.length > 0 && (
        <ContentSection>
          <SectionTitle>Gallery</SectionTitle>
          <GalleryGrid>
            {product.gallery_images.map((imageUrl: string, index: number) => (
              <GalleryImage
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => window.open(imageUrl, '_blank')}
              >
                <Image
                  src={imageUrl}
                  alt={`${product.name} - Image ${index + 1}`}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </GalleryImage>
            ))}
          </GalleryGrid>
        </ContentSection>
      )}

      <ContentSection>
        <SectionTitle>Overview</SectionTitle>
        <OverviewSection>
          <OverviewContent>
            <OverviewFeaturesList>
              <OverviewFeatureItem>10 Complete Effect Chains</OverviewFeatureItem>
              <OverviewFeatureItem>Generate Infinite Effects With The "Magic Button" & Never Run Short On Ideas.</OverviewFeatureItem>
              <OverviewFeatureItem>Transform Any Audio Into A Modern Masterpiece.</OverviewFeatureItem>
              <OverviewFeatureItem>Easily Undo/Redo Any Change, Including The "Magic Button" Generator.</OverviewFeatureItem>
              <OverviewFeatureItem>MIDI CC + MIDI Learn Capable.</OverviewFeatureItem>
              <OverviewFeatureItem>Easy-To-Use Preset Browser for Searching & Creating your own presets.</OverviewFeatureItem>
              <OverviewFeatureItem>250 included Factory Presets</OverviewFeatureItem>
              <OverviewFeatureItem>Tooltip To Help Learn & Understand The Plugin</OverviewFeatureItem>
              <OverviewFeatureItem>Intuitive single window interface & parameters.</OverviewFeatureItem>
            </OverviewFeaturesList>
            <OverviewImageContainer>
              <Image
                src={product.background_image_url || product.featured_image_url || 'https://nnaud.io/wp-content/uploads/2024/06/CrystalBall-GUI.jpg'}
                alt={`${product.name} Interface`}
                fill
                style={{ objectFit: 'contain', padding: '10px' }}
                priority
              />
            </OverviewImageContainer>
          </OverviewContent>
        </OverviewSection>
      </ContentSection>

      {product.demo_video_url && (
        <ContentSection>
          <SectionTitle>
            <FaVideo style={{ marginRight: '10px', display: 'inline' }} />
            Demo Video
          </SectionTitle>
          <VideoContainer>
            {product.demo_video_url.includes('youtube') || product.demo_video_url.includes('youtu.be') ? (
              <VideoIframe
                src={product.demo_video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : product.demo_video_url.includes('vimeo') ? (
              <VideoIframe
                src={product.demo_video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video controls style={{ width: '100%', height: '100%' }}>
                <source src={product.demo_video_url} />
                Your browser does not support the video tag.
              </video>
            )}
          </VideoContainer>
        </ContentSection>
      )}

      {product.audio_samples && product.audio_samples.length > 0 && (
        <ContentSection>
          <SectionTitle>Audio Samples</SectionTitle>
          <AudioSection>
            <PlaylistContainer>
              <PlaylistHeader>
                <PlayPauseButton
                  $isPlaying={isPlaying}
                  onClick={handlePlayPause}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <FaPause /> : <FaPlay />}
                </PlayPauseButton>
                <CurrentTrackInfo>
                  <CurrentTrackName>
                    {product.audio_samples[currentTrackIndex]?.name || `Sample ${currentTrackIndex + 1}`}
                  </CurrentTrackName>
                  <TrackCounter>
                    Track {currentTrackIndex + 1} of {product.audio_samples.length}
                  </TrackCounter>
                  <AudioTime>
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                  </AudioTime>
                </CurrentTrackInfo>
                <VolumeContainer>
                  <FaVolumeUp size={14} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  <VolumeSlider
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  />
                </VolumeContainer>
              </PlaylistHeader>
              
              <WaveformContainer onClick={handleWaveformClick}>
                  {isPlaying && analyserRef.current ? (
                    <WaveformCanvas
                      ref={waveformCanvasRef}
                      style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWaveformClick(e as any);
                      }}
                    />
                  ) : (
                    <StaticWaveform>
                      {waveformData.length > 0 ? (
                        waveformData.map((height, index) => {
                          const progress = duration > 0 ? (currentTime / duration) : 0;
                          const isActive = index / waveformData.length <= progress;
                          return (
                            <WaveformBar
                              key={index}
                              $height={height}
                              $isActive={isActive}
                            />
                          );
                        })
                      ) : (
                        // Default waveform pattern while loading
                        Array.from({ length: 200 }, (_, i) => {
                          // Create a varied waveform pattern with sine wave and some randomness
                          const height = 0.25 + Math.sin(i / 10) * 0.2 + Math.sin(i / 3) * 0.1 + (i % 7) * 0.02;
                          return (
                            <WaveformBar
                              key={i}
                              $height={Math.max(0.1, Math.min(1, height))}
                              $isActive={false}
                            />
                          );
                        })
                      )}
                    </StaticWaveform>
                  )}
                </WaveformContainer>
              
              <ProgressContainer>
                <ProgressBar onClick={handleProgressClick}>
                  <ProgressFill $progress={duration > 0 ? (currentTime / duration) * 100 : 0} />
                </ProgressBar>
              </ProgressContainer>
              
              <Playlist>
                <PlaylistTitle>Playlist ({product.audio_samples.length} tracks)</PlaylistTitle>
                {product.audio_samples.map((audio: any, index: number) => (
                  <PlaylistItem
                    key={index}
                    $isActive={index === currentTrackIndex}
                    $isPlaying={index === currentTrackIndex && isPlaying}
                    onClick={() => handleTrackSelect(index)}
                  >
                    <PlaylistItemNumber $isActive={index === currentTrackIndex}>
                      {index === currentTrackIndex && isPlaying ? <FaPause size={12} /> : index + 1}
                    </PlaylistItemNumber>
                    <PlaylistItemName $isActive={index === currentTrackIndex}>
                      {audio.name || `Sample ${index + 1}`}
                    </PlaylistItemName>
                    <PlaylistItemDuration>
                      {duration > 0 && index === currentTrackIndex ? formatTime(duration) : '--:--'}
                    </PlaylistItemDuration>
                  </PlaylistItem>
                ))}
              </Playlist>
              
              <audio
                ref={mainAudioRef}
                src={product.audio_samples[currentTrackIndex]?.url}
                crossOrigin={product.audio_samples[currentTrackIndex]?.url?.includes('supabase.co') ? 'anonymous' : undefined}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onError={(e) => {
                  const audioElement = e?.currentTarget || e?.target;
                  const error = audioElement?.error;
                  if (error) {
                    let errorMessage = 'Unknown error';
                    switch (error.code) {
                      case error.MEDIA_ERR_ABORTED:
                        errorMessage = 'Audio loading aborted';
                        break;
                      case error.MEDIA_ERR_NETWORK:
                        errorMessage = 'Network error loading audio (may be CORS issue)';
                        break;
                      case error.MEDIA_ERR_DECODE:
                        errorMessage = 'Audio decode error';
                        break;
                      case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMessage = 'Audio format not supported';
                        break;
                    }
                    console.error('Audio error:', errorMessage, {
                      code: error.code,
                      message: error.message,
                      url: product.audio_samples[currentTrackIndex]?.url
                    });
                  } else {
                    console.error('Audio error (no error details):', {
                      event: e,
                      url: product.audio_samples[currentTrackIndex]?.url,
                      readyState: audioElement?.readyState
                    });
                  }
                }}
                onLoadedMetadata={(e) => {
                  try {
                    const audioElement = e?.currentTarget;
                    if (audioElement && typeof audioElement.duration === 'number' && !isNaN(audioElement.duration) && isFinite(audioElement.duration)) {
                      setDuration(audioElement.duration);
                    }
                  } catch (error) {
                    console.warn('Error loading audio metadata:', error);
                  }
                }}
                onLoadedData={async (e) => {
                  if (e.currentTarget) {
                    try {
                      await generateWaveform(e.currentTarget);
                    } catch (error) {
                      console.warn('Error in onLoadedData waveform generation:', error);
                      // Ensure we have some waveform data even if generation fails
                      if (waveformData.length === 0) {
                        setWaveformData(new Array(200).fill(0.15));
                      }
                    }
                  }
                }}
                onEnded={async () => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                  if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                  }
                  
                  // Auto-play next track
                  if (product.audio_samples && currentTrackIndex < product.audio_samples.length - 1) {
                    const nextIndex = currentTrackIndex + 1;
                    const audio = mainAudioRef.current;
                    const nextUrl = product.audio_samples[nextIndex]?.url;
                    
                    if (!audio || !nextUrl) return;
                    
                    // Update to next track
                    setCurrentTrackIndex(nextIndex);
                    
                    // Directly update audio source and wait for it to be ready
                    audio.pause();
                    audio.src = nextUrl;
                    audio.load();
                    setCurrentTime(0);
                    setDuration(0);
                    setWaveformData([]);
                    
                    // Wait for audio to be ready to play
                    await new Promise<void>((resolve) => {
                      const handleCanPlay = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        resolve();
                      };
                      const handleError = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        resolve(); // Resolve anyway to prevent hanging
                      };
                      audio.addEventListener('canplay', handleCanPlay);
                      audio.addEventListener('error', handleError);
                      // Fallback timeout
                      setTimeout(() => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        resolve();
                      }, 5000);
                    });
                    
                    // Generate waveform for new track
                    if (audio.readyState >= 2) {
                      generateWaveform(audio);
                    } else {
                      audio.addEventListener('loadeddata', () => {
                        generateWaveform(audio);
                      }, { once: true });
                    }
                    
                    // Play the next track
                    try {
                      // Resume audio context if needed
                      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                        await audioContextRef.current.resume();
                      }
                      await audio.play();
                      setIsPlaying(true);
                      startWaveformAnimation();
                    } catch (error) {
                      console.error('Error auto-playing next track:', error);
                    }
                  } else {
                    // Last track finished, reset to beginning
                    setCurrentTrackIndex(0);
                    setCurrentTime(0);
                    setDuration(0);
                  }
                }}
                onPlay={() => {
                  setIsPlaying(true);
                  startWaveformAnimation();
                }}
                onPause={() => {
                  setIsPlaying(false);
                  if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                  }
                }}
                style={{ display: 'none' }}
              />
            </PlaylistContainer>
          </AudioSection>
        </ContentSection>
      )}

      {product.features && product.features.length > 0 && (
        <ContentSection>
          <SectionTitle>Features</SectionTitle>
          <FeaturesGrid>
            {product.features.map((feature: any, index: number) => {
              // Support both old format (string) and new format (object)
              const featureTitle = typeof feature === 'string' ? feature : (feature.title || feature.name || 'Feature');
              const featureDescription = typeof feature === 'object' ? feature.description : null;
              const featureImage = typeof feature === 'object' ? (feature.image_url || feature.gif_url || feature.image) : null;
              // Alternate image position: even index = left, odd index = right
              const imageOnLeft = index % 2 === 0;
              
              return (
                <FeatureCard
                  key={index}
                  $imageOnLeft={imageOnLeft}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  {featureImage && (
                    <FeatureImageContainer>
                      <Image
                        src={featureImage}
                        alt={featureTitle}
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized={featureImage.endsWith('.gif')}
                      />
                    </FeatureImageContainer>
                  )}
                  <FeatureContent>
                    <FeatureTitle>
                      <FaCheck />
                      {featureTitle}
                    </FeatureTitle>
                    {featureDescription && (
                      <FeatureDescription>{featureDescription}</FeatureDescription>
                    )}
                  </FeatureContent>
                </FeatureCard>
              );
            })}
          </FeaturesGrid>
        </ContentSection>
      )}

      {(product.requirements || product.specifications) && (
        <ContentSection>
          <SectionTitle>Compatibility & System Requirements</SectionTitle>
          <CompatibilitySection>
            {product.requirements && (
              <CompatibilityCard>
                <CompatibilityTitle>
                  <FaDesktop />
                  System Requirements
                </CompatibilityTitle>
                <CompatibilityList>
                  {Object.entries(product.requirements).map(([key, value]: [string, any]) => {
                    // Format key: capitalize first letter, replace underscores, handle special cases
                    let formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                    // Capitalize RAM if it appears in the key
                    formattedKey = formattedKey.replace(/\bram\b/gi, 'RAM');
                    // Format value: capitalize RAM if it appears
                    let formattedValue = typeof value === 'string' ? value : String(value);
                    formattedValue = formattedValue.replace(/\bram\b/gi, 'RAM');
                    
                    return (
                      <CompatibilityItem key={key}>
                        <CompatibilityKey>{formattedKey}:</CompatibilityKey>
                        <CompatibilityValue>{formattedValue}</CompatibilityValue>
                      </CompatibilityItem>
                    );
                  })}
                </CompatibilityList>
              </CompatibilityCard>
            )}
            {product.specifications && (
              <CompatibilityCard>
                <CompatibilityTitle>
                  <FaCog />
                  Technical Specifications
                </CompatibilityTitle>
                <CompatibilityList>
                  {Object.entries(product.specifications).map(([key, value]: [string, any]) => {
                    // Format value: capitalize RAM if it appears
                    let formattedValue = typeof value === 'string' ? value : String(value);
                    formattedValue = formattedValue.replace(/\bram\b/gi, 'RAM');
                    
                    return (
                      <CompatibilityItem key={key}>
                        <CompatibilityKey>{key}:</CompatibilityKey>
                        <CompatibilityValue>{formattedValue}</CompatibilityValue>
                      </CompatibilityItem>
                    );
                  })}
                </CompatibilityList>
              </CompatibilityCard>
            )}
          </CompatibilitySection>
        </ContentSection>
      )}

      <ContentSection>
        <SectionTitle>Reviews</SectionTitle>
        <ReviewsSection>
          {product.reviews && product.reviews.length > 0 ? (
            <>
              <ReviewsHeader>
                <ReviewsSummary>
                  <AverageRating>
                    <RatingNumber>{product.average_rating?.toFixed(1) || '0.0'}</RatingNumber>
                    <RatingStars>
                      {[...Array(5)].map((_, i) => (
                        <FaStar
                          key={i}
                          style={{
                            color: i < Math.round(product.average_rating || 0) ? '#ffd700' : 'rgba(255, 255, 255, 0.2)',
                            fontSize: '1.5rem'
                          }}
                        />
                      ))}
                    </RatingStars>
                    <ReviewsCount>
                      Based on {product.review_count || product.reviews.length} {product.review_count === 1 ? 'review' : 'reviews'}
                    </ReviewsCount>
                  </AverageRating>
                </ReviewsSummary>
              </ReviewsHeader>
              <ReviewsList>
                {product.reviews.map((review: any, index: number) => (
                  <ReviewCard
                    key={review.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <ReviewHeader>
                      <ReviewAuthor>
                        <ReviewName>
                          {review.customer_name || 'Anonymous'}
                          {review.is_verified_purchase && (
                            <VerifiedBadge>
                              <FaCheckCircle size={12} />
                              Verified Purchase
                            </VerifiedBadge>
                          )}
                        </ReviewName>
                        <ReviewDate>
                          {review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : ''}
                        </ReviewDate>
                      </ReviewAuthor>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            style={{
                              color: i < review.rating ? '#ffd700' : 'rgba(255, 255, 255, 0.2)',
                              fontSize: '1rem'
                            }}
                          />
                        ))}
                      </div>
                    </ReviewHeader>
                    {review.title && (
                      <ReviewTitle>{review.title}</ReviewTitle>
                    )}
                    {review.review_text && (
                      <ReviewText>{review.review_text}</ReviewText>
                    )}
                  </ReviewCard>
                ))}
              </ReviewsList>
            </>
          ) : (
            <NoReviewsMessage>
              No reviews yet. Be the first to review this product!
            </NoReviewsMessage>
          )}
        </ReviewsSection>
      </ContentSection>

      {product.related_products && product.related_products.length > 0 && (
        <RelatedProducts>
          <ContentSection>
            <SectionTitle>Related Products</SectionTitle>
            <RelatedGrid>
              {product.related_products.map((related: any) => (
                <Link key={related.id} href={`/product/${related.slug}`}>
                  <RelatedCard
                    whileHover={{ scale: 1.02 }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '200px', background: '#1a1a1a' }}>
                      {related.featured_image_url || related.logo_url ? (
                        <Image
                          src={related.featured_image_url || related.logo_url}
                          alt={related.name}
                          fill
                          style={{ objectFit: 'contain', padding: '20px' }}
                        />
                      ) : null}
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                        {related.name}
                      </h3>
                      <div style={{ color: '#4ecdc4', fontSize: '1.3rem', fontWeight: 700 }}>
                        {((related.sale_price || related.price) === 0 || (related.sale_price || related.price) === null) 
                          ? 'FREE' 
                          : `$${related.sale_price || related.price}`}
                      </div>
                    </div>
                  </RelatedCard>
                </Link>
              ))}
            </RelatedGrid>
          </ContentSection>
        </RelatedProducts>
      )}

      {showStickyButton && product && (
        <StickyAddToCartButton
          initial={{ opacity: 0, y: 100, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 100, x: '-50%' }}
          transition={{ duration: 0.3 }}
        >
          <StickyButtonContent>
            <StickyProductImage>
              <Image
                src={product.featured_image_url || product.logo_url || ''}
                alt={product.name}
                fill
                style={{ objectFit: 'cover' }}
              />
            </StickyProductImage>
            <StickyProductInfo>
              <StickyProductName>{product.name}</StickyProductName>
              <StickyPrice>
                {(product.sale_price === 0 && product.price > 0) && (
                  <StickyPriceOriginal>${product.price}</StickyPriceOriginal>
                )}
                <StickyPriceMain>
                  {isFree ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.15rem 0.6rem',
                      background: 'linear-gradient(135deg, #4ecdc4 0%, #44a5a0 100%)',
                      color: 'white',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: '1.2'
                    }}>
                      FREE
                    </span>
                  ) : (
                    `$${displayPrice}`
                  )}
                </StickyPriceMain>
                {hasDiscount && !isFree && (
                  <StickyPriceOriginal>${product.price}</StickyPriceOriginal>
                )}
              </StickyPrice>
            </StickyProductInfo>
            <StickyButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (product) {
                  addItem({
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    sale_price: product.sale_price,
                    featured_image_url: product.featured_image_url,
                    logo_url: product.logo_url,
                  });
                  success(`${product.name} added to cart!`, 3000);
                }
              }}
            >
              <FaShoppingCart /> Add to Cart
            </StickyButton>
          </StickyButtonContent>
        </StickyAddToCartButton>
      )}
    </Container>
  );
}

