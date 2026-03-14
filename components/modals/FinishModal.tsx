"use client";

import React, { useEffect, useCallback } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaCheckCircle, FaMusic } from "react-icons/fa";

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
  max-width: 550px;
  background: rgba(25, 23, 36, 0.85);
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding-bottom: 20px;

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
`;

const TitleContainer = styled.div`
  padding: 20px 60px;
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
    top: 80px;
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
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const SuccessIcon = styled.div`
  font-size: 6rem;
  color: #4ecdc4;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;

  svg {
    filter: drop-shadow(0 0 15px rgba(78, 205, 196, 0.5));
  }
`;

const Message = styled.p`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 25px;
  max-width: 450px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 10px;
`;

interface ButtonProps {
  $primary?: boolean;
}

const Button = styled.button<ButtonProps>`
  padding: 12px 24px;
  background: ${(props) =>
    props.$primary
      ? "linear-gradient(90deg, #4ECDC4, #2ecc71)"
      : "rgba(255, 255, 255, 0.1)"};
  color: white;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  border: none;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$primary
        ? "0 4px 10px rgba(78, 205, 196, 0.3)"
        : "0 4px 10px rgba(255, 255, 255, 0.1)"};
  }
`;

const MusicIcon = styled(FaMusic)`
  margin-right: 8px;
  font-size: 1.1rem;
`;

interface FinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  songName: string;
  trackName: string;
  t?: (
    key: string,
    fallback: string,
    options?: Record<string, string>
  ) => string;
}

const FinishModal: React.FC<FinishModalProps> = ({
  isOpen,
  onClose,
  songName,
  trackName,
  t,
}) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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

  // Automatically focus on the modal when it opens for keyboard navigation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        document.getElementById("finish-modal-container")?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Memoize the congratulations message to prevent recreating on each render
  const getMessage = useCallback(() => {
    if (t) {
      return t(
        "synth.wizard.congratsMessage",
        'Congratulations! You\'ve just scratched the surface of NNAudio\'s powerful music creation capabilities. Your song "{songName}" with the "{trackName}" track is just the beginning. Explore the full platform to unlock advanced features, AI-powered composition tools, and professional audio production capabilities that will transform your musical ideas into reality.',
        { songName, trackName }
      );
    }

    return `Congratulations! You've created a song called "${songName}" with a "${trackName}" track featuring a chord progression and melody pattern. This is just the beginning of what you can create with NNAudio.`;
  }, [t, songName, trackName]);

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
            id="finish-modal-container"
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
              <ModalTitle>Creation Complete!</ModalTitle>
            </TitleContainer>

            <CloseButton onClick={onClose} aria-label="Close modal">
              <FaTimes />
            </CloseButton>

            <ContentContainer>
              <SuccessIcon>
                <FaCheckCircle />
              </SuccessIcon>

              <Message>{getMessage()}</Message>

              <ButtonContainer>
                <Button $primary onClick={onClose}>
                  <MusicIcon /> Continue Creating
                </Button>
              </ButtonContainer>
            </ContentContainer>
          </ModalContainer>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default FinishModal;
