"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaHistory,
  FaTimes,
  FaCheck,
  FaInfoCircle,
  FaCrown,
  FaGift,
  FaExternalLinkAlt,
  FaApple,
} from "react-icons/fa";
import PlanSelectionModal from "@/components/modals/PlanSelectionModal";
import { SubscriptionType } from "@/utils/supabase/types";
import {
  getUpcomingInvoice,
  createCustomerPortalSession,
} from "@/utils/stripe/actions";
import { useCheckout } from "@/hooks/useCheckout";
import PricingCard from "@/components/pricing/PricingCard";
import BillingToggle from "@/components/pricing/BillingToggle";
import { PlanType } from "@/types/stripe";
import {
  getCustomerInvoices,
  InvoiceData,
} from "@/utils/stripe/supabase-stripe";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";

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
const NNAudioLogo = dynamic(
  () => import("@/components/common/NNAudioLogo"),
  {
    ssr: false,
  }
) as React.ComponentType<NNAudioLogoProps>;

// Extended profile interface with additional fields we need
interface ProfileWithSubscriptionDetails {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscription: SubscriptionType;
  subscription_interval?: "month" | "year" | null;
  subscription_source?: "stripe" | "ios" | "nfr" | "none" | null;
  cancel_at_period_end?: boolean;
  trial_expiration: string | null;
  subscription_expiration: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
}

// Helper functions for safely checking subscription status
const isSubscriptionNone = (subscription: SubscriptionType): boolean => {
  return subscription === "none";
};

const isSubscriptionLifetime = (subscription: SubscriptionType): boolean => {
  return subscription === "lifetime";
};

const BillingContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 30px 20px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: var(--text);
`;

const BillingCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const CardTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: var(--text);
  display: flex;
  align-items: center;

  svg {
    margin-right: 0.75rem;
    color: var(--primary);
  }
`;

const CardContent = styled.div`
  color: var(--text-secondary);

  @media (max-width: 768px) {
    text-align: center;
  }
`;

const ButtonContainer = styled.div`
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 1rem;
  width: 100%;
  margin-top: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr !important;
  }
`;

const PlanDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: center;
    text-align: center;
  }
`;

const PlanName = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .logo-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pro-label {
    font-size: 1.5rem;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
  }

  .plan-type {
    font-size: 2.5rem;
    color: var(--text);
    font-weight: 700;
  }
`;

const PlanPrice = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.25rem;
  display: inline-block;
  margin-left: 1rem;

  span {
    font-size: 1rem;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const PlanDescription = styled.p`
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const Button = styled.button`
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  min-width: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(108, 99, 255, 0.3);
  }
`;

const InvoicesList = styled.div`
  display: flex;
  flex-direction: column;
`;

const InvoiceItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const InvoiceDate = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const InvoiceAmount = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
`;

interface InvoiceStatusProps {
  status: "paid" | "unpaid";
}

const InvoiceStatus = styled.div<InvoiceStatusProps>`
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  color: white;
  background-color: ${(props) =>
    props.status === "paid" ? "var(--success)" : "var(--warning)"};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4),
    0 8px 24px rgba(0, 0, 0, 0.3);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
`;

const DownloadButton = styled.button`
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  display: flex;
  align-items: center;

  svg {
    margin-right: 0.5rem;
  }

  &:hover {
    text-decoration: underline;
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
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
`;

const AlertBanner = styled.div`
  background-color: rgba(255, 72, 66, 0.1);
  border: 1px solid rgba(255, 72, 66, 0.3);
  color: var(--error);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;

  svg {
    margin-right: 0.75rem;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }
`;

// Add these styled components for the loading overlay
const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1100;
`;

const SpinnerText = styled.div`
  color: white;
  font-size: 1.2rem;
  margin-top: 1.5rem;
  font-weight: 500;
`;

export default function BillingPage() {
  const { t } = useTranslation();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [selectedBillingPeriod, setSelectedBillingPeriod] =
    useState<SubscriptionType>("none");
  const [willProvideCard, setWillProvideCard] = useState(false);
  const [isPlanChangeLoading, setIsPlanChangeLoading] = useState(false);

  const router = useRouter();
  const { user: userAuth, refreshUser: refreshUserFromAuth } = useAuth();
  const user = userAuth!;

  // Refresh pro status on mount (same as login)
  useEffect(() => {
    refreshUserFromAuth();
  }, [refreshUserFromAuth]); // Run on mount and when refreshUserFromAuth changes

  // Use centralized checkout hook
  const { initiateCheckout: initiateCheckoutHook } = useCheckout({
    onError: (error) => {
      setConfirmationTitle("Error");
      setConfirmationMessage(`Failed to create checkout session: ${error}`);
      setShowConfirmationModal(true);
    },
  });

  // Get subscription data from user object and cast to extended profile type
  const userSubscription = user.profile as ProfileWithSubscriptionDetails;


  // State for NFR status
  const [hasNfr, setHasNfr] = useState<boolean | null>(null);

  // State for billing period selection (for pricing card)
  const [selectedBillingPeriodForPricing, setSelectedBillingPeriodForPricing] =
    useState<PlanType>("monthly");

  // State for plan prices and discounts
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(null);
  const [lifetimePrice, setLifetimePrice] = useState<number | null>(null);

  // Add a variable to determine the subscription interval
  const subscriptionInterval = useMemo(() => {
    // Return "month" for monthly, "year" for annual, or null for other subscription types
    if (userSubscription.subscription === "monthly") return "month";
    if (userSubscription.subscription === "annual") return "year";
    return null;
  }, [userSubscription.subscription]);

  // State for discounts
  const [monthlyDiscount, setMonthlyDiscount] = useState<{
    percent_off?: number;
    amount_off?: number;
    promotion_code?: string;
  } | null>(null);

  const [yearlyDiscount, setYearlyDiscount] = useState<{
    percent_off?: number;
    amount_off?: number;
    promotion_code?: string;
  } | null>(null);

  const [lifetimeDiscount, setLifetimeDiscount] = useState<{
    percent_off?: number;
    amount_off?: number;
    promotion_code?: string;
  } | null>(null);

  // State for upcoming invoice and invoices
  const [upcomingInvoiceAmount, setUpcomingInvoiceAmount] = useState<
    number | null
  >(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Add a new state to track when user data is updated
  const [lastUserUpdate, setLastUserUpdate] = useState<Date>(new Date());

  // Add state for portal redirect loading
  const [isPortalLoading, setIsPortalLoading] = useState(false);


  // Function to refresh user data from AuthContext
  const refreshUserData = async () => {
    // Refresh user data from AuthContext which will fetch the latest profile
    await refreshUserFromAuth();
    // Also update lastUserUpdate to trigger data refetching in useEffect
    setLastUserUpdate(new Date());
  };


  // Fetch NFR status
  useEffect(() => {
    async function fetchNfrStatus() {
      try {
        const response = await fetch("/api/user/nfr-status");
        const data = await response.json();
        console.log("[Billing] NFR status response:", data);
        if (data.hasNfr) {
          setHasNfr(true);
        } else {
          setHasNfr(false);
        }
      } catch (err) {
        console.error("Error fetching NFR status:", err);
        setHasNfr(false);
      }
    }

    if (user) {
      fetchNfrStatus();
    }
  }, [user]);

  // Fetch all data: prices, upcoming invoice, invoices
  // This useEffect depends on lastUserUpdate to trigger refetching when user data changes
  useEffect(() => {
    // Function to fetch all pricing data
    async function fetchAllData() {
      // Fetch prices
      fetchPrices();

      // Only fetch user-specific data if they have a customer ID
      if (user?.profile?.customer_id) {
        // Fetch upcoming invoice if user has an active subscription
        if (userSubscription.subscription !== "none") {
          fetchUpcomingInvoice();
        }

        // Fetch invoice history
        fetchInvoices();
      }
    }

    // Fetch prices from Stripe
    async function fetchPrices() {
      try {
        setIsLoadingPrices(true);
        setPriceError(null);

        const response = await fetch("/api/stripe/prices");
        const result = await response.json();

        if (result.error) {
          setPriceError(result.error);
          return;
        }

        if (result.success && result.prices) {
          // Update state with fetched prices
          setMonthlyPrice(Math.round(result.prices.monthly.amount / 100));
          setYearlyPrice(Math.round(result.prices.annual.amount / 100));
          setLifetimePrice(Math.round(result.prices.lifetime.amount / 100));

          // Store discount information if available
          if (result.prices.monthly.discount) {
            setMonthlyDiscount(result.prices.monthly.discount);
          }

          if (result.prices.annual.discount) {
            setYearlyDiscount(result.prices.annual.discount);
          }

          if (result.prices.lifetime.discount) {
            setLifetimeDiscount(result.prices.lifetime.discount);
          }
        }
      } catch (err) {
        console.error("Error fetching prices:", err);
        setPriceError("Failed to load pricing information");
      } finally {
        setIsLoadingPrices(false);
      }
    }

    // Fetch upcoming invoice
    async function fetchUpcomingInvoice() {
      if (!user?.profile?.customer_id) return;

      try {
        setIsLoadingInvoice(true);
        const { amount, error } = await getUpcomingInvoice(
          user.profile.customer_id
        );

        if (error) {
          console.error("Error fetching upcoming invoice:", error);
          // Don't set the amount if there's an error
          setUpcomingInvoiceAmount(null);
        } else {
          setUpcomingInvoiceAmount(amount);
        }
      } catch (err) {
        console.error("Error in fetchUpcomingInvoice:", err);
        setUpcomingInvoiceAmount(null);
      } finally {
        setIsLoadingInvoice(false);
      }
    }

    // Fetch invoice history
    async function fetchInvoices() {
      if (!user?.profile?.customer_id) return;

      try {
        setIsLoadingInvoices(true);
        setInvoiceError(null);
        const { invoices, error } = await getCustomerInvoices(
          user.profile.customer_id
        );

        if (error) {
          console.error("Error fetching invoices:", error);
          setInvoiceError(error);
        } else {
          setInvoices(invoices);
        }
      } catch (err) {
        console.error("Error in fetchInvoices:", err);
        setInvoiceError("Failed to load invoice history");
      } finally {
        setIsLoadingInvoices(false);
      }
    }

    // Fetch all data when component mounts or lastUserUpdate changes
    fetchAllData();

  }, [
    user?.profile?.customer_id,
    lastUserUpdate,
    userSubscription.subscription,
  ]);

  // Function to refresh all data
  const refreshAllData = async () => {
    // Refresh user data from auth context
    await refreshUserData();
    // Update lastUserUpdate to trigger data refetching in the useEffect
    setLastUserUpdate(new Date());
  };

  // Add a separate handler for when users click X or outside the modal
  const handleDismissConfirmation = () => {
    setShowConfirmationModal(false);
  };

  // Handle confirmation close - now only used for errors and subscription changes
  const handleConfirmationClose = async () => {
    setShowConfirmationModal(false);
    // Refresh all data after confirmation dialog is closed
    await refreshAllData();
  };

  // Update handleConfirmPlanChange to use refreshAllData
  const handleConfirmPlanChange = async () => {
    if (selectedBillingPeriod === userSubscription.subscription) {
      // Don't do anything if they select their current plan
      setShowPlanModal(false);
      return;
    }

    // Start loading immediately when user confirms
    setIsPlanChangeLoading(true);

    // Handle lifetime plan separately - always goes to checkout
    if (selectedBillingPeriod === "lifetime") {
      setShowPlanModal(false);
      setIsPlanChangeLoading(false);

      await initiateCheckoutHook("lifetime", {});
      return;
    }

    // For users without a plan, direct to checkout
    if (userSubscription.subscription === "none") {
      setShowPlanModal(false);
      setIsPlanChangeLoading(false);

      // Convert SubscriptionType to PlanType, handling 'admin' and 'none' cases
      let validPlanType: "monthly" | "annual" | "lifetime";
      if (
        selectedBillingPeriod === "monthly" ||
        selectedBillingPeriod === "annual" ||
        selectedBillingPeriod === "lifetime"
      ) {
        validPlanType = selectedBillingPeriod;
      } else {
        // Default to monthly for 'admin', 'none', or any other invalid types
        validPlanType = "monthly";
      }

      await initiateCheckoutHook(validPlanType, {
        willProvideCard,
      });
      return;
    }

    // For existing users with an active plan switching between monthly/annual
    // Redirect them to Stripe Checkout to review and confirm the change
    try {
      // Convert SubscriptionType to PlanType for checkout
      let validPlanType: "monthly" | "annual" | "lifetime";
      if (
        selectedBillingPeriod === "monthly" ||
        selectedBillingPeriod === "annual" ||
        selectedBillingPeriod === "lifetime"
      ) {
        validPlanType = selectedBillingPeriod;
      } else {
        // Default to monthly for any other invalid types
        validPlanType = "monthly";
      }

      // Keep modal open and show loading spinner while creating checkout session
      // Redirect to Stripe Checkout for plan change
      const result = await initiateCheckoutHook(validPlanType, {
        isPlanChange: true,
      });

      // If checkout was successful, the redirect will happen automatically
      // If there was an error, close modal and reset loading
      if (!result.success) {
        setIsPlanChangeLoading(false);
        setShowPlanModal(false);
      }
      // If successful, keep loading state until redirect happens
    } catch (error) {
      console.error("Error initiating checkout:", error);
      setIsPlanChangeLoading(false);
      setShowPlanModal(false);
    }
  };

  // Format the date for display
  const formatDate = (date: string | number | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(t("common.locale", "en-US"), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get the price for the current subscription
  const getCurrentPrice = (): string => {
    const price =
      userSubscription.subscription === "monthly"
        ? monthlyPrice
        : userSubscription.subscription === "annual"
        ? yearlyPrice
        : lifetimePrice;

    return price !== null ? price.toString() : "--";
  };

  const handlePlanChange = () => {
    // Reset to current interval when opening modal
    setSelectedBillingPeriod(
      userSubscription.subscription === "none"
        ? "monthly"
        : userSubscription.subscription
    );

    // Reset willProvideCard to true on modal open
    setWillProvideCard(true);

    setShowPlanModal(true);
  };

  const handleBillingPeriodChange = (period: SubscriptionType) => {
    // Don't allow selecting the current plan if they already have one
    if (
      userSubscription.subscription !== "none" &&
      period === userSubscription.subscription
    ) {
      return;
    }
    setSelectedBillingPeriod(period);
  };

  // Wrapper function to handle the string parameter from PlanSelectionModal
  const handleIntervalChange = (interval: string) => {
    handleBillingPeriodChange(interval as SubscriptionType);
  };

  const handleCardToggleChange = (newValue: boolean) => {
    setWillProvideCard(newValue);
  };

  // Handle "Manage Billing" depending on subscription source
  const handleManageBilling = async () => {
    // If subscription is managed through the iOS App Store, send the user there
    if (userSubscription.subscription_source === "ios") {
      // For App Store subscriptions, billing is managed in the App Store / Apple ID settings,
      // not via Stripe. Redirect to Apple's subscriptions management page.
      try {
        window.location.href = "https://apps.apple.com/account/subscriptions";
      } catch {
        // If redirect fails for some reason, fall back to an explanatory message.
        setConfirmationTitle(
          t(
            "dashboard.billing.appStoreManageTitle",
            "Manage Subscription in App Store"
          )
        );
        setConfirmationMessage(
          t(
            "dashboard.billing.appStoreManageMessage",
            "This subscription is billed through the Apple App Store. Open the App Store on your device, tap your account avatar, then tap Subscriptions to manage or cancel."
          )
        );
        setShowConfirmationModal(true);
      }
      return;
    }

    // Stripe / web-managed subscriptions
    if (!user?.profile?.customer_id) {
      setConfirmationTitle("Error");
      setConfirmationMessage("No customer account found.");
      setShowConfirmationModal(true);
      return;
    }

    try {
      // Show loading spinner
      setIsPortalLoading(true);

      const { url, error } = await createCustomerPortalSession(
        user.profile.customer_id
      );

      if (url) {
        // Redirect to Stripe Customer Portal
        window.location.href = url;
      } else {
        // Hide loading spinner on error
        setIsPortalLoading(false);

        // Show error message
        setConfirmationTitle(t("dashboard.billing.error", "Error"));
        setConfirmationMessage(
          t(
            "dashboard.billing.portalAccessError",
            "Failed to access billing portal: {{error}}",
            {
              error: error || t("common.unknownError", "Unknown error"),
            }
          )
        );
        setShowConfirmationModal(true);
      }
    } catch (e) {
      // Hide loading spinner on error
      setIsPortalLoading(false);

      console.error("Billing portal error:", e);
      setConfirmationTitle(t("dashboard.billing.error", "Error"));
      setConfirmationMessage(
        t("dashboard.billing.errorOccurred", "An error occurred: {{error}}", {
          error:
            e instanceof Error
              ? e.message
              : t("common.unknownError", "Unknown error"),
        })
      );
      setShowConfirmationModal(true);
    }
  };

  return (
    <BillingContainer>
      {/* Loading overlay */}
      {isPortalLoading && (
        <LoadingOverlay>
          <LoadingComponent size="50px" text="" />
          <SpinnerText>
            {t(
              "dashboard.billing.redirectingPortal",
              "Redirecting to billing portal..."
            )}
          </SpinnerText>
        </LoadingOverlay>
      )}

      <SectionTitle>
        {t("dashboard.billing.title", "Billing & Subscription")}
      </SectionTitle>


      {priceError && (
        <AlertBanner style={{ backgroundColor: "rgba(255, 72, 66, 0.1)" }}>
          <FaTimes />
          <p>
            {priceError}{" "}
            {t(
              "dashboard.billing.showingDefaultPrices",
              "Showing default prices."
            )}
          </p>
        </AlertBanner>
      )}

      {isSubscriptionNone(userSubscription.subscription) && hasNfr === false ? (
        // Show subscription status and pricing card when user has no subscription and no NFR
        <div style={{ marginTop: "2rem" }}>
          {/* Subscription Status Card */}
          <BillingCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <CardTitle>
              <FaInfoCircle />{" "}
              {t("dashboard.billing.subscriptionStatus", "Subscription Status")}
            </CardTitle>
            <CardContent>
              <PlanDetails>
                {/* Left Column */}
                <div>
                  <PlanName>
                    {t(
                      "dashboard.billing.noActivePlan",
                      "No Active Subscription"
                    )}
                  </PlanName>
                  <PlanDescription>
                    {t(
                      "dashboard.billing.noActivePlanDesc",
                      "You currently don't have an active subscription. Subscribe below to unlock all premium features."
                    )}
                  </PlanDescription>
                </div>

              </PlanDetails>
            </CardContent>
          </BillingCard>

          {/* Pricing Card */}
          <BillingToggle
            billingPeriod={selectedBillingPeriodForPricing}
            onBillingPeriodChange={(period) =>
              setSelectedBillingPeriodForPricing(period)
            }
            userSubscription={userSubscription.subscription}
            showSavingsInfo={true}
          />
          <PricingCard
            billingPeriod={selectedBillingPeriodForPricing}
            onBillingPeriodChange={(period) =>
              setSelectedBillingPeriodForPricing(period)
            }
          />
        </div>
      ) : (
        // Show current plan card when user has a subscription
        <BillingCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CardTitle>
            <FaCrown /> {t("dashboard.billing.currentPlan", "Current Plan")}
          </CardTitle>
          <CardContent>
            <PlanDetails>
              {/* Left Column */}
              <div>
                <PlanName>
                  <div className="logo-container">
                    <NNAudioLogo
                      size="36px"
                      fontSize="1.5rem"
                      showText={true}
                      onClick={(e: React.MouseEvent) => e.preventDefault()}
                      href=""
                      className=""
                    />
                    <span className="pro-label">PRO</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "1rem",
                    }}
                  >
                    <div className="plan-type">
                      {hasNfr
                        ? "Elite Access"
                        : isSubscriptionLifetime(userSubscription.subscription)
                        ? t("dashboard.billing.lifetimePlan", "Lifetime")
                        : subscriptionInterval === "month"
                        ? t("dashboard.billing.monthly", "Monthly")
                        : t("dashboard.billing.yearly", "Yearly")}
                    </div>
                    {/* Hide hyphen and price for lifetime and Elite access */}
                    {!(
                      hasNfr ||
                      isSubscriptionLifetime(userSubscription.subscription)
                    ) && (
                      <>
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "2.5rem",
                            fontWeight: 700,
                          }}
                        >
                          —
                        </span>
                        <PlanPrice>
                          {isSubscriptionNone(userSubscription.subscription)
                            ? "$0.00"
                            : `$${getCurrentPrice()} / ${
                                subscriptionInterval === "month"
                                  ? t("dashboard.billing.month", "month")
                                  : t("dashboard.billing.year", "year")
                              }`}
                        </PlanPrice>
                      </>
                    )}
                  </div>
                </PlanName>
                <PlanDescription>
                  {hasNfr
                    ? "Elite Access - Full access to all premium features"
                    : isSubscriptionNone(userSubscription.subscription)
                    ? t(
                        "dashboard.billing.noPlanDesc",
                        "No active subscription"
                      )
                    : isSubscriptionLifetime(userSubscription.subscription)
                    ? t(
                        "dashboard.billing.lifetimePlanDesc",
                        "Full access to all features forever with free updates"
                      )
                    : t(
                        "dashboard.billing.paidPlanDesc",
                        "Full access to all premium features and content"
                      )}
                  {userSubscription.subscription_source === "ios" && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <FaApple style={{ fontSize: "0.9rem" }} />
                      <span>
                        {t(
                          "dashboard.billing.appStoreSubscription",
                          "Subscription managed through App Store"
                        )}
                      </span>
                    </div>
                  )}
                </PlanDescription>
              </div>

              {/* Right Column */}
              <div>
                {/* Next billing date */}
                {!isSubscriptionNone(userSubscription.subscription) &&
                  !isSubscriptionLifetime(userSubscription.subscription) &&
                  hasNfr !== true && (
                    <div style={{ marginTop: "0" }}>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-secondary)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {t(
                          "dashboard.billing.nextBilling",
                          "Next billing date"
                        )}
                        :
                      </div>
                      <div>
                        {formatDate(userSubscription.subscription_expiration)}
                      </div>
                    </div>
                  )}

                {userSubscription.cancel_at_period_end && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.75rem",
                      background: "rgba(255, 87, 51, 0.1)",
                      borderRadius: "6px",
                      color: "var(--warning)",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <FaInfoCircle
                      style={{ marginRight: "0.5rem", flexShrink: 0 }}
                    />
                    {t(
                      "dashboard.billing.cancelNotice",
                      "Your subscription will be canceled on {{date}}. You will have access until then.",
                      {
                        date: formatDate(
                          userSubscription.subscription_expiration
                        ),
                      }
                    )}
                  </div>
                )}
              </div>
            </PlanDetails>

            <ButtonContainer>
              <Button onClick={handleManageBilling}>
                {t("dashboard.billing.manageBilling", "Manage Billing")}
              </Button>
              {/* Show change plan only for non-lifetime subscriptions */}
              {!isSubscriptionLifetime(userSubscription.subscription) && (
                <Button
                  onClick={handlePlanChange}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {t("dashboard.billing.changePlan", "Change Plan")}
                </Button>
              )}
            </ButtonContainer>
          </CardContent>
        </BillingCard>
      )}

      {/* Only show billing history for paid subscribers */}
      {(!isSubscriptionNone(userSubscription.subscription) ||
        hasNfr === true) && (
        <BillingCard>
          <CardTitle>
            <FaHistory />{" "}
            {t("dashboard.billing.paymentHistory", "Payment History")}
          </CardTitle>
          <CardContent>
            {isLoadingInvoices ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "2rem 0",
                }}
              >
                <LoadingComponent
                  size="30px"
                  text={t(
                    "dashboard.billing.loadingInvoices",
                    "Loading invoices..."
                  )}
                />
              </div>
            ) : invoiceError ? (
              <div style={{ color: "var(--error)", padding: "1rem 0" }}>
                {invoiceError}
              </div>
            ) : invoices.length === 0 ? (
              <div
                style={{ color: "var(--text-secondary)", padding: "1rem 0" }}
              >
                {t(
                  "dashboard.billing.noTransactions",
                  "No transaction history available"
                )}
              </div>
            ) : (
              <InvoicesList>
                {invoices.map((invoice) => (
                  <InvoiceItem key={invoice.id}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div>{invoice.number || invoice.id}</div>
                      <InvoiceDate>{formatDate(invoice.created)}</InvoiceDate>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <InvoiceAmount>
                        ${invoice.amount.toFixed(2)}
                      </InvoiceAmount>
                      <InvoiceStatus
                        status={invoice.status === "paid" ? "paid" : "unpaid"}
                      >
                        {invoice.status === "paid"
                          ? t("dashboard.billing.paid", "Paid")
                          : t("dashboard.billing.unpaid", "Unpaid")}
                      </InvoiceStatus>
                      {invoice.receipt_url && (
                        <DownloadButton
                          onClick={() => {
                            window.open(invoice.receipt_url, "_blank");
                          }}
                        >
                          <FaExternalLinkAlt />
                          {t("dashboard.billing.viewReceipt", "View")}
                        </DownloadButton>
                      )}
                    </div>
                  </InvoiceItem>
                ))}
              </InvoicesList>
            )}
          </CardContent>
        </BillingCard>
      )}

      {/* Plan Selection Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <PlanSelectionModal
            isOpen={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            profile={userSubscription}
            onIntervalChange={handleIntervalChange}
            onConfirm={handleConfirmPlanChange}
            formatDate={formatDate}
            planName="NNAudio Pro"
            monthlyPrice={monthlyPrice ?? 0}
            yearlyPrice={yearlyPrice ?? 0}
            lifetimePrice={lifetimePrice ?? 0}
            planDescription={t("pricing.proSolution")}
            isPlanChangeLoading={isPlanChangeLoading}
            planFeatures={(() => {
              // Use the same features array as the main pricing section
              try {
                const translatedFeatures = t("pricing.features", {
                  returnObjects: true,
                });

                // Check if it's an array and has elements
                if (
                  Array.isArray(translatedFeatures) &&
                  translatedFeatures.length > 0
                ) {
                  return translatedFeatures;
                }
              } catch (error) {
                console.log("Error loading translated features", error);
              }

              // Fallback to English features
              return [
                "Song Builder with Multi-Track Management",
                "Intelligent Pattern Editor & Chord Adaptation",
                "Gestural Harmony Palette Interface",
                "Advanced Voice Leading & Chord Voicings",
                "Interactive Chord Progression Timeline",
                "Complete Voice and Range Control",
                "Standalone App & DAW Plugin Support",
                "Real-Time Chord Reharmonization Tools",
                "Comprehensive Arrangement View",
                "Custom Voicing Generation Engine",
                "Premium Support & All Future Updates",
              ];
            })()}
            monthlyDiscount={monthlyDiscount || undefined}
            yearlyDiscount={yearlyDiscount || undefined}
            lifetimeDiscount={lifetimeDiscount || undefined}
            onCardToggleChange={handleCardToggleChange}
            isPlanChangeLoading={isPlanChangeLoading}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmationModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismissConfirmation}
          >
            <ModalContent
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "500px" }}
            >
              <ModalHeader>
                <ModalTitle>{confirmationTitle}</ModalTitle>
                <CloseButton onClick={handleDismissConfirmation}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>
              <ModalBody
                style={{ textAlign: "center", padding: "2rem 1.5rem" }}
              >
                <div
                  style={{
                    fontSize: "4rem",
                    marginBottom: "1rem",
                    color:
                      confirmationTitle.includes("Error") ||
                      confirmationTitle.includes("Failed")
                        ? "var(--error)"
                        : "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {confirmationTitle.includes("Upgrading") ? (
                    <FaCrown />
                  ) : confirmationTitle.includes("Scheduled") ? (
                    <FaInfoCircle />
                  ) : confirmationTitle.includes("Error") ||
                    confirmationTitle.includes("Failed") ? (
                    <FaTimes />
                  ) : (
                    <FaCheck />
                  )}
                </div>
                <p
                  style={{
                    fontSize: "1.1rem",
                    color: "var(--text)",
                    marginBottom: "1.5rem",
                  }}
                >
                  {confirmationMessage}
                </p>
              </ModalBody>
              <ModalFooter style={{ justifyContent: "center" }}>
                <Button onClick={handleConfirmationClose}>
                  {confirmationTitle.includes("Upgrading")
                    ? t(
                        "dashboard.billing.continueToCheckout",
                        "Continue to Checkout"
                      )
                    : confirmationTitle.includes("Error") ||
                      confirmationTitle.includes("Failed")
                    ? t("dashboard.main.close", "Close")
                    : t("dashboard.billing.gotIt", "Got It")}
                </Button>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </BillingContainer>
  );
}
