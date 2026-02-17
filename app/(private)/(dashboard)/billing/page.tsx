"use client";

/**
 * @fileoverview Billing page - Payment methods and active subscriptions
 * @module dashboard/billing
 */

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  FaCreditCard,
  FaSync,
  FaExternalLinkAlt,
  FaBox,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaTimes,
  FaLock,
  FaShieldAlt,
  FaExclamationCircle,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { createCustomerPortalSession } from "@/utils/stripe/actions";
import LoadingComponent from "@/components/common/LoadingComponent";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#ffffff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "16px",
      "::placeholder": { color: "rgba(255, 255, 255, 0.4)" },
    },
    invalid: {
      color: "#ff5e62",
      iconColor: "#ff5e62",
    },
  },
  hidePostalCode: true, // ZIP collected in billing address section above
};

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

const PaymentMethodsHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;

  .payment-methods-header-text {
    flex: 1;
    min-width: 0;
  }
  .payment-methods-header-text p {
    color: var(--text-secondary);
    margin: 0.25rem 0 0 0;
    font-size: 0.95rem;
  }
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

/** Subscription item from GET /api/stripe/subscriptions */
interface SubscriptionItem {
  id: string;
  status: string;
  current_period_end: number;
  current_period_start: number;
  cancel_at_period_end?: boolean;
  product_thumbnail?: string | null;
  metadata?: { bundle_slug?: string; bundle_id?: string; tier?: string };
  items?: Array<{
    price?: { currency?: string; unit_amount?: number; recurring?: { interval?: string } };
  }>;
}

/** Payment method from GET /api/payment-methods */
interface PaymentMethodItem {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  created: number;
  isDefault?: boolean;
  isSource?: boolean;
  billing_details?: {
    name: string | null;
    email: string | null;
    address: {
      line1: string | null;
      line2?: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  } | null;
}

const SubscriptionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:last-child {
    margin-bottom: 0;
  }
  &:hover {
    border-color: rgba(108, 99, 255, 0.25);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
`;

const SubscriptionThumb = styled.div`
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1.75rem;
`;

const SubscriptionBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const SubscriptionName = styled.div`
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--text);
  margin-bottom: 0.35rem;
`;

const SubscriptionMeta = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const SubscriptionActions = styled.div`
  flex-shrink: 0;
`;

const PaymentMethodsList = styled.div`
  margin-top: 1rem;
`;

const PaymentMethodRow = styled.div<{ $isDefault?: boolean }>`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:last-child {
    margin-bottom: 0;
  }
  &:hover {
    border-color: rgba(108, 99, 255, 0.25);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 0.75rem;
  }
`;

const CardInfoColumn = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 180px;
`;

const CardBrand = styled.span`
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--text);
`;

const CardNumber = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text);
  letter-spacing: 0.03em;
`;

const CardExpiry = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const CardBilling = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
  padding-left: 1rem;
  border-left: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 768px) {
    padding-left: 0;
    border-left: none;
    width: 100%;
  }
`;

const DefaultBadge = styled.span`
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 0.25rem;
`;

const CardActions = styled.div`
  flex-shrink: 0;
  margin-left: auto;
`;

const SmallButton = styled.button<{ $variant?: 'danger' | 'primary' }>`
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid ${(props) => 
    props.$variant === 'danger' 
      ? 'rgba(239, 68, 68, 0.4)' 
      : 'rgba(108, 99, 255, 0.4)'};
  background: ${(props) => 
    props.$variant === 'danger' 
      ? 'rgba(239, 68, 68, 0.1)' 
      : 'rgba(108, 99, 255, 0.1)'};
  color: ${(props) => props.$variant === 'danger' ? '#ef4444' : 'var(--text)'};
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  &:hover:not(:disabled) {
    background: ${(props) => 
      props.$variant === 'danger' 
        ? 'rgba(239, 68, 68, 0.2)' 
        : 'rgba(108, 99, 255, 0.2)'};
    border-color: ${(props) => 
      props.$variant === 'danger' 
        ? 'rgba(239, 68, 68, 0.6)' 
        : 'rgba(108, 99, 255, 0.6)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AddCardFormWrap = styled.div`
  margin-top: 1rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
`;

const AddCardFormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const AddCardFormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const AddCardInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4ecdc4;
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const AddCardLabel = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
`;

const CardElementContainer = styled.div`
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #4ecdc4;
    background: rgba(255, 255, 255, 0.08);
  }

  .StripeElement {
    color: white;
  }
`;

const AddCardActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
  align-items: center;
`;

const AddCardSubmitButton = styled.button`
  background: linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.95;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const TextButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text);
  padding: 0.5rem 1.5rem;
  min-width: 100px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AddCardErrorMessage = styled.div`
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #ff5e62;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
`;

const AddCardSecurityNotice = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
`;

const AddCardSecurityText = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  line-height: 1.5;

  svg {
    margin-top: 2px;
    flex-shrink: 0;
    color: #4ecdc4;
  }
`;

const AddCardStripeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 0.75rem;
`;

const AddCardStripeLogoText = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .stripe-name {
    color: #635bff;
    font-weight: 600;
  }
`;

const AddCardStripeLogoImage = styled.img`
  height: 18px;
  width: auto;
  opacity: 0.8;
`;

const AddCardSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: addCardSpin 0.6s linear infinite;

  @keyframes addCardSpin {
    to {
      transform: rotate(360deg);
    }
  }
`;

/* Remove payment method confirmation dialog */
const ConfirmOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
`;

const ConfirmContent = styled(motion.div)`
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
`;

const ConfirmTitle = styled.h3`
  font-size: 1.25rem;
  color: var(--text);
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConfirmMessage = styled.p`
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 1.25rem 0;
  line-height: 1.5;
`;

const ConfirmCardPreview = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
  color: var(--text);
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button<{ $variant?: "danger" | "secondary" }>`
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 100px;
  justify-content: center;
  transition: all 0.2s;

  ${(p) =>
    p.$variant === "danger"
      ? `
    background: #dc3545;
    color: white;
    border: none;
    &:hover:not(:disabled) {
      background: #c82333;
    }
  `
      : `
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
    border: 1px solid rgba(255, 255, 255, 0.2);
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

type AddCardBillingFields = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

/**
 * Inline form to add a card via SetupIntent (no redirect, no "save for faster checkout" prompt).
 * Captures billing address and card; styled to match checkout.
 */
function AddCardForm({
  clientSecret,
  userEmail,
  onSuccess,
  onCancel,
  t,
}: {
  clientSecret: string;
  userEmail: string | undefined;
  onSuccess: () => void;
  onCancel: () => void;
  t: (key: string, fallback: string) => string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<AddCardBillingFields>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  const updateBilling = (field: keyof AddCardBillingFields, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) {
      setError("Card field not ready. Please refresh.");
      return;
    }
    if (!billing.name.trim()) {
      setError("Billing name is required.");
      return;
    }
    if (!billing.address.trim()) {
      setError("Billing address is required.");
      return;
    }
    if (!billing.city.trim()) {
      setError("City is required.");
      return;
    }
    if (!billing.state.trim()) {
      setError("State is required.");
      return;
    }
    if (!billing.zip.trim()) {
      setError("ZIP code is required.");
      return;
    }
    if (!billing.country.trim()) {
      setError("Country is required.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const { error: confirmError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardEl,
          billing_details: {
            name: billing.name.trim(),
            email: userEmail || undefined,
            address: {
              line1: billing.address.trim(),
              city: billing.city.trim(),
              state: billing.state.trim(),
              postal_code: billing.zip.trim(),
              country: billing.country.trim(),
            },
          },
        },
      });
      if (confirmError) {
        setError(confirmError.message || "Card setup failed.");
        setProcessing(false);
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "1rem", fontSize: "0.9rem", lineHeight: 1.5 }}>
        {t("dashboard.billing.addCardInlineDesc", "Enter your billing details and card below. Your payment method will be saved for future purchases and subscriptions.")}
      </p>

      <AddCardFormGroup>
        <AddCardLabel>{t("dashboard.billing.billingName", "Billing name")} *</AddCardLabel>
        <AddCardInput
          type="text"
          value={billing.name}
          onChange={(e) => updateBilling("name", e.target.value)}
          placeholder="Full name on card"
          required
        />
      </AddCardFormGroup>

      <AddCardFormGroup>
        <AddCardLabel>{t("dashboard.billing.billingAddress", "Billing address")} *</AddCardLabel>
        <AddCardInput
          type="text"
          value={billing.address}
          onChange={(e) => updateBilling("address", e.target.value)}
          placeholder="Street address"
          required
        />
      </AddCardFormGroup>

      <AddCardFormRow>
        <AddCardFormGroup style={{ marginBottom: 0 }}>
          <AddCardLabel>{t("dashboard.billing.city", "City")} *</AddCardLabel>
          <AddCardInput
            type="text"
            value={billing.city}
            onChange={(e) => updateBilling("city", e.target.value)}
            placeholder="City"
            required
          />
        </AddCardFormGroup>
        <AddCardFormGroup style={{ marginBottom: 0 }}>
          <AddCardLabel>{t("dashboard.billing.state", "State")} *</AddCardLabel>
          <AddCardInput
            type="text"
            value={billing.state}
            onChange={(e) => updateBilling("state", e.target.value)}
            placeholder="State"
            required
          />
        </AddCardFormGroup>
      </AddCardFormRow>

      <AddCardFormRow>
        <AddCardFormGroup style={{ marginBottom: 0 }}>
          <AddCardLabel>{t("dashboard.billing.zip", "ZIP code")} *</AddCardLabel>
          <AddCardInput
            type="text"
            value={billing.zip}
            onChange={(e) => updateBilling("zip", e.target.value)}
            placeholder="ZIP"
            required
          />
        </AddCardFormGroup>
        <AddCardFormGroup style={{ marginBottom: 0 }}>
          <AddCardLabel>{t("dashboard.billing.country", "Country")} *</AddCardLabel>
          <AddCardInput
            type="text"
            value={billing.country}
            onChange={(e) => updateBilling("country", e.target.value)}
            placeholder="Country"
            required
          />
        </AddCardFormGroup>
      </AddCardFormRow>

      <AddCardFormGroup>
        <AddCardLabel>{t("dashboard.billing.cardInformation", "Card information")} *</AddCardLabel>
        <CardElementContainer>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </CardElementContainer>
      </AddCardFormGroup>

      {error && (
        <AddCardErrorMessage>
          <FaExclamationCircle />
          {error}
        </AddCardErrorMessage>
      )}

      <AddCardActions>
        <AddCardSubmitButton type="submit" disabled={!stripe || processing}>
          {processing ? (
            <>
              <AddCardSpinner />
              {t("common.saving", "Saving...")}
            </>
          ) : (
            <>
              <FaLock />
              {t("dashboard.billing.saveCard", "Save card")}
            </>
          )}
        </AddCardSubmitButton>
        <TextButton type="button" onClick={onCancel} disabled={processing}>
          <FaTimes /> {t("common.cancel", "Cancel")}
        </TextButton>
      </AddCardActions>

      <AddCardSecurityNotice>
        <AddCardSecurityText>
          <FaShieldAlt />
          <span>
            {t(
              "dashboard.billing.secureNotice",
              "Your payment information is encrypted and secure. We never store your card details."
            )}
          </span>
        </AddCardSecurityText>
        <AddCardStripeBadge>
          <AddCardStripeLogoImage src="/stripe.webp" alt="Stripe" />
          <AddCardStripeLogoText>
            {t("dashboard.billing.poweredByStripe", "Powered by")}{" "}
            <span className="stripe-name">Stripe</span>{" "}
            {t("dashboard.billing.secureCheckout", "• Secure checkout")}
          </AddCardStripeLogoText>
        </AddCardStripeBadge>
      </AddCardSecurityNotice>
    </form>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [removingCardId, setRemovingCardId] = useState<string | null>(null);
  const [addCardClientSecret, setAddCardClientSecret] = useState<string | null>(null);
  const [addCardLoading, setAddCardLoading] = useState(false);
  const [removeConfirmCard, setRemoveConfirmCard] = useState<{
    id: string;
    isSource?: boolean;
    last4?: string;
    brand?: string;
  } | null>(null);

  const hasCustomerId = Boolean(user?.profile?.customer_id);

  useEffect(() => {
    if (!user) {
      setSubscriptionsLoading(false);
      return;
    }
    fetch("/api/stripe/subscriptions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.subscriptions)) {
          const active = (data.subscriptions as SubscriptionItem[]).filter((s) =>
            ["active", "trialing", "past_due"].includes(s.status)
          );
          setSubscriptions(active);
        }
      })
      .catch(() => setSubscriptions([]))
      .finally(() => setSubscriptionsLoading(false));
  }, [user]);

  // Fetch payment methods
  useEffect(() => {
    if (!user) {
      setPaymentMethodsLoading(false);
      return;
    }
    fetch("/api/payment-methods")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.paymentMethods)) {
          setPaymentMethods(data.paymentMethods);
        }
      })
      .catch(() => setPaymentMethods([]))
      .finally(() => setPaymentMethodsLoading(false));
  }, [user]);

  /** Opens Stripe portal (full portal for subscriptions). Uses server-resolved customer. */
  const handleOpenPortal = async (paymentMethodOnly?: boolean) => {
    if (!hasCustomerId) return;
    setPortalLoading(true);
    try {
      const { url, error } = await createCustomerPortalSession({
        ...(paymentMethodOnly && { flow: "payment_method_update" }),
      });
      if (error) {
        alert(error);
        return;
      }
      if (url) window.location.href = url;
    } finally {
      setPortalLoading(false);
    }
  };

  /** Start inline add-card flow: create SetupIntent and show card form (no redirect, no "save for faster checkout"). */
  const handleStartAddCard = async () => {
    if (!hasCustomerId) return;
    setAddCardLoading(true);
    try {
      const res = await fetch("/api/setup-intent", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start add card");
        return;
      }
      if (data.clientSecret) setAddCardClientSecret(data.clientSecret);
    } finally {
      setAddCardLoading(false);
    }
  };

  const handleAddCardSuccess = () => {
    setAddCardClientSecret(null);
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => d.success && Array.isArray(d.paymentMethods) && setPaymentMethods(d.paymentMethods))
      .catch(() => {});
  };

  const handleAddCardCancel = () => setAddCardClientSecret(null);

  /** Performs the API call to remove a payment method (called after user confirms in dialog). */
  const performRemovePaymentMethod = async (paymentMethodId: string, isSource?: boolean) => {
    setRemovingCardId(paymentMethodId);
    try {
      const res = await fetch(`/api/payment-methods?id=${paymentMethodId}&isSource=${isSource || false}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove payment method");
      }

      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== paymentMethodId));
      setRemoveConfirmCard(null);
    } catch (error: any) {
      console.error("Error removing payment method:", error);
      alert(
        t(
          "dashboard.billing.removeCardError",
          error.message || "Failed to remove card. Please try again."
        )
      );
    } finally {
      setRemovingCardId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const subscriptionLabel = (sub: SubscriptionItem) => {
    const slug = sub.metadata?.bundle_slug;
    const tier = sub.metadata?.tier;
    if (slug && tier) {
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `${name} (${tier})`;
    }
    const interval = sub.items?.[0]?.price?.recurring?.interval;
    return interval ? `Subscription (${interval}ly)` : "Subscription";
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
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <PaymentMethodsHeader>
          <div className="payment-methods-header-text">
            <CardTitle style={{ marginBottom: 0 }}>
              <FaCreditCard />
              {t("dashboard.billing.paymentMethods", "Payment Methods")}
            </CardTitle>
            <p>
              {t(
                "dashboard.billing.paymentMethodsDesc",
                "Update your saved payment method for future purchases."
              )}
            </p>
          </div>
          {hasCustomerId && !paymentMethodsLoading && !addCardClientSecret && (
            <Button
              onClick={handleStartAddCard}
              disabled={addCardLoading}
              style={{ flexShrink: 0 }}
            >
              <FaPlus />
              {addCardLoading
                ? t("common.loading", "Loading...")
                : t("dashboard.billing.addPaymentMethod", "Add New Card")}
            </Button>
          )}
        </PaymentMethodsHeader>
        {!hasCustomerId ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {t(
              "dashboard.billing.noCustomerYet",
              "Complete a purchase to save your payment method."
            )}
          </p>
        ) : paymentMethodsLoading ? (
          <LoadingComponent text={t("common.loading", "Loading...")} />
        ) : (
          <>
            <PaymentMethodsList>
              {paymentMethods.map((pm) => (
                <PaymentMethodRow key={pm.id} $isDefault={pm.isDefault}>
                  <CardInfoColumn>
                    <FaCreditCard style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                    <CardBrand>{pm.card?.brand.toUpperCase() || "CARD"}</CardBrand>
                    <CardNumber>•••• {pm.card?.last4 || "****"}</CardNumber>
                    <CardExpiry>
                      {pm.card?.exp_month}/{pm.card?.exp_year}
                    </CardExpiry>
                    {pm.isDefault && (
                      <DefaultBadge>{t("dashboard.billing.default", "Default")}</DefaultBadge>
                    )}
                  </CardInfoColumn>
                  {pm.billing_details && (pm.billing_details.name || pm.billing_details.address?.line1 || pm.billing_details.address?.city) && (
                    <CardBilling>
                      {pm.billing_details.name && <span style={{ fontWeight: 500, color: "var(--text)" }}>{pm.billing_details.name}</span>}
                      {pm.billing_details.name && (pm.billing_details.address?.line1 || pm.billing_details.address?.city) && " · "}
                      {pm.billing_details.address?.line1 && <span>{pm.billing_details.address.line1}</span>}
                      {(pm.billing_details.address?.city || pm.billing_details.address?.state || pm.billing_details.address?.postal_code) && (
                        <span>
                          {" "}
                          {[pm.billing_details.address.city, pm.billing_details.address.state, pm.billing_details.address.postal_code].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {pm.billing_details.address?.country && <span> {pm.billing_details.address.country}</span>}
                    </CardBilling>
                  )}
                  <CardActions>
                    <SmallButton
                      $variant="danger"
                      onClick={() =>
                        setRemoveConfirmCard({
                          id: pm.id,
                          isSource: pm.isSource,
                          last4: pm.card?.last4,
                          brand: pm.card?.brand,
                        })
                      }
                      disabled={removingCardId === pm.id}
                    >
                      <FaTrash />
                      {removingCardId === pm.id
                        ? t("common.removing", "Removing...")
                        : t("dashboard.billing.remove", "Remove")}
                    </SmallButton>
                  </CardActions>
                </PaymentMethodRow>
              ))}
            </PaymentMethodsList>
            {paymentMethods.length === 0 && (
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                {t("dashboard.billing.noPaymentMethods", "No payment methods saved yet.")}
              </p>
            )}
            {addCardClientSecret && (
              <AddCardFormWrap>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: addCardClientSecret,
                    appearance: { theme: "night", variables: { colorPrimary: "#6c63ff" } },
                  }}
                >
                  <AddCardForm
                    clientSecret={addCardClientSecret}
                    userEmail={user?.email}
                    onSuccess={handleAddCardSuccess}
                    onCancel={handleAddCardCancel}
                    t={t}
                  />
                </Elements>
              </AddCardFormWrap>
            )}
            {hasCustomerId && (
              <AddCardSecurityNotice style={{ marginTop: "1.5rem" }}>
                <AddCardSecurityText>
                  <FaShieldAlt />
                  <span>
                    {t(
                      "dashboard.billing.secureNotice",
                      "Your payment information is encrypted and secure. We never store your card details."
                    )}
                  </span>
                </AddCardSecurityText>
                <AddCardStripeBadge>
                  <AddCardStripeLogoImage src="/stripe.webp" alt="Stripe" />
                  <AddCardStripeLogoText>
                    {t("dashboard.billing.poweredByStripe", "Powered by")}{" "}
                    <span className="stripe-name">Stripe</span>{" "}
                    {t("dashboard.billing.secureCheckout", "• Secure checkout")}
                  </AddCardStripeLogoText>
                </AddCardStripeBadge>
              </AddCardSecurityNotice>
            )}
          </>
        )}
      </BillingCard>

      <BillingCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <CardTitle>
          <FaSync />
          {t("dashboard.billing.activeSubscriptions", "Active Subscriptions")}
        </CardTitle>
        {subscriptionsLoading ? (
          <LoadingComponent
            text={t("dashboard.billing.loadingSubscriptions", "Loading subscriptions...")}
          />
        ) : subscriptions.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>
            {t(
              "dashboard.billing.noActiveSubscriptions",
              "You don't have any active subscriptions. Manage payment methods below to update billing for future purchases."
            )}
          </p>
        ) : (
          <div>
            {subscriptions.map((sub) => (
              <SubscriptionRow key={sub.id}>
                <SubscriptionThumb>
                  {sub.product_thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sub.product_thumbnail}
                      alt=""
                      style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    />
                  ) : (
                    <FaBox />
                  )}
                </SubscriptionThumb>
                <SubscriptionBody>
                  <SubscriptionName>{subscriptionLabel(sub)}</SubscriptionName>
                  <SubscriptionMeta>
                    {t("dashboard.billing.renewsOn", "Renews")}{" "}
                    {formatDate(sub.current_period_end)}
                    {sub.cancel_at_period_end
                      ? ` · ${t("dashboard.billing.cancelsAtPeriodEnd", "Cancels at period end")}`
                      : ""}
                  </SubscriptionMeta>
                </SubscriptionBody>
                {hasCustomerId && (
                  <SubscriptionActions>
                    <Button
                      type="button"
                      onClick={() => handleOpenPortal(false)}
                      disabled={portalLoading}
                    >
                      {t("dashboard.billing.manage", "Manage")}
                      <FaExternalLinkAlt />
                    </Button>
                  </SubscriptionActions>
                )}
              </SubscriptionRow>
            ))}
          </div>
        )}
      </BillingCard>

      {removeConfirmCard && (
        <ConfirmOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setRemoveConfirmCard(null)}
        >
          <ConfirmContent
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ConfirmTitle>
              <FaTrash />
              {t("dashboard.billing.removeCardTitle", "Remove payment method?")}
            </ConfirmTitle>
            <ConfirmMessage>
              {t(
                "dashboard.billing.removeCardConfirmMessage",
                "This card will be removed from your account. You can add it again anytime."
              )}
            </ConfirmMessage>
            <ConfirmCardPreview>
              {removeConfirmCard.brand?.toUpperCase() || "CARD"} •••• {removeConfirmCard.last4 || "****"}
            </ConfirmCardPreview>
            <ConfirmActions>
              <ConfirmButton
                $variant="secondary"
                type="button"
                onClick={() => setRemoveConfirmCard(null)}
                disabled={removingCardId === removeConfirmCard.id}
              >
                {t("common.cancel", "Cancel")}
              </ConfirmButton>
              <ConfirmButton
                $variant="danger"
                type="button"
                onClick={() =>
                  performRemovePaymentMethod(removeConfirmCard.id, removeConfirmCard.isSource)
                }
                disabled={removingCardId === removeConfirmCard.id}
              >
                {removingCardId === removeConfirmCard.id ? (
                  t("common.removing", "Removing...")
                ) : (
                  <>
                    <FaTrash />
                    {t("dashboard.billing.removeCardConfirmButton", "Remove card")}
                  </>
                )}
              </ConfirmButton>
            </ConfirmActions>
          </ConfirmContent>
        </ConfirmOverlay>
      )}
    </BillingContainer>
  );
}
