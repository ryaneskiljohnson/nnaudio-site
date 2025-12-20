"use client";
import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FaGlobe,
  FaTrash,
  FaExclamationTriangle,
  FaSignOutAlt,
  FaMobileAlt,
  FaDesktop,
  FaTabletAlt,
  FaTimes,
  FaCheck,
  FaInfoCircle,
  FaUser,
  FaLock,
  FaSave,
  FaTimesCircle,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedCard from "@/components/settings/CardComponent";
import { fetchUserSessions } from "@/utils/supabase/actions";
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

const DevicesList = styled.div`
  margin-top: 1rem;
  margin-bottom: 1.5rem;
`;

// Update the styled component for active session highlighting
const DeviceItem = styled.div<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: ${(props) =>
    props.$isActive ? "rgba(108, 99, 255, 0.1)" : "rgba(30, 30, 46, 0.5)"};
  border-radius: 6px;
  border: 1px solid
    ${(props) =>
      props.$isActive ? "var(--primary)" : "rgba(255, 255, 255, 0.05)"};
`;

const DeviceInfo = styled.div`
  display: flex;
  align-items: center;

  svg {
    margin-right: 0.75rem;
    color: var(--primary);
  }
`;

const DeviceName = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
`;

const DeviceDetails = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const DeviceCount = styled.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const DeviceLimit = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

interface DeviceCounterProps {
  $warning: boolean;
}

const StyledDeviceCounter = styled.div<DeviceCounterProps>`
  background-color: ${(props) =>
    props.$warning ? "rgba(255, 87, 51, 0.2)" : "rgba(108, 99, 255, 0.1)"};
  border-radius: 20px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${(props) => (props.$warning ? "var(--error)" : "var(--primary)")};
`;

// Create a wrapper component that accepts standard props and converts to transient props
const DeviceCounter: React.FC<
  React.PropsWithChildren<{ warning: boolean }>
> = ({ warning, children }) => {
  return (
    <StyledDeviceCounter $warning={warning}>{children}</StyledDeviceCounter>
  );
};

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

interface Device {
  name: string;
  type: "mobile" | "tablet" | "desktop";
  location: string;
  lastActive: string;
}

function Settings() {
  const { t } = useTranslation();
  const { user, session, signOut, refreshUser, updateProfile, resetPassword } = useAuth();
  
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

  // Modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [confirmationIcon, setConfirmationIcon] = useState<
    "success" | "warning" | "info"
  >("success");

  // Real session data for active devices
  const [activeDevices, setActiveDevices] = useState<Device[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Common function to refresh sessions data
  const refreshSessionData = useCallback(async () => {
    if (!user || !session) return;

    setIsLoadingSessions(true);
    try {
      const { sessions, error } = await fetchUserSessions();

      if (error) {
        console.error("Error fetching sessions:", error);
        return;
      }

      if (sessions && sessions.length > 0) {
        // Transform the session data into the device format
        const deviceData: Device[] = sessions.map((sessionData) => {
          // Determine device type based on device name
          let deviceType: "mobile" | "tablet" | "desktop" = "desktop";
          const deviceName = sessionData.device_name;

          if (
            deviceName.includes("Mobile") ||
            deviceName.includes("Android") ||
            deviceName.includes("iPhone")
          ) {
            deviceType = "mobile";
          } else if (
            deviceName.includes("iPad") ||
            deviceName.includes("Tablet")
          ) {
            deviceType = "tablet";
          }

          // Format last active time
          const formattedTime = formatLastActive(
            new Date(sessionData.last_used)
          );

          return {
            name: deviceName,
            type: deviceType,
            location: sessionData.ip,
            lastActive: formattedTime,
          };
        });

        setActiveDevices(deviceData);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user, session]);

  // Fetch the user's active sessions
  useEffect(() => {
    refreshSessionData();
  }, [refreshSessionData]);

  // Helper function to format the last active time
  const formatLastActive = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 5) {
      return t("dashboard.settings.timeNow", "Now");
    } else if (diffMins < 60) {
      return t("dashboard.settings.timeMinutes", "{{count}} min ago", {
        count: diffMins,
      });
    } else if (diffMins < 24 * 60) {
      const diffHours = Math.floor(diffMins / 60);
      return t("dashboard.settings.timeHours", "{{count}} hr ago", {
        count: diffHours,
        hr:
          diffHours === 1
            ? t("dashboard.settings.hour", "hr")
            : t("dashboard.settings.hours", "hrs"),
      });
    } else {
      const diffDays = Math.floor(diffMins / (60 * 24));
      return t("dashboard.settings.timeDays", "{{count}} day ago", {
        count: diffDays,
        day:
          diffDays === 1
            ? t("dashboard.settings.day", "day")
            : t("dashboard.settings.days", "days"),
      });
    }
  };

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

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      // Sign out of all devices using the auth context
      await signOut("others");

      setShowLogoutModal(false);
      setConfirmationTitle(
        t("dashboard.settings.logoutSuccess", "Logged Out Successfully")
      );
      setConfirmationMessage(
        t(
          "dashboard.settings.logoutMessage",
          "You have been logged out from all devices."
        )
      );
      setConfirmationIcon("success");
      setShowConfirmationModal(true);

      await refreshSessionData();
    } catch (error) {
      console.error("Error logging out:", error);
      setShowLogoutModal(false);
      setConfirmationTitle(
        t("dashboard.settings.logoutFailed", "Logout Failed")
      );
      setConfirmationMessage(
        t(
          "dashboard.settings.logoutError",
          "There was an error logging out from all devices. Please try again."
        )
      );
      setConfirmationIcon("warning");
      setShowConfirmationModal(true);
    }
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

  // Function to render the appropriate device icon
  const renderDeviceIcon = (type: "mobile" | "tablet" | "desktop") => {
    switch (type) {
      case "mobile":
        return <FaMobileAlt />;
      case "tablet":
        return <FaTabletAlt />;
      case "desktop":
      default:
        return <FaDesktop />;
    }
  };

  // Helper function to translate device types
  const getDeviceTypeName = (type: "mobile" | "tablet" | "desktop"): string => {
    switch (type) {
      case "mobile":
        return t("dashboard.settings.deviceMobile", "Mobile");
      case "tablet":
        return t("dashboard.settings.deviceTablet", "Tablet");
      case "desktop":
      default:
        return t("dashboard.settings.deviceDesktop", "Desktop");
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

            <FormGroup>
              <Label>{t("dashboard.profile.email", "Email Address")}</Label>
              <ReadOnlyInput
                type="email"
                value={user?.email || ""}
                readOnly
                disabled
              />
            </FormGroup>

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
          <FaMobileAlt /> {t("dashboard.settings.devices", "Active Devices")}
        </CardTitle>
        <CardContent>
          <DevicesList>
            {isLoadingSessions ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                {t("common.loading", "Loading...")}
              </div>
            ) : activeDevices.length === 0 ? (
              <div style={{ padding: "1rem 0" }}>
                {t("dashboard.settings.noDevices", "No active devices found")}
              </div>
            ) : (
              activeDevices.map((device, index) => (
                <DeviceItem
                  key={index}
                  $isActive={
                    device.location ===
                    "current" /* For current session highlighting */
                  }
                >
                  <DeviceInfo>
                    {renderDeviceIcon(device.type)}
                    <div>
                      <DeviceName>
                        {device.name} ({getDeviceTypeName(device.type)})
                      </DeviceName>
                      <DeviceDetails>
                        {device.location === "current"
                          ? t(
                              "dashboard.settings.currentDevice",
                              "Current Device"
                            )
                          : device.location}{" "}
                        · {device.lastActive}
                      </DeviceDetails>
                    </div>
                  </DeviceInfo>
                </DeviceItem>
              ))
            )}
          </DevicesList>

          <DeviceCount>
            <DeviceLimit>
              {t(
                "dashboard.settings.devicesInfo",
                "You're using {{current}} of {{max}} allowed devices",
                {
                  current: activeDevices.length,
                  max: 3,
                }
              )}
            </DeviceLimit>
            <DeviceCounter warning={activeDevices.length >= 3}>
              {activeDevices.length} / 3
            </DeviceCounter>
          </DeviceCount>

          <Button onClick={handleLogout}>
            <FaSignOutAlt style={{ marginRight: "0.5rem" }} />
            {t("dashboard.settings.logoutAll", "Logout from All Other Devices")}
          </Button>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
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

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutModal(false)}
          >
            <ModalContent
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  {t("dashboard.settings.confirmLogout", "Confirm Logout")}
                </ModalTitle>
                <CloseButton onClick={() => setShowLogoutModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>
              <ModalBody>
                <p>
                  {t(
                    "dashboard.settings.logoutConfirmation",
                    "Are you sure you want to sign out from all devices? This will end all your active sessions."
                  )}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  onClick={() => setShowLogoutModal(false)}
                  style={{
                    marginRight: "0.5rem",
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button onClick={confirmLogout}>
                  {t("dashboard.settings.signOut", "Sign Out")}
                </Button>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

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

const ReadOnlyInput = styled(Input)`
  background-color: rgba(30, 30, 46, 0.3);
  color: var(--text-secondary);
  cursor: not-allowed;

  &:focus {
    border-color: rgba(255, 255, 255, 0.1);
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
