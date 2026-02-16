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
  FaExclamationTriangle,
  FaInfoCircle,
  FaDownload,
  FaShoppingBag,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import LoadingComponent from "@/components/common/LoadingComponent";
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
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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
  const [orderCount, setOrderCount] = useState(0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);


  // Format date for display
  const formatDate = (date: string | number | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(t("common.locale", "en-US"), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch order count on component mount
  useEffect(() => {
    async function fetchOrderCount() {
      try {
        setIsLoadingOrders(true);
        const response = await fetch("/api/orders/count");
        const data = await response.json();

        if (data.success && typeof data.count === "number") {
          setOrderCount(data.count);
        } else {
          setOrderCount(0);
        }
      } catch (err) {
        console.error("Error in fetchOrderCount:", err);
        setOrderCount(0);
      } finally {
        setIsLoadingOrders(false);
      }
    }

    if (user) {
      fetchOrderCount();
    }
  }, [user]);

  const navigateToBilling = () => {
    router.push("/billing");
  };

  const navigateToDownloads = () => {
    router.push("/downloads");
  };

  const navigateToOrders = () => {
    router.push("/my-orders");
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
          onClick={navigateToOrders}
        >
          <StatHeader>
            <StatTitle>{t("dashboard.main.orders", "Orders")}</StatTitle>
            <StatIcon color="linear-gradient(90deg, #6c63ff, #4ecdc4)">
              <FaShoppingBag />
            </StatIcon>
          </StatHeader>
          <StatValue>
            {isLoadingOrders ? (
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
              orderCount
            )}
          </StatValue>
          <StatDescription>
            {t("dashboard.main.totalOrders", "Total orders placed")}
          </StatDescription>
        </StatCard>

        <StatCard
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          onClick={() => router.push("/my-products")}
        >
          <StatHeader>
            <StatTitle>{t("dashboard.main.product", "Product")}</StatTitle>
            <StatIcon color="linear-gradient(90deg, #9C27B0, #E91E63)">
              <FaDownload />
            </StatIcon>
          </StatHeader>
          <StatValue>{t("dashboard.main.downloads", "Downloads")}</StatValue>
          <StatDescription>
            {t(
              "dashboard.main.viewPurchasedPlugins",
              "View your purchased plugins"
            )}
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
          <CardTitle>
            <FaCreditCard />{" "}
            {t("dashboard.main.yourPurchases", "Your Purchases")}
          </CardTitle>
          <CardContent>
            <p>
              {t(
                "dashboard.main.purchasesDesc",
                "View and download your purchased plugins and bundles. All purchases are one-time—no subscriptions."
              )}
            </p>
          </CardContent>
          <Button onClick={() => router.push("/my-products")}>
            {t("dashboard.main.viewMyProducts", "View My Products")}
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
