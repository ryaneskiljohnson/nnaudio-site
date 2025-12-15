"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaTimesCircle } from "react-icons/fa";
import NNAudioLogo from "@/components/common/NNAudioLogo";
import LoadingSpinner from "@/components/common/LoadingSpinner";

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

const CancelIcon = styled(FaTimesCircle)`
  color: var(--error);
  font-size: 5rem;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--error);
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 400;
  margin-bottom: 2rem;
  color: var(--text-secondary);
`;

const Message = styled.p`
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 800px;
  color: var(--text-secondary);
`;

const ErrorDetails = styled.div`
  background: rgba(30, 30, 30, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 600px;
`;

const ErrorMessage = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1rem;
  color: var(--text-secondary);
  text-align: left;
`;

const BackButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 25px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 2rem;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
  }
`;

// Get a user-friendly error message based on the error code
const getErrorMessage = (
  errorCode: string | null,
  status: string | null
): string => {
  if (!errorCode) return "Your payment could not be processed.";

  switch (errorCode) {
    case "missing_session_id":
      return "We couldn't find your checkout session. Please try again.";
    case "payment_verification_failed":
      return "We couldn't verify your payment. Please try again or contact support.";
    case "payment_incomplete":
      return `Your payment was not completed. Status: ${status || "unknown"}`;
    case "server_error":
      return "Our server encountered an error while processing your payment. Please try again later.";
    default:
      return `There was a problem with your payment: ${errorCode}`;
  }
};

// Component that uses useSearchParams
function CheckoutCanceledContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams) {
      setErrorCode(searchParams.get("error"));
      setStatus(searchParams.get("status"));
    }
  }, [searchParams]);

  const handleTryAgain = () => {
    router.push("/#pricing");
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
        <CancelIcon />
        <Title>Payment Not Completed</Title>
        <Subtitle>We couldn&apos;t process your payment</Subtitle>
        <Message>
          Your payment was not completed successfully. This could be due to a
          cancellation or an error during processing.
        </Message>

        <ErrorDetails>
          <ErrorMessage>{getErrorMessage(errorCode, status)}</ErrorMessage>
          <ErrorMessage>
            If you believe this is an error or need help, please contact our
            support team.
          </ErrorMessage>
        </ErrorDetails>

        <BackButton onClick={handleTryAgain}>Try Again</BackButton>
      </ContentContainer>
    </PageContainer>
  );
}

// Main export with Suspense boundary
export default function CheckoutCanceled() {
  return (
    <Suspense
      fallback={
        <LoadingSpinner
          size="large"
          fullScreen={true}
          text="Processing payment..."
        />
      }
    >
      <CheckoutCanceledContent />
    </Suspense>
  );
}
