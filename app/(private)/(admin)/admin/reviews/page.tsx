"use client";

/**
 * @fileoverview Admin moderation page for customer-submitted product reviews.
 * @module app/(private)/(admin)/admin/reviews/page
 */

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { FaCheckCircle, FaClock, FaSearch, FaStar, FaTimesCircle } from "react-icons/fa";
import type { AdminProductReviewRecord } from "@/app/actions/product-reviews";

/** Dispatched after approve/reject/delete so the admin layout can refresh the sidebar pending count. */
const REVIEWS_PENDING_UPDATED_EVENT = "admin-reviews-pending-updated";

const PageContainer = styled.div`
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  color: white;
  font-size: 2.4rem;
`;

const Subtitle = styled.p`
  margin: 0 0 2rem 0;
  color: rgba(255, 255, 255, 0.68);
  max-width: 760px;
  line-height: 1.6;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.2rem;
`;

const StatValue = styled.div`
  color: white;
  font-size: 2rem;
  font-weight: 800;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.62);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.78rem;
  margin-top: 0.35rem;
`;

const FilterBar = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 180px;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const SearchWrap = styled.div`
  position: relative;
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.45);
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.9rem 1rem 0.9rem 2.75rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: white;
`;

const FilterSelect = styled.select`
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: white;
`;

const MessageBanner = styled.div<{ $type: "success" | "error" }>`
  margin-bottom: 1.25rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  color: ${(props) => (props.$type === "success" ? "#9ff3cf" : "#fca5a5")};
  border: 1px solid
    ${(props) =>
      props.$type === "success"
        ? "rgba(52, 211, 153, 0.35)"
        : "rgba(248, 113, 113, 0.35)"};
  background: ${(props) =>
    props.$type === "success"
      ? "rgba(52, 211, 153, 0.12)"
      : "rgba(248, 113, 113, 0.12)"};
`;

const TableWrap = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: rgba(255, 255, 255, 0.04);
`;

const HeaderCell = styled.th`
  text-align: left;
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1rem;
`;

const Row = styled.tr`
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const Cell = styled.td`
  padding: 1rem;
  vertical-align: top;
  color: rgba(255, 255, 255, 0.86);
`;

const ProductName = styled.div`
  color: white;
  font-weight: 700;
`;

const ProductMeta = styled.div`
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.82rem;
  margin-top: 0.35rem;
`;

const ReviewText = styled.div`
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.78);
  white-space: pre-wrap;
  max-width: 540px;
`;

const RatingWrap = styled.div`
  display: flex;
  gap: 0.18rem;
  color: #fbbf24;
  margin-bottom: 0.45rem;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  background: ${(props) => {
    if (props.$status === "approved") return "rgba(16, 185, 129, 0.16)";
    if (props.$status === "rejected") return "rgba(239, 68, 68, 0.16)";
    return "rgba(245, 158, 11, 0.16)";
  }};
  color: ${(props) => {
    if (props.$status === "approved") return "#34d399";
    if (props.$status === "rejected") return "#f87171";
    return "#fbbf24";
  }};
`;

const RewardMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.82rem;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
`;

const ActionButton = styled.button<{ $variant: "approve" | "reject" | "delete"; $fullWidth?: boolean }>`
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: white;
  flex: ${(props) => (props.$fullWidth ? "0 0 100%" : "1 1 50%")};
  min-width: 0;
  background: ${(props) =>
    props.$variant === "approve"
      ? "linear-gradient(135deg, #10b981, #34d399)"
      : props.$variant === "reject"
        ? "linear-gradient(135deg, #ef4444, #f87171)"
        : "linear-gradient(135deg, #374151, #4b5563)"};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const EmptyState = styled.div`
  padding: 3rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
`;

const DeleteOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DeleteDialog = styled.div`
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem 1.75rem;
  max-width: 400px;
  width: 90%;
`;

const DeleteDialogTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: white;
  font-size: 1.15rem;
`;

const DeleteDialogText = styled.p`
  margin: 0 0 1.25rem 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  line-height: 1.5;
`;

const DeleteDialogActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const DialogButton = styled.button<{ $primary?: boolean }>`
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  background: ${(p) => (p.$primary ? "linear-gradient(135deg, #ef4444, #f87171)" : "rgba(255,255,255,0.1)")};
  color: white;
  &:hover { opacity: 0.9; }
`;

/**
 * @brief Returns the icon used for a moderation badge.
 * @param status Current moderation status.
 * @returns JSX icon element.
 * @example
 * getStatusIcon("approved");
 */
function getStatusIcon(status: string) {
  if (status === "approved") return <FaCheckCircle />;
  if (status === "rejected") return <FaTimesCircle />;
  return <FaClock />;
}

/**
 * @brief Renders star icons for a numeric review rating.
 * @param rating Review rating from 1 to 5.
 * @returns JSX star row.
 * @example
 * renderStars(5);
 */
function renderStars(rating: number) {
  return (
    <RatingWrap>
      {[1, 2, 3, 4, 5].map((value) => (
        <FaStar key={value} style={{ opacity: value <= rating ? 1 : 0.18 }} />
      ))}
    </RatingWrap>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminProductReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [actionReviewId, setActionReviewId] = useState<string | null>(null);
  const [deleteConfirmReviewId, setDeleteConfirmReviewId] = useState<string | null>(null);

  /**
   * @brief Loads admin review records from the server action.
   * @returns Promise resolved when the current table data is refreshed.
   * @example
   * await loadReviews();
   */
  const loadReviews = async () => {
    try {
      setLoading(true);
      const { getAdminProductReviews } = await import("@/app/actions/product-reviews");
      const result = await getAdminProductReviews();

      if (!result.success) {
        setMessage({ type: "error", text: result.error || "Failed to load reviews." });
        setReviews([]);
        return;
      }

      setReviews(result.reviews);
    } catch (error) {
      console.error("Error loading product reviews:", error);
      setMessage({ type: "error", text: "Failed to load reviews." });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  /**
   * @brief Applies a moderation decision to a review row.
   * @param reviewId Review row ID.
   * @param decision Approve or reject.
   * @returns Promise resolved after moderation completes.
   * @example
   * await handleModeration("review-uuid", "approved");
   */
  const handleModeration = async (
    reviewId: string,
    decision: "approved" | "rejected"
  ) => {
    try {
      setActionReviewId(reviewId);
      const { moderateProductReview } = await import("@/app/actions/product-reviews");
      const result = await moderateProductReview(reviewId, decision);

      if (!result.success) {
        setMessage({ type: "error", text: result.error || "Moderation failed." });
        return;
      }

      setMessage({
        type: "success",
        text:
          decision === "approved"
            ? "Review approved successfully."
            : "Review rejected successfully.",
      });
      await loadReviews();
      window.dispatchEvent(new Event(REVIEWS_PENDING_UPDATED_EVENT));
    } catch (error) {
      console.error("Error moderating review:", error);
      setMessage({ type: "error", text: "Moderation failed." });
    } finally {
      setActionReviewId(null);
    }
  };

  /** Opens the delete confirmation dialog for the given review. */
  const openDeleteConfirm = (reviewId: string) => setDeleteConfirmReviewId(reviewId);

  /**
   * @brief Performs the delete after user confirms in the dialog.
   * @param reviewId Review row ID.
   */
  const confirmDeleteReview = async (reviewId: string) => {
    try {
      setDeleteConfirmReviewId(null);
      setActionReviewId(reviewId);
      const { deleteProductReview } = await import("@/app/actions/product-reviews");
      const result = await deleteProductReview(reviewId);

      if (!result.success) {
        setMessage({ type: "error", text: result.error || "Delete failed." });
        return;
      }

      setMessage({ type: "success", text: "Review deleted." });
      await loadReviews();
      window.dispatchEvent(new Event(REVIEWS_PENDING_UPDATED_EVENT));
    } catch (error) {
      console.error("Error deleting review:", error);
      setMessage({ type: "error", text: "Delete failed." });
    } finally {
      setActionReviewId(null);
    }
  };

  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return reviews.filter((review) => {
      const statusMatch =
        statusFilter === "all" || review.moderation_status === statusFilter;
      const textMatch =
        !query ||
        review.product_name.toLowerCase().includes(query) ||
        review.customer_name?.toLowerCase().includes(query) ||
        review.customer_email?.toLowerCase().includes(query) ||
        review.review_text?.toLowerCase().includes(query);
      return statusMatch && textMatch;
    });
  }, [reviews, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: reviews.length,
      pending: reviews.filter((review) => review.moderation_status === "pending").length,
      approved: reviews.filter((review) => review.moderation_status === "approved").length,
      rejected: reviews.filter((review) => review.moderation_status === "rejected").length,
    };
  }, [reviews]);

  return (
    <PageContainer>
      <Title>Product Reviews</Title>
      <Subtitle>
        Moderate customer-submitted reviews before they join the public review pool.
        Reward status is shown here so you can confirm when a one-time review coupon has been issued.
      </Subtitle>

      {message && <MessageBanner $type={message.type}>{message.text}</MessageBanner>}

      <StatsRow>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total reviews</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.pending}</StatValue>
          <StatLabel>Pending</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.approved}</StatValue>
          <StatLabel>Approved</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.rejected}</StatValue>
          <StatLabel>Rejected</StatLabel>
        </StatCard>
      </StatsRow>

      <FilterBar>
        <SearchWrap>
          <SearchIcon />
          <SearchInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by product, reviewer, email, or review text"
          />
        </SearchWrap>
        <FilterSelect
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </FilterSelect>
      </FilterBar>

      <TableWrap>
        <Table>
          <TableHead>
            <tr>
              <HeaderCell>Product</HeaderCell>
              <HeaderCell>Reviewer</HeaderCell>
              <HeaderCell>Review</HeaderCell>
              <HeaderCell>Status</HeaderCell>
              <HeaderCell>Reward</HeaderCell>
              <HeaderCell>Actions</HeaderCell>
            </tr>
          </TableHead>
          <tbody>
            {!loading && filteredReviews.length === 0 ? (
              <tr>
                <Cell colSpan={6}>
                  <EmptyState>No reviews match the current filters.</EmptyState>
                </Cell>
              </tr>
            ) : null}
            {filteredReviews.map((review) => (
              <Row key={review.id}>
                <Cell>
                  <ProductName>{review.product_name}</ProductName>
                  <ProductMeta>/{review.product_slug}</ProductMeta>
                </Cell>
                <Cell>
                  <div>{review.customer_name || "Anonymous"}</div>
                  <ProductMeta>{review.customer_email || "No email"}</ProductMeta>
                  <ProductMeta>
                    {review.is_verified_purchase ? "Verified purchase" : "Unverified"}
                  </ProductMeta>
                </Cell>
                <Cell>
                  {renderStars(review.rating)}
                  <ReviewText>{review.review_text || "No review text provided."}</ReviewText>
                </Cell>
                <Cell>
                  <StatusBadge $status={review.moderation_status}>
                    {getStatusIcon(review.moderation_status)}
                    {review.moderation_status}
                  </StatusBadge>
                </Cell>
                <Cell>
                  <RewardMeta>
                    <div>
                      {review.reward_claimed_at
                        ? `Claimed ${new Date(review.reward_claimed_at).toLocaleDateString()}`
                        : "Not claimed"}
                    </div>
                    <div>{review.reward_code ? `Code: ${review.reward_code}` : "No code yet"}</div>
                    <div>
                      {review.reward_email_sent_at
                        ? `Reward email sent ${new Date(review.reward_email_sent_at).toLocaleDateString()}`
                        : "Reward email not sent"}
                    </div>
                  </RewardMeta>
                </Cell>
                <Cell>
                  <Actions>
                    <ActionButton
                      type="button"
                      $variant="approve"
                      $fullWidth
                      disabled={actionReviewId === review.id}
                      onClick={() => handleModeration(review.id, "approved")}
                    >
                      Approve
                    </ActionButton>
                    <ActionRow>
                      <ActionButton
                        type="button"
                        $variant="reject"
                        disabled={actionReviewId === review.id}
                        onClick={() => handleModeration(review.id, "rejected")}
                      >
                        Reject
                      </ActionButton>
                      <ActionButton
                        type="button"
                        $variant="delete"
                        disabled={actionReviewId === review.id}
                        onClick={() => openDeleteConfirm(review.id)}
                      >
                        Delete
                      </ActionButton>
                    </ActionRow>
                  </Actions>
                </Cell>
              </Row>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      {deleteConfirmReviewId && (
        <DeleteOverlay onClick={() => setDeleteConfirmReviewId(null)}>
          <DeleteDialog onClick={(e) => e.stopPropagation()}>
            <DeleteDialogTitle>Delete review?</DeleteDialogTitle>
            <DeleteDialogText>
              This review will be permanently removed. This cannot be undone.
            </DeleteDialogText>
            <DeleteDialogActions>
              <DialogButton type="button" onClick={() => setDeleteConfirmReviewId(null)}>
                Cancel
              </DialogButton>
              <DialogButton
                type="button"
                $primary
                onClick={() => confirmDeleteReview(deleteConfirmReviewId)}
              >
                Delete
              </DialogButton>
            </DeleteDialogActions>
          </DeleteDialog>
        </DeleteOverlay>
      )}
    </PageContainer>
  );
}
