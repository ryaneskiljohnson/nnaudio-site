"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import NNAudioLogo from "@/components/common/NNAudioLogo";
import LoadingComponent from "@/components/common/LoadingComponent";
import PrimaryButton from "@/components/common/PrimaryButton";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--background);
  position: relative;

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 30% 50%,
        rgba(108, 99, 255, 0.25),
        transparent 60%
      ),
      radial-gradient(
        circle at 70% 30%,
        rgba(108, 99, 255, 0.2),
        transparent 60%
      ),
      radial-gradient(
        circle at 50% 70%,
        rgba(138, 43, 226, 0.15),
        transparent 50%
      );
    z-index: 0;
  }
`;

const BackButton = styled.div`
  position: fixed;
  top: 25px;
  left: 30px;
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 1rem;
  z-index: 10;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    color: var(--text);
  }

  svg {
    margin-right: 8px;
  }

  @media (max-width: 768px) {
    top: 20px;
    left: 20px;
  }
`;

const FormCard = styled(motion.div)`
  max-width: 450px;
  width: 100%;
  padding: 2.5rem;
  border-radius: 12px;
  background: rgba(25, 23, 36, 0.85);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin: 0 20px;

  &:before {
    content: "";
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    background: linear-gradient(
      135deg,
      rgba(108, 99, 255, 0.6) 0%,
      rgba(108, 99, 255, 0.2) 50%,
      rgba(138, 43, 226, 0.5) 100%
    );
    border-radius: 18px;
    z-index: -1;
    opacity: 0.5;
    filter: blur(8px);
  }

  @media (max-width: 520px) {
    padding: 2rem 1.5rem;
    width: 90%;
  }
`;

const Title = styled(motion.h2)`
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text);
  font-size: 1.4rem;

  span {
    background: linear-gradient(90deg, #6c63ff, #8a2be2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Form = styled.form`
  width: 100%;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.03);
  color: var(--text);
  font-size: 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const Button = styled(motion.button)`
  width: 100%;
  padding: 0.9rem;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  margin-top: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 99, 255, 0.23);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ButtonContent = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ErrorMessage = styled(motion.div)`
  background-color: rgba(255, 87, 51, 0.1);
  border-left: 3px solid var(--error);
  color: var(--error);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
`;

const LinkText = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;

  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s ease;

    &:hover {
      color: var(--accent);
      text-decoration: underline;
    }
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Checkbox = styled.input`
  margin-right: 10px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;

  a {
    color: var(--primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const ModalLink = styled.span`
  color: var(--primary);
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

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

// Add styled component for name fields container
const NameFieldsContainer = styled.div`
  display: flex;
  gap: 16px;
  width: 100%;
  margin-bottom: 1.5rem;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 8px;
  }

  /* Adjust the FormGroup inside NameFieldsContainer to have no bottom margin */
  & > ${FormGroup} {
    flex: 1;
    margin-bottom: 0;
  }
`;

// Create a separate client component for handling search params
function SearchParamsHandler({
  setRedirectAfterLogin,
  setIsCheckoutComplete,
}: {
  setRedirectAfterLogin: (url: string) => void;
  setIsCheckoutComplete: (value: boolean) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirect = searchParams?.get("redirect");
    if (redirect) {
      setRedirectAfterLogin(redirect);
    }

    // Handle checkout complete param
    if (searchParams?.get("checkout_complete") === "true") {
      setIsCheckoutComplete(true);
    }

    // Handle email prefill from checkout
    const email = searchParams?.get("email");
    if (email) {
      // We'll handle this in the parent component
      window.sessionStorage.setItem("prefilled_email", email);
    }
  }, [searchParams, setRedirectAfterLogin, setIsCheckoutComplete]);

  return null;
}

function SignUp() {
  const { signUp, user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loadingState, setLoadingState] = useState(false);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState("");
  const [isCheckoutComplete, setIsCheckoutComplete] = useState(false);

  // Initialize translations
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();

  // Wait for translations to load
  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      // Redirect to dashboard or home
      if (redirectAfterLogin) {
        router.push(redirectAfterLogin);
      } else {
        router.push(`/dashboard`);
      }
    }
  }, [user, router, redirectAfterLogin]);

  // Handle email prefill from checkout (stored in sessionStorage by SearchParamsHandler)
  useEffect(() => {
    const email = window.sessionStorage.getItem("prefilled_email");
    if (email) {
      setFormData((prev) => ({
        ...prev,
        email,
      }));
      // Clear it after use
      window.sessionStorage.removeItem("prefilled_email");
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Reset any previous errors
    setError("");

    // Validate form
    if (!formData.firstName.trim()) {
      return setError(
        t("signup.errors.firstNameRequired", "First name is required")
      );
    }

    if (!formData.lastName.trim()) {
      return setError(
        t("signup.errors.lastNameRequired", "Last name is required")
      );
    }

    if (formData.password !== formData.confirmPassword) {
      return setError(
        t("signup.errors.passwordsDoNotMatch", "Passwords do not match")
      );
    }

    if (formData.password.length < 6) {
      return setError(
        t(
          "signup.errors.passwordTooShort",
          "Password must be at least 6 characters"
        )
      );
    }

    if (!agreeToTerms) {
      return setError(
        t(
          "signup.errors.agreeTerms",
          "You must agree to the Terms of Service and Privacy Policy"
        )
      );
    }

    try {
      setLoadingState(true);

      // Passively collect timezone information
      let timezoneData = {};
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const offsetMinutes = new Date().getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60;

        timezoneData = {
          timezone,
          offsetHours,
          offsetMinutes,
          detectedAt: new Date().toISOString(),
        };
      } catch (timezoneError) {
        console.warn("Could not detect timezone:", timezoneError);
        timezoneData = {
          timezone: "America/Los_Angeles",
          offsetHours: -8,
          offsetMinutes: 480,
        };
      }

      // Store timezone data in sessionStorage to be picked up by the auth system
      sessionStorage.setItem(
        "user_timezone_data",
        JSON.stringify(timezoneData)
      );

      // Combine first and last name for the API call
      const result = await signUp(
        formData.firstName.trim(),
        formData.lastName.trim(),
        formData.email.trim(),
        formData.password
      );

      // When a user already exists in Supabase Auth:
      // 1. If identities array is empty, it means the user exists and has confirmed their email
      // 2. If there's an error with "already registered" in the message, that's also a clear sign

      // Check for existing account
      if (result.error) {
        // Check if the error is about an existing account
        if (
          result.error.message
            .toLowerCase()
            .includes("user already registered") ||
          result.error.message.toLowerCase().includes("email already") ||
          result.error.message.toLowerCase().includes("account already exists")
        ) {
          // Redirect to the account exists page
          router.push(
            `/signup-account-exists?email=${encodeURIComponent(
              formData.email.trim()
            )}`
          );
          return;
        }

        // For other errors, show the error message
        setError(
          t("signup.errors.generic", "{{message}}", {
            message: result.error.message,
          })
        );
        // Only stop loading when there's an error
        setLoadingState(false);
      } else if (result.data && result.data.user) {
        // Check for empty identities array which indicates an existing confirmed user
        if (
          !result.data.user.identities ||
          result.data.user.identities.length === 0
        ) {
          // User already exists - redirect to account exists page
          router.push(
            `/signup-account-exists?email=${encodeURIComponent(
              formData.email.trim()
            )}`
          );
          return;
        }

        // New user successfully created
        // Keep loading state active until redirect happens
        router.push(
          `/signup-success?name=${encodeURIComponent(
            formData.firstName.trim()
          )}&email=${encodeURIComponent(formData.email.trim())}`
        );
      }
    } catch (err: unknown) {
      // Handle specific errors
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(
        t("signup.errors.unknown", "{{message}}", { message: errorMessage })
      );
      // Stop loading when an error occurs
      setLoadingState(false);
    }
  };

  // Render a loading indicator if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--background)",
        }}
      >
        <LoadingComponent size="40px" />
      </div>
    );
  }

  return (
    <AuthContainer>
      <Suspense fallback={null}>
        <SearchParamsHandler
          setRedirectAfterLogin={setRedirectAfterLogin}
          setIsCheckoutComplete={setIsCheckoutComplete}
        />
      </Suspense>
      <Link href={`/`}>
        <BackButton>
          <FaArrowLeft /> {t("common.backToHome", "Back to Home")}
        </BackButton>
      </Link>
      <FormCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          style={{
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <NNAudioLogo
            size="120px"
            fontSize="3.5rem"
            showText={true}
            href={""}
            onClick={() => {}}
            className={""}
          />
        </div>

        <Title>
          {t("signup.title.createAn", "Create an")}{" "}
          <span>{t("signup.title.account", "account")}</span>
        </Title>

        {/* Display error message if there was an error */}
        {error && (
          <ErrorMessage
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </ErrorMessage>
        )}

        <Form onSubmit={handleSubmit}>
          <NameFieldsContainer>
            <FormGroup>
              <Label htmlFor="firstName">
                {t("signup.firstName", "First Name")} *
              </Label>
              <Input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName.trim()}
                onChange={handleChange}
                required
                placeholder={t("signup.firstNamePlaceholder", "First Name")}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="lastName">
                {t("signup.lastName", "Last Name")} *
              </Label>
              <Input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName.trim()}
                onChange={handleChange}
                required
                placeholder={t("signup.lastNamePlaceholder", "Last Name")}
              />
            </FormGroup>
          </NameFieldsContainer>

          <FormGroup>
            <Label htmlFor="email">{t("common.email", "Email")}</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email.trim()}
              onChange={handleChange}
              required
              readOnly={isCheckoutComplete}
              placeholder={t(
                "signup.emailPlaceholder",
                "Enter your email address"
              )}
              style={
                isCheckoutComplete
                  ? {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      cursor: "not-allowed",
                    }
                  : {}
              }
            />
            {isCheckoutComplete && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginTop: "0.5rem",
                }}
              >
                {t(
                  "signup.emailLinkedToPurchase",
                  "This email is linked to your purchase and cannot be changed"
                )}
              </div>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">{t("common.password", "Password")}</Label>
            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={t(
                "signup.passwordPlaceholder",
                "Create a secure password"
              )}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="confirmPassword">
              {t("signup.confirmPassword", "Confirm Password")}
            </Label>
            <Input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder={t(
                "signup.confirmPasswordPlaceholder",
                "Confirm your password"
              )}
            />
          </FormGroup>

          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="terms"
              checked={agreeToTerms}
              onChange={() => setAgreeToTerms(!agreeToTerms)}
              required
            />
            <CheckboxLabel htmlFor="terms">
              {t("signup.agreeToTerms", "I agree to the")}{" "}
              <Link
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ModalLink as="span">
                  {t("signup.termsOfService", "Terms of Service")}
                </ModalLink>
              </Link>{" "}
              {t("signup.and", "and")}{" "}
              <Link
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ModalLink as="span">
                  {t("signup.privacyPolicy", "Privacy Policy")}
                </ModalLink>
              </Link>
            </CheckboxLabel>
          </CheckboxContainer>

          <PrimaryButton
            type="submit"
            disabled={loadingState || !!user}
            style={{ width: '100%' }}
          >
              {loadingState ? (
                <>
                  <div style={{ marginRight: "10px" }}>
                    <LoadingComponent size="20px" />
                  </div>
                  {t("signup.creatingAccount", "Creating Account...")}
                </>
              ) : (
                t("signup.createAccount", "Create Account")
              )}
          </PrimaryButton>
        </Form>

        <LinkText>
          {t("signup.alreadyHaveAccount", "Already have an account?")}{" "}
          <Link href={`/login`}>{t("signup.login", "Log in")}</Link>
        </LinkText>
      </FormCard>
    </AuthContainer>
  );
}

export default SignUp;
