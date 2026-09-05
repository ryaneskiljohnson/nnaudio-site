/**
 * @fileoverview Ad Manager — Create ad: three-step wizard. Step 1: Campaign & ad set; Step 2: Creative (copy, image/video, CTA); Step 3: Preview. Follows Meta hierarchy Campaign → Ad Set → Ad.
 * @module ad-manager/ads/create
 */
"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFacebook,
  FaInstagram,
  FaImage,
  FaVideo,
  FaPlus,
  FaSave,
  FaPlay,
  FaArrowLeft,
  FaArrowRight,
  FaUsers,
  FaDollarSign,
  FaBullseye,
  FaPalette,
  FaEye,
  FaUpload,
  FaLink,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCloudUploadAlt,
  FaCheck,
  FaFileImage,
  FaFileVideo,
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
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 2rem;
  padding: 0.5rem 0;
  font-size: 1rem;
  transition: color 0.3s ease;

  &:hover {
    color: var(--primary);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  line-height: 1.2;

  svg {
    color: #1877f2;
    font-size: 2rem;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    gap: 1rem;
    
    svg {
      font-size: 1.5rem;
    }
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 4rem;
  padding: 2rem 3rem;

  @media (max-width: 768px) {
    padding: 0.75rem 0;
    margin-bottom: 2rem;
    overflow-x: auto;
    justify-content: flex-start;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const Step = styled.div<{ $active: boolean; $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
  margin: 0 2rem;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -3rem;
    width: 4rem;
    height: 2px;
    background: ${props => props.$completed ? 'var(--primary)' : 'rgba(255, 255, 255, 0.2)'};
    z-index: 1;
  }

  @media (max-width: 768px) {
    gap: 1rem;
    margin: 0 1rem;
    
    &:not(:last-child)::after {
      right: -2rem;
      width: 2rem;
    }
  }
`;

const StepNumber = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => 
    props.$completed ? 'var(--primary)' : 
    props.$active ? 'var(--accent)' : 
    'rgba(255, 255, 255, 0.1)'
  };
  border: 2px solid ${props => 
    props.$completed || props.$active ? 'transparent' : 
    'rgba(255, 255, 255, 0.2)'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  position: relative;
  z-index: 2;
  font-size: 1.1rem;

  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
`;

const StepLabel = styled.span<{ $active: boolean }>`
  color: ${props => props.$active ? 'var(--text)' : 'var(--text-secondary)'};
  font-weight: ${props => props.$active ? '600' : '400'};
  font-size: 1.1rem;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
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

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const CreativeBuilder = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const CreativeEditor = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const CreativePreview = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PreviewContainer = styled.div`
  background: #f0f2f5;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
`;

const FacebookPost = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const PageAvatar = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
`;

const PageInfo = styled.div`
  flex: 1;
`;

const PageName = styled.div`
  font-weight: 600;
  color: #1c1e21;
  font-size: 0.9rem;
`;

const SponsoredLabel = styled.div`
  color: #65676b;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const PostContent = styled.div`
  margin-bottom: 0.75rem;
`;

const PostText = styled.div`
  color: #1c1e21;
  font-size: 0.9rem;
  line-height: 1.33;
  margin-bottom: 0.75rem;
`;

const PostImage = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 3rem;
  margin-bottom: 0.75rem;
`;

const CTAButton = styled.div`
  background: #1877f2;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: #166fe5;
  }
`;

const UploadArea = styled.div<{ $hasFile?: boolean }>`
  position: relative;
  border: 2px dotted ${props => props.$hasFile ? '#6C63FF' : 'rgba(255, 255, 255, 0.4)'};
  border-radius: 16px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
  background: ${props => props.$hasFile 
    ? 'linear-gradient(135deg, rgba(108, 99, 255, 0.1) 0%, rgba(78, 205, 196, 0.05) 100%)'
    : 'rgba(255, 255, 255, 0.02)'
  };

  &:hover {
    border-color: #6C63FF;
    background: ${props => props.$hasFile 
      ? 'linear-gradient(135deg, rgba(108, 99, 255, 0.15) 0%, rgba(78, 205, 196, 0.08) 100%)'
      : 'linear-gradient(135deg, rgba(108, 99, 255, 0.08) 0%, rgba(78, 205, 196, 0.03) 100%)'
    };
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.15);
  }
`;

const UploadIcon = styled.div<{ $hasFile?: boolean }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${props => props.$hasFile 
    ? 'linear-gradient(135deg, #6C63FF 0%, #4ECDCA 100%)'
    : 'rgba(255, 255, 255, 0.1)'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 1.5rem;
  color: ${props => props.$hasFile ? 'white' : 'rgba(255, 255, 255, 0.6)'};
  transition: all 0.3s ease;
`;

const UploadText = styled.div<{ $hasFile?: boolean }>`
  color: ${props => props.$hasFile ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'};
  font-size: 1rem;
  font-weight: ${props => props.$hasFile ? '600' : '500'};
  margin-bottom: 0.5rem;
`;

const UploadSubtext = styled.small<{ $hasFile?: boolean }>`
  color: ${props => props.$hasFile ? '#6C63FF' : 'rgba(255, 255, 255, 0.5)'};
  font-size: 0.85rem;
  display: block;
  opacity: 0.8;
`;

const FileInfo = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const FileName = styled.div`
  color: #ffffff;
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FileSize = styled.small`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
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

const CampaignSelector = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const CampaignOption = styled.div<{ $selected: boolean }>`
  padding: 1rem;
  border: 2px solid ${props => props.$selected ? '#6C63FF' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 12px;
  background: ${props => props.$selected ? 'rgba(108, 99, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #6C63FF;
    background: rgba(108, 99, 255, 0.05);
  }
`;

const CampaignName = styled.h4`
  margin: 0 0 0.5rem 0;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CampaignMeta = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const steps = ['Campaign & ad set', 'Creative', 'Preview'];

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  platform: string;
}

interface AdData {
  campaignId: string;
  adSetId: string;
  name: string;
  creative: {
    type: 'image' | 'video';
    title: string;
    body: string;
    imageUrl?: string;
    videoUrl?: string;
    callToAction: string;
    linkUrl?: string;
  };
  status: 'active' | 'paused';
}

/**
 * @brief Normalizes Meta IDs to avoid string-format mismatches.
 * @param id Raw ID from API or UI state (can include `act_` prefix).
 * @returns Normalized ID string used for safe comparisons.
 */
function normalizeMetaId(id?: string | null): string {
  return String(id ?? '').trim().replace(/^act_/i, '');
}

export default function CreateAdPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<any[]>([]);
  const [allAdSets, setAllAdSets] = useState<any[]>([]);
  const [adSetFilterFallback, setAdSetFilterFallback] = useState(false);
  const [adSetsLoading, setAdSetsLoading] = useState(false);
  const [adSetsError, setAdSetsError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [adData, setAdData] = useState<AdData>({
    campaignId: searchParams.get('campaignId') || '',
    adSetId: searchParams.get('adSetId') || '',
    name: '',
    creative: {
      type: 'image',
      title: '',
      body: '',
      callToAction: 'Learn More',
      linkUrl: ''
    },
    status: 'paused'
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (adData.campaignId) {
      fetchAdSets(adData.campaignId);
    }
  }, [adData.campaignId]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/facebook-ads/campaigns', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns ?? []);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchAdSets = async (campaignId: string) => {
    if (!campaignId) {
      setAllAdSets([]);
      setAdSets([]);
      setAdSetFilterFallback(false);
      setAdSetsError(null);
      setAdSetsLoading(false);
      return;
    }
    setAdSetsLoading(true);
    setAdSetsError(null);
    setAdSets([]);
    try {
      const response = await fetch('/api/facebook-ads/adsets', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();
      if (response.status === 401) {
        setAdSetsError('Connect to Facebook in Ad Manager → Settings to see ad sets.');
        setAdSets([]);
        return;
      }
      if (data.success && Array.isArray(data.adSets)) {
        setAllAdSets(data.adSets);
        const selectedCampaignId = normalizeMetaId(campaignId);
        const filteredAdSets = data.adSets.filter((adSet: { campaignId?: string; campaign_id?: string }) => {
          const adSetCampaignId = normalizeMetaId(adSet.campaignId ?? adSet.campaign_id ?? '');
          return adSetCampaignId === selectedCampaignId;
        });
        const resolvedAdSets = filteredAdSets.length > 0 ? filteredAdSets : data.adSets;
        setAdSets(resolvedAdSets);
        setAdSetFilterFallback(filteredAdSets.length === 0 && data.adSets.length > 0);
        if (resolvedAdSets.length === 0) {
          setAdSetsError(null);
        }
        if (!resolvedAdSets.some((adSet: { id?: string }) => adSet.id === adData.adSetId)) {
          setAdData((prev) => ({ ...prev, adSetId: '' }));
        }
      } else {
        setAllAdSets([]);
        setAdSets([]);
        setAdSetFilterFallback(false);
        setAdSetsError(data.error || 'Could not load ad sets.');
      }
    } catch (error) {
      console.error('Error fetching ad sets:', error);
      setAllAdSets([]);
      setAdSets([]);
      setAdSetFilterFallback(false);
      setAdSetsError('Failed to load ad sets. Try again.');
    } finally {
      setAdSetsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxSize = adData.creative.type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Maximum size is ${adData.creative.type === 'image' ? '10MB' : '100MB'}`);
      return;
    }
    setUploadError(null);
    setUploadedFile(file);
    const previewUrl = URL.createObjectURL(file);
    if (adData.creative.type === 'image') {
      setAdData(prev => ({ ...prev, creative: { ...prev.creative, imageUrl: previewUrl } }));
    } else {
      setAdData(prev => ({ ...prev, creative: { ...prev.creative, videoUrl: previewUrl } }));
    }
    if (adData.creative.type === 'image') {
      try {
        const formData = new FormData();
        formData.append('file', file, file.name);
        const res = await fetch('/api/facebook-ads/ad-images', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success && data.hash) {
          setImageHash(data.hash);
        } else {
          setUploadError(data.error || 'Upload failed');
          setImageHash(null);
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        setImageHash(null);
      }
    }
  };

  const handleCreateAd = async (isDraft: boolean = false) => {
    setIsSubmitting(true);
    try {
      const status = isDraft ? 'paused' : 'active';
      const link = adData.creative.linkUrl?.trim() || '';
      const message = adData.creative.body?.trim() || '';
      const headline = adData.creative.title?.trim() || '';

      let body: Record<string, unknown> = {
        name: adData.name,
        adSetId: adData.adSetId,
        status,
        creative: adData.creative
      };

      if (imageHash && link && message) {
        body = {
          name: adData.name,
          adSetId: adData.adSetId,
          status,
          image_hash: imageHash,
          link,
          message,
          headline: headline || undefined
        };
      }

      const response = await fetch('/api/facebook-ads/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.success) {
        router.push('/admin/ad-manager/campaigns');
      } else {
        setUploadError(data.error || 'Failed to create ad');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to create ad');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0: return !!adData.campaignId && !!adData.adSetId;
      case 1: return !!adData.name && !!adData.creative.body && !!adData.creative.linkUrl &&
                     (adData.creative.imageUrl || adData.creative.videoUrl || uploadedFile) &&
                     (adData.creative.type !== 'image' || imageHash);
      case 2: return true;
      default: return false;
    }
  };

  if (!user) {
    return <LoadingComponent />;
  }

  return (
    <Container>
      <Header>
        <BackButton href="/admin/ad-manager/campaigns">
          <FaArrowLeft /> Back to Campaigns
        </BackButton>
        <Title>
          <FaPlus />
          Create New Ad
        </Title>
        <Subtitle>
          Design and launch your advertising creative across Facebook and Instagram
        </Subtitle>
      </Header>

      {uploadError && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444' }}>
          {uploadError}
        </div>
      )}

      <StepIndicator>
        {steps.map((step, index) => (
          <Step key={step} $active={index === currentStep} $completed={index < currentStep}>
            <StepNumber $active={index === currentStep} $completed={index < currentStep}>
              {index < currentStep ? <FaCheckCircle /> : index + 1}
            </StepNumber>
            <StepLabel $active={index === currentStep}>{step}</StepLabel>
          </Step>
        ))}
      </StepIndicator>

      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <FormContainer
            key="step-1"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <h3>Select Campaign & Ad Set</h3>
            
                        <FormGroup>
              <Label>
                <FaBullseye />
                Select Campaign
              </Label>
              <CampaignSelector>
                {campaigns.map((campaign) => (
                  <CampaignOption
                    key={campaign.id}
                    $selected={adData.campaignId === campaign.id}
                    onClick={() => setAdData({ ...adData, campaignId: campaign.id, adSetId: '' })}
                  >
                    <CampaignName>
                      {campaign.platform === 'facebook' ? <FaFacebook /> : <FaInstagram />}
                      {campaign.name}
                    </CampaignName>
                    <CampaignMeta>
                      {campaign.objective} • Status: {campaign.status}
                    </CampaignMeta>
                  </CampaignOption>
                ))}
              </CampaignSelector>
            </FormGroup>

            {adData.campaignId && (
              <FormGroup>
                <Label>
                  <FaUsers />
                  Select Ad Set
                </Label>
                <Select
                  value={adData.adSetId}
                  onChange={(e) => setAdData({ ...adData, adSetId: e.target.value })}
                  disabled={adSetsLoading}
                >
                  <option value="">
                    {adSetsLoading ? 'Loading ad sets...' : 'Choose an ad set...'}
                  </option>
                  {adSets.map((adSet) => (
                    <option key={adSet.id} value={adSet.id}>
                      {adSet.name} (Budget: ${typeof adSet.budget === 'number' ? adSet.budget.toFixed(2) : adSet.budget ?? '0'})
                    </option>
                  ))}
                </Select>
                {adSetsError && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {adSetsError}
                    {adSetsError.includes('Connect') && (
                      <Link href="/admin/ad-manager/settings" style={{ marginLeft: '0.35rem', color: 'var(--primary)' }}>Settings</Link>
                    )}
                  </p>
                )}
                {!adSetsLoading && !adSetsError && adSetFilterFallback && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    No exact ID match for this campaign in Meta right now, so showing all available ad sets.
                  </p>
                )}
                {!adSetsLoading && !adSetsError && allAdSets.length === 0 && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    No ad sets in this campaign.{' '}
                    <Link
                      href={`/admin/ad-manager/campaigns/adsets/create?campaignId=${encodeURIComponent(adData.campaignId)}`}
                      style={{ color: 'var(--primary)' }}
                    >
                      Create one first
                    </Link>
                  </p>
                )}
              </FormGroup>
            )}
          </FormContainer>
        )}

        {currentStep === 1 && (
          <FormContainer
            key="step-2"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <h3>Design Your Creative</h3>
            
            <FormGroup>
              <Label>Ad Name</Label>
              <Input
                type="text"
                value={adData.name}
                onChange={(e) => setAdData({ ...adData, name: e.target.value })}
                placeholder="Enter a name for your ad"
              />
            </FormGroup>

            <CreativeBuilder>
              <CreativeEditor>
                <h4>Creative Editor</h4>
                
                <FormGroup>
                  <Label>
                    <FaPalette />
                    Creative Type
                  </Label>
                  <Select
                    value={adData.creative.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'image' | 'video';
                      setAdData({
                        ...adData,
                        creative: { 
                          ...adData.creative, 
                          type: newType,
                          imageUrl: undefined,
                          videoUrl: undefined
                        }
                      });
                      setUploadedFile(null); // Reset uploaded file when type changes
                    }}
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>
                    <FaUpload />
                    Upload {adData.creative.type === 'image' ? 'Image' : 'Video'}
                  </Label>
                  <div style={{
                    border: '2px dashed #666',
                    borderRadius: '8px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: uploadedFile ? '#1a1a2e' : 'transparent',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="file"
                      accept={adData.creative.type === 'image' ? 'image/*' : 'video/*'}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                      {uploadedFile ? (
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
                          <div style={{ color: '#fff', marginBottom: '0.5rem' }}>{uploadedFile.name}</div>
                          <div style={{ color: '#888', fontSize: '0.9rem' }}>
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</div>
                          <div style={{ color: '#fff', marginBottom: '0.5rem' }}>
                            Click to upload {adData.creative.type}
                          </div>
                          <div style={{ color: '#888', fontSize: '0.9rem' }}>
                            {adData.creative.type === 'image' 
                              ? 'JPG, PNG, GIF up to 10MB' 
                              : 'MP4, MOV up to 100MB'
                            }
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </FormGroup>

                <FormGroup>
                  <Label>Headline</Label>
                  <Input
                    type="text"
                    value={adData.creative.title}
                    onChange={(e) => setAdData({
                      ...adData,
                      creative: { ...adData.creative, title: e.target.value }
                    })}
                    placeholder="Enter your headline"
                    maxLength={40}
                  />
                  <small>{adData.creative.title.length}/40 characters</small>
                </FormGroup>

                <FormGroup>
                  <Label>Primary Text</Label>
                  <TextArea
                    value={adData.creative.body}
                    onChange={(e) => setAdData({
                      ...adData,
                      creative: { ...adData.creative, body: e.target.value }
                    })}
                    placeholder="Write your ad copy here..."
                    maxLength={125}
                  />
                  <small>{adData.creative.body.length}/125 characters</small>
                </FormGroup>

                <FormGroup>
                  <Label>Call to Action</Label>
                  <Select
                    value={adData.creative.callToAction}
                    onChange={(e) => setAdData({
                      ...adData,
                      creative: { ...adData.creative, callToAction: e.target.value }
                    })}
                  >
                    <option value="Learn More">Learn More</option>
                    <option value="Sign Up">Sign Up</option>
                    <option value="Shop Now">Shop Now</option>
                    <option value="Download">Download</option>
                    <option value="Get Quote">Get Quote</option>
                    <option value="Contact Us">Contact Us</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>
                    <FaLink />
                    Destination URL
                  </Label>
                  <Input
                    type="url"
                    value={adData.creative.linkUrl}
                    onChange={(e) => setAdData({
                      ...adData,
                      creative: { ...adData.creative, linkUrl: e.target.value }
                    })}
                    placeholder="https://your-website.com"
                  />
                </FormGroup>
              </CreativeEditor>

              <CreativePreview>
                <h4>
                  <FaEye />
                  Preview
                </h4>
                <PreviewContainer>
                  <FacebookPost>
                    <PostHeader>
                      <PageAvatar>C</PageAvatar>
                      <PageInfo>
                        <PageName>Cymasphere</PageName>
                        <SponsoredLabel>
                          Sponsored • <FaEye />
                        </SponsoredLabel>
                      </PageInfo>
                    </PostHeader>
                    <PostContent>
                      {adData.creative.body && (
                        <PostText>{adData.creative.body}</PostText>
                      )}
                      <PostImage>
                        {uploadedFile || adData.creative.imageUrl || adData.creative.videoUrl ? (
                          <div style={{ fontSize: '0.9rem', textAlign: 'center' }}>
                            {adData.creative.type === 'image' ? '🖼️ Image Uploaded' : '🎥 Video Uploaded'}
                            <br />
                            <small>{uploadedFile?.name || 'Media ready'}</small>
                          </div>
                        ) : (
                          adData.creative.type === 'image' ? <FaImage /> : <FaVideo />
                        )}
                      </PostImage>
                      {adData.creative.title && (
                        <PostText style={{ fontWeight: 600, fontSize: '1rem' }}>
                          {adData.creative.title}
                        </PostText>
                      )}
                      <CTAButton>
                        {adData.creative.callToAction}
                      </CTAButton>
                    </PostContent>
                  </FacebookPost>
                </PreviewContainer>
              </CreativePreview>
            </CreativeBuilder>
          </FormContainer>
        )}

        {currentStep === 2 && (
          <FormContainer
            key="step-3"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <h3>Review & Preview</h3>
            
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div>
                <h4>Ad Details</h4>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '8px' }}>
                  <p><strong>Campaign:</strong> {campaigns.find(c => c.id === adData.campaignId)?.name}</p>
                  <p><strong>Ad Set:</strong> {adSets.find(a => a.id === adData.adSetId)?.name}</p>
                  <p><strong>Ad Name:</strong> {adData.name}</p>
                  <p><strong>Creative Type:</strong> {adData.creative.type}</p>
                  <p><strong>Call to Action:</strong> {adData.creative.callToAction}</p>
                </div>
              </div>

              <div>
                <h4>Final Preview</h4>
                <PreviewContainer>
                  <FacebookPost>
                    <PostHeader>
                      <PageAvatar>C</PageAvatar>
                      <PageInfo>
                        <PageName>Cymasphere</PageName>
                        <SponsoredLabel>
                          Sponsored • <FaEye />
                        </SponsoredLabel>
                      </PageInfo>
                    </PostHeader>
                    <PostContent>
                      <PostText>{adData.creative.body}</PostText>
                      <PostImage>
                        {uploadedFile || adData.creative.imageUrl || adData.creative.videoUrl ? (
                          <div style={{ fontSize: '0.9rem', textAlign: 'center' }}>
                            {adData.creative.type === 'image' ? '🖼️ Image Uploaded' : '🎥 Video Uploaded'}
                            <br />
                            <small>{uploadedFile?.name || 'Media ready'}</small>
                          </div>
                        ) : (
                          adData.creative.type === 'image' ? <FaImage /> : <FaVideo />
                        )}
                      </PostImage>
                      <PostText style={{ fontWeight: 600, fontSize: '1rem' }}>
                        {adData.creative.title}
                      </PostText>
                      <CTAButton>
                        {adData.creative.callToAction}
                      </CTAButton>
                    </PostContent>
                  </FacebookPost>
                </PreviewContainer>
              </div>
            </div>
          </FormContainer>
        )}
      </AnimatePresence>

      <NavigationButtons>
        <Button
          $variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <FaArrowLeft />
          Previous
        </Button>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {currentStep === steps.length - 1 ? (
            <>
              <Button
                $variant="secondary"
                onClick={() => handleCreateAd(true)}
                disabled={isSubmitting || !!uploadError}
              >
                <FaSave />
                Save as Draft
              </Button>
              <Button
                onClick={() => handleCreateAd(false)}
                disabled={isSubmitting || !!uploadError || !isStepValid(currentStep)}
              >
                <FaPlay />
                {isSubmitting ? 'Creating...' : 'Create & Launch Ad'}
              </Button>
            </>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
            >
              Next
              <FaArrowRight />
            </Button>
          )}
        </div>
      </NavigationButtons>
    </Container>
  );
} 