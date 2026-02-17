/**
 * @fileoverview Skeleton UI for checkout pages (bundle subscription and cart checkout).
 * Mirrors the layout: breadcrumb, title, two-column grid (form + order summary).
 * @module components/skeletons/CheckoutPageSkeleton
 */

import React from "react";
import styled from "styled-components";
import {
  TextSkeleton,
  CardSkeleton,
  ButtonSkeleton,
} from "@/components/common/LoadingSkeleton";

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

const BreadcrumbRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
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

const SummaryItemRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const SummaryDetails = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: center;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding-top: 1.5rem;
  margin-top: 1rem;
`;

const SecurityBlock = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
`;

/**
 * Centered skeleton for checkout page loading state.
 * @returns Checkout page skeleton layout
 */
export default function CheckoutPageSkeleton() {
  return (
    <Container>
      <Content>
        <BreadcrumbContainer>
          <BreadcrumbRow>
            <CardSkeleton width="40px" height="14px" />
            <CardSkeleton width="32px" height="14px" />
            <CardSkeleton width="50px" height="14px" />
            <CardSkeleton width="32px" height="14px" />
            <CardSkeleton width="60px" height="14px" />
            <CardSkeleton width="32px" height="14px" />
            <CardSkeleton width="70px" height="14px" />
          </BreadcrumbRow>
        </BreadcrumbContainer>

        <div style={{ marginBottom: "2rem" }}>
          <TextSkeleton
            lines={1}
            width="35%"
            style={{ height: "48px", marginBottom: 0 }}
          />
        </div>

        <CheckoutContainer>
          <CheckoutForm>
            <div style={{ marginBottom: "1.5rem" }}>
              <TextSkeleton
                lines={1}
                width="55%"
                style={{ height: "28px", marginBottom: 0 }}
              />
            </div>

            <FormRow>
              <CardSkeleton width="100%" height="44px" />
              <CardSkeleton width="100%" height="44px" />
            </FormRow>
            <FormRow>
              <CardSkeleton width="100%" height="44px" />
              <CardSkeleton width="100%" height="44px" />
            </FormRow>
            <div style={{ marginBottom: "1.5rem" }}>
              <CardSkeleton width="100%" height="44px" />
            </div>
            <FormRow>
              <CardSkeleton width="100%" height="44px" />
              <CardSkeleton width="60%" height="44px" />
            </FormRow>
            <div style={{ marginBottom: "1.5rem" }}>
              <CardSkeleton width="100%" height="50px" />
            </div>

            <ButtonSkeleton width="100%" height="56px" />

            <SecurityBlock>
              <TextSkeleton lines={2} width={["90%", "70%"]} />
            </SecurityBlock>
          </CheckoutForm>

          <OrderSummary>
            <div style={{ marginBottom: "1.5rem" }}>
              <TextSkeleton
                lines={1}
                width="45%"
                style={{ height: "28px", marginBottom: 0 }}
              />
            </div>

            <SummaryItemRow>
              <CardSkeleton
                width="80px"
                height="80px"
                style={{ borderRadius: "12px", flexShrink: 0 }}
              />
              <SummaryDetails>
                <TextSkeleton lines={1} width="85%" />
                <TextSkeleton lines={1} width="55%" />
              </SummaryDetails>
            </SummaryItemRow>

            <TotalRow>
              <CardSkeleton width="60px" height="24px" />
              <CardSkeleton width="80px" height="24px" />
            </TotalRow>
          </OrderSummary>
        </CheckoutContainer>
      </Content>
    </Container>
  );
}
