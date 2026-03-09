/**
 * @fileoverview Ad Manager — Edit campaign: name, objective, status, buying type, special ad category, platforms, budget, schedule. PUT to campaigns/[id].
 * @module ad-manager/campaigns/[id]/edit
 */
"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaFacebook,
  FaInstagram,
  FaEdit,
  FaSave,
  FaArrowLeft,
  FaDollarSign,
  FaCalendarAlt,
  FaBullseye,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { CAMPAIGN_OBJECTIVES } from "@/utils/facebook/api";

const Container = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
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
  transition: color 0.3s ease;

  &:hover {
    color: var(--primary);
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: #1877f2;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
`;

const FormContainer = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const Section = styled.div`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.3rem;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text);
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }

  option {
    background: var(--card-bg);
    color: var(--text);
  }
`;

/** Same card-style platform selection as Create page. */
const PlatformGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PlatformOption = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  border: 2px solid ${props => props.$selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  background-color: ${props => props.$selected ? 'rgba(108, 99, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  input[type="checkbox"] {
    display: none;
  }
  svg {
    font-size: 2rem;
  }
`;

const PlatformInfo = styled.div`
  flex: 1;
`;

const PlatformName = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const PlatformDescription = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const BudgetGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

/** Read-only field display (e.g. objective, budget level). */
const ReadOnlyValue = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 1rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'outline' }>`
  background: ${props => {
    switch (props.$variant) {
      case 'secondary': return 'rgba(255, 255, 255, 0.1)';
      case 'outline': return 'transparent';
      default: return 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)';
    }
  }};
  border: ${props => props.$variant === 'outline' ? '1px solid rgba(255, 255, 255, 0.3)' : 'none'};
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SPECIAL_AD_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'SOCIAL_ISSUES_ELECTIONS_POLITICS', label: 'Social issues, elections or politics' },
];

interface Campaign {
  id: string;
  name: string;
  description?: string;
  objective: string;
  status: 'active' | 'paused' | 'ended';
  /** Meta: AUCTION (default) or RESERVATION */
  buying_type?: string;
  /** Meta: special ad categories; empty for standard ads */
  special_ad_categories?: string[];
  platforms?: {
    facebook: boolean;
    instagram: boolean;
  };
  /** From API: campaign = CBO; ad_set = budget per ad set. */
  budgetLevel?: 'campaign' | 'ad_set';
  budget?: {
    type: 'daily' | 'lifetime';
    amount: number;
  };
  schedule?: {
    startDate?: string;
    endDate?: string;
  };
  createdAt: string;
}

export default function EditCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/facebook-ads/campaigns/${campaignId}`);
      const data = await response.json();
      
      if (data.success) {
        setCampaign(data.campaign);
      } else {
        setError('Campaign not found');
      }
    } catch (err) {
      setError('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!campaign) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/facebook-ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...campaign,
          special_ad_categories: campaign.special_ad_categories ?? [],
          buying_type: campaign.buying_type ?? 'AUCTION',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Campaign updated successfully!');
        setTimeout(() => {
          router.push('/admin/ad-manager/campaigns');
        }, 2000);
      } else {
        setError(data.error || 'Failed to update campaign');
      }
    } catch (err) {
      setError('Failed to update campaign');
    } finally {
      setSaving(false);
    }
  };

  const updateCampaign = (updates: Partial<Campaign>) => {
    setCampaign(prev => prev ? { ...prev, ...updates } : null);
  };

  if (!user) {
    return <LoadingComponent />;
  }

  if (loading) {
    return (
      <Container>
        <LoadingComponent />
      </Container>
    );
  }

  if (!campaign) {
    return (
      <Container>
        <ErrorMessage>
          <FaExclamationTriangle />
          Campaign not found
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton href="/admin/ad-manager/campaigns">
          <FaArrowLeft /> Back to Campaigns
        </BackButton>
        <Title>
          <FaEdit />
          Edit Campaign
        </Title>
        <Subtitle>
          Modify your {campaign.platforms?.facebook ? 'Facebook' : campaign.platforms?.instagram ? 'Instagram' : 'Facebook'} advertising campaign
        </Subtitle>
      </Header>

      {error && (
        <ErrorMessage>
          <FaExclamationTriangle />
          {error}
        </ErrorMessage>
      )}

      {success && (
        <SuccessMessage>
          <FaCheckCircle />
          {success}
        </SuccessMessage>
      )}

      <FormContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 1. Campaign basics — same order as Create */}
        <Section>
          <SectionTitle>
            <FaBullseye />
            Campaign details
          </SectionTitle>
          <FormGroup>
            <Label>Campaign name</Label>
            <Input
              type="text"
              value={campaign.name ?? ''}
              onChange={(e) => updateCampaign({ name: e.target.value })}
              placeholder="Enter a descriptive name for your campaign"
            />
          </FormGroup>
          <FormGroup>
            <Label>Campaign objective</Label>
            <ReadOnlyValue>
              {CAMPAIGN_OBJECTIVES[campaign.objective as keyof typeof CAMPAIGN_OBJECTIVES] ?? campaign.objective}
            </ReadOnlyValue>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Objective cannot be changed after creation.
            </p>
          </FormGroup>
          <FormGroup>
            <Label>Description (optional)</Label>
            <TextArea
              value={campaign.description || ''}
              onChange={(e) => updateCampaign({ description: e.target.value })}
              placeholder="Describe your campaign goals and target audience"
            />
          </FormGroup>
        </Section>

        {/* 2. Status — same concept as Create (Save as draft / Create & launch) */}
        <Section>
          <SectionTitle>Campaign status</SectionTitle>
          <FormGroup>
            <Label>Status</Label>
            <Select
              value={campaign.status ?? 'paused'}
              onChange={(e) => updateCampaign({ status: e.target.value as 'active' | 'paused' | 'ended' })}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </Select>
          </FormGroup>
        </Section>

        {/* 3. Settings — buying type, special ad category */}
        <Section>
          <SectionTitle>Settings</SectionTitle>
          <FormGroup>
            <Label>Buying type</Label>
            <Select
              value={campaign.buying_type ?? 'AUCTION'}
              onChange={(e) => updateCampaign({ buying_type: e.target.value })}
            >
              <option value="AUCTION">Auction (recommended)</option>
              <option value="RESERVATION">Reservation (reach & frequency)</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>Special ad category</Label>
            <Select
              value={(campaign.special_ad_categories ?? [])[0] ?? ''}
              onChange={(e) => updateCampaign({
                special_ad_categories: e.target.value ? [e.target.value] : [],
              })}
            >
              {SPECIAL_AD_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value || 'none'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormGroup>
        </Section>

        {/* 4. Budget level — read-only (matches Create "Where to set budget") */}
        <Section>
          <SectionTitle>Budget level</SectionTitle>
          <FormGroup>
            <ReadOnlyValue>
              {(campaign.budgetLevel ?? 'ad_set') === 'campaign'
                ? 'Campaign level — one budget for the whole campaign'
                : 'Ad set level — budget set when you create each ad set'}
            </ReadOnlyValue>
          </FormGroup>
        </Section>

        {/* 5. Platforms — same card UI as Create */}
        <Section>
          <SectionTitle>
            <FaFacebook />
            Platforms
          </SectionTitle>
          <PlatformGrid>
            <PlatformOption $selected={campaign.platforms?.facebook ?? true}>
              <input
                type="checkbox"
                checked={campaign.platforms?.facebook ?? true}
                onChange={(e) => updateCampaign({
                  platforms: { ...(campaign.platforms ?? { facebook: true, instagram: true }), facebook: e.target.checked }
                })}
              />
              <FaFacebook style={{ color: '#1877f2' }} />
              <PlatformInfo>
                <PlatformName>Facebook</PlatformName>
                <PlatformDescription>Reach users on Facebook News Feed, Stories, and more</PlatformDescription>
              </PlatformInfo>
            </PlatformOption>
            <PlatformOption $selected={campaign.platforms?.instagram ?? true}>
              <input
                type="checkbox"
                checked={campaign.platforms?.instagram ?? true}
                onChange={(e) => updateCampaign({
                  platforms: { ...(campaign.platforms ?? { facebook: true, instagram: true }), instagram: e.target.checked }
                })}
              />
              <FaInstagram style={{ color: '#e4405f' }} />
              <PlatformInfo>
                <PlatformName>Instagram</PlatformName>
                <PlatformDescription>Reach users on Instagram Feed, Stories, and Reels</PlatformDescription>
              </PlatformInfo>
            </PlatformOption>
          </PlatformGrid>
        </Section>

        {/* 6. Budget & schedule — only when campaign-level budget (same as Create) */}
        {(campaign.budgetLevel ?? 'ad_set') === 'campaign' ? (
          <Section>
            <SectionTitle>
              <FaDollarSign />
              Budget & schedule (campaign level)
            </SectionTitle>
            <FormGroup>
              <Label>Budget type</Label>
              <Select
                value={campaign.budget?.type ?? 'daily'}
                onChange={(e) => updateCampaign({
                  budget: { ...(campaign.budget ?? { type: 'daily', amount: 0 }), type: e.target.value as 'daily' | 'lifetime' }
                })}
              >
                <option value="daily">Daily budget</option>
                <option value="lifetime">Lifetime budget</option>
              </Select>
            </FormGroup>
            <BudgetGrid>
              {(campaign.budget?.type ?? 'daily') === 'daily' ? (
                <FormGroup>
                  <Label>Daily budget ($)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={0.01}
                    value={campaign.budget?.amount ?? ''}
                    onChange={(e) => updateCampaign({
                      budget: { ...(campaign.budget ?? { type: 'daily', amount: 0 }), amount: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="10.00"
                  />
                </FormGroup>
              ) : (
                <FormGroup>
                  <Label>Lifetime budget ($)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={0.01}
                    value={campaign.budget?.amount ?? ''}
                    onChange={(e) => updateCampaign({
                      budget: { ...(campaign.budget ?? { type: 'lifetime', amount: 0 }), amount: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="100.00"
                  />
                </FormGroup>
              )}
            </BudgetGrid>
            <BudgetGrid>
              <FormGroup>
                <Label><FaCalendarAlt /> Start date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={campaign.schedule?.startDate || ''}
                  onChange={(e) => updateCampaign({
                    schedule: { ...(campaign.schedule ?? { startDate: '', endDate: '' }), startDate: e.target.value }
                  })}
                />
              </FormGroup>
              <FormGroup>
                <Label><FaCalendarAlt /> End date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={campaign.schedule?.endDate || ''}
                  onChange={(e) => updateCampaign({
                    schedule: { ...(campaign.schedule ?? { startDate: '', endDate: '' }), endDate: e.target.value }
                  })}
                />
              </FormGroup>
            </BudgetGrid>
          </Section>
        ) : (
          <Section>
            <SectionTitle>
              <FaDollarSign />
              Budget & schedule
            </SectionTitle>
            <ReadOnlyValue>
              Budget is set per ad set. Create or edit ad sets to set budgets and schedule.
            </ReadOnlyValue>
          </Section>
        )}

        <ActionButtons>
          <Button
            $variant="outline"
            onClick={() => router.push('/admin/ad-manager/campaigns')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !campaign.name}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaSave />
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </ActionButtons>
      </FormContainer>
    </Container>
  );
} 