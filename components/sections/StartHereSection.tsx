/**
 * @fileoverview Short homepage doors: Free, Cymasphere $199 one-time, catalog.
 * @module components/sections/StartHereSection
 */

"use client";

import Link from "next/link";
import styled from "styled-components";
import { FaBoxOpen, FaGift, FaRocket } from "react-icons/fa";
import { CYMASPHERE_PRICE_LABEL } from "@/lib/cymasphere-sales";

const Section = styled.section`
  position: relative;
  padding: 56px 20px 40px;
  background: linear-gradient(180deg, #05060d 0%, #0a0a0a 100%);
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h2`
  margin: 0 0 1.5rem;
  text-align: center;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  color: var(--text);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
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
  margin: 0 0 0.4rem;
  color: var(--text);
  font-size: 1.2rem;
`;

const CardMeta = styled.div`
  color: var(--primary);
  font-weight: 600;
`;

/**
 * @brief Three short storefront doors. No Cymasphere lander copy.
 */
export default function StartHereSection() {
  return (
    <Section>
      <Inner>
        <Title>Start here</Title>
        <Grid>
          <Card href="/free-tools">
            <IconWrap>
              <FaGift />
            </IconWrap>
            <CardTitle>Free</CardTitle>
            <CardMeta>Free tools</CardMeta>
          </Card>

          <Card href="/product/cymasphere">
            <IconWrap>
              <FaRocket />
            </IconWrap>
            <CardTitle>Cymasphere</CardTitle>
            <CardMeta>{CYMASPHERE_PRICE_LABEL} one-time</CardMeta>
          </Card>

          <Card href="/products">
            <IconWrap>
              <FaBoxOpen />
            </IconWrap>
            <CardTitle>Catalog</CardTitle>
            <CardMeta>Browse the shop</CardMeta>
          </Card>
        </Grid>
      </Inner>
    </Section>
  );
}
