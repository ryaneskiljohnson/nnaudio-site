"use client";

import React from 'react';
import Image from 'next/image';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
`;

const SpinnerImage = styled(Image)`
  animation: ${spin} 1s linear infinite;
  opacity: 0.8;
`;

const LoadingText = styled.span`
  color: var(--text-secondary);
  font-size: 0.9rem;
  animation: ${pulse} 1s ease-in-out infinite;
`;

interface NNAudioLoadingSpinnerProps {
  text?: string;
  size?: number;
}

export default function NNAudioLoadingSpinner({ 
  text, 
  size = 40 
}: NNAudioLoadingSpinnerProps) {
  return (
    <SpinnerContainer>
      <SpinnerImage
        src="/images/nnaud-io/NNPurp1.png"
        alt="Loading"
        width={size}
        height={size}
        unoptimized
      />
      {text && <LoadingText>{text}</LoadingText>}
    </SpinnerContainer>
  );
}

