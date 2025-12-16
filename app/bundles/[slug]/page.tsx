"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaCheckCircle, FaArrowLeft, FaShoppingCart, FaHome } from "react-icons/fa";
import { useCart } from "@/contexts/CartContext";
import { BundleWithProducts } from "@/types/bundles";
import { cleanHtmlText } from "@/utils/stringUtils";

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 120px 20px 80px;
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const BreadcrumbContainer = styled.div`
  margin-bottom: 2rem;
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

const Header = styled.div`
  margin-bottom: 3rem;
  text-align: center;
`;

const BundleName = styled.h1`
  font-size: 3.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const BundleCategory = styled.span`
  display: inline-block;
  padding: 8px 20px;
  background: linear-gradient(135deg, rgba(78, 205, 196, 0.3), rgba(68, 160, 141, 0.3));
  color: #4ECDC4;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const BundleTagline = styled.p`
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1rem;
`;

const BundleDescription = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
  max-width: 800px;
  margin: 0 auto;
`;

const PricingSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 3rem;
`;

const PricingTitle = styled.h2`
  font-size: 2rem;
  color: white;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const PricingCard = styled(motion.div)<{ featured?: boolean }>`
  background: ${props => props.featured 
    ? 'linear-gradient(135deg, rgba(78, 205, 196, 0.2), rgba(68, 160, 141, 0.2))'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.featured 
    ? 'rgba(78, 205, 196, 0.5)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  
  ${props => props.featured && `
    transform: scale(1.05);
    
    &::before {
      content: 'BEST VALUE';
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4ECDC4, #44A08D);
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
    }
  `}
`;

const PricingType = styled.h3`
  font-size: 1.2rem;
  color: white;
  margin-bottom: 1rem;
`;

const Price = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #4ECDC4;
  margin-bottom: 0.5rem;
`;

const SalePrice = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #4ECDC4;
  margin-bottom: 0.5rem;
`;

const OriginalPrice = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: line-through;
  margin-bottom: 0.5rem;
`;

const SubscribeButton = styled.button`
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4ECDC4, #44A08D);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(78, 205, 196, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ValueSection = styled.div`
  background: rgba(78, 205, 196, 0.1);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 3rem;
  text-align: center;
`;

const ValueTitle = styled.h2`
  font-size: 1.5rem;
  color: white;
  margin-bottom: 1rem;
`;

const ValueAmount = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: #4ECDC4;
  margin-bottom: 0.5rem;
`;

const SavingsText = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ProductsSection = styled.div`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  color: white;
  margin-bottom: 2rem;
  text-align: center;
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ProductCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    border-color: rgba(78, 205, 196, 0.5);
    box-shadow: 0 8px 32px rgba(78, 205, 196, 0.2);
  }
`;

const ProductImage = styled.div`
  position: relative;
  width: 100%;
  height: 200px;
  background: rgba(255, 255, 255, 0.05);
`;

const ProductInfo = styled.div`
  padding: 1.5rem;
`;

const ProductName = styled.h3`
  font-size: 1.2rem;
  color: white;
  margin-bottom: 0.5rem;
`;

const ProductCategory = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ECDC4;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
`;

const ProductPrice = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #4ECDC4;
  margin-top: 0.5rem;
`;

export default function BundleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [bundle, setBundle] = useState<BundleWithProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<'monthly' | 'annual' | 'lifetime'>('lifetime');
  const [slug, setSlug] = useState<string>('');

  useEffect(() => {
    params.then(({ slug }) => {
      setSlug(slug);
      if (slug) {
        fetchBundle(slug);
      }
    });
  }, [params]);

  const fetchBundle = async (slug: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bundles/${slug}`);
      const data = await response.json();

      if (data.success) {
        setBundle(data.bundle);
      }
    } catch (error) {
      console.error('Error fetching bundle:', error);
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

  const handleSubscribe = (tier: 'monthly' | 'annual' | 'lifetime') => {
    // TODO: Implement Stripe checkout for bundle subscriptions
    console.log('Subscribe to bundle:', bundle?.name, 'Tier:', tier);
    // This will integrate with Stripe checkout
  };

  if (loading) {
    return (
      <Container>
        <Content>
          <Header>
            <BundleName>Loading...</BundleName>
          </Header>
        </Content>
      </Container>
    );
  }

  if (!bundle) {
    return (
      <Container>
        <Content>
          <Header>
            <BundleName>Bundle not found</BundleName>
          </Header>
        </Content>
      </Container>
    );
  }

  const selectedPricing = bundle.pricing[selectedTier];
  const selectedSavings = bundle.savings[selectedTier];

  return (
    <Container>
      <Content>
        <BreadcrumbContainer>
          <BreadcrumbList>
            <BreadcrumbLink href="/">
              <FaHome size={14} />
              <span>Home</span>
            </BreadcrumbLink>
            <BreadcrumbSeparator>
              <span>/</span>
            </BreadcrumbSeparator>
            <BreadcrumbLink href="/bundles">Bundles</BreadcrumbLink>
            <BreadcrumbSeparator>
              <span>/</span>
            </BreadcrumbSeparator>
            <BreadcrumbCurrent>{bundle.name}</BreadcrumbCurrent>
          </BreadcrumbList>
        </BreadcrumbContainer>

        <Header>
          {(bundle as any).isSubscriptionBundle && (
            <BundleCategory>Elite Bundle</BundleCategory>
          )}
          <BundleName>{bundle.name}</BundleName>
          {bundle.tagline && (
            <BundleTagline>{bundle.tagline}</BundleTagline>
          )}
          {bundle.description && (
            <BundleDescription>{bundle.description}</BundleDescription>
          )}
        </Header>

        <ValueSection>
          <ValueTitle>Total Bundle Value</ValueTitle>
          <ValueAmount>{formatPrice(bundle.totalValue)}</ValueAmount>
          {selectedSavings && selectedSavings.amount > 0 && (
            <SavingsText>
              Save {formatPrice(selectedSavings.amount)} ({selectedSavings.percent}% off)
            </SavingsText>
          )}
        </ValueSection>

        <PricingSection>
          <PricingTitle>Choose Your Subscription</PricingTitle>
          <PricingGrid>
            {bundle.pricing.monthly && (
              <PricingCard
                onClick={() => setSelectedTier('monthly')}
                featured={selectedTier === 'monthly' ? true : undefined}
              >
                <PricingType>Monthly</PricingType>
                {bundle.pricing.monthly.sale_price ? (
                  <>
                    <SalePrice>{formatPrice(bundle.pricing.monthly.sale_price)}</SalePrice>
                    <OriginalPrice>{formatPrice(bundle.pricing.monthly.price)}</OriginalPrice>
                  </>
                ) : (
                  <Price>{formatPrice(bundle.pricing.monthly.price)}</Price>
                )}
                <SubscribeButton onClick={() => handleSubscribe('monthly')}>
                  Subscribe Monthly
                </SubscribeButton>
              </PricingCard>
            )}

            {bundle.pricing.annual && (
              <PricingCard
                onClick={() => setSelectedTier('annual')}
                featured={selectedTier === 'annual' ? true : undefined}
              >
                <PricingType>Annual</PricingType>
                {bundle.pricing.annual.sale_price ? (
                  <>
                    <SalePrice>{formatPrice(bundle.pricing.annual.sale_price)}</SalePrice>
                    <OriginalPrice>{formatPrice(bundle.pricing.annual.price)}</OriginalPrice>
                  </>
                ) : (
                  <Price>{formatPrice(bundle.pricing.annual.price)}</Price>
                )}
                {bundle.savings.annual && bundle.savings.annual.percent > 0 && (
                  <SavingsText>
                    Save {bundle.savings.annual.percent}%
                  </SavingsText>
                )}
                <SubscribeButton onClick={() => handleSubscribe('annual')}>
                  Subscribe Annually
                </SubscribeButton>
              </PricingCard>
            )}

            {bundle.pricing.lifetime && (
              <PricingCard
                onClick={() => setSelectedTier('lifetime')}
                featured={selectedTier === 'lifetime' ? true : undefined}
              >
                <PricingType>Lifetime</PricingType>
                {bundle.pricing.lifetime.sale_price ? (
                  <>
                    <SalePrice>{formatPrice(bundle.pricing.lifetime.sale_price)}</SalePrice>
                    <OriginalPrice>{formatPrice(bundle.pricing.lifetime.price)}</OriginalPrice>
                  </>
                ) : (
                  <Price>{formatPrice(bundle.pricing.lifetime.price)}</Price>
                )}
                {bundle.savings.lifetime && bundle.savings.lifetime.percent > 0 && (
                  <SavingsText>
                    Save {bundle.savings.lifetime.percent}%
                  </SavingsText>
                )}
                <SubscribeButton onClick={() => handleSubscribe('lifetime')}>
                  Buy Lifetime
                </SubscribeButton>
              </PricingCard>
            )}
          </PricingGrid>
        </PricingSection>

        <ProductsSection>
          <SectionTitle>Products Included ({bundle.products.length})</SectionTitle>
          <ProductsGrid>
            {bundle.products.map((product) => (
              <ProductCard
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link href={`/product/${product.slug}`} style={{ textDecoration: 'none' }}>
                  <ProductImage>
                    {product.featured_image_url || product.logo_url ? (
                      <Image
                        src={product.featured_image_url || product.logo_url || ''}
                        alt={product.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized
                        onError={(e) => {
                          // Fallback to NNAudio logo if image fails
                          const target = e.target as HTMLImageElement;
                          if (target.src !== '/images/nnaud-io/NNPurp1.png') {
                            target.src = '/images/nnaud-io/NNPurp1.png';
                          }
                        }}
                      />
                    ) : (
                      <Image
                        src="/images/nnaud-io/NNPurp1.png"
                        alt={product.name}
                        fill
                        style={{ objectFit: 'contain', padding: '20px' }}
                        unoptimized
                      />
                    )}
                  </ProductImage>
                  <ProductInfo>
                    <ProductCategory>{product.category}</ProductCategory>
                    <ProductName>{product.name}</ProductName>
                    {product.tagline && (
                      <p style={{ 
                        fontSize: '0.9rem', 
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginBottom: '0.5rem'
                      }}>
                        {cleanHtmlText(product.tagline)}
                      </p>
                    )}
                    <ProductPrice>
                      {product.sale_price && product.sale_price > 0 ? (
                        <>
                          <span style={{ 
                            textDecoration: 'line-through', 
                            color: 'rgba(255, 255, 255, 0.5)',
                            marginRight: '0.5rem'
                          }}>
                            {formatPrice(product.price)}
                          </span>
                          {formatPrice(product.sale_price)}
                        </>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </ProductPrice>
                  </ProductInfo>
                </Link>
              </ProductCard>
            ))}
          </ProductsGrid>
        </ProductsSection>
      </Content>
    </Container>
  );
}

