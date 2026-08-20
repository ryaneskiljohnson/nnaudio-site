/**
 * @fileoverview Free tools page. Home only points here; this is where Free is
 * written. One paid door out: Cymasphere $199.
 * @module components/pages/FreeToolsLandingPage
 */

"use client";

import Link from "next/link";
import styled from "styled-components";
import ProductCard from "@/components/products/ProductCard";
import {
  CYMASPHERE_PRICE_LABEL,
  CYMASPHERE_SALES,
} from "@/lib/cymasphere-sales";
import type { CatalogProduct } from "@/utils/catalog";

const FEATURED_FREE_NAMES = [
  "FreeQ",
  "Freelay",
  "Freeverb",
  "Sterfreeo",
  "Cowboy Harp",
] as const;

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #06070f 0%, #0c1020 42%, #07080f 100%);
`;

const Hero = styled.section`
  padding: clamp(88px, 12vw, 128px) 20px 48px;
`;

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const Title = styled.h1`
  margin: 0 0 1rem;
  color: var(--text);
  font-size: clamp(2.2rem, 4vw, 3.6rem);
  line-height: 1.08;
`;

const Lead = styled.p`
  margin: 0 0 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  line-height: 1.65;
`;

const NameList = styled.p`
  margin: 0 0 2rem;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.6;
`;

const Section = styled.section`
  padding: 12px 20px 40px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 0.75rem;
  color: var(--text);
  font-size: 1.6rem;
`;

const Copy = styled.p`
  margin: 0 0 1.25rem;
  color: rgba(255, 255, 255, 0.76);
  line-height: 1.65;
`;

const AccessLink = styled(Link)`
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.2rem;
  margin-bottom: 2rem;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 880px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const Door = styled.section`
  padding: 12px 20px 80px;
`;

const DoorCard = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const DoorTitle = styled.h2`
  margin: 0 0 0.6rem;
  color: var(--text);
  font-size: 1.4rem;
`;

const Cta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.4rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
`;

interface FreeToolsLandingPageProps {
  products: CatalogProduct[];
}

function mapCardProduct(product: CatalogProduct) {
  return {
    ...product,
    slug: product.slug ?? undefined,
    tagline: product.tagline ?? undefined,
    short_description: product.short_description ?? undefined,
    description: product.description ?? undefined,
    category: product.category ?? undefined,
    sale_price: product.sale_price ?? undefined,
    featured_image_url: product.featured_image_url ?? undefined,
    logo_url: product.logo_url ?? undefined,
    price: product.price ?? 0,
  };
}

function featuredNameIndex(name: string): number {
  const lower = name.toLowerCase();
  return FEATURED_FREE_NAMES.findIndex((item) =>
    lower.includes(item.toLowerCase())
  );
}

/**
 * @brief Lists free tools that actually ship, plus Access, plus one $199 door.
 */
export default function FreeToolsLandingPage({
  products,
}: FreeToolsLandingPageProps) {
  const extras = products
    .filter((product) => featuredNameIndex(product.name) === -1)
    .sort((a, b) => a.name.localeCompare(b.name));
  const featured = FEATURED_FREE_NAMES.map((name) =>
    products.find((product) =>
      product.name.toLowerCase().includes(name.toLowerCase())
    )
  ).filter((product): product is CatalogProduct => Boolean(product));
  const ordered = [...featured, ...extras];

  return (
    <Page>
      <Hero>
        <Inner>
          <Title>Free tools. In the session today.</Title>
          <Lead>No card.</Lead>
          <NameList>
            {FEATURED_FREE_NAMES.join(", ")}
            {extras.length > 0
              ? `. Also shipping: ${extras.map((item) => item.name).join(", ")}.`
              : "."}
          </NameList>
        </Inner>
      </Hero>

      <Section>
        <Inner>
          <SectionTitle>NNAudio Access</SectionTitle>
          <Copy>
            Download, install, update, library. Mac and Windows. Not a login
            wall.{" "}
            <AccessLink href="/product/nnaudio-access">NNAudio Access</AccessLink>
          </Copy>
          {ordered.length > 0 ? (
            <ProductGrid>
              {ordered.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={mapCardProduct(product)}
                  index={index}
                  showCartButton
                />
              ))}
            </ProductGrid>
          ) : (
            <Copy>No free tools are in the catalog right now.</Copy>
          )}
        </Inner>
      </Section>

      <Door>
        <DoorCard>
          <DoorTitle>Cymasphere · {CYMASPHERE_PRICE_LABEL}</DoorTitle>
          <Copy>MIDI harmony engine. One-time. Not a subscription.</Copy>
          <Cta href="/product/cymasphere">{CYMASPHERE_SALES.ctaLabel}</Cta>
        </DoorCard>
      </Door>
    </Page>
  );
}
