/**
 * @fileoverview Ad Manager — Create ad set under Campaigns: select campaign then go to campaign-specific form.
 * @module ad-manager/campaigns/adsets/create/page
 */

"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaBullseye, FaArrowLeft, FaPlus } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";

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
  font-size: 0.95rem;
  transition: color 0.2s ease;

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

const CampaignGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const CampaignCard = styled(motion.a)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const CampaignName = styled.span`
  font-weight: 600;
  color: var(--text);
`;

const CampaignMeta = styled.span`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
`;

const CardAction = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--primary);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
`;

export default function CreateAdSetSelectCampaignPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; status?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/facebook-ads/campaigns")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.campaigns)) {
          setCampaigns(
            data.campaigns.map((c: { id: string; name: string; status?: string }) => ({
              id: c.id,
              name: c.name || c.id,
              status: c.status,
            }))
          );
        } else {
          setFetchError(data.error || "Failed to load campaigns");
        }
      })
      .catch(() => {
        setFetchError("Failed to load campaigns");
      })
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <LoadingComponent />;

  return (
    <Container>
      <Header>
        <BackButton href="/admin/ad-manager/campaigns/adsets">
          <FaArrowLeft /> Back to Ad Sets
        </BackButton>
        <Title>
          <FaBullseye />
          Create ad set
        </Title>
        <Subtitle>
          Choose a campaign to create an ad set under. You can also create an ad set from the campaign list (expand a campaign → Create ad set) or from View Ad Sets with a campaign selected.
        </Subtitle>
      </Header>

      {loading ? (
        <LoadingComponent />
      ) : fetchError ? (
        <EmptyState>
          <p>{fetchError}</p>
          <p style={{ marginTop: "0.75rem" }}>
            If Facebook is connected, refresh this page. If not, reconnect in Ad Manager settings.
          </p>
        </EmptyState>
      ) : campaigns.length === 0 ? (
        <EmptyState>
          <p>No campaigns yet. Create a campaign first, then you can add ad sets.</p>
          <Link
            href="/admin/ad-manager/campaigns/create"
            style={{ marginTop: "1rem", display: "inline-block", color: "var(--primary)" }}
          >
            Create campaign
          </Link>
        </EmptyState>
      ) : (
        <CampaignGrid>
          {campaigns.map((campaign, i) => (
            <CampaignCard
              key={campaign.id}
              href={`/admin/ad-manager/campaigns/${campaign.id}/adsets/create`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span>
                <CampaignName>{campaign.name}</CampaignName>
                {campaign.status && (
                  <CampaignMeta>
                    {String(campaign.status).charAt(0).toUpperCase() + String(campaign.status).slice(1)}
                  </CampaignMeta>
                )}
              </span>
              <CardAction>
                <FaPlus />
                Add ad set
              </CardAction>
            </CampaignCard>
          ))}
        </CampaignGrid>
      )}
    </Container>
  );
}
