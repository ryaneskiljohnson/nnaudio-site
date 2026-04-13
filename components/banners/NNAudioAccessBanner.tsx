/**
 * @fileoverview Fixed landing-page banner promoting NNAudio Access (product manager app).
 * @module components/banners/NNAudioAccessBanner
 */
"use client";

import React, { useLayoutEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaDownload, FaTimes } from "react-icons/fa";

const BANNER_THUMBNAIL_URL =
  "https://znecvzfogwkzinkduyuq.supabase.co/storage/v1/object/public/product-images/nnaudio-access.png";
const PRODUCT_URL = "/product/nnaudio-access";
const DOWNLOAD_URL = "/downloads";

const BannerContainer = styled(motion.div)`
  position: fixed;
  top: 69px; /* 1px overlap with header to avoid sub-pixel gap */
  left: 0;
  right: 0;
  width: 100%;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.65) 0%, rgba(75, 0, 130, 0.72) 100%);
  border-bottom: 1px solid rgba(138, 43, 226, 0.55);
  padding: 0.75rem 1.25rem;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  z-index: 3000;
  display: flex;
  align-items: center;
  min-height: 56px;
  gap: 1rem;

  @media (max-width: 768px) {
    top: 63px; /* 1px overlap with header on mobile */
    padding: 0.5rem 0.75rem;
    min-height: auto;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.35rem 0.5rem;
  }
`;

/** Groups thumbnail, title, Learn more, and close so they stay on first row on mobile; only description wraps to row 2 */
const BannerFirstRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    flex: 1 1 100%;
    flex-wrap: nowrap;
    gap: 0.5rem;
  }
`;

/** Spacer so main content starts below the fixed banner */
const BannerSpacer = styled.div`
  min-height: 56px;
  @media (max-width: 768px) {
    min-height: 52px;
  }
`;

const BannerLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    gap: 0.5rem;
    min-width: 0;
  }
`;

const Thumbnail = styled.div`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }
`;

const BannerText = styled.div`
  flex: 1;
  min-width: 0;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.15rem;

  @media (max-width: 768px) {
    margin-bottom: 0;
    gap: 0.35rem;
  }
`;

const BannerTitle = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    font-size: 0.9375rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

/** Short title for mobile single-line layout */
const BannerTitleShort = styled.span`
  display: none;

  @media (max-width: 768px) {
    display: inline;
    font-size: 0.9375rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

/** Full title hidden on mobile when short title is shown */
const BannerTitleFull = styled.span`
  @media (max-width: 768px) {
    display: none;
  }
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
`;

const NewBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1a1a2e;
  background: linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    padding: 0.15rem 0.35rem;
    font-size: 0.6rem;
  }
`;

const FreeBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #0a0a0a;
  background: linear-gradient(135deg, #4ecdc4 0%, #81e6d9 100%);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    padding: 0.15rem 0.35rem;
    font-size: 0.6rem;
  }
`;

const BannerDescription = styled.span`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.88);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    display: none;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    gap: 0.35rem;
  }
`;

const LearnMoreButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 50px;
  text-decoration: none;
  transition: all 0.3s ease;
  white-space: nowrap;
  background: transparent;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.65rem;
    font-size: 0.8125rem;
  }
`;

const DownloadButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 50px;
  text-decoration: none;
  transition: all 0.3s ease;
  white-space: nowrap;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(138, 43, 226, 0.5);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: rgba(255, 255, 255, 0.9);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    color: white;
  }

  @media (max-width: 768px) {
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
    order: 2;
  }
`;

const STORAGE_KEY = "closedNNAudioAccessBanner";

/**
 * @brief Renders the fixed NNAudio Access promo strip and spacer; respects prior dismiss via localStorage.
 * @note localStorage is read in useLayoutEffect so dismissed users avoid a post-paint flash of the banner.
 */
export default function NNAudioAccessBanner() {
  const [closed, setClosed] = useState(false);

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setClosed(true);
    } catch {
      // ignore
    }
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setClosed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  };

  if (closed) return null;

  return (
    <>
      <BannerContainer
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <BannerFirstRow>
          <BannerLeft>
            <Thumbnail>
              <Image
                src={BANNER_THUMBNAIL_URL}
                alt="NNAudio Access"
                fill
                sizes="(max-width: 768px) 36px, 44px"
                style={{ objectFit: "cover" }}
              />
            </Thumbnail>
            <BannerText>
              <TitleRow>
                <BannerTitleFull>NNAudio Access — Product Manager</BannerTitleFull>
                <BannerTitleShort>NNAudio Access</BannerTitleShort>
                <BadgeRow>
                  <NewBadge>New</NewBadge>
                  <FreeBadge>Free</FreeBadge>
                </BadgeRow>
              </TitleRow>
              <BannerDescription>
                Download, install, and update all your NNAudio products in one place.
              </BannerDescription>
            </BannerText>
          </BannerLeft>
          <ButtonGroup>
            <LearnMoreButton href={PRODUCT_URL} prefetch>
              Learn more
            </LearnMoreButton>
            <DownloadButton href={DOWNLOAD_URL} prefetch>
              <FaDownload size={12} />
              Download
            </DownloadButton>
          </ButtonGroup>
          <CloseButton type="button" onClick={handleClose} title="Close banner" aria-label="Close banner">
            <FaTimes />
          </CloseButton>
        </BannerFirstRow>
    </BannerContainer>
      <BannerSpacer />
    </>
  );
}
