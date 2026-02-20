/**
 * @fileoverview Admin orders page - view all orders, product grants, and redemptions
 * @module admin/orders/page
 *
 * Displays Stripe purchases, product grants, and code redemptions with full
 * order details (items, totals, discounts, refunds) - same layout as checkout/my-orders.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import NextSEO from "@/components/NextSEO";
import Link from "next/link";
import {
  FaShoppingBag,
  FaSearch,
  FaBox,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaUndo,
  FaExternalLinkAlt,
  FaGift,
  FaCreditCard,
  FaUser,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAdminGrantOrdersPaginated,
  getAdminStripeOrders,
  type AdminOrder,
} from "@/app/actions/admin-orders";
import { getUserByEmailAdmin } from "@/app/actions/user-management";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const TabRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.25rem;
  background: ${(p) =>
    p.$active ? "rgba(108, 99, 255, 0.2)" : "rgba(255, 255, 255, 0.05)"};
  border: 1px solid
    ${(p) =>
      p.$active ? "rgba(108, 99, 255, 0.5)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 8px;
  color: ${(p) => (p.$active ? "var(--primary)" : "var(--text-secondary)")};
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text);
  }
`;

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 400px;
  min-width: 200px;
  background: var(--input-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0 1rem;

  &:focus-within {
    border-color: var(--primary);
  }

  svg {
    color: var(--text-secondary);
  }

  @media (max-width: 768px) {
    max-width: none;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 12px 0;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 1rem;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const TableWrapper = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: rgba(255, 255, 255, 0.05);
`;

const TableHeaderCell = styled.th<{ $sortable?: boolean }>`
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: ${(p) => (p.$sortable ? "pointer" : "default")};
  user-select: none;
  white-space: nowrap;

  &:hover {
    color: ${(p) => (p.$sortable ? "var(--primary)" : "var(--text)")};
  }

  svg {
    margin-left: 0.35rem;
    opacity: 0.7;
    font-size: 0.7rem;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: ${(p) => (p.$clickable ? "pointer" : "default")};
  transition: background 0.15s ease;

  &:hover {
    background: ${(p) =>
      p.$clickable ? "rgba(255, 255, 255, 0.03)" : "transparent"};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 14px 16px;
  color: var(--text);
  font-size: 0.95rem;
  vertical-align: middle;
`;

const ExpandCell = styled.td`
  padding: 8px 16px;
  width: 40px;
  vertical-align: middle;
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;

  &:hover {
    color: var(--text);
  }
`;

const DetailRow = styled.tr`
  background: rgba(0, 0, 0, 0.2);

  td {
    padding: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    vertical-align: top;
  }
`;

const DetailCell = styled.td`
  padding: 1.25rem 16px !important;
`;

const OrderStatus = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
  background: ${(p) => {
    switch (p.$status) {
      case "succeeded":
        return "rgba(0, 201, 167, 0.2)";
      case "processing":
        return "rgba(255, 193, 7, 0.2)";
      case "refunded":
      case "partially_refunded":
        return "rgba(255, 152, 0, 0.2)";
      case "requires_payment_method":
      case "canceled":
        return "rgba(255, 87, 51, 0.2)";
      default:
        return "rgba(255, 255, 255, 0.1)";
    }
  }};
  color: ${(p) => {
    switch (p.$status) {
      case "succeeded":
        return "var(--success)";
      case "processing":
        return "var(--warning)";
      case "refunded":
      case "partially_refunded":
        return "#ff9800";
      case "requires_payment_method":
      case "canceled":
        return "var(--error)";
      default:
        return "rgba(255, 255, 255, 0.7)";
    }
  }};
  border: 1px solid
    ${(p) => {
      switch (p.$status) {
        case "succeeded":
          return "rgba(0, 201, 167, 0.3)";
        case "processing":
          return "rgba(255, 193, 7, 0.3)";
        case "refunded":
        case "partially_refunded":
          return "rgba(255, 152, 0, 0.3)";
        case "requires_payment_method":
        case "canceled":
          return "rgba(255, 87, 51, 0.3)";
        default:
          return "rgba(255, 255, 255, 0.1)";
      }
    }};
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const DetailSection = styled.div`
  font-size: 0.9rem;
`;

const DetailSectionTitle = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ItemLine = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(108, 99, 255, 0.2);
  border: 1px solid rgba(108, 99, 255, 0.3);
  border-radius: 6px;
  color: var(--primary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;

  &:hover {
    background: rgba(108, 99, 255, 0.3);
    border-color: rgba(108, 99, 255, 0.5);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  svg {
    font-size: 4rem;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 1.5rem;
  }

  h3 {
    font-size: 1.5rem;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }
`;

const CustomerLink = styled.button`
  background: none;
  border: none;
  color: var(--primary);
  font-size: inherit;
  cursor: pointer;
  padding: 0;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: var(--accent);
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
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
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: var(--text);
  }
`;

const ModalInfoGrid = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const ModalInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;

  span:first-child {
    color: var(--text-secondary);
  }
  span:last-child {
    color: var(--text);
    font-weight: 500;
  }
`;

const OrderTypeBadge = styled.span<{ $type: string }>`
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: ${(p) =>
    p.$type === "purchase"
      ? "rgba(78, 205, 196, 0.2)"
      : p.$type === "redemption"
        ? "rgba(255, 193, 7, 0.2)"
        : "rgba(108, 99, 255, 0.2)"};
  color: ${(p) =>
    p.$type === "purchase"
      ? "#4ecdc4"
      : p.$type === "redemption"
        ? "#ffc107"
        : "var(--primary)"};
  margin-left: 0.5rem;
`;

const PaginationBar = styled.div<{ $inline?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: ${(p) => (p.$inline ? 0 : "1.5rem")};
  padding: ${(p) => (p.$inline ? "0" : "1rem 0")};
  border-top: ${(p) =>
    p.$inline ? "none" : "1px solid rgba(255, 255, 255, 0.1)"};
`;

const PaginationInfo = styled.span`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const PaginationButton = styled.button<{ disabled?: boolean }>`
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.disabled ? 0.5 : 1)};

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    border-color: var(--primary);
  }
`;

type FilterTab = "all" | "purchase" | "grant" | "redemption";

type SortField =
  | "orderNumber"
  | "orderType"
  | "date"
  | "customer"
  | "items"
  | "amount"
  | "status";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

/** Cache key for per-tab orders data (filter + page + search). */
function getOrdersCacheKey(
  filter: FilterTab,
  page: number,
  search: string
): string {
  if (filter === "purchase") return "purchase";
  if (filter === "all") return `all:${search}`;
  return `${filter}:${page}:${search}`;
}

/** Format order date for display */
function formatOrderDate(dateString: string): string {
  const d = new Date(dateString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  const hour = d.getHours() % 12 || 12;
  const minute = d.getMinutes();
  const ampm = d.getHours() < 12 ? "am" : "pm";
  return `${month}/${day}/${year} at ${hour}:${minute.toString().padStart(2, "0")}${ampm}`;
}

function getStatusIcon(order: AdminOrder): React.ReactNode {
  if (order.isRefunded || order.isPartiallyRefunded) return <FaUndo />;
  switch (order.status) {
    case "succeeded":
      return <FaCheckCircle />;
    case "processing":
      return <FaClock />;
    case "requires_payment_method":
    case "canceled":
      return <FaTimesCircle />;
    default:
      return <FaClock />;
  }
}

function getStatusText(order: AdminOrder): string {
  if (order.isRefunded) return "Refunded";
  if (order.isPartiallyRefunded) return "Partially Refunded";
  switch (order.status) {
    case "succeeded":
      return "Completed";
    case "processing":
      return "Processing";
    case "requires_payment_method":
      return "Payment Required";
    case "canceled":
      return "Canceled";
    default:
      return order.status;
  }
}

function getOrderTypeLabel(order: AdminOrder): string {
  if (order.orderType === "purchase") return "Purchase";
  if (order.orderType === "redemption") return "Redemption";
  return "Grant";
}

interface OrderRowProps {
  order: AdminOrder;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onCustomerClick: (email: string) => void;
}

const OrderRow = React.memo(function OrderRow({
  order,
  isExpanded,
  onToggle,
  onCustomerClick,
}: OrderRowProps) {
  const subtotal = order.items.reduce(
    (sum, item) =>
      sum +
      ((item.sale_price != null ? item.sale_price : item.price) * item.quantity),
    0
  );
  const discount = order.metadata.discount_amount
    ? parseFloat(order.metadata.discount_amount)
    : 0;
  const itemsSummary = order.items
    .map((i) => `${i.name} (×${i.quantity})`)
    .join(", ");

  return (
    <React.Fragment>
      <TableRow $clickable onClick={() => onToggle(order.id)}>
        <TableCell style={{ fontWeight: 600 }}>{order.orderNumber}</TableCell>
        <TableCell>
          <OrderTypeBadge $type={order.orderType || "grant"}>
            {getOrderTypeLabel(order)}
          </OrderTypeBadge>
        </TableCell>
        <TableCell
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
          }}
        >
          {formatOrderDate(order.date)}
        </TableCell>
        <TableCell style={{ fontSize: "0.9rem" }}>
          {order.customerEmail ? (
            <CustomerLink
              onClick={(e) => {
                e.stopPropagation();
                onCustomerClick(order.customerEmail!);
              }}
            >
              {order.customerEmail}
            </CustomerLink>
          ) : (
            <span style={{ color: "var(--text-secondary)" }}>—</span>
          )}
        </TableCell>
        <TableCell
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={itemsSummary}
        >
          {itemsSummary || "—"}
        </TableCell>
        <TableCell
          style={{
            fontWeight: 600,
            color:
              order.amount === 0 && order.metadata?.grant_type
                ? "var(--text-secondary)"
                : "#4ecdc4",
          }}
        >
          {order.amount === 0 && order.metadata?.grant_type
            ? "Free"
            : `$${order.amount.toFixed(2)}`}
        </TableCell>
        <TableCell>
          <OrderStatus
            $status={
              order.isRefunded
                ? "refunded"
                : order.isPartiallyRefunded
                  ? "partially_refunded"
                  : order.status
            }
          >
            {getStatusIcon(order)} {getStatusText(order)}
          </OrderStatus>
        </TableCell>
        <ExpandCell>
          <ExpandButton
            onClick={(e) => {
              e.stopPropagation();
              onToggle(order.id);
            }}
          >
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </ExpandButton>
        </ExpandCell>
      </TableRow>
      <AnimatePresence>
        {isExpanded && (
          <DetailRow>
            <DetailCell colSpan={8}>
              <DetailGrid>
                <DetailSection>
                  <DetailSectionTitle>Items</DetailSectionTitle>
                  <ItemsList>
                    {order.items.map((item, idx) => (
                      <ItemLine key={idx}>
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>
                          $
                          {(
                            (item.sale_price != null
                              ? item.sale_price
                              : item.price) * item.quantity
                          ).toFixed(2)}
                        </span>
                      </ItemLine>
                    ))}
                  </ItemsList>
                </DetailSection>
                <DetailSection>
                  <DetailSectionTitle>Summary</DetailSectionTitle>
                  <ItemsList>
                    {order.metadata.original_total &&
                      parseFloat(order.metadata.original_total) !== subtotal && (
                        <DetailItem>
                          <span>Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </DetailItem>
                      )}
                    {discount > 0 && (
                      <DetailItem>
                        <span>Discount</span>
                        <span style={{ color: "var(--success)" }}>
                          -${discount.toFixed(2)}
                        </span>
                      </DetailItem>
                    )}
                    {order.metadata.promotion_code && (
                      <DetailItem>
                        <span>Promo</span>
                        <span>{order.metadata.promotion_code}</span>
                      </DetailItem>
                    )}
                    {order.metadata?.redemption_code && (
                      <DetailItem>
                        <span>Code</span>
                        <span>{order.metadata.redemption_code}</span>
                      </DetailItem>
                    )}
                    {order.metadata?.reseller_name && (
                      <DetailItem>
                        <span>Reseller</span>
                        <span>{order.metadata.reseller_name}</span>
                      </DetailItem>
                    )}
                    <DetailItem
                      style={{
                        fontWeight: 600,
                        color: "var(--text)",
                        paddingTop: "0.5rem",
                        marginTop: "0.5rem",
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span>Total</span>
                      <span>
                        {order.amount === 0 && order.metadata?.grant_type
                          ? "Free"
                          : `$${order.amount.toFixed(2)}`}
                      </span>
                    </DetailItem>
                    {(order.isRefunded || order.isPartiallyRefunded) && (
                      <>
                        <DetailItem style={{ color: "#ff9800" }}>
                          <span>Refunded</span>
                          <span>-${order.refundedAmount.toFixed(2)}</span>
                        </DetailItem>
                        <DetailItem>
                          <span>Final</span>
                          <span>
                            $
                            {(
                              order.amount - order.refundedAmount
                            ).toFixed(2)}
                          </span>
                        </DetailItem>
                      </>
                    )}
                  </ItemsList>
                  {order.receiptUrl && (
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(order.receiptUrl!, "_blank");
                      }}
                    >
                      <FaExternalLinkAlt /> View Receipt
                    </ActionButton>
                  )}
                </DetailSection>
              </DetailGrid>
            </DetailCell>
          </DetailRow>
        )}
      </AnimatePresence>
    </React.Fragment>
  );
});

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    subscription: string;
    totalSpent: number;
    createdAt: string;
  } | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const ordersCacheRef = useRef<
    Map<string, { orders: AdminOrder[]; totalCount: number }>
  >(new Map());

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      searchDebounceRef.current = null;
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  const fetchOrders = useCallback(
    async (
      currentFilter: FilterTab,
      currentPage: number,
      currentSearch: string
    ) => {
      const cacheKey = getOrdersCacheKey(
        currentFilter,
        currentPage,
        currentSearch
      );
      const cached = ordersCacheRef.current.get(cacheKey);
      if (cached) {
        setOrders(cached.orders);
        setTotalCount(cached.totalCount);
        setFetchError(null);
      }
      if (!cached) {
        setLoading(true);
        setFetchError(null);
      }
      try {
        if (currentFilter === "purchase") {
          const result = await getAdminStripeOrders(50);
          if (result.success && result.orders) {
            ordersCacheRef.current.set(cacheKey, {
              orders: result.orders,
              totalCount: result.orders.length,
            });
            setOrders(result.orders);
            setTotalCount(result.orders.length);
          } else {
            setOrders([]);
            setTotalCount(0);
            setFetchError(result.error ?? "Failed to load purchases");
          }
        } else if (currentFilter === "all") {
          const [stripeResult, grantResult] = await Promise.all([
            getAdminStripeOrders(50),
            getAdminGrantOrdersPaginated(
              1,
              100,
              currentSearch,
              "all"
            ),
          ]);
          const stripeOrders = stripeResult.success ? stripeResult.orders : [];
          const grantOrders = grantResult.success ? grantResult.orders : [];
          const merged = [...stripeOrders, ...grantOrders].sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          ordersCacheRef.current.set(cacheKey, {
            orders: merged,
            totalCount: merged.length,
          });
          setOrders(merged);
          setTotalCount(merged.length);
          if (!stripeResult.success && stripeResult.error) {
            setFetchError(stripeResult.error);
          } else if (!grantResult.success && grantResult.error) {
            setFetchError(grantResult.error);
          }
        } else {
          const rpcFilter =
            currentFilter === "grant"
              ? "grant"
              : currentFilter === "redemption"
                ? "redemption"
                : "all";
          const result = await getAdminGrantOrdersPaginated(
            currentPage,
            PAGE_SIZE,
            currentSearch,
            rpcFilter
          );
          if (result.success && result.orders) {
            ordersCacheRef.current.set(cacheKey, {
              orders: result.orders,
              totalCount: result.totalCount,
            });
            setOrders(result.orders);
            setTotalCount(result.totalCount);
          } else {
            setOrders([]);
            setTotalCount(0);
            setFetchError(
              result.error ?? "Failed to load grants/redemptions"
            );
          }
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setOrders([]);
        setTotalCount(0);
        setFetchError(
          err instanceof Error ? err.message : "Failed to fetch orders"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchOrders(filter, filter === "all" ? 1 : page, debouncedSearch);
  }, [fetchOrders, filter, page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (filter === "purchase" && order.orderType !== "purchase") return false;
        if (filter === "grant" && order.orderType !== "grant") return false;
        if (filter === "redemption" && order.orderType !== "redemption") return false;

        // Client-side search for Purchases and All tabs (Stripe has no server-side search).
        // Grants/Redemptions-only are filtered server-side by debouncedSearch.
        if ((filter === "purchase" || filter === "all") && searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchesEmail =
            order.customerEmail?.toLowerCase().includes(term) ?? false;
          const matchesOrder = order.orderNumber.toLowerCase().includes(term);
          const matchesItem = order.items.some((i) =>
            i.name.toLowerCase().includes(term)
          );
          const matchesReseller =
            order.metadata?.reseller_name?.toLowerCase().includes(term) ?? false;
          if (
            !matchesEmail &&
            !matchesOrder &&
            !matchesItem &&
            !matchesReseller
          )
            return false;
        }
        return true;
      }),
    [orders, filter, searchTerm]
  );

  const sortedOrders = useMemo(() => {
    const arr = [...filteredOrders];
    const dir = sortDirection === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "orderNumber":
          cmp = (a.orderNumber ?? "").localeCompare(b.orderNumber ?? "");
          break;
        case "orderType":
          cmp = (a.orderType ?? "").localeCompare(b.orderType ?? "");
          break;
        case "date":
          cmp =
            new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "customer":
          cmp = (a.customerEmail ?? "").localeCompare(b.customerEmail ?? "");
          break;
        case "items":
          cmp = a.items.length - b.items.length;
          if (cmp === 0) {
            const aNames = a.items.map((i) => i.name).join(" ");
            const bNames = b.items.map((i) => i.name).join(" ");
            cmp = aNames.localeCompare(bNames);
          }
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "status": {
          const statusA = a.isRefunded
            ? "refunded"
            : a.isPartiallyRefunded
              ? "partial_refund"
              : (a.status ?? "").toLowerCase();
          const statusB = b.isRefunded
            ? "refunded"
            : b.isPartiallyRefunded
              ? "partial_refund"
              : (b.status ?? "").toLowerCase();
          cmp = statusA.localeCompare(statusB);
          break;
        }
        default:
          return 0;
      }
      return cmp * dir;
    });
    return arr;
  }, [filteredOrders, sortField, sortDirection]);

  const displayedOrders = useMemo(() => {
    if (filter === "all") {
      return sortedOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    }
    return sortedOrders;
  }, [sortedOrders, filter, page]);

  const effectiveTotalCount =
    filter === "all" ? filteredOrders.length : totalCount;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const toggleOrder = useCallback((orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  const handleCustomerClick = useCallback(async (email: string) => {
    if (!email) return;
    setShowCustomerModal(true);
    setCustomerProfile(null);
    setLoadingCustomer(true);
    try {
      const result = await getUserByEmailAdmin(email);
      if (result.user) {
        setCustomerProfile({
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          subscription: result.user.subscription,
          totalSpent: result.user.totalSpent,
          createdAt: result.user.createdAt,
        });
      } else {
        setCustomerProfile(null);
      }
    } catch {
      setCustomerProfile(null);
    } finally {
      setLoadingCustomer(false);
    }
  }, []);

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
    setCustomerProfile(null);
  };

  if (!user?.is_admin) return null;

  return (
    <>
      <NextSEO
        title="Orders"
        description="View all orders, product grants, and redemptions"
      />
      <Container>
        <Header>
          <Title>
            <FaShoppingBag />
            Orders
          </Title>
          <Subtitle>
            All purchases, product grants, and code redemptions across the site.{" "}
            <Link
              href="/admin/product-grants"
              style={{ color: "var(--primary)", textDecoration: "underline" }}
            >
              Manage product grants
            </Link>
          </Subtitle>
        </Header>

        <TabRow>
          <Tab
            $active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All
          </Tab>
          <Tab
            $active={filter === "purchase"}
            onClick={() => setFilter("purchase")}
          >
            <FaCreditCard /> Purchases
          </Tab>
          <Tab
            $active={filter === "grant"}
            onClick={() => setFilter("grant")}
          >
            <FaBox /> Grants
          </Tab>
          <Tab
            $active={filter === "redemption"}
            onClick={() => setFilter("redemption")}
          >
            <FaGift /> Redemptions
          </Tab>
        </TabRow>

        <ToolbarRow>
          <SearchBar>
            <FaSearch />
            <SearchInput
              type="text"
              placeholder="Search by email, order #, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>
          {(filter === "all" ||
            filter === "grant" ||
            filter === "redemption") &&
            effectiveTotalCount > 0 && (
              <PaginationBar $inline>
                <PaginationInfo>
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, effectiveTotalCount)} of{" "}
                  {effectiveTotalCount.toLocaleString()}
                </PaginationInfo>
                <PaginationControls>
                  <PaginationButton
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </PaginationButton>
                  <PaginationButton
                    onClick={() =>
                      setPage((p) =>
                        Math.min(
                          Math.ceil(effectiveTotalCount / PAGE_SIZE),
                          p + 1
                        )
                      )
                    }
                    disabled={
                      page >= Math.ceil(effectiveTotalCount / PAGE_SIZE)
                    }
                  >
                    Next
                  </PaginationButton>
                </PaginationControls>
              </PaginationBar>
            )}
        </ToolbarRow>

        {fetchError && (
          <div
            style={{
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              background: "rgba(255, 87, 51, 0.15)",
              border: "1px solid rgba(255, 87, 51, 0.4)",
              borderRadius: "8px",
              color: "var(--error)",
            }}
          >
            {fetchError}
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <NNAudioLoadingSpinner />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState>
            <FaShoppingBag />
            <h3>No orders found</h3>
            <p>
              {fetchError
                ? "Check the error above and try again"
                : searchTerm || filter !== "all"
                  ? "Try adjusting your filters"
                  : "Orders will appear here when customers make purchases"}
            </p>
          </EmptyState>
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell
                    $sortable
                    onClick={() => handleSort("orderNumber")}
                  >
                    Order #
                    <SortIcon field="orderNumber" />
                  </TableHeaderCell>
                  <TableHeaderCell
                    $sortable
                    onClick={() => handleSort("orderType")}
                  >
                    Type
                    <SortIcon field="orderType" />
                  </TableHeaderCell>
                  <TableHeaderCell $sortable onClick={() => handleSort("date")}>
                    Date
                    <SortIcon field="date" />
                  </TableHeaderCell>
                  <TableHeaderCell
                    $sortable
                    onClick={() => handleSort("customer")}
                  >
                    Customer
                    <SortIcon field="customer" />
                  </TableHeaderCell>
                  <TableHeaderCell $sortable onClick={() => handleSort("items")}>
                    Items
                    <SortIcon field="items" />
                  </TableHeaderCell>
                  <TableHeaderCell $sortable onClick={() => handleSort("amount")}>
                    Amount
                    <SortIcon field="amount" />
                  </TableHeaderCell>
                  <TableHeaderCell $sortable onClick={() => handleSort("status")}>
                    Status
                    <SortIcon field="status" />
                  </TableHeaderCell>
                  <TableHeaderCell style={{ width: 40 }} />
                </tr>
              </TableHead>
              <TableBody>
                {displayedOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isExpanded={expandedOrders.has(order.id)}
                    onToggle={toggleOrder}
                    onCustomerClick={handleCustomerClick}
                  />
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}

        {(filter === "all" || filter === "grant" || filter === "redemption") &&
          effectiveTotalCount > 0 && (
          <PaginationBar>
            <PaginationInfo>
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, effectiveTotalCount)} of{" "}
              {effectiveTotalCount.toLocaleString()}
            </PaginationInfo>
            <PaginationControls>
              <PaginationButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </PaginationButton>
              <PaginationButton
                onClick={() =>
                  setPage((p) =>
                    Math.min(Math.ceil(effectiveTotalCount / PAGE_SIZE), p + 1)
                  )
                }
                disabled={page >= Math.ceil(effectiveTotalCount / PAGE_SIZE)}
              >
                Next
              </PaginationButton>
            </PaginationControls>
          </PaginationBar>
        )}
      </Container>

      {showCustomerModal && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeCustomerModal}
        >
          <ModalContent
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle>
                <FaUser />
                Customer Profile
              </ModalTitle>
              <CloseButton onClick={closeCustomerModal}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            {loadingCustomer ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <NNAudioLoadingSpinner />
              </div>
            ) : customerProfile ? (
              <ModalInfoGrid>
                <ModalInfoRow>
                  <span>Name</span>
                  <span>
                    {[customerProfile.firstName, customerProfile.lastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </span>
                </ModalInfoRow>
                <ModalInfoRow>
                  <span>Email</span>
                  <span>{customerProfile.email}</span>
                </ModalInfoRow>
                <ModalInfoRow>
                  <span>Subscription</span>
                  <span>{customerProfile.subscription}</span>
                </ModalInfoRow>
                <ModalInfoRow>
                  <span>Total Spent</span>
                  <span>${customerProfile.totalSpent.toFixed(2)}</span>
                </ModalInfoRow>
                <ModalInfoRow>
                  <span>Joined</span>
                  <span>{formatOrderDate(customerProfile.createdAt)}</span>
                </ModalInfoRow>
                <Link
                  href={`/admin/users?search=${encodeURIComponent(customerProfile.email)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginTop: "1rem",
                    color: "var(--primary)",
                    textDecoration: "underline",
                  }}
                >
                  View full profile <FaExternalLinkAlt />
                </Link>
              </ModalInfoGrid>
            ) : (
              <p style={{ color: "var(--text-secondary)" }}>
                Customer not found. They may not have an account yet.
              </p>
            )}
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}
