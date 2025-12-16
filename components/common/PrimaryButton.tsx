"use client";

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const StyledPrimaryButton = styled(motion.button)`
  background: linear-gradient(135deg, #6c63ff, #8a2be2);
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
  transition: all 0.3s ease;
  font-size: 1rem;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 99, 255, 0.5);
    background: linear-gradient(135deg, #7c73ff, #9a3bf2);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  href?: string;
}

export default function PrimaryButton({ children, ...props }: PrimaryButtonProps) {
  return (
    <StyledPrimaryButton
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </StyledPrimaryButton>
  );
}

