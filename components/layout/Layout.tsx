import React from "react";
import styled from "styled-components";
import dynamic from "next/dynamic";
import Footer from "./Footer";
import { motion } from "framer-motion";

const DynamicHeader = dynamic(() => import("./NextHeader"), { ssr: false });

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

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <LayoutWrapper>
      <DynamicHeader />
      <Main initial="initial" animate="in" exit="exit" variants={pageVariants}>
        {children}
      </Main>
      <Footer />
    </LayoutWrapper>
  );
};

export default Layout;
