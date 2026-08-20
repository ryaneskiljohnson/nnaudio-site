/**
 * @fileoverview Homepage trust and value strip for communicating the clearest
 * reasons to buy into the NNAudio ecosystem.
 * @module components/sections/ProofPointsSection
 */

"use client";

import Link from "next/link";
import styled from "styled-components";
import { FaBoxOpen, FaDesktop, FaGift, FaLayerGroup } from "react-icons/fa";

const Section = styled.section`
  padding: 44px 20px 28px;
  background: linear-gradient(180deg, #06070f 0%, #0a0a0a 100%);
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.7rem;
  text-align: center;
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0 0 0.85rem;
  text-align: center;
  color: var(--text);
  font-size: clamp(2rem, 3.2vw, 3rem);
`;

const Subtitle = styled.p`
  max-width: 760px;
  margin: 0 auto 1.75rem;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.7;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  padding: 1.15rem 1.2rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.16);
`;

const IconWrap = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.85rem;
  color: white;
  font-size: 1rem;
  background: linear-gradient(
    135deg,
    rgba(108, 99, 255, 0.22) 0%,
    rgba(78, 205, 196, 0.18) 100%
  );
`;

const CardTitle = styled.h3`
  margin: 0 0 0.45rem;
  color: var(--text);
  font-size: 1rem;
`;

const Body = styled.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.55;
  font-size: 0.92rem;
`;

const Footer = styled.div`
  margin-top: 1.25rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.92rem;
  line-height: 1.6;

  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
  }

  a:hover {
    text-decoration: underline;
  }
`;

/**
 * @brief Displays top-level trust and value reasons for new visitors.
 * @returns Homepage proof strip.
 */
export default function ProofPointsSection() {
  return (
    <Section>
      <Inner>
        <Eyebrow>Made For Real Sessions</Eyebrow>
        <Title>A creative catalog with less friction built in</Title>
        <Subtitle>
          A catalog that starts easy and scales into deeper tools, packs,
          bundles, and workflows without the usual mess of scattered installs
          and disconnected one-off purchases.
        </Subtitle>
        <Grid>
          <Card>
            <IconWrap>
              <FaGift />
            </IconWrap>
            <CardTitle>Free tools worth keeping</CardTitle>
            <Body>
              Get a real feel for the sound and workflow before you commit to
              anything bigger.
            </Body>
          </Card>

          <Card>
            <IconWrap>
              <FaBoxOpen />
            </IconWrap>
            <CardTitle>Own what you buy</CardTitle>
            <Body>
              Most plugins, packs, and many bundles are one-time purchases. Buy
              once, keep them, and keep creating.
            </Body>
          </Card>

          <Card>
            <IconWrap>
              <FaDesktop />
            </IconWrap>
            <CardTitle>Built for real production workflows</CardTitle>
            <Body>
              Plugins are built for modern music production on macOS and Windows,
              with formats designed for major DAWs.
            </Body>
          </Card>

          <Card>
            <IconWrap>
              <FaLayerGroup />
            </IconWrap>
            <CardTitle>Range without the clutter</CardTitle>
            <Body>
              Move from entry points into bundles, flagship tools, and broader
              ownership paths without losing the thread of the catalog.
            </Body>
          </Card>
        </Grid>

        <Footer>
          New here? Start with{" "}
          <Link href="/free-tools">Free tools</Link>
          {", "}
          <Link href="/product/cymasphere">Cymasphere</Link>
          {", or the "}
          <Link href="/products">catalog</Link>.
        </Footer>
      </Inner>
    </Section>
  );
}
