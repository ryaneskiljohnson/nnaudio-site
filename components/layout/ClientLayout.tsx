"use client";

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Footer from "@/components/layout/Footer";
import NextHeader from "@/components/layout/NextHeader";

const LayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--background);
`;

const Main = styled(motion.main)`
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;

  /* Content within can set their own max-width if needed */
  > * {
    margin: 0 auto;
    width: 100%;
  }
`;

// Animation variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.43, 0.13, 0.23, 0.96] as const,
    },
  },
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWrapper>
      <NextHeader />
      <Main initial="initial" animate="in" exit="exit" variants={pageVariants}>
        {children}
      </Main>
      <Footer />
    </LayoutWrapper>
  );
} 