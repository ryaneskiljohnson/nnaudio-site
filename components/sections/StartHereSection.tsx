/**
 * @fileoverview Homepage section that routes visitors into the primary growth
 * journeys: free tools, bundles, and flagship product.
 * @module components/sections/StartHereSection
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { FaGift, FaLayerGroup, FaRocket } from "react-icons/fa";
import { scrollToHash } from "@/utils/scrollToHash";

const Section = styled.section`
  position: relative;
  padding: 72px 20px 48px;
  background: linear-gradient(180deg, #05060d 0%, #0a0a0a 100%);
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.75rem;
  text-align: center;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0 0 1rem;
  text-align: center;
  font-size: clamp(2rem, 4vw, 3rem);
  color: var(--text);
`;

const Subtitle = styled.p`
  max-width: 760px;
  margin: 0 auto 2.5rem;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.7;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Visual = styled.div`
  margin: 0 auto 2rem;
  max-width: 980px;
  min-height: 280px;
  border-radius: 24px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(7, 8, 15, 0.12), rgba(7, 8, 15, 0.72)),
    url("/images/landing/pathways-visual.webp");
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
  display: flex;
  align-items: flex-end;

  @media (max-width: 900px) {
    min-height: 220px;
  }
`;

const VisualOverlay = styled.div`
  width: 100%;
  padding: 1.35rem 1.5rem;
  background: linear-gradient(
    180deg,
    rgba(7, 8, 15, 0) 0%,
    rgba(7, 8, 15, 0.64) 45%,
    rgba(7, 8, 15, 0.88) 100%
  );
`;

const VisualTitle = styled.h3`
  margin: 0 0 0.4rem;
  color: var(--text);
  font-size: 1.2rem;
`;

const VisualBody = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.6;
`;

const Card = styled(Link)`
  display: block;
  padding: 1.5rem;
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.25s ease, border-color 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(108, 99, 255, 0.45);
    box-shadow: 0 20px 45px rgba(12, 12, 28, 0.35);
  }
`;

const IconWrap = styled.div`
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  margin-bottom: 1rem;
  background: linear-gradient(
    135deg,
    rgba(108, 99, 255, 0.18) 0%,
    rgba(78, 205, 196, 0.16) 100%
  );
  color: white;
  font-size: 1.2rem;
`;

const CardTitle = styled.h3`
  margin: 0 0 0.65rem;
  color: var(--text);
  font-size: 1.2rem;
`;

const CardBody = styled.p`
  margin: 0 0 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
`;

const CardMeta = styled.div`
  color: var(--primary);
  font-weight: 600;
`;

/**
 * @brief Presents the three primary entry paths for new visitors.
 * @returns Homepage start-here section.
 */
export default function StartHereSection() {
  const pathname = usePathname();
  return (
    <Section>
      <Inner>
        <Eyebrow>Choose Your Path</Eyebrow>
        <Title>Choose the way you want to start</Title>
        <Subtitle>
          Start with the part of the catalog that matches what you want right
          now: useful tools, bigger value, or a deeper writing workflow.
        </Subtitle>
        <Visual>
          <VisualOverlay>
            <VisualTitle>Three ways in, one cleaner ecosystem</VisualTitle>
            <VisualBody>
              Start free, build a bigger toolkit, or go straight into the
              flagship workflow depending on what kind of creator you are.
            </VisualBody>
          </VisualOverlay>
        </Visual>
        <Grid>
          <Card
            href="#free-products"
            onClick={(e) => {
              if (scrollToHash("#free-products", pathname ?? "/")) e.preventDefault();
            }}
          >
            <IconWrap>
              <FaGift />
            </IconWrap>
            <CardTitle>Try The Free Collection</CardTitle>
            <CardBody>
              Hear the sound, test the workflow, and figure out what deserves a
              real place in your setup before you buy deeper.
            </CardBody>
            <CardMeta>Start here</CardMeta>
          </Card>

          <Card
            href="#bundles"
            onClick={(e) => {
              if (scrollToHash("#bundles", pathname ?? "/")) e.preventDefault();
            }}
          >
            <IconWrap>
              <FaLayerGroup />
            </IconWrap>
            <CardTitle>Go Straight To Bundle Value</CardTitle>
            <CardBody>
              Move into the highest-value offers fast when you want more range,
              more sounds, and fewer scattered purchases.
            </CardBody>
            <CardMeta>Go for value</CardMeta>
          </Card>

          <Card href="/product/cymasphere">
            <IconWrap>
              <FaRocket />
            </IconWrap>
            <CardTitle>Go Deep With Cymasphere</CardTitle>
            <CardBody>
              Explore the flagship workflow for stronger progressions, faster
              ideas, and more momentum from rough sketch to real music.
            </CardBody>
            <CardMeta>Explore the flagship</CardMeta>
          </Card>
        </Grid>
      </Inner>
    </Section>
  );
}
