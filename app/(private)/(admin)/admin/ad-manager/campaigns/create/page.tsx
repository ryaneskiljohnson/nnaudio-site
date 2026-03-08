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

interface CampaignData {
  name: string;
  objective: string;
  description: string;
  platforms: {
    facebook: boolean;
    instagram: boolean;
  };
  budgetType: 'daily' | 'lifetime';
  dailyBudget: string;
  lifetimeBudget: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'paused';
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
    platforms: {
      facebook: true,
      instagram: false,
    },
    budgetType: 'daily',
    dailyBudget: '',
    lifetimeBudget: '',
    startDate: '',
    endDate: '',
    status: 'paused',
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
          dailyBudget: campaignData.budgetType === 'daily' && campaignData.dailyBudget 
            ? parseFloat(campaignData.dailyBudget) 
            : undefined,
          lifetimeBudget: campaignData.budgetType === 'lifetime' && campaignData.lifetimeBudget 
            ? parseFloat(campaignData.lifetimeBudget) 
            : undefined,
          startTime: campaignData.startDate || undefined,
          endTime: campaignData.endDate || undefined,
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
        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <SectionTitle>
            <FaInfoCircle />
            Campaign Details
          </SectionTitle>
          
          <FormGroup>
            <Label>Campaign Name</Label>
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
              Campaign Objective
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
            <Label>Description</Label>
            <TextArea
              value={campaignData.description}
              onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
              placeholder="Describe your campaign goals and target audience"
            />
          </FormGroup>
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
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

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <SectionTitle>
            <FaDollarSign />
            Budget & Schedule
          </SectionTitle>
          
          <FormGroup>
            <Label>Budget Type</Label>
            <RadioGroup>
              <RadioOption>
                <input
                  type="radio"
                  name="budgetType"
                  value="daily"
                  checked={campaignData.budgetType === 'daily'}
                  onChange={(e) => setCampaignData({ ...campaignData, budgetType: 'daily' })}
                />
                Daily Budget
              </RadioOption>
              <RadioOption>
                <input
                  type="radio"
                  name="budgetType"
                  value="lifetime"
                  checked={campaignData.budgetType === 'lifetime'}
                  onChange={(e) => setCampaignData({ ...campaignData, budgetType: 'lifetime' })}
                />
                Lifetime Budget
              </RadioOption>
            </RadioGroup>
          </FormGroup>

          <BudgetGrid>
            {campaignData.budgetType === 'daily' ? (
              <FormGroup>
                <Label>Daily Budget ($)</Label>
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
                <Label>Lifetime Budget ($)</Label>
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
              <Label>
                <FaCalendarAlt />
                Start Date (Optional)
              </Label>
              <Input
                type="datetime-local"
                value={campaignData.startDate}
                onChange={(e) => setCampaignData({ ...campaignData, startDate: e.target.value })}
              />
            </FormGroup>
            <FormGroup>
              <Label>
                <FaCalendarAlt />
                End Date (Optional)
              </Label>
              <Input
                type="datetime-local"
                value={campaignData.endDate}
                onChange={(e) => setCampaignData({ ...campaignData, endDate: e.target.value })}
              />
            </FormGroup>
          </BudgetGrid>
        </Section>

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