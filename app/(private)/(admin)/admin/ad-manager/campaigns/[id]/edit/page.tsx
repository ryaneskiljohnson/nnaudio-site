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
  FaPlay,
  FaPause,
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

const CheckboxGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text);
  cursor: pointer;
`;

const Checkbox = styled.input`
  margin: 0;
`;

const StatusBadge = styled.div<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'active': return 'rgba(34, 197, 94, 0.2)';
      case 'paused': return 'rgba(245, 158, 11, 0.2)';
      case 'ended': return 'rgba(239, 68, 68, 0.2)';
      default: return 'rgba(107, 114, 128, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return '#22c55e';
      case 'paused': return '#f59e0b';
      case 'ended': return '#ef4444';
      default: return '#6b7280';
    }
  }};
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

interface Campaign {
  id: string;
  name: string;
  description?: string;
  objective: string;
  status: 'active' | 'paused' | 'ended';
  platforms: {
    facebook: boolean;
    instagram: boolean;
  };
  budget: {
    type: 'daily' | 'lifetime';
    amount: number;
  };
  schedule: {
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
        body: JSON.stringify(campaign),
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
          Modify your {campaign.platforms.facebook ? 'Facebook' : 'Instagram'} advertising campaign
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
        <Section>
          <SectionTitle>
            <FaBullseye />
            Campaign Details
          </SectionTitle>
          
          <FormGroup>
            <Label>Campaign Name</Label>
            <Input
              type="text"
              value={campaign.name}
              onChange={(e) => updateCampaign({ name: e.target.value })}
              placeholder="Enter campaign name"
            />
          </FormGroup>

          <FormGroup>
            <Label>Description (Optional)</Label>
            <TextArea
              value={campaign.description || ''}
              onChange={(e) => updateCampaign({ description: e.target.value })}
              placeholder="Describe your campaign objectives..."
            />
          </FormGroup>

          <FormGroup>
            <Label>Campaign Objective</Label>
            <Select
              value={campaign.objective}
              onChange={(e) => updateCampaign({ objective: e.target.value })}
            >
              {Object.entries(CAMPAIGN_OBJECTIVES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Current Status</Label>
            <StatusBadge $status={campaign.status}>
              {campaign.status === 'active' ? <FaPlay /> : <FaPause />}
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </StatusBadge>
          </FormGroup>

          <FormGroup>
            <Label>Campaign Status</Label>
            <Select
              value={campaign.status}
              onChange={(e) => updateCampaign({ status: e.target.value as 'active' | 'paused' | 'ended' })}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </Select>
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>
            <FaFacebook />
            Platforms
          </SectionTitle>
          
          <CheckboxGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={campaign.platforms.facebook}
                onChange={(e) => updateCampaign({
                  platforms: { ...campaign.platforms, facebook: e.target.checked }
                })}
              />
              <FaFacebook /> Facebook
            </CheckboxLabel>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={campaign.platforms.instagram}
                onChange={(e) => updateCampaign({
                  platforms: { ...campaign.platforms, instagram: e.target.checked }
                })}
              />
              <FaInstagram /> Instagram
            </CheckboxLabel>
          </CheckboxGroup>
        </Section>

        <Section>
          <SectionTitle>
            <FaDollarSign />
            Budget
          </SectionTitle>
          
          <FormGroup>
            <Label>Budget Type</Label>
            <Select
              value={campaign.budget.type}
              onChange={(e) => updateCampaign({
                budget: { ...campaign.budget, type: e.target.value as 'daily' | 'lifetime' }
              })}
            >
              <option value="daily">Daily Budget</option>
              <option value="lifetime">Lifetime Budget</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>{campaign.budget.type === 'daily' ? 'Daily' : 'Lifetime'} Budget ($)</Label>
            <Input
              type="number"
              value={campaign.budget.amount}
              onChange={(e) => updateCampaign({
                budget: { ...campaign.budget, amount: parseFloat(e.target.value) || 0 }
              })}
              placeholder="Enter budget amount"
              min="1"
              step="0.01"
            />
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>
            <FaCalendarAlt />
            Schedule
          </SectionTitle>
          
          <FormGroup>
            <Label>Start Date (Optional)</Label>
            <Input
              type="datetime-local"
              value={campaign.schedule.startDate || ''}
              onChange={(e) => updateCampaign({
                schedule: { ...campaign.schedule, startDate: e.target.value }
              })}
            />
          </FormGroup>

          <FormGroup>
            <Label>End Date (Optional)</Label>
            <Input
              type="datetime-local"
              value={campaign.schedule.endDate || ''}
              onChange={(e) => updateCampaign({
                schedule: { ...campaign.schedule, endDate: e.target.value }
              })}
            />
          </FormGroup>
        </Section>

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
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </ActionButtons>
      </FormContainer>
    </Container>
  );
} 