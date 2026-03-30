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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { scrollToHash } from "@/utils/scrollToHash";
// Import common pricing components
import BillingToggle from "../pricing/BillingToggle";
import PricingCard from "../pricing/PricingCard";
import PromotionBanner from "../banners/PromotionBanner";
import { isPromotionBannerDismissed } from "@/utils/promotions/promotion-banner-dismissal";

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
  padding: 88px 20px 72px;
  background: linear-gradient(180deg, #05060d 0%, #0b0f1f 100%);
  position: relative;
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.75rem;
  text-align: center;
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  margin: 0 0 1rem;
  text-align: center;
  color: var(--text);
  font-size: clamp(2rem, 3.5vw, 3rem);
`;

const SectionSubtitle = styled.p`
  max-width: 760px;
  margin: 0 auto 1.5rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 1.05rem;
  line-height: 1.7;
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 1.5rem auto 2rem;
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
  gap: 1.25rem;
  margin-top: 1.5rem;
`;

const Card = styled.div`
  padding: 1.25rem 1.35rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.16);
`;

const CardTitle = styled.h3`
  margin: 0 0 0.5rem;
  color: var(--text);
  font-size: 1.1rem;
  font-weight: 700;
`;

const CardText = styled.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.95rem;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-top: 2.5rem;
`;

const ActionLink = styled(Link)<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 1.4rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  transition: all 0.25s ease;

  ${(props) =>
    props.$primary
      ? `
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    box-shadow: 0 12px 30px rgba(108, 99, 255, 0.28);
  `
      : `
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: white;
  `}

  &:hover {
    transform: translateY(-2px);
  }
`;

const PricingSection = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
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
    const sub = user?.profile?.subscription;
    if (sub && sub !== "none" && (sub === "monthly" || sub === "annual" || sub === "lifetime")) {
      setBillingPeriod(sub);
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
          setIsBannerDismissed(
            isPromotionBannerDismissed(data.promotion.id)
          );
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
      if (user?.profile?.subscription === "lifetime") {
        setHasActiveSale(false);
        setIsBannerDismissed(false);
        return;
      }
      checkActiveSale();
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
      <Inner>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <Eyebrow>{t("pricing.eyebrow", "Pricing")}</Eyebrow>
          <SectionTitle>
            {t("pricing.simpleTransparent", "Simple, Transparent Pricing")}
          </SectionTitle>

          {/* Promotional Sale Banner - Only show if header banner has been dismissed (to avoid duplicate) and user doesn't have lifetime */}
          {/* CRITICAL: Check user subscription FIRST - never show for lifetime users */}
          {!(user?.profile?.subscription === "lifetime") &&
            hasActiveSale &&
            isBannerDismissed && (
              <PromotionBanner showCountdown={true} dismissible={false} variant="card" />
            )}

          <SectionSubtitle>
            Start with free tools, buy only what fits, or move into bundles when
            you want more range and a bigger setup in one move.
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
                Every plugin, MIDI pack, loop pack, and preset is a one-time purchase.
                Buy it once, keep it, and use it on your own terms.
              </CardText>
            </Card>
            <Card>
              <CardTitle>Bundles</CardTitle>
              <CardText>
                Get deeper value fast. Bundles are the cleanest path when you
                already know you want more sounds, more tools, and a more complete setup.
              </CardText>
            </Card>
            <Card>
              <CardTitle>Subscriptions</CardTitle>
              <CardText>
                Prefer lower upfront cost? Subscription options keep you current
                on the bundle you choose. Prefer ownership? One-time options are right there too.
              </CardText>
            </Card>
          </Columns>

          <ActionRow>
            <ActionLink
              href="#bundles"
              $primary
              onClick={(e) => {
                if (scrollToHash("#bundles", pathname ?? "/")) e.preventDefault();
              }}
            >
              See Elite Bundles
            </ActionLink>
            <ActionLink href="/product/cymasphere">
              Explore Cymasphere
            </ActionLink>
          </ActionRow>
        </motion.div>
      </Inner>
    </PricingContainer>
  );
};

export default PricingSection;
