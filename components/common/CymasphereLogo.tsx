/**
 * @fileoverview CymasphereLogo Component
 * @module components/common/CymasphereLogo
 *
 * Displays the Cymasphere brand logo with an animated energy ball and optional
 * text. Supports clickable links, custom sizing, and optional text display.
 *
 * @example
 * // Basic usage
 * <CymasphereLogo />
 *
 * @example
 * // With custom size and link
 * <CymasphereLogo size="60px" fontSize="2rem" href="/" showText={true} />
 */

import React from "react";
import Link from "next/link";
import styled from "styled-components";
import EnergyBall from "@/components/common/EnergyBall";

interface LogoWrapperProps {
  $clickable?: boolean;
}

interface LogoTextProps {
  $fontSize?: string;
}

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  position: relative;
`;

const LogoWrapper = styled.div<LogoWrapperProps>`
  display: flex;
  align-items: center;
  text-decoration: none;
  position: relative;
  z-index: 1;
  cursor: ${(props) => (props.$clickable ? "pointer" : "default")};

  &:hover {
    text-decoration: none;
  }
`;

const LogoText = styled.div<LogoTextProps>`
  display: flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  font-size: ${(props) => props.$fontSize || "1.8rem"};
  font-weight: 700;
  margin-left: 6px;
  font-family: var(--font-montserrat), -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;

  .cyma {
    background: linear-gradient(90deg, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

/**
 * @brief Props for the CymasphereLogo component
 */
interface CymasphereLogoProps {
  /** @param {string} [size="40px"] - Size of the energy ball icon */
  size?: string;
  /** @param {string} [fontSize="1.8rem"] - Font size for the logo text */
  fontSize?: string;
  /** @param {boolean} [showText=true] - Whether to display the "CYMASPHERE" text */
  showText?: boolean;
  /** @param {string} [href] - Optional URL to navigate to when logo is clicked */
  href?: string;
  /** @param {React.MouseEventHandler<HTMLDivElement>} [onClick] - Optional click handler */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  /** @param {string} [className] - Additional CSS class names */
  className?: string;
}

/**
 * @brief CymasphereLogo component
 *
 * Renders the Cymasphere brand logo with an animated energy ball and optional
 * text. The logo can be made clickable via href and supports custom sizing.
 *
 * @param {CymasphereLogoProps} props - Component props
 * @returns {JSX.Element} The rendered logo component
 *
 * @note The logo text uses a gradient effect on the "CYMA" portion
 * @note If href is provided, the logo becomes a clickable link
 */
const CymasphereLogo: React.FC<CymasphereLogoProps> = ({
  size = "40px",
  fontSize = "1.8rem",
  showText = true,
  href,
  onClick,
  className,
}) => {
  const content = (
    <LogoWrapper $clickable={!!href} onClick={onClick}>
      <EnergyBall size={size} />
      {showText && (
        <LogoText $fontSize={fontSize}>
          <span className="cyma">CYMA</span>
          <span className="sphere">SPHERE</span>
        </LogoText>
      )}
    </LogoWrapper>
  );

  return (
    <LogoContainer className={className}>
      {href ? <Link href={href}>{content}</Link> : content}
    </LogoContainer>
  );
};

export default CymasphereLogo;
