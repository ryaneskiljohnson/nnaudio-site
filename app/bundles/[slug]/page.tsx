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
  margin-bottom: 4rem;
`;

const PricingTitle = styled.h2`
  font-size: 2.5rem;
  color: white;
  margin-bottom: 3rem;
  text-align: center;
  font-weight: 700;
  letter-spacing: -0.5px;
`;

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    max-width: 500px;
  }
`;

const PricingCard = styled(motion.div)<{ $featured?: boolean }>`
  background: ${props => props.$featured 
    ? 'linear-gradient(135deg, rgba(108, 99, 255, 0.15), rgba(138, 43, 226, 0.15))'
    : 'rgba(255, 255, 255, 0.03)'};
  border: ${props => props.$featured 
    ? '2px solid rgba(108, 99, 255, 0.6)'
    : '1px solid rgba(255, 255, 255, 0.1)'};
  border-radius: 20px;
  padding: 2.5rem 2rem;
  text-align: center;
  position: relative;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  
  ${props => props.$featured && `
    transform: scale(1.05);
    box-shadow: 0 20px 60px rgba(108, 99, 255, 0.3),
                0 0 40px rgba(138, 43, 226, 0.2);
    
    &::before {
      content: 'BEST VALUE';
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #6c63ff, #8a2be2);
      color: white;
      padding: 6px 20px;
      border-radius: 25px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 1px;
      box-shadow: 0 4px 15px rgba(108, 99, 255, 0.5);
      z-index: 1;
    }
    
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(135deg, rgba(108, 99, 255, 0.4), rgba(138, 43, 226, 0.4));
      border-radius: 20px;
      z-index: -1;
      opacity: 0.6;
      filter: blur(12px);
    }
  `}
  
  &:hover {
    transform: ${props => props.$featured ? 'scale(1.08)' : 'translateY(-5px)'};
    border-color: ${props => props.$featured 
      ? 'rgba(108, 99, 255, 0.9)'
      : 'rgba(255, 255, 255, 0.2)'};
    box-shadow: ${props => props.$featured
      ? '0 25px 70px rgba(108, 99, 255, 0.4), 0 0 50px rgba(138, 43, 226, 0.3)'
      : '0 15px 40px rgba(0, 0, 0, 0.3)'};
  }
`;

const PricingType = styled.h3`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1.5rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const PriceContainer = styled.div`
  margin-bottom: 1rem;
`;

const Price = styled.div`
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  line-height: 1.2;
`;

const SalePrice = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  line-height: 1.2;
`;

const OriginalPrice = styled.div`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.4);
  text-decoration: line-through;
  margin-bottom: 0.25rem;
  font-weight: 500;
`;

const SubscribeButton = styled.button`
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  color: white;
  border: none;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: auto;
  box-shadow: 0 4px 20px rgba(108, 99, 255, 0.4);
  letter-spacing: 0.5px;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(108, 99, 255, 0.6);
    background: linear-gradient(135deg, #7c73ff, #9a3bf2);
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TopSection = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 4rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const BundleImageContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const ImageOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4));
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ValueSection = styled.div`
  position: relative;
  z-index: 3;
  text-align: center;
  padding: 3rem 2.5rem;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const ProductCountBadge = styled.div`
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #000;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-size: 1.2rem;
  font-weight: 800;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5),
              0 0 30px rgba(255, 215, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  display: inline-block;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 0.6rem 1.25rem;
  }
`;

const ValueTitle = styled.h2`
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const ValueAmount = styled.div`
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.75rem;
  line-height: 1.2;
`;

const SavingsText = styled.p`
  font-size: 0.9rem;
  color: rgba(108, 99, 255, 1);
  font-weight: 700;
  margin-top: 0.75rem;
  padding: 8px 16px;
  background: rgba(108, 99, 255, 0.2);
  border: 1px solid rgba(108, 99, 255, 0.4);
  border-radius: 25px;
  display: inline-block;
  letter-spacing: 0.5px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Spacer = styled.div`
  margin-top: 0.75rem;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
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

const ProductNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
`;

const ProductName = styled.h3`
  font-size: 1.2rem;
  color: white;
  margin: 0;
`;

const ProductCategory = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ECDC4;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
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

  const formatCategory = (category: string | null | undefined, productName?: string) => {
    if (!category) return 'Product';
    
    // Special case for Cymasphere
    if (productName?.toLowerCase() === 'cymasphere' && category === 'application') {
      return 'MIDI Application / Plugin';
    }
    
    const categoryMap: Record<string, string> = {
      'audio-fx-plugin': 'Audio FX Plugin',
      'instrument-plugin': 'Instrument Plugin',
      'application': 'Application',
      'pack': 'Pack',
      'bundle': 'Bundle',
      'preset': 'Preset',
    };
    
    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
  };

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

        <TopSection>
          <BundleImageContainer>
            {bundle.featured_image_url ? (
              <Image
                src={bundle.featured_image_url}
                alt={bundle.name}
                fill
                style={{ objectFit: 'cover', objectPosition: 'center' }}
                unoptimized
              />
            ) : (
              <Image
                src="/images/nnaud-io/NNPurp1.png"
                alt={bundle.name}
                fill
                style={{ objectFit: 'contain', padding: '40px' }}
                unoptimized
              />
            )}
          </BundleImageContainer>
          <ImageOverlay>
            <ValueSection>
              {(bundle as any).isSubscriptionBundle && (
                <BundleCategory style={{ marginBottom: '1rem' }}>Elite Bundle</BundleCategory>
              )}
              <BundleName style={{ marginBottom: '0.75rem', fontSize: '2.5rem' }}>{bundle.name}</BundleName>
          {bundle.tagline && (
                <BundleTagline style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>{bundle.tagline}</BundleTagline>
          )}
          {bundle.description && (
                <BundleDescription style={{ marginBottom: '1.5rem', fontSize: '0.95rem', maxWidth: '100%' }}>
                  {bundle.description}
                </BundleDescription>
          )}
              <ProductCountBadge>
                {bundle.products?.length || 0} {bundle.products?.length === 1 ? 'Product' : 'Products'}
              </ProductCountBadge>
          <ValueTitle>Total Bundle Value</ValueTitle>
          <ValueAmount>{formatPrice(bundle.totalValue)}</ValueAmount>
          {selectedSavings && selectedSavings.amount > 0 && (
            <SavingsText>
              Save {formatPrice(selectedSavings.amount)} ({selectedSavings.percent}% off)
            </SavingsText>
          )}
        </ValueSection>
          </ImageOverlay>
        </TopSection>

        <PricingSection>
          <PricingTitle>Choose Your Subscription</PricingTitle>
          <PricingGrid>
            {bundle.pricing.monthly && (
              <PricingCard
                onClick={() => setSelectedTier('monthly')}
                $featured={false}
              >
                <PricingType>Monthly</PricingType>
                <PriceContainer>
                {bundle.pricing.monthly.sale_price ? (
                  <>
                    <SalePrice>{formatPrice(bundle.pricing.monthly.sale_price)}</SalePrice>
                    <OriginalPrice>{formatPrice(bundle.pricing.monthly.price)}</OriginalPrice>
                  </>
                ) : (
                  <Price>{formatPrice(bundle.pricing.monthly.price)}</Price>
                )}
                </PriceContainer>
                <Spacer />
                <SubscribeButton onClick={() => handleSubscribe('monthly')}>
                  Subscribe Monthly
                </SubscribeButton>
              </PricingCard>
            )}

            {bundle.pricing.annual && (
              <PricingCard
                onClick={() => setSelectedTier('annual')}
                $featured={false}
              >
                <PricingType>Annual</PricingType>
                <PriceContainer>
                {bundle.pricing.annual.sale_price ? (
                  <>
                    <SalePrice>{formatPrice(bundle.pricing.annual.sale_price)}</SalePrice>
                    <OriginalPrice>{formatPrice(bundle.pricing.annual.price)}</OriginalPrice>
                  </>
                ) : (
                  <Price>{formatPrice(bundle.pricing.annual.price)}</Price>
                )}
                </PriceContainer>
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
                $featured={true}
              >
                <PricingType>Lifetime</PricingType>
                <PriceContainer>
                {bundle.pricing.lifetime.sale_price ? (
                  <>
                    <SalePrice>{formatPrice(bundle.pricing.lifetime.sale_price)}</SalePrice>
                    <OriginalPrice>{formatPrice(bundle.pricing.lifetime.price)}</OriginalPrice>
                  </>
                ) : (
                  <Price>{formatPrice(bundle.pricing.lifetime.price)}</Price>
                )}
                </PriceContainer>
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
                    <ProductNameRow>
                    <ProductName>{product.name}</ProductName>
                      <ProductCategory>{formatCategory(product.category || '', product.name)}</ProductCategory>
                    </ProductNameRow>
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

