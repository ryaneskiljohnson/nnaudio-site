import React from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import NNAudioLogo from "./NNAudioLogo";

// Define interfaces for styled-components props
interface ContainerProps {
  $fullScreen?: boolean;
}

interface LoadingTextProps {
  $size?: string;
}

const Container = styled.div<ContainerProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: ${(props) => (props.$fullScreen ? "100vh" : "200px")};
  width: ${(props) => (props.$fullScreen ? "100vw" : "100%")};
  background-color: ${(props) => (props.$fullScreen ? "var(--bg)" : "transparent")};
  position: ${(props) => (props.$fullScreen ? "fixed" : "relative")};
  top: ${(props) => (props.$fullScreen ? 0 : "auto")};
  left: ${(props) => (props.$fullScreen ? 0 : "auto")};
  right: ${(props) => (props.$fullScreen ? 0 : "auto")};
  bottom: ${(props) => (props.$fullScreen ? 0 : "auto")};
  z-index: ${(props) => (props.$fullScreen ? 4000 : "auto")};
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
`;

const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.95);
  }
`;

const AnimatedLogoWrapper = styled(motion.div)`
  animation: ${pulseAnimation} 1.5s ease-in-out infinite;
`;

const LoadingText = styled.div<LoadingTextProps>`
  margin-top: 20px;
  color: var(--text-secondary);
  font-size: ${(props) =>
    props.$size === "large"
      ? "1.4rem"
      : props.$size === "small"
      ? "1rem"
      : "1.2rem"};
`;

// Define interface for component props
interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  fullScreen?: boolean;
  text?: string;
}

/**
 * Loading spinner with animated NNAudio logo
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  fullScreen = false,
  text = "Loading...",
}) => {
  const logoSize = size === "large" ? "140px" : size === "small" ? "80px" : "120px";

  return (
    <Container $fullScreen={fullScreen}>
      <LoadingWrapper>
        <AnimatedLogoWrapper
          animate={{
            scale: [1, 0.95, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <NNAudioLogo size={logoSize} showText={false} />
        </AnimatedLogoWrapper>
        {text && <LoadingText $size={size}>{text}</LoadingText>}
      </LoadingWrapper>
    </Container>
  );
};

export default LoadingSpinner;
