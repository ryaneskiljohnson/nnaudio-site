"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { Bundle } from "@/types/bundles";

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 120px 20px 80px;
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 4rem;
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
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BundleCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(78, 205, 196, 0.5);
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(78, 205, 196, 0.2);
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
`;

const BundleTagline = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
`;

const BundleDescription = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin-bottom: 1.5rem;
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
  gap: 0.5rem;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4ECDC4, #44A08D);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(78, 205, 196, 0.4);
  }
`;

interface BundleWithPricing extends Bundle {
  pricing: {
    monthly?: { price: number; sale_price?: number };
    annual?: { price: number; sale_price?: number };
    lifetime?: { price: number; sale_price?: number };
  };
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
        setBundles(data.bundles);
      }
    } catch (error) {
      console.error('Error fetching bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A';
    if (price === 0) return 'FREE';
    return `$${price.toFixed(2)}`;
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
        <Title>Subscription Bundles</Title>
        <Subtitle>
          Get access to curated collections of our best products with exclusive bundle pricing.
          Choose from monthly, annual, or lifetime subscriptions.
        </Subtitle>
      </Header>

      <BundlesGrid>
        {bundles.map((bundle) => {
          const bestPrice = getBestPrice(bundle);
          
          return (
            <BundleCard
              key={bundle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
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

