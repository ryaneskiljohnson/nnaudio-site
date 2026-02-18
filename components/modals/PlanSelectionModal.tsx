"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaInfoCircle } from "react-icons/fa";
import { Profile, SubscriptionType } from "@/utils/supabase/types";
import { useTranslation } from "react-i18next";
import { PlanType } from "@/types/stripe";
import BillingToggle from "@/components/pricing/BillingToggle";
import PricingCard from "@/components/pricing/PricingCard";

// Modal components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  will-change: opacity;
`;

const ModalContent = styled(motion.div)`
  background: rgba(25, 23, 36, 0.95);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(108, 99, 255, 0.2);
  will-change: transform, opacity;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: var(--text);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;

  &:hover {
    color: var(--text);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 5px 15px rgba(108, 99, 255, 0.4);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const PlanChangeInfo = styled.div`
  display: flex;
  background-color: rgba(108, 99, 255, 0.1);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;

  svg {
    color: var(--primary);
    margin-right: 0.75rem;
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-top: 0.25rem;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onIntervalChange: (interval: string) => void;
  onConfirm: () => void;
  formatDate?: (date: string | number | null | undefined) => string;
  planName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  lifetimePrice: number;
  planDescription: string;
  planFeatures: string[];
  monthlyDiscount?: {
    percent_off?: number;
    amount_off?: number;
    promotion_code?: string;
  };
  yearlyDiscount?: {
    percent_off?: number;
    amount_off?: number;
    promotion_code?: string;
  };
  lifetimeDiscount?: {
    percent_off?: number;
    amount_off?: number;
    promotion_code?: string;
  };
  onCardToggleChange?: (willProvideCard: boolean) => void;
  isPlanChangeLoading?: boolean;
  hasHadTrial?: boolean | null;
}

const PlanSelectionModal = ({
  isOpen,
  onClose,
  profile,
  onIntervalChange,
  onConfirm,
  formatDate,
  hasHadTrial = null,
  isPlanChangeLoading = false,
}: PlanSelectionModalProps) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<PlanType>(
    profile.subscription === "none" ? "monthly" : (profile.subscription as PlanType)
  );

  // Update local state when the modal opens
  useEffect(() => {
    if (isOpen && profile?.subscription) {
      setSelectedBillingPeriod(
        profile.subscription === "none" ? "monthly" : (profile.subscription as PlanType)
      );
    }
  }, [isOpen, profile.subscription]);

  // Handle billing period change
  const handleBillingPeriodChange = (period: PlanType) => {
    // Allow selecting any plan in change_plan variant
    setSelectedBillingPeriod(period);
    onIntervalChange(period);
  };

  // Check if the selected plan is the current plan
  const isCurrentPlan = profile.subscription !== "none" && 
    selectedBillingPeriod === profile.subscription;

  // Improved body overflow management
  useEffect(() => {
    setIsMounted(true);

    const originalStyle = window.getComputedStyle(document.body).overflow;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalStyle;
    }

    return () => {
      document.body.style.overflow = originalStyle;
      setIsMounted(false);
    };
  }, [isOpen]);

  // Helper function to format date
  const formatDateHelper = (date: string | number | null | undefined) => {
    if (!date) return "";
    return formatDate
      ? formatDate(date)
      : new Date(date).toLocaleDateString(t("common.locale", "en-US"), {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  // Don't render anything on the server
  if (!isMounted) return null;

  // Don't render if modal is closed
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContent
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle>
                {t("billing.choosePlan", "Choose Your Plan")}
              </ModalTitle>
              <CloseButton onClick={onClose}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              {profile.subscription === "annual" && (
                <PlanChangeInfo>
                  <FaInfoCircle />
                  <p>
                    {t(
                      "billing.yearlyToMonthly",
                      "Your subscription is currently billed yearly. If you switch to a monthly plan, the change will take effect after your current billing period ends on {{date}}.",
                      {
                        date: formatDateHelper(profile.subscription_expiration),
                      }
                    )}
                  </p>
                </PlanChangeInfo>
              )}

              <BillingToggle
                billingPeriod={selectedBillingPeriod}
                onBillingPeriodChange={handleBillingPeriodChange}
                userSubscription={profile.subscription ?? undefined}
                showSavingsInfo={true}
                variant="change_plan"
              />

              <PricingCard
                billingPeriod={selectedBillingPeriod}
                onBillingPeriodChange={handleBillingPeriodChange}
                showTrialOptions={hasHadTrial !== true}
                hideButton={true}
                variant="change_plan"
              />
            </ModalBody>

            <ModalFooter>
              <CancelButton onClick={onClose}>
                {t("common.cancel", "Cancel")}
              </CancelButton>
              <Button 
                onClick={onConfirm} 
                disabled={isPlanChangeLoading || isCurrentPlan}
              >
                {isPlanChangeLoading ? (
                  <>
                    <LoadingSpinner />
                    {t("pricing.processing", "Processing")}
                  </>
                ) : (
                  t("common.confirm", "Confirm")
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default PlanSelectionModal;
