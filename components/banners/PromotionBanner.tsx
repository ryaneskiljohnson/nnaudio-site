"use client";

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaFire, FaGift, FaArrowRight, FaTimes } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckout } from '@/hooks/useCheckout';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import EmailCollectionModal from '../modals/EmailCollectionModal';

const BannerContainer = styled(motion.div)<{ $background: string; $variant: 'sticky' | 'card' }>`
  background: ${props => props.$background};
  padding: ${props => props.$variant === 'card' ? '2rem' : '1rem 2rem'};
  position: ${props => props.$variant === 'sticky' ? 'sticky' : 'relative'};
  top: ${props => props.$variant === 'sticky' ? '70px' : 'auto'};
  overflow: hidden;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  /* For sticky header banner, stay above nav; for card variant, stay above background canvas */
  z-index: ${props => props.$variant === 'sticky' ? '3001' : '5'};
  display: flex;
  align-items: center;
  min-height: ${props => props.$variant === 'card' ? '120px' : '60px'};
  border-radius: ${props => props.$variant === 'card' ? '16px' : '0'};
  margin: ${props => props.$variant === 'card' ? '2rem auto' : '0'};
  max-width: ${props => props.$variant === 'card' ? '900px' : '100%'};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    animation: shimmer 3s infinite;
    pointer-events: none;
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
  
  @media (max-width: 768px) {
    padding: ${props => props.$variant === 'card' ? '1.5rem 1rem' : '1rem'};
    top: ${props => props.$variant === 'sticky' ? '64px' : 'auto'};
    min-height: ${props => props.$variant === 'card' ? '100px' : '50px'};
  }
`;

const BannerContent = styled.div<{ $textColor: string; $variant: 'sticky' | 'card' }>`
  position: relative;
  z-index: 1;
  color: ${props => props.$textColor};
  display: ${props => props.$variant === 'sticky' ? 'grid' : 'flex'};
  grid-template-columns: ${props => props.$variant === 'sticky' ? '1fr auto 1fr' : 'none'};
  flex-direction: ${props => props.$variant === 'card' ? 'column' : 'row'};
  align-items: center;
  gap: ${props => props.$variant === 'card' ? '1.5rem' : '2rem'};
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  text-align: ${props => props.$variant === 'card' ? 'center' : 'left'};

  @media (max-width: 968px) {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }
`;

const BannerTitle = styled.h2<{ $accentColor: string; $variant?: 'sticky' | 'card' }>`
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  white-space: nowrap;

  .fire-icon {
    color: ${props => props.$accentColor};
    animation: pulse 1.5s ease-in-out infinite;
    font-size: 1.25rem;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }

  @media (max-width: 968px) {
    font-size: 1.25rem;
    white-space: normal;
    text-align: center;
    
    .fire-icon {
      font-size: 1rem;
    }
  }

  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const BannerTextContent = styled.div<{ $variant: 'sticky' | 'card' }>`
  grid-column: ${props => props.$variant === 'sticky' ? '2' : 'auto'};
  text-align: center;
  min-width: 0;

  @media (max-width: 968px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
`;

const BannerDescription = styled.p<{ $variant?: 'sticky' | 'card' }>`
  font-size: 0.9rem;
  margin: 0;
  font-weight: 500;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 968px) {
    font-size: 0.85rem;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    max-width: 100%;
  }
`;

const CountdownContainer = styled.div<{ $variant: 'sticky' | 'card' }>`
  display: flex;
  gap: ${props => props.$variant === 'card' ? '1rem' : '0.5rem'};
  align-items: center;
  flex-shrink: 0;
  grid-column: ${props => props.$variant === 'sticky' ? '1' : 'auto'};
  justify-self: ${props => props.$variant === 'sticky' ? 'end' : 'center'};

  @media (max-width: 968px) {
    grid-column: auto;
    justify-self: center;
  }

  @media (max-width: 480px) {
    gap: 0.25rem;
  }
`;

const CountdownBox = styled.div<{ $accentColor: string; $variant: 'sticky' | 'card' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  padding: ${props => props.$variant === 'card' ? '0.75rem 1rem' : '0.4rem 0.5rem'};
  border-radius: ${props => props.$variant === 'card' ? '8px' : '6px'};
  border: 1px solid rgba(255, 215, 0, 0.3);
  width: ${props => props.$variant === 'card' ? '70px' : '45px'};
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);

  @media (max-width: 480px) {
    width: ${props => props.$variant === 'card' ? '60px' : '35px'};
    padding: ${props => props.$variant === 'card' ? '0.6rem 0.75rem' : '0.3rem 0.4rem'};
  }
`;

const CountdownNumber = styled.div<{ $variant: 'sticky' | 'card' }>`
  font-size: ${props => props.$variant === 'card' ? '2rem' : '1.1rem'};
  font-weight: 800;
  line-height: 1;
  color: #000;

  @media (max-width: 480px) {
    font-size: ${props => props.$variant === 'card' ? '1.5rem' : '0.9rem'};
  }
`;

const CountdownLabel = styled.div<{ $variant: 'sticky' | 'card' }>`
  font-size: ${props => props.$variant === 'card' ? '0.75rem' : '0.6rem'};
  opacity: 0.7;
  margin-top: 0.1rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #000;

  @media (max-width: 480px) {
    font-size: ${props => props.$variant === 'card' ? '0.65rem' : '0.55rem'};
  }
`;

const BannerButton = styled.button<{ $variant: 'sticky' | 'card' }>`
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  border: none;
  padding: ${props => props.$variant === 'card' ? '16px 40px' : '14px 32px'};
  border-radius: 30px;
  font-size: ${props => props.$variant === 'card' ? '1.2rem' : '1.05rem'};
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 6px 25px rgba(255, 215, 0, 0.5);
  white-space: nowrap;
  flex-shrink: 0;
  grid-column: ${props => props.$variant === 'sticky' ? '3' : 'auto'};
  justify-self: ${props => props.$variant === 'sticky' ? 'start' : 'center'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: pulse-glow 2s ease-in-out infinite;

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 6px 25px rgba(255, 215, 0, 0.5);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 6px 35px rgba(255, 215, 0, 0.8);
      transform: scale(1.03);
    }
  }

  &:hover:not(:disabled) {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 8px 35px rgba(255, 215, 0, 0.8);
    background: linear-gradient(135deg, #FFE44D, #FFB733);
    animation: none;
  }

  &:active:not(:disabled) {
    transform: translateY(-1px) scale(1.02);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    animation: none;
  }

  svg {
    font-size: 1.05rem;
  }

  @media (max-width: 968px) {
    grid-column: auto;
    justify-self: center;
    font-size: ${props => props.$variant === 'card' ? '1.1rem' : '1rem'};
    padding: ${props => props.$variant === 'card' ? '14px 32px' : '12px 28px'};
  }

  @media (max-width: 480px) {
    font-size: 0.95rem;
    padding: 10px 24px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: rgba(255, 255, 255, 0.9);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  z-index: 10;
  backdrop-filter: blur(5px);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-50%) scale(1.1);
    color: white;
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }

  @media (max-width: 768px) {
    width: 24px;
    height: 24px;
    font-size: 0.8rem;
    right: 0.5rem;
  }
`;

interface PromotionBannerProps {
  showCountdown?: boolean;
  dismissible?: boolean;
  variant?: 'sticky' | 'card';
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  end_date: string | null;
  applicable_plans: string[];
  banner_theme: {
    background: string;
    textColor: string;
    accentColor: string;
  };
}

export default function PromotionBanner({ showCountdown = true, dismissible = true, variant = 'sticky' }: PromotionBannerProps) {
  const { user } = useAuth();
  
  // CRITICAL: Check for lifetime FIRST before any other logic
  // Hide banner immediately for lifetime users - they don't need promotions
  if (user?.profile?.subscription === 'lifetime') {
    return null;
  }

  const { t } = useTranslation();
  const [sale, setSale] = React.useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const { initiateCheckout } = useCheckout();
  const router = useRouter();

  // Check if banner was previously closed (only if dismissible)
  React.useEffect(() => {
    if (!dismissible) return;
    
    const closedBanners = localStorage.getItem('closedPromotionBanners');
    if (closedBanners) {
      try {
        const closedIds = JSON.parse(closedBanners);
        // Will check against sale.id once we have it
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, [dismissible]);

  // Fetch active promotion - Skip for lifetime users
  React.useEffect(() => {
    // Don't fetch promotions for lifetime users
    if (user?.profile?.subscription === 'lifetime') {
      setSale(null);
      return;
    }

    const fetchPromotion = async () => {
      try {
        const response = await fetch('/api/promotions/active');
        const data = await response.json();
        
        if (data.success && data.promotion) {
          // Check if this promotion was previously closed (only if dismissible)
          if (dismissible) {
            const closedBanners = localStorage.getItem('closedPromotionBanners');
            if (closedBanners) {
              try {
                const closedIds = JSON.parse(closedBanners);
                if (closedIds.includes(data.promotion.id)) {
                  setIsClosed(true);
                  return;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }

          setSale(data.promotion);
          
          // Track promotion view
          fetch('/api/promotions/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              promotion_id: data.promotion.id,
              type: 'view',
            }),
          }).catch(err => console.error('Failed to track promotion view:', err));
        }
      } catch (error) {
        console.error('Error fetching promotion:', error);
      }
    };

    fetchPromotion();
  }, [dismissible, user?.profile?.subscription]);
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  React.useEffect(() => {
    if (!showCountdown || !sale?.end_date) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = new Date(sale.end_date!).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [showCountdown, sale?.end_date]);

  if (!sale) return null;

  // Use softer default colors if banner_theme not set
  const theme = sale.banner_theme || {
    background: 'linear-gradient(135deg, #6c63ff, #4ecdc4)',
    textColor: '#FFFFFF',
    accentColor: '#FFD700',
  };

  // Determine button behavior based on applicable_plans
  const isMultiplePlans = sale.applicable_plans && sale.applicable_plans.length > 1;
  const singlePlan = !isMultiplePlans && sale.applicable_plans?.[0];

  const handleButtonClick = async () => {
    if (isMultiplePlans) {
      // Scroll to pricing section
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (singlePlan) {
      // Handle single plan checkout
      if (!user) {
        setShowEmailModal(true);
        return;
      }

      setLoading(true);
      try {
        const planType = singlePlan as 'monthly' | 'annual' | 'lifetime';
        await initiateCheckout(planType, {
          collectPaymentMethod: false,
          willProvideCard: false,
        });
      } catch (error) {
        console.error('Checkout error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEmailSubmit = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!singlePlan) return { success: false, error: 'No plan selected' };
    
    setLoading(true);
    try {
      const planType = singlePlan as 'monthly' | 'annual' | 'lifetime';
      await initiateCheckout(planType, {
        collectPaymentMethod: false,
        willProvideCard: false,
        email,
      });
      return { success: true };
    } catch (error) {
      console.error('Checkout error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Checkout failed' };
    } finally {
      setLoading(false);
      setShowEmailModal(false);
    }
  };

  const handleClose = () => {
    if (!sale) return;
    
    // Save to localStorage
    const closedBanners = localStorage.getItem('closedPromotionBanners');
    let closedIds: string[] = [];
    
    if (closedBanners) {
      try {
        closedIds = JSON.parse(closedBanners);
      } catch (e) {
        closedIds = [];
      }
    }
    
    if (!closedIds.includes(sale.id)) {
      closedIds.push(sale.id);
      localStorage.setItem('closedPromotionBanners', JSON.stringify(closedIds));
    }
    
    setIsClosed(true);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('promotionBannerDismissed', { 
      detail: { promotionId: sale.id } 
    }));
  };

  const getButtonText = () => {
    if (loading) return t('common.loading', 'Loading...');
    if (isMultiplePlans) return t('promotion.viewOffers', 'View Offers');
    if (singlePlan === 'lifetime') return t('pricing.buyNow', 'Buy Now');
    return t('pricing.freeTrial.startTrial', 'Start Trial');
  };

  if (isClosed) return null;

  return (
    <BannerContainer
      $background={theme.background}
      $variant={variant}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
    >
      {dismissible && (
        <CloseButton onClick={handleClose} title="Close banner">
          <FaTimes />
        </CloseButton>
      )}
      
      <BannerContent $textColor={theme.textColor} $variant={variant}>
        {showCountdown && sale.end_date && (
          <CountdownContainer $variant={variant}>
            <CountdownBox $accentColor={theme.accentColor} $variant={variant}>
              <CountdownNumber $variant={variant}>{String(timeLeft.days).padStart(2, '0')}</CountdownNumber>
              <CountdownLabel $variant={variant}>D</CountdownLabel>
            </CountdownBox>
            <CountdownBox $accentColor={theme.accentColor} $variant={variant}>
              <CountdownNumber $variant={variant}>{String(timeLeft.hours).padStart(2, '0')}</CountdownNumber>
              <CountdownLabel $variant={variant}>H</CountdownLabel>
            </CountdownBox>
            <CountdownBox $accentColor={theme.accentColor} $variant={variant}>
              <CountdownNumber $variant={variant}>{String(timeLeft.minutes).padStart(2, '0')}</CountdownNumber>
              <CountdownLabel $variant={variant}>M</CountdownLabel>
            </CountdownBox>
            <CountdownBox $accentColor={theme.accentColor} $variant={variant}>
              <CountdownNumber $variant={variant}>{String(timeLeft.seconds).padStart(2, '0')}</CountdownNumber>
              <CountdownLabel $variant={variant}>S</CountdownLabel>
            </CountdownBox>
          </CountdownContainer>
        )}

        <BannerTextContent $variant={variant}>
          <BannerTitle $accentColor={theme.accentColor} $variant={variant}>
            <FaFire className="fire-icon" />
            {sale.title}
            <FaGift className="fire-icon" />
          </BannerTitle>
          
          {sale.description && (
            <BannerDescription $variant={variant}>{sale.description}</BannerDescription>
          )}
        </BannerTextContent>

        <BannerButton $variant={variant} onClick={handleButtonClick} disabled={loading}>
          {getButtonText()}
          <FaArrowRight />
        </BannerButton>
      </BannerContent>

      {showEmailModal && !user && (
        <EmailCollectionModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSubmit={handleEmailSubmit}
          collectPaymentMethod={true}
          trialDays={0}
        />
      )}
    </BannerContainer>
  );
}

