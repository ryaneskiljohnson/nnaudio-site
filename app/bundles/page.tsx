"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { Bundle } from "@/types/bundles";
import BundleMosaic from "@/components/bundles/BundleMosaic";

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 120px 20px 80px;
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
  max-width: 800px;
  margin: 0 auto;
`;

const BundlesGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const BundleCard = styled(motion.div)<{ $neonColor?: string }>`
  background: ${props => props.$neonColor 
    ? `rgba(${props.$neonColor}, 0.15)` 
    : 'rgba(255, 255, 255, 0.05)'};
  border: ${props => props.$neonColor 
    ? `2px solid rgba(${props.$neonColor}, 0.6)` 
    : '1px solid rgba(255, 255, 255, 0.1)'};
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  
  ${props => props.$neonColor && `
    box-shadow: 0 8px 32px rgba(${props.$neonColor}, 0.3);
    
    &::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(135deg, rgba(${props.$neonColor}, 0.5), rgba(${props.$neonColor}, 0.3));
      border-radius: 16px;
      z-index: -1;
      opacity: 0.6;
      filter: blur(8px);
    }
  `}
  
  &:hover {
    background: ${props => props.$neonColor 
      ? `rgba(${props.$neonColor}, 0.2)` 
      : 'rgba(255, 255, 255, 0.08)'};
    border-color: ${props => props.$neonColor 
      ? `rgba(${props.$neonColor}, 0.9)` 
      : 'rgba(78, 205, 196, 0.5)'};
    transform: translateY(-4px);
    box-shadow: ${props => props.$neonColor 
      ? `0 12px 40px rgba(${props.$neonColor}, 0.5), 0 0 20px rgba(${props.$neonColor}, 0.3)` 
      : '0 8px 32px rgba(78, 205, 196, 0.2)'};
  }
`;

const BundleHeader = styled.div`
  margin-bottom: 1.5rem;
`;

const BundleName = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const BundleCategory = styled.span`
  display: inline-block;
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(78, 205, 196, 0.3), rgba(68, 160, 141, 0.3));
  color: #4ECDC4;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const BundleTagline = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
  text-align: center;
  line-height: 1.5;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    white-space: normal;
  }
`;

const BundleDescription = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  height: calc(1.6em * 3);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: center;
`;

const PricingSection = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(78, 205, 196, 0.1);
  border-radius: 8px;
`;

const PricingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const PricingLabel = styled.span`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const PricingValue = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: #4ECDC4;
`;

const ProductCount = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1rem;
`;

const ViewBundleButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 14px 32px;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  width: 100%;
  margin-top: 1rem;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
  }
`;


interface BundleWithPricing extends Bundle {
  pricing: {
    monthly?: { price: number; sale_price?: number };
    annual?: { price: number; sale_price?: number };
    lifetime?: { price: number; sale_price?: number };
  };
  products?: Array<{
    id: string;
    name: string;
    featured_image_url?: string;
    logo_url?: string;
  }>;
  totalProductCount?: number;
  isSubscriptionBundle?: boolean;
  bundle_type?: string;
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<BundleWithPricing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bundles?status=active');
      const data = await response.json();

      if (data.success) {
        // Reorder bundles: Producer's Arsenal (left), Ultimate Bundle (middle), Beat Lab (right)
        const reorderedBundles = [...data.bundles].sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          
          // Define order: Producer's Arsenal (0), Ultimate Bundle (1), Beat Lab (2)
          const getOrder = (name: string) => {
            if (name.includes("producer's") || name.includes('producers')) return 0;
            if (name.includes('ultimate')) return 1;
            if (name.includes('beat lab')) return 2;
            return 999; // Other bundles go to the end
          };
          
          return getOrder(aName) - getOrder(bName);
        });
        
        setBundles(reorderedBundles);
      }
    } catch (error) {
      console.error('Error fetching bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (!price && price !== 0) return 'N/A';
    if (price === 0) return 'FREE';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `$${numPrice.toFixed(2)}`;
  };

  const getBestPrice = (bundle: BundleWithPricing) => {
    const { pricing } = bundle;
    if (!pricing) return null;
    const prices = [
      pricing.lifetime?.sale_price || pricing.lifetime?.price,
      pricing.annual?.sale_price || pricing.annual?.price,
      pricing.monthly?.sale_price || pricing.monthly?.price,
    ].filter(p => p !== undefined && p !== null) as number[];
    
    if (prices.length === 0) return null;
    return Math.min(...prices);
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Loading bundles...</Title>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Elite Bundles</Title>
        <Subtitle>
          Get access to curated collections of our best products with exclusive bundle pricing.
        </Subtitle>
        <Subtitle>
          Choose from monthly, annual, or lifetime subscriptions.
        </Subtitle>
      </Header>

      <BundlesGrid>
        {bundles.map((bundle) => {
          const bestPrice = getBestPrice(bundle);
          const bundleName = bundle.name.toLowerCase();
          
          // Assign different neon colors to each bundle
          let neonColor: string | undefined;
          if (bundleName.includes("producer's") || bundleName.includes('producers')) {
            // Producer's Arsenal - Cyan/Blue neon
            neonColor = '0, 255, 255'; // Cyan
          } else if (bundleName.includes('ultimate')) {
            // Ultimate Bundle - Purple neon
            neonColor = '108, 99, 255'; // Purple
          } else if (bundleName.includes('beat lab')) {
            // Beat Lab - Pink/Magenta neon
            neonColor = '255, 0, 255'; // Magenta
          }
          
          return (
            <BundleCard
              key={bundle.id}
              $neonColor={neonColor}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Bundle Featured Image */}
              {bundle.featured_image_url ? (
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  marginBottom: '1.5rem',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  background: 'rgba(0, 0, 0, 0.3)'
                }}>
                  <Image
                    src={bundle.featured_image_url}
                    alt={bundle.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent)',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      color: '#000',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '25px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)',
                      letterSpacing: '0.5px'
                    }}>
                      {bundle.totalProductCount || 0} {bundle.totalProductCount === 1 ? 'Product' : 'Products'} Included
                    </div>
                  </div>
                </div>
              ) : bundle.products && bundle.products.length > 0 ? (
                <BundleMosaic 
                  products={bundle.products} 
                  totalCount={bundle.totalProductCount || bundle.products.length}
                />
              ) : null}

              <BundleHeader>
                <BundleName>{bundle.name}</BundleName>
                {bundle.tagline && (
                  <BundleTagline>{bundle.tagline}</BundleTagline>
                )}
                {bundle.short_description && (
                  <BundleDescription>{bundle.short_description}</BundleDescription>
                )}
              </BundleHeader>

              <PricingSection>
                {bundle.pricing?.lifetime && (
                  <PricingRow>
                    <PricingLabel>Lifetime:</PricingLabel>
                    <PricingValue>
                      {formatPrice(
                        bundle.pricing.lifetime.sale_price || bundle.pricing.lifetime.price
                      )}
                    </PricingValue>
                  </PricingRow>
                )}
                {bundle.pricing?.annual && (
                  <PricingRow>
                    <PricingLabel>Annual:</PricingLabel>
                    <PricingValue>
                      {formatPrice(
                        bundle.pricing.annual.sale_price || bundle.pricing.annual.price
                      )}
                    </PricingValue>
                  </PricingRow>
                )}
                {bundle.pricing?.monthly && (
                  <PricingRow>
                    <PricingLabel>Monthly:</PricingLabel>
                    <PricingValue>
                      {formatPrice(
                        bundle.pricing.monthly.sale_price || bundle.pricing.monthly.price
                      )}
                    </PricingValue>
                  </PricingRow>
                )}
              </PricingSection>

              <ViewBundleButton href={`/bundles/${bundle.slug}`}>
                View Bundle Details
                <FaArrowRight />
              </ViewBundleButton>
            </BundleCard>
          );
        })}
      </BundlesGrid>
    </Container>
  );
}

