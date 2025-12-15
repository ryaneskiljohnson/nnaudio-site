"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaBox, FaLock, FaCheckCircle, FaExternalLinkAlt } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 30px 15px;
  }
`;

const Header = styled.div`
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
`;

const SubscriptionBadge = styled.div<{ $type: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${props => {
    if (props.$type === 'lifetime') return 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))';
    if (props.$type === 'annual') return 'linear-gradient(135deg, rgba(78, 205, 196, 0.2), rgba(68, 160, 141, 0.2))';
    return 'linear-gradient(135deg, rgba(108, 99, 255, 0.2), rgba(78, 205, 196, 0.2))';
  }};
  border: 1px solid ${props => {
    if (props.$type === 'lifetime') return 'rgba(245, 158, 11, 0.5)';
    if (props.$type === 'annual') return 'rgba(78, 205, 196, 0.5)';
    return 'rgba(108, 99, 255, 0.5)';
  }};
  border-radius: 50px;
  color: white;
  font-weight: 600;
  margin-bottom: 2rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 1.5rem;
`;

const EmptyStateTitle = styled.h2`
  font-size: 1.5rem;
  color: white;
  margin-bottom: 1rem;
`;

const EmptyStateText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
`;

const BrowseButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 24px;
  background: linear-gradient(135deg, #6c63ff, #4ecdc4);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(78, 205, 196, 0.4);
  }
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ProductCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(78, 205, 196, 0.5);
    box-shadow: 0 8px 32px rgba(78, 205, 196, 0.2);
  }
`;

const ProductImage = styled.div`
  position: relative;
  width: 100%;
  height: 200px;
  background: rgba(255, 255, 255, 0.05);
`;

const ProductInfo = styled.div`
  padding: 1.5rem;
`;

const ProductName = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const ProductCategory = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ECDC4;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
`;

const AccessBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 0.5rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: rgba(255, 255, 255, 0.7);
`;

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  featured_image_url?: string;
  short_description?: string;
}

export default function MyProductsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetchMyProducts();
  }, [user, router]);

  const fetchMyProducts = async () => {
    try {
      setLoading(true);
      
      // Check user's subscription status
      const subscription = user?.profile?.subscription || "none";
      const hasActiveSubscription = subscription !== "none";

      if (!hasActiveSubscription) {
        setHasAccess(false);
        setProducts([]);
        setLoading(false);
        return;
      }

      setHasAccess(true);

      // Fetch all products - for now, if user has subscription, they have access to all products
      // In the future, this could be filtered based on bundle subscriptions or individual purchases
      const response = await fetch("/api/products?status=active");
      const data = await response.json();

      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionDisplayName = () => {
    const subscription = user?.profile?.subscription || "none";
    if (subscription === "lifetime") return "Lifetime Access";
    if (subscription === "annual") return "Annual Subscription";
    if (subscription === "monthly") return "Monthly Subscription";
    return "No Subscription";
  };

  const formatCategory = (category: string) => {
    if (category === "plugin") return "Plugin";
    if (category === "pack") return "Pack";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (loading) {
    return (
      <Container>
        <LoadingContainer>Loading your products...</LoadingContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>My Products</Title>
        <Subtitle>
          View and manage all products you have access to
        </Subtitle>
        
        {hasAccess && (
          <SubscriptionBadge $type={user?.profile?.subscription || "none"}>
            <FaCheckCircle />
            {getSubscriptionDisplayName()}
          </SubscriptionBadge>
        )}
      </Header>

      {!hasAccess ? (
        <EmptyState>
          <EmptyStateIcon>
            <FaLock />
          </EmptyStateIcon>
          <EmptyStateTitle>No Active Subscription</EmptyStateTitle>
          <EmptyStateText>
            You don't currently have an active subscription. Subscribe to get access to all NNAudio products, or purchase individual products.
          </EmptyStateText>
          <BrowseButton href="/products">
            Browse Products
            <FaExternalLinkAlt />
          </BrowseButton>
        </EmptyState>
      ) : products.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <FaBox />
          </EmptyStateIcon>
          <EmptyStateTitle>No Products Found</EmptyStateTitle>
          <EmptyStateText>
            We're currently loading your products. Please check back in a moment.
          </EmptyStateText>
        </EmptyState>
      ) : (
        <>
          <div style={{ marginBottom: "1rem", color: "rgba(255, 255, 255, 0.7)" }}>
            You have access to <strong style={{ color: "#4ECDC4" }}>{products.length}</strong> products
          </div>
          <ProductsGrid>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => router.push(`/product/${product.slug}`)}
              >
                <ProductImage>
                  {product.featured_image_url ? (
                    <Image
                      src={product.featured_image_url}
                      alt={product.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(255, 255, 255, 0.3)",
                      }}
                    >
                      <FaBox size={48} />
                    </div>
                  )}
                </ProductImage>
                <ProductInfo>
                  <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                    <ProductCategory>{formatCategory(product.category)}</ProductCategory>
                  </div>
                  <ProductName>{product.name}</ProductName>
                  {product.short_description && (
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "rgba(255, 255, 255, 0.6)",
                        marginBottom: "0.75rem",
                        lineHeight: "1.5",
                      }}
                    >
                      {product.short_description}
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <AccessBadge>
                      <FaCheckCircle />
                      You have access
                    </AccessBadge>
                  </div>
                </ProductInfo>
              </ProductCard>
            ))}
          </ProductsGrid>
        </>
      )}
    </Container>
  );
}

