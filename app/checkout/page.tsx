"use client";

import React, { useState, useEffect } from "react";
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
  position: sticky;
  top: 140px;
  
  @media (max-width: 968px) {
    position: relative;
    top: 0;
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

// Payment Form Component
function PaymentForm({ items, total, appliedPromo }: { items: any[]; total: number; appliedPromo: { code: string; discount: { amount: number; percent: number }; promotionCodeId: string } | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clearCart } = useCart();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // Billing information
  const [email, setEmail] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingCountry, setBillingCountry] = useState('US');

  // Set email from user if logged in
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Create payment intent on mount or when promo code changes
  useEffect(() => {
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
          }),
        });

        const data = await response.json();

        if (data.success) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || 'Failed to initialize payment');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize payment');
      }
    }

    if (items.length > 0) {
      createPaymentIntent();
    }
  }, [items, appliedPromo]);

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
        setAppliedPromo({
          code: data.promotionCode.code,
          discount: data.discount,
          promotionCodeId: data.promotionCode.id,
        });
        onPromoCodeApplied({
          amount: data.discount.amount,
          percent: data.discount.percent,
          code: data.promotionCode.code,
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

  const handleRemovePromoCode = () => {
    setAppliedPromo(null);
    onPromoCodeApplied(null);
    setPromoCodeError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Validate required fields
    if (!email.trim()) {
      setError('Email address is required');
      setIsProcessing(false);
      return;
    }

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

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
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
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setSuccess(true);
        clearCart();
        
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
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormGroup>
        <Label>Email Address *</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

      <FormGroup>
        <Label>Billing Name *</Label>
        <Input
          type="text"
          value={billingName}
          onChange={(e) => setBillingName(e.target.value)}
          placeholder="Full name on card"
          required
        />
      </FormGroup>

      <FormGroup>
        <Label>Billing Address *</Label>
        <Input
          type="text"
          value={billingAddress}
          onChange={(e) => setBillingAddress(e.target.value)}
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
            onChange={(e) => setBillingCity(e.target.value)}
            placeholder="City"
            required
          />
        </FormGroup>
        <FormGroup>
          <Label>State *</Label>
          <Input
            type="text"
            value={billingState}
            onChange={(e) => setBillingState(e.target.value)}
            placeholder="State"
            required
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>ZIP Code *</Label>
          <Input
            type="text"
            value={billingZip}
            onChange={(e) => setBillingZip(e.target.value)}
            placeholder="ZIP"
            required
          />
        </FormGroup>
        <FormGroup>
          <Label>Country *</Label>
          <Input
            type="text"
            value={billingCountry}
            onChange={(e) => setBillingCountry(e.target.value)}
            placeholder="Country"
            required
          />
        </FormGroup>
      </FormRow>

      <FormGroup>
        <Label>Card Information *</Label>
        <CardElementContainer>
          <CardElement options={cardElementOptions} />
        </CardElementContainer>
      </FormGroup>

      {error && (
        <ErrorMessage>
          <FaExclamationCircle />
          {error}
        </ErrorMessage>
      )}

      {success && (
        <SuccessMessage>
          <FaCheckCircle />
          Payment successful! Redirecting...
        </SuccessMessage>
      )}

      <PayButton
        type="submit"
        disabled={!stripe || isProcessing || !clientSecret}
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
            Pay ${(appliedPromo ? total - appliedPromo.discount.amount : total).toFixed(2)}
          </>
        )}
      </PayButton>

      <SecurityNotice>
        <SecurityText>
          <FaShieldAlt />
          <span>Your payment information is encrypted and secure. We never store your card details.</span>
        </SecurityText>
        <StripeBadge>
          <StripeLogoContainer>
            <StripeLogoImage 
              src="/stripe.png" 
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
  const { items, getTotal } = useCart();
  const router = useRouter();
  const total = getTotal();
  const [appliedDiscount, setAppliedDiscount] = useState<{ amount: number; percent: number; code: string } | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: { amount: number; percent: number }; promotionCodeId: string } | null>(null);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);

  if (items.length === 0) {
    return null;
  }

  const finalTotal = appliedDiscount ? total - appliedDiscount.amount : total;

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
            <Elements stripe={stripePromise}>
              <PaymentForm 
                items={items} 
                total={total} 
                onPromoCodeApplied={(discount) => {
                  setAppliedDiscount(discount);
                  if (discount) {
                    // Find the promo code from the discount code
                    // This is a bit of a workaround - we'll need to pass the full promo object
                  }
                }}
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
              const displayPrice = item.sale_price || item.price;
              const itemTotal = displayPrice * item.quantity;
              
              return (
                <OrderItem key={item.id}>
                  <OrderItemImage>
                    {(item.featured_image_url || item.logo_url) ? (
                      <Image
                        src={item.featured_image_url || item.logo_url}
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
                {finalTotal === 0 ? 'FREE' : `$${finalTotal.toFixed(2)}`}
              </span>
            </SummaryTotal>
          </OrderSummary>
        </CheckoutContainer>
      </Content>
    </Container>
  );
}
