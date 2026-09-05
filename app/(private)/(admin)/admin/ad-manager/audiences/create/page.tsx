"use client";
import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaUsers,
  FaArrowLeft,
  FaSave,
  FaPlus,
  FaTimes,
  FaGlobe,
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUpload,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AudienceTypeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const TypeCard = styled.div<{ $selected: boolean }>`
  padding: 1.5rem;
  border: 2px solid ${props => props.$selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 12px;
  background: ${props => props.$selected ? 'rgba(24, 119, 242, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;

  &:hover {
    border-color: var(--primary);
    background: rgba(24, 119, 242, 0.05);
  }
`;

const TypeIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--primary);
`;

const TypeTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  color: var(--text);
`;

const TypeDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const Tag = styled.div`
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TagRemove = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
`;

const AddTagContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const AddTagInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const AddTagButton = styled.button`
  background: var(--primary);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background: var(--accent);
  }
`;

const UploadArea = styled.div`
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const UploadIcon = styled.div`
  font-size: 2rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${props => {
    switch (props.$variant) {
      case 'secondary': return 'rgba(255, 255, 255, 0.1)';
      case 'danger': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      default: return 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)';
    }
  }};
  border: none;
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

interface AudienceData {
  name: string;
  description: string;
  type: 'custom' | 'lookalike' | 'saved';
  demographics: {
    ageRange: string;
    gender: string;
    locations: string[];
  };
  interests: string[];
  source?: 'website_visitors' | 'customer_list' | 'app_users' | 'engagement';
  sourceFile?: File;
}

const audienceTypes = [
  {
    id: 'custom',
    title: 'Custom Audience',
    description: 'Create audience from your data (website visitors, customers, etc.)',
    icon: '👥'
  },
  {
    id: 'lookalike',
    title: 'Lookalike Audience',
    description: 'Find people similar to your existing customers',
    icon: '🔍'
  },
  {
    id: 'saved',
    title: 'Saved Audience',
    description: 'Target based on demographics, interests, and behaviors',
    icon: '💾'
  }
];

export default function CreateAudiencePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [audienceData, setAudienceData] = useState<AudienceData>({
    name: '',
    description: '',
    type: 'custom',
    demographics: {
      ageRange: '18-65',
      gender: 'All',
      locations: []
    },
    interests: []
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const handleSave = async () => {
    if (!audienceData.name.trim()) {
      setError('Audience name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const subtype = audienceData.type === 'lookalike' ? 'LOOKALIKE' : 'CUSTOM';
      const response = await fetch('/api/facebook-ads/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: audienceData.name.trim(),
          description: audienceData.description?.trim() || '',
          subtype
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create audience');
      }

      setSuccess('Audience created successfully!');
      setTimeout(() => router.push('/admin/ad-manager/audiences'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create audience. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateAudienceData = (updates: Partial<AudienceData>) => {
    setAudienceData(prev => ({ ...prev, ...updates }));
  };

  const addInterest = () => {
    if (newInterest.trim() && !audienceData.interests.includes(newInterest.trim())) {
      updateAudienceData({
        interests: [...audienceData.interests, newInterest.trim()]
      });
      setNewInterest('');
    }
  };

  const removeInterest = (index: number) => {
    updateAudienceData({
      interests: audienceData.interests.filter((_, i) => i !== index)
    });
  };

  const addLocation = () => {
    if (newLocation.trim() && !audienceData.demographics.locations.includes(newLocation.trim())) {
      updateAudienceData({
        demographics: {
          ...audienceData.demographics,
          locations: [...audienceData.demographics.locations, newLocation.trim()]
        }
      });
      setNewLocation('');
    }
  };

  const removeLocation = (index: number) => {
    updateAudienceData({
      demographics: {
        ...audienceData.demographics,
        locations: audienceData.demographics.locations.filter((_, i) => i !== index)
      }
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateAudienceData({ sourceFile: file });
    }
  };

  if (!user) {
    return <LoadingComponent />;
  }

  return (
    <Container>
      <Header>
        <BackButton href="/admin/ad-manager/audiences">
          <FaArrowLeft /> Back to Audiences
        </BackButton>
        <Title>
          <FaUsers />
          Create New Audience
        </Title>
        <Subtitle>
          Build a custom audience for your advertising campaigns
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
            <FaUsers />
            Audience Type
          </SectionTitle>
          
          <AudienceTypeSelector>
            {audienceTypes.map((type) => (
              <TypeCard
                key={type.id}
                $selected={audienceData.type === type.id}
                onClick={() => updateAudienceData({ type: type.id as any })}
              >
                <TypeIcon>{type.icon}</TypeIcon>
                <TypeTitle>{type.title}</TypeTitle>
                <TypeDescription>{type.description}</TypeDescription>
              </TypeCard>
            ))}
          </AudienceTypeSelector>
        </Section>

        <Section>
          <SectionTitle>
            <FaUsers />
            Basic Information
          </SectionTitle>
          
          <FormGroup>
            <Label>Audience Name *</Label>
            <Input
              type="text"
              value={audienceData.name}
              onChange={(e) => updateAudienceData({ name: e.target.value })}
              placeholder="Enter audience name"
            />
          </FormGroup>

          <FormGroup>
            <Label>Description</Label>
            <TextArea
              value={audienceData.description}
              onChange={(e) => updateAudienceData({ description: e.target.value })}
              placeholder="Describe your audience and targeting strategy..."
            />
          </FormGroup>
        </Section>

        {audienceData.type === 'custom' && (
          <Section>
            <SectionTitle>
              <FaUpload />
              Data Source
            </SectionTitle>
            
            <FormGroup>
              <Label>Source Type</Label>
              <Select
                value={audienceData.source || 'website_visitors'}
                onChange={(e) => updateAudienceData({ source: e.target.value as any })}
              >
                <option value="website_visitors">Website Visitors</option>
                <option value="customer_list">Customer List</option>
                <option value="app_users">App Users</option>
                <option value="engagement">Video/Page Engagement</option>
              </Select>
            </FormGroup>

            {audienceData.source === 'customer_list' && (
              <FormGroup>
                <Label>Upload Customer List</Label>
                <UploadArea onClick={() => document.getElementById('file-upload')?.click()}>
                  <UploadIcon>
                    <FaUpload />
                  </UploadIcon>
                  <p>Click to upload CSV or TXT file</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {audienceData.sourceFile ? audienceData.sourceFile.name : 'Max file size: 10MB'}
                  </p>
                </UploadArea>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </FormGroup>
            )}
          </Section>
        )}

        {(audienceData.type === 'saved' || audienceData.type === 'lookalike') && (
          <Section>
            <SectionTitle>
              <FaGlobe />
              Demographics
            </SectionTitle>
            
            <Grid>
              <FormGroup>
                <Label>Age Range</Label>
                <Select
                  value={audienceData.demographics.ageRange}
                  onChange={(e) => updateAudienceData({
                    demographics: { ...audienceData.demographics, ageRange: e.target.value }
                  })}
                >
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-44">35-44</option>
                  <option value="45-54">45-54</option>
                  <option value="55-64">55-64</option>
                  <option value="65+">65+</option>
                  <option value="18-65">All Adults (18-65)</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Gender</Label>
                <Select
                  value={audienceData.demographics.gender}
                  onChange={(e) => updateAudienceData({
                    demographics: { ...audienceData.demographics, gender: e.target.value }
                  })}
                >
                  <option value="All">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Select>
              </FormGroup>
            </Grid>

            <FormGroup>
              <Label>Locations</Label>
              <TagContainer>
                {audienceData.demographics.locations.map((location, index) => (
                  <Tag key={index}>
                    {location}
                    <TagRemove onClick={() => removeLocation(index)}>
                      <FaTimes />
                    </TagRemove>
                  </Tag>
                ))}
              </TagContainer>
              <AddTagContainer>
                <AddTagInput
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Add location (e.g., United States)"
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                />
                <AddTagButton onClick={addLocation}>
                  <FaPlus />
                  Add
                </AddTagButton>
              </AddTagContainer>
            </FormGroup>
          </Section>
        )}

        {audienceData.type === 'saved' && (
          <Section>
            <SectionTitle>
              <FaChartLine />
              Interests & Behaviors
            </SectionTitle>
            
            <FormGroup>
              <Label>Interests</Label>
              <TagContainer>
                {audienceData.interests.map((interest, index) => (
                  <Tag key={index}>
                    {interest}
                    <TagRemove onClick={() => removeInterest(index)}>
                      <FaTimes />
                    </TagRemove>
                  </Tag>
                ))}
              </TagContainer>
              <AddTagContainer>
                <AddTagInput
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add interest (e.g., Music Production)"
                  onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                />
                <AddTagButton onClick={addInterest}>
                  <FaPlus />
                  Add
                </AddTagButton>
              </AddTagContainer>
            </FormGroup>
          </Section>
        )}

        <ActionButtons>
          <Button
            $variant="secondary"
            onClick={() => router.push('/admin/ad-manager/audiences')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !audienceData.name}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaSave />
            {saving ? 'Creating...' : 'Create Audience'}
          </Button>
        </ActionButtons>
      </FormContainer>
    </Container>
  );
} 