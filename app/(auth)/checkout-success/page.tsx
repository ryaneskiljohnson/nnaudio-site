"use client";
import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";
import NNAudioLogo from "@/components/common/NNAudioLogo";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  trackUserData,
  hashEmail,
  trackEventOnce,
  shouldFireEvent,
} from "@/utils/analytics";
import { refreshSubscriptionByCustomerId } from "@/app/actions/checkout";

const PageContainer = styled.div`
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: var(--background);
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 30% 50%,
        rgba(108, 99, 255, 0.15),
        transparent 50%
      ),
      radial-gradient(
        circle at 70% 30%,
        rgba(78, 205, 196, 0.15),
        transparent 50%
      ),
      radial-gradient(
        circle at 40% 70%,
        rgba(108, 99, 255, 0.1),
        transparent 40%
      );
    z-index: 0;
  }
`;

const HeaderNav = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  width: 100%;
`;

const ContentContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8rem 2rem 4rem;
  max-width: 1200px;
  width: 100%;
  z-index: 1;
`;

const SuccessIcon = styled(FaCheckCircle)`
  color: var(--success);
  font-size: 5rem;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.6rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #8a2be2 0%, #4ecdc4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.02em;
  text-shadow: 0 10px 35px rgba(0, 0, 0, 0.35);
`;

const Subtitle = styled.h2`
  font-size: 1.35rem;
  font-weight: 500;
  margin-bottom: 1.75rem;
  color: rgba(255, 255, 255, 0.85);
`;

const Message = styled.p`
  font-size: 1.05rem;
  line-height: 1.65;
  margin-bottom: 2rem;
  max-width: 820px;
  color: rgba(255, 255, 255, 0.8);
`;

const BackButton = styled.button`
  padding: 14px 28px;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 40%, #4ecdc4 100%);
  color: white;
  border: none;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 2.2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.45);
  }
`;

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const isSignedUp = searchParams.get("isSignedUp") === "true";
  const isTrial = searchParams.get("isTrial") === "true";
  const isLifetime = searchParams.get("isLifetime") === "true";
  const isLoggedIn = !!user;
  const sessionId = searchParams.get("session_id");
  const valueParam = searchParams.get("value");
  const currencyParam = searchParams.get("currency");
  const [subscriptionValue, setSubscriptionValue] = useState<number | null>(
    valueParam ? parseFloat(valueParam) : null
  );
  const [subscriptionCurrency, setSubscriptionCurrency] = useState<string>(
    currencyParam || "USD"
  );

  // Ref to track if we've already fired the analytics event
  const hasTrackedEvent = useRef(false);

  // Refresh pro status on mount (same as login and dashboard pages)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]); // Run on mount and when refreshUser changes

  // Refresh subscription status by customer ID (works even if not logged in)
  useEffect(() => {
    const refreshByCustomerId = async () => {
      if (!sessionId) return;

      try {
        // Fetch session details to get customer ID
        const response = await fetch(
          `/api/checkout-session-details?session_id=${sessionId}`
        );
        const data = await response.json();

        if (data.success && data.customerId) {
          // Call server action to refresh subscription status
          const result = await refreshSubscriptionByCustomerId(data.customerId);

          if (result.success) {
            console.log(
              "[Checkout Success] Refreshed subscription status for customer:",
              data.customerId,
              "subscription:",
              result.subscription
            );

            // If user is logged in, also refresh their context
            if (isLoggedIn && refreshUser) {
              await refreshUser();
            }
          } else {
            console.error(
              "[Checkout Success] Failed to refresh subscription:",
              result.error
            );
          }
        }
      } catch (error) {
        console.error(
          "[Checkout Success] Error refreshing subscription by customer ID:",
          error
        );
      }
    };

    refreshByCustomerId();
  }, [sessionId, isLoggedIn, refreshUser]);

  // Track promotion conversion
  useEffect(() => {
    const trackPromotionConversion = async () => {
      // Only track for paid subscriptions and lifetime (not free trials)
      if (!isTrial && subscriptionValue && subscriptionValue > 0) {
        try {
          // Get active promotion
          const response = await fetch("/api/promotions/active?plan=lifetime");
          const data = await response.json();

          if (data.success && data.promotion) {
            // Track conversion
            await fetch("/api/promotions/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                promotion_id: data.promotion.id,
                type: "conversion",
                value: subscriptionValue,
              }),
            });
          }
        } catch (error) {
          console.error("Error tracking promotion conversion:", error);
        }
      }
    };

    trackPromotionConversion();
  }, [isTrial, subscriptionValue]);

  // Track dataLayer events with user data (with deduplication)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only track once
    if (hasTrackedEvent.current) return;
    hasTrackedEvent.current = true;

    // Get user data (extracted once to avoid dependency issues)
    const userId = user?.id || user?.profile?.id;
    const userEmail = user?.email || user?.profile?.email;

    // Helper function to track event with user data and deduplication
    const trackEventWithUserData = async (
      eventName: string,
      eventData: Record<string, any> = {}
    ) => {
      // Use session_id as event ID for deduplication, or generate one
      const eventId = sessionId || `${eventName}_${Date.now()}`;

      // Check if event should fire (deduplication check)
      if (!shouldFireEvent(eventName, eventId)) {
        return; // Event already fired, skip
      }

      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];

      // Track user data first (only once per session)
      if (userId && userEmail) {
        await trackUserData({
          user_id: userId,
          email: userEmail,
        });

        // Get email hash for the event
        const emailHash = await hashEmail(userEmail);

        // Push the event with user data and event ID
        window.dataLayer.push({
          event: eventName,
          event_id: eventId,
          user: {
            user_id: userId,
            email_sha256: emailHash,
          },
          ...eventData,
        });
      } else {
        // Fallback: push event without user data (deduplication already checked)
        window.dataLayer.push({
          event: eventName,
          event_id: eventId,
          ...eventData,
        });
      }
    };

    if (isTrial) {
      // Track free trial as subscription_success with value 0
      trackEventWithUserData("subscription_success", {
        subscription: {
          value: 0,
          currency: subscriptionCurrency || "USD",
        },
      });
    } else if (isLifetime && subscriptionValue !== null) {
      // Track lifetime purchase with Purchase event
      const purchaseItems = [
        {
          item_id: "lifetime",
          item_name: "Cymasphere Lifetime",
          category: "software",
          quantity: 1,
          price: subscriptionValue,
        },
      ];

      // Push to dataLayer (for GTM/GA) with user data
      trackEventWithUserData("purchase", {
        value: subscriptionValue,
        currency: subscriptionCurrency,
        transaction_id: sessionId,
        items: purchaseItems,
      });

      // Also fire Meta Pixel directly to ensure parameters are sent
      // (trackPurchase would duplicate dataLayer push, so we fire fbq directly)
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq(
          "track",
          "Purchase",
          {
            value: subscriptionValue,
            currency: subscriptionCurrency,
            content_ids: purchaseItems.map((item) => item.item_id),
            contents: purchaseItems.map((item) => ({
              id: item.item_id,
              quantity: item.quantity || 1,
              item_price: item.price,
            })),
          },
          {
            eventID: sessionId || `purchase_${Date.now()}`, // For deduplication with server events
          }
        );
      }
    } else if (subscriptionValue !== null) {
      // Track paid subscription with value and currency
      trackEventWithUserData("subscription_success", {
        subscription: {
          value: subscriptionValue,
          currency: subscriptionCurrency,
        },
      });
    } else if (sessionId && !isTrial) {
      // If we have session_id but no value, fetch it from API
      fetch(`/api/checkout-session-details?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.value !== null) {
            setSubscriptionValue(data.value);
            setSubscriptionCurrency(data.currency || "USD");

            // Check if it's a lifetime purchase based on mode
            if (data.mode === "payment") {
              // Track as Purchase event for lifetime
              const purchaseItems = [
                {
                  item_id: "lifetime",
                  item_name: "Cymasphere Lifetime",
                  category: "software",
                  quantity: 1,
                  price: data.value,
                },
              ];

              // Push to dataLayer (for GTM/GA) with user data
              trackEventWithUserData("purchase", {
                value: data.value,
                currency: data.currency || "USD",
                transaction_id: sessionId,
                items: purchaseItems,
              });

              // Also fire Meta Pixel directly to ensure parameters are sent
              // (trackPurchase would duplicate dataLayer push, so we fire fbq directly)
              if (typeof window !== "undefined" && window.fbq) {
                window.fbq(
                  "track",
                  "Purchase",
                  {
                    value: data.value,
                    currency: data.currency || "USD",
                    content_ids: purchaseItems.map((item) => item.item_id),
                    contents: purchaseItems.map((item) => ({
                      id: item.item_id,
                      quantity: item.quantity || 1,
                      item_price: item.price,
                    })),
                  },
                  {
                    eventID: sessionId || `purchase_${Date.now()}`, // For deduplication with server events
                  }
                );
              }
            } else {
              // Track as subscription_success for recurring
              trackEventWithUserData("subscription_success", {
                subscription: {
                  value: data.value,
                  currency: data.currency || "USD",
                },
              });
            }
          } else {
            // Fallback: track without value (assume subscription)
            trackEventWithUserData("subscription_success", {
              subscription: {
                value: 0,
                currency: "USD",
              },
            });
          }
        })
        .catch(() => {
          // If we can't fetch, still track the event without value (assume subscription)
          trackEventWithUserData("subscription_success", {
            subscription: {
              value: 0,
              currency: "USD",
            },
          });
        });
    }
  }, []); // Empty deps - run once on mount, ref prevents duplicate runs

  const handleContinue = () => {
    if (isLoggedIn) {
      router.push("/downloads");
    } else if (isSignedUp) {
      router.push("/downloads");
    } else {
      router.push("/signup");
    }
  };

  return (
    <PageContainer>
      <HeaderNav>
        <HeaderContent>
          <NNAudioLogo
            size="40px"
            fontSize="1.8rem"
            href="/"
            onClick={() => {}}
            className=""
            showText={true}
          />
        </HeaderContent>
      </HeaderNav>

      <ContentContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SuccessIcon />

        {isTrial ? (
          <>
            <Title>Trial Started!</Title>
            <Subtitle>Welcome to NNAudio</Subtitle>
            <Message>
              {isSignedUp
                ? "Your free trial is live. Explore everything NNAudio offers."
                : "Your free trial is live. Create your account to start using NNAudio."}
            </Message>
          </>
        ) : (
          <>
            <Title>Payment Successful!</Title>
            <Subtitle>Thank you for choosing NNAudio</Subtitle>
            <Message>
              {isSignedUp
                ? "Your payment is complete. You can now access your NNAudio products and downloads."
                : "Your payment is complete. Create your account to access your NNAudio products and downloads."}
            </Message>
          </>
        )}

        <BackButton onClick={handleContinue}>
          {isLoggedIn || isSignedUp
            ? "Go to Downloads"
            : "Create Your Account"}
        </BackButton>
      </ContentContainer>
    </PageContainer>
  );
}

export default function CheckoutSuccess() {
  return (
    <Suspense
      fallback={
        <LoadingSpinner
          size="large"
          fullScreen={true}
          text="Processing checkout..."
        />
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
