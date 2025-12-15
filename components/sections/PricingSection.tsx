"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
// Import Stripe actions
// Removed server action imports - now using API routes
import { PlanType } from "@/types/stripe";
// Import the NNAudioLogo component dynamically
import dynamic from "next/dynamic";
// Import useAuth hook
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
// Import common pricing components
import BillingToggle from "../pricing/BillingToggle";
import PricingCard from "../pricing/PricingCard";
import PromotionBanner from "../banners/PromotionBanner";

// Type definitions for NNAudioLogo component
interface NNAudioLogoProps {
  size?: string;
  fontSize?: string;
  showText?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

// Use dynamic import to handle JavaScript component in TypeScript
const NNAudioLogo = dynamic(() => import("../common/NNAudioLogo"), {
  ssr: false,
}) as React.ComponentType<NNAudioLogoProps>;

const PricingContainer = styled.section`
  padding: 140px 20px;
  background: radial-gradient(circle at 15% 20%, rgba(142, 65, 255, 0.18), transparent 32%),
    radial-gradient(circle at 80% 0%, rgba(78, 205, 196, 0.18), transparent 30%),
    linear-gradient(180deg, #06070f 0%, #0b0f1f 100%);
  position: relative;
  overflow: hidden;
`;

const Glow = styled.div`
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.35;
  background: radial-gradient(circle, rgba(138, 43, 226, 0.9), transparent 55%);
  top: -120px;
  left: -140px;
  pointer-events: none;
`;

const GlowRight = styled(Glow)`
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgba(78, 205, 196, 0.9), transparent 55%);
  top: 40px;
  right: -120px;
  left: auto;
`;

const ContentContainer = styled.div`
  max-width: 980px;
  margin: 0 auto;
  position: relative;
  z-index: 3;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 52px 44px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
`;

const SectionTitle = styled.h2`
  font-size: 2.4rem;
  text-align: center;
  margin-bottom: 0.4rem;
  margin-top: 0;
  position: relative;
  letter-spacing: -0.02em;
  background: linear-gradient(90deg, #8a2be2 0%, #4ecdc4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
`;

const SectionSubtitle = styled.p`
  text-align: center;
  color: rgba(255, 255, 255, 0.78);
  font-size: 1.08rem;
  max-width: 820px;
  margin: 0 auto 22px;
  line-height: 1.6;
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 24px auto 32px;
`;

const Pill = styled.span`
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-top: 22px;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px 22px;
  color: white;
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.35);
  position: relative;
  overflow: hidden;

  &:before {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: 12px;
    background: linear-gradient(140deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0));
    pointer-events: none;
  }
`;

const CardTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
`;

const CardText = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.65;
  font-size: 0.97rem;
`;

// Simplified particle element - just one subtle accent
const Particle = styled.div`
  position: absolute;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 50%;
  opacity: 0.05;
  z-index: 0;
  filter: blur(20px);
  width: 200px;
  height: 200px;
  bottom: 5%;
  right: 5%;
`;

const PricingSection = () => {
  const { t } = useTranslation();
  // Get authentication context
  const { user } = useAuth();

  // Track language to force re-render on language change
  const [language, setLanguage] = useState(() =>
    typeof window !== "undefined"
      ? (window as any).i18next?.language || "en"
      : "en"
  );

  // Effect to listen for language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      console.log(`Language changed to: ${lng}`);
      setLanguage(lng);
    };

    if (typeof window !== "undefined" && (window as any).i18next) {
      (window as any).i18next.on("languageChanged", handleLanguageChanged);
      return () => {
        (window as any).i18next.off("languageChanged", handleLanguageChanged);
      };
    }
    return undefined;
  }, []);

  // State to track the selected billing period
  const [billingPeriod, setBillingPeriod] = useState<PlanType>("monthly");
  // Set billing period to match user's current subscription when logged in
  useEffect(() => {
    if (user?.profile?.subscription && user.profile.subscription !== "none") {
      setBillingPeriod(user.profile.subscription);
    }
  }, [user?.profile?.subscription]);

  // Set billing period to match user's current subscription when logged in
  useEffect(() => {
    if (user?.profile?.subscription && user.profile.subscription !== "none") {
      setBillingPeriod(user.profile.subscription);
    }
  }, [user?.profile?.subscription]);

  // Simplify the resize effect to avoid unused variables
  useEffect(() => {
    // Just keep the event listener for resize
    const handleResize = () => {
      // Empty handler that does nothing but satisfies the dependency
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [billingPeriod]);

  // Check for active sale (fetched by banner component)
  // Skip entirely for lifetime users - they don't need promotions
  const [hasActiveSale, setHasActiveSale] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Always hide promotions for lifetime users - separate effect to ensure it runs
  // This runs whenever user or subscription changes
  useEffect(() => {
    if (user?.profile?.subscription === "lifetime") {
      console.log('🚫 User has lifetime - hiding all promotions');
      setHasActiveSale(false);
      setIsBannerDismissed(false);
    }
  }, [user?.profile?.subscription, user?.profile]);

  useEffect(() => {
    // Don't fetch promotions for lifetime users - always set to false
    if (user?.profile?.subscription === "lifetime") {
      setHasActiveSale(false);
      setIsBannerDismissed(false);
      return;
    }

    const checkActiveSale = async () => {
      try {
        const response = await fetch('/api/promotions/active');
        const data = await response.json();
        
        if (data.success && data.promotion) {
          // Check if the promotion banner has been dismissed
          const closedBanners = localStorage.getItem('closedPromotionBanners');
          if (closedBanners) {
            try {
              const closedIds = JSON.parse(closedBanners);
              if (closedIds.includes(data.promotion.id)) {
                setIsBannerDismissed(true);
              } else {
                setIsBannerDismissed(false);
              }
            } catch (e) {
              setIsBannerDismissed(false);
            }
          } else {
            setIsBannerDismissed(false);
          }
          
          setHasActiveSale(true);
        } else {
          setHasActiveSale(false);
          setIsBannerDismissed(false);
        }
      } catch (error) {
        console.error('Error checking active sale:', error);
        setHasActiveSale(false);
        setIsBannerDismissed(false);
      }
    };

    checkActiveSale();
    
    // Listen for storage changes to update when banner is dismissed (cross-tab)
    const handleStorageChange = () => {
      // Don't check if user has lifetime
      if (user?.profile?.subscription === "lifetime") {
        setHasActiveSale(false);
        setIsBannerDismissed(false);
        return;
      }
      checkActiveSale();
    };
    
    // Listen for custom event when banner is dismissed in same window
    const handleBannerDismissed = () => {
      // Don't check if user has lifetime
      if (user?.profile?.subscription === "lifetime") {
        setHasActiveSale(false);
        setIsBannerDismissed(false);
        return;
      }
      // Immediately check localStorage to update state
      const closedBanners = localStorage.getItem('closedPromotionBanners');
      if (closedBanners) {
        try {
          const closedIds = JSON.parse(closedBanners);
          // Re-check active sale to get current promotion ID and update state
          checkActiveSale();
        } catch (e) {
          // Fallback to full check
          checkActiveSale();
        }
      } else {
        setIsBannerDismissed(false);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('promotionBannerDismissed', handleBannerDismissed);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('promotionBannerDismissed', handleBannerDismissed);
    };
  }, [user?.profile?.subscription]);

  return (
    <PricingContainer id="pricing">
      <Particle />
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <SectionTitle>
            {t("pricing.simpleTransparent", "Simple, Transparent Pricing")}
          </SectionTitle>

          {/* Promotional Sale Banner - Only show if header banner has been dismissed (to avoid duplicate) and user doesn't have lifetime */}
          {/* CRITICAL: Check user subscription FIRST - never show for lifetime users */}
          {!(user?.profile?.subscription === "lifetime") && 
           hasActiveSale && 
           isBannerDismissed && 
           <PromotionBanner showCountdown={true} dismissible={false} variant="card" />}

          <SectionSubtitle>
            We keep pricing frictionless: own singles forever, bundle to save,
            or subscribe if you want fresh drops and updates rolling in.
          </SectionSubtitle>

          <PillRow>
            <Pill>One-time ownership</Pill>
            <Pill>Bundle & save</Pill>
            <Pill>Subscriptions for updates</Pill>
          </PillRow>

          <Columns>
            <Card>
              <CardTitle>Individual Products</CardTitle>
              <CardText>
                Every plugin, MIDI pack, loop pack, and preset is a one-time purchase. Buy it once,
                keep it forever. Zero subscriptions required.
              </CardText>
            </Card>
            <Card>
              <CardTitle>Bundles</CardTitle>
              <CardText>
                Get everything in a category (or everything we make) and save. Grab a one-time bundle
                to own it all, or pick monthly/annual if you want lower upfront and constant updates.
              </CardText>
            </Card>
            <Card>
              <CardTitle>Subscriptions</CardTitle>
              <CardText>
                Subscriptions keep you synced with new drops and updates in the bundle you choose.
                Cancel anytime. Prefer ownership? There’s always a one-time option right beside it.
              </CardText>
            </Card>
          </Columns>
        </motion.div>
      </ContentContainer>
    </PricingContainer>
  );
};

export default PricingSection;
