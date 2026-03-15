"use client";

/**
 * @fileoverview Private dashboard page for owned products and customer review submission.
 * @module app/(private)/(dashboard)/my-products/page
 */

import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  FaBox,
  FaLock,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaUndo,
  FaExclamationTriangle,
  FaDownload,
  FaRocket,
  FaSearch,
  FaStar,
  FaRegStar,
  FaPen,
  FaClock,
  FaGift,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { cleanHtmlText } from "@/utils/stringUtils";
import LoadingComponent from "@/components/common/LoadingComponent";
import type { Product as OwnedProduct } from "@/app/actions/my-products";

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

const SearchContainer = styled.div`
  position: relative;
  max-width: 500px;
  flex: 1;
  min-width: 250px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  color: var(--text);
  font-size: 0.95rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 4px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 0.9rem;
  pointer-events: none;
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
  background: linear-gradient(135deg, #6c63ff, #8b5cf6);
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
    box-shadow: 0 8px 24px rgba(108, 99, 255, 0.4);
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

const ReviewActionCell = styled(TableCell)`
  min-width: 240px;
`;

const ReviewActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  background: linear-gradient(135deg, rgba(108, 99, 255, 0.2), rgba(78, 205, 196, 0.2));
  border: 1px solid rgba(108, 99, 255, 0.35);
  border-radius: 999px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(78, 205, 196, 0.6);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ReviewMeta = styled.div`
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

const ReviewStatusBadge = styled.span<{ $status: "not_submitted" | "pending" | "approved" | "rejected" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  width: fit-content;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${(props) => {
    if (props.$status === "approved") return "rgba(16, 185, 129, 0.18)";
    if (props.$status === "rejected") return "rgba(239, 68, 68, 0.18)";
    if (props.$status === "pending") return "rgba(245, 158, 11, 0.18)";
    return "rgba(255, 255, 255, 0.08)";
  }};
  color: ${(props) => {
    if (props.$status === "approved") return "#34d399";
    if (props.$status === "rejected") return "#f87171";
    if (props.$status === "pending") return "#fbbf24";
    return "rgba(255, 255, 255, 0.7)";
  }};
`;

const ReviewMetaText = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  line-height: 1.5;
`;

const RewardBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: fit-content;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: rgba(78, 205, 196, 0.14);
  color: #7cf4d2;
  font-size: 0.78rem;
  font-weight: 700;
`;

const MessageBanner = styled.div<{ $type: "success" | "error" }>`
  margin-top: 1.25rem;
  padding: 0.95rem 1.1rem;
  border-radius: 12px;
  border: 1px solid
    ${(props) =>
      props.$type === "success"
        ? "rgba(52, 211, 153, 0.35)"
        : "rgba(248, 113, 113, 0.35)"};
  background: ${(props) =>
    props.$type === "success"
      ? "rgba(52, 211, 153, 0.12)"
      : "rgba(248, 113, 113, 0.12)"};
  color: ${(props) => (props.$type === "success" ? "#9ff3cf" : "#fca5a5")};
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1200;
`;

const ModalContent = styled(motion.div)`
  width: 100%;
  max-width: 640px;
  background: linear-gradient(180deg, rgba(24, 24, 34, 0.98), rgba(17, 18, 26, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.45);
`;

const ModalHeader = styled.div`
  padding: 1.4rem 1.5rem 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const ModalTitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.5rem;
`;

const ModalSubtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.5;
`;

const ModalCloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.72);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;

  &:hover {
    color: white;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 0.55rem;
  color: white;
  font-weight: 600;
`;

const StarRow = styled.div`
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
`;

const StarButton = styled.button<{ $active: boolean }>`
  background: transparent;
  border: none;
  color: ${(props) => (props.$active ? "#fbbf24" : "rgba(255, 255, 255, 0.28)")};
  font-size: 1.7rem;
  cursor: pointer;
  transition: transform 0.15s ease, color 0.15s ease;

  &:hover {
    transform: scale(1.06);
    color: #fbbf24;
  }
`;

const ReviewTextarea = styled.textarea`
  width: 100%;
  min-height: 180px;
  resize: vertical;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  color: white;
  font-size: 0.95rem;
  line-height: 1.6;

  &:focus {
    outline: none;
    border-color: rgba(108, 99, 255, 0.7);
    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.12);
  }
`;

const HelperText = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.82rem;
  line-height: 1.5;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem 1.4rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const SecondaryButton = styled.button`
  padding: 0.8rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: white;
  font-weight: 600;
  cursor: pointer;
`;

const PrimaryButton = styled.button`
  padding: 0.8rem 1.15rem;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #6c63ff, #4ecdc4);
  color: white;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export default function MyProductsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<OwnedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"active" | "cancelled" | "none">("none");
  const [cancelledSubscriptionId, setCancelledSubscriptionId] = useState<string | null>(null);
  const [cancelledSubscriptionType, setCancelledSubscriptionType] = useState<"monthly" | "annual" | null>(null);
  const [isScheduledToCancel, setIsScheduledToCancel] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewDialogProduct, setReviewDialogProduct] = useState<OwnedProduct | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
      
      // Fetch products using server action
      const { getMyProducts } = await import("@/app/actions/my-products");
      const result = await getMyProducts();

      if (result.success) {
        setProducts(result.products as OwnedProduct[]);
        setHasAccess(result.products.length > 0);
        setSubscriptionStatus("none"); // Server action doesn't return subscription status yet
        setCancelledSubscriptionId(null);
        setCancelledSubscriptionType(null);
        setIsScheduledToCancel(false);
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

  const formatCategory = (category: string, productName?: string) => {
    // Special case for Cymasphere
    if (productName?.toLowerCase() === 'cymasphere' && category === 'application') {
      return 'MIDI Application / Plugin';
    }
    const categoryMap: Record<string, string> = {
      'audio-fx-plugin': 'Audio FX Plugin',
      'instrument-plugin': 'Instrument Plugin',
      'application': 'Application',
      'plugin': 'Plugin', // Legacy support
      'pack': 'Pack',
      'bundle': 'Bundle',
      'preset': 'Preset',
    };
    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  /**
   * @brief Opens the per-product review dialog with any existing review populated.
   * @param product Owned product selected for review.
   * @returns Void.
   * @example
   * openReviewDialog(product);
   */
  const openReviewDialog = (product: OwnedProduct) => {
    setReviewDialogProduct(product);
    setReviewRating(product.review_rating ?? 0);
    setReviewText(product.review_text ?? "");
    setReviewMessage(null);
  };

  /**
   * @brief Resets and closes the review dialog.
   * @returns Void.
   * @example
   * closeReviewDialog();
   */
  const closeReviewDialog = () => {
    if (isSubmittingReview) {
      return;
    }

    setReviewDialogProduct(null);
    setReviewRating(0);
    setReviewText("");
  };

  /**
   * @brief Converts internal moderation status into customer-facing copy.
   * @param status Review moderation status.
   * @returns Human-readable label text.
   * @example
   * getReviewStatusLabel("pending");
   */
  const getReviewStatusLabel = (status: OwnedProduct["review_status"]) => {
    if (status === "approved") return "Live";
    if (status === "rejected") return "Needs Update";
    if (status === "pending") return "Submitted";
    return "No Review Yet";
  };

  /**
   * @brief Submits the current review dialog payload.
   * @returns Promise that resolves after the review action finishes.
   * @example
   * await handleSubmitReview();
   */
  const handleSubmitReview = async () => {
    if (!reviewDialogProduct) {
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewMessage({ type: "error", text: "Choose a rating from 1 to 5 stars." });
      return;
    }

    if (reviewText.trim().length < 10) {
      setReviewMessage({
        type: "error",
        text: "Write at least a short sentence so the review is useful to other producers.",
      });
      return;
    }

    try {
      setIsSubmittingReview(true);
      const { submitProductReview } = await import("@/app/actions/product-reviews");
      const result = await submitProductReview({
        productId: reviewDialogProduct.id,
        rating: reviewRating,
        reviewText,
      });

      if (!result.success) {
        setReviewMessage({
          type: "error",
          text: result.error || "Failed to submit your review.",
        });
        return;
      }

      setReviewMessage({
        type: "success",
        text: result.message || "Review submitted successfully.",
      });
      await fetchMyProducts();
      setReviewDialogProduct(null);
      setReviewRating(0);
      setReviewText("");
    } catch (error) {
      console.error("Error submitting review:", error);
      setReviewMessage({
        type: "error",
        text: "An unexpected error occurred while submitting your review.",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }

    const query = searchQuery.toLowerCase().trim();
    return products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const slugMatch = product.slug.toLowerCase().includes(query);
      const categoryMatch = formatCategory(product.category, product.name).toLowerCase().includes(query);
      const descriptionMatch = product.short_description?.toLowerCase().includes(query);
      
      return nameMatch || slugMatch || categoryMatch || descriptionMatch;
    });
  }, [products, searchQuery]);

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
          View and manage all products you have access to, including writing reviews for the products you own.
        </Subtitle>
        {reviewMessage && (
          <MessageBanner $type={reviewMessage.type}>{reviewMessage.text}</MessageBanner>
        )}
        
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
          <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <SearchContainer>
              <SearchIcon />
              <SearchInput
                type="text"
                placeholder="Search products by name, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchContainer>
            <div style={{ color: "rgba(255, 255, 255, 0.7)" }}>
              You have access to <strong style={{ color: "#4ECDC4" }}>{products.length}</strong> products
              {searchQuery && (
                <span style={{ marginLeft: "0.5rem" }}>
                  ({filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'})
                </span>
              )}
            </div>
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
                  <TableHeaderCell>Review</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "rgba(255, 255, 255, 0.5)" }}>
                  No products found matching "{searchQuery}"
                </td>
              </tr>
            ) : (
              filteredProducts.map((product, index) => (
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
                  {product.featured_image_url || product.logo_url ? (
                    <Image
                      src={product.featured_image_url || product.logo_url || ""}
                      alt={product.name}
                      width={60}
                      height={60}
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
                      <ProductCategoryBadge>{formatCategory(product.category, product.name)}</ProductCategoryBadge>
                    </TableCell>
                    <TableCell style={{ color: "rgba(255, 255, 255, 0.7)", maxWidth: "400px" }}>
                      {product.short_description || (product as { tagline?: string }).tagline ? (
                        <div style={{ 
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {cleanHtmlText(product.short_description || (product as { tagline?: string }).tagline || "")}
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
                    <ReviewActionCell onClick={(event) => event.stopPropagation()}>
                      {(!product.review_id || product.review_can_edit) && (
                        <ReviewActionButton
                          type="button"
                          onClick={() => openReviewDialog(product)}
                        >
                          <FaPen />
                          {product.review_id ? "Edit Review" : "Write Review"}
                        </ReviewActionButton>
                      )}
                      <ReviewMeta>
                        <ReviewStatusBadge $status={product.review_status}>
                          {product.review_status === "pending" ? <FaClock /> : <FaCheckCircle />}
                          {getReviewStatusLabel(product.review_status)}
                        </ReviewStatusBadge>
                        {product.reward_eligible && !product.reward_claimed_at && (
                          <RewardBadge>
                            <FaGift />
                            Eligible for $10 review reward
                          </RewardBadge>
                        )}
                        {product.reward_claimed_at && (
                          <RewardBadge>
                            <FaGift />
                            Reward sent
                          </RewardBadge>
                        )}
                      </ReviewMeta>
                    </ReviewActionCell>
                  </TableRow>
              ))
            )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <AnimatePresence>
        {reviewDialogProduct && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeReviewDialog}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitleWrap>
                  <ModalTitle>
                    {reviewDialogProduct.review_id ? "Update your review" : "Review this product"}
                  </ModalTitle>
                  <ModalSubtitle>
                    Share your experience — be honest and specific.
                  </ModalSubtitle>
                </ModalTitleWrap>
                <ModalCloseButton type="button" onClick={closeReviewDialog}>
                  <FaTimes />
                </ModalCloseButton>
              </ModalHeader>
              <ModalBody>
                <div>
                  <FieldLabel>Rating</FieldLabel>
                  <StarRow>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <StarButton
                        key={value}
                        type="button"
                        $active={value <= reviewRating}
                        onClick={() => setReviewRating(value)}
                        aria-label={`Set rating to ${value} star${value === 1 ? "" : "s"}`}
                      >
                        {value <= reviewRating ? <FaStar /> : <FaRegStar />}
                      </StarButton>
                    ))}
                  </StarRow>
                </div>
                <div>
                  <FieldLabel htmlFor="product-review-text">Review</FieldLabel>
                  <ReviewTextarea
                    id="product-review-text"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    placeholder="What did you like, what surprised you, and how are you using it in your workflow?"
                  />
                </div>
                {reviewDialogProduct.reward_eligible && !reviewDialogProduct.reward_claimed_at && (
                  <RewardBadge>
                    <FaGift />
                    Submit now to receive your one-time $10 review reward by email.
                  </RewardBadge>
                )}
              </ModalBody>
              <ModalFooter>
                <SecondaryButton type="button" onClick={closeReviewDialog}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? "Submitting..." : "Submit Review"}
                </PrimaryButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
}

