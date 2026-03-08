"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFacebook,
  FaInstagram,
  FaPlus,
  FaChartLine,
  FaEye,
  FaMousePointer,
  FaDollarSign,
  FaPlay,
  FaPause,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaChevronRight,
  FaCog,
  FaUsers,
  FaImage,
  FaVideo,
  FaArrowLeft,
  FaTimes,
  FaExclamationTriangle,
  FaSave,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled(motion.button)`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text);
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--primary);
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0;
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

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  border: none;
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

const CampaignCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 1.5rem;
  overflow: hidden;
`;

const CampaignHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const CampaignInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`;

const CampaignStatus = styled.div<{ $status: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => {
    switch (props.$status) {
      case 'active': return '#22c55e';
      case 'paused': return '#f59e0b';
      case 'ended': return '#ef4444';
      default: return '#6b7280';
    }
  }};
`;

const CampaignDetails = styled.div`
  flex: 1;
`;

const CampaignName = styled.h3`
  font-size: 1.3rem;
  margin: 0 0 0.5rem 0;
  color: var(--text);
`;

const CampaignMeta = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`;

const CampaignStats = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;

  @media (max-width: 768px) {
    gap: 1rem;
    flex-wrap: wrap;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CampaignActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const SmallActionButton = styled(motion.button)`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: var(--primary);
    color: var(--primary);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const ExpandButton = styled(motion.button)`
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    color: var(--primary);
  }
`;

const CampaignContent = styled(motion.div)`
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const Tab = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.05)' : 'transparent'};
  border: none;
  padding: 1rem 1.5rem;
  color: ${props => props.$active ? 'var(--primary)' : 'var(--text-secondary)'};
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 2px solid ${props => props.$active ? 'var(--primary)' : 'transparent'};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--primary);
  }
`;

const TabContent = styled.div`
  padding: 1.5rem;
`;

const AdSetGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const AdSetCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
`;

const AdCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const AdCreative = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
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

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-secondary);
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  max-width: 480px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ModalIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
`;

const ModalTitle = styled.h3`
  font-size: 1.5rem;
  color: var(--text);
  margin: 0;
`;

const ModalBody = styled.div`
  margin-bottom: 2rem;
`;

const ModalText = styled.p`
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 1rem 0;
`;

const CampaignInfoCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid var(--primary);
`;

const CampaignInfoTitle = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const CampaignInfoDetails = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ModalButton = styled(motion.button)<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  background: ${props => {
    switch (props.$variant) {
      case 'danger': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'secondary': return 'rgba(255, 255, 255, 0.1)';
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

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }
`;

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  objective: string;
  platform: 'facebook' | 'instagram';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  adSets: number;
  ads: number;
  createdAt: string;
}

interface AdSet {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  targeting: any;
  placements: string[];
  createdAt: string;
}

interface Ad {
  id: string;
  name: string;
  adSetId: string;
  campaignId: string;
  status: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  creative: any;
  createdAt: string;
}

interface DeleteModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  campaign,
  isOpen,
  onClose,
  onConfirm,
  isDeleting
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (!campaign) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <ModalContent
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <CloseButton onClick={onClose}>
              <FaTimes />
            </CloseButton>

            <ModalHeader>
              <ModalIcon>
                <FaExclamationTriangle />
              </ModalIcon>
              <ModalTitle>Delete Campaign</ModalTitle>
            </ModalHeader>

            <ModalBody>
              <ModalText>
                Are you sure you want to delete this campaign? This action cannot be undone and will permanently remove the campaign, its ad sets, and all ads.
              </ModalText>

              <CampaignInfoCard>
                <CampaignInfoTitle>{campaign.name}</CampaignInfoTitle>
                <CampaignInfoDetails>
                  <span>Status: {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}</span>
                  <span>Budget: {formatCurrency(campaign.budget)}</span>
                  <span>Spent: {formatCurrency(campaign.spent)}</span>
                  <span>Objective: {campaign.objective}</span>
                  <span>Ad Sets: {campaign.adSets}</span>
                  <span>Ads: {campaign.ads}</span>
                </CampaignInfoDetails>
              </CampaignInfoCard>

              <ModalText style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                <strong>Warning:</strong> This will also delete {campaign.adSets} ad set(s) and {campaign.ads} ad(s) associated with this campaign. All performance data will be lost.
              </ModalText>
            </ModalBody>

            <ModalActions>
              <ModalButton
                $variant="secondary"
                onClick={onClose}
                disabled={isDeleting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </ModalButton>
              <ModalButton
                $variant="danger"
                onClick={onConfirm}
                disabled={isDeleting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaTrash />
                {isDeleting ? 'Deleting...' : 'Delete Campaign'}
              </ModalButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export { DeleteConfirmationModal };
export type { Campaign };

export default function CampaignsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<Record<string, AdSet[]>>({});
  const [ads, setAds] = useState<Record<string, Ad[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [activeTabs, setActiveTabs] = useState<Record<string, 'adsets' | 'ads'>>({});
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    campaign: Campaign | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    campaign: null,
    isDeleting: false
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/facebook-ads/campaigns');
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdSets = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/facebook-ads/adsets?campaignId=${campaignId}`);
      const data = await response.json();
      if (data.success) {
        setAdSets(prev => ({ ...prev, [campaignId]: data.adSets }));
      }
    } catch (error) {
      console.error('Error fetching ad sets:', error);
    }
  };

  const fetchAds = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/facebook-ads/ads?campaignId=${campaignId}`);
      const data = await response.json();
      if (data.success) {
        setAds(prev => ({ ...prev, [campaignId]: data.ads }));
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const toggleCampaign = async (campaignId: string) => {
    const isExpanded = expandedCampaigns.has(campaignId);
    
    if (isExpanded) {
      setExpandedCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    } else {
      setExpandedCampaigns(prev => new Set(prev).add(campaignId));
      setActiveTabs(prev => ({ ...prev, [campaignId]: 'adsets' }));
      
      // Fetch ad sets for this campaign
      if (!adSets[campaignId]) {
        fetchAdSets(campaignId);
      }
    }
  };

  const switchTab = (campaignId: string, tab: 'adsets' | 'ads') => {
    setActiveTabs(prev => ({ ...prev, [campaignId]: tab }));
    
    // Fetch ads if switching to ads tab and not already loaded
    if (tab === 'ads' && !ads[campaignId]) {
      fetchAds(campaignId);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'play' | 'pause' | 'edit' | 'delete') => {
    if (action === 'edit') {
      router.push(`/admin/ad-manager/campaigns/${campaignId}/edit`);
      return;
    }

    if (action === 'delete') {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      setDeleteModal({
        isOpen: true,
        campaign,
        isDeleting: false
      });
      return;
    }

    try {
      const response = await fetch(`/api/facebook-ads/campaigns/${campaignId}/${action}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        fetchCampaigns(); // Refresh campaigns
      }
    } catch (error) {
      console.error(`Error ${action} campaign:`, error);
    }
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteModal.campaign) return;

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      const response = await fetch(`/api/facebook-ads/campaigns/${deleteModal.campaign.id}/delete`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        // Remove campaign from local state
        setCampaigns(prev => prev.filter(campaign => campaign.id !== deleteModal.campaign?.id));
        
        setDeleteModal({
          isOpen: false,
          campaign: null,
          isDeleting: false
        });
      } else {
        throw new Error(data.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const closeDeleteModal = () => {
    if (deleteModal.isDeleting) return; // Prevent closing while deleting
    
    setDeleteModal({
      isOpen: false,
      campaign: null,
      isDeleting: false
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (!user) {
    return <LoadingComponent />;
  }

  return (
    <>
      <Container>
      <Header>
        <HeaderLeft>
          <BackButton
            onClick={() => router.push('/admin/ad-manager')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowLeft />
            Back to Ad Manager
          </BackButton>
          <Title>
            <FaChartLine />
            All Campaigns
          </Title>
        </HeaderLeft>
        <HeaderActions>
          <Link href="/admin/ad-manager/campaigns/create">
            <ActionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaPlus />
              Create Campaign
            </ActionButton>
          </Link>
        </HeaderActions>
      </Header>

      {loading ? (
        <LoadingState>
          <LoadingComponent />
        </LoadingState>
      ) : campaigns.length > 0 ? (
        campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <CampaignHeader onClick={() => toggleCampaign(campaign.id)}>
              <CampaignInfo>
                <CampaignStatus $status={campaign.status} />
                <div style={{ marginRight: '1rem' }}>
                  {campaign.platform === 'facebook' ? (
                    <FaFacebook style={{ color: '#1877f2', fontSize: '1.2rem' }} />
                  ) : (
                    <FaInstagram style={{ color: '#e4405f', fontSize: '1.2rem' }} />
                  )}
                </div>
                <CampaignDetails>
                  <CampaignName>{campaign.name}</CampaignName>
                  <CampaignMeta>
                    {campaign.objective} • Budget: {formatCurrency(campaign.budget)} • Spent: {formatCurrency(campaign.spent)}
                  </CampaignMeta>
                </CampaignDetails>
              </CampaignInfo>

              <CampaignStats>
                <StatItem>
                  <StatValue>{formatNumber(campaign.impressions)}</StatValue>
                  <StatLabel>Impressions</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{formatNumber(campaign.clicks)}</StatValue>
                  <StatLabel>Clicks</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{campaign.conversions}</StatValue>
                  <StatLabel>Conversions</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{campaign.ctr}%</StatValue>
                  <StatLabel>CTR</StatLabel>
                </StatItem>
              </CampaignStats>

              <CampaignActions onClick={e => e.stopPropagation()}>
                <SmallActionButton
                  onClick={() => handleCampaignAction(campaign.id, campaign.status === 'active' ? 'pause' : 'play')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {campaign.status === 'active' ? <FaPause /> : <FaPlay />}
                </SmallActionButton>
                <SmallActionButton
                  onClick={() => router.push(`/admin/ad-manager/campaigns/${campaign.id}/edit`)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaEdit />
                </SmallActionButton>
                <SmallActionButton
                  onClick={() => handleCampaignAction(campaign.id, 'delete')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaTrash />
                </SmallActionButton>
                <ExpandButton>
                  {expandedCampaigns.has(campaign.id) ? <FaChevronDown /> : <FaChevronRight />}
                </ExpandButton>
              </CampaignActions>
            </CampaignHeader>

            <AnimatePresence>
              {expandedCampaigns.has(campaign.id) && (
                <CampaignContent
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabContainer>
                    <Tab
                      $active={activeTabs[campaign.id] === 'adsets'}
                      onClick={() => switchTab(campaign.id, 'adsets')}
                    >
                      Ad Sets ({campaign.adSets || 0})
                    </Tab>
                    <Tab
                      $active={activeTabs[campaign.id] === 'ads'}
                      onClick={() => switchTab(campaign.id, 'ads')}
                    >
                      Ads ({campaign.ads || 0})
                    </Tab>
                  </TabContainer>

                  <TabContent>
                    {activeTabs[campaign.id] === 'adsets' && (
                      <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <Link href={`/admin/ad-manager/campaigns/${campaign.id}/adsets/create`} style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                          + Create ad set
                        </Link>
                      </div>
                      <AdSetGrid>
                        {adSets[campaign.id]?.length > 0 ? (
                          adSets[campaign.id].map((adSet) => (
                            <AdSetCard
                              key={adSet.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>{adSet.name}</h4>
                                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Budget: {formatCurrency(adSet.budget)} • Spent: {formatCurrency(adSet.spent)} • CTR: {adSet.ctr}%
                                  </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <SmallActionButton
                                    onClick={() => console.log('Edit ad set:', adSet.id)}
                                    title="Edit Ad Set"
                                  >
                                    <FaCog />
                                  </SmallActionButton>
                                  <SmallActionButton
                                    onClick={() => console.log('View audience:', adSet.id)}
                                    title="View Audience"
                                  >
                                    <FaUsers />
                                  </SmallActionButton>
                                </div>
                              </div>
                            </AdSetCard>
                          ))
                        ) : (
                          <EmptyState>
                            <EmptyStateIcon><FaUsers /></EmptyStateIcon>
                            <h3>No ad sets yet</h3>
                            <p>Create your first ad set to start targeting audiences</p>
                            <Link href={`/admin/ad-manager/campaigns/${campaign.id}/adsets/create`} style={{ marginTop: '1rem', display: 'inline-block', color: 'var(--primary)' }}>
                              Create ad set
                            </Link>
                          </EmptyState>
                        )}
                      </AdSetGrid>
                      </>
                    )}

                    {activeTabs[campaign.id] === 'ads' && (
                      <AdSetGrid>
                        {ads[campaign.id]?.length > 0 ? (
                          ads[campaign.id].map((ad) => (
                            <AdCard
                              key={ad.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <AdCreative>
                                {ad.creative?.videoUrl ? <FaVideo /> : <FaImage />}
                              </AdCreative>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>{ad.name}</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                  Spent: {formatCurrency(ad.spent)} • Clicks: {formatNumber(ad.clicks)} • CTR: {ad.ctr}%
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <SmallActionButton
                                  onClick={() => console.log('Edit ad:', ad.id)}
                                  title="Edit Ad"
                                >
                                  <FaEdit />
                                </SmallActionButton>
                                <SmallActionButton
                                  onClick={() => console.log('Preview ad:', ad.id)}
                                  title="Preview Ad"
                                >
                                  <FaEye />
                                </SmallActionButton>
                              </div>
                            </AdCard>
                          ))
                        ) : (
                          <EmptyState>
                            <EmptyStateIcon><FaImage /></EmptyStateIcon>
                            <h3>No ads yet</h3>
                            <p>Create your first ad to start running this campaign</p>
                          </EmptyState>
                        )}
                      </AdSetGrid>
                    )}
                  </TabContent>
                </CampaignContent>
              )}
            </AnimatePresence>
          </CampaignCard>
        ))
      ) : (
        <EmptyState>
          <EmptyStateIcon>
            <FaChartLine />
          </EmptyStateIcon>
          <h3>No campaigns yet</h3>
          <p>Create your first advertising campaign to get started</p>
          <Link href="/admin/ad-manager/campaigns/create">
            <ActionButton
              style={{ marginTop: '1rem' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaPlus />
              Create First Campaign
            </ActionButton>
          </Link>
        </EmptyState>
      )}
    </Container>
      <DeleteConfirmationModal
        campaign={deleteModal.campaign}
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteCampaign}
        isDeleting={deleteModal.isDeleting}
      />
    </>
  );
} 