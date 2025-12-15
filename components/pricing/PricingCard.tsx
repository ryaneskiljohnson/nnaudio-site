"use client";

import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaCheck, FaGift, FaUnlock } from "react-icons/fa";
import { PlanType, PriceData } from "@/types/stripe";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckout } from "@/hooks/useCheckout";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import EmailCollectionModal from "../modals/EmailCollectionModal";
import LoadingSpinner from "../common/LoadingSpinner";

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

// Styled components
const PricingCardContainer = styled(motion.div)<{
  $isCurrentPlan?: boolean;
  $isLifetimeOwner?: boolean;
}>`
  position: relative;
  background-color: rgba(25, 23, 36, 0.6);
  border-radius: 12px;
  overflow: visible;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  max-width: 420px;
  margin: 0 auto;
  border: 2px solid
    ${(props) =>
      props.$isLifetimeOwner
        ? "#f59e0b"
        : props.$isCurrentPlan
        ? "#10b981"
        : "var(--primary)"};
  z-index: 5;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  }
`;

const LifetimeOwnerBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 20px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
`;

const CurrentPlanBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 20px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
`;

const CardTrialBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 20px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
`;

const CardHeader = styled.div`
  padding: 1.5rem 1.5rem 0.75rem;
  text-align: center;
`;

const PlanName = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  .logo-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pro-label {
    font-size: 1.2rem;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 600;
  }
`;

const PriceDisplay = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0;
  position: relative;
`;

const OriginalPrice = styled.div<{ $hasPeriod?: boolean }>`
  font-size: 1.2rem;
  text-decoration: line-through;
  color: var(--text-secondary);
  opacity: 0.5;
  font-weight: 500;
  position: absolute;
  right: ${props => props.$hasPeriod ? 'calc(50% + 5.5rem)' : 'calc(50% + 4rem)'};
  
  @media (max-width: 480px) {
    right: ${props => props.$hasPeriod ? 'calc(50% + 4.5rem)' : 'calc(50% + 3rem)'};
    font-size: 1rem;
  }
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const Price = styled.span`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const BillingPeriod = styled.span`
  font-size: 1.2rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-left: 0.25rem;
`;

const DiscountTag = styled.span<{ $isSale?: boolean }>`
  background: ${props => props.$isSale 
    ? 'linear-gradient(135deg, #FF6B6B, #FF0000)' 
    : 'linear-gradient(135deg, var(--accent), var(--primary))'};
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  position: absolute;
  left: 100%;
  margin-left: 8px;
  white-space: nowrap;
  box-shadow: ${props => props.$isSale 
    ? '0 4px 12px rgba(255, 107, 107, 0.4)' 
    : 'none'};
  animation: ${props => props.$isSale ? 'pulse 2s ease-in-out infinite' : 'none'};

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`;

const CardBody = styled.div`
  padding: 0.5rem 1.5rem 1.5rem;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0.5rem 0;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const Feature = styled.li`
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  color: var(--text);
  font-size: 0.95rem;
`;

const FeatureIcon = styled.span`
  color: var(--success);
  margin-right: 0.75rem;
  font-size: 1rem;
  flex-shrink: 0;
`;

const TrialOptionContainer = styled.div`
  margin-top: 1.5rem;
`;

const RadioOptionsContainer = styled.div`
  background: rgba(108, 99, 255, 0.05);
  border: 1px solid rgba(108, 99, 255, 0.2);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
`;

const RadioOptionTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text);
  display: flex;
  align-items: center;

  svg {
    margin-right: 6px;
    color: var(--primary);
  }
`;

const RadioButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin-bottom: 0;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const RadioInput = styled.input`
  position: relative;
  cursor: pointer;
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(108, 99, 255, 0.4);
  border-radius: 50%;
  margin-right: 10px;
  outline: none;
  transition: all 0.2s ease;

  &:checked {
    border-color: var(--primary);
    background-color: transparent;

    &:after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--accent));
    }
  }

  &:hover {
    border-color: var(--primary);
  }
`;

const TrialIcon = styled.span`
  margin-right: 8px;
  font-size: 0.9rem;
`;

const TrialDescription = styled.span`
  margin-left: 8px;
  flex: 1;
`;

const CheckoutButton = styled.button<{ $variant?: "primary" | "secondary" }>`
  width: 100%;
  padding: 14px 24px;
  background: ${(props) =>
    props.$variant === "secondary"
      ? "rgba(255, 255, 255, 0.1)"
      : "linear-gradient(135deg, var(--primary), var(--accent))"};
  color: white;
  border: none;
  border-radius: 30px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 99, 255, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TrialMessage = styled.div`
  background: rgba(108, 99, 255, 0.1);
  border: 1px solid rgba(108, 99, 255, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text);
  text-align: center;
  line-height: 1.4;
`;

const Loader = styled.div`
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

interface PricingCardProps {
  billingPeriod: PlanType;
  onBillingPeriodChange?: (period: PlanType) => void;
  showTrialOptions?: boolean;
  compact?: boolean;
  hideButton?: boolean;
  variant?: "default" | "change_plan";
}

export default function PricingCard({
  billingPeriod,
  onBillingPeriodChange,
  showTrialOptions = false,
  compact = false,
  hideButton = false,
  variant = "default",
}: PricingCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { initiateCheckout } = useCheckout();
  const [prices, setPrices] = useState<Record<PlanType, PriceData> | null>(
    null
  );
  const [pricesLoading, setPricesLoading] = useState(true);
  const [trialType, setTrialType] = useState<"7day" | "14day">("14day");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<
    "short" | "long" | null
  >(null);
  const [hasHadStripeTrial, setHasHadStripeTrial] = useState<boolean>(false);
  const [activePromotion, setActivePromotion] = useState<any>(null);

  // Fetch prices from Stripe
  useEffect(() => {
    const fetchPrices = async () => {
      setPricesLoading(true);
      try {
        const response = await fetch("/api/stripe/prices");
        const result = await response.json();

        if (result.success && result.prices) {
          setPrices(result.prices);
        } else {
          console.error("Error fetching prices:", result.error);
        }
      } catch (error) {
        console.error("Error fetching prices:", error);
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, []);

  // Fetch active promotion - Skip if user has lifetime access
  useEffect(() => {
    // Don't fetch promotions for lifetime users
    if (user?.profile?.subscription === "lifetime") {
      setActivePromotion(null);
      return;
    }

    const fetchPromotion = async () => {
      try {
        const response = await fetch(`/api/promotions/active?plan=${billingPeriod}`);
        const data = await response.json();
        
        if (data.success && data.promotion) {
          setActivePromotion(data.promotion);
        } else {
          setActivePromotion(null);
        }
      } catch (error) {
        console.error('Error fetching promotion:', error);
        setActivePromotion(null);
      }
    };

    fetchPromotion();
  }, [billingPeriod, user?.profile?.subscription]);

  // Fetch trial status when user is logged in
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
          setHasHadStripeTrial(false);
        } else {
          setHasHadStripeTrial(result.hasHadTrial);
        }
      } catch (error) {
        console.error("Error checking trial status:", error);
        setHasHadStripeTrial(false);
      }
    };

    checkTrialStatus();
  }, [user?.email]);

  // Get current plan
  const currentPlan = prices?.[billingPeriod];

  // Calculate price details
  const priceDetails = useMemo(() => {
    if (!currentPlan) return { display: "--", original: undefined, discountText: "", isSale: false };

    const baseAmount = currentPlan.amount / 100;
    let discountedAmount = baseAmount;
    let discountText = "";
    let originalPrice = undefined;
    let isSale = false;

    // Check if there's an active promotion for this plan from database
    if (activePromotion && activePromotion.applicable_plans?.includes(billingPeriod)) {
      // Get sale price for this plan
      const salePriceField = `sale_price_${billingPeriod}`;
      const salePrice = activePromotion[salePriceField];
      
      if (salePrice !== null && salePrice !== undefined) {
        discountedAmount = salePrice;
        // Use retail price for strikethrough to show bigger discount
        if (billingPeriod === "lifetime") {
          originalPrice = "$249";
          const discount = Math.round(((249 - salePrice) / 249) * 100);
          discountText = `${discount}% OFF`;
        } else if (billingPeriod === "annual") {
          originalPrice = `$79${t("pricing.perYear", "/year")}`;
          const discount = Math.round(((79 - salePrice) / 79) * 100);
          discountText = `${discount}% OFF`;
        } else {
          originalPrice = `$${baseAmount.toFixed(0)}${t("pricing.perMonth", "/month")}`;
          const discount = Math.round(((baseAmount - salePrice) / baseAmount) * 100);
          discountText = `${discount}% OFF`;
        }
        isSale = true;
      }
    } else if (currentPlan.discount) {
      // Stripe discount applied
      if (currentPlan.discount.percent_off) {
        discountedAmount = baseAmount * (1 - currentPlan.discount.percent_off / 100);
        discountText = `${currentPlan.discount.percent_off}% OFF`;
      } else if (currentPlan.discount.amount_off) {
        discountedAmount = baseAmount - currentPlan.discount.amount_off / 100;
        discountText = `$${currentPlan.discount.amount_off / 100} OFF`;
      }
      if (billingPeriod === "monthly") {
        originalPrice = `$${baseAmount.toFixed(0)}${t("pricing.perMonth", "/month")}`;
      } else if (billingPeriod === "annual") {
        originalPrice = `$${baseAmount.toFixed(0)}${t("pricing.perYear", "/year")}`;
      } else {
        originalPrice = `$${baseAmount.toFixed(0)}`;
      }
    } else {
      // No sale, no discount - show standard strikethrough prices
      if (billingPeriod === "lifetime") {
        originalPrice = "$249";  // $149 is 40% off $249
      } else if (billingPeriod === "annual") {
        originalPrice = `$79${t("pricing.perYear", "/year")}`;   // $59 is 25% off $79
      } else if (billingPeriod === "monthly") {
        originalPrice = `$8${t("pricing.perMonth", "/month")}`;    // $6 is 25% off $8
      }
    }

    return {
      display: `$${discountedAmount.toFixed(0)}`,
      original: originalPrice,
      discountText,
      isSale,
    };
  }, [currentPlan, billingPeriod, activePromotion, t, i18n.language]);

  // Get period text
  const getPeriodText = () => {
    if (billingPeriod === "lifetime") return "";
    return billingPeriod === "monthly"
      ? t("pricing.perMonth", "/month")
      : t("pricing.perYear", "/year");
  };

  // Get features
  const features = useMemo(() => {
    try {
      const translatedFeatures = t("pricing.features", {
        returnObjects: true,
      });

      if (Array.isArray(translatedFeatures) && translatedFeatures.length > 0) {
        return translatedFeatures;
      }
    } catch (error) {
      console.log("Error loading translated features", error);
    }

    // Fallback to English features
    return [
      "Unlimited chord progressions",
      "Advanced chord voicings",
      "Real-time audio playback",
      "Export to MIDI",
      "Premium Support",
    ];
  }, [t]);

  // Check if this is the current plan
  const isCurrentPlan =
    user?.profile?.subscription === billingPeriod &&
    user.profile.subscription !== "none";

  // Determine if we should show trial options
  // Don't show if user already has an active subscription
  const shouldShowTrialOptions =
    showTrialOptions && 
    !hasHadStripeTrial && 
    billingPeriod !== "lifetime" &&
    (!user?.profile || user?.profile?.subscription === "none");

  // Determine if we should show the "no trial available" message
  // Show when: user has had a trial before, and billing period is not lifetime
  // In change_plan variant or when hideButton is true, show message even if subscription is not "none"
  const shouldShowTrialMessage = useMemo(() => {
    if (!hasHadStripeTrial || billingPeriod === "lifetime") {
      return false;
    }
    
    // If hideButton is true (modal context) or variant is change_plan, show message regardless of subscription status
    if (hideButton || variant === "change_plan") {
      return true;
    }
    
    // Otherwise, only show if subscription is "none" and showTrialOptions is true
    return (
      showTrialOptions &&
      (!user?.profile || user?.profile?.subscription === "none")
    );
  }, [hasHadStripeTrial, showTrialOptions, billingPeriod, user?.profile?.subscription, hideButton, variant]);

  // Handle checkout
  const handleCheckout = async (collectPaymentMethod: boolean) => {
    if (!prices) return;

    // If user is not logged in, show email collection modal
    // (for trials or lifetime purchases)
    if (!user) {
      setShowEmailModal(true);
      return;
    }

    setCheckoutLoading(collectPaymentMethod ? "long" : "short");

    const result = await initiateCheckout(billingPeriod, {
      collectPaymentMethod,
      hasHadTrial: hasHadStripeTrial,
    });

    setCheckoutLoading(null);

    // Show alert for critical errors (like duplicate lifetime purchase)
    if (!result.success && result.error) {
      // Show user-friendly alert for important errors
      if (result.error.includes("lifetime license") || result.error.includes("LIFETIME_ALREADY_PURCHASED")) {
        alert(result.error);
      }
    }
  };

  // Handle email submission
  const handleEmailSubmit = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!prices)
      return { success: false, error: "Price information is not available" };

    try {
      const customerCheckResponse = await fetch("/api/stripe/check-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const customerCheck = await customerCheckResponse.json();

      if (customerCheck.error) {
        return { success: false, error: customerCheck.error };
      }

      if (customerCheck.exists && customerCheck.hasPriorTransactions) {
        return {
          success: false,
          error:
            "This email is already associated with an account. Please sign in to continue.",
        };
      }

      setShowEmailModal(false);
      setCheckoutLoading(trialType === "14day" ? "long" : "short");

      const collectPaymentMethod = trialType === "14day";

      const result = await initiateCheckout(billingPeriod, {
        collectPaymentMethod,
        email, // Pass the email from the modal
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Could not create checkout session",
        };
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setCheckoutLoading(null);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  // Get button config
  const getButtonConfig = useMemo(() => {
    if (!user?.profile) {
      return {
        text: shouldShowTrialOptions
          ? t("pricing.freeTrial.startTrial", "Start Trial")
          : t("pricing.buyNow", "Buy Now"),
        action: () =>
          handleCheckout(shouldShowTrialOptions ? trialType === "14day" : false),
        variant: "primary" as const,
        requiresPrices: true,
      };
    }

    if (user.profile.subscription === "lifetime") {
      return {
        text: t("pricing.goToDashboard", "Go to Dashboard"),
        action: () => router.push("/dashboard"),
        variant: "primary" as const,
        requiresPrices: false,
      };
    }

    if (
      user.profile.subscription === "monthly" ||
      user.profile.subscription === "annual"
    ) {
      return {
        text: t("pricing.manageSubscription", "Manage Subscription"),
        action: () => router.push("/billing"),
        variant: "primary" as const,
        requiresPrices: false,
      };
    }

    return {
      text: shouldShowTrialOptions
        ? t("pricing.freeTrial.startTrial", "Start Trial")
        : t("pricing.upgradeNow", "Upgrade Now"),
      action: () =>
        handleCheckout(shouldShowTrialOptions ? trialType === "14day" : false),
      variant: "primary" as const,
      requiresPrices: true,
    };
  }, [
    user?.profile,
    shouldShowTrialOptions,
    trialType,
    t,
    billingPeriod,
    hasHadStripeTrial,
    router,
  ]);

  return (
    <>
      <PricingCardContainer
        $isCurrentPlan={isCurrentPlan}
        $isLifetimeOwner={user?.profile?.subscription === "lifetime"}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Show appropriate badge based on user status */}
        {user?.profile?.subscription === "lifetime" && (
          <LifetimeOwnerBadge>
            {t("pricing.lifetimeOwner", "Lifetime Owner")}
          </LifetimeOwnerBadge>
        )}
        {isCurrentPlan && user?.profile?.subscription !== "lifetime" && (
          <CurrentPlanBadge>
            {t("pricing.currentPlan", "Current Plan")}
          </CurrentPlanBadge>
        )}
        {shouldShowTrialOptions &&
          !isCurrentPlan &&
          user?.profile?.subscription !== "lifetime" && (
            <CardTrialBadge>
              {t("pricing.freeTrial.title", "14-Day Free Trial")}
            </CardTrialBadge>
          )}

        <CardHeader>
          <PlanName>
            <div className="logo-container">
              <NNAudioLogo
                size="40px"
                fontSize="1.8rem"
                showText={false}
                onClick={(e: React.MouseEvent) => e.preventDefault()}
                href=""
                className=""
              />
              <span className="pro-label">PRO</span>
            </div>
          </PlanName>
          <div style={{ fontSize: "1.1rem", opacity: 0.8 }}>
            {t("pricing.proSolution")}
          </div>

          {pricesLoading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <LoadingSpinner size="small" />
            </div>
          ) : (
            <>
              <PriceDisplay>
                {priceDetails.original && (
                  <OriginalPrice $hasPeriod={billingPeriod !== 'lifetime'}>
                    {priceDetails.original}
                  </OriginalPrice>
                )}
                <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: "0.25rem" }}>
                  <PriceContainer>
                    <Price>{priceDetails.display}</Price>
                    <BillingPeriod>{getPeriodText()}</BillingPeriod>
                    {priceDetails.discountText && (
                      <DiscountTag $isSale={priceDetails.isSale}>
                        {priceDetails.isSale ? '🔥 ' : ''}{priceDetails.discountText}
                      </DiscountTag>
                    )}
                  </PriceContainer>
                </div>
              </PriceDisplay>
              {billingPeriod === "monthly" && (
                <div style={{ 
                  marginTop: "5px", 
                  fontSize: "0.9rem", 
                  textAlign: "center",
                  color: "#b0b0b0"
                }}>
                  {t("pricing.cancelAnytime", "Cancel anytime")}
                </div>
              )}
              {billingPeriod === "annual" && currentPlan && (
                <div style={{ 
                  marginTop: "5px", 
                  fontSize: "0.9rem", 
                  textAlign: "center",
                  color: "#b0b0b0"
                }}>
                  {t("pricing.equivalentTo", "Equivalent to")}{" "}
                  ${(currentPlan.amount / 100 / 12).toFixed(2)}
                  {t("pricing.perMonth", "/month")}{" "}
                  {t("pricing.billed", "billed annually")}
                </div>
              )}
              {billingPeriod === "lifetime" && (
                <div style={{
                  marginTop: "5px",
                  fontSize: "0.9rem",
                  textAlign: "center",
                  color: "#b0b0b0"
                }}>
                  {t("pricing.oneTimePurchase", "one-time purchase")}
                </div>
              )}
            </>
          )}
        </CardHeader>

        <CardBody>
          <Divider />
          <h4
            style={{
              marginBottom: "0.5rem",
              color: "var(--text)",
              marginTop: "0",
            }}
          >
            {t("pricing.allPlansInclude", "All Plans Include:")}
          </h4>
          <FeaturesList>
            {features.map((feature, index) => (
              <Feature key={index}>
                <FeatureIcon>
                  <FaCheck />
                </FeatureIcon>
                {feature}
              </Feature>
            ))}
          </FeaturesList>

          {/* Show trial message even when hideButton is true (for modal context) */}
          {shouldShowTrialMessage && hideButton && (
            <TrialMessage>
              {t(
                "pricing.noTrialAvailable",
                "You've already used a free trial. Start a subscription to continue enjoying all premium features."
              )}
            </TrialMessage>
          )}

          {!hideButton && (
            <>
              {shouldShowTrialOptions ? (
                <TrialOptionContainer>
                  <RadioOptionsContainer>
                    <RadioOptionTitle>
                      <FaGift />{" "}
                      {t(
                        "pricing.freeTrial.chooseFree",
                        "Choose your free trial option:"
                      )}
                    </RadioOptionTitle>
                    <RadioButtonGroup>
                      <RadioOption>
                        <RadioInput
                          type="radio"
                          name="trialOption"
                          value="14day"
                          checked={trialType === "14day"}
                          onChange={() => setTrialType("14day")}
                        />
                        <TrialIcon>
                          <FaUnlock />
                        </TrialIcon>
                        <TrialDescription>
                          {t(
                            "pricing.freeTrial.withCard",
                            "14-day trial - Add card on file"
                          )}
                          <br />
                          {t(
                            "pricing.freeTrial.noCharge",
                            "(won't be charged until trial ends)"
                          )}
                        </TrialDescription>
                      </RadioOption>

                      <RadioOption>
                        <RadioInput
                          type="radio"
                          name="trialOption"
                          value="7day"
                          checked={trialType === "7day"}
                          onChange={() => setTrialType("7day")}
                        />
                        <TrialIcon>
                          <FaUnlock />
                        </TrialIcon>
                        <TrialDescription>
                          {t(
                            "pricing.freeTrial.noCard",
                            "7-day trial - No credit card required"
                          )}
                        </TrialDescription>
                      </RadioOption>
                    </RadioButtonGroup>
                  </RadioOptionsContainer>

                  <CheckoutButton
                    onClick={() => handleCheckout(trialType === "14day")}
                    disabled={pricesLoading || checkoutLoading !== null}
                  >
                    {checkoutLoading !== null ? (
                      <>
                        {t("pricing.processing", "Processing")} <Loader />
                      </>
                    ) : (
                      t("pricing.freeTrial.startTrial", "Start Trial")
                    )}
                  </CheckoutButton>
                </TrialOptionContainer>
              ) : shouldShowTrialMessage ? (
                <>
                  <TrialMessage>
                    {t(
                      "pricing.noTrialAvailable",
                      "You've already used a free trial. Start a subscription to continue enjoying all premium features."
                    )}
                  </TrialMessage>
                  <CheckoutButton
                    onClick={getButtonConfig.action}
                    disabled={pricesLoading || checkoutLoading !== null}
                    $variant={getButtonConfig.variant}
                  >
                    {checkoutLoading !== null ? (
                      <>
                        {t("pricing.processing", "Processing")} <Loader />
                      </>
                    ) : (
                      getButtonConfig.text
                    )}
                  </CheckoutButton>
                </>
              ) : (
                /* Show button based on user status */
                <CheckoutButton
                  onClick={getButtonConfig.action}
                  disabled={
                    (getButtonConfig.requiresPrices && pricesLoading) ||
                    checkoutLoading !== null
                  }
                  $variant={getButtonConfig.variant}
                >
                  {checkoutLoading !== null ? (
                    <>
                      {t("pricing.processing", "Processing")} <Loader />
                    </>
                  ) : (
                    getButtonConfig.text
                  )}
                </CheckoutButton>
              )}
            </>
          )}
        </CardBody>
      </PricingCardContainer>

      {/* Show email collection modal if open */}
      {showEmailModal && (
        <EmailCollectionModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSubmit={handleEmailSubmit}
          collectPaymentMethod={
            billingPeriod === "lifetime" ? true : trialType === "14day"
          }
          trialDays={
            billingPeriod === "lifetime" ? 0 : trialType === "14day" ? 14 : 7
          }
        />
      )}
    </>
  );
}

