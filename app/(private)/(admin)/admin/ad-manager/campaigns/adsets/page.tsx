/**
 * @fileoverview Ad Manager — All Ad Sets list, under Campaigns. Filter by campaign, create/edit/delete.
 * @module ad-manager/campaigns/adsets/page
 */

"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaBullseye,
  FaPlus,
  FaArrowLeft,
  FaEdit,
  FaChartLine,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 8px 0;
  }
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const BackButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #1877f2;
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover {
    opacity: 0.95;
    transform: translateY(-2px);
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-secondary);
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const Select = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.95rem;
  min-width: 0;
  max-width: 100%;

  @media (max-width: 768px) {
    width: 100%;
  }

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const AdSetGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const AdSetCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.06);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const AdSetInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AdSetName = styled.h3`
  font-size: 1.1rem;
  margin: 0 0 0.35rem 0;
  color: var(--text);
`;

const AdSetMeta = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`;

const AdSetStats = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatusDot = styled.span<{ $status: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.5rem;
  background: ${(p) => {
    const s = (p.$status || "").toLowerCase();
    if (s === "active") return "#22c55e";
    if (s === "paused") return "#f59e0b";
    return "#6b7280";
  }};
`;

const AdSetActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const SmallLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 6px;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const OPTIMIZATION_LABELS: Record<string, string> = {
  LINK_CLICKS: "Link clicks",
  IMPRESSIONS: "Impressions",
  REACH: "Reach",
  CONVERSIONS: "Conversions",
  LEADS: "Leads",
  LANDING_PAGE_VIEWS: "Landing page views",
  VIDEO_VIEWS: "Video views",
  POST_ENGAGEMENT: "Post engagement",
  BRAND_AWARENESS: "Brand awareness",
};

interface AdSetRow {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  budget: number;
  optimization_goal?: string;
  countries?: string[];
  spent?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  createdAt: string;
}

/**
 * @brief Normalizes Meta IDs for reliable equality checks.
 * @param id Raw ID value from UI/API.
 * @returns Trimmed ID without an `act_` prefix.
 */
function normalizeMetaId(id?: string | null) {
  return String(id ?? "").trim().replace(/^act_/i, "");
}

function normalizeAdSet(raw: Record<string, unknown>): AdSetRow {
  const campaignId =
    (raw.campaignId as string) || (raw.campaign_id as string) || "";
  const budget =
    typeof raw.budget === "number"
      ? raw.budget
      : parseFloat((raw.daily_budget as string) || "0") / 100 || 0;
  const countries = raw.countries as string[] | undefined;
  return {
    id: (raw.id as string) || "",
    name: (raw.name as string) || "",
    campaignId,
    status: ((raw.status as string) || "").toLowerCase(),
    budget,
    optimization_goal: (raw.optimization_goal as string) || undefined,
    countries: Array.isArray(countries) ? countries : undefined,
    spent: typeof raw.spent === "number" ? raw.spent : undefined,
    impressions: typeof raw.impressions === "number" ? raw.impressions : undefined,
    clicks: typeof raw.clicks === "number" ? raw.clicks : undefined,
    ctr: typeof raw.ctr === "number" ? raw.ctr : undefined,
    createdAt: (raw.createdAt as string) || (raw.created_time as string) || "",
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num);
}

export default function CampaignAdSetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignIdFromUrl = searchParams.get("campaignId") ?? "";
  const [adSets, setAdSets] = useState<AdSetRow[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [campaignFilter, setCampaignFilter] = useState<string>(campaignIdFromUrl);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    setCampaignFilter((prev) => (campaignIdFromUrl || prev));
  }, [campaignIdFromUrl]);

  useEffect(() => {
    async function load() {
      setConnectionError(null);
      try {
        const adsetsUrl = "/api/facebook-ads/adsets";
        const [adSetsRes, campaignsRes] = await Promise.all([
          fetch(adsetsUrl, { credentials: "include" }),
          fetch("/api/facebook-ads/campaigns", { credentials: "include" }),
        ]);
        const adSetsData = await adSetsRes.json();
        const campaignsData = await campaignsRes.json();
        if (adSetsRes.status === 401 || campaignsRes.status === 401) {
          setConnectionError("Connect to Facebook in Ad Manager → Settings to view and create ad sets.");
        }
        if (adSetsData.success && Array.isArray(adSetsData.adSets)) {
          setAdSets(
            adSetsData.adSets.map((a: Record<string, unknown>) => normalizeAdSet(a))
          );
        }
        if (campaignsData.success && Array.isArray(campaignsData.campaigns)) {
          setCampaigns(
            campaignsData.campaigns.map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name || c.id,
            }))
          );
        }
      } catch (e) {
        console.error("Error loading ad sets:", e);
        setConnectionError("Failed to load ad sets. Try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignIdFromUrl]);

  const filteredAdSets = campaignFilter
    ? adSets.filter(
        (a) => normalizeMetaId(a.campaignId) === normalizeMetaId(campaignFilter)
      )
    : adSets;
  const campaignNameById = Object.fromEntries(
    campaigns.map((c) => [c.id, c.name])
  );

  if (!user) {
    return <LoadingComponent />;
  }

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <BackButton
            onClick={() => router.push("/admin/ad-manager/campaigns")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaArrowLeft />
            Back to Campaigns
          </BackButton>
          <Title>
            <FaBullseye />
            Ad Sets
          </Title>
        </HeaderLeft>
        <HeaderActions>
          <ActionLink
            href={
              campaignFilter
                ? `/admin/ad-manager/campaigns/adsets/create?campaignId=${encodeURIComponent(campaignFilter)}`
                : "/admin/ad-manager/campaigns/adsets/create"
            }
          >
            <FaPlus />
            Create ad set{campaignFilter ? " in this campaign" : ""}
          </ActionLink>
        </HeaderActions>
      </Header>

      {connectionError && (
        <div style={{ padding: "1rem", marginBottom: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, color: "#ef4444", fontSize: "0.9rem" }}>
          {connectionError}
          <Link href="/admin/ad-manager/settings" style={{ marginLeft: "0.5rem", color: "var(--primary)", textDecoration: "underline" }}>Settings</Link>
        </div>
      )}
      {loading ? (
        <LoadingState>
          <LoadingComponent />
        </LoadingState>
      ) : (
        <>
          {campaigns.length > 0 && (
            <FilterRow>
              <label htmlFor="campaign-filter" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Campaign:
              </label>
              <Select
                id="campaign-filter"
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
              >
                <option value="">All campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FilterRow>
          )}

          {filteredAdSets.length > 0 ? (
            <AdSetGrid>
              {filteredAdSets.map((adSet, index) => (
                <AdSetCard
                  key={adSet.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <AdSetInfo>
                    <AdSetName>
                      <StatusDot $status={adSet.status} />
                      {adSet.name}
                    </AdSetName>
                    <AdSetMeta>
                      Campaign: {campaignNameById[adSet.campaignId] || adSet.campaignId}
                      {adSet.budget > 0 && ` • Budget: ${formatCurrency(adSet.budget)}`}
                      {adSet.optimization_goal && ` • ${OPTIMIZATION_LABELS[adSet.optimization_goal] ?? adSet.optimization_goal}`}
                      {adSet.countries?.length ? ` • ${adSet.countries.join(", ")}` : ""}
                    </AdSetMeta>
                  </AdSetInfo>
                  <AdSetStats>
                    {adSet.spent != null && (
                      <StatItem>
                        <StatValue>{formatCurrency(adSet.spent)}</StatValue>
                        <StatLabel>Spent</StatLabel>
                      </StatItem>
                    )}
                    {adSet.impressions != null && (
                      <StatItem>
                        <StatValue>{formatNumber(adSet.impressions)}</StatValue>
                        <StatLabel>Impressions</StatLabel>
                      </StatItem>
                    )}
                    {adSet.clicks != null && (
                      <StatItem>
                        <StatValue>{formatNumber(adSet.clicks)}</StatValue>
                        <StatLabel>Clicks</StatLabel>
                      </StatItem>
                    )}
                    {adSet.ctr != null && (
                      <StatItem>
                        <StatValue>{adSet.ctr}%</StatValue>
                        <StatLabel>CTR</StatLabel>
                      </StatItem>
                    )}
                  </AdSetStats>
                  <AdSetActions>
                    <SmallLink
                      href={`/admin/ad-manager/campaigns/adsets/${adSet.id}/edit`}
                      title="Edit ad set"
                    >
                      <FaEdit />
                    </SmallLink>
                    <SmallLink
                      href={`/admin/ad-manager/campaigns/${adSet.campaignId}/edit`}
                      title="Edit campaign"
                    >
                      <FaChartLine />
                    </SmallLink>
                    <SmallLink
                      href={`/admin/ad-manager/campaigns/adsets/create?campaignId=${encodeURIComponent(adSet.campaignId)}`}
                      title="Create another ad set in this campaign"
                    >
                      <FaPlus />
                    </SmallLink>
                  </AdSetActions>
                </AdSetCard>
              ))}
            </AdSetGrid>
          ) : (
            <EmptyState>
              <EmptyStateIcon>
                <FaBullseye />
              </EmptyStateIcon>
              <h3>No ad sets yet</h3>
              <p>
                {campaignFilter
                  ? "No ad sets in this campaign. Create one to set budget and targeting."
                  : "Create an ad set under a campaign to define budget and targeting."}
              </p>
              <ActionLink
                href={
                  campaignFilter
                    ? `/admin/ad-manager/campaigns/adsets/create?campaignId=${encodeURIComponent(campaignFilter)}`
                    : "/admin/ad-manager/campaigns/adsets/create"
                }
                style={{ marginTop: "1rem" }}
              >
                <FaPlus />
                Create ad set{campaignFilter ? " in this campaign" : ""}
              </ActionLink>
            </EmptyState>
          )}
        </>
      )}
    </Container>
  );
}
