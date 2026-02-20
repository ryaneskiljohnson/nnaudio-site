"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaDownload, FaDesktop, FaCheck } from "react-icons/fa";

const BANNER_THUMBNAIL_URL =
  "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/product-images/nnaudio-access.png";

const SCREENSHOTS_BASE =
  "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/product-images/NNAudio%20Access";
const SCREENSHOT_URLS = [
  `${SCREENSHOTS_BASE}/NNAudio_Access_1.png`,
  `${SCREENSHOTS_BASE}/NNAudio_Access_2.png`,
  `${SCREENSHOTS_BASE}/NNAudio_Access_3.png`,
  `${SCREENSHOTS_BASE}/NNAudio_Access_4.png`,
];

const SECTION_BG_IMAGE = `${SCREENSHOTS_BASE}/NNAudio_Access_3.png`;

const Section = styled.section`
  position: relative;
  padding: 96px 16px 128px;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 128px 24px 160px;
  }
  @media (min-width: 1024px) {
    padding: 160px 24px 200px;
  }
`;

const SectionBackground = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: url("${SECTION_BG_IMAGE}");
  background-size: cover;
  background-position: center;
`;

const SectionOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(6, 7, 15, 0.88) 0%,
    rgba(6, 7, 15, 0.84) 40%,
    rgba(6, 7, 15, 0.9) 100%
  );
`;

const Container = styled.div`
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: stretch;

  @media (min-width: 1024px) {
    padding: 0 8px;
  }
`;

const TwoColumnRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: stretch;

  @media (min-width: 1024px) {
    flex-direction: row;
    align-items: center;
    gap: 2.5rem;
  }
`;

const ContentColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

/** Semi-transparent mask behind text for readability, like hero subtitle */
const TextMask = styled.div`
  padding: 1.5rem 1.25rem;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 12px;

  @media (min-width: 768px) {
    padding: 2rem 2rem;
    border-radius: 16px;
  }
`;

/** Same size and position as ProductsSection / slider section title (h2) */
const SectionHeading = styled.h2`
  font-size: 3.5rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const ContentBlock = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;

  @media (min-width: 768px) {
    gap: 2rem;
  }
  @media (max-width: 767px) {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }
`;

const Thumbnail = styled.div`
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);

  @media (min-width: 768px) {
    width: 110px;
    height: 110px;
    border-radius: 16px;
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.35rem;
  justify-content: flex-start;

  @media (max-width: 767px) {
    justify-content: center;
  }
  @media (min-width: 768px) {
    gap: 0.75rem;
  }
`;

const Title = styled.h3`
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: 1.65rem;
  }
`;

const FreeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.22rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0a0a0a;
  background: linear-gradient(135deg, #4ecdc4 0%, #81e6d9 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(78, 205, 196, 0.35);

  @media (min-width: 768px) {
    padding: 0.25rem 0.65rem;
    font-size: 0.75rem;
  }
`;

const WhatItIs = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 0.9rem;
  line-height: 1.5;

  @media (min-width: 768px) {
    font-size: 0.95rem;
    margin-bottom: 1rem;
  }
`;

const BulletList = styled.ul`
  list-style: none;
  margin: 0 0 1.1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  align-items: flex-start;

  @media (max-width: 767px) {
    align-items: center;
    margin-bottom: 1rem;
    gap: 0.5rem;
  }
  @media (min-width: 768px) {
    margin-bottom: 1.35rem;
  }
`;

const BulletItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.45;
  text-align: left;
  max-width: 100%;

  svg {
    flex-shrink: 0;
    color: #4ecdc4;
    font-size: 0.85rem;
    margin-top: 0.2em;
  }

  @media (max-width: 767px) {
    text-align: center;
    align-items: center;
    font-size: 0.875rem;
  }
  @media (min-width: 768px) {
    font-size: 0.95rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 0.6rem;
  justify-content: center;
  width: 100%;

  & > * {
    flex-shrink: 0;
  }

  @media (max-width: 767px) {
    gap: 0.75rem;
  }
  @media (min-width: 768px) {
    gap: 0.75rem;
  }
`;

const StyledLink = styled(Link)<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 50px;
  text-decoration: none;
  transition: all 0.3s ease;
  min-height: 44px;
  white-space: nowrap;

  @media (min-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  ${(p) =>
    p.$primary
      ? `
    background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
    color: white;
    border: none;
    box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(138, 43, 226, 0.5);
    }
  `
      : `
    background: transparent;
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
    }
  `}
`;

const SliderColumn = styled.div`
  flex-shrink: 0;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;

  @media (min-width: 1024px) {
    width: 48%;
    max-width: none;
    margin: 0;
  }
`;

const SliderFrame = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (min-width: 768px) {
    border-radius: 16px;
  }
`;

export default function NNAudioAccessHighlightSection() {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SCREENSHOT_URLS.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <Section>
      <SectionBackground aria-hidden="true" />
      <SectionOverlay aria-hidden="true" />
      <Container>
        <SectionHeading>One app to manage everything</SectionHeading>
        <TwoColumnRow>
          <ContentColumn>
            <TextMask>
            <ContentBlock
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              <Thumbnail>
                <Image
                  src={BANNER_THUMBNAIL_URL}
                  alt="NNAudio Access"
                  fill
                  sizes="110px"
                  style={{ objectFit: "cover" }}
                />
              </Thumbnail>
              <Content>
                <TitleRow>
                  <Title>NNAudio Access</Title>
                  <FreeBadge>Free</FreeBadge>
                </TitleRow>
                <WhatItIs>
                  Free desktop app for Mac &amp; Windows. Your single hub to get and manage every NNAudio product you own.
                </WhatItIs>
                <BulletList>
                  <BulletItem>
                    <FaCheck /> Download installers for all your plugins and sample packs
                  </BulletItem>
                  <BulletItem>
                    <FaCheck /> Install and update with one click—no hunting for files
                  </BulletItem>
                  <BulletItem>
                    <FaCheck /> See your full library in one place; required to install any NNAudio product
                  </BulletItem>
                </BulletList>
                <ButtonGroup>
                  <StyledLink href="/product/nnaudio-access" prefetch $primary={false}>
                    <FaDesktop size={16} />
                    Learn more
                  </StyledLink>
                  <StyledLink href="/downloads" prefetch $primary>
                    <FaDownload size={16} />
                    Get it free
                  </StyledLink>
                </ButtonGroup>
              </Content>
            </ContentBlock>
            </TextMask>
          </ContentColumn>

          <SliderColumn aria-hidden="true">
            <SliderFrame>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ position: "absolute", inset: 0 }}
              >
                <Image
                  src={SCREENSHOT_URLS[slideIndex]}
                  alt=""
                  fill
                  sizes="(max-width: 1023px) 100vw, 520px"
                  style={{ objectFit: "contain" }}
                  priority={slideIndex === 0}
                />
              </motion.div>
            </AnimatePresence>
            </SliderFrame>
          </SliderColumn>
        </TwoColumnRow>
      </Container>
    </Section>
  );
}
