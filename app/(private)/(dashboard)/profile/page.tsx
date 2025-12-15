"use client";
import React, { useState, useEffect } from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { FaUser, FaLock, FaTimesCircle, FaSave } from "react-icons/fa";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/utils/supabase/types";
import styled from "styled-components";
import { motion } from "framer-motion";
import LoadingComponent from "@/components/common/LoadingComponent";

const ProfileContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: var(--text);

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
`;

const ProfileCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 10px;
  }
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

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
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

  svg {
    margin-right: 0.5rem;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(108, 99, 255, 0.3);
  }

  @media (max-width: 768px) {
    padding: 0.85rem 1.5rem;
    width: 100%;
    justify-content: center;
    border-radius: 8px;
    margin-top: 1.5rem;
  }
`;

// Kept for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DangerButton = styled(Button)`
  background: linear-gradient(135deg, #ff5733, #c70039);

  &:hover {
    box-shadow: 0 5px 15px rgba(255, 87, 51, 0.3);
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
  margin: 1rem 0;
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

// Add animation variants
const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: custom * 0.1,
    },
  }),
};

const buttonVariants = {
  hover: {
    scale: 1.03,
    boxShadow: "0 5px 15px rgba(108, 99, 255, 0.4)",
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
  tap: {
    scale: 0.98,
  },
};

interface MessageData {
  text: string;
  type: "error" | "success" | "";
}

function Profile() {
  const { user, updateProfile, resetPassword, refreshUser } = useAuth();

  // Refresh pro status on mount (same as login)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]); // Run on mount and when refreshUser changes

  const [message, setMessage] = useState<MessageData>({ text: "", type: "" });
  const [profileData, setProfileData] = useState({
    first_name: user?.profile?.first_name || "",
    last_name: user?.profile?.last_name || "",
  });
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Initialize translations
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();

  // Wait for translations to load
  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  useEffect(() => {
    if (user?.profile) {
      setProfileData({
        first_name: user.profile.first_name || "",
        last_name: user.profile.last_name || "",
      });
    }
  }, [user]);

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: keyof typeof profileData
  ) => {
    setProfileData((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.profile) return;

    const updatedProfile = {
      ...user.profile,
      ...profileData,
    };

    try {
      const { error } = await updateProfile(updatedProfile);
      if (error) {
        setMessage({
          text: t(
            "dashboard.profile.errorUpdating",
            "Error updating profile: {{error}}",
            { error: error.toString() }
          ),
          type: "error",
        });
      } else {
        setMessage({
          text: t(
            "dashboard.profile.profileUpdated",
            "Profile information updated successfully!"
          ),
          type: "success",
        });
      }
    } catch (error) {
      setMessage({
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
      setMessage({ text: "", type: "" });
    }, 3000);
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      setMessage({
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
          setMessage({
            text: t(
              "dashboard.profile.tooManyAttempts",
              "Too many password reset attempts. Please wait a few minutes before trying again."
            ),
            type: "error",
          });
        } else {
          setMessage({
            text: t(
              "dashboard.profile.errorSendingReset",
              "Error sending reset email: {{error}}",
              { error: error.message }
            ),
            type: "error",
          });
        }
      } else {
        setMessage({
          text: t(
            "dashboard.profile.passwordResetSent",
            "Password reset email sent! Please check your inbox."
          ),
          type: "success",
        });
      }
    } catch (error) {
      setMessage({
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
      setMessage({ text: "", type: "" });
    }, 3000);
  };

  // Show a loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <ProfileContainer>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "70vh",
          }}
        >
          <LoadingComponent text={t("common.loading", "Loading...")} />
        </div>
      </ProfileContainer>
    );
  }

  if (!user) return null;

  return (
    <ProfileContainer>
      <SectionTitle>{t("dashboard.profile.title", "My Profile")}</SectionTitle>

      {message.text && (
        <Message type={message.type as "error" | "success"}>
          {message.type === "error" ? <FaTimesCircle /> : <FaUser />}
          {message.text}
        </Message>
      )}

      <ProfileCard
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={0}
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
                  value={profileData.first_name}
                  onChange={(e) => handleProfileChange(e, "first_name")}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>{t("dashboard.profile.lastName", "Last Name")}</Label>
                <Input
                  type="text"
                  value={profileData.last_name}
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
              whileHover="hover"
              whileTap="tap"
              variants={buttonVariants}
            >
              <FaSave /> {t("dashboard.profile.saveChanges", "Save Changes")}
            </Button>
          </Form>
        </CardContent>
      </ProfileCard>

      <ProfileCard
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <CardTitle>
          <FaLock /> {t("dashboard.profile.passwordSection", "Change Password")}
        </CardTitle>
        <CardContent>
          <Button
            onClick={handleResetPassword}
            as={motion.button}
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
          >
            <FaLock />{" "}
            {t("dashboard.profile.sendResetEmail", "Send Password Reset Email")}
          </Button>
        </CardContent>
      </ProfileCard>
    </ProfileContainer>
  );
}

export default function ProfilePage() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      <NextSEO
        title={t("dashboard.profile.title", "Profile") + " - NNAudio"}
        description={t("dashboard.profile.title", "Your NNAudio profile")}
        canonical="/profile"
        noindex={true}
      />
      <Profile key={pathname} />
    </>
  );
}
