import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import NNAudioLogo from "./NNAudioLogo";

interface LoadingContainerProps {
  $fullScreen?: boolean;
}

const LoadingContainer = styled.div<LoadingContainerProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: ${(props) => (props.$fullScreen ? "100vh" : "100%")};
  position: ${(props) => (props.$fullScreen ? "fixed" : "relative")};
  top: ${(props) => (props.$fullScreen ? "0" : "auto")};
  left: ${(props) => (props.$fullScreen ? "0" : "auto")};
  z-index: ${(props) => (props.$fullScreen ? "9999" : "1")};
  background: "transparent";
`;

const AnimatedLogoWrapper = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  font-size: 1rem;
  color: white;
  text-align: center;
`;

interface LoadingComponentProps {
  size?: string;
  text?: string;
  fullScreen?: boolean;
}

const LoadingComponent: React.FC<LoadingComponentProps> = ({
  size = "60px",
  text,
  fullScreen = false,
}) => {
  return (
    <LoadingContainer $fullScreen={fullScreen}>
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
        <NNAudioLogo size={size} showText={false} />
      </AnimatedLogoWrapper>
      {text && <LoadingText>{text}</LoadingText>}
    </LoadingContainer>
  );
};

export default LoadingComponent;
