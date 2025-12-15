"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaSearch, FaFilter, FaStar, FaShoppingCart } from "react-icons/fa";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { cleanHtmlText } from "@/utils/stringUtils";

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

const SearchBar = styled.div`
  max-width: 600px;
  margin: 0 auto 2rem;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 16px 50px 16px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50px;
  color: white;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.15);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
`;

const FilterBar = styled.div`
  max-width: 1200px;
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

const ProductCard = styled(motion.div)`
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 420px;
  
  &:hover {
    transform: translateY(-10px);
    border-color: rgba(138, 43, 226, 0.5);
    box-shadow: 0 20px 40px rgba(138, 43, 226, 0.2);
  }
`;

const ProductImageContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #1a1a1a;
  overflow: hidden;
  flex-shrink: 0;
`;

const ProductImage = styled(Image)`
  object-fit: cover;
`;

const ProductInfo = styled.div`
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
`;

const ProductName = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  text-align: center;
`;

const ProductTagline = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
  line-height: 1.3;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  text-align: center;
`;

const ProductPrice = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #4ecdc4;
  margin-top: 0.5rem;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  text-align: center;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const CartButton = styled(motion.button)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
  transition: all 0.3s ease;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.8);
  
  ${ProductCard}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
  }
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(138, 43, 226, 0.6);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    font-size: 1rem;
  }
`;

const ProductMeta = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const CategoryBadge = styled.span<{ $category: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch(props.$category) {
      case 'plugin': return 'rgba(108, 99, 255, 0.2)';
      case 'pack': return 'rgba(78, 205, 196, 0.2)';
      case 'bundle': return 'rgba(255, 94, 98, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: white;
`;

const Rating = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ffd700;
  font-size: 0.9rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.7);
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: white;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.2rem;
`;

interface Product {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  short_description?: string;
  price: number;
  sale_price?: number;
  category: string;
  featured_image_url?: string;
  logo_url?: string;
  average_rating?: number;
  review_count?: number;
}

export default function ProductsPage() {
  const { addItem } = useCart();
  const { success } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?status=active&limit=100');
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
        setFilteredProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
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
        p.short_description?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const categories = ['all', 'plugin', 'pack', 'bundle', 'preset', 'template'];

  return (
    <Container>
      <Header>
        <Title>All Products</Title>
        <Subtitle>Discover our complete collection of music production tools</Subtitle>
        
        <SearchBar>
          <SearchInput
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SearchIcon />
        </SearchBar>

        <FilterBar>
          {categories.map(category => (
            <FilterButton
              key={category}
              $active={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'All Products' : category.charAt(0).toUpperCase() + category.slice(1) + 's'}
            </FilterButton>
          ))}
        </FilterBar>
      </Header>

      {loading ? (
        <LoadingContainer>Loading products...</LoadingContainer>
      ) : filteredProducts.length === 0 ? (
        <EmptyState>
          <h3>No products found</h3>
          <p>Try adjusting your search or filters</p>
        </EmptyState>
      ) : (
        <ProductsGrid>
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <Link href={`/product/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <ProductImageContainer>
                  {product.featured_image_url || product.logo_url ? (
                    <Image
                      src={product.featured_image_url || product.logo_url || ''}
                      alt={product.name}
                      fill
                      style={{ objectFit: 'contain', padding: '20px' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      color: 'rgba(255, 255, 255, 0.3)'
                    }}>
                      {product.name[0]}
                    </div>
                  )}
                </ProductImageContainer>
                
                <ProductInfo>
                  <ProductName>{product.name}</ProductName>
                  {product.tagline && (
                    <ProductTagline>{cleanHtmlText(product.tagline)}</ProductTagline>
                  )}
                  
                  <PriceRow>
                    <ProductPrice>
                      {product.price === 0 || product.price === null ? (
                        'FREE'
                      ) : product.sale_price && product.sale_price > 0 ? (
                        <>
                          <span style={{ textDecoration: 'line-through', fontSize: '1rem', opacity: 0.6, marginRight: '8px' }}>
                            ${product.price}
                          </span>
                          ${product.sale_price}
                        </>
                      ) : (
                        `$${product.price}`
                      )}
                    </ProductPrice>
                    <CartButton
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem({
                          id: product.id,
                          name: product.name,
                          slug: product.slug,
                          price: product.price,
                          sale_price: product.sale_price,
                          featured_image_url: product.featured_image_url,
                          logo_url: product.logo_url,
                        });
                        success(`${product.name} added to cart!`, 3000);
                      }}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <FaShoppingCart />
                    </CartButton>
                  </PriceRow>
                  <ProductMeta>
                    <CategoryBadge $category={product.category}>
                      {product.category}
                    </CategoryBadge>
                  </ProductMeta>
                  
                  {product.review_count != null && 
                   product.review_count > 0 && 
                   product.average_rating != null && 
                   product.average_rating > 0 && (
                    <Rating>
                      <FaStar />
                      <span>{product.average_rating.toFixed(1)} ({product.review_count})</span>
                    </Rating>
                  )}
                </ProductInfo>
              </Link>
              
              <CartButton
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addItem({
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    sale_price: product.sale_price,
                    featured_image_url: product.featured_image_url,
                    logo_url: product.logo_url,
                  });
                  success(`${product.name} added to cart!`, 3000);
                }}
                aria-label={`Add ${product.name} to cart`}
              >
                <FaShoppingCart />
              </CartButton>
            </ProductCard>
          ))}
        </ProductsGrid>
      )}
    </Container>
  );
}

