import React from "react";
import Link from "next/link";
import styled from "styled-components";
import Image from "next/image";

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

const LogoImage = styled.div<{ $size?: string }>`
  display: flex;
  align-items: center;
  height: ${(props) => props.$size || "40px"};
  width: auto;
  
  img {
    height: 100%;
    width: auto;
    max-height: ${(props) => props.$size || "40px"};
  }
`;

interface NNAudioLogoProps {
  size?: string;
  fontSize?: string;
  showText?: boolean;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

const NNAudioLogo: React.FC<NNAudioLogoProps> = ({
  size = "40px",
  fontSize = "1.8rem",
  showText = false,
  href,
  onClick,
  className,
}) => {
  const content = (
    <LogoWrapper $clickable={!!href} onClick={onClick}>
      <LogoImage $size={size}>
        <Image
          src="/images/nnaud-io/NNAudio-logo-white.png"
          alt="NNAud.io Logo"
          width={445}
          height={283}
          style={{ height: "auto", width: "auto" }}
          priority
        />
      </LogoImage>
    </LogoWrapper>
  );

  return (
    <LogoContainer className={className}>
      {href ? <Link href={href}>{content}</Link> : content}
    </LogoContainer>
  );
};

export default NNAudioLogo;

