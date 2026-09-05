/**
 * @fileoverview Ad Manager — Create ad set for a specific campaign (campaign in URL). Budget, targeting, optimization, schedule.
 * @module ad-manager/campaigns/[id]/adsets/create
 */
"use client";

import React, { useState, useEffect, useRef } from "react";
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

  @media (max-width: 768px) {
    padding: 8px 0;
  }
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

const ErrorBox = styled.div.attrs({ role: 'alert' })`
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
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [dailyBudget, setDailyBudget] = useState<string>("10");
  const [lifetimeBudget, setLifetimeBudget] = useState<string>("");
  const [optimizationGoal, setOptimizationGoal] = useState("LINK_CLICKS");
  const [billingEvent, setBillingEvent] = useState("LINK_CLICKS");
  const [countries, setCountries] = useState("US");
  const [noEndDate, setNoEndDate] = useState(true);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      if (!campaignId) {
        setError("Campaign ID is missing");
        return;
      }
      const countriesList = countries.split(/[\s,]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
      const targeting = { geo_locations: { countries: countriesList.length ? countriesList : ["US"] } };

      const payload: Record<string, unknown> = {
        name: name.trim(),
        campaignId,
        status,
        targeting,
        optimizationGoal,
        billingEvent,
      };
      if (budgetType === "lifetime") {
        const lt = parseFloat(lifetimeBudget);
        if (!Number.isFinite(lt) || lt <= 0) {
          setError("Lifetime budget must be a positive number");
          setSubmitting(false);
          return;
        }
        payload.lifetimeBudget = lt;
        if (!noEndDate && endTime?.trim()) payload.endTime = new Date(endTime.trim()).toISOString();
        else if (noEndDate) {
          const end = new Date();
          end.setDate(end.getDate() + 30);
          payload.endTime = end.toISOString();
        }
        if (startTime?.trim()) payload.startTime = new Date(startTime.trim()).toISOString();
      } else {
        const budget = parseFloat(dailyBudget);
        payload.dailyBudget = Number.isFinite(budget) && budget > 0 ? budget : 10;
        if (startTime?.trim()) payload.startTime = new Date(startTime.trim()).toISOString();
        if (noEndDate) {
          // Omit endTime so API sends end_time=0 (ongoing).
        } else if (endTime?.trim()) {
          payload.endTime = new Date(endTime.trim()).toISOString();
        }
      }

      const res = await fetch("/api/facebook-ads/adsets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({ success: false, error: "Invalid response from server" }));
      if (data.success) {
        router.push(`/admin/ad-manager/campaigns/adsets?campaignId=${encodeURIComponent(campaignId)}`);
      } else {
        let msg = data.error || "Failed to create ad set";
        if (data.metaCode != null) msg += ` [Meta code: ${data.metaCode}]`;
        if (data.metaData != null) msg += ` ${JSON.stringify(data.metaData)}`;
        setError(msg);
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
        {error && (
          <div ref={errorRef}>
            <ErrorBox role="alert" aria-live="assertive" aria-label={error}>
              {error}
            </ErrorBox>
          </div>
        )}

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
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Budget type</Label>
          <Select value={budgetType} onChange={(e) => setBudgetType(e.target.value as "daily" | "lifetime")}>
            <option value="daily">Daily budget</option>
            <option value="lifetime">Lifetime budget</option>
          </Select>
        </FormGroup>

        {budgetType === "daily" ? (
          <FormGroup>
            <Label>Daily budget (USD)</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              placeholder="10"
            />
          </FormGroup>
        ) : (
          <FormGroup>
            <Label>Lifetime budget (USD)</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={lifetimeBudget}
              onChange={(e) => setLifetimeBudget(e.target.value)}
              placeholder="100"
            />
          </FormGroup>
        )}

        <FormGroup>
          <Label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={noEndDate}
              onChange={(e) => setNoEndDate(e.target.checked)}
            />
            No end date (run until I turn it off)
          </Label>
        </FormGroup>

        {!noEndDate && (
          <>
            <FormGroup>
              <Label>Start time (optional)</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label>End time</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </FormGroup>
          </>
        )}

        <FormGroup>
          <Label>Targeting — countries (comma or space separated, e.g. US, CA, GB)</Label>
          <Input
            type="text"
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            placeholder="US"
          />
        </FormGroup>

        <FormGroup>
          <Label>Optimization goal</Label>
          <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Match to campaign objective (e.g. Traffic → Link clicks, Conversions → Conversions).
          </p>
          <Select value={optimizationGoal} onChange={(e) => setOptimizationGoal(e.target.value)}>
            <option value="LINK_CLICKS">Link clicks</option>
            <option value="IMPRESSIONS">Impressions</option>
            <option value="REACH">Reach</option>
            <option value="CONVERSIONS">Conversions</option>
            <option value="LEADS">Leads</option>
            <option value="LANDING_PAGE_VIEWS">Landing page views</option>
            <option value="VIDEO_VIEWS">Video views</option>
            <option value="POST_ENGAGEMENT">Post engagement</option>
            <option value="BRAND_AWARENESS">Brand awareness</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Billing event</Label>
          <Select value={billingEvent} onChange={(e) => setBillingEvent(e.target.value)}>
            <option value="LINK_CLICKS">Link clicks</option>
            <option value="IMPRESSIONS">Impressions</option>
            <option value="CLICKS">Clicks</option>
            <option value="CONVERSIONS">Conversions</option>
            <option value="VIDEO_VIEWS">Video views</option>
          </Select>
        </FormGroup>

        <SubmitButton type="submit" disabled={submitting} $loading={submitting}>
          <FaSave /> {submitting ? "Creating…" : "Create ad set"}
        </SubmitButton>
      </Form>
    </Container>
  );
}
