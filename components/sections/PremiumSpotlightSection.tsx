/**
 * @fileoverview Homepage premium bridge section that leads visitors toward the
 * flagship top-shelf product experience.
 * @module components/sections/PremiumSpotlightSection
 */

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { scrollToHash } from "@/utils/scrollToHash";
import { FaCheck, FaLayerGroup, FaRocket } from "react-icons/fa";

const Section = styled.section`
  padding: 88px 20px;
  background:
    radial-gradient(circle at top left, rgba(108, 99, 255, 0.18), transparent 30%),
    radial-gradient(circle at bottom right, rgba(78, 205, 196, 0.14), transparent 24%),
    linear-gradient(180deg, #080911 0%, #11162a 100%);
`;

const Inner = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 430px);
  gap: 2rem;
  align-items: center;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Copy = styled.div`
  min-width: 0;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.75rem;
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0 0 1rem;
  color: var(--text);
  font-size: clamp(2.1rem, 4vw, 3.6rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
`;

const Subtitle = styled.p`
  max-width: 680px;
  margin: 0 0 1.25rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.7;
  font-size: 1.08rem;
`;

const BulletList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`;

const Bullet = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.55;

  svg {
    color: var(--accent);
    margin-top: 0.25rem;
    flex-shrink: 0;
  }
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
`;

const PrimaryCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.95rem 1.5rem;
  border-radius: 999px;
  text-decoration: none;
  color: white;
  font-weight: 700;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  box-shadow: 0 12px 30px rgba(138, 43, 226, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 36px rgba(138, 43, 226, 0.45);
  }
`;

const SecondaryCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.95rem 1.5rem;
  border-radius: 999px;
  text-decoration: none;
  color: white;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  transition: transform 0.25s ease, border-color 0.25s ease,
    background 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.32);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const SpotlightStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SpotlightCard = styled.div`
  position: relative;
  padding: 2rem 1.6rem;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(7, 8, 15, 0.2), rgba(7, 8, 15, 0.82)),
    url("/images/landing/premium-spotlight-visual.webp");
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
  text-align: center;
  overflow: hidden;
`;

const MiniCard = styled.div`
  padding: 1.3rem 1.2rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.2);
`;

const PriceBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.88rem;
  font-weight: 700;
`;

const PriceWas = styled.span`
  text-decoration: line-through;
  opacity: 0.55;
`;

const PriceNow = styled.span`
  color: #4ecdc4;
`;

const CardTitle = styled.h3`
  margin: 0 0 0.55rem;
  color: var(--text);
  font-size: 1.6rem;
`;

const CardBody = styled.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.65;
`;

const EliteHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.6rem;
  color: var(--text);
  font-weight: 700;
  font-size: 1rem;

  svg {
    color: var(--accent);
  }
`;

const EliteList = styled.ul`
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const EliteItem = styled.li`
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.5;

  strong {
    color: var(--text);
  }
`;

/**
 * @brief Presents the top-shelf premium paths for visitors who want more than
 * the free or mid-tier catalog.
 * @returns Premium spotlight section.
 */
/** Fallback logo when product image is not available */
const CYMASPHERE_LOGO_FALLBACK = "/logo-cymasphere.svg";

export default function PremiumSpotlightSection() {
  const pathname = usePathname();
  const [cymasphereImageUrl, setCymasphereImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products/slug/cymasphere")
      .then((res) => res.ok ? res.json() : null)
      .then((data: { product?: { featured_image_url?: string | null } }) => {
        const url = data?.product?.featured_image_url?.trim();
        if (url) setCymasphereImageUrl(url);
      })
      .catch(() => {});
  }, []);

  const cymasphereSrc = cymasphereImageUrl || CYMASPHERE_LOGO_FALLBACK;

  return (
    <Section>
      <Inner>
        <Copy>
          <Eyebrow>Top Shelf</Eyebrow>
          <Title>Top-shelf NNAudio for deeper workflows and bigger setups.</Title>
          <Subtitle>
            Free tools are the easiest way in. This is where you go deeper with
            Cymasphere or go bigger with the elite bundles built to give you
            more of the catalog in one move.
          </Subtitle>
          <BulletList>
            <Bullet>
              <FaCheck />
              Cymasphere is for producers and songwriters who want a deeper
              workflow and stronger musical momentum.
            </Bullet>
            <Bullet>
              <FaCheck />
              The 3 elite bundles are for buyers who want broader ownership and
              faster access to the full ecosystem.
            </Bullet>
            <Bullet>
              <FaCheck />
              This is the top-shelf layer of the catalog, not just another row
              of products lower in the page.
            </Bullet>
          </BulletList>
          <CtaRow>
            <PrimaryCta href="/product/cymasphere">
              <FaRocket />
              Explore Cymasphere
            </PrimaryCta>
            <SecondaryCta
            href="#bundles"
            onClick={(e) => {
              if (scrollToHash("#bundles", pathname ?? "/")) e.preventDefault();
            }}
          >
            See Elite Bundles
          </SecondaryCta>
          </CtaRow>
        </Copy>

        <SpotlightStack>
          <SpotlightCard>
            <PriceBadge>
              <PriceWas>$499</PriceWas>
              <PriceNow>$149</PriceNow>
            </PriceBadge>
            <Image
              src={cymasphereSrc}
              alt="Cymasphere"
              width={320}
              height={120}
              style={{ width: "100%", height: "auto", maxWidth: "320px", margin: "0 auto 1rem", filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.45))", objectFit: "contain" }}
              unoptimized={cymasphereSrc.startsWith("http")}
            />
            <CardTitle>Intelligent Music Creation</CardTitle>
            <CardBody>
              A flagship composition workflow built to move you from rough idea
              to stronger musical direction with less friction.
            </CardBody>
          </SpotlightCard>

          <MiniCard>
            <EliteHeader>
              <FaLayerGroup />
              Elite Bundles
            </EliteHeader>
            <EliteList>
              <EliteItem>
                <strong>Ultimate Bundle</strong>: Everything We Make. Forever.
              </EliteItem>
              <EliteItem>
                <strong>Producer&apos;s Arsenal</strong>: Every Plugin. Every Update. Every Time.
              </EliteItem>
              <EliteItem>
                <strong>Beat Lab</strong>: Unlimited MIDI &amp; Loops. Infinite Inspiration.
              </EliteItem>
            </EliteList>
            <CardBody>
              If Cymasphere is the premium workflow path, the elite bundles are
              the premium ownership path for buyers who want more of the catalog
              in one move, not one purchase at a time.
            </CardBody>
          </MiniCard>
        </SpotlightStack>
      </Inner>
    </Section>
  );
}
