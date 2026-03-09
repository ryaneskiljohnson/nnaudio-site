/**
 * @fileoverview Ad Manager — Create campaign: name, objective, buying type, special ad category, budget level (campaign vs ad set), budget & schedule when campaign-level.
 * @module ad-manager/campaigns/create
 */
"use client";
import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaFacebook,
  FaInstagram,
  FaArrowLeft,
  FaSave,
  FaPlay,
  FaCalendarAlt,
  FaDollarSign,
  FaUsers,
  FaBullseye,
  FaInfoCircle,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CAMPAIGN_OBJECTIVES } from "@/utils/facebook/api";

const Container = styled.div`
  width: 100%;
  max-width: 800px;
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
  font-size: 0.9rem;
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
    margin-bottom: 1rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Section = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  color: var(--text);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Input = styled.input`
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const Select = styled.select`
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const TextArea = styled.textarea`
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const BudgetGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.02);
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  input[type="radio"] {
    margin: 0;
  }
`;

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

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ErrorBox = styled.div`
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.4);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  color: var(--text);
  font-size: 0.95rem;
  white-space: pre-wrap;
`;

const Button = styled(motion.button)<{ $variant?: 'primary' | 'secondary' }>`
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  ${props => props.$variant === 'primary' ? `
    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);
    }
  ` : `
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.2);

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: var(--text);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

/** Meta special ad categories (required by Meta; use [] for standard ads). */
const SPECIAL_AD_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None (standard ads)' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'SOCIAL_ISSUES_ELECTIONS_POLITICS', label: 'Social issues, elections or politics' },
];

interface CampaignData {
  name: string;
  objective: string;
  description: string;
  platforms: { facebook: boolean; instagram: boolean };
  /** Mirror Meta: set budget at campaign level or at ad set level. */
  budgetLevel: 'campaign' | 'ad_set';
  budgetType: 'daily' | 'lifetime';
  dailyBudget: string;
  lifetimeBudget: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'paused';
  /** Meta buying type: Auction (default) or Reservation. */
  buyingType: 'AUCTION' | 'RESERVATION';
  /** Meta required; empty for standard ads. */
  specialAdCategories: string[];
}

export default function CreateCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    objective: 'OUTCOME_TRAFFIC',
    description: '',
    platforms: { facebook: true, instagram: true },
    budgetLevel: 'ad_set',
    budgetType: 'daily',
    dailyBudget: '',
    lifetimeBudget: '',
    startDate: '2025-04-01T00:00',
    endDate: '2025-06-01T23:59',
    status: 'active',
    buyingType: 'AUCTION',
    specialAdCategories: [],
  });

  const handleSubmit = async (e: React.FormEvent, action: 'save' | 'launch') => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/facebook-ads/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignData.name,
          objective: campaignData.objective,
          status: action === 'launch' ? 'ACTIVE' : 'PAUSED',
          description: campaignData.description || undefined,
          platforms: campaignData.platforms,
          buying_type: campaignData.buyingType,
          special_ad_categories: campaignData.specialAdCategories.filter(Boolean),
          ...(campaignData.budgetLevel === 'campaign'
            ? {
                dailyBudget: campaignData.budgetType === 'daily' && campaignData.dailyBudget ? parseFloat(campaignData.dailyBudget) : undefined,
                lifetimeBudget: campaignData.budgetType === 'lifetime' && campaignData.lifetimeBudget ? parseFloat(campaignData.lifetimeBudget) : undefined,
                startTime: campaignData.startDate || undefined,
                endTime: campaignData.endDate || undefined,
              }
            : {}),
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/admin/ad-manager?campaign_created=true');
      } else {
        const errMsg = result.error || 'Failed to create campaign';
        console.error('Failed to create campaign:', errMsg);
        const isAdAccountError = /does not exist|cannot be loaded due to missing permissions|does not support this operation/i.test(errMsg);
        const permissionsHint =
          'Your Facebook user may need Advertiser or Admin role on this ad account. In Meta Business Manager: Business Settings → Accounts → Ad Accounts → [your account] → People — ensure your user has Advertiser or Admin. You can also try Disconnect then Connect again in Ad Manager settings.';
        setSubmitError(
          isAdAccountError ? `${errMsg} ${permissionsHint}` : errMsg
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to create campaign';
      console.error('Error creating campaign:', error);
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <LoadingComponent />;
  }

  return (
    <Container>
      <Header>
        <BackButton href="/admin/ad-manager">
          <FaArrowLeft /> Back to Ad Manager
        </BackButton>
        <Title>
          <FaFacebook />
          Create New Campaign
        </Title>
        <Subtitle>
          Create a new advertising campaign to reach your target audience on Facebook and Instagram
        </Subtitle>
      </Header>

      {submitError && (
        <ErrorBox role="alert">
          {submitError}
        </ErrorBox>
      )}

      <Form onSubmit={(e) => handleSubmit(e, 'save')}>
        {/* 1. Campaign details — same order as Edit */}
        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <SectionTitle>
            <FaInfoCircle />
            Campaign details
          </SectionTitle>
          <FormGroup>
            <Label>Campaign name</Label>
            <Input
              type="text"
              value={campaignData.name}
              onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
              placeholder="Enter a descriptive name for your campaign"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>
              <FaBullseye />
              Campaign objective
            </Label>
            <Select
              value={campaignData.objective}
              onChange={(e) => setCampaignData({ ...campaignData, objective: e.target.value })}
              required
            >
              {Object.entries(CAMPAIGN_OBJECTIVES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>Description (optional)</Label>
            <TextArea
              value={campaignData.description}
              onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
              placeholder="Describe your campaign goals and target audience"
            />
          </FormGroup>
        </Section>

        {/* 2. Settings — same as Edit */}
        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <SectionTitle>Settings</SectionTitle>
          <FormGroup>
            <Label>Buying type</Label>
            <Select
              value={campaignData.buyingType}
              onChange={(e) => setCampaignData({ ...campaignData, buyingType: e.target.value as 'AUCTION' | 'RESERVATION' })}
            >
              <option value="AUCTION">Auction (recommended)</option>
              <option value="RESERVATION">Reservation (reach & frequency)</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>Special ad category</Label>
            <Select
              value={campaignData.specialAdCategories[0] ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setCampaignData({ ...campaignData, specialAdCategories: v ? [v] : [] });
              }}
            >
              {SPECIAL_AD_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormGroup>
        </Section>

        {/* 3. Budget level — same as Edit (read-only there) */}
        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SectionTitle>Budget level</SectionTitle>
          <FormGroup>
            <Label>Where to set budget</Label>
            <RadioGroup>
              <RadioOption>
                <input
                  type="radio"
                  name="budgetLevel"
                  value="ad_set"
                  checked={campaignData.budgetLevel === 'ad_set'}
                  onChange={() => setCampaignData({ ...campaignData, budgetLevel: 'ad_set' })}
                />
                Ad set level — set budget when you create each ad set (recommended)
              </RadioOption>
              <RadioOption>
                <input
                  type="radio"
                  name="budgetLevel"
                  value="campaign"
                  checked={campaignData.budgetLevel === 'campaign'}
                  onChange={() => setCampaignData({ ...campaignData, budgetLevel: 'campaign' })}
                />
                Campaign level — set one budget for the whole campaign here
              </RadioOption>
            </RadioGroup>
          </FormGroup>
        </Section>

        {/* 4. Platforms — same as Edit */}
        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <SectionTitle>
            <FaUsers />
            Platforms
          </SectionTitle>
          
          <PlatformGrid>
            <PlatformOption $selected={campaignData.platforms.facebook}>
              <input
                type="checkbox"
                checked={campaignData.platforms.facebook}
                onChange={(e) => setCampaignData({
                  ...campaignData,
                  platforms: { ...campaignData.platforms, facebook: e.target.checked }
                })}
              />
              <FaFacebook style={{ color: '#1877f2' }} />
              <PlatformInfo>
                <PlatformName>Facebook</PlatformName>
                <PlatformDescription>Reach users on Facebook News Feed, Stories, and more</PlatformDescription>
              </PlatformInfo>
            </PlatformOption>

            <PlatformOption $selected={campaignData.platforms.instagram}>
              <input
                type="checkbox"
                checked={campaignData.platforms.instagram}
                onChange={(e) => setCampaignData({
                  ...campaignData,
                  platforms: { ...campaignData.platforms, instagram: e.target.checked }
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

        {campaignData.budgetLevel === 'campaign' && (
          <Section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <SectionTitle>
              <FaDollarSign />
              Budget & schedule (campaign level)
            </SectionTitle>

            <FormGroup>
              <Label>Budget type</Label>
              <RadioGroup>
                <RadioOption>
                  <input
                    type="radio"
                    name="budgetType"
                    value="daily"
                    checked={campaignData.budgetType === 'daily'}
                    onChange={() => setCampaignData({ ...campaignData, budgetType: 'daily' })}
                  />
                  Daily budget
                </RadioOption>
                <RadioOption>
                  <input
                    type="radio"
                    name="budgetType"
                    value="lifetime"
                    checked={campaignData.budgetType === 'lifetime'}
                    onChange={() => setCampaignData({ ...campaignData, budgetType: 'lifetime' })}
                  />
                  Lifetime budget
                </RadioOption>
              </RadioGroup>
            </FormGroup>

            <BudgetGrid>
              {campaignData.budgetType === 'daily' ? (
                <FormGroup>
                  <Label>Daily budget ($)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={campaignData.dailyBudget}
                    onChange={(e) => setCampaignData({ ...campaignData, dailyBudget: e.target.value })}
                    placeholder="10.00"
                  />
                </FormGroup>
              ) : (
                <FormGroup>
                  <Label>Lifetime budget ($)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={campaignData.lifetimeBudget}
                    onChange={(e) => setCampaignData({ ...campaignData, lifetimeBudget: e.target.value })}
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
                  value={campaignData.startDate}
                  onChange={(e) => setCampaignData({ ...campaignData, startDate: e.target.value })}
                />
              </FormGroup>
              <FormGroup>
                <Label><FaCalendarAlt /> End date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={campaignData.endDate}
                  onChange={(e) => setCampaignData({ ...campaignData, endDate: e.target.value })}
                />
              </FormGroup>
            </BudgetGrid>
          </Section>
        )}

        <ButtonGroup>
          <Button
            type="button"
            $variant="secondary"
            onClick={(e) => handleSubmit(e as any, 'save')}
            disabled={isSubmitting}
          >
            <FaSave />
            Save as Draft
          </Button>
          <Button
            type="button"
            $variant="primary"
            onClick={(e) => handleSubmit(e as any, 'launch')}
            disabled={isSubmitting || !campaignData.name || !campaignData.objective}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaPlay />
            {isSubmitting ? 'Creating...' : 'Create & Launch'}
          </Button>
        </ButtonGroup>
      </Form>
    </Container>
  );
} 