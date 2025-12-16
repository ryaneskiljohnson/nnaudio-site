"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaBox, FaLock, FaCheckCircle, FaExternalLinkAlt, FaUndo, FaExclamationTriangle, FaDownload, FaRocket } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { cleanHtmlText } from "@/utils/stringUtils";
import LoadingComponent from "@/components/common/LoadingComponent";

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

const SubscriptionBadge = styled.div<{ $type: string; $cancelled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${props => {
    if (props.$cancelled) return 'rgba(255, 152, 0, 0.2)';
    if (props.$type === 'lifetime') return 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))';
    if (props.$type === 'annual') return 'linear-gradient(135deg, rgba(78, 205, 196, 0.2), rgba(68, 160, 141, 0.2))';
    return 'linear-gradient(135deg, rgba(108, 99, 255, 0.2), rgba(78, 205, 196, 0.2))';
  }};
  border: 1px solid ${props => {
    if (props.$cancelled) return 'rgba(255, 152, 0, 0.5)';
    if (props.$type === 'lifetime') return 'rgba(245, 158, 11, 0.5)';
    if (props.$type === 'annual') return 'rgba(78, 205, 196, 0.5)';
    return 'rgba(108, 99, 255, 0.5)';
  }};
  border-radius: 50px;
  color: white;
  font-weight: 600;
  margin-bottom: 2rem;
`;

const ReactivateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #6c63ff, #4ecdc4);
  border: none;
  border-radius: 50px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-left: 1rem;
  font-size: 0.9rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(78, 205, 196, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelledNotice = styled.div`
  padding: 1rem 1.5rem;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const CancelledText = styled.div`
  flex: 1;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
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

const TableContainer = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 2rem;

  @media (max-width: 768px) {
    overflow-x: auto;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: rgba(255, 255, 255, 0.05);
`;

const TableHeaderCell = styled.th`
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.8rem;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled(motion.tr)<{ $clickable?: boolean }>`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    background: ${props => props.$clickable ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem 1.5rem;
  color: var(--text);
  font-size: 0.95rem;
  vertical-align: middle;

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
  }
`;

const ProductImageCell = styled(TableCell)`
  width: 80px;
  padding: 0.75rem 1.5rem;
`;

const ProductImageWrapper = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
`;

const ProductNameCell = styled(TableCell)`
  font-weight: 600;
  color: white;
`;

const ProductCategoryBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ECDC4;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
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
`;

const DownloadCTABanner = styled.div`
  background: linear-gradient(135deg, rgba(108, 99, 255, 0.15), rgba(78, 205, 196, 0.15));
  border: 1px solid rgba(108, 99, 255, 0.3);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(108, 99, 255, 0.5);
    box-shadow: 0 8px 32px rgba(108, 99, 255, 0.2);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }
`;

const CTAContent = styled.div`
  flex: 1;
`;

const CTATitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    font-size: 1.25rem;
    justify-content: center;
  }
`;

const CTADescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const CTAButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #6c63ff, #4ecdc4);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(78, 205, 196, 0.4);
    text-decoration: none;
    color: white;
  }

  @media (max-width: 768px) {
    width: 100%;
  justify-content: center;
    padding: 0.875rem 1.5rem;
  }
`;

const CTALogo = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    font-size: 2rem;
    color: #4ecdc4;
  }

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;

    svg {
      font-size: 1.75rem;
    }
  }
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
  const [subscriptionStatus, setSubscriptionStatus] = useState<"active" | "cancelled" | "none">("none");
  const [cancelledSubscriptionId, setCancelledSubscriptionId] = useState<string | null>(null);
  const [cancelledSubscriptionType, setCancelledSubscriptionType] = useState<"monthly" | "annual" | null>(null);
  const [isScheduledToCancel, setIsScheduledToCancel] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

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
      
      // Fetch products from API (includes purchased products and subscription products)
      const response = await fetch("/api/my-products");
      const data = await response.json();

      if (data.success && data.products) {
        setProducts(data.products);
        setHasAccess(data.products.length > 0);
        setSubscriptionStatus(data.subscriptionStatus || "none");
        setCancelledSubscriptionId(data.cancelledSubscriptionId || null);
        setCancelledSubscriptionType(data.cancelledSubscriptionType || null);
        setIsScheduledToCancel(data.isScheduledToCancel || false);
      } else {
        setProducts([]);
        setHasAccess(false);
        setSubscriptionStatus("none");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setHasAccess(false);
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

  const handleReactivate = async () => {
    if (!cancelledSubscriptionId) return;

    setIsReactivating(true);
    try {
      const response = await fetch("/api/subscriptions/reactivate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: cancelledSubscriptionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the page to show updated subscription status
        window.location.reload();
      } else {
        alert(data.error || "Failed to reactivate subscription");
      }
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      alert("An error occurred while reactivating your subscription");
    } finally {
      setIsReactivating(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <LoadingComponent text="Loading your products..." />
        </div>
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
          <DownloadCTABanner>
            <CTALogo>
              <FaRocket />
            </CTALogo>
            <CTAContent>
              <CTATitle>
                <FaDownload />
                NNAudio Access
              </CTATitle>
              <CTADescription>
                Download and install all NNAudio products (Plugins, Sample Libraries, MIDI Packs, Construction Kits, etc.) with one click
              </CTADescription>
            </CTAContent>
            <CTAButton href="/downloads">
              <FaDownload />
              Download Now
            </CTAButton>
          </DownloadCTABanner>
        )}
        
        {hasAccess && subscriptionStatus === "active" && (
          <SubscriptionBadge $type={user?.profile?.subscription || "none"}>
            <FaCheckCircle />
            {getSubscriptionDisplayName()}
          </SubscriptionBadge>
        )}
        
        {subscriptionStatus === "cancelled" && (
          <>
            <CancelledNotice>
              <FaExclamationTriangle style={{ color: "#ff9800", fontSize: "1.2rem" }} />
              <CancelledText>
                Your {cancelledSubscriptionType === "monthly" ? "Monthly" : "Annual"} subscription has been cancelled.
                {isScheduledToCancel 
                  ? " You still have access until the end of your billing period."
                  : " Reactivate to regain access to all products."}
              </CancelledText>
              <ReactivateButton onClick={handleReactivate} disabled={isReactivating}>
                <FaUndo />
                {isReactivating ? "Reactivating..." : "Reactivate Subscription"}
              </ReactivateButton>
            </CancelledNotice>
          </>
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
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell style={{ width: "80px" }}></TableHeaderCell>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell style={{ width: "150px", textAlign: "center" }}>Status</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody>
            {products.map((product, index) => (
                  <TableRow
                key={product.id}
                    $clickable={true}
                    initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                onClick={() => router.push(`/product/${product.slug}`)}
              >
                    <ProductImageCell>
                      <ProductImageWrapper>
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
                            <FaBox size={24} />
                    </div>
                  )}
                      </ProductImageWrapper>
                    </ProductImageCell>
                    <ProductNameCell>{product.name}</ProductNameCell>
                    <TableCell>
                      <ProductCategoryBadge>{formatCategory(product.category)}</ProductCategoryBadge>
                    </TableCell>
                    <TableCell style={{ color: "rgba(255, 255, 255, 0.7)", maxWidth: "400px" }}>
                      {product.short_description || product.tagline ? (
                        <div style={{ 
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {cleanHtmlText(product.short_description || product.tagline || "")}
                  </div>
                      ) : (
                        <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>—</span>
                  )}
                    </TableCell>
                    <TableCell style={{ textAlign: "center" }}>
                    <AccessBadge>
                      <FaCheckCircle />
                        Access
                    </AccessBadge>
                    </TableCell>
                  </TableRow>
            ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Container>
  );
}

