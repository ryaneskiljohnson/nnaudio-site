"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaStar, FaShoppingCart, FaDownload, FaCheck, FaPlay, FaMusic, FaVideo } from "react-icons/fa";
import { useParams } from "next/navigation";

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
`;

const HeroSection = styled.section<{ $bgImage?: string }>`
  padding: 140px 20px 80px;
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
  color: #8a2be2;
`;

const OriginalPrice = styled.div`
  font-size: 1.5rem;
  color: var(--text-secondary);
  text-decoration: line-through;
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
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  color: white;
  margin-bottom: 2rem;
  font-weight: 700;
`;

const Description = styled.div`
  font-size: 1.1rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 3rem;
  
  p {
    margin-bottom: 1rem;
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const FeatureCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  
  svg {
    color: #4ecdc4;
    font-size: 1.5rem;
    flex-shrink: 0;
    margin-top: 4px;
  }
`;

const FeatureText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
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

const AudioPlayer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const AudioInfo = styled.div`
  flex: 1;
  color: white;
`;

const AudioName = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: rgba(255, 255, 255, 0.9);
`;

const AudioControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PlayButton = styled.button`
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 15px rgba(138, 43, 226, 0.4);
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
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/slug/${slug}`);
      const data = await response.json();

      if (data.success) {
        setProduct(data.product);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingContainer>Loading product...</LoadingContainer>;
  }

  if (!product) {
    return <LoadingContainer>Product not found</LoadingContainer>;
  }

  const displayPrice = product.sale_price || product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;

  return (
    <Container>
      <HeroSection $bgImage={product.background_image_url || product.background_video_url}>
        <HeroContent>
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
                {product.tagline}
              </ProductTagline>
            )}

            {product.review_count > 0 && (
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
              <Price>${displayPrice}</Price>
              {hasDiscount && (
                <OriginalPrice>${product.price}</OriginalPrice>
              )}
            </PriceContainer>

            <BuyButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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
            {product.description.split('\n').map((paragraph: string, i: number) => (
              <p key={i}>{paragraph}</p>
            ))}
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

      {product.audio_samples && product.audio_samples.length > 0 && (
        <ContentSection>
          <SectionTitle>
            <FaMusic style={{ marginRight: '10px', display: 'inline' }} />
            Audio Samples
          </SectionTitle>
          <AudioSection>
            {product.audio_samples.map((audio: any, index: number) => (
              <AudioPlayer key={index}>
                <AudioInfo>
                  <AudioName>{audio.name || `Sample ${index + 1}`}</AudioName>
                </AudioInfo>
                <AudioControls>
                  <audio controls style={{ flex: 1, maxWidth: '400px' }}>
                    <source src={audio.url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </AudioControls>
              </AudioPlayer>
            ))}
          </AudioSection>
        </ContentSection>
      )}

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

      {product.features && product.features.length > 0 && (
        <ContentSection>
          <SectionTitle>Features</SectionTitle>
          <FeaturesGrid>
            {product.features.map((feature: string, index: number) => (
              <FeatureCard
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <FaCheck />
                <FeatureText>{feature}</FeatureText>
              </FeatureCard>
            ))}
          </FeaturesGrid>
        </ContentSection>
      )}

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
                      <div style={{ color: '#8a2be2', fontSize: '1.3rem', fontWeight: 700 }}>
                        ${related.sale_price || related.price}
                      </div>
                    </div>
                  </RelatedCard>
                </Link>
              ))}
            </RelatedGrid>
          </ContentSection>
        </RelatedProducts>
      )}
    </Container>
  );
}

