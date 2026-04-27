/**
 * @fileoverview Dashboard settings: personal name, email change (Supabase Auth), password reset, account deletion.
 * @module app/(private)/(dashboard)/settings/page
 */
"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FaGlobe,
  FaTrash,
  FaExclamationTriangle,
  FaTimes,
  FaCheck,
  FaInfoCircle,
  FaUser,
  FaLock,
  FaSave,
  FaTimesCircle,
  FaEnvelope,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedCard from "@/components/settings/CardComponent";
import { deleteUserAccount } from "@/utils/stripe/supabase-stripe";
import { useTranslation } from "react-i18next";

const SettingsContainer = styled.div`
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
`;

const SettingsList = styled.div`
  display: flex;
  flex-direction: column;
`;

const SettingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const SettingInfo = styled.div`
  flex: 1;
`;

const SettingTitle = styled.div`
  font-size: 1rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const SettingDescription = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const SelectWrapper = styled.div`
  position: relative;

  &::after {
    content: "▼";
    font-size: 0.8rem;
    color: var(--text-secondary);
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
`;

const Select = styled.select`
  background-color: rgba(30, 30, 46, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text);
  padding: 0.5rem 2rem 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  appearance: none;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
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
  margin-top: 1rem;
  display: flex;
  align-items: center;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(108, 99, 255, 0.3);
  }
`;

// Modal components
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
  max-width: 500px;
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

interface SettingsState {
  // Remove the language: string; entry
  // If this is the only entry, make it an empty interface
}

interface ProfileState {
  deleteConfirmation: string;
  first_name: string;
  last_name: string;
}

function Settings() {
  const { t } = useTranslation();
  const {
    user,
    refreshUser,
    updateProfile,
    resetPassword,
    requestEmailChange,
  } = useAuth();
  const searchParams = useSearchParams();
  
  const [settings, setSettings] = useState<SettingsState>({
    // Remove the language: "en" entry
  });

  const [profile, setProfile] = useState<ProfileState>({
    deleteConfirmation: "",
    first_name: user?.profile?.first_name || "",
    last_name: user?.profile?.last_name || "",
  });

  const [profileMessage, setProfileMessage] = useState<{
    text: string;
    type: "error" | "success" | "";
  }>({ text: "", type: "" });

  // Refresh pro status on mount (same as login)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]); // Run on mount and when refreshUser changes

  // Initialize profile data from user
  useEffect(() => {
    if (user?.profile) {
      setProfile((prev) => ({
        ...prev,
        first_name: user.profile.first_name || "",
        last_name: user.profile.last_name || "",
      }));
    }
  }, [user]);

  /**
   * @brief Surfaces a confirmation banner when the user lands on settings via the
   * email-change confirmation callback. Refreshes auth state so the displayed
   * email reflects the new value, then strips the query param so the message
   * does not re-appear on refresh.
   */
  useEffect(() => {
    const status = searchParams.get("email_change");
    if (status !== "success" && status !== "already_confirmed") {
      return;
    }

    if (status === "success") {
      setProfileMessage({
        text: t(
          "dashboard.settings.emailChangeSuccess",
          "Your email address has been updated."
        ),
        type: "success",
      });
    } else {
      setProfileMessage({
        text: t(
          "dashboard.settings.emailChangeAlreadyConfirmed",
          "This email change link was already used. Your email is already up to date."
        ),
        type: "success",
      });
    }

    refreshUser().catch(() => {});

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("email_change");
      window.history.replaceState({}, "", url.toString());
    }

    const timer = setTimeout(() => {
      setProfileMessage({ text: "", type: "" });
    }, 6000);
    return () => clearTimeout(timer);
  }, [searchParams, t, refreshUser]);

  // Modal states
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [confirmationIcon, setConfirmationIcon] = useState<
    "success" | "warning" | "info"
  >("success");

  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [isEmailChangeSubmitting, setIsEmailChangeSubmitting] = useState(false);

  const handleSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    key: keyof SettingsState
  ) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: e.target.value,
    }));
  };

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: keyof ProfileState
  ) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      [key]: e.target.value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.profile) return;

    const updatedProfile = {
      ...user.profile,
      first_name: profile.first_name,
      last_name: profile.last_name,
    };

    try {
      const { error } = await updateProfile(updatedProfile);
      if (error) {
        setProfileMessage({
          text: t(
            "dashboard.profile.errorUpdating",
            "Error updating profile: {{error}}",
            { error: error.toString() }
          ),
          type: "error",
        });
      } else {
        setProfileMessage({
          text: t(
            "dashboard.profile.profileUpdated",
            "Profile information updated successfully!"
          ),
          type: "success",
        });
      }
    } catch (error) {
      setProfileMessage({
        text: t(
          "dashboard.profile.unexpectedError",
          "An unexpected error occurred: {{error}}",
          {
            error: error instanceof Error ? error.message : "Unknown error",
          }
        ),
        type: "error",
      });
    }

    // Clear message after 3 seconds
    setTimeout(() => {
      setProfileMessage({ text: "", type: "" });
    }, 3000);
  };

  /**
   * @brief Submits a Supabase Auth email change request and shows success modal or inline error.
   */
  const handleEmailChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailChangeError(null);
    setIsEmailChangeSubmitting(true);
    try {
      const { error } = await requestEmailChange(newEmailInput);
      if (error) {
        setEmailChangeError(error.message);
        return;
      }
      setNewEmailInput("");
      setConfirmationTitle(
        t(
          "dashboard.settings.emailChangeCheckInboxTitle",
          "Check your email"
        )
      );
      setConfirmationMessage(
        t(
          "dashboard.settings.emailChangeCheckInboxMessage",
          "We sent a confirmation link. Open it to complete the change. If secure email change is enabled in your project, check both your current and new inboxes."
        )
      );
      setConfirmationIcon("info");
      setShowConfirmationModal(true);
    } finally {
      setIsEmailChangeSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      setProfileMessage({
        text: t(
          "dashboard.profile.noEmailFound",
          "No email address found for password reset"
        ),
        type: "error",
      });
      return;
    }

    try {
      const { error } = await resetPassword(user.email);
      if (error) {
        if (
          error.message.includes("email rate limit exceeded") ||
          error.message.includes("rate limit")
        ) {
          setProfileMessage({
            text: t(
              "dashboard.profile.tooManyAttempts",
              "Too many password reset attempts. Please wait a few minutes before trying again."
            ),
            type: "error",
          });
        } else {
          setProfileMessage({
            text: t(
              "dashboard.profile.errorSendingReset",
              "Error sending reset email: {{error}}",
              { error: error.message }
            ),
            type: "error",
          });
        }
      } else {
        setProfileMessage({
          text: t(
            "dashboard.profile.passwordResetSent",
            "Password reset email sent! Please check your inbox."
          ),
          type: "success",
        });
      }
    } catch (error) {
      setProfileMessage({
        text: t(
          "dashboard.profile.unexpectedError",
          "An unexpected error occurred: {{error}}",
          {
            error: error instanceof Error ? error.message : "Unknown error",
          }
        ),
        type: "error",
      });
    }

    // Clear message after 3 seconds
    setTimeout(() => {
      setProfileMessage({ text: "", type: "" });
    }, 3000);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle account deletion logic

    if (profile.deleteConfirmation !== "DELETE") {
      setConfirmationTitle(
        t("dashboard.settings.confirmationRequired", "Confirmation Required")
      );
      setConfirmationMessage(
        t(
          "dashboard.settings.confirmationMessage",
          'Please type "DELETE" to confirm account deletion.'
        )
      );
      setConfirmationIcon("warning");
      setShowConfirmationModal(true);
      return;
    }

    // Show loading confirmation
    setConfirmationTitle(
      t("dashboard.settings.processingDeletion", "Processing Deletion Request")
    );
    setConfirmationMessage(
      t(
        "dashboard.settings.processingMessage",
        "Please wait while we process your account deletion request..."
      )
    );
    setConfirmationIcon("info");
    setShowConfirmationModal(true);

    try {
      if (!user?.id) {
        throw new Error("User ID not found");
      }

      const result = await deleteUserAccount(user.id);

      if (result.success) {
        // Show success message
        setConfirmationTitle(
          t("dashboard.settings.accountDeleted", "Account Deleted")
        );
        setConfirmationMessage(
          t(
            "dashboard.settings.accountDeletedMessage",
            "Your account has been successfully deleted. You will be redirected to the homepage."
          )
        );
        setConfirmationIcon("success");

        // Wait 3 seconds then redirect to homepage
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      } else {
        // Show error message
        setConfirmationTitle(
          t("dashboard.settings.deletionFailed", "Deletion Failed")
        );
        setConfirmationMessage(
          t(
            "dashboard.settings.deletionFailedError",
            "Account deletion failed: {{error}}",
            { error: result.error }
          )
        );
        setConfirmationIcon("warning");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      setConfirmationTitle(
        t("dashboard.settings.deletionFailed", "Deletion Failed")
      );
      setConfirmationMessage(
        t(
          "dashboard.settings.deletionProcessingError",
          "There was an error processing your account deletion. Please try again later."
        )
      );
      setConfirmationIcon("warning");
    }

    // Reset confirmation field
    setProfile((prev) => ({
      ...prev,
      deleteConfirmation: "",
    }));
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
    <SettingsContainer>
      <SectionTitle>{t("dashboard.settings.title", "Settings")}</SectionTitle>

      {/* Profile Settings */}
      {profileMessage.text && (
        <Message type={profileMessage.type as "error" | "success"}>
          {profileMessage.type === "error" ? <FaTimesCircle /> : <FaUser />}
          {profileMessage.text}
        </Message>
      )}

      <AnimatedCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <CardTitle>
          <FaUser />{" "}
          {t("dashboard.profile.personalInfo", "Personal Information")}
        </CardTitle>
        <CardContent>
          <Form onSubmit={handleSaveProfile}>
            <TwoColumnGrid>
              <FormGroup>
                <Label>{t("dashboard.profile.firstName", "First Name")}</Label>
                <Input
                  type="text"
                  value={profile.first_name}
                  onChange={(e) => handleProfileChange(e, "first_name")}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>{t("dashboard.profile.lastName", "Last Name")}</Label>
                <Input
                  type="text"
                  value={profile.last_name}
                  onChange={(e) => handleProfileChange(e, "last_name")}
                  required
                />
              </FormGroup>
            </TwoColumnGrid>

            <Button
              type="submit"
              as={motion.button}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaSave /> {t("dashboard.profile.saveChanges", "Save Changes")}
            </Button>
          </Form>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <CardTitle>
          <FaEnvelope />{" "}
          {t("dashboard.settings.emailAddressSection", "Email address")}
        </CardTitle>
        <CardContent>
          {user?.new_email ? (
            <PendingEmailBanner>
              <FaInfoCircle aria-hidden />
              {t(
                "dashboard.settings.emailChangePending",
                "Confirmation pending for {{email}}. Check that inbox and use the link we sent.",
                { email: user.new_email }
              )}
            </PendingEmailBanner>
          ) : null}
          <FormGroup>
            <HelperLabel>
              {t("dashboard.settings.currentEmailLabel", "Current email")}
            </HelperLabel>
            <CurrentEmailBox>{user?.email ?? "—"}</CurrentEmailBox>
          </FormGroup>
          <Form onSubmit={handleEmailChangeSubmit}>
            <FormGroup style={{ marginBottom: emailChangeError ? "0.5rem" : undefined }}>
              <Label htmlFor="settingsNewEmail">
                {t("dashboard.settings.newEmailLabel", "New email address")}
              </Label>
              <Input
                id="settingsNewEmail"
                type="email"
                autoComplete="email"
                value={newEmailInput}
                onChange={(e) => {
                  setNewEmailInput(e.target.value);
                  if (emailChangeError) setEmailChangeError(null);
                }}
                disabled={isEmailChangeSubmitting}
              />
            </FormGroup>
            {emailChangeError ? (
              <EmailInlineError role="alert">{emailChangeError}</EmailInlineError>
            ) : null}
            <EmailChangeSubmitButton
              type="submit"
              disabled={isEmailChangeSubmitting}
              as={motion.button}
              whileHover={isEmailChangeSubmitting ? undefined : { scale: 1.03 }}
              whileTap={isEmailChangeSubmitting ? undefined : { scale: 0.98 }}
            >
              <FaEnvelope style={{ marginRight: "0.5rem" }} />
              {t(
                "dashboard.settings.sendEmailConfirmation",
                "Send confirmation email"
              )}
            </EmailChangeSubmitButton>
          </Form>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <CardTitle>
          <FaLock /> {t("dashboard.profile.passwordSection", "Change Password")}
        </CardTitle>
        <CardContent>
          <Button
            onClick={handleResetPassword}
            as={motion.button}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaLock />{" "}
            {t("dashboard.profile.sendResetEmail", "Send Password Reset Email")}
          </Button>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <CardTitle>
          <FaTrash style={{ color: "var(--error)" }} />{" "}
          {t("dashboard.settings.dangerZone", "Danger Zone")}
        </CardTitle>
        <CardContent>
          <div
            style={{
              padding: "1rem",
              backgroundColor: "rgba(255, 69, 58, 0.1)",
              borderRadius: "6px",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "0.5rem",
                color: "var(--error)",
              }}
            >
              <FaExclamationTriangle style={{ marginRight: "0.5rem" }} />
              <div style={{ fontWeight: 600 }}>
                {t(
                  "dashboard.settings.deleteWarning",
                  "Delete Account Permanently"
                )}
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
              {t(
                "dashboard.settings.deleteDesc",
                "This action cannot be undone. All of your data will be permanently deleted."
              )}
            </p>

            <form onSubmit={handleDeleteAccount}>
              <div
                style={{
                  marginBottom: "1rem",
                }}
              >
                <label
                  htmlFor="deleteConfirmation"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {t(
                    "dashboard.settings.typeDelete",
                    'Type "DELETE" to confirm:'
                  )}
                </label>
                <input
                  type="text"
                  id="deleteConfirmation"
                  value={profile.deleteConfirmation}
                  onChange={(e) => handleProfileChange(e, "deleteConfirmation")}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "rgba(30, 30, 46, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "var(--text)",
                    borderRadius: "6px",
                  }}
                />
              </div>
              <Button
                type="submit"
                style={{
                  background: "var(--error)",
                  width: "100%",
                }}
              >
                {t("dashboard.settings.deleteAccount", "Delete My Account")}
              </Button>
            </form>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Confirmation Modal for various actions */}
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
                    color: "var(--primary)",
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
              <ModalFooter style={{ justifyContent: "center" }}>
                <Button onClick={handleModalClose}>
                  {t("dashboard.main.gotIt", "Got It")}
                </Button>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </SettingsContainer>
  );
}

// Additional styled components for the new form elements
const Form = styled.form`
  width: 100%;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    margin-bottom: 1.25rem;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text);
`;

const Input = styled.input`
  width: 100%;
  background-color: rgba(30, 30, 46, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.95rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  @media (max-width: 768px) {
    padding: 0.85rem 1rem;
    font-size: 16px; /* Prevent zoom on iOS */
    border-radius: 8px;
  }
`;

const HelperLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.35rem;
`;

const CurrentEmailBox = styled.div`
  padding: 0.75rem 1rem;
  background-color: rgba(30, 30, 46, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 0.95rem;
`;

const PendingEmailBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background-color: rgba(108, 99, 255, 0.12);
  border: 1px solid rgba(108, 99, 255, 0.35);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--text);

  svg {
    flex-shrink: 0;
    margin-top: 0.15rem;
    color: var(--primary);
  }
`;

const EmailInlineError = styled.div`
  color: var(--error);
  font-size: 0.85rem;
  margin-bottom: 1rem;
`;

const EmailChangeSubmitButton = styled(Button)`
  margin-top: 0;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

interface MessageProps {
  type: "error" | "success";
  children: React.ReactNode;
}

const Message = styled.div<MessageProps>`
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  color: ${(props) =>
    props.type === "error" ? "var(--error)" : "var(--success)"};
  background-color: ${(props) =>
    props.type === "error"
      ? "rgba(255, 87, 51, 0.1)"
      : "rgba(0, 201, 167, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.type === "error"
        ? "rgba(255, 87, 51, 0.3)"
        : "rgba(0, 201, 167, 0.3)"};
  display: flex;
  align-items: center;

  svg {
    margin-right: 0.75rem;
  }

  @media (max-width: 768px) {
    padding: 0.85rem;
    border-radius: 8px;
  }
`;

const WarningBox = styled.div`
  background-color: rgba(255, 87, 51, 0.1);
  border: 1px solid rgba(255, 87, 51, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;

  svg {
    color: var(--danger);
    margin-right: 0.75rem;
    font-size: 1.2rem;
    margin-top: 0.1rem;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
`;

const DangerButton = styled(Button)`
  background: linear-gradient(135deg, #ff5733, #c70039);

  &:hover {
    box-shadow: 0 5px 15px rgba(255, 87, 51, 0.3);
  }
`;

// Styled component for outline button
const OutlineButton = styled.button`
  background: transparent;
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    margin-right: 0.5rem;
  }

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-2px);
  }
`;

export default Settings;
