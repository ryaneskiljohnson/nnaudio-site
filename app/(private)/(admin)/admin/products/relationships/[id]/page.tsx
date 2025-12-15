"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaArrowLeft, FaPlus, FaTrash, FaSearch } from "react-icons/fa";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: var(--text);
  font-weight: 700;
`;

const BackButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--text);
  margin-bottom: 1.5rem;
  font-weight: 600;
`;

const SearchBar = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 40px 12px 16px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
`;

const ProductList = styled.div`
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ProductItem = styled.div`
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ProductInfo = styled.div`
  flex: 1;
`;

const ProductName = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const ProductCategory = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const AddButton = styled.button`
  padding: 8px 16px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(78, 205, 196, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RelatedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const RelatedItem = styled.div`
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RemoveButton = styled.button`
  padding: 8px 16px;
  background: rgba(255, 94, 98, 0.2);
  color: #ff5e62;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 94, 98, 0.3);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
`;

export default function ProductRelationshipsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch product details
      const productResponse = await fetch(`/api/products/${productId}`);
      const productData = await productResponse.json();
      
      if (productData.success) {
        setProduct(productData.product);
        setRelatedProducts(productData.product.related_products || []);
      }
      
      // Fetch all products
      const allResponse = await fetch('/api/products?status=active&limit=100');
      const allData = await allResponse.json();
      
      if (allData.success) {
        // Filter out current product and already related products
        const relatedIds = new Set((productData.product?.related_products || []).map((p: any) => p.id));
        const filtered = allData.products.filter((p: any) => 
          p.id !== productId && !relatedIds.has(p.id)
        );
        setAllProducts(filtered);
      }
      
      // Also fetch relationships to get relationship IDs
      const relResponse = await fetch(`/api/products/${productId}`);
      const relData = await relResponse.json();
      if (relData.success && relData.product.related_products) {
        setRelatedProducts(relData.product.related_products);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRelationship = async (relatedProductId: string) => {
    try {
      const response = await fetch('/api/products/relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          related_product_id: relatedProductId,
          relationship_type: 'related',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh data
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error adding relationship:', error);
      alert('Failed to add relationship');
    }
  };

  const handleRemoveRelationship = async (relatedProductId: string) => {
    try {
      // Find the relationship ID
      const relationship = relatedProducts.find((p: any) => p.id === relatedProductId);
      if (!relationship || !relationship.relationship_id) {
        // If no relationship_id, try to find it from the database
        const response = await fetch(`/api/products/relationships/find?product_id=${productId}&related_product_id=${relatedProductId}`);
        const data = await response.json();
        if (!data.success || !data.relationship) {
          alert('Could not find relationship');
          return;
        }
        const deleteResponse = await fetch(`/api/products/relationships/${data.relationship.id}`, {
          method: 'DELETE',
        });
        const deleteData = await deleteResponse.json();
        if (deleteData.success) {
          fetchData();
        }
        return;
      }

      const response = await fetch(`/api/products/relationships/${relationship.relationship_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Refresh data
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error removing relationship:', error);
      alert('Failed to remove relationship');
    }
  };

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Manage Related Products: {product?.name}</Title>
        <BackButton href="/admin/products">
          <FaArrowLeft /> Back to Products
        </BackButton>
      </Header>

      <Content>
        <Section>
          <SectionTitle>Available Products</SectionTitle>
          
          <SearchBar>
            <SearchInput
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchIcon />
          </SearchBar>

          <ProductList>
            {filteredProducts.length === 0 ? (
              <EmptyState>No products found</EmptyState>
            ) : (
              filteredProducts.map((p) => (
                <ProductItem key={p.id}>
                  <ProductInfo>
                    <ProductName>{p.name}</ProductName>
                    <ProductCategory>{p.category}</ProductCategory>
                  </ProductInfo>
                  <AddButton onClick={() => handleAddRelationship(p.id)}>
                    <FaPlus /> Add
                  </AddButton>
                </ProductItem>
              ))
            )}
          </ProductList>
        </Section>

        <Section>
          <SectionTitle>Related Products</SectionTitle>
          
          <RelatedList>
            {relatedProducts.length === 0 ? (
              <EmptyState>No related products yet</EmptyState>
            ) : (
              relatedProducts.map((p: any) => (
                <RelatedItem key={p.id}>
                  <ProductInfo>
                    <ProductName>{p.name}</ProductName>
                    <ProductCategory>{p.category}</ProductCategory>
                  </ProductInfo>
                  <RemoveButton onClick={() => handleRemoveRelationship(p.id)}>
                    <FaTrash /> Remove
                  </RemoveButton>
                </RelatedItem>
              ))
            )}
          </RelatedList>
        </Section>
      </Content>
    </Container>
  );
}

