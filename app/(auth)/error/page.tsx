"use client";

import React from "react";
import Link from "next/link";
import styled from "styled-components";
import NNAudioLogo from "@/components/common/NNAudioLogo";

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--background);
  text-align: center;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const Message = styled.p`
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
`;

const StyledLink = styled(Link)`
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
  &:hover {
    text-decoration: underline;
  }
`;

export default function ErrorPage() {
  return (
    <Container>
      <NNAudioLogo size="48px" fontSize="1.5rem" href="/" showText />
      <Title>Something went wrong</Title>
      <Message>Your link may have expired or something unexpected happened.</Message>
      <StyledLink href="/login">Go to login</StyledLink>
    </Container>
  );
}
