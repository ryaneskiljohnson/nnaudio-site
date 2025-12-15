import React from "react";
import styled from "styled-components";
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

// Removed separate EnergyBall to avoid double or stacked animated orbs

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
 * Simplified loading spinner for the Cymasphere app
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  fullScreen = false,
  text = "Loading...",
}) => {
  const energyBallSize = size === "large" ? "140px" : size === "small" ? "80px" : "120px";

  return (
    <Container $fullScreen={fullScreen}>
      <LoadingWrapper>
        <NNAudioLogo size={energyBallSize} showText={false} />
        {text && <LoadingText $size={size}>{text}</LoadingText>}
      </LoadingWrapper>
    </Container>
  );
};

export default LoadingSpinner;
