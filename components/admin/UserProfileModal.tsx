/**
 * @fileoverview Admin user profile modal: identity, subscriptions, tickets,
 * invoices, orders with purchased products, and catalog products the user owns.
 * @module components/admin/UserProfileModal
 */
"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FaUser,
  FaTimes,
  FaCrown,
  FaChartLine,
  FaTicketAlt,
  FaUserShield,
  FaBan,
  FaUndo,
  FaSyncAlt,
  FaShoppingBag,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import styled from "styled-components";
import type { UserData } from "@/utils/stripe/admin-analytics";
import {
  getCustomerInvoicesAdmin,
  getUserSupportTicketsAdmin,
} from "@/app/actions/user-management";
import { getCustomerSubscriptions } from "@/utils/stripe/actions";
import { updateUserProStatus } from "@/utils/subscriptions/check-subscription";
import { NnaudioAccessInstallerBadges } from "@/components/admin/NnaudioAccessInstallerBadges";
import AdminProductListDialog, {
  AdminCountLinkButton,
  listedProductsFromOrder,
  productCountLabel,
  type AdminListedProduct,
} from "@/components/admin/AdminProductListDialog";

/** @brief Row from GET /api/admin/user-orders */
type AdminUserOrderRow = {
  id: string;
  type: "stripe" | "grant";
  amountCents: number;
  created: string | null;
  productName?: string | null;
  productNames?: string[];
  products?: AdminListedProduct[];
};

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10500;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 1000px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: var(--text);
  }
`;

const ModalSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const InfoItem = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const InfoLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`;

const InfoValue = styled.div`
  font-size: 1rem;
  color: var(--text);
  font-weight: 500;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const DataTableHeader = styled.thead`
  background-color: rgba(255, 255, 255, 0.02);
`;

const DataTableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-size: 0.9rem;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const DataTableBody = styled.tbody``;

const DataTableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }
`;

const DataTableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: var(--text);
`;

const StripeLink = styled.a`
  color: var(--primary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--accent);
    text-decoration: underline;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
  background-color: ${({ $status }) => {
    switch ($status) {
      case "active":
      case "succeeded":
      case "paid":
        return "rgba(46, 204, 113, 0.2)";
      case "canceled":
      case "failed":
        return "rgba(231, 76, 60, 0.2)";
      case "pending":
      case "processing":
        return "rgba(241, 196, 15, 0.2)";
      default:
        return "rgba(149, 165, 166, 0.2)";
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case "active":
      case "succeeded":
      case "paid":
        return "#2ecc71";
      case "canceled":
      case "failed":
        return "#e74c3c";
      case "pending":
      case "processing":
        return "#f1c40f";
      default:
        return "#95a5a6";
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
`;

const ClickableOrderRow = styled(DataTableRow)`
  cursor: pointer;
`;

const SubscriptionBadge = styled.span<{
  $color: string;
  $variant?: "default" | "premium";
}>`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

  background-color: ${(props) => props.$color};
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);

  ${(props) =>
    props.$variant === "premium" &&
    `
    background: linear-gradient(135deg, ${props.$color}, ${props.$color}dd);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  `}

  svg {
    font-size: 0.7rem;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
  }
`;

const PlanSelect = styled.select<{ $disabled?: boolean }>`
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;

  &:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
    padding: 8px;
  }
`;

const RefundButton = styled.button<{ variant?: "primary" | "danger" }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  background-color: ${(props) =>
    props.variant === "danger"
      ? "rgba(231, 76, 60, 0.2)"
      : "rgba(108, 99, 255, 0.2)"};
  color: ${(props) =>
    props.variant === "danger" ? "#e74c3c" : "var(--primary)"};

  &:hover:not(:disabled) {
    background-color: ${(props) =>
      props.variant === "danger"
        ? "rgba(231, 76, 60, 0.3)"
        : "rgba(108, 99, 255, 0.3)"};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const RefreshButton = styled.button`
  background: rgba(108, 99, 255, 0.2) !important;
  border: 2px solid rgba(108, 99, 255, 0.6) !important;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  color: #6c63ff !important;
  transition: all 0.2s ease;
  font-size: 14px;
  min-width: 36px;
  height: 36px;
  flex-shrink: 0;
  margin-left: 8px;
  visibility: visible !important;
  opacity: 1 !important;

  &:hover:not(:disabled) {
    background: rgba(108, 99, 255, 0.35) !important;
    border-color: rgba(108, 99, 255, 0.8) !important;
    transform: rotate(180deg);
  }

  &:active:not(:disabled) {
    transform: rotate(180deg) scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
    color: #6c63ff !important;
    display: block !important;
  }
`;

interface UserProfileModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelSubscription?: (
    subscriptionId: string,
    customerId: string
  ) => Promise<void>;
  onReactivateSubscription?: (
    subscriptionId: string,
    customerId: string
  ) => Promise<void>;
  onChangePlan?: (
    subscriptionId: string,
    newPlan: "monthly" | "annual",
    customerId: string
  ) => Promise<void>;
  onRefundPurchase?: (
    purchaseId: string,
    amount: number,
    description: string
  ) => Promise<void>;
  onRefundInvoice?: (
    invoiceId: string,
    amount: number,
    description: string
  ) => Promise<void>;
  onRefreshUser?: () => Promise<void> | void;
  subscriptionLoading?: string | null;
  refundLoading?: string | null;
  refundSuccess?: string | null;
  getSubscriptionBadgeColor?: (subscription: string) => string;
  getSubscriptionIcon?: (subscription: string) => React.ReactNode;
  isSubscriptionPremium?: (subscription: string) => boolean;
  formatDate?: (dateString: string) => string;
  formatDateTime?: (dateString: string) => string;
  formatCurrency?: (amount: number) => string;
  formatCurrencyFromDollars?: (amount: number) => string;
  getDisplayName?: (user: UserData) => string;
}

export default function UserProfileModal({
  user,
  isOpen,
  onClose,
  onCancelSubscription,
  onReactivateSubscription,
  onChangePlan,
  onRefundPurchase,
  onRefundInvoice,
  onRefreshUser,
  subscriptionLoading,
  refundLoading,
  refundSuccess,
  getSubscriptionBadgeColor = (sub) => {
    switch (sub) {
      case "monthly":
        return "#4c46d6";
      case "annual":
        return "#2d8a7a";
      case "lifetime":
        return "#d4a017";
      case "admin":
        return "#d63447";
      case "nfr":
        return "#9b59b6";
      default:
        return "#6c757d";
    }
  },
  getSubscriptionIcon = (sub) => {
    switch (sub) {
      case "admin":
        return <FaUserShield />;
      case "lifetime":
        return <FaCrown />;
      case "nfr":
        return <FaCrown />;
      default:
        return null;
    }
  },
  isSubscriptionPremium = (sub) => ["lifetime", "admin"].includes(sub),
  formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(),
  formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  },
  formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  },
  formatCurrencyFromDollars = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  },
  getDisplayName = (user: UserData) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "Unknown User";
  },
}: UserProfileModalProps) {
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [subscriptionRefreshMessage, setSubscriptionRefreshMessage] = useState<
    string | null
  >(null);
  const [userInvoices, setUserInvoices] = useState<
    Array<{
      id: string;
      number: string | null;
      amount: number;
      status: string;
      createdAt: string;
      paidAt: string | null;
    }>
  >([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [supportTickets, setSupportTickets] = useState<
    Array<{
      id: string;
      ticket_number: string;
      subject: string;
      status: string;
      created_at: string;
    }>
  >([]);
  const [loadingSupportTickets, setLoadingSupportTickets] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(
    null
  );
  const [ownedProducts, setOwnedProducts] = useState<AdminListedProduct[]>([]);
  const [loadingOwnedProducts, setLoadingOwnedProducts] = useState(false);
  const [showOwnedProductsDialog, setShowOwnedProductsDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminUserOrderRow | null>(
    null
  );
  const [userOrders, setUserOrders] = useState<AdminUserOrderRow[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);

  /**
   * @brief Loads catalog products the user currently has access to (grants + purchases).
   * @param userId Supabase auth user id.
   * @returns Promise<void>
   */
  const fetchOwnedProducts = useCallback(async (userId: string) => {
    if (!userId.trim()) {
      setOwnedProducts([]);
      return;
    }
    try {
      setLoadingOwnedProducts(true);
      const res = await fetch(
        `/api/admin/user-products?user_id=${encodeURIComponent(userId)}`
      );
      const data = (await res.json()) as {
        products?: AdminListedProduct[];
        error?: string;
      };
      if (!res.ok) {
        console.error(
          "Error fetching owned products:",
          data.error ?? res.statusText
        );
        setOwnedProducts([]);
        return;
      }
      setOwnedProducts(Array.isArray(data.products) ? data.products : []);
    } catch (error) {
      console.error("Error fetching owned products:", error);
      setOwnedProducts([]);
    } finally {
      setLoadingOwnedProducts(false);
    }
  }, []);

  const fetchUserSubscriptions = useCallback(async (customerId: string) => {
    try {
      setLoadingSubscriptions(true);
      const result = await getCustomerSubscriptions(customerId);

      if (result.success && result.subscriptions) {
        setUserSubscriptions(result.subscriptions);
      } else {
        setUserSubscriptions([]);
        console.error("Error fetching subscriptions:", result.error);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setUserSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  const fetchUserInvoices = useCallback(async (customerId: string) => {
    try {
      setLoadingInvoices(true);
      const result = await getCustomerInvoicesAdmin(customerId);

      if (result.error) {
        console.error("Error fetching invoices:", result.error);
        setUserInvoices([]);
      } else {
        setUserInvoices(result.invoices);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setUserInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  const fetchUserSupportTickets = useCallback(async (userId: string) => {
    try {
      setLoadingSupportTickets(true);
      const result = await getUserSupportTicketsAdmin(userId);

      if (result.error) {
        console.error("Error fetching support tickets:", result.error);
        setSupportTickets([]);
      } else {
        setSupportTickets(result.tickets);
      }
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      setSupportTickets([]);
    } finally {
      setLoadingSupportTickets(false);
    }
  }, []);

  /**
   * @brief Fetches Stripe + grant order rows for the profile modal (admin API).
   */
  const fetchUserOrders = useCallback(async (userId: string) => {
    try {
      setLoadingUserOrders(true);
      setUserOrders([]);
      const res = await fetch(
        `/api/admin/user-orders?user_id=${encodeURIComponent(userId)}`
      );
      const data = (await res.json()) as {
        orders?: AdminUserOrderRow[];
        error?: string;
      };
      if (!res.ok) {
        console.error(
          "Error fetching user orders:",
          data.error ?? res.statusText
        );
        setUserOrders([]);
        return;
      }
      setUserOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      setUserOrders([]);
    } finally {
      setLoadingUserOrders(false);
    }
  }, []);

  const handleRefreshSubscription = useCallback(async () => {
    if (!user?.id) return;

    try {
      setRefreshingSubscription(true);
      setSubscriptionRefreshMessage(null);

      const result = await updateUserProStatus(user.id);

      if (result) {
        setSubscriptionRefreshMessage(
          `Subscription updated: ${result.subscription} (${result.source})`
        );

        // Call onRefreshUser if provided to refresh the user data in parent
        if (onRefreshUser) {
          await onRefreshUser();
        }

        // Clear message after 3 seconds
        setTimeout(() => {
          setSubscriptionRefreshMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error("Error refreshing subscription:", error);
      setSubscriptionRefreshMessage("Failed to refresh subscription");
      setTimeout(() => {
        setSubscriptionRefreshMessage(null);
      }, 3000);
    } finally {
      setRefreshingSubscription(false);
    }
  }, [user?.id, onRefreshUser]);

  useEffect(() => {
    if (isOpen && user) {
      // Reset all data when modal opens with a new user
      setUserSubscriptions([]);
      setUserInvoices([]);
      setSupportTickets([]);
      setOwnedProducts([]);
      setUserOrders([]);
      setShowOwnedProductsDialog(false);
      setSelectedOrder(null);
      setHasPaymentMethod(null);

      if (user.id) {
        fetchOwnedProducts(user.id);
      }
      if (user.customerId) {
        fetchUserSubscriptions(user.customerId);
        fetchUserInvoices(user.customerId);
      }
      fetch(
        `/api/admin/customer-has-payment-method?${new URLSearchParams({
          userId: user.id,
        })}`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setHasPaymentMethod(data.hasPaymentMethod);
          } else {
            setHasPaymentMethod(false);
          }
        })
        .catch((error) => {
          console.error("Error checking payment method:", error);
          setHasPaymentMethod(false);
        });
      fetchUserSupportTickets(user.id);
      fetchUserOrders(user.id);
    } else if (!isOpen) {
      // Clear data when modal closes
      setUserSubscriptions([]);
      setUserInvoices([]);
      setSupportTickets([]);
      setOwnedProducts([]);
      setUserOrders([]);
      setShowOwnedProductsDialog(false);
      setSelectedOrder(null);
      setHasPaymentMethod(null);
    }
  }, [
    isOpen,
    user?.id,
    user?.email,
    user?.customerId,
    fetchUserSubscriptions,
    fetchUserInvoices,
    fetchUserSupportTickets,
    fetchOwnedProducts,
    fetchUserOrders,
  ]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle>
                <FaUser />
                {getDisplayName(user)}
              </ModalTitle>
              <CloseButton onClick={onClose}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>

            {/* User Information */}
            <ModalSection>
              <SectionTitle>
                <FaUser />
                User Information
              </SectionTitle>
              <InfoGrid>
                <InfoItem>
                  <InfoLabel>Email</InfoLabel>
                  <InfoValue>{user.email}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Subscription</InfoLabel>
                  <InfoValue>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        width: "100%",
                      }}
                    >
                      <SubscriptionBadge
                        $color={getSubscriptionBadgeColor(
                          user.hasNfrEliteBundle ? "nfr" : user.subscription
                        )}
                        $variant={
                          user.hasNfrEliteBundle ||
                          isSubscriptionPremium(user.subscription)
                            ? "premium"
                            : "default"
                        }
                      >
                        {user.hasNfrEliteBundle ? (
                          <FaCrown />
                        ) : (
                          getSubscriptionIcon(user.subscription)
                        )}
                        {user.hasNfrEliteBundle ? "NFR" : user.subscription}
                      </SubscriptionBadge>
                      <RefreshButton
                        onClick={handleRefreshSubscription}
                        disabled={refreshingSubscription}
                        title="Refresh subscription status"
                        type="button"
                      >
                        {refreshingSubscription ? (
                          <LoadingSpinner />
                        ) : (
                          <FaSyncAlt style={{ display: "block" }} />
                        )}
                      </RefreshButton>
                      {subscriptionRefreshMessage && (
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--success)",
                            marginLeft: "8px",
                          }}
                        >
                          {subscriptionRefreshMessage}
                        </span>
                      )}
                    </div>
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Products owned</InfoLabel>
                  <InfoValue>
                    {loadingOwnedProducts ? (
                      <LoadingSpinner
                        style={{ display: "inline-block", marginRight: "8px" }}
                      />
                    ) : (
                      <AdminCountLinkButton
                        type="button"
                        disabled={ownedProducts.length === 0}
                        onClick={() => setShowOwnedProductsDialog(true)}
                      >
                        {ownedProducts.length}
                      </AdminCountLinkButton>
                    )}
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Has Payment Method</InfoLabel>
                  <InfoValue>
                    {hasPaymentMethod === null ? (
                      <LoadingSpinner
                        style={{ display: "inline-block", marginRight: "8px" }}
                      />
                    ) : hasPaymentMethod ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Total Spent</InfoLabel>
                  <InfoValue>
                    {user.totalSpent === -1 ? (
                      <LoadingSpinner
                        style={{ display: "inline-block", marginRight: "8px" }}
                      />
                    ) : (
                      formatCurrencyFromDollars(user.totalSpent)
                    )}
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Join Date</InfoLabel>
                  <InfoValue>{formatDate(user.createdAt)}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Last Active</InfoLabel>
                  <InfoValue>
                    {formatDateTime(user.lastActive || user.createdAt)}
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>NNAudio Access</InfoLabel>
                  <InfoValue>
                    <NnaudioAccessInstallerBadges
                      macosAt={user.nnaudioAccessInstallerMacosAt}
                      windowsAt={user.nnaudioAccessInstallerWindowsAt}
                    />
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Customer ID</InfoLabel>
                  <InfoValue>
                    {user.customerId ? (
                      <StripeLink
                        href={`https://dashboard.stripe.com/customers/${user.customerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {user.customerId}
                      </StripeLink>
                    ) : (
                      "N/A"
                    )}
                  </InfoValue>
                </InfoItem>
              </InfoGrid>
            </ModalSection>

            {/* Subscriptions */}
            <ModalSection>
              <SectionTitle>
                <FaCrown />
                Subscriptions
              </SectionTitle>
              {loadingSubscriptions ? (
                <EmptyState>Loading subscriptions...</EmptyState>
              ) : userSubscriptions.length > 0 ? (
                <>
                  <DataTable>
                    <DataTableHeader>
                      <tr>
                        <DataTableHeaderCell>ID</DataTableHeaderCell>
                        <DataTableHeaderCell>Status</DataTableHeaderCell>
                        <DataTableHeaderCell>Plan</DataTableHeaderCell>
                        <DataTableHeaderCell>Amount</DataTableHeaderCell>
                        <DataTableHeaderCell>
                          Current Period
                        </DataTableHeaderCell>
                        <DataTableHeaderCell>Auto Renew</DataTableHeaderCell>
                        {onCancelSubscription ||
                        onReactivateSubscription ||
                        onChangePlan ? (
                          <DataTableHeaderCell>Actions</DataTableHeaderCell>
                        ) : null}
                      </tr>
                    </DataTableHeader>
                    <DataTableBody>
                      {userSubscriptions.map((sub) => {
                        const isActive =
                          sub.status === "active" || sub.status === "trialing";
                        const isCanceled =
                          sub.status === "canceled" || sub.cancel_at_period_end;
                        const price = sub.items?.[0]?.price;
                        const priceId = price?.id || "";
                        const interval = price?.recurring?.interval || "";
                        const isMonthly = interval === "month";
                        const isAnnual = interval === "year";
                        const currentPlan = isMonthly
                          ? "monthly"
                          : isAnnual
                          ? "annual"
                          : "unknown";
                        const amount = price?.unit_amount
                          ? price.unit_amount / 100
                          : 0;
                        const customerId =
                          typeof sub.customer === "string"
                            ? sub.customer
                            : sub.customer?.id || user?.customerId || "";

                        return (
                          <DataTableRow key={sub.id}>
                            <DataTableCell
                              style={{
                                fontSize: "0.8rem",
                                wordBreak: "break-all",
                              }}
                            >
                              <StripeLink
                                href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {sub.id}
                              </StripeLink>
                            </DataTableCell>
                            <DataTableCell>
                              <StatusBadge $status={sub.status}>
                                {sub.status}
                              </StatusBadge>
                            </DataTableCell>
                            <DataTableCell>
                              {onChangePlan ? (
                                <PlanSelect
                                  value={currentPlan}
                                  onChange={(e) => {
                                    const newPlan = e.target.value as
                                      | "monthly"
                                      | "annual";
                                    if (
                                      newPlan !== currentPlan &&
                                      isActive &&
                                      onChangePlan
                                    ) {
                                      onChangePlan(sub.id, newPlan, customerId);
                                    }
                                  }}
                                  disabled={
                                    !isActive || subscriptionLoading === sub.id
                                  }
                                  $disabled={
                                    !isActive || subscriptionLoading === sub.id
                                  }
                                >
                                  <option value="monthly">Monthly</option>
                                  <option value="annual">Annual</option>
                                </PlanSelect>
                              ) : (
                                currentPlan
                              )}
                            </DataTableCell>
                            <DataTableCell>
                              {formatCurrency(amount * 100)}
                            </DataTableCell>
                            <DataTableCell>
                              {sub.current_period_start &&
                              sub.current_period_end
                                ? `${new Date(
                                    sub.current_period_start * 1000
                                  ).toLocaleDateString()} - ${new Date(
                                    sub.current_period_end * 1000
                                  ).toLocaleDateString()}`
                                : "N/A"}
                            </DataTableCell>
                            <DataTableCell>
                              {isCanceled ? "No" : "Yes"}
                            </DataTableCell>
                            {(onCancelSubscription ||
                              onReactivateSubscription) && (
                              <DataTableCell>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {isActive &&
                                    !isCanceled &&
                                    onCancelSubscription && (
                                      <RefundButton
                                        variant="danger"
                                        disabled={
                                          subscriptionLoading === sub.id
                                        }
                                        onClick={() =>
                                          onCancelSubscription(
                                            sub.id,
                                            customerId
                                          )
                                        }
                                      >
                                        {subscriptionLoading === sub.id ? (
                                          <LoadingSpinner />
                                        ) : (
                                          <FaBan />
                                        )}
                                        Cancel
                                      </RefundButton>
                                    )}
                                  {isCanceled && onReactivateSubscription && (
                                    <RefundButton
                                      variant="primary"
                                      disabled={subscriptionLoading === sub.id}
                                      onClick={() =>
                                        onReactivateSubscription(
                                          sub.id,
                                          customerId
                                        )
                                      }
                                    >
                                      {subscriptionLoading === sub.id ? (
                                        <LoadingSpinner />
                                      ) : (
                                        <FaUndo />
                                      )}
                                      Reactivate
                                    </RefundButton>
                                  )}
                                </div>
                              </DataTableCell>
                            )}
                          </DataTableRow>
                        );
                      })}
                    </DataTableBody>
                  </DataTable>
                </>
              ) : (
                <EmptyState>No subscriptions found</EmptyState>
              )}
            </ModalSection>

            {/* Support Tickets */}
            <ModalSection>
              <SectionTitle>
                <FaTicketAlt />
                Support Tickets
              </SectionTitle>
              {loadingSupportTickets ? (
                <EmptyState>Loading support tickets...</EmptyState>
              ) : supportTickets.length > 0 ? (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <Link
                      href="/admin/support-tickets"
                      style={{
                        color: "var(--primary)",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      <FaTicketAlt />
                      View all tickets
                    </Link>
                  </div>
                  <DataTable>
                    <DataTableHeader>
                      <tr>
                        <DataTableHeaderCell>Ticket #</DataTableHeaderCell>
                        <DataTableHeaderCell>Subject</DataTableHeaderCell>
                        <DataTableHeaderCell>Status</DataTableHeaderCell>
                        <DataTableHeaderCell>Created</DataTableHeaderCell>
                      </tr>
                    </DataTableHeader>
                    <DataTableBody>
                      {supportTickets.map((ticket) => (
                        <DataTableRow key={ticket.id}>
                          <DataTableCell>
                            <Link
                              href={`/admin/support-tickets?ticket=${ticket.id}`}
                              style={{
                                color: "var(--primary)",
                                textDecoration: "none",
                              }}
                            >
                              {ticket.ticket_number}
                            </Link>
                          </DataTableCell>
                          <DataTableCell>{ticket.subject}</DataTableCell>
                          <DataTableCell>
                            <span
                              style={{
                                textTransform: "capitalize",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                backgroundColor:
                                  ticket.status === "open"
                                    ? "rgba(52, 152, 219, 0.2)"
                                    : ticket.status === "in_progress"
                                    ? "rgba(241, 196, 15, 0.2)"
                                    : ticket.status === "resolved"
                                    ? "rgba(46, 204, 113, 0.2)"
                                    : "rgba(149, 165, 166, 0.2)",
                                color: "var(--text)",
                              }}
                            >
                              {ticket.status.replace("_", " ")}
                            </span>
                          </DataTableCell>
                          <DataTableCell>
                            {formatDate(ticket.created_at)}
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                </>
              ) : (
                <EmptyState>No support tickets found</EmptyState>
              )}
            </ModalSection>

            {/* Invoices */}
            <ModalSection>
              <SectionTitle>
                <FaChartLine />
                Invoices
              </SectionTitle>
              {loadingInvoices ? (
                <EmptyState>Loading invoices...</EmptyState>
              ) : userInvoices.length > 0 ? (
                <DataTable>
                  <DataTableHeader>
                    <tr>
                      <DataTableHeaderCell>ID</DataTableHeaderCell>
                      <DataTableHeaderCell>Number</DataTableHeaderCell>
                      <DataTableHeaderCell>Amount</DataTableHeaderCell>
                      <DataTableHeaderCell>Status</DataTableHeaderCell>
                      <DataTableHeaderCell>Created</DataTableHeaderCell>
                      <DataTableHeaderCell>Paid</DataTableHeaderCell>
                      {onRefundInvoice ? (
                        <DataTableHeaderCell>Actions</DataTableHeaderCell>
                      ) : null}
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {userInvoices.map((invoice) => (
                      <DataTableRow key={invoice.id}>
                        <DataTableCell>
                          <StripeLink
                            href={`https://dashboard.stripe.com/invoices/${invoice.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {invoice.id}
                          </StripeLink>
                        </DataTableCell>
                        <DataTableCell>{invoice.number || "N/A"}</DataTableCell>
                        <DataTableCell>
                          {formatCurrency(invoice.amount * 100)}
                        </DataTableCell>
                        <DataTableCell>
                          <StatusBadge $status={invoice.status}>
                            {invoice.status}
                          </StatusBadge>
                        </DataTableCell>
                        <DataTableCell>
                          {formatDate(invoice.createdAt)}
                        </DataTableCell>
                        <DataTableCell>
                          {invoice.paidAt ? formatDate(invoice.paidAt) : "N/A"}
                        </DataTableCell>
                        {onRefundInvoice && (
                          <DataTableCell>
                            {invoice.status === "paid" && (
                              <RefundButton
                                variant="danger"
                                disabled={refundLoading === invoice.id}
                                onClick={() =>
                                  onRefundInvoice(
                                    invoice.id,
                                    invoice.amount,
                                    `Invoice ${invoice.number || invoice.id}`
                                  )
                                }
                              >
                                {refundLoading === invoice.id ? (
                                  <LoadingSpinner />
                                ) : (
                                  <FaUndo />
                                )}
                                {refundSuccess === invoice.id
                                  ? "Refunded"
                                  : "Refund"}
                              </RefundButton>
                            )}
                          </DataTableCell>
                        )}
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              ) : (
                <EmptyState>No invoices found</EmptyState>
              )}
            </ModalSection>

            {/* Orders: Stripe payments + product grants (incl. free checkout) */}
            <ModalSection>
              <SectionTitle>
                <FaShoppingBag />
                Orders
              </SectionTitle>
              {loadingUserOrders ? (
                <EmptyState>Loading orders...</EmptyState>
              ) : userOrders.length > 0 ? (
                <DataTable>
                  <DataTableHeader>
                    <tr>
                      <DataTableHeaderCell>Date</DataTableHeaderCell>
                      <DataTableHeaderCell>Type</DataTableHeaderCell>
                      <DataTableHeaderCell>Products</DataTableHeaderCell>
                      <DataTableHeaderCell>Amount</DataTableHeaderCell>
                      {onRefundPurchase ? (
                        <DataTableHeaderCell>Actions</DataTableHeaderCell>
                      ) : null}
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {userOrders.map((row) => {
                      const orderProducts = listedProductsFromOrder(row);
                      return (
                        <ClickableOrderRow
                          key={`${row.type}-${row.id}`}
                          onClick={() => {
                            if (orderProducts.length > 0) {
                              setSelectedOrder(row);
                            }
                          }}
                        >
                          <DataTableCell>
                            {row.created ? formatDate(row.created) : "—"}
                          </DataTableCell>
                          <DataTableCell>
                            <StatusBadge
                              $status={
                                row.type === "stripe" ? "succeeded" : "active"
                              }
                            >
                              {row.type === "stripe" ? "Payment" : "Grant"}
                            </StatusBadge>
                          </DataTableCell>
                          <DataTableCell>
                            {orderProducts.length > 0 ? (
                              <AdminCountLinkButton
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(row);
                                }}
                              >
                                {productCountLabel(orderProducts.length)}
                              </AdminCountLinkButton>
                            ) : (
                              "—"
                            )}
                          </DataTableCell>
                          <DataTableCell>
                            {formatCurrency(row.amountCents)}
                          </DataTableCell>
                          {onRefundPurchase && (
                            <DataTableCell>
                              {row.type === "stripe" && (
                                <RefundButton
                                  variant="danger"
                                  disabled={refundLoading === row.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRefundPurchase(
                                      row.id,
                                      row.amountCents / 100,
                                      orderProducts
                                        .map((product) => product.name)
                                        .join(", ") || row.id
                                    );
                                  }}
                                >
                                  {refundLoading === row.id ? (
                                    <LoadingSpinner />
                                  ) : (
                                    <FaUndo />
                                  )}
                                  {refundSuccess === row.id
                                    ? "Refunded"
                                    : "Refund"}
                                </RefundButton>
                              )}
                            </DataTableCell>
                          )}
                        </ClickableOrderRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              ) : (
                <EmptyState>No orders found</EmptyState>
              )}
            </ModalSection>

          </ModalContent>
        </ModalOverlay>
      )}
      <AdminProductListDialog
        title="Products they own"
        products={ownedProducts}
        isOpen={isOpen && showOwnedProductsDialog}
        onClose={() => setShowOwnedProductsDialog(false)}
      />
      <AdminProductListDialog
        title="Order products"
        products={selectedOrder ? listedProductsFromOrder(selectedOrder) : []}
        isOpen={isOpen && selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        stripePaymentId={
          selectedOrder?.type === "stripe" ? selectedOrder.id : null
        }
      />
    </AnimatePresence>
  );
}
