/**
 * @fileoverview Mid-to-late funnel CTA section for moving homepage visitors
 * into the highest-intent next action.
 * @module components/sections/ConversionCtaSection
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { FaBoxOpen, FaLayerGroup, FaRocket } from "react-icons/fa";
import { scrollToHash } from "@/utils/scrollToHash";

const Section = styled.section`
  padding: 88px 20px 72px;
  background: linear-gradient(180deg, #05060d 0%, #0b0f1f 100%);
`;

const Card = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(108, 99, 255, 0.2), transparent 30%),
    radial-gradient(circle at bottom right, rgba(78, 205, 196, 0.16), transparent 28%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
`;

const Eyebrow = styled.p`
  margin: 0 0 0.85rem;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.88rem;
  font-weight: 700;
  text-align: center;
`;

const Title = styled.h2`
  margin: 0 0 1rem;
  text-align: center;
  color: var(--text);
  font-size: clamp(2rem, 3.5vw, 3rem);
`;

const Subtitle = styled.p`
  max-width: 760px;
  margin: 0 auto 2rem;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.7;
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Option = styled(Link)`
  display: block;
  padding: 1.25rem;
  border-radius: 18px;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.25s ease, border-color 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(108, 99, 255, 0.4);
  }
`;

const OptionIcon = styled.div`
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  margin-bottom: 0.85rem;
  color: white;
  background: linear-gradient(
    135deg,
    rgba(108, 99, 255, 0.22) 0%,
    rgba(78, 205, 196, 0.18) 100%
  );
`;

const OptionTitle = styled.h3`
  margin: 0 0 0.45rem;
  color: var(--text);
  font-size: 1.05rem;
`;

const OptionBody = styled.p`
  margin: 0 0 0.9rem;
  color: var(--text-secondary);
  line-height: 1.55;
  font-size: 0.92rem;
`;

const OptionMeta = styled.div`
  color: var(--primary);
  font-weight: 600;
  font-size: 0.92rem;
`;

/**
 * @brief Gives warm homepage traffic a strong next-step decision.
 * @returns Conversion CTA section.
 */
export default function ConversionCtaSection() {
  const pathname = usePathname();
  return (
    <Section>
      <Card>
        <Eyebrow>Ready For More?</Eyebrow>
        <Title>Once the free side clicks, here’s where to go next</Title>
        <Subtitle>
          If the free side already clicks, move into bundles for more range,
          explore Cymasphere for a deeper workflow, or browse the full catalog
          and follow your curiosity.
        </Subtitle>
        <Options>
          <Option
            href="#bundles"
            onClick={(e) => {
              if (scrollToHash("#bundles", pathname ?? "/")) e.preventDefault();
            }}
          >
            <OptionIcon>
              <FaLayerGroup />
            </OptionIcon>
            <OptionTitle>Move Into Bundles</OptionTitle>
            <OptionBody>
              The fastest path into the highest-value offers if you want more
              sounds, more tools, and a bigger NNAudio setup in one move.
            </OptionBody>
            <OptionMeta>Best value path</OptionMeta>
          </Option>

          <Option href="/product/cymasphere">
            <OptionIcon>
              <FaRocket />
            </OptionIcon>
            <OptionTitle>Go Straight To Cymasphere</OptionTitle>
            <OptionBody>
              The flagship path for stronger musical ideas, better progressions,
              and more momentum.
            </OptionBody>
            <OptionMeta>Flagship workflow</OptionMeta>
          </Option>

          <Option href="/products">
            <OptionIcon>
              <FaBoxOpen />
            </OptionIcon>
            <OptionTitle>Browse The Full Catalog</OptionTitle>
            <OptionBody>
              If you’d rather explore everything at your own pace, the full
              catalog gives you the widest view of the sounds, packs, tools,
              and bundles.
            </OptionBody>
            <OptionMeta>See everything</OptionMeta>
          </Option>
        </Options>
      </Card>
    </Section>
  );
}
