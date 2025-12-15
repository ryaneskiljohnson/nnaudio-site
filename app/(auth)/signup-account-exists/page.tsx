"use client";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaInfoCircle } from "react-icons/fa";
import NNAudioLogo from "@/components/common/NNAudioLogo";

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

const InfoIcon = styled(FaInfoCircle)`
  color: var(--primary);
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
  background-color: rgba(108, 99, 255, 0.1);
  border: 2px solid var(--primary);
  border-radius: 12px;
  padding: 2rem;
`;

const Highlight = styled.span`
  color: var(--primary);
  font-weight: 500;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  width: 100%;
  max-width: 650px;
  margin-top: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
  
  @media (max-width: 640px) {
    flex-direction: column;
    max-width: 400px;
  }
`;

const PrimaryButton = styled.button`
  padding: 12px 30px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 25px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 160px;
  text-align: center;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.3);
  }
`;

const SecondaryButton = styled.button`
  padding: 12px 30px;
  background: transparent;
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 25px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 160px;
  text-align: center;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }
`;

export default function AccountExists() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

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
        <InfoIcon />
        <Title>Account Already Exists</Title>
        <Subtitle>This email is already registered</Subtitle>
        
        <Message>
          <p>
            An account with the email <Highlight>{email}</Highlight> already exists.
          </p>
          <br />
          <p>
            You can either sign in with your existing account or reset your password if you&apos;ve forgotten it.
          </p>
        </Message>

        <ButtonContainer>
          <Link href="/login">
            <PrimaryButton as="a">Sign In</PrimaryButton>
          </Link>
          
          <Link href="/reset-password">
            <SecondaryButton as="a">Reset Password</SecondaryButton>
          </Link>
          
          <Link href="/signup">
            <SecondaryButton as="a">Try Another Email</SecondaryButton>
          </Link>
        </ButtonContainer>
      </ContentContainer>
    </PageContainer>
  );
} 