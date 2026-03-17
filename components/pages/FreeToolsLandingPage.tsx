/**
 * @fileoverview Dedicated free-tools landing page with a stronger acquisition
 * narrative, grouped free offers, and a clear next-step path into the paid
 * catalog.
 * @module components/pages/FreeToolsLandingPage
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { FaCheck, FaDesktop, FaGift, FaLayerGroup, FaPlug } from "react-icons/fa";
import ProductCard from "@/components/products/ProductCard";
import { scrollToHash } from "@/utils/scrollToHash";
import type { CatalogProduct } from "@/utils/catalog";

const Page = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(108, 99, 255, 0.16), transparent 26%),
    radial-gradient(circle at top right, rgba(78, 205, 196, 0.14), transparent 24%),
    linear-gradient(180deg, #06070f 0%, #0c1020 42%, #07080f 100%);
`;

const Hero = styled.section`
  padding: clamp(88px, 12vw, 128px) 20px 72px;
`;

const HeroInner = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 1.5rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const HeroCopy = styled.div`
  padding-right: 1rem;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.85rem;
  color: var(--accent);
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0 0 1rem;
  color: var(--text);
  font-size: clamp(2.4rem, 4vw, 4.5rem);
  line-height: 1.06;
  letter-spacing: -0.03em;
`;

const Subtitle = styled.p`
  margin: 0 0 1.35rem;
  max-width: 740px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 1.14rem;
  line-height: 1.7;
`;

const BulletList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
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
  gap: 0.9rem;
  margin-bottom: 1.1rem;
`;

const PrimaryCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.95rem 1.5rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  box-shadow: 0 10px 30px rgba(138, 43, 226, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 36px rgba(138, 43, 226, 0.45);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
`;

const SecondaryCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.95rem 1.5rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  transition: transform 0.25s ease, border-color 0.25s ease,
    background 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.08);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 3px;
  }
`;

const Microcopy = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.92rem;
`;

const FeatureCard = styled.div`
  padding: 1.35rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
`;

const FeatureCardTitle = styled.h3`
  margin: 0 0 0.8rem;
  color: var(--text);
  font-size: 1.15rem;
`;

const FeatureCardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
`;

const FeatureMini = styled.div`
  padding: 0.95rem 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const FeatureMiniHead = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.35rem;
  color: var(--text);
  font-weight: 700;

  svg {
    color: var(--accent);
  }
`;

const FeatureMiniText = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
`;

const Section = styled.section`
  padding: 36px 20px 84px;
`;

const SectionInner = styled.div`
  max-width: 1180px;
  margin: 0 auto;
`;

const SectionHeader = styled.div`
  max-width: 780px;
  margin: 0 auto 2rem;
  text-align: center;
`;

const SectionEyebrow = styled.p`
  margin: 0 0 0.7rem;
  color: var(--accent);
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
`;

const SectionTitle = styled.h2`
  margin: 0 0 0.85rem;
  color: var(--text);
  font-size: clamp(2rem, 3vw, 3rem);
`;

const SectionBody = styled.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
`;

const Group = styled.div`
  margin-bottom: 3rem;

  &:last-of-type {
    margin-bottom: 2rem;
  }
`;

const GroupTitle = styled.h3`
  margin: 0 0 0.35rem;
  color: var(--text);
  font-size: 1.5rem;
`;

const GroupBody = styled.p`
  margin: 0 0 1.5rem;
  color: var(--text-secondary);
  line-height: 1.65;
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.2rem;

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

const NextStepCard = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(108, 99, 255, 0.16), transparent 32%),
    radial-gradient(circle at bottom right, rgba(78, 205, 196, 0.13), transparent 28%),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
`;

const NextStepTitle = styled.h3`
  margin: 0 0 0.75rem;
  color: var(--text);
  font-size: 1.6rem;
`;

const NextStepBody = styled.p`
  max-width: 760px;
  margin: 0 auto 1.25rem;
  color: var(--text-secondary);
  line-height: 1.7;
`;

const nextStepGroups = [
  {
    title: "Get the free collection into your workflow first",
    body:
      "Use the free tools to get a feel for the sounds, the product style, and the NNAudio experience before deciding what deserves a permanent place in your setup.",
    icon: <FaGift />,
  },
  {
    title: "Use NNAudio Access to keep everything cleaner",
    body:
      "The app gives you one place to install, update, and manage everything you own so the catalog feels easier to live with over time.",
    icon: <FaDesktop />,
  },
  {
    title: "Upgrade when you want more range, not more clutter",
    body:
      "Once you know the sound and workflow fit, move into bundles or premium products instead of piecing things together one purchase at a time.",
    icon: <FaLayerGroup />,
  },
];

type GroupedProducts = {
  plugins: CatalogProduct[];
  packs: CatalogProduct[];
};

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

/**
 * @brief Renders a bespoke free-tools landing page.
 * @param props - Free product catalog payload.
 * @returns Conversion-oriented free tools page.
 */
export default function FreeToolsLandingPage({
  products,
}: FreeToolsLandingPageProps) {
  const pathname = usePathname();
  const groupedProducts = products.reduce<GroupedProducts>(
    (acc, product) => {
      if (product.category === "pack") {
        acc.packs.push(product);
      } else {
        acc.plugins.push(product);
      }
      return acc;
    },
    { plugins: [], packs: [] }
  );

  const pluginsWithAccessFirst = [...groupedProducts.plugins].sort((a, b) => {
    const aIsApp = a.category === "application" ? 1 : 0;
    const bIsApp = b.category === "application" ? 1 : 0;
    return bIsApp - aIsApp;
  });

  const hasProducts = products.length > 0;

  return (
    <Page>
      <Hero>
        <HeroInner>
          <HeroCopy>
            <Eyebrow>Free Collection</Eyebrow>
            <Title>Get useful tools first. Decide what earns a permanent place later.</Title>
            <Subtitle>
              Start with free plugins, free MIDI packs, and NNAudio Access in one
              clean place. No fluff, no filler, just tools you can actually put
              to work in real sessions.
            </Subtitle>
            <BulletList>
              <Bullet>
                <FaCheck />
                Free plugins for width, delay, EQ, and reverb.
              </Bullet>
              <Bullet>
                <FaCheck />
                Free MIDI packs for faster ideas and stronger starting points.
              </Bullet>
              <Bullet>
                <FaCheck />
                NNAudio Access to install, update, and manage everything you own.
              </Bullet>
            </BulletList>
            <CtaRow>
              <PrimaryCta
                href="#free-collection"
                aria-label="Scroll to free collection"
                onClick={(e) => {
                  if (scrollToHash("#free-collection", pathname ?? "/")) e.preventDefault();
                }}
              >
                <FaGift />
                Explore The Free Collection
              </PrimaryCta>
              <SecondaryCta href="/bundles" aria-label="See bundle pricing">
                <FaLayerGroup />
                See Bundle Pricing
              </SecondaryCta>
            </CtaRow>
            <Microcopy>
              Start free now. Upgrade when you know what fits your workflow.
            </Microcopy>
          </HeroCopy>

          <FeatureCard>
            <FeatureCardTitle>Why this page exists</FeatureCardTitle>
            <FeatureCardGrid>
              {nextStepGroups.map((item) => (
                <FeatureMini key={item.title}>
                  <FeatureMiniHead>
                    {item.icon}
                    {item.title}
                  </FeatureMiniHead>
                  <FeatureMiniText>{item.body}</FeatureMiniText>
                </FeatureMini>
              ))}
            </FeatureCardGrid>
          </FeatureCard>
        </HeroInner>
      </Hero>

      <Section id="free-collection" aria-label="Free collection">
        <SectionInner>
          <SectionHeader>
            <SectionEyebrow>Free Collection</SectionEyebrow>
            <SectionTitle>The free side of the catalog, organized properly</SectionTitle>
            <SectionBody>
              NNAudio Access plus free plugins and free MIDI packs—pick what you
              need and add it in one place.
            </SectionBody>
          </SectionHeader>

          {!hasProducts ? (
            <Group>
              <GroupBody style={{ textAlign: "center", marginBottom: 0 }}>
                No free tools are available right now. Check back soon or browse
                the full catalog.
              </GroupBody>
              <CtaRow style={{ justifyContent: "center", marginTop: "1.5rem" }}>
                <PrimaryCta href="/products" aria-label="Browse all products">
                  <FaPlug />
                  Browse All Products
                </PrimaryCta>
              </CtaRow>
            </Group>
          ) : pluginsWithAccessFirst.length > 0 ? (
            <Group>
              <GroupTitle>Free Plugins & NNAudio Access</GroupTitle>
              <GroupBody>
                NNAudio Access is your free hub to install, update, and manage
                everything you own. The rest are creative FX and instruments you
                can drop straight into your workflow.
              </GroupBody>
              <ProductGrid>
                {pluginsWithAccessFirst.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={mapCardProduct(product)}
                    index={index}
                    showCartButton
                  />
                ))}
              </ProductGrid>
            </Group>
          ) : null}

          {hasProducts && groupedProducts.packs.length > 0 ? (
            <Group>
              <GroupTitle>Free MIDI Packs</GroupTitle>
              <GroupBody>
                Quick idea starters for producers who want stronger progressions,
                drum movement, and melodic direction without losing momentum.
              </GroupBody>
              <ProductGrid>
                {groupedProducts.packs.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={mapCardProduct(product)}
                    index={index}
                    showCartButton
                  />
                ))}
              </ProductGrid>
            </Group>
          ) : null}

          <NextStepCard aria-label="Next steps">
            <NextStepTitle>When you’re ready to go deeper</NextStepTitle>
            <NextStepBody>
              Start with the free side of the catalog, then move into bundles
              when you want more range, more sounds, and a more complete NNAudio
              setup without piecing everything together separately.
            </NextStepBody>
            <CtaRow style={{ justifyContent: "center" }}>
              <PrimaryCta href="/bundles" aria-label="Explore bundles">
                <FaLayerGroup />
                Explore Bundles
              </PrimaryCta>
              <SecondaryCta href="/plugins" aria-label="Browse all plugins">
                <FaPlug />
                Browse All Plugins
              </SecondaryCta>
            </CtaRow>
          </NextStepCard>
        </SectionInner>
      </Section>
    </Page>
  );
}
