/**
 * @fileoverview Ad Manager — Edit ad set (under Campaigns): load, save, delete.
 * @module ad-manager/campaigns/adsets/[id]/edit/page
 */

"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FaArrowLeft, FaSave, FaBullseye, FaTrash } from "react-icons/fa";
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

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
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

const DeleteButton = styled.button<{ $loading?: boolean }>`
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 8px;
  color: #ef4444;
  font-weight: 600;
  font-size: 1rem;
  cursor: ${(p) => (p.$loading ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }
`;

const ErrorBox = styled.div`
  padding: 1rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.9rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalBox = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: var(--text);
`;

const ModalText = styled.p`
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const CancelBtn = styled.button`
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: var(--text);
  cursor: pointer;
`;
const ConfirmDeleteBtn = styled.button`
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  border-radius: 8px;
  color: #ef4444;
  cursor: pointer;
  font-weight: 600;
`;

const ADSETS_LIST_PATH = "/admin/ad-manager/campaigns/adsets";

export default function EditAdSetPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [name, setName] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("PAUSED");
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [dailyBudget, setDailyBudget] = useState("");
  const [lifetimeBudget, setLifetimeBudget] = useState("");
  const [optimizationGoal, setOptimizationGoal] = useState("LINK_CLICKS");
  const [billingEvent, setBillingEvent] = useState("LINK_CLICKS");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [noEndDate, setNoEndDate] = useState(true);
  const [countries, setCountries] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/facebook-ads/adsets/${id}`, { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success || !data.adSet) {
          setError(data.error || "Failed to load ad set");
          setLoading(false);
          return;
        }
        const a = data.adSet;
        setName(a.name ?? "");
        setStatus((a.status ?? "PAUSED").toString().toUpperCase() === "ACTIVE" ? "ACTIVE" : "PAUSED");
        const hasLifetime = a.lifetime_budget && parseInt(String(a.lifetime_budget), 10) > 0;
        setBudgetType(hasLifetime ? "lifetime" : "daily");
        const dailyCents = a.daily_budget ? parseInt(String(a.daily_budget), 10) : 0;
        const lifetimeCents = a.lifetime_budget ? parseInt(String(a.lifetime_budget), 10) : 0;
        setDailyBudget(hasLifetime ? "" : String(dailyCents / 100 || ""));
        setLifetimeBudget(hasLifetime ? String(lifetimeCents / 100 || "") : "");
        setOptimizationGoal(a.optimization_goal ?? "LINK_CLICKS");
        setBillingEvent(a.billing_event ?? "LINK_CLICKS");
        setStartTime(a.start_time ? String(a.start_time).slice(0, 16) : "");
        const et = a.end_time;
        setNoEndDate(!et || String(et).trim() === "0");
        setEndTime(et && String(et).trim() !== "0" ? String(et).slice(0, 16) : "");
        const countryList = (a.targeting?.geo_locations?.countries ?? []);
        setCountries(Array.isArray(countryList) ? countryList.join(", ") : "");
        setCampaignId(a.campaignId ?? a.campaign_id ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const countryCodes = countries
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      const targeting =
        countryCodes.length > 0
          ? { geo_locations: { countries: countryCodes } }
          : undefined;

      const res = await fetch(`/api/facebook-ads/adsets/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          status,
          dailyBudget: budgetType === "daily" ? (parseFloat(dailyBudget) || 0) : undefined,
          lifetimeBudget: budgetType === "lifetime" ? (parseFloat(lifetimeBudget) || 0) : undefined,
          optimizationGoal,
          billingEvent,
          startTime: startTime?.trim() ? new Date(startTime.trim()).toISOString() : undefined,
          noEndDate: noEndDate || undefined,
          endTime: !noEndDate && endTime?.trim() ? new Date(endTime.trim()).toISOString() : undefined,
          targeting,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(ADSETS_LIST_PATH);
      } else {
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/facebook-ads/adsets/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setShowDeleteConfirm(false);
        router.push(ADSETS_LIST_PATH);
      } else {
        setError(data.error || "Failed to delete");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return <LoadingComponent />;
  if (!id) {
    return (
      <Container>
        <ErrorBox>Missing ad set ID</ErrorBox>
        <BackButton href={ADSETS_LIST_PATH}>Back to Ad Sets</BackButton>
      </Container>
    );
  }

  if (loading) return <LoadingComponent />;

  return (
    <Container>
      <Header>
        <BackButton href={campaignId ? `/admin/ad-manager/campaigns/${campaignId}/edit` : ADSETS_LIST_PATH}>
          <FaArrowLeft /> {campaignId ? "Back to campaign" : "Back to Ad Sets"}
        </BackButton>
        <Title>
          <FaBullseye /> Edit ad set
        </Title>
        <Subtitle>Update name, status, budget, and optimization. Budget and schedule follow Meta’s ad set level.</Subtitle>
        {campaignId && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
            <Link href={`/admin/ad-manager/ads/create?campaignId=${encodeURIComponent(campaignId)}&adSetId=${encodeURIComponent(id)}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
              Create ad in this ad set →
            </Link>
          </p>
        )}
      </Header>

      {error && <ErrorBox>{error}</ErrorBox>}

      <Form onSubmit={handleSubmit}>
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
          <Label>Budget type</Label>
          <Select
            value={budgetType}
            onChange={(e) => setBudgetType(e.target.value as "daily" | "lifetime")}
          >
            <option value="daily">Daily budget</option>
            <option value="lifetime">Lifetime budget</option>
          </Select>
        </FormGroup>
        {budgetType === "daily" && (
          <FormGroup>
            <Label>Daily budget (USD)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
            />
          </FormGroup>
        )}
        {budgetType === "lifetime" && (
          <FormGroup>
            <Label>Lifetime budget (USD)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={lifetimeBudget}
              onChange={(e) => setLifetimeBudget(e.target.value)}
            />
          </FormGroup>
        )}
        <FormGroup>
          <Label>Countries (comma-separated codes, e.g. US, CA, GB)</Label>
          <Input
            type="text"
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            placeholder="US, CA, GB"
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
        <FormGroup>
          <Label>Start time (optional)</Label>
          <Input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </FormGroup>
        <FormGroup>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={noEndDate}
              onChange={(e) => setNoEndDate(e.target.checked)}
            />
            <span>No end date (run until I turn it off)</span>
          </label>
        </FormGroup>
        {!noEndDate && (
          <FormGroup>
            <Label>End time</Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </FormGroup>
        )}
        <ButtonRow>
          <SubmitButton
            type="submit"
            disabled={
              saving ||
              !name.trim() ||
              (budgetType === "daily" && !(parseFloat(dailyBudget) > 0)) ||
              (budgetType === "lifetime" && !(parseFloat(lifetimeBudget) > 0))
            }
            $loading={saving}
          >
            <FaSave /> {saving ? "Saving…" : "Save changes"}
          </SubmitButton>
          <DeleteButton
            type="button"
            disabled={deleting}
            $loading={deleting}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <FaTrash /> Delete ad set
          </DeleteButton>
        </ButtonRow>
      </Form>

      {showDeleteConfirm && (
        <ModalOverlay onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Delete this ad set?</ModalTitle>
            <ModalText>
              This cannot be undone. Any ads in this ad set will also be affected.
            </ModalText>
            <ModalActions>
              <CancelBtn type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </CancelBtn>
              <ConfirmDeleteBtn type="button" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </ConfirmDeleteBtn>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
    </Container>
  );
}
