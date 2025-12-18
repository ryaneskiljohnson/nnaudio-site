"use client";

import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import ProductCard from "@/components/products/ProductCard";
import ProductSearchAndSort, { SortOption } from "@/components/products/ProductSearchAndSort";
import LoadingComponent from "@/components/common/LoadingComponent";

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
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
`;

const FilterBar = styled.div`
  max-width: 1400px;
  margin: 0 auto 3rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: 12px 24px;
  border-radius: 50px;
  border: 2px solid ${props => props.$active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.$active ? 'rgba(138, 43, 226, 0.2)' : 'transparent'};
  color: white;
  cursor: pointer;
  font-weight: ${props => props.$active ? '600' : '500'};
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--primary);
    background: rgba(138, 43, 226, 0.1);
  }
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

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?status=active&limit=100');
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.tagline?.toLowerCase().includes(query) ||
        p.short_description?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Helper function to check if a product is an elite bundle
    const isEliteBundle = (product: any) => {
      const name = product.name.toLowerCase();
      return name.includes("producer's") || name.includes('producers') || 
             name.includes('ultimate') || name.includes('beat lab');
    };

    // Sort products - elite bundles first, then by selected sort option
    filtered.sort((a, b) => {
      // Elite bundles always come first
      const aIsElite = isEliteBundle(a);
      const bIsElite = isEliteBundle(b);
      
      if (aIsElite && !bIsElite) return -1;
      if (!aIsElite && bIsElite) return 1;
      
      // If both are elite bundles, sort them: Producer's Arsenal, Ultimate Bundle, Beat Lab
      if (aIsElite && bIsElite) {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        const getEliteOrder = (name: string) => {
          if (name.includes("producer's") || name.includes('producers')) return 0;
          if (name.includes('ultimate')) return 1;
          if (name.includes('beat lab')) return 2;
          return 3;
        };
        
        return getEliteOrder(aName) - getEliteOrder(bName);
      }
      
      // For non-elite bundles, use the selected sort option
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc': {
          const aPrice = a.sale_price ?? a.price ?? 0;
          const bPrice = b.sale_price ?? b.price ?? 0;
          return aPrice - bPrice;
        }
        case 'price-desc': {
          const aPrice = a.sale_price ?? a.price ?? 0;
          const bPrice = b.sale_price ?? b.price ?? 0;
          return bPrice - aPrice;
        }
        case 'rating-desc': {
          const aRating = a.average_rating ?? 0;
          const bRating = b.average_rating ?? 0;
          return bRating - aRating;
        }
        case 'rating-asc': {
          const aRating = a.average_rating ?? 0;
          const bRating = b.average_rating ?? 0;
          return aRating - bRating;
        }
        case 'newest': {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return bDate - aDate;
        }
        case 'oldest': {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return aDate - bDate;
        }
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, searchQuery, sortOption, selectedCategory]);

  return (
    <Container>
      <Header>
        <Title>All Products</Title>
        <Subtitle>Discover our complete collection of music production tools</Subtitle>
      </Header>

      {!loading && (
        <>
          <ProductSearchAndSort
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOption={sortOption}
            onSortChange={setSortOption}
            resultsCount={filteredAndSortedProducts.length}
            totalCount={products.length}
          />
        <FilterBar>
            {['all', 'audio-fx-plugin', 'instrument-plugin', 'pack', 'bundle', 'preset', 'template'].map(category => {
              const categoryLabels: Record<string, string> = {
                'all': 'All Products',
                'audio-fx-plugin': 'Audio FX',
                'instrument-plugin': 'Instruments',
                'pack': 'Packs',
                'bundle': 'Bundles',
                'preset': 'Presets',
                'template': 'Templates',
              };
              return (
            <FilterButton
              key={category}
              $active={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
                  {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1) + 's'}
            </FilterButton>
              );
            })}
        </FilterBar>
        </>
      )}

      {loading ? (
        <LoadingComponent text="Loading products..." />
      ) : filteredAndSortedProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          {searchQuery ? `No products found matching "${searchQuery}"` : 'No products available'}
        </div>
      ) : (
        <ProductsGrid>
          {filteredAndSortedProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              showCartButton={true}
            />
          ))}
        </ProductsGrid>
      )}
    </Container>
  );
}

