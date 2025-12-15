"use client";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCreditCard,
  FaHeadphones,
  FaCheck,
  FaTimes,
  FaPaperPlane,
  FaLaptop,
  FaExclamationTriangle,
  FaInfoCircle,
  FaDownload,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { capitalize } from "@/utils/stringUtils";
import { getUpcomingInvoice } from "@/utils/stripe/actions";
import { useRouter } from "next/navigation";
import LoadingComponent from "@/components/common/LoadingComponent";
import { fetchUserSessions } from "@/utils/supabase/actions";
import { useTranslation } from "react-i18next";

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 30px 20px;
  }
`;

const WelcomeSection = styled.div`
  margin-bottom: 30px;
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;

  span {
    background: linear-gradient(90deg, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.2rem;
  color: var(--text-secondary);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  cursor: pointer;
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const StatTitle = styled.h3`
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
`;

const StatIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: ${(props) =>
    props.color || "linear-gradient(90deg, var(--primary), var(--accent))"};
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 10px;
`;

const StatDescription = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 30px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const CardTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: var(--primary);
  }
`;

const CardContent = styled.div`
  flex: 1;
  margin-bottom: 20px;

  p {
    margin-bottom: 15px;
    color: var(--text-secondary);
  }
`;

const Button = styled.button`
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 7px 14px rgba(108, 99, 255, 0.2);
  }
`;

const SubscriptionInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-of-type {
    margin-bottom: 20px;
  }
`;

const InfoLabel = styled.span`
  color: var(--text-secondary);
`;

const InfoValue = styled.span`
  font-weight: 500;
`;

const TrialBadge = styled.div`
  position: absolute;
  top: 20px;
  right: -32px;
  background: linear-gradient(90deg, #ffd700, #ffa500);
  color: #1a1a1a;
  padding: 5px 40px 5px 50px;
  font-size: 0.8rem;
  font-weight: 700;
  transform: rotate(45deg);
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 10px;
  width: 100%;
  overflow: hidden;
  max-width: 600px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.3rem;
`;

const ModalBody = styled.div`
  padding: 20px 25px;
  max-height: 70vh;
  overflow-y: auto;
`;

const ModalFooter = styled.div`
  padding: 15px 25px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--text);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 7px;
  font-size: 0.95rem;
  color: var(--text);
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 15px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 12px 15px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-size: 1rem;
  min-height: 120px;
  transition: all 0.2s;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const formatName = (
  firstName: string | null,
  lastName: string | null
): string => {
  if (firstName || lastName) {
    return `${firstName || ""} ${lastName || ""}`.trim();
  }
  return "";
};

function DashboardPage() {
  const { t } = useTranslation();
  const { user: userAuth, refreshUser } = useAuth();
  const user = userAuth!;
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  // Refresh pro status on mount (same as login)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]); // Run on mount and when refreshUser changes

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  const [hasNfr, setHasNfr] = useState<boolean | null>(null);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationIcon, setConfirmationIcon] = useState<
    "success" | "warning" | "info"
  >("success");
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [deviceCount, setDeviceCount] = useState(0);
  const [maxDevices, setMaxDevices] = useState(3);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  // State for prices
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(null);
  const [lifetimePrice, setLifetimePrice] = useState<number | null>(null);

  // State for upcoming invoice
  const [upcomingInvoice, setUpcomingInvoice] = useState<{
    amount: number | null;
    due_date: Date | null;
    error: string | null;
  }>({
    amount: null,
    due_date: null,
    error: null,
  });
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Trial duration in days
  const trialDays = 7; // Default value

  // Get trial duration based on plan
  const getTrialDuration = () => {
    return trialDays;
  };

  // Format date for display
  const formatDate = (date: string | number | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(t("common.locale", "en-US"), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch device count on component mount
  useEffect(() => {
    async function fetchDeviceCount() {
      try {
        setIsLoadingDevices(true);
        const { sessions, error } = await fetchUserSessions();

        if (error) {
          console.error("Error fetching device count:", error);
        } else {
          setDeviceCount(sessions?.length || 0);
        }
      } catch (err) {
        console.error("Error in fetchDeviceCount:", err);
      } finally {
        setIsLoadingDevices(false);
      }
    }

    if (user) {
      fetchDeviceCount();
    }
  }, [user]);

  // Fetch NFR status
  useEffect(() => {
    async function fetchNfrStatus() {
      try {
        const response = await fetch("/api/user/nfr-status");
        const data = await response.json();
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

  // Determine if user has completed a trial
  const hasCompletedTrial = () => {
    // Consider a trial completed if user has a subscription that's not "none"
    // or if trial_expiration is in the past
    return (
      user.profile.subscription !== "none" ||
      (user.profile.trial_expiration &&
        new Date(user.profile.trial_expiration) < new Date())
    );
  };

  // Determine if we should show trial content
  const shouldShowTrialContent = () => {
    // Only show for active trial users
    return user?.profile.trial_expiration && !hasCompletedTrial();
  };

  // Get days left in trial
  const getDaysLeftInTrial = () => {
    if (!user?.profile.trial_expiration) return 0;

    const today = new Date();
    const trialEnd = new Date(user.profile.trial_expiration);
    const diffTime = Number(trialEnd) - Number(today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  const navigateToBilling = () => {
    router.push("/billing");
  };

  const navigateToDownloads = () => {
    router.push("/downloads");
  };

  const navigateToSettings = () => {
    router.push("/settings");
  };

  const handleContactInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setContactForm({
      ...contactForm,
      [name]: value,
    });
  };

  const handleContactSubmit = async () => {
    // Basic validation
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setConfirmationTitle(t("dashboard.main.error", "Error"));
      setConfirmationMessage(
        t("dashboard.main.fillAllFields", "Please fill in all fields")
      );
      setConfirmationIcon("warning");
      setShowConfirmationModal(true);
      return;
    }

    setIsContactSubmitting(true);

    try {
      // TODO: Implement actual contact form submission
      // Simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show success message
      setContactForm({
        name: "",
        email: "",
        message: "",
      });
      setShowContactModal(false);

      setConfirmationTitle(t("dashboard.main.messageSent", "Message Sent"));
      setConfirmationMessage(
        t(
          "dashboard.main.messageReceived",
          "We've received your message and will respond shortly."
        )
      );
      setConfirmationIcon("success");
      setShowConfirmationModal(true);
    } catch (error) {
      console.error("Error submitting contact form:", error);

      // Show error message
      setConfirmationTitle(t("dashboard.main.error", "Error"));
      setConfirmationMessage(
        t(
          "dashboard.main.messageError",
          "Failed to send your message. Please try again later."
        )
      );
      setConfirmationIcon("warning");
      setShowConfirmationModal(true);
    } finally {
      setIsContactSubmitting(false);
    }
  };

  // Fetch prices and upcoming invoice on component mount
  useEffect(() => {
    async function fetchPrices() {
      try {
        setIsLoadingPrices(true);
        setPriceError(null);

        const response = await fetch("/api/stripe/prices");
        const result = await response.json();

        if (result.error) {
          setPriceError(
            t(
              "dashboard.billing.errorOccurred",
              "An error occurred: {{error}}",
              { error: result.error }
            )
          );
          return;
        }

        if (result.success && result.prices) {
          setMonthlyPrice(Math.round(result.prices.monthly.amount / 100));
          setYearlyPrice(Math.round(result.prices.annual.amount / 100));
          setLifetimePrice(Math.round(result.prices.lifetime.amount / 100));
        }
      } catch (err) {
        console.error("Error fetching prices:", err);
        setPriceError(
          t("dashboard.billing.errorOccurred", "An error occurred: {{error}}", {
            error:
              err instanceof Error
                ? err.message
                : t("common.unknownError", "Unknown error"),
          })
        );
      } finally {
        setIsLoadingPrices(false);
      }
    }

    async function fetchUpcomingInvoice() {
      if (!user?.profile?.customer_id) return;

      try {
        setIsLoadingInvoice(true);

        const { amount, error } = await getUpcomingInvoice(
          user.profile.customer_id
        );

        if (error) {
          // Only show as error if it's not the common "no upcoming invoices" case
          setUpcomingInvoice({
            amount: null,
            due_date: null,
            error: error,
          });
        } else {
          setUpcomingInvoice({
            amount: amount,
            due_date: null, // API doesn't return due date currently
            error: null,
          });
        }
      } catch (err) {
        console.error("Error fetching upcoming invoice:", err);

        setUpcomingInvoice({
          amount: null,
          due_date: null,
          error: null, // Don't show errors for common cases like no upcoming invoices
        });
      } finally {
        setIsLoadingInvoice(false);
      }
    }

    // Only fetch if the user is logged in
    if (user) {
      fetchPrices();

      // Only fetch upcoming invoice if user has customer ID
      if (user.profile.customer_id) {
        fetchUpcomingInvoice();
      }
    }
  }, [user]);

  const handleModalClose = () => {
    setShowConfirmationModal(false);
  };

  // Function to render confirmation modal icon
  const renderConfirmationIcon = () => {
    switch (confirmationIcon) {
      case "warning":
        return <FaExclamationTriangle style={{ color: "var(--warning)" }} />;
      case "info":
        return <FaInfoCircle style={{ color: "var(--primary)" }} />;
      case "success":
      default:
        return <FaCheck style={{ color: "var(--success)" }} />;
    }
  };

  return (
    <DashboardContainer>
      <WelcomeSection>
        <WelcomeTitle>
          {(() => {
            const welcomeText = t(
              "dashboard.main.welcome",
              "Welcome back, {{name}}!",
              {
                name: formatName(
                  user.profile.first_name,
                  user.profile.last_name
                ),
              }
            );
            // On mobile, add line break after "Welcome back,"
            if (isMobile) {
              const parts = welcomeText.split(", ");
              if (parts.length === 2) {
                return (
                  <>
                    {parts[0]},<br />
                    {parts[1]}
                  </>
                );
              }
            }
            return welcomeText;
          })()}
        </WelcomeTitle>
        <WelcomeSubtitle>
          {user
            ? t(
                "dashboard.main.welcomeSubtitle",
                "Here's an overview of your NNAudio account"
              )
            : t(
                "dashboard.main.pleaseSignIn",
                "Please sign in to access your dashboard"
              )}
        </WelcomeSubtitle>
      </WelcomeSection>

      <StatsGrid>
        <StatCard
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          onClick={navigateToBilling}
        >
          <StatHeader>
            <StatTitle>{t("dashboard.main.plan", "Current Plan")}</StatTitle>
            <StatIcon color="linear-gradient(90deg, #6c63ff, #4ecdc4)">
              <FaCreditCard />
            </StatIcon>
          </StatHeader>
          <StatValue>
            {hasNfr === true
              ? "Elite Access"
              : user.profile.subscription === "none"
              ? t("common.none", "None")
              : capitalize(user.profile.subscription)}
          </StatValue>
          <StatDescription>
            {shouldShowTrialContent()
              ? t(
                  "dashboard.main.trialDaysLeft",
                  "{{days}} days left in your free trial",
                  { days: getDaysLeftInTrial() }
                )
              : user.profile.subscription === "lifetime"
              ? t(
                  "dashboard.main.lifetimeAccess",
                  "Includes free updates for life"
                )
              : user.profile.subscription !== "none"
              ? t("dashboard.main.fullAccess", "You have full access")
              : t(
                  "dashboard.main.upgradeToPro",
                  "Upgrade to Pro for full access"
                )}
          </StatDescription>
        </StatCard>

        <StatCard
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          onClick={navigateToDownloads}
        >
          <StatHeader>
            <StatTitle>{t("dashboard.main.product", "Product")}</StatTitle>
            <StatIcon color="linear-gradient(90deg, #9C27B0, #E91E63)">
              <FaDownload />
            </StatIcon>
          </StatHeader>
          <StatValue>{t("dashboard.main.downloads", "Downloads")}</StatValue>
          <StatDescription>
            {user.profile.subscription !== "none"
              ? t(
                  "dashboard.main.standaloneAndPlugins",
                  "Standalone App and Plugins"
                )
              : t("dashboard.main.subscribeForAccess", "Subscribe for access")}
          </StatDescription>
        </StatCard>

        <StatCard
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          onClick={navigateToSettings}
        >
          <StatHeader>
            <StatTitle>
              {t("dashboard.main.devices", "Connected Devices")}
            </StatTitle>
            <StatIcon color="linear-gradient(90deg, #FF6B6B, #FF8E53)">
              <FaLaptop />
            </StatIcon>
          </StatHeader>
          <StatValue>
            {isLoadingDevices ? (
              <div
                style={{
                  minWidth: "60px",
                  display: "inline-block",
                  textAlign: "center",
                }}
              >
                <LoadingComponent size="20px" text="" />
              </div>
            ) : (
              `${deviceCount} / ${maxDevices}`
            )}
          </StatValue>
          <StatDescription>
            {t("dashboard.main.activeDevices", "Active device connections")}
          </StatDescription>
        </StatCard>

        <StatCard
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          onClick={() => setShowContactModal(true)}
        >
          <StatHeader>
            <StatTitle>{t("dashboard.main.support", "Support")}</StatTitle>
            <StatIcon color="linear-gradient(90deg, #84fab0, #8fd3f4)">
              <FaHeadphones />
            </StatIcon>
          </StatHeader>
          <StatValue>
            {t("dashboard.main.supportAvailability", "24/7")}
          </StatValue>
          <StatDescription>
            {t("dashboard.main.premiumSupport", "Premium support available")}
          </StatDescription>
        </StatCard>
      </StatsGrid>

      <CardGrid>
        <Card whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          {shouldShowTrialContent() && (
            <TrialBadge>
              {t("dashboard.main.freeTrialBadge", "{{trialDays}}-Day Trial", {
                trialDays,
              })}
            </TrialBadge>
          )}
          <CardTitle>
            <FaCreditCard />{" "}
            {user.profile.subscription === "lifetime"
              ? t("dashboard.main.membership", "Membership")
              : t("dashboard.main.subscription", "Subscription")}
          </CardTitle>
          <CardContent>
            {/* Show price error if there is one */}
            {priceError && (
              <div
                style={{
                  color: "var(--error)",
                  marginBottom: "10px",
                  fontSize: "0.9rem",
                }}
              >
                {priceError}{" "}
                {t(
                  "dashboard.billing.showingDefaultPrices",
                  "Showing default prices."
                )}
              </div>
            )}
            <SubscriptionInfo>
              <InfoLabel>{t("dashboard.main.plan", "Current Plan")}</InfoLabel>
              <InfoValue>
                {hasNfr === true
                  ? "Elite Access"
                  : user.profile.subscription === "none"
                  ? t("common.none", "None")
                  : capitalize(user.profile.subscription)}
              </InfoValue>
            </SubscriptionInfo>
            {shouldShowTrialContent() && (
              <SubscriptionInfo>
                <InfoLabel>
                  {t("dashboard.main.trialStatus", "Trial Status")}
                </InfoLabel>
                <InfoValue>
                  {t(
                    "dashboard.main.daysRemaining",
                    "{{days}} days remaining",
                    { days: getDaysLeftInTrial() }
                  )}
                </InfoValue>
              </SubscriptionInfo>
            )}
            <SubscriptionInfo>
              <InfoLabel>
                {user.profile.subscription === "lifetime"
                  ? t("dashboard.main.purchasedOn", "Purchase Date")
                  : t("dashboard.main.renewalDate", "Renewal Date")}
              </InfoLabel>
              <InfoValue>
                {shouldShowTrialContent()
                  ? formatDate(user.profile.trial_expiration)
                  : user.profile.subscription_expiration
                  ? formatDate(user.profile.subscription_expiration)
                  : t("common.notAvailable", "N/A")}
              </InfoValue>
            </SubscriptionInfo>
            <SubscriptionInfo>
              <InfoLabel>
                {user.profile.subscription === "lifetime"
                  ? t("dashboard.main.futurePayments", "Future Payments")
                  : t("dashboard.main.nextPayment", "Next Payment")}
              </InfoLabel>
              <InfoValue>
                {shouldShowTrialContent() ? (
                  t(
                    "dashboard.main.firstPayment",
                    "${{amount}}.00 on {{date}}",
                    {
                      amount: isLoadingPrices ? "..." : monthlyPrice,
                      date: formatDate(user.profile.trial_expiration),
                    }
                  )
                ) : user.profile.subscription === "lifetime" ? (
                  "$0.00"
                ) : isLoadingInvoice ? (
                  <LoadingComponent size="16px" text="" />
                ) : upcomingInvoice.error ? (
                  "$0.00"
                ) : upcomingInvoice.amount ? (
                  t("dashboard.main.amountOnDate", "${{amount}} {{date}}", {
                    amount: upcomingInvoice.amount.toFixed(2),
                    date: upcomingInvoice.due_date
                      ? t("dashboard.main.onDate", "on {{date}}", {
                          date: formatDate(
                            upcomingInvoice.due_date.toISOString()
                          ),
                        })
                      : "",
                  })
                ) : (
                  "$0.00"
                )}
              </InfoValue>
            </SubscriptionInfo>
            <p>
              {shouldShowTrialContent()
                ? t(
                    "dashboard.main.trialMessage",
                    "You're currently on a {{trialDays}}-day free trial with full access to all premium features. No payment until your trial ends.",
                    { trialDays }
                  )
                : user.profile.subscription === "lifetime"
                ? t(
                    "dashboard.main.lifetimeMessage",
                    "You have a lifetime membership with free updates for life. Enjoy all premium features and benefits permanently."
                  )
                : user.profile.subscription !== "none"
                ? t(
                    "dashboard.main.activeSubscriptionMessage",
                    "Your {{plan}} subscription is active. Enjoy all premium features and benefits.",
                    {
                      plan: user.profile.subscription,
                    }
                  )
                : t(
                    "dashboard.main.upgradeMessage",
                    "Upgrade to unlock premium features and advanced audio processing capabilities."
                  )}
            </p>
            {user.profile.subscription !== "none" &&
              user.profile.subscription !== "lifetime" &&
              !shouldShowTrialContent() && (
                <p
                  style={{
                    marginTop: "10px",
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  💡{" "}
                  {t(
                    "dashboard.main.upgradeToLifetime",
                    "Upgrade to Lifetime access"
                  )}{" "}
                  - One-time payment, no recurring fees, free updates forever.
                </p>
              )}
          </CardContent>
          <Button
            onClick={
              user.profile.subscription === "lifetime"
                ? navigateToDownloads
                : navigateToBilling
            }
            disabled={isLoadingPrices}
          >
            {isLoadingPrices ? (
              <LoadingComponent size="20px" text="" />
            ) : user.profile.subscription === "lifetime" ? (
              t("dashboard.downloads.downloadButton", "Download")
            ) : (
              t("dashboard.main.upgradeNow", "Upgrade")
            )}
          </Button>
        </Card>

        <Card whileHover={{ y: -5, transition: { duration: 0.2 } }}>
          <CardTitle>
            <FaHeadphones /> {t("dashboard.main.support", "Support")}
          </CardTitle>
          <CardContent>
            <p>
              {t(
                "dashboard.main.needHelp",
                "Need help with your account or have questions?"
              )}
            </p>
            <p>
              {t(
                "dashboard.main.supportIntro",
                "Our team is ready to assist you with any questions or issues you might have."
              )}
            </p>
          </CardContent>
          <Button onClick={() => router.push("/support")}>
            {t("dashboard.main.contactSupport", "Contact Support")}
          </Button>
        </Card>
      </CardGrid>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmationModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleModalClose}
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
                <CloseButton onClick={handleModalClose}>
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
                      confirmationIcon === "warning"
                        ? "var(--warning)"
                        : confirmationIcon === "info"
                        ? "var(--primary)"
                        : "var(--success)",
                  }}
                >
                  {renderConfirmationIcon()}
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
              <ModalFooter>
                <Button onClick={handleModalClose}>
                  {t("dashboard.main.gotIt", "Got It")}
                </Button>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Contact Support Modal */}
      <AnimatePresence>
        {showContactModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowContactModal(false)}
          >
            <ModalContent
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  {t("dashboard.main.contactSupport", "Contact Support")}
                </ModalTitle>
                <CloseButton onClick={() => setShowContactModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>
              <ModalBody>
                <p style={{ marginBottom: "1.5rem" }}>
                  {t(
                    "dashboard.main.supportHelpText",
                    "Our support team is here to assist you with any questions or issues you might have."
                  )}
                </p>
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    htmlFor="name"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {t("dashboard.main.yourName", "Your Name")}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={contactForm.name}
                    onChange={handleContactInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      color: "var(--text)",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    htmlFor="email"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {t("dashboard.main.yourEmail", "Your Email")}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={contactForm.email}
                    onChange={handleContactInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      color: "var(--text)",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    htmlFor="message"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {t("dashboard.main.message", "Your Message")}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactInputChange}
                    rows={5}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      color: "var(--text)",
                      resize: "vertical",
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  onClick={handleContactSubmit}
                  disabled={isContactSubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {isContactSubmitting ? (
                    <>
                      <LoadingComponent size="18px" text="" />
                      <span>{t("dashboard.main.sending", "Sending...")}</span>
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      <span>
                        {t("dashboard.main.sendMessage", "Send Message")}
                      </span>
                    </>
                  )}
                </Button>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </DashboardContainer>
  );
}

export default DashboardPage;
