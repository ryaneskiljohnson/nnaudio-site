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


export default function PluginsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch both plugin types
      const [fxResponse, instrumentResponse] = await Promise.all([
        fetch('/api/products?category=audio-fx-plugin&status=active&limit=100'),
        fetch('/api/products?category=instrument-plugin&status=active&limit=100'),
      ]);
      
      const fxData = await fxResponse.json();
      const instrumentData = await instrumentResponse.json();
      
      const allPlugins = [
        ...(fxData.success ? fxData.products : []),
        ...(instrumentData.success ? instrumentData.products : []),
      ];
      
      const response = { success: true, products: allPlugins };
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

    // Sort products
    filtered.sort((a, b) => {
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
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, sortOption]);

  return (
    <Container>
      <Header>
        <Title>Premium Plugins</Title>
        <Subtitle>Professional-grade tools for modern music production</Subtitle>
      </Header>

      {!loading && (
        <ProductSearchAndSort
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          resultsCount={filteredAndSortedProducts.length}
          totalCount={products.length}
        />
      )}

      {loading ? (
        <LoadingComponent text="Loading plugins..." />
      ) : filteredAndSortedProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          {searchQuery ? `No plugins found matching "${searchQuery}"` : 'No plugins available'}
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

