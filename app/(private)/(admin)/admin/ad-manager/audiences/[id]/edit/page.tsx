"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaUsers,
  FaArrowLeft,
  FaSave,
  FaTrash,
  FaGlobe,
  FaCalendarAlt,
  FaChartLine,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle,
  FaPlus,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

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

const StatusBadge = styled.div<{ $status: 'active' | 'inactive' | 'processing' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'active': return 'rgba(34, 197, 94, 0.2)';
      case 'processing': return 'rgba(245, 158, 11, 0.2)';
      default: return 'rgba(107, 114, 128, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return '#22c55e';
      case 'processing': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
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

interface Audience {
  id: string;
  name: string;
  description: string;
  type: 'custom' | 'lookalike' | 'saved';
  status: 'active' | 'inactive' | 'processing';
  size: number;
  reach: number;
  demographics?: {
    ageRange: string;
    gender: string;
    locations: string[];
  };
  interests?: string[];
  createdAt: string;
  lastUpdated: string;
}

/** Map API audience (id, name, description?, approximate_count?) to edit form shape. */
function mapApiAudienceToForm(a: { id: string; name?: string; description?: string; approximate_count?: number }): Audience {
  return {
    id: a.id,
    name: a.name ?? '',
    description: a.description ?? '',
    type: 'custom',
    status: 'active',
    size: a.approximate_count ?? 0,
    reach: 0,
    demographics: {
      ageRange: '18-65',
      gender: 'All',
      locations: []
    },
    interests: [],
    createdAt: '',
    lastUpdated: ''
  };
}

export default function EditAudiencePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const audienceId = params.id as string;

  const [audience, setAudience] = useState<Audience | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [newLocation, setNewLocation] = useState("");

  useEffect(() => {
    fetchAudience();
  }, [audienceId]);

  const fetchAudience = async () => {
    try {
      setError("");
      const res = await fetch("/api/facebook-ads/audiences");
      const data = await res.json();
      if (!data.success || !Array.isArray(data.audiences)) {
        setError("Failed to load audiences");
        setLoading(false);
        return;
      }
      const found = data.audiences.find((a: { id: string }) => a.id === audienceId);
      if (!found) {
        setError("Audience not found");
        setLoading(false);
        return;
      }
      setAudience(mapApiAudienceToForm(found));
    } catch (err) {
      setError("Failed to load audience data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!audience) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // In real implementation, make API call to update audience
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess("Audience updated successfully!");
      setTimeout(() => {
        router.push('/admin/ad-manager/audiences');
      }, 1500);
    } catch (error) {
      setError("Failed to update audience");
    } finally {
      setSaving(false);
    }
  };

  const updateAudience = (updates: Partial<Audience>) => {
    setAudience(prev => prev ? { ...prev, ...updates } : null);
  };

  const addInterest = () => {
    if (newInterest.trim() && audience) {
      updateAudience({
        interests: [...(audience.interests ?? []), newInterest.trim()]
      });
      setNewInterest("");
    }
  };

  const removeInterest = (index: number) => {
    if (audience) {
      updateAudience({
        interests: (audience.interests ?? []).filter((_, i) => i !== index)
      });
    }
  };

  const addLocation = () => {
    if (newLocation.trim() && audience) {
      const demos = audience.demographics ?? { ageRange: '18-65', gender: 'All', locations: [] };
      updateAudience({
        demographics: {
          ...demos,
          locations: [...(demos.locations ?? []), newLocation.trim()]
        }
      });
      setNewLocation("");
    }
  };

  const removeLocation = (index: number) => {
    if (audience) {
      const demos = audience.demographics ?? { ageRange: '18-65', gender: 'All', locations: [] };
      updateAudience({
        demographics: {
          ...demos,
          locations: (demos.locations ?? []).filter((_, i) => i !== index)
        }
      });
    }
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

  if (!audience) {
    return (
      <Container>
        <ErrorMessage>
          <FaExclamationTriangle />
          Audience not found
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton href="/admin/ad-manager/audiences">
          <FaArrowLeft /> Back to Audiences
        </BackButton>
        <Title>
          <FaUsers />
          Edit Audience
        </Title>
        <Subtitle>
          Modify your custom audience settings and targeting parameters
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
            Basic Information
          </SectionTitle>
          
          <FormGroup>
            <Label>Audience Name</Label>
            <Input
              type="text"
              value={audience.name ?? ''}
              onChange={(e) => updateAudience({ name: e.target.value })}
              placeholder="Enter audience name"
            />
          </FormGroup>

          <FormGroup>
            <Label>Description</Label>
            <TextArea
              value={audience.description ?? ''}
              onChange={(e) => updateAudience({ description: e.target.value })}
              placeholder="Describe your audience..."
            />
          </FormGroup>

          <Grid>
            <FormGroup>
              <Label>Audience Type</Label>
              <Select
                value={audience.type ?? 'custom'}
                onChange={(e) => updateAudience({ type: e.target.value as Audience['type'] })}
              >
                <option value="custom">Custom Audience</option>
                <option value="lookalike">Lookalike Audience</option>
                <option value="saved">Saved Audience</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Status</Label>
              <StatusBadge $status={audience.status ?? 'active'}>
                {(audience.status ?? 'active') === 'processing' && <FaSync />}
                {(audience.status ?? 'active').charAt(0).toUpperCase() + (audience.status ?? 'active').slice(1)}
              </StatusBadge>
            </FormGroup>
          </Grid>
        </Section>

        <Section>
          <SectionTitle>
            <FaGlobe />
            Demographics
          </SectionTitle>
          
          <Grid>
            <FormGroup>
              <Label>Age Range</Label>
              <Select
                value={audience.demographics?.ageRange ?? '18-65'}
                onChange={(e) => updateAudience({
                  demographics: { ...(audience.demographics ?? { ageRange: '18-65', gender: 'All', locations: [] }), ageRange: e.target.value }
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
                value={audience.demographics?.gender ?? 'All'}
                onChange={(e) => updateAudience({
                  demographics: { ...(audience.demographics ?? { ageRange: '18-65', gender: 'All', locations: [] }), gender: e.target.value }
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
              {(audience.demographics?.locations ?? []).map((location, index) => (
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
                placeholder="Add location"
                onKeyPress={(e) => e.key === 'Enter' && addLocation()}
              />
              <AddTagButton onClick={addLocation}>
                <FaPlus />
                Add
              </AddTagButton>
            </AddTagContainer>
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>
            <FaChartLine />
            Interests & Behaviors
          </SectionTitle>
          
          <FormGroup>
            <Label>Interests</Label>
            <TagContainer>
              {(audience.interests ?? []).map((interest, index) => (
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
                placeholder="Add interest"
                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
              />
              <AddTagButton onClick={addInterest}>
                <FaPlus />
                Add
              </AddTagButton>
            </AddTagContainer>
          </FormGroup>
        </Section>

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
            disabled={saving || !audience.name}
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