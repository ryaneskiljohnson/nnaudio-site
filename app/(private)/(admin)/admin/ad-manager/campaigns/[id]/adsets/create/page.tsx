"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { FaArrowLeft, FaSave, FaBullseye } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

const Container = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 1rem;
  font-size: 0.9rem;

  &:hover {
    color: var(--primary);
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem 0;

  svg {
    color: #1877f2;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const SubmitButton = styled.button<{ $loading?: boolean }>`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #1877f2, #0d65d9);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: ${(p) => (p.$loading ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

const ErrorBox = styled.div`
  padding: 1rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.9rem;
`;

export default function CreateAdSetPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;

  const [name, setName] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("PAUSED");
  const [dailyBudget, setDailyBudget] = useState<string>("10");
  const [optimizationGoal, setOptimizationGoal] = useState("LINK_CLICKS");
  const [billingEvent, setBillingEvent] = useState("IMPRESSIONS");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const budget = parseFloat(dailyBudget);
      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      if (!campaignId) {
        setError("Campaign ID is missing");
        return;
      }
      const res = await fetch("/api/facebook-ads/adsets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          campaignId,
          status,
          dailyBudget: Number.isFinite(budget) && budget > 0 ? budget : 10,
          targeting: { geo_locations: { countries: ["US"] } },
          optimizationGoal,
          billingEvent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/admin/ad-manager/campaigns/${campaignId}/edit`);
      } else {
        setError(data.error || "Failed to create ad set");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ad set");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <LoadingComponent />;

  return (
    <Container>
      <Header>
        <BackButton href={`/admin/ad-manager/campaigns/${campaignId}/edit`}>
          <FaArrowLeft /> Back to campaign
        </BackButton>
        <Title>
          <FaBullseye /> Create ad set
        </Title>
        <Subtitle>Create an ad set under this campaign to define budget and targeting.</Subtitle>
      </Header>

      <Form onSubmit={handleSubmit}>
        {error && <ErrorBox>{error}</ErrorBox>}

        <FormGroup>
          <Label>Ad set name</Label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. US 25-44"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "PAUSED")}>
            <option value="PAUSED">Paused</option>
            <option value="ACTIVE">Active</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Daily budget (USD)</Label>
          <Input
            type="number"
            min="1"
            step="1"
            value={dailyBudget}
            onChange={(e) => setDailyBudget(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Optimization goal</Label>
          <Select value={optimizationGoal} onChange={(e) => setOptimizationGoal(e.target.value)}>
            <option value="LINK_CLICKS">Link clicks</option>
            <option value="IMPRESSIONS">Impressions</option>
            <option value="REACH">Reach</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Billing event</Label>
          <Select value={billingEvent} onChange={(e) => setBillingEvent(e.target.value)}>
            <option value="IMPRESSIONS">Impressions</option>
            <option value="LINK_CLICKS">Link clicks</option>
          </Select>
        </FormGroup>

        <SubmitButton type="submit" disabled={submitting} $loading={submitting}>
          <FaSave /> {submitting ? "Creating…" : "Create ad set"}
        </SubmitButton>
      </Form>
    </Container>
  );
}
