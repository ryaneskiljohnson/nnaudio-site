import React, { useState } from "react";
// import { loadStripe } from "@stripe/stripe-js";
import styled from "styled-components";

// Use environment variable for Stripe publishable key with a fallback
// This ensures we at least have a valid string for Stripe initialization in all environments
// const stripePromise = loadStripe(
//   process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "pk_test_51Placeholder"
// );

const CheckoutButton = styled.button`
  display: block;
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 25px;
  font-weight: 600;
  font-size: 1rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  margin-top: 15px;
  box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
  position: relative;
  z-index: 10;
  pointer-events: auto !important;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 18px rgba(108, 99, 255, 0.5);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

interface StatusMessageProps {
  isError?: boolean;
}

const StatusMessage = styled.div<StatusMessageProps>`
  margin-top: 10px;
  text-align: center;
  color: ${(props) => (props.isError ? "var(--error)" : "var(--success)")};
  font-size: 0.9rem;
`;

interface StripeCheckoutProps {
  priceId: string;
  buttonText: string;
  billingPeriod: string;
  price: string;
  trialDays?: number;
}

/**
 * StripeCheckout component for handling Stripe checkout sessions
 * @param {Object} props
 * @param {string} props.priceId - The Stripe price ID for the selected plan
 * @param {string} props.buttonText - Text to display on the checkout button
 * @param {string} props.billingPeriod - The selected billing period (monthly, yearly, or lifetime)
 * @param {string} props.price - The price of the plan to display
 */
const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  priceId,
  buttonText,
  billingPeriod,
  price,
  // trialDays is defined but not used, so we'll comment it out
  // trialDays,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      // Proceed with Stripe checkout (same path in all environments; no mock redirect)
      // const stripe = await stripePromise;

      try {
        // Make a request to your backend to create a checkout session
        // In production, this would be the correct API endpoint
        const apiUrl =
          process.env.REACT_APP_API_URL || "https://nnaud.io";

        const response = await fetch(`${apiUrl}/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId,
            billingPeriod,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to create checkout session"
          );
        }

        // The session data would be used with Stripe, but since that's commented out,
        // we'll just log it for now
        await response.json();
        // When Stripe is re-enabled, uncomment:
        // const session = await response.json();
        // const result = await stripe.redirectToCheckout({
        //   sessionId: session.id,
        // });

        // Redirect to Stripe Checkout
        // const result = await stripe.redirectToCheckout({
        //   sessionId: session.id,
        // });
      } catch (fetchError) {
        console.error("Error fetching checkout session:", fetchError);
        throw new Error(
          "Unable to connect to the payment server. Please try again later."
        );
      }
    } catch (error: unknown) {
      console.error("Error during checkout:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <>
      <CheckoutButton onClick={handleCheckout} disabled={isLoading}>
        {isLoading ? "Processing..." : buttonText}
      </CheckoutButton>

      {errorMessage && <StatusMessage isError>{errorMessage}</StatusMessage>}
    </>
  );
};

export default StripeCheckout;
