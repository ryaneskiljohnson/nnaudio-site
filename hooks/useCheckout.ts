"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PlanType } from "@/types/stripe";

interface UseCheckoutOptions {
  onError?: (error: string) => void;
}

interface UseCheckoutReturn {
  initiateCheckout: (
    planType: PlanType,
    options?: {
      collectPaymentMethod?: boolean;
      willProvideCard?: boolean;
      hasHadTrial?: boolean;
      email?: string;
      isPlanChange?: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Centralized checkout hook for handling Stripe checkout sessions
 * Used by both PricingSection and BillingPage to ensure consistency
 */
export function useCheckout(options: UseCheckoutOptions = {}): UseCheckoutReturn {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateCheckout = useCallback(
    async (
      planType: PlanType,
      checkoutOptions?: {
        collectPaymentMethod?: boolean;
        willProvideCard?: boolean;
        hasHadTrial?: boolean;
        email?: string;
        isPlanChange?: boolean;
      }
    ): Promise<{ success: boolean; error?: string }> => {
      // Reset error state
      setError(null);
      setIsLoading(true);

      try {
        // If user is logged in and has a subscription, redirect to dashboard
        // UNLESS this is a plan change (allow existing subscribers to change plans)
        if (user?.profile && user.profile.subscription !== "none" && !checkoutOptions?.isPlanChange) {
          router.push("/dashboard");
          return { success: false, error: "User already has a subscription" };
        }

        // Determine if we need to collect payment method
        // Priority: hasHadTrial > willProvideCard > collectPaymentMethod
        let collectPaymentMethod = false;
        if (checkoutOptions?.hasHadTrial === true) {
          // If user has had a trial, always require payment method
          collectPaymentMethod = true;
        } else if (checkoutOptions?.willProvideCard !== undefined) {
          // Use the willProvideCard setting if provided
          collectPaymentMethod = checkoutOptions.willProvideCard;
        } else if (checkoutOptions?.collectPaymentMethod !== undefined) {
          // Fall back to explicit collectPaymentMethod
          collectPaymentMethod = checkoutOptions.collectPaymentMethod;
        }

        // For lifetime plans, always require payment method
        if (planType === "lifetime") {
          collectPaymentMethod = true;
        }

        // Get user info (prioritize passed email from modal over user email)
        const customerId = user?.profile?.customer_id || undefined;
        const userEmail = checkoutOptions?.email || user?.email || undefined;

        // Call the checkout API
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planType,
            email: userEmail,
            customerId,
            collectPaymentMethod,
            isPlanChange: checkoutOptions?.isPlanChange || false,
          }),
        });

        const result = await response.json();

        if (result.url) {
          // Validate URL before redirecting
          try {
            new URL(result.url);
            // Redirect to Stripe Checkout
            window.location.href = result.url;
            return { success: true };
          } catch (urlError) {
            const errorMsg = "Invalid checkout URL received from server";
            console.error(errorMsg, result.url, urlError);
            setError(errorMsg);
            if (options.onError) {
              options.onError(errorMsg);
            }
            return { success: false, error: errorMsg };
          }
        } else if (result.error) {
          // Use the user-friendly message if available, otherwise use error code
          const errorMsg = result.message || result.error || "Failed to create checkout session";
          console.error("Checkout error:", errorMsg, result);
          setError(errorMsg);
          if (options.onError) {
            options.onError(errorMsg);
          }
          return { success: false, error: errorMsg };
        }

        return { success: false, error: "Unknown error occurred" };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "An unexpected error occurred";
        console.error("Checkout error:", err);
        setError(errorMsg);
        if (options.onError) {
          options.onError(errorMsg);
        }
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [user, router, options]
  );

  return {
    initiateCheckout,
    isLoading,
    error,
  };
}

