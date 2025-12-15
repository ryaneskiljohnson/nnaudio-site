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
import { FaGift } from "react-icons/fa";
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
  padding: 150px 20px 120px; /* Increased top padding from 120px to 150px */
  background-color: var(--background);
  position: relative;
  overflow: hidden;
  min-height: 1000px; /* Increased from 900px for more vertical space */

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 80% 20%,
      rgba(108, 99, 255, 0.08),
      transparent 40%
    );
    opacity: 0.6;
    z-index: 0;
  }

  /* Mobile responsive styling */
  @media (max-width: 768px) {
    padding: 100px 10px 80px; /* Reduce padding on mobile */
    min-height: 800px;
  }

  @media (max-width: 480px) {
    padding: 80px 5px 60px; /* Further reduce padding on smaller mobile devices */
    min-height: 700px;
  }
`;

const ContentContainer = styled.div`
  max-width: 550px;
  margin: 0 auto;
  position: relative;
  z-index: 3;
  background: linear-gradient(
    rgba(var(--background-rgb), 0.8) 0%,
    rgba(var(--background-rgb), 0.95) 20%,
    rgba(var(--background-rgb), 0.95) 80%,
    rgba(var(--background-rgb), 0.8) 100%
  );
  border-radius: 12px;
  padding: 60px 40px 50px; /* Increased horizontal padding from 10px to 40px */
  box-shadow: 0 0 40px 20px rgba(0, 0, 0, 0.2);
  pointer-events: auto; /* Enable clicks on content */

  /* Mobile responsive styling */
  @media (max-width: 768px) {
    padding: 40px 15px 30px; /* Reduce padding on mobile for more space */
    border-radius: 8px;
  }

  @media (max-width: 480px) {
    padding: 30px 10px 25px; /* Further reduce padding on smaller mobile devices */
  }
`;

const SectionTitle = styled.h2`
  font-size: 2.2rem;
  text-align: center;
  margin-bottom: 0.5rem;
  margin-top: 0;
  position: relative;
  pointer-events: none; /* No need for interaction */

  &:after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 70px;
    height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    border-radius: 2px;
  }
`;

const SectionSubtitle = styled.p`
  text-align: center;
  color: var(--text-secondary);
  font-size: 1rem;
  max-width: 700px;
  margin: 0 auto 15px;
  pointer-events: none; /* No need for interaction */
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

// Add definitions for the components causing linter errors
const TrialBanner = styled.div`
  background: rgba(108, 99, 255, 0.1);
  border: 1px solid rgba(108, 99, 255, 0.3);
  border-radius: 10px;
  padding: 15px 20px;
  margin: 10px auto 15px;
  max-width: 700px;
  pointer-events: none;
`;

const TrialText = styled.div`
  text-align: center;

  h3 {
    font-size: 1.3rem;
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      margin-right: 8px;
      color: var(--primary);
    }

    span {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 5px;
      font-weight: 700;
    }
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
  }
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
  // State for checking if user has had trial via Stripe
  const [hasHadStripeTrial, setHasHadStripeTrial] = useState<boolean>(false);

  // Fetch trial status when user is logged in
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!user?.email) {
        return;
      }

      try {
        const { checkCustomerTrialStatus } = await import("@/utils/stripe/actions");
        const result = await checkCustomerTrialStatus(user.email);

        if (result.error) {
          setHasHadStripeTrial(false); // Default to false on error
        } else {
          setHasHadStripeTrial(result.hasHadTrial);
        }
      } catch (error) {
        console.error("Error checking trial status:", error);
        setHasHadStripeTrial(false); // Default to false on error
      }
    };

    checkTrialStatus();
  }, [user?.email]);

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

  // Check if user has completed a trial or has a subscription
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!user?.email) {
        setHasHadStripeTrial(false);
        return;
      }

      try {
        const { checkCustomerTrialStatus } = await import("@/utils/stripe/actions");
        const result = await checkCustomerTrialStatus(user.email);

        if (result.error) {
          setHasHadStripeTrial(false); // Default to false on error
        } else {
          setHasHadStripeTrial(result.hasHadTrial);
        }
      } catch (error) {
        console.error("Error checking trial status:", error);
        setHasHadStripeTrial(false); // Default to false on error
      }
    };

    checkTrialStatus();
  }, [user?.email]);

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

  // Check if user has completed a trial or has a subscription
  const shouldHideTrialContent = React.useMemo(() => {
    if (!user?.profile) return false;

    // Hide trial content if:
    return (
      // User has an active subscription
      user.profile.subscription !== "none" ||
      // User previously had a trial that expired
      (user.profile.trial_expiration &&
        new Date(user.profile.trial_expiration) < new Date()) ||
      // User previously had a subscription that ended
      (user.profile.subscription === "none" &&
        user.profile.subscription_expiration &&
        new Date(user.profile.subscription_expiration) < new Date()) ||
      // User has ever started a trial via Stripe (regardless of current status)
      hasHadStripeTrial
    );
  }, [user, hasHadStripeTrial]);


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

          {/* Free Trial Banner - Only show if user hasn't completed a trial */}
          {!shouldHideTrialContent && (
            <TrialBanner>
              <TrialText>
                <h3>
                  <FaGift />{" "}
                  {t("pricing.freeTrial.title", "Try FREE for up to 14 days")}
                </h3>
                <p>
                  {t(
                    "pricing.freeTrial.description",
                    "Experience all premium features with two trial options."
                  )}
                  <br />
                  {t(
                    "pricing.freeTrial.options",
                    "Choose 7 days with no card or 14 days with card on file."
                  )}
                </p>
              </TrialText>
            </TrialBanner>
          )}

          <SectionSubtitle>
            {t(
              "pricing.chooseOption",
              "Choose the billing option that works best for you."
            )}
            <br />
            {t(
              "pricing.allFeatures",
              "All options include full access to all features."
            )}
          </SectionSubtitle>

          {/* Billing period toggle */}
          <BillingToggle
            billingPeriod={billingPeriod}
            onBillingPeriodChange={(period) => setBillingPeriod(period)}
            userSubscription={user?.profile?.subscription || "none"}
            showSavingsInfo={true}
          />
        </motion.div>

        {/* Single pricing card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <PricingCard
            billingPeriod={billingPeriod}
            onBillingPeriodChange={(period) => setBillingPeriod(period)}
            showTrialOptions={!hasHadStripeTrial && (!user?.profile || user?.profile?.subscription === "none")}
          />
        </motion.div>
      </ContentContainer>
    </PricingContainer>
  );
};

export default PricingSection;
