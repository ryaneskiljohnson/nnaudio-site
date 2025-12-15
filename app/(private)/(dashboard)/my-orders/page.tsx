"use client";

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaShoppingBag,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExternalLinkAlt,
  FaChevronDown,
  FaChevronUp,
  FaBox,
  FaTag,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import LoadingComponent from "@/components/common/LoadingComponent";
import NextSEO from "@/components/NextSEO";

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
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
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
  margin-bottom: 0.5rem;
`;

const EmptyStateText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
`;

const OrdersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const OrderCard = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(108, 99, 255, 0.5);
    box-shadow: 0 4px 20px rgba(108, 99, 255, 0.1);
  }
`;

const OrderHeader = styled.div`
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const OrderInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const OrderNumber = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OrderDate = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
`;

const OrderAmount = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  text-align: right;

  @media (max-width: 768px) {
    text-align: left;
    font-size: 1.3rem;
  }
`;

const OrderStatus = styled.div<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: ${(props) => {
    switch (props.$status) {
      case "succeeded":
        return "rgba(0, 201, 167, 0.2)";
      case "processing":
        return "rgba(255, 193, 7, 0.2)";
      case "requires_payment_method":
      case "canceled":
        return "rgba(255, 87, 51, 0.2)";
      default:
        return "rgba(255, 255, 255, 0.1)";
    }
  }};
  color: ${(props) => {
    switch (props.$status) {
      case "succeeded":
        return "var(--success)";
      case "processing":
        return "var(--warning)";
      case "requires_payment_method":
      case "canceled":
        return "var(--error)";
      default:
        return "rgba(255, 255, 255, 0.7)";
    }
  }};
  border: 1px solid
    ${(props) => {
      switch (props.$status) {
        case "succeeded":
          return "rgba(0, 201, 167, 0.3)";
        case "processing":
          return "rgba(255, 193, 7, 0.3)";
        case "requires_payment_method":
        case "canceled":
          return "rgba(255, 87, 51, 0.3)";
        default:
          return "rgba(255, 255, 255, 0.1)";
      }
    }};
`;

const OrderDetails = styled(motion.div)`
  padding: 0 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ItemsList = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemName = styled.div`
  font-weight: 500;
  color: white;
  margin-bottom: 0.25rem;
`;

const ItemQuantity = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
`;

const ItemPrice = styled.div`
  font-weight: 600;
  color: var(--primary);
`;

const OrderSummary = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);

  &.total {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
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

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;

  &:hover {
    color: white;
  }
`;

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  amount: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    sale_price?: number;
    quantity: number;
  }>;
  metadata: {
    original_total?: string;
    discount_amount?: string;
    total_amount?: string;
    promotion_code?: string;
  };
  receiptUrl: string | null;
  invoiceId: string | null;
}

export default function MyOrdersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetchOrders();
  }, [user, router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/orders");
      const data = await response.json();

      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(t("common.locale", "en-US"), {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
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
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "succeeded":
        return t("dashboard.orders.status.completed", "Completed");
      case "processing":
        return t("dashboard.orders.status.processing", "Processing");
      case "requires_payment_method":
        return t("dashboard.orders.status.paymentRequired", "Payment Required");
      case "canceled":
        return t("dashboard.orders.status.canceled", "Canceled");
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Container>
        <NextSEO
          title={t("dashboard.orders.title", "My Orders") + " - NNAudio"}
          description={t("dashboard.orders.description", "View your order history")}
          canonical="/my-orders"
        />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <LoadingComponent
            text={t("dashboard.orders.loading", "Loading orders...")}
          />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <NextSEO
        title={t("dashboard.orders.title", "My Orders") + " - NNAudio"}
        description={t("dashboard.orders.description", "View your order history")}
        canonical="/my-orders"
      />
      <Header>
        <Title>
          <FaShoppingBag /> {t("dashboard.orders.title", "My Orders")}
        </Title>
        <Subtitle>
          {t(
            "dashboard.orders.subtitle",
            "View and manage your order history"
          )}
        </Subtitle>
      </Header>

      {orders.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <FaShoppingBag />
          </EmptyStateIcon>
          <EmptyStateTitle>
            {t("dashboard.orders.noOrders", "No orders yet")}
          </EmptyStateTitle>
          <EmptyStateText>
            {t(
              "dashboard.orders.noOrdersText",
              "When you make a purchase, your orders will appear here."
            )}
          </EmptyStateText>
        </EmptyState>
      ) : (
        <OrdersList>
          {orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const subtotal = order.items.reduce(
              (sum, item) => sum + (item.sale_price || item.price) * item.quantity,
              0
            );
            const discount = order.metadata.discount_amount
              ? parseFloat(order.metadata.discount_amount)
              : 0;

            return (
              <OrderCard
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <OrderHeader onClick={() => toggleOrder(order.id)}>
                  <OrderInfo>
                    <OrderNumber>
                      <FaBox /> {t("dashboard.orders.order", "Order")}{" "}
                      {order.orderNumber}
                    </OrderNumber>
                    <OrderDate>{formatDate(order.date)}</OrderDate>
                    <OrderStatus $status={order.status}>
                      {getStatusIcon(order.status)}
                      {getStatusText(order.status)}
                    </OrderStatus>
                  </OrderInfo>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "0.5rem",
                    }}
                  >
                    <OrderAmount>
                      ${order.amount.toFixed(2)} {order.currency}
                    </OrderAmount>
                    <ExpandButton>
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </ExpandButton>
                  </div>
                </OrderHeader>

                <AnimatePresence>
                  {isExpanded && (
                    <OrderDetails
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ItemsList>
                        {order.items.map((item, index) => (
                          <ItemRow key={index}>
                            <ItemInfo>
                              <ItemName>{item.name}</ItemName>
                              <ItemQuantity>
                                {t("dashboard.orders.quantity", "Quantity")}:{" "}
                                {item.quantity}
                              </ItemQuantity>
                            </ItemInfo>
                            <ItemPrice>
                              $
                              {(
                                (item.sale_price || item.price) * item.quantity
                              ).toFixed(2)}
                            </ItemPrice>
                          </ItemRow>
                        ))}
                      </ItemsList>

                      <OrderSummary>
                        {order.metadata.original_total &&
                          parseFloat(order.metadata.original_total) !==
                            subtotal && (
                            <SummaryRow>
                              <span>
                                {t("dashboard.orders.subtotal", "Subtotal")}:
                              </span>
                              <span>${subtotal.toFixed(2)}</span>
                            </SummaryRow>
                          )}
                        {discount > 0 && (
                          <SummaryRow>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <FaTag /> {t("dashboard.orders.discount", "Discount")}:
                            </span>
                            <span style={{ color: "var(--success)" }}>
                              -${discount.toFixed(2)}
                            </span>
                          </SummaryRow>
                        )}
                        {order.metadata.promotion_code && (
                          <SummaryRow>
                            <span>
                              {t("dashboard.orders.promoCode", "Promo Code")}:
                            </span>
                            <span>{order.metadata.promotion_code}</span>
                          </SummaryRow>
                        )}
                        <SummaryRow className="total">
                          <span>
                            {t("dashboard.orders.total", "Total")}:
                          </span>
                          <span>${order.amount.toFixed(2)}</span>
                        </SummaryRow>
                      </OrderSummary>

                      {order.receiptUrl && (
                        <ActionButton
                          onClick={() => window.open(order.receiptUrl!, "_blank")}
                        >
                          <FaExternalLinkAlt />
                          {t("dashboard.orders.viewReceipt", "View Receipt")}
                        </ActionButton>
                      )}
                    </OrderDetails>
                  )}
                </AnimatePresence>
              </OrderCard>
            );
          })}
        </OrdersList>
      )}
    </Container>
  );
}

