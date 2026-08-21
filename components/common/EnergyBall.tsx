/**
 * @fileoverview EnergyBall Component
 * @module components/common/EnergyBall
 *
 * An animated energy ball icon with pulsing, rotating, and shimmering effects.
 * The primary Cymasphere brand icon (same animation as the Cymasphere site).
 *
 * @example
 * // Basic usage
 * <EnergyBall />
 *
 * @example
 * // Custom size
 * <EnergyBall size="60px" marginRight="20px" />
 */

import React from "react";
import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(108, 99, 255, 0.7);
  }
  
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(108, 99, 255, 0);
  }
  
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(108, 99, 255, 0);
  }
`;

const rotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

interface ContainerProps {
  $size?: string;
  $marginRight?: string;
}

const Container = styled.div<ContainerProps>`
  position: relative;
  width: ${(props) => props.$size || "40px"};
  height: ${(props) => props.$size || "40px"};
  margin-right: ${(props) => props.$marginRight || "10px"};
`;

const Ball = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #6c63ff, #4ecdc4);
  animation: ${pulse} 2s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;

  &::before {
    content: "";
    position: absolute;
    top: -5%;
    left: -5%;
    right: -5%;
    bottom: -5%;
    background: linear-gradient(
      45deg,
      rgba(108, 99, 255, 0.8),
      rgba(78, 205, 196, 0.8),
      rgba(108, 99, 255, 0.8)
    );
    background-size: 200% 200%;
    animation: ${shimmer} 3s linear infinite;
    border-radius: 50%;
    z-index: -1;
    opacity: 0.7;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    &::before {
      animation: none;
    }
  }
`;

const Ring = styled.div`
  position: absolute;
  top: -15%;
  left: -15%;
  right: -15%;
  bottom: -15%;
  border-radius: 50%;
  border: 2px solid rgba(108, 99, 255, 0.5);
  border-top: 2px solid rgba(78, 205, 196, 0.8);
  animation: ${rotate} 3s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Core = styled.div`
  width: 60%;
  height: 60%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, #6c63ff);
  opacity: 0.9;
  box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.7);
`;

/**
 * @brief Props for the EnergyBall component
 */
interface EnergyBallProps {
  /** @param {string} [size] - Size of the energy ball (width and height) */
  size?: string;
  /** @param {string} [marginRight="10px"] - Right margin spacing */
  marginRight?: string;
}

/**
 * @brief EnergyBall component
 *
 * Creates an animated spherical icon with multiple visual effects:
 * - Pulsing animation with expanding shadow
 * - Rotating outer ring
 * - Shimmering gradient background
 * - Radial gradient core
 *
 * @param {EnergyBallProps} props - Component props
 * @returns {JSX.Element} The rendered energy ball component
 *
 * @note Uses CSS keyframe animations for performance
 * @note Default size is 40px if not specified
 * @note Animations are disabled under prefers-reduced-motion
 */
const EnergyBall: React.FC<EnergyBallProps> = ({
  size,
  marginRight = "10px",
}) => {
  return (
    <Container $size={size} $marginRight={marginRight}>
      <Ball>
        <Core />
      </Ball>
      <Ring />
    </Container>
  );
};

export default EnergyBall;
