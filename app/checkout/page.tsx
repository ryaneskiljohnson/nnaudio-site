"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { FaHome, FaChevronRight, FaLock, FaCheckCircle, FaExclamationCircle, FaShieldAlt } from "react-icons/fa";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { COUNTRIES, getStateOptions } from "@/lib/countries-states";
import CheckoutPageSkeleton from "@/components/skeletons/CheckoutPageSkeleton";
import { trackInitiateCheckout } from "@/utils/analytics";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 120px 20px 80px;
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const BreadcrumbContainer = styled.div`
  margin-bottom: 2rem;
`;

const BreadcrumbList = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const BreadcrumbLink = styled(Link)`
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 1);
  }
`;

const BreadcrumbSeparator = styled.span`
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
`;

const BreadcrumbCurrent = styled.span`
  color: rgba(255, 255, 255, 1);
  font-weight: 500;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const CheckoutContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const CheckoutForm = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2rem;

  @media (max-width: 968px) {
    order: 2;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
`;

const Input = styled.input`
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

  &:disabled {
    background: rgba(255, 255, 255, 0.03);
    cursor: not-allowed;
    opacity: 0.7;
  }
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

const OrderSummary = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2rem;
  height: fit-content;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  position: sticky;
  top: 140px;

  @media (max-width: 968px) {
    order: 1;
    position: relative;
    top: 0;
    max-height: none;
  }
`;

const OrderItem = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const OrderItemImage = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
`;

const OrderItemDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const OrderItemName = styled.div`
  font-weight: 600;
  color: white;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`;

const OrderItemPrice = styled.div`
  color: #4ecdc4;
  font-weight: 600;
  font-size: 0.95rem;
`;

const OrderItemQuantity = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.8);
`;

const SummaryTotal = styled.div`
  display: flex;
  justify-content: space-between;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
  font-size: 1.3rem;
  font-weight: 700;
  color: #4ecdc4;
`;

const PayButton = styled(motion.button)`
  width: 100%;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  padding: 18px 32px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #ff5e62;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SuccessMessage = styled.div`
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
  color: #4ecdc4;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.6s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const PromoCodeContainerSidebar = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const PromoCodeLabel = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
`;

const PromoCodeInputGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const PromoCodeInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  text-transform: uppercase;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4ecdc4;
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
    text-transform: none;
  }
`;

const ApplyButton = styled.button`
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PromoCodeSuccess = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
  border-radius: 8px;
  color: #4ecdc4;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const RemovePromoButton = styled.button`
  background: none;
  border: none;
  color: #4ecdc4;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
  padding: 0;
  margin-left: 0.5rem;

  &:hover {
    opacity: 0.8;
  }
`;

const SecurityNotice = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SecurityText = styled.div`
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

const StripeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const StripeLogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
`;

const StripeLogoText = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .stripe-name {
    color: #635BFF;
    font-weight: 600;
  }
`;

const StripeLogoImage = styled.img`
  height: 18px;
  width: auto;
  opacity: 0.8;
`;

const SaveCardCheckbox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(78, 205, 196, 0.3);
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #4ecdc4;
  }

  label {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    margin: 0;
    user-select: none;
  }
`;

const SaveCardNote = styled.div`
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  padding-left: 0.25rem;
`;

const PaymentMethodOption = styled.label<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: ${(p) => (p.$selected ? "rgba(78, 205, 196, 0.12)" : "rgba(255, 255, 255, 0.05)")};
  border: 1px solid ${(p) => (p.$selected ? "rgba(78, 205, 196, 0.4)" : "rgba(255, 255, 255, 0.1)")};
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  input {
    margin: 0;
    accent-color: #4ecdc4;
  }
`;

const PaymentMethodLabel = styled.span`
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
`;

const UseOtherLabel = styled.span`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
`;

const SavedCardBilling = styled.div`
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
`;

/** Saved payment method from GET /api/payment-methods */
type SavedPaymentMethod = {
  id: string;
  card: { brand: string; last4: string } | null;
  isDefault?: boolean;
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
};

// Payment Form Component
function PaymentForm({ 
  items, 
  total, 
  appliedPromo, 
  onOrderComplete,
  billingFields,
  onBillingFieldsChange,
  savedPaymentMethods = [],
  paymentMethodsLoading = false,
}: { 
  items: any[]; 
  total: number; 
  appliedPromo: { code: string; discount: { amount: number; percent: number }; promotionCodeId: string } | null; 
  onOrderComplete: () => void;
  billingFields: {
    email: string;
    billingName: string;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingZip: string;
    billingCountry: string;
  };
  onBillingFieldsChange: (fields: {
    email: string;
    billingName: string;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingZip: string;
    billingCountry: string;
  }) => void;
  savedPaymentMethods?: SavedPaymentMethod[];
  paymentMethodsLoading?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clearCart } = useCart();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  const defaultPm = savedPaymentMethods.find((pm) => pm.isDefault) ?? savedPaymentMethods[0];
  const [selectedSavedPmId, setSelectedSavedPmId] = useState<string | null>(defaultPm?.id ?? null);
  const [useOtherPaymentMethod, setUseOtherPaymentMethod] = useState(false);
  
  // Use billing fields from props
  const { email, billingName, billingAddress, billingCity, billingState, billingZip, billingCountry } = billingFields;

  const hasSavedMethods = savedPaymentMethods.length > 0;
  const showBillingAndCard = !hasSavedMethods || useOtherPaymentMethod;
  const payingWithSavedCard = hasSavedMethods && !useOtherPaymentMethod && !!selectedSavedPmId;
  const waitingForPaymentMethods = paymentMethodsLoading && !!user?.profile?.customer_id;

  // When saved methods load, default to first/default PM; keep selection in sync
  useEffect(() => {
    if (savedPaymentMethods.length === 0) return;
    const def = savedPaymentMethods.find((pm) => pm.isDefault) ?? savedPaymentMethods[0];
    const currentInList = selectedSavedPmId && savedPaymentMethods.some((pm) => pm.id === selectedSavedPmId);
    if (def && (!selectedSavedPmId || !currentInList)) setSelectedSavedPmId(def.id);
  }, [savedPaymentMethods, selectedSavedPmId]);

  // Helper to update billing fields
  const updateBillingField = (field: string, value: string) => {
    onBillingFieldsChange({
      ...billingFields,
      [field]: value,
    });
  };

  // Set email from user if logged in
  useEffect(() => {
    if (user?.email && !billingFields.email) {
      updateBillingField('email', user.email);
    }
  }, [user]);

  // Create payment intent on mount or when promo code changes (paid orders only).
  // Free orders are not created here to avoid double API calls and double emails when
  // the effect runs twice (e.g. React Strict Mode) or when deps change; they are
  // created once on submit.
  // Note: We don't recreate when savePaymentMethod changes to avoid flickering
  useEffect(() => {
    const orderTotal = Math.max(total - (appliedPromo?.discount?.amount ?? 0), 0);
    if (items.length === 0 || orderTotal === 0) {
      return;
    }

    async function createPaymentIntent() {
      try {
        const response = await fetch('/api/payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items,
            promotionCodeId: appliedPromo ? appliedPromo.promotionCodeId : undefined,
            savePaymentMethod: savePaymentMethod,
          }),
        });

        const data = await response.json();

        if (data.success) {
          if (data.isFreeOrder) {
            setClientSecret(null);
          } else {
            setClientSecret(data.clientSecret);
          }
        } else {
          setError(data.error || 'Failed to initialize payment');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize payment');
      }
    }

    createPaymentIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, appliedPromo]);

  const finalTotal = Math.max(total - (appliedPromo?.discount.amount || 0), 0);
  // Apply Stripe minimum: if total is between $0 and $0.50, charge $0.50
  const displayTotal = finalTotal > 0 && finalTotal < 0.50 ? 0.50 : finalTotal;
  const isFreeOrder = finalTotal === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    // Free order: call API once to record grants + send email, then redirect
    if (isFreeOrder) {
      setIsProcessing(true);
      setError(null);
      try {
        const piResponse = await fetch('/api/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            promotionCodeId: appliedPromo ? appliedPromo.promotionCodeId : undefined,
            savePaymentMethod: false,
          }),
        });
        const piData = await piResponse.json();
        if (!piData.success) {
          setError(piData.error || 'Something went wrong.');
          setIsProcessing(false);
          return;
        }
        setSuccess(true);
        clearCart();
        onOrderComplete();
        setTimeout(() => {
          router.push(`/checkout-success?session_id=free-order`);
        }, 800);
      } catch (err: any) {
        setError(err.message || 'Something went wrong.');
        setIsProcessing(false);
      }
      return;
    }

    if (!stripe) {
      setError('Payment could not be initialized. Please refresh and try again.');
      setIsProcessing(false);
      return;
    }

    // When using card element we need elements; when paying with saved card we do not
    if (showBillingAndCard && !elements) {
      setError('Payment form not ready. Please refresh and try again.');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setError(null);

    if (!email.trim()) {
      setError('Email address is required');
      setIsProcessing(false);
      return;
    }

    if (showBillingAndCard) {
      if (!billingName.trim()) {
        setError('Billing name is required');
        setIsProcessing(false);
        return;
      }
      if (!billingAddress.trim()) {
        setError('Billing address is required');
        setIsProcessing(false);
        return;
      }
      if (!billingCity.trim()) {
        setError('City is required');
        setIsProcessing(false);
        return;
      }
      if (!billingState.trim()) {
        setError('State is required');
        setIsProcessing(false);
        return;
      }
      if (!billingZip.trim()) {
        setError('ZIP code is required');
        setIsProcessing(false);
        return;
      }
    }

    try {
      const piBody: Record<string, unknown> = {
        items,
        promotionCodeId: appliedPromo ? appliedPromo.promotionCodeId : undefined,
        savePaymentMethod: showBillingAndCard ? savePaymentMethod : false,
      };
      if (payingWithSavedCard && selectedSavedPmId) {
        piBody.paymentMethodId = selectedSavedPmId;
      }

      const piResponse = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(piBody),
      });

      const piData = await piResponse.json();

      if (!piData.success) {
        setError(piData.error || 'Failed to initialize payment.');
        setIsProcessing(false);
        return;
      }

      // Handle free orders or orders below Stripe minimum ($0.50)
      if (piData.isFreeOrder) {
        // Skip Stripe payment for free orders
        setSuccess(true);
        clearCart();
        onOrderComplete();
        setTimeout(() => {
          router.push(`/checkout-success?session_id=free-order`);
        }, 800);
        return;
      }

      if (!piData.clientSecret) {
        setError('Failed to initialize payment.');
        setIsProcessing(false);
        return;
      }

      setClientSecret(piData.clientSecret);

      let stripeError: import('@stripe/stripe-js').StripeError | undefined;
      let paymentIntent: import('@stripe/stripe-js').PaymentIntent | null = null;

      if (payingWithSavedCard && selectedSavedPmId) {
        const result = await stripe.confirmCardPayment(piData.clientSecret, {
          payment_method: selectedSavedPmId,
        });
        stripeError = result.error ?? undefined;
        paymentIntent = result.paymentIntent ?? null;
      } else {
        if (!elements) {
          setError('Payment form not ready. Please wait a moment and try again.');
          setIsProcessing(false);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          setError('Card element not found. Please refresh the page and try again.');
          setIsProcessing(false);
          return;
        }
        const confirmOptions = {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingName,
              email: email,
              address: {
                line1: billingAddress,
                city: billingCity,
                state: billingState,
                postal_code: billingZip,
                country: billingCountry,
              },
            },
          },
        };
        const result = await stripe.confirmCardPayment(piData.clientSecret, confirmOptions);
        stripeError = result.error ?? undefined;
        paymentIntent = result.paymentIntent ?? null;
      }

      if (stripeError) {
        setError(stripeError.message ?? 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // If savePaymentMethod is enabled, verify the payment method is attached
        // Note: With setup_future_usage: 'off_session', Stripe automatically attaches the payment method
        // We just need to verify it worked and set it as default if needed
        if (savePaymentMethod && paymentIntent.payment_method) {
          try {
            const pmId = typeof paymentIntent.payment_method === 'string' 
              ? paymentIntent.payment_method 
              : paymentIntent.payment_method.id;

            if (pmId) {
              // Verify and ensure payment method is properly attached
              // The payment method should already be attached due to setup_future_usage,
              // but we'll verify and set as default if needed
              const verifyResponse = await fetch(`/api/payment-intent/${paymentIntent.id}/verify-payment-method`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  paymentMethodId: pmId,
                }),
              });

              const verifyResult = await verifyResponse.json();
              if (!verifyResult.success) {
                console.warn('Payment method verification failed:', verifyResult.error);
                // Don't fail the payment, just log the warning
              } else {
                console.log('Payment method saved and verified successfully');
              }
            }
          } catch (verifyError) {
            console.error('Error verifying payment method:', verifyError);
            // Don't fail the payment, just log the error
          }
        }

        setSuccess(true);
        clearCart();
        onOrderComplete();
        
        // Redirect to success page after a short delay
        setTimeout(() => {
          router.push(`/checkout-success?session_id=${paymentIntent.id}`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        '::placeholder': {
          color: 'rgba(255, 255, 255, 0.4)',
        },
      },
      invalid: {
        color: '#ff5e62',
        iconColor: '#ff5e62',
      },
    },
    hidePostalCode: true, // Hide ZIP code field since we collect it separately
  };

  return (
    <form onSubmit={handleSubmit}>
      {!isFreeOrder && waitingForPaymentMethods && (
        <FormGroup>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 0', color: 'rgba(255,255,255,0.8)' }}>
            <LoadingSpinner />
            <span>Loading payment methods...</span>
          </div>
        </FormGroup>
      )}

      {!isFreeOrder && !waitingForPaymentMethods && hasSavedMethods && (
        <FormGroup>
          <Label>Payment method</Label>
          {savedPaymentMethods.map((pm) => (
            <PaymentMethodOption
              key={pm.id}
              $selected={!useOtherPaymentMethod && selectedSavedPmId === pm.id}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={!useOtherPaymentMethod && selectedSavedPmId === pm.id}
                onChange={() => {
                  setUseOtherPaymentMethod(false);
                  setSelectedSavedPmId(pm.id);
                }}
              />
              <PaymentMethodLabel>
                {pm.card?.brand?.toUpperCase() ?? 'CARD'} •••• {pm.card?.last4 ?? '****'}
                {pm.isDefault && ' (default)'}
              </PaymentMethodLabel>
            </PaymentMethodOption>
          ))}
          <PaymentMethodOption $selected={useOtherPaymentMethod}>
            <input
              type="radio"
              name="paymentMethod"
              checked={useOtherPaymentMethod}
              onChange={() => setUseOtherPaymentMethod(true)}
            />
            <UseOtherLabel>Use other payment method</UseOtherLabel>
          </PaymentMethodOption>
        </FormGroup>
      )}

      {!isFreeOrder && !waitingForPaymentMethods && payingWithSavedCard && (() => {
        const selectedPm = savedPaymentMethods.find((pm) => pm.id === selectedSavedPmId);
        const bd = selectedPm?.billing_details;
        const addr = bd?.address;
        const hasAny = bd?.name || addr?.line1 || addr?.city || addr?.state || addr?.postal_code || addr?.country;
        if (!hasAny) return null;
        return (
          <FormGroup>
            <Label>Billing address on file</Label>
            <SavedCardBilling>
              {bd?.name && <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{bd.name}</div>}
              {addr?.line1 && <div>{addr.line1}</div>}
              {addr?.line2 && <div>{addr.line2}</div>}
              {(addr?.city || addr?.state || addr?.postal_code) && (
                <div>
                  {[addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')}
                </div>
              )}
              {addr?.country && <div>{addr.country}</div>}
            </SavedCardBilling>
          </FormGroup>
        );
      })()}

      {!waitingForPaymentMethods && (
        <>
      <FormGroup>
        <Label>Email Address *</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => updateBillingField('email', e.target.value)}
          placeholder="your@email.com"
          required
          readOnly={!!user?.email}
          disabled={!!user?.email}
        />
        {user?.email && (
          <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem', display: 'block' }}>
            Using your account email
          </span>
        )}
      </FormGroup>

      {!isFreeOrder && showBillingAndCard && (
        <>
          <FormGroup>
            <Label>Billing Name *</Label>
            <Input
              type="text"
              value={billingName}
              onChange={(e) => updateBillingField('billingName', e.target.value)}
              placeholder="Full name on card"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Billing Address *</Label>
            <Input
              type="text"
              value={billingAddress}
              onChange={(e) => updateBillingField('billingAddress', e.target.value)}
              placeholder="Street address"
              required
            />
          </FormGroup>

          <FormRow>
            <FormGroup>
              <Label>City *</Label>
              <Input
                type="text"
                value={billingCity}
                onChange={(e) => updateBillingField('billingCity', e.target.value)}
                placeholder="City"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>State *</Label>
              <SearchableSelect
                value={billingState}
                onChange={(v) => updateBillingField("billingState", v)}
                options={getStateOptions(billingCountry)}
                placeholder="State or region"
                required
                allowCustomValue
                getLabelForValue={(v) =>
                  getStateOptions(billingCountry).find((o) => o.value === v || o.label === v)?.label ?? v
                }
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label>ZIP Code *</Label>
              <Input
                type="text"
                value={billingZip}
                onChange={(e) => updateBillingField('billingZip', e.target.value)}
                placeholder="ZIP"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Country *</Label>
              <SearchableSelect
                value={billingCountry}
                onChange={(v) => updateBillingField("billingCountry", v)}
                options={COUNTRIES}
                placeholder="Country"
                required
                getLabelForValue={(v) => COUNTRIES.find((c) => c.value === v)?.label}
              />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label>Card Information *</Label>
            <CardElementContainer>
              <CardElement options={cardElementOptions} />
            </CardElementContainer>
          </FormGroup>

          <FormGroup>
            <SaveCardCheckbox>
              <input
                type="checkbox"
                id="saveCard"
                checked={savePaymentMethod}
                onChange={(e) => setSavePaymentMethod(e.target.checked)}
              />
              <label htmlFor="saveCard">
                Save this card for future purchases
              </label>
            </SaveCardCheckbox>
            <SaveCardNote>
              Your card will be securely stored by Stripe for faster checkout next time
            </SaveCardNote>
          </FormGroup>
        </>
      )}
        </>
      )}

      {error && (
        <ErrorMessage>
          <FaExclamationCircle />
          {error}
        </ErrorMessage>
      )}

      {success && (
        <SuccessMessage>
          <FaCheckCircle />
          {isFreeOrder ? 'Order successful! Redirecting...' : 'Payment successful! Redirecting...'}
        </SuccessMessage>
      )}

      <PayButton
        type="submit"
        disabled={
          !stripe ||
          isProcessing ||
          (waitingForPaymentMethods && !!user?.profile?.customer_id) ||
          (!isFreeOrder && !payingWithSavedCard && !clientSecret)
        }
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isProcessing ? (
          <>
            <LoadingSpinner />
            Processing...
          </>
        ) : (
          <>
            <FaLock />
            {finalTotal === 0 ? 'Complete Order' : `Pay $${displayTotal.toFixed(2)}`}
          </>
        )}
      </PayButton>

      {!isFreeOrder && (
        <SecurityNotice>
          <SecurityText>
            <FaShieldAlt />
            <span>Your payment information is encrypted and secure. We never store your card details.</span>
          </SecurityText>
          <StripeBadge>
            <StripeLogoContainer>
              <StripeLogoImage 
                src="/stripe.webp" 
                alt="Stripe" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <StripeLogoText>
                Powered by <span className="stripe-name">Stripe</span> • Secure checkout
              </StripeLogoText>
            </StripeLogoContainer>
          </StripeBadge>
        </SecurityNotice>
      )}
    </form>
  );
}

// Promo Code Component for Sidebar
function PromoCodeSection({ 
  total, 
  appliedPromo, 
  onPromoApplied, 
  onPromoRemoved 
}: { 
  total: number; 
  appliedPromo: { code: string; discount: { amount: number; percent: number }; promotionCodeId: string } | null;
  onPromoApplied: (promo: { code: string; discount: { amount: number; percent: number }; promotionCodeId: string }) => void;
  onPromoRemoved: () => void;
}) {
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeError('Please enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    setPromoCodeError(null);

    try {
      const response = await fetch('/api/promo-code/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoCode.trim(),
          amount: total,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onPromoApplied({
          code: data.promotionCode.code,
          discount: data.discount,
          promotionCodeId: data.promotionCode.id,
        });
        setPromoCode('');
      } else {
        setPromoCodeError(data.error || 'Invalid promo code');
      }
    } catch (err: any) {
      setPromoCodeError(err.message || 'Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  return (
    <PromoCodeContainerSidebar>
      <PromoCodeLabel>Promo Code</PromoCodeLabel>
      {appliedPromo ? (
        <PromoCodeSuccess>
          <span>
            ✓ {appliedPromo.code} ({appliedPromo.discount.percent > 0 
              ? `${appliedPromo.discount.percent}% off` 
              : `$${appliedPromo.discount.amount.toFixed(2)} off`})
          </span>
          <RemovePromoButton type="button" onClick={onPromoRemoved}>
            Remove
          </RemovePromoButton>
        </PromoCodeSuccess>
      ) : (
        <>
          <PromoCodeInputGroup>
            <PromoCodeInput
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase());
                setPromoCodeError(null);
              }}
              placeholder="Enter code"
              disabled={isValidatingPromo}
            />
            <ApplyButton
              type="button"
              onClick={handleApplyPromoCode}
              disabled={isValidatingPromo || !promoCode.trim()}
            >
              {isValidatingPromo ? '...' : 'Apply'}
            </ApplyButton>
          </PromoCodeInputGroup>
          {promoCodeError && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#ff5e62' }}>
              {promoCodeError}
            </div>
          )}
        </>
      )}
    </PromoCodeContainerSidebar>
  );
}

export default function CheckoutPage() {
  const { items, getTotal, isLoaded: cartLoaded } = useCart();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const total = getTotal();
  const [appliedDiscount, setAppliedDiscount] = useState<{ amount: number; percent: number; code: string } | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: { amount: number; percent: number }; promotionCodeId: string } | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);

  // Billing fields state - moved to parent to persist across component remounts
  const [billingFields, setBillingFields] = useState({
    email: user?.email || '',
    billingName: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCountry: 'US',
  });
  
  // Update email when user changes
  useEffect(() => {
    if (user?.email && !billingFields.email) {
      setBillingFields(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user, billingFields.email]);

  // Fetch saved payment methods when user has a Stripe customer
  useEffect(() => {
    if (!user?.profile?.customer_id) {
      setSavedPaymentMethods([]);
      setPaymentMethodsLoading(false);
      return;
    }
    setPaymentMethodsLoading(true);
    fetch('/api/payment-methods')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.paymentMethods)) {
          setSavedPaymentMethods(
            data.paymentMethods.map((pm: SavedPaymentMethod) => ({
              id: pm.id,
              card: pm.card,
              isDefault: pm.isDefault,
              billing_details: pm.billing_details ?? null,
            }))
          );
        }
      })
      .catch(() => setSavedPaymentMethods([]))
      .finally(() => setPaymentMethodsLoading(false));
  }, [user?.profile?.customer_id]);

  // Redirect if cart is empty (only after cart has loaded from localStorage)
  useEffect(() => {
    if (cartLoaded && items.length === 0 && !orderComplete) {
      router.push('/cart');
    }
  }, [cartLoaded, items, router, orderComplete]);

  // Fire InitiateCheckout once per checkout page visit (for users who land here via bundle redirect or direct link)
  const initiateCheckoutFired = useRef(false);
  useEffect(() => {
    if (!cartLoaded || items.length === 0 || initiateCheckoutFired.current) return;
    initiateCheckoutFired.current = true;
    const cartTotal = getTotal();
    trackInitiateCheckout({
      value: cartTotal,
      currency: "USD",
      content_ids: items.map((i) => i.id),
      num_items: items.reduce((n, i) => n + i.quantity, 0),
    });
  }, [cartLoaded, items, getTotal]);

  // Skeleton until cart loaded, auth loaded, and we have items. (Subscription waits for bundle fetch; we wait for cart + auth so we know if user has customer_id before rendering form.)
  if (!cartLoaded || authLoading || (cartLoaded && items.length === 0 && !orderComplete)) {
    return <CheckoutPageSkeleton />;
  }

  const finalTotal = Math.max(appliedDiscount ? total - appliedDiscount.amount : total, 0);
  // Apply Stripe minimum: if total is between $0 and $0.50, charge $0.50
  const displayTotal = finalTotal > 0 && finalTotal < 0.50 ? 0.50 : finalTotal;

  return (
    <Container>
      <Content>
        <BreadcrumbContainer>
          <BreadcrumbList>
            <BreadcrumbLink href="/">
              <FaHome size={14} />
              <span>Home</span>
            </BreadcrumbLink>
            <BreadcrumbSeparator>
              <FaChevronRight size={10} />
            </BreadcrumbSeparator>
            <BreadcrumbLink href="/cart">Cart</BreadcrumbLink>
            <BreadcrumbSeparator>
              <FaChevronRight size={10} />
            </BreadcrumbSeparator>
            <BreadcrumbCurrent>Checkout</BreadcrumbCurrent>
          </BreadcrumbList>
        </BreadcrumbContainer>

        <Title>Checkout</Title>

        <CheckoutContainer>
          <CheckoutForm>
            <SectionTitle>Payment Details</SectionTitle>
            <Elements stripe={stripePromise} key="checkout-elements">
              <PaymentForm 
                items={items} 
                total={total}
                appliedPromo={appliedPromo}
                onOrderComplete={() => setOrderComplete(true)}
                billingFields={billingFields}
                onBillingFieldsChange={setBillingFields}
                savedPaymentMethods={savedPaymentMethods}
                paymentMethodsLoading={paymentMethodsLoading}
              />
            </Elements>
          </CheckoutForm>

          <OrderSummary>
            <SectionTitle>Order Summary</SectionTitle>
            
            <PromoCodeSection
              total={total}
              appliedPromo={appliedPromo}
              onPromoApplied={(promo) => {
                setAppliedPromo(promo);
                setAppliedDiscount({
                  amount: promo.discount.amount,
                  percent: promo.discount.percent,
                  code: promo.code,
                });
              }}
              onPromoRemoved={() => {
                setAppliedPromo(null);
                setAppliedDiscount(null);
              }}
            />
            
            {items.map((item) => {
              const displayPrice = (item.sale_price !== null && item.sale_price !== undefined) ? item.sale_price : item.price;
              const itemTotal = displayPrice * item.quantity;
              
              return (
                <OrderItem key={item.id}>
                  <OrderItemImage>
                    {(item.featured_image_url || item.logo_url) ? (
                      <Image
                        src={(item.featured_image_url || item.logo_url) as string}
                        alt={item.name}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: 'rgba(255, 255, 255, 0.3)'
                      }}>
                        {item.name[0]}
                      </div>
                    )}
                  </OrderItemImage>
                  <OrderItemDetails>
                    <OrderItemName>{item.name}</OrderItemName>
                    <OrderItemQuantity>Qty: {item.quantity}</OrderItemQuantity>
                    <OrderItemPrice>
                      {displayPrice === 0 || displayPrice === null ? (
                        'FREE'
                      ) : (
                        `$${itemTotal.toFixed(2)}`
                      )}
                    </OrderItemPrice>
                  </OrderItemDetails>
                </OrderItem>
              );
            })}

              {appliedDiscount && (
                <>
                  <SummaryRow>
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </SummaryRow>
                  <SummaryRow>
                    <span>Discount ({appliedDiscount.code})</span>
                    <span style={{ color: '#4ecdc4' }}>
                      -${appliedDiscount.amount.toFixed(2)}
                    </span>
                  </SummaryRow>
                </>
              )}
              <SummaryTotal>
                <span>Total</span>
                <span>
                  {finalTotal === 0 ? 'FREE' : `$${displayTotal.toFixed(2)}`}
                </span>
              </SummaryTotal>
          </OrderSummary>
        </CheckoutContainer>
      </Content>
    </Container>
  );
}
