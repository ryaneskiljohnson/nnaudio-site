"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";
import NNAudioLogo from "@/components/common/NNAudioLogo";
import { trackUserData, hashEmail, trackEventOnce } from "@/utils/analytics";
import { useAuth } from "@/contexts/AuthContext";

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
  max-width: 650px;
  width: 100%;
  z-index: 1;
`;

const SuccessIcon = styled(FaCheckCircle)`
  color: var(--success);
  font-size: 5rem;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 400;
  margin-bottom: 2rem;
  color: var(--text-secondary);
`;

const Message = styled.div`
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 800px;
  color: var(--text-secondary);
  background-color: rgba(0, 201, 167, 0.1);
  border: 2px solid var(--success);
  border-radius: 12px;
  padding: 2rem;
`;

const Highlight = styled.span`
  color: var(--success);
  font-weight: 500;
`;

const Button = styled.button`
  padding: 12px 30px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 25px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
  }
`;

export default function SignupSuccess() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const name = searchParams.get("name") || "there";
  const email = searchParams.get("email") || user?.email || "your email";

  // Track registration success in dataLayer with user data (with deduplication)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Generate unique event ID for this registration
    const eventId = `registration_${user?.id || email || Date.now()}`;
    
    // Check if event should fire (deduplication check)
    if (!trackEventOnce('registration_success', {}, eventId)) {
      return; // Event already fired, skip
    }
      
      // Push user data if we have user_id and email
      const userId = user?.id || user?.profile?.id;
      if (userId && email && email !== "your email") {
        // Push user data first, then registration event
        trackUserData({
          user_id: userId,
          email: email,
        }).then(async () => {
          // Get email hash for the event
          const emailHash = await hashEmail(email);
          
        // Push registration event with user data and event ID
        window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'registration_success',
          event_id: eventId,
            user: {
              user_id: userId,
              email_sha256: emailHash,
            },
          });
        });
      } else {
        // Fallback: push registration event without user data
      trackEventOnce('registration_success', {}, eventId);
    }
  }, [user, email]);

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
        <Title>Account Created Successfully!</Title>
        <Subtitle>Welcome to Cymasphere</Subtitle>
        
        <Message>
          <p>
            <strong>Hi {name}!</strong> A verification email has been sent to <Highlight>{email}</Highlight>.
          </p>
          <br />
          <p>
            Please check your inbox (and spam folder) and click the link to verify your account.
          </p>
          <br />
          <p>
            <strong>You must verify your email before accessing all features.</strong>
          </p>
        </Message>

        <Link href="/login">
          <Button>Go to Login</Button>
        </Link>
      </ContentContainer>
    </PageContainer>
  );
} 