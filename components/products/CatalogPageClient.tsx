/**
 * @fileoverview Reusable client catalog page with search, sorting, and product
 * grid rendering for public category pages.
 * @module components/products/CatalogPageClient
 */

"use client";

import React, { useMemo, useState } from "react";
import styled from "styled-components";
import ProductCard from "@/components/products/ProductCard";
import ProductSearchAndSort, {
  SortOption,
} from "@/components/products/ProductSearchAndSort";
import { CatalogProduct } from "@/utils/catalog";

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 120px 20px 80px;
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 3rem;
  text-align: center;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.85rem;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: 1rem;
`;

const HelperText = styled.p`
  max-width: 760px;
  margin: 0 auto;
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.6;
`;

const ProductsGrid = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.72);
`;

export interface CatalogPageClientProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  helperText?: string;
  initialProducts: CatalogProduct[];
}

/**
 * @brief Renders a searchable, sortable public catalog page.
 * @param props - Page copy and initial product payload.
 * @returns Interactive catalog page component.
 */
export default function CatalogPageClient({
  eyebrow,
  title,
  subtitle,
  helperText,
  initialProducts,
}: CatalogPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = [...initialProducts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searched = filtered.filter((product) =>
        [product.name, product.tagline, product.short_description, product.description]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      );

      filtered.splice(0, filtered.length, ...searched);
    }

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc": {
          const aPrice = a.sale_price ?? a.price ?? 0;
          const bPrice = b.sale_price ?? b.price ?? 0;
          return aPrice - bPrice;
        }
        case "price-desc": {
          const aPrice = a.sale_price ?? a.price ?? 0;
          const bPrice = b.sale_price ?? b.price ?? 0;
          return bPrice - aPrice;
        }
        case "rating-desc":
          return (b.average_rating ?? 0) - (a.average_rating ?? 0);
        case "rating-asc":
          return (a.average_rating ?? 0) - (b.average_rating ?? 0);
        case "newest":
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [initialProducts, searchQuery, sortOption]);

  return (
    <Container>
      <Header>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Title>{title}</Title>
        <Subtitle>{subtitle}</Subtitle>
        {helperText ? <HelperText>{helperText}</HelperText> : null}
      </Header>

      <ProductSearchAndSort
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOption={sortOption}
        onSortChange={setSortOption}
        resultsCount={filteredAndSortedProducts.length}
        totalCount={initialProducts.length}
      />

      {filteredAndSortedProducts.length === 0 ? (
        <EmptyState>
          {searchQuery
            ? `No products found matching "${searchQuery}".`
            : "No products are available right now."}
        </EmptyState>
      ) : (
        <ProductsGrid>
          {filteredAndSortedProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={{
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
              }}
              index={index}
              showCartButton
            />
          ))}
        </ProductsGrid>
      )}
    </Container>
  );
}
