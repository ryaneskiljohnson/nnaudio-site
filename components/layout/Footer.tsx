import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaXTwitter,
  FaInstagram,
  FaFacebook,
  FaYoutube,
  FaDiscord,
} from "react-icons/fa6";
import {
  FaTimes,
  FaPaperPlane,
} from "react-icons/fa";
import LegalModal from "@/components/modals/LegalModal";
import AboutUsModal from "@/components/modals/AboutUsModal";
import NNAudioLogo from "@/components/common/NNAudioLogo";
import Image from "next/image";
import i18next from "i18next";

const FooterContainer = styled.footer`
  background-color: var(--surface);
  padding: 4rem 0 2rem;
  color: var(--text-secondary);
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;

  &:first-child {
    margin-right: 1rem;
  }

  &:not(:first-child) {
    padding-left: 1rem;
  }
`;

const FooterLogo = styled.div`
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--text);
  font-weight: 700;
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  cursor: pointer;

  &:hover {
    text-decoration: none;
  }
  
  img {
    height: 50px;
    width: auto;
  }
`;

const BrandCredit = styled.a`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-style: italic;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
  }
`;

const FooterDescription = styled.p`
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  max-width: 300px;
  line-height: 1.6;
`;

const FooterHeading = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1.25rem;
  letter-spacing: 0.5px;
`;

const FooterLink = styled.span`
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  transition: color 0.2s ease;
  cursor: pointer;
  display: block;
  line-height: 1.5;

  &:hover {
    color: var(--primary);
    text-decoration: none;
  }
`;

const FooterAnchor = styled.span`
  font-size: 0.95rem;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 0.75rem;
  transition: color 0.2s ease;
  display: block;
  cursor: pointer;
  line-height: 1.5;

  &:hover {
    color: var(--primary);
    text-decoration: none;
  }
`;

const FooterButton = styled.button`
  background: none;
  border: none;
  font-size: 0.95rem;
  color: var(--text-secondary);
  text-align: left;
  padding: 0;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: color 0.2s ease;
  display: block;
  width: 100%;
  line-height: 1.5;
  font-family: inherit;

  &:hover {
    color: #6c63ff;
    text-decoration: none;
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const SocialIcon = styled.a`
  color: var(--text-secondary);
  font-size: 1.25rem;
  transition: color 0.2s ease, transform 0.2s ease;

  &:hover {
    color: var(--primary);
    transform: translateY(-2px);
  }
`;

const Copyright = styled.div`
  text-align: center;
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  font-size: 0.85rem;

  p {
    margin: 0;

    span {
      margin-left: 0.5rem;
      font-style: italic;
      opacity: 0.8;
    }
  }

  @media (max-width: 480px) {
    span {
      display: block;
      margin-top: 5px;
      margin-left: 0 !important;
    }
  }
`;

const CopyrightLink = styled.a`
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
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
  color: var(--text);
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

const FormInput = styled.input`
  width: 100%;
  padding: 12px 15px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.2s;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
  }

  &::placeholder {
    color: var(--text-secondary);
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
  transition: all 0.2s;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SubmitButton = styled.button`
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
  font-family: inherit;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// Simple i18n wrapper functions to avoid hook ordering issues
function getTranslation(key: string, defaultValue: string, options?: Record<string, any>): string {
  return i18next.t(key, { defaultValue, ...options }) as string;
}

const Footer = () => {
  // All hooks at the top in consistent order
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [language, setLanguage] = useState(() => 
    typeof window !== 'undefined' ? i18next.language : 'en'
  );
  
  // Effect to listen for language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setLanguage(lng);
    };
    
    if (typeof window !== 'undefined') {
      i18next.on('languageChanged', handleLanguageChanged);
      return () => {
        i18next.off('languageChanged', handleLanguageChanged);
      };
    }
    return undefined;
  }, []);

  // When language changes, this will re-render the component
  // using the _ variable to ensure ESLint doesn't complain about unused vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = language;

  const handleContactInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setContactForm({
      ...contactForm,
      [name]: value,
    });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert(getTranslation("dashboard.main.fillAllFields", "Please fill in all fields"));
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
      alert(getTranslation("dashboard.main.messageReceived", "We've received your message and will respond shortly."));
    } catch (error) {
      console.error("Error submitting contact form:", error);
      alert(getTranslation("dashboard.main.messageError", "Failed to send your message. Please try again later."));
    } finally {
      setIsContactSubmitting(false);
    }
  };

  return (
    <FooterContainer>
      <FooterContent>
        <FooterColumn>
          <Link href="/">
            <FooterLogo
              onClick={(e) => {
                if (window.location.pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              <Image
                src="/images/nnaud-io/NNAudio-logo-white.png"
                alt="NNAud.io Logo"
                width={200}
                height={127}
                style={{ height: '50px', width: 'auto' }}
              />
            </FooterLogo>
          </Link>
          <FooterDescription>
            {getTranslation("footer.description", "Resources for Modern Music Producers. Discover premium plugins, sample packs, and tools designed to elevate your music production workflow.")}
          </FooterDescription>
          <SocialLinks>
            <SocialIcon
              href="https://twitter.com/nnaud_io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
            >
              <FaXTwitter />
            </SocialIcon>
            <SocialIcon
              href="https://www.instagram.com/nnaud.io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <FaInstagram />
            </SocialIcon>
            <SocialIcon
              href="https://www.facebook.com/p/NNAudio-100082113654617/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <FaFacebook />
            </SocialIcon>
            <SocialIcon
              href="https://www.youtube.com/channel/UCZAAA6ZjaUQT1ru5-_M9b_A"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              <FaYoutube />
            </SocialIcon>
          </SocialLinks>
        </FooterColumn>

        <FooterColumn>
          <FooterHeading>{getTranslation("footer.navigation", "Navigation")}</FooterHeading>
          <Link href="/">
            <FooterLink>{getTranslation("header.home", "Home")}</FooterLink>
          </Link>
          <Link href="/plugins">
            <FooterLink>Plugins</FooterLink>
          </Link>
          <Link href="/packs">
            <FooterLink>Packs</FooterLink>
          </Link>
          <Link href="/products">
            <FooterLink>All Products</FooterLink>
          </Link>
          <FooterAnchor as="a" href="#pricing">
            {getTranslation("header.pricing", "Pricing")}
          </FooterAnchor>
          <FooterAnchor as="a" href="#faq">
            {getTranslation("header.faq", "FAQ")}
          </FooterAnchor>
        </FooterColumn>

        <FooterColumn>
          <FooterHeading>{getTranslation("footer.account", "Account")}</FooterHeading>
          <Link href="/login">
            <FooterLink>{getTranslation("common.login", "Login")}</FooterLink>
          </Link>
          <Link href="/signup">
            <FooterLink>{getTranslation("common.signUp", "Sign Up")}</FooterLink>
          </Link>
          <Link href="/dashboard">
            <FooterLink>{getTranslation("footer.accountDashboard", "Account Dashboard")}</FooterLink>
          </Link>
        </FooterColumn>

        <FooterColumn>
          <FooterHeading>{getTranslation("footer.company", "Company")}</FooterHeading>
          <Link href="/about">
            <FooterLink>{getTranslation("footer.aboutUs", "About Us")}</FooterLink>
          </Link>
          <FooterButton onClick={() => setShowContactModal(true)}>
            {getTranslation("footer.contactUs", "Contact Us")}
          </FooterButton>
          <Link href="/privacy-policy">
            <FooterLink>{getTranslation("footer.privacyPolicy", "Privacy Policy")}</FooterLink>
          </Link>
          <Link href="/terms-of-service">
            <FooterLink>{getTranslation("footer.termsConditions", "Terms & Conditions")}</FooterLink>
          </Link>
          <Link href="/refund-policy">
            <FooterLink>Refund Policy</FooterLink>
          </Link>
        </FooterColumn>
      </FooterContent>
      <Copyright>
        <p>
          {getTranslation("footer.copyright", `© ${new Date().getFullYear()} NNAud.io. All rights reserved.`, { year: new Date().getFullYear() })}
        </p>
      </Copyright>
      <LegalModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        modalType="terms"
      />
      <LegalModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        modalType="privacy"
      />
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
                  {getTranslation("dashboard.main.contactSupport", "Contact Support")}
                </ModalTitle>
                <CloseButton onClick={() => setShowContactModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleContactSubmit}>
                  <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
                    {getTranslation(
                      "dashboard.main.supportHelpText",
                      "Our support team is here to assist you with any questions or issues you might have."
                    )}
                  </p>
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      htmlFor="contact-name"
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {getTranslation("dashboard.main.yourName", "Your Name")}
                    </label>
                    <FormInput
                      id="contact-name"
                      name="name"
                      type="text"
                      value={contactForm.name}
                      onChange={handleContactInputChange}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      htmlFor="contact-email"
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {getTranslation("dashboard.main.yourEmail", "Your Email")}
                    </label>
                    <FormInput
                      id="contact-email"
                      name="email"
                      type="email"
                      value={contactForm.email}
                      onChange={handleContactInputChange}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      htmlFor="contact-message"
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {getTranslation("dashboard.main.message", "Your Message")}
                    </label>
                    <FormTextarea
                      id="contact-message"
                      name="message"
                      value={contactForm.message}
                      onChange={handleContactInputChange}
                      rows={5}
                      required
                    />
                  </div>
                  <ModalFooter>
                    <SubmitButton
                      type="submit"
                      disabled={isContactSubmitting}
                    >
                      {isContactSubmitting ? (
                        <>
                          <span>{getTranslation("dashboard.main.sending", "Sending...")}</span>
                        </>
                      ) : (
                        <>
                          <FaPaperPlane />
                          <span>
                            {getTranslation("dashboard.main.sendMessage", "Send Message")}
                          </span>
                        </>
                      )}
                    </SubmitButton>
                  </ModalFooter>
                </form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </FooterContainer>
  );
};

export default Footer;
