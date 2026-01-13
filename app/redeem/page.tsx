/**
 * @fileoverview Page for users to redeem reseller product codes
 * @module redeem
 */

"use client";

import React, { useState } from "react";
import NextSEO from "@/components/NextSEO";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaArrowRight,
} from "react-icons/fa";
import Link from "next/link";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinningIcon = styled(FaSpinner)`
  animation: ${spin} 1s linear infinite;
`;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 20px 100px;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(108, 99, 255, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(78, 205, 196, 0.15) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const Card = styled(motion.div)`
  background: rgba(25, 23, 36, 0.85);
  border-radius: 20px;
  padding: 3.5rem;
  max-width: 600px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);

  &::before {
    content: "";
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(
      135deg,
      rgba(108, 99, 255, 0.4) 0%,
      rgba(108, 99, 255, 0.2) 50%,
      rgba(78, 205, 196, 0.4) 100%
    );
    border-radius: 22px;
    z-index: -1;
    opacity: 0.6;
    filter: blur(8px);
  }

  @media (max-width: 768px) {
    padding: 2.5rem 1.5rem;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
`;

const IconCircle = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 
    0 8px 32px rgba(108, 99, 255, 0.5),
    0 0 0 4px rgba(108, 99, 255, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  position: relative;
  padding: 20px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  &::after {
    content: "";
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    opacity: 0.3;
    filter: blur(12px);
    z-index: -1;
  }
`;

const Title = styled.h1`
  font-size: 2.75rem;
  background: linear-gradient(135deg, var(--text) 0%, rgba(255, 255, 255, 0.9) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2.25rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.15rem;
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 500px;
  margin: 0 auto;
`;

const Form = styled.form`
  margin-top: 2rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.75rem;
  color: var(--text);
  font-weight: 600;
  font-size: 0.95rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 18px 24px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background-color: rgba(15, 14, 23, 0.8);
  color: var(--text);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  text-align: center;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  backdrop-filter: blur(10px);

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 
      0 0 0 4px rgba(108, 99, 255, 0.15),
      0 4px 20px rgba(108, 99, 255, 0.2);
    background-color: rgba(15, 14, 23, 0.95);
    transform: translateY(-1px);
  }

  &::placeholder {
    color: var(--text-secondary);
    letter-spacing: 1px;
    text-transform: none;
    opacity: 0.6;
  }
`;

const Button = styled.button<{ $loading?: boolean }>`
  width: 100%;
  padding: 18px 24px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(108, 99, 255, 0.3);

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(108, 99, 255, 0.5);
    
    &::before {
      left: 100%;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 10px rgba(108, 99, 255, 0.2);
  }
`;

const Message = styled(motion.div)<{ $type: "success" | "error" }>`
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  background-color: ${(props) =>
    props.$type === "success"
      ? "rgba(46, 204, 113, 0.15)"
      : "rgba(231, 76, 60, 0.15)"};
  color: ${(props) =>
    props.$type === "success" ? "#2ecc71" : "#e74c3c"};
  border: 1px solid
    ${(props) =>
      props.$type === "success"
        ? "rgba(46, 204, 113, 0.3)"
        : "rgba(231, 76, 60, 0.3)"};
`;

const SuccessCard = styled(motion.div)`
  text-align: center;
  padding: 2rem 0;
`;

const SuccessIcon = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 3.5rem;
  margin: 0 auto 2rem;
  box-shadow: 
    0 8px 32px rgba(46, 204, 113, 0.5),
    0 0 0 4px rgba(46, 204, 113, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  position: relative;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`;

const SuccessTitle = styled.h2`
  font-size: 2rem;
  color: var(--text);
  margin-bottom: 0.5rem;
  font-weight: 700;
`;

const SuccessMessage = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const ProductName = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  background-color: rgba(108, 99, 255, 0.12);
  border-radius: 12px;
  border: 1px solid rgba(108, 99, 255, 0.3);
  backdrop-filter: blur(10px);
  position: relative;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, var(--primary), var(--accent));
    border-radius: 12px 0 0 12px;
  }
`;

const ActionButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 14px 28px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.05rem;
  text-decoration: none;
  transition: all 0.3s ease;
  margin-top: 1rem;
  box-shadow: 0 4px 20px rgba(108, 99, 255, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(108, 99, 255, 0.5);
    
    &::before {
      left: 100%;
    }
  }
`;

const InfoBox = styled.div`
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, rgba(108, 99, 255, 0.12) 0%, rgba(78, 205, 196, 0.12) 100%);
  border: 1px solid rgba(108, 99, 255, 0.25);
  border-radius: 12px;
  margin-top: 2rem;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.7;
  backdrop-filter: blur(10px);
  position: relative;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, var(--primary), var(--accent));
    border-radius: 12px 0 0 12px;
  }
`;

const LoginPrompt = styled.div`
  text-align: center;
  padding: 2.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
`;

const LoginLink = styled(Link)`
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;

  &:hover {
    color: var(--accent);
  }
`;

export default function RedeemPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [serialCode, setSerialCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [redeemedProduct, setRedeemedProduct] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [alreadyRedeemed, setAlreadyRedeemed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setMessage({
        type: "error",
        text: "You must be logged in to redeem a code. Please log in first.",
      });
      return;
    }

    if (!serialCode.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a serial code",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Remove hyphens before sending - they're only for display
          serial_code: serialCode.replace(/[-\s]/g, "").trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.already_redeemed) {
          setRedeemedProduct(data.product);
          setAlreadyRedeemed(true);
          setSerialCode("");
          setMessage({
            type: "success",
            text: data.message || "You have already redeemed this code",
          });
        } else {
          setRedeemedProduct(data.product);
          setAlreadyRedeemed(false);
          setSerialCode("");
          setMessage({
            type: "success",
            text: data.message || "Code redeemed successfully!",
          });
        }
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to redeem code",
        });
      }
    } catch (error: any) {
      console.error("Error redeeming code:", error);
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessage(null);
    setRedeemedProduct(null);
    setAlreadyRedeemed(false);
    setSerialCode("");
  };

  return (
    <>
      <NextSEO title="Redeem Product Code - NNAudio" />
      <Container>
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "600px" }}>
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {!user ? (
            <LoginPrompt>
              <IconContainer>
                <IconCircle>
                  <Image
                    src="/images/nnaud-io/NNAudio-logo-white.png"
                    alt="NNAudio Logo"
                    width={445}
                    height={283}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    priority
                  />
                </IconCircle>
              </IconContainer>
              <Title>Redeem Product Code</Title>
              <Subtitle>
                You need to be logged in to redeem a product code.
              </Subtitle>
              <ActionButton href="/login">
                Log In <FaArrowRight />
              </ActionButton>
            </LoginPrompt>
          ) : redeemedProduct ? (
            <SuccessCard
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <SuccessIcon>
                <FaCheckCircle />
              </SuccessIcon>
              <SuccessTitle>
                {alreadyRedeemed ? "Already Redeemed!" : "Code Redeemed!"}
              </SuccessTitle>
              <SuccessMessage>
                {alreadyRedeemed 
                  ? "You have already redeemed this code. The product is available in your account."
                  : "Your product has been added to your account."}
              </SuccessMessage>
              <ProductName>{redeemedProduct.name}</ProductName>
              <div>
                <ActionButton href="/my-products">
                  View My Products <FaArrowRight />
                </ActionButton>
                <Button
                  $loading={loading}
                  onClick={handleReset}
                  style={{ marginTop: "1rem", background: "rgba(255, 255, 255, 0.1)" }}
                >
                  Redeem Another Code
                </Button>
              </div>
            </SuccessCard>
          ) : (
            <>
              <Header>
                <IconContainer>
                  <IconCircle>
                    <Image
                      src="/images/nnaud-io/NNAudio-logo-white.png"
                      alt="NNAudio Logo"
                      width={445}
                      height={283}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      priority
                    />
                  </IconCircle>
                </IconContainer>
                <Title>Redeem Product Code</Title>
                <Subtitle>
                  Enter your serial code below to redeem your product. The
                  product will be added to your account immediately.
                </Subtitle>
              </Header>

              <AnimatePresence>
                {message && (
                  <Message
                    $type={message.type}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {message.type === "success" ? (
                      <FaCheckCircle />
                    ) : (
                      <FaExclamationCircle />
                    )}
                    {message.text}
                  </Message>
                )}
              </AnimatePresence>

              <Form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="serial-code">Serial Code</Label>
                  <Input
                    id="serial-code"
                    type="text"
                    value={serialCode}
                    onChange={(e) => {
                      // Remove all non-alphanumeric characters except hyphens
                      let value = e.target.value.replace(/[^A-Z0-9-]/gi, "").toUpperCase();
                      
                      // Remove existing hyphens to recalculate
                      const cleanValue = value.replace(/[-\s]/g, "");
                      
                      // Add hyphens every 4 characters
                      const formatted = cleanValue.match(/.{1,4}/g)?.join("-") || cleanValue;
                      
                      setSerialCode(formatted);
                      setMessage(null);
                    }}
                    placeholder="Enter your code here"
                    disabled={loading}
                    autoFocus
                  />
                </FormGroup>

                <Button type="submit" disabled={loading || !serialCode.trim()}>
                  {loading ? (
                    <>
                      <SpinningIcon /> Redeeming...
                    </>
                  ) : (
                    <>
                      Redeem Code
                    </>
                  )}
                </Button>
              </Form>

              <InfoBox>
                <strong>💡 Tip:</strong> Serial codes are case-insensitive and
                can be entered with or without spaces. Make sure you're logged
                in to your account before redeeming.
              </InfoBox>
            </>
          )}
        </Card>
        </div>
      </Container>
    </>
  );
}
