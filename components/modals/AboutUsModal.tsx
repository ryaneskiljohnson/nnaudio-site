"use client";

import React, { useEffect, memo } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";

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
  backdrop-filter: blur(5px);
  will-change: opacity;
`;

const ModalContainer = styled(motion.div)`
  width: 95%;
  max-width: 900px;
  height: 90vh;
  max-height: 800px;
  background: rgba(25, 23, 36, 0.85);
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);

  &:before {
    content: "";
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    background: linear-gradient(
      135deg,
      rgba(108, 99, 255, 0.7) 0%,
      rgba(108, 99, 255, 0.2) 50%,
      rgba(78, 205, 196, 0.7) 100%
    );
    border-radius: 28px;
    z-index: -1;
    opacity: 0.6;
    filter: blur(8px);
  }

  /* Custom outline style for focus */
  &:focus {
    outline: none;
    border: 1px solid var(--primary);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--primary);
  }
`;

const TitleContainer = styled.div`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px 60px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(25, 23, 36, 0.95);
  backdrop-filter: blur(10px);
  height: 80px;
  box-sizing: border-box;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(108, 99, 255, 0.3),
      rgba(78, 205, 196, 0.3),
      transparent
    );
  }
`;

const ModalTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.5px;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
  color: white;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;

  &:hover {
    background: var(--primary);
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(108, 99, 255, 0.5);
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  padding: 30px;
  overflow-y: auto;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(108, 99, 255, 0.5);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(108, 99, 255, 0.7);
  }
`;

const AboutUsContent = styled.div`
  color: var(--text);
  font-size: 1rem;
  line-height: 1.7;

  h3 {
    font-size: 1.6rem;
    margin-top: 30px;
    margin-bottom: 15px;
    color: var(--primary);
    background: linear-gradient(135deg, #6c63ff, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
  }

  p {
    margin-bottom: 20px;
  }

  ul,
  ol {
    margin-bottom: 20px;
    padding-left: 25px;
  }

  li {
    margin-bottom: 12px;
  }

  a {
    color: var(--accent);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: var(--primary);
      text-decoration: underline;
    }
  }
`;

const TeamSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 30px;
  margin: 40px 0;
`;

const TeamMember = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const TeamMemberImage = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: rgba(108, 99, 255, 0.2);
  margin-bottom: 15px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: var(--primary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TeamMemberName = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 5px;
  color: white;
`;

const TeamMemberRole = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
`;

const CompanyHighlight = styled.div`
  background: rgba(108, 99, 255, 0.1);
  border-left: 4px solid var(--primary);
  padding: 20px;
  margin: 30px 0;
  border-radius: 0 8px 8px 0;
`;

// Memoize the about us content since it's static
const AboutUsContentSection = memo(() => {
  const { t } = useTranslation();

  return (
    <AboutUsContent>
      <h3>{t("aboutUs.mission.title", "Our Mission")}</h3>
      <p>
        {t("aboutUs.mission.content", "NNAudio's mission is to make music theory accessible without requiring years of study or technical application to an instrument. We believe that deep musical understanding should be within reach of all creators, not just trained musicians. Our tools are designed to remove traditional barriers to music creation while offering creative freedom.")}
      </p>

      <CompanyHighlight>
        {t("aboutUs.mission.highlight", "We're committed to empowering creators of all levels by making music's theoretical complexity intuitive and accessible. Our goal is to enable you to realize your creative vision without the years of study normally required.")}
      </CompanyHighlight>

      <h3>{t("aboutUs.story.title", "Our Story")}</h3>
      <p>
        {t("aboutUs.story.content1", "Founded by Ryan Johnson, a passionate musician, and Garrett Fleischer, an experienced software engineer, NNAudio was born from a shared vision: to democratize music creation by eliminating the requirement of deep theoretical knowledge.")}
      </p>

      <p>
        {t("aboutUs.story.content2", "After observing that existing music software either required advanced theoretical understanding or severely limited creativity, our founders set out to create a tool that would make musical sophistication accessible to everyone, without requiring years of theoretical study or technical mastery of an instrument.")}
      </p>

      <h3>{t("aboutUs.values.title", "Our Values")}</h3>
      <p>
        {t("aboutUs.values.intro", "At NNAudio, we're guided by a set of core values that shape everything we do:")}
      </p>

      <ul>
        <li>
          <strong>{t("aboutUs.values.integrity.title", "Musical Integrity")}</strong> - {t("aboutUs.values.integrity.content", "We respect the principles of music theory while embracing innovation")}
        </li>
        <li>
          <strong>{t("aboutUs.values.design.title", "Intuitive Design")}</strong> - {t("aboutUs.values.design.content", "Our interfaces are visually clear and immediately understandable")}
        </li>
        <li>
          <strong>{t("aboutUs.values.freedom.title", "Creative Freedom")}</strong> - {t("aboutUs.values.freedom.content", "We provide guidance without limiting expression")}
        </li>
        <li>
          <strong>{t("aboutUs.values.learning.title", "Continuous Learning")}</strong> - {t("aboutUs.values.learning.content", "Our tools help users develop their musical understanding")}
        </li>
      </ul>

      <h3>{t("aboutUs.approach.title", "Our Approach")}</h3>
      <p>
        {t("aboutUs.approach.intro", "NNAudio takes a unique approach to music composition software by focusing on:")}
      </p>

      <ol>
        <li>{t("aboutUs.approach.point1", "Visualizing harmony and voice leading in intuitive ways")}</li>
        <li>
          {t("aboutUs.approach.point2", "Providing intelligent suggestions while respecting your creative direction")}
        </li>
        <li>
          {t("aboutUs.approach.point3", "Integrating theoretical concepts seamlessly into the creative workflow")}
        </li>
        <li>{t("aboutUs.approach.point4", "Building bridges between composition, arrangement, and production")}</li>
      </ol>

      <p>
        {t("aboutUs.approach.conclusion", "We're constantly refining our approach based on user feedback and the latest developments in music technology. We believe in creating tools that grow with you and adapt to your evolving creative needs.")}
      </p>

      <h3>{t("aboutUs.future.title", "Looking Forward")}</h3>
      <p>
        {t("aboutUs.future.content1", "As we continue to develop NNAudio, we're excited about the future of music creation. Our roadmap includes advanced integration with major DAWs, expanded harmonic palettes, deeper AI-assisted composition features, and much more.")}
      </p>

      <p>
        {t("aboutUs.future.content2", "We invite you to join us on this journey and help shape the future of intelligent music creation tools.")}
      </p>
    </AboutUsContent>
  );
});

// Add display name to memoized component
AboutUsContentSection.displayName = "AboutUsContentSection";

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutUsModal = ({ isOpen, onClose }: AboutUsModalProps) => {
  // Add translation hook
  const { t } = useTranslation();

  // Improved body overflow management to prevent memory leaks
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalStyle;
    }

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <ModalContainer
            initial={{
              scale: 0.9,
              opacity: 0,
              willChange: "transform, opacity",
            }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <TitleContainer>
              <ModalTitle>{t("footer.aboutUs", "About Us")}</ModalTitle>
            </TitleContainer>

            <CloseButton onClick={onClose} aria-label={t("common.close", "Close modal")}>
              <FaTimes />
            </CloseButton>

            <ContentContainer>
              <AboutUsContentSection />
            </ContentContainer>
          </ModalContainer>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default AboutUsModal;
