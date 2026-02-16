"use client";

/**
 * @fileoverview Bundle checkout page with embedded payment (Stripe Elements).
 * Same flow as regular cart checkout: billing fields + Card element on-site,
 * no redirect to Stripe. Uses PaymentIntent (lifetime) or Subscription first
 * invoice PI (monthly/annual).
 * @module app/checkout/bundle
 */

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import {
  FaHome,
  FaChevronRight,
  FaLock,
  FaCheckCircle,
  FaExclamationCircle,
  FaShieldAlt,
} from "react-icons/fa";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

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

const SubscriptionBadge = styled.span`
  display: inline-block;
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.35), rgba(75, 0, 130, 0.35));
  border: 1px solid rgba(138, 43, 226, 0.6);
  color: #c4b5fd;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
`;

const PlanSummary = styled.div`
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 1.5rem;
`;

const PlanName = styled.div`
  font-weight: 600;
  color: white;
  font-size: 1.1rem;
`;

const PlanTier = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
  margin-top: 0.25rem;
`;

const RecurringNotice = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(138, 43, 226, 0.08);
  border: 1px solid rgba(138, 43, 226, 0.25);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
  line-height: 1.5;
`;

const SubmitButton = styled(motion.button)`
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
    to {
      transform: rotate(360deg);
    }
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

const SummaryItem = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const SummaryImage = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
`;

const SummaryDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const SummaryName = styled.div`
  font-weight: 600;
  color: white;
  margin-bottom: 0.25rem;
  font-size: 1rem;
`;

const SummaryPlan = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
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

const SecurityNotice = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
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
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 0.75rem;
`;

const StripeLogoText = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;

  .stripe-name {
    color: #635bff;
    font-weight: 600;
  }
`;

type TierKey = "monthly" | "annual" | "lifetime";

const TIER_LABELS: Record<TierKey, string> = {
  monthly: "Monthly",
  annual: "Annual",
  lifetime: "Lifetime",
};

function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return "N/A";
  if (price === 0) return "FREE";
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (n % 1 === 0) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(2)}`;
}

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
  hidePostalCode: true,
};

type BillingFields = {
  email: string;
  billingName: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
};

function BundlePaymentForm({
  bundleSlug,
  tier,
  bundle,
  billingFields,
  onBillingFieldsChange,
}: {
  bundleSlug: string;
  tier: TierKey;
  bundle: {
    name: string;
    slug: string;
    featured_image_url?: string;
    logo_url?: string;
    pricing: {
      monthly?: { price: number; sale_price?: number };
      annual?: { price: number; sale_price?: number };
      lifetime?: { price: number; sale_price?: number };
    };
  };
  billingFields: BillingFields;
  onBillingFieldsChange: (f: BillingFields) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    email,
    billingName,
    billingAddress,
    billingCity,
    billingState,
    billingZip,
    billingCountry,
  } = billingFields;

  const update = (field: keyof BillingFields, value: string) => {
    onBillingFieldsChange({ ...billingFields, [field]: value });
  };

  const displayPrice =
    bundle.pricing[tier]?.sale_price ?? bundle.pricing[tier]?.price ?? 0;
  const isSubscription = tier === "monthly" || tier === "annual";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError("Payment could not be initialized. Please refresh.");
      return;
    }

    const requiredEmail = email?.trim();
    if (!requiredEmail) {
      setError("Email address is required");
      return;
    }
    if (!billingName.trim()) {
      setError("Billing name is required");
      return;
    }
    if (!billingAddress.trim()) {
      setError("Billing address is required");
      return;
    }
    if (!billingCity.trim()) {
      setError("City is required");
      return;
    }
    if (!billingState.trim()) {
      setError("State is required");
      return;
    }
    if (!billingZip.trim()) {
      setError("ZIP code is required");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found. Please refresh.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const setupRes = await fetch("/api/bundles/checkout/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundle_slug: bundleSlug,
          tier,
          email: requiredEmail,
          ...(user?.profile?.customer_id && {
            customerId: user.profile.customer_id,
          }),
        }),
      });

      const setupData = await setupRes.json();
      if (!setupRes.ok || !setupData.clientSecret) {
        setError(setupData.error || "Failed to initialize payment");
        setIsProcessing(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmCardPayment(
        setupData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingName,
              email: requiredEmail,
              address: {
                line1: billingAddress,
                city: billingCity,
                state: billingState,
                postal_code: billingZip,
                country: billingCountry,
              },
            },
          },
        }
      );

      if (confirmError) {
        setError(confirmError.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(
          `/checkout-success?session_id=${setupData.paymentIntentId}`
        );
      }, 800);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PlanSummary>
        {isSubscription && <SubscriptionBadge>Subscription</SubscriptionBadge>}
        <PlanName>{bundle.name}</PlanName>
        <PlanTier>
          {isSubscription ? (
            <>
              <strong>{TIER_LABELS[tier]} subscription</strong>
              {tier === "monthly"
                ? " — You'll be charged every month until you cancel."
                : " — You'll be charged every year until you cancel."}
            </>
          ) : (
            <>Lifetime access — one-time payment, yours forever.</>
          )}
        </PlanTier>
        {isSubscription && (
          <RecurringNotice>
            Your card will be charged {tier === "monthly" ? "monthly" : "annually"}. You can cancel anytime from your account.
          </RecurringNotice>
        )}
      </PlanSummary>

      <FormGroup>
        <Label>Email address *</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="your@email.com"
          required
          readOnly={!!user?.email}
          disabled={!!user?.email}
        />
        {user?.email && (
          <span
            style={{
              fontSize: "0.85rem",
              color: "rgba(255, 255, 255, 0.6)",
              marginTop: "0.25rem",
              display: "block",
            }}
          >
            Using your account email
          </span>
        )}
      </FormGroup>

      <FormGroup>
        <Label>Billing name *</Label>
        <Input
          type="text"
          value={billingName}
          onChange={(e) => update("billingName", e.target.value)}
          placeholder="Full name on card"
          required
        />
      </FormGroup>

      <FormGroup>
        <Label>Billing address *</Label>
        <Input
          type="text"
          value={billingAddress}
          onChange={(e) => update("billingAddress", e.target.value)}
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
            onChange={(e) => update("billingCity", e.target.value)}
            placeholder="City"
            required
          />
        </FormGroup>
        <FormGroup>
          <Label>State *</Label>
          <Input
            type="text"
            value={billingState}
            onChange={(e) => update("billingState", e.target.value)}
            placeholder="State"
            required
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>ZIP code *</Label>
          <Input
            type="text"
            value={billingZip}
            onChange={(e) => update("billingZip", e.target.value)}
            placeholder="ZIP"
            required
          />
        </FormGroup>
        <FormGroup>
          <Label>Country *</Label>
          <Input
            type="text"
            value={billingCountry}
            onChange={(e) => update("billingCountry", e.target.value)}
            placeholder="Country"
            required
          />
        </FormGroup>
      </FormRow>

      <FormGroup>
        <Label>Card information *</Label>
        <CardElementContainer>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
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

      <SubmitButton
        type="submit"
        disabled={!stripe || isProcessing}
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
            {isSubscription
              ? `Start ${tier === "monthly" ? "monthly" : "annual"} subscription — ${formatPrice(displayPrice)}/${tier === "monthly" ? "mo" : "yr"}`
              : `Pay ${formatPrice(displayPrice)}`}
          </>
        )}
      </SubmitButton>

      <SecurityNotice>
        <SecurityText>
          <FaShieldAlt />
          <span>
            Your payment information is encrypted and secure. We never store
            your card details.
          </span>
        </SecurityText>
        <StripeBadge>
          <StripeLogoText>
            Powered by <span className="stripe-name">Stripe</span> • Secure
            checkout
          </StripeLogoText>
        </StripeBadge>
      </SecurityNotice>
    </form>
  );
}

export default function BundleCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { addItem } = useCart();

  const bundleSlug = searchParams.get("bundle_slug");
  const tierParam = searchParams.get("tier") as TierKey | null;

  const [bundle, setBundle] = useState<{
    id: string;
    name: string;
    slug: string;
    featured_image_url?: string;
    logo_url?: string;
    pricing: {
      monthly?: { price: number; sale_price?: number };
      annual?: { price: number; sale_price?: number };
      lifetime?: { price: number; sale_price?: number };
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingFields, setBillingFields] = useState<BillingFields>({
    email: "",
    billingName: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "US",
  });

  const tier: TierKey | null =
    tierParam && ["monthly", "annual", "lifetime"].includes(tierParam)
      ? tierParam
      : null;

  useEffect(() => {
    if (user?.email && !billingFields.email) {
      setBillingFields((prev) => ({ ...prev, email: user.email || "" }));
    }
  }, [user, billingFields.email]);

  useEffect(() => {
    if (!bundleSlug || !tier) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bundles/${bundleSlug}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.bundle) setBundle(data.bundle);
      } catch {
        if (!cancelled) setBundle(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bundleSlug, tier]);

  useEffect(() => {
    if (!loading && (!bundleSlug || !tier || !bundle)) {
      router.replace("/bundles");
    }
  }, [loading, bundleSlug, tier, bundle, router]);

  // Lifetime uses the regular cart checkout flow: add to cart and go to /checkout
  const lifetimeRedirectDone = React.useRef(false);
  useEffect(() => {
    if (lifetimeRedirectDone.current || loading || !bundle || tier !== "lifetime") return;
    const lifetime = bundle.pricing?.lifetime;
    if (!lifetime) return;
    lifetimeRedirectDone.current = true;
    addItem(
      {
        id: bundle.id,
        name: bundle.name,
        slug: bundle.slug,
        price: lifetime.price ?? 0,
        sale_price: lifetime.sale_price ?? undefined,
        featured_image_url: bundle.featured_image_url,
        logo_url: bundle.logo_url,
      },
      { openCart: false }
    );
    router.replace("/checkout");
  }, [loading, bundle, tier, addItem, router]);

  if (loading || !bundleSlug || !tier) {
    return (
      <Container>
        <Content>
          <Title>Loading...</Title>
        </Content>
      </Container>
    );
  }

  if (!bundle) {
    return null;
  }

  // Lifetime uses cart checkout; we redirect in useEffect — show brief message
  if (tier === "lifetime") {
    return (
      <Container>
        <Content>
          <Title>Taking you to checkout...</Title>
          <p style={{ color: "rgba(255,255,255,0.7)" }}>
            Adding bundle to cart and redirecting to checkout.
          </p>
        </Content>
      </Container>
    );
  }

  const tierPricing = bundle.pricing[tier];
  const displayPrice = tierPricing?.sale_price ?? tierPricing?.price ?? 0;

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
            <BreadcrumbLink href="/bundles">Bundles</BreadcrumbLink>
            <BreadcrumbSeparator>
              <FaChevronRight size={10} />
            </BreadcrumbSeparator>
            <BreadcrumbLink href={`/bundles/${bundle.slug}`}>
              {bundle.name}
            </BreadcrumbLink>
            <BreadcrumbSeparator>
              <FaChevronRight size={10} />
            </BreadcrumbSeparator>
            <BreadcrumbCurrent>Checkout</BreadcrumbCurrent>
          </BreadcrumbList>
        </BreadcrumbContainer>

        <Title>Checkout</Title>

        <CheckoutContainer>
          <CheckoutForm>
            <SectionTitle>
              {(tier === "monthly" || tier === "annual")
                ? "Subscription & payment details"
                : "Payment details"}
            </SectionTitle>
            <Elements stripe={stripePromise} key="bundle-checkout-elements">
              <BundlePaymentForm
                bundleSlug={bundleSlug}
                tier={tier}
                bundle={bundle}
                billingFields={billingFields}
                onBillingFieldsChange={setBillingFields}
              />
            </Elements>
          </CheckoutForm>

          <OrderSummary>
            <SectionTitle>Order summary</SectionTitle>
            <SummaryItem>
              <SummaryImage>
                {(bundle.featured_image_url || bundle.logo_url) ? (
                  <Image
                    src={
                      (bundle.featured_image_url || bundle.logo_url) as string
                    }
                    alt={bundle.name}
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
                      fontSize: "1.5rem",
                      color: "rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    {bundle.name[0]}
                  </div>
                )}
              </SummaryImage>
              <SummaryDetails>
                <SummaryName>{bundle.name}</SummaryName>
                <SummaryPlan>
                  {tier === "monthly" || tier === "annual"
                    ? `${TIER_LABELS[tier]} subscription`
                    : "Lifetime access"}
                </SummaryPlan>
                {(tier === "monthly" || tier === "annual") && (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "rgba(255, 255, 255, 0.5)",
                      display: "block",
                      marginTop: "0.25rem",
                    }}
                  >
                    Billed {tier === "monthly" ? "every month" : "every year"}
                  </span>
                )}
              </SummaryDetails>
            </SummaryItem>
            <SummaryTotal>
              <span>{tier === "monthly" || tier === "annual" ? "Due today" : "Total"}</span>
              <span>{formatPrice(displayPrice)}{tier === "monthly" ? "/mo" : tier === "annual" ? "/yr" : ""}</span>
            </SummaryTotal>
          </OrderSummary>
        </CheckoutContainer>
      </Content>
    </Container>
  );
}
