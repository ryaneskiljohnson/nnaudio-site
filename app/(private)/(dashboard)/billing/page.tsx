"use client";

/**
 * @fileoverview Billing page - Order history and payment methods
 * One-time purchases only (plugins/bundles via Stripe). No subscriptions.
 * @module dashboard/billing
 */

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaCreditCard,
  FaHistory,
  FaBox,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { createCustomerPortalSession } from "@/utils/stripe/actions";
import {
  getCustomerInvoices,
  type InvoiceData,
} from "@/utils/stripe/supabase-stripe";
import LoadingComponent from "@/components/common/LoadingComponent";
import { useTranslation } from "react-i18next";
import Link from "next/link";

const BillingContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: var(--text);
`;

const BillingCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const CardTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Button = styled.button`
  background: linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const InvoiceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const InvoiceDate = styled.span`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const InvoiceAmount = styled.span`
  font-weight: 600;
  color: var(--text);
`;

export default function BillingPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const customerId = user?.profile?.customer_id;

  useEffect(() => {
    if (!customerId) {
      setInvoicesLoading(false);
      return;
    }
    getCustomerInvoices(customerId)
      .then(({ invoices: inv }) => {
        setInvoices(inv || []);
      })
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  }, [customerId]);

  const handleManagePaymentMethods = async () => {
    if (!customerId) return;
    setPortalLoading(true);
    try {
      const { url } = await createCustomerPortalSession(customerId);
      if (url) window.location.href = url;
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (!user) {
    return (
      <BillingContainer>
        <LoadingComponent text={t("common.loading", "Loading...")} />
      </BillingContainer>
    );
  }

  return (
    <BillingContainer>
      <SectionTitle>
        {t("dashboard.billing.title", "Orders & Payment")}
      </SectionTitle>

      <BillingCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <CardTitle>
          <FaBox />
          {t("dashboard.billing.yourPurchases", "Your Purchases")}
        </CardTitle>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
          {t(
            "dashboard.billing.purchasesDesc",
            "View and download your purchased plugins and bundles."
          )}
        </p>
        <Link href="/my-products">
          <Button>
            {t("dashboard.billing.viewMyProducts", "View My Products")}
            <FaExternalLinkAlt />
          </Button>
        </Link>
      </BillingCard>

      <BillingCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <CardTitle>
          <FaCreditCard />
          {t("dashboard.billing.paymentMethods", "Payment Methods")}
        </CardTitle>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
          {t(
            "dashboard.billing.paymentMethodsDesc",
            "Update your saved payment method for future purchases."
          )}
        </p>
        {customerId ? (
          <Button
            onClick={handleManagePaymentMethods}
            disabled={portalLoading}
          >
            {portalLoading
              ? t("common.loading", "Loading...")
              : t("dashboard.billing.managePaymentMethods", "Manage Payment Methods")}
            <FaExternalLinkAlt />
          </Button>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {t(
              "dashboard.billing.noCustomerYet",
              "Complete a purchase to save your payment method."
            )}
          </p>
        )}
      </BillingCard>

      <BillingCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <CardTitle>
          <FaHistory />
          {t("dashboard.billing.orderHistory", "Order History")}
        </CardTitle>
        {invoicesLoading ? (
          <LoadingComponent
            text={t("dashboard.billing.loadingInvoices", "Loading orders...")}
          />
        ) : invoices.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>
            {t(
              "dashboard.billing.noOrders",
              "No orders yet. Browse our plugins and bundles to get started."
            )}
          </p>
        ) : (
          <div>
            {invoices.map((inv) => (
              <InvoiceRow key={inv.id}>
                <div>
                  <InvoiceDate>{formatDate(inv.created)}</InvoiceDate>
                  {inv.pdf_url && (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginLeft: "1rem",
                        color: "var(--primary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {t("dashboard.billing.viewReceipt", "View receipt")}
                    </a>
                  )}
                </div>
                <InvoiceAmount>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: (inv.currency || "usd").toUpperCase(),
                  }).format(inv.amount)}
                </InvoiceAmount>
              </InvoiceRow>
            ))}
          </div>
        )}
      </BillingCard>
    </BillingContainer>
  );
}
