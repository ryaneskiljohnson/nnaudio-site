import React, { useState } from "react";
import styled from "styled-components";
import Link from "next/link";
import {
  FaXTwitter,
  FaInstagram,
  FaFacebook,
  FaYoutube,
  FaDiscord,
} from "react-icons/fa6";
import LegalModal from "../modals/LegalModal";
import AboutUsModal from "../modals/AboutUsModal";
import NNAudioLogo from "../common/NNAudioLogo";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

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

const FooterLogoLink = styled.a`
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

const FooterLink = styled.a`
  font-size: 0.95rem;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 1rem;
  transition: color 0.2s ease;
  display: block;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  text-align: left;
  width: 100%;

  &:hover {
    color: var(--primary);
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

const NextFooter = () => {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <FooterContainer>
      <FooterContent>
        <FooterColumn>
          <Link href="/">
            <FooterLogoLink
              onClick={handleLogoClick}
            >
              <Image
                src="/images/nnaud-io/NNAudio-logo-white.png"
                alt="NNAud.io Logo"
                width={200}
                height={127}
                style={{ height: '50px', width: 'auto' }}
              />
            </FooterLogoLink>
          </Link>
          <FooterDescription>
            Resources for Modern Music Producers. Discover premium plugins, sample packs, and tools designed to elevate your music production workflow.
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
          <FooterHeading>Navigation</FooterHeading>
          <Link href="/">
            <FooterLink>Home</FooterLink>
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
          <FooterLink as="a" href="#pricing">
            Pricing
          </FooterLink>
          <FooterLink as="a" href="#faq">
            FAQ
          </FooterLink>
        </FooterColumn>

        <FooterColumn>
          <FooterHeading>Account</FooterHeading>
          <FooterLink
            as="a"
            href="/login"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              router.push("/login");
            }}
          >
            Login
          </FooterLink>
          <FooterLink
            as="a"
            href="/signup"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              router.push("/signup");
            }}
          >
            Sign Up
          </FooterLink>
          <FooterLink
            as="a"
            href="/dashboard"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              window.location.href = "/dashboard";
            }}
          >
            Dashboard
          </FooterLink>
          <FooterLink
            as="a"
            href="/profile"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              window.location.href = "/profile";
            }}
          >
            Profile
          </FooterLink>
          <FooterLink
            as="a"
            href="/settings"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              window.location.href = "/settings";
            }}
          >
            Settings
          </FooterLink>
        </FooterColumn>

        <FooterColumn>
          <FooterHeading>Information</FooterHeading>
          <Link href="/about">
            <FooterLink>About Us</FooterLink>
          </Link>
          <Link href="/contact">
            <FooterLink>Contact</FooterLink>
          </Link>
          <Link href="/terms-of-service">
            <FooterLink>Terms of Service</FooterLink>
          </Link>
          <Link href="/privacy-policy">
            <FooterLink>Privacy Policy</FooterLink>
          </Link>
          <Link href="/refund-policy">
            <FooterLink>Refund Policy</FooterLink>
          </Link>
        </FooterColumn>
      </FooterContent>
      <Copyright>
        <p>
          &copy; {new Date().getFullYear()} NNAud.io{" "}
          <span>All rights reserved</span>
        </p>
      </Copyright>
      {showTermsModal && (
        <LegalModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          modalType="terms"
        />
      )}
      {showPrivacyModal && (
        <LegalModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          modalType="privacy"
        />
      )}
    </FooterContainer>
  );
};

export default NextFooter;
