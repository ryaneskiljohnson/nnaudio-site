import React from "react";
import dynamic from "next/dynamic";
import styled from "styled-components";
import { motion } from "framer-motion";
import Head from "next/head";

// Dynamically import components that require client-side rendering
const DynamicHeader = dynamic(() => import("./NextHeader"), { ssr: false });
const NextFooter = dynamic(() => import("./NextFooter"), { ssr: false });

const Main = styled.main`
  min-height: calc(100vh - 60px); // Adjust for footer height
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const ContentWrapper = styled(motion.div)`
  flex: 1;
  width: 100%;
`;

const pageVariants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeInOut" as const,
    },
  },
  out: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
};

interface DynamicNextLayoutProps {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

const DynamicNextLayout: React.FC<DynamicNextLayoutProps> = ({
  children,
  title = "NNAud.io – Resources for Modern Music Producers",
  showHeader = true,
  showFooter = true,
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <meta
          name="description"
          content="Discover premium plugins, sample packs, and tools designed to elevate your music production workflow."
        />
      </Head>

      <Main>
        {showHeader && <DynamicHeader />}

        <ContentWrapper
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
        >
          {children}
        </ContentWrapper>

        {showFooter && <NextFooter />}
      </Main>
    </>
  );
};

export default DynamicNextLayout;
