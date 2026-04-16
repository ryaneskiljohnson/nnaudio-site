/**
 * @fileoverview Ad Manager dashboard. Navigation and cards follow Meta hierarchy: Campaign → Ad Set → Ad.
 * @module ad-manager/page
 */
"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import StatLoadingSpinner from "@/components/common/StatLoadingSpinner";
import {
  FaFacebook,
  FaInstagram,
  FaPlus,
  FaChartLine,
  FaUsers,
  FaEye,
  FaMousePointer,
  FaDollarSign,
  FaCog,
  FaPlay,
  FaPause,
  FaEdit,
  FaTrash,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaImage,
  FaBullseye,
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
    padding: 20px 15px;
  }
`;

const DevelopmentBanner = styled(motion.div)`
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: #ffc107;
    font-size: 1.2rem;
  }

  .content {
    flex: 1;
  }

  .title {
    font-weight: 600;
    color: var(--text);
    margin: 0 0 0.25rem 0;
  }

  .description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
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

const ConnectionStatus = styled(motion.div)<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  background-color: ${props => props.$connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${props => props.$connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};

  svg {
    color: ${props => props.$connected ? '#22c55e' : '#ef4444'};
    font-size: 1.2rem;
  }
`;

const ConnectButton = styled(motion.button)`
  background: linear-gradient(135deg, #1877f2 0%, #42a5f5 100%);
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
    box-shadow: 0 8px 25px rgba(24, 119, 242, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const DisconnectButton = styled(motion.button)`
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.4);
    color: #ef4444;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
  }
`;

const StatCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 10px;
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const StatIcon = styled.div`
  font-size: 1.5rem;
  color: var(--primary);
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const StatLabel = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
  }
`;

const ActionCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
    border-color: var(--primary);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 10px;
  }
`;

const ActionIcon = styled.div`
  font-size: 2rem;
  color: var(--primary);
  margin-bottom: 1rem;
`;

const ActionTitle = styled.h3`
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
  color: var(--text);
`;

const ActionDescription = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`;

const CampaignsSection = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 1.5rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--text);
  margin: 0;
  flex: 1;
`;

const CampaignList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CampaignItem = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
    border-color: var(--primary);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const CampaignInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`;

const CampaignStatus = styled.div<{ $status: string }>`
  width: 8px;
  height: 8px;
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

const CampaignName = styled.h4`
  font-size: 1rem;
  margin: 0 0 0.25rem 0;
  color: var(--text);
`;

const CampaignMeta = styled.p`
  font-size: 0.8rem;
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

const CampaignStat = styled.div`
  text-align: center;
`;

const CampaignStatValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
`;

const CampaignStatLabel = styled.div`
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

const ActionButton = styled(motion.button)`
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

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  platform: 'facebook' | 'instagram';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  createdAt: string;
}

interface AdManagerStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpent: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageCTR: number;
  averageCPC: number;
}

const emptyStats: AdManagerStats = {
  totalCampaigns: 0,
  activeCampaigns: 0,
  totalSpent: 0,
  totalImpressions: 0,
  totalClicks: 0,
  totalConversions: 0,
  averageCTR: 0,
  averageCPC: 0,
};

export default function AdManagerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAdAccountId, setConnectedAdAccountId] = useState<string | null>(null);
  const [adAccounts, setAdAccounts] = useState<Array<{ id: string; account_id: string; name: string }>>([]);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<AdManagerStats>(emptyStats);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    checkFacebookConnection();
    if (isConnected) {
      fetchStats();
      fetchCampaigns();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && !isDevelopmentMode) {
      fetch('/api/facebook-ads/ad-accounts')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.adAccounts)) {
            setAdAccounts(data.adAccounts);
          }
        })
        .catch(() => {});
    } else {
      setAdAccounts([]);
    }
  }, [isConnected, isDevelopmentMode]);

  const checkFacebookConnection = async () => {
    try {
      const response = await fetch('/api/facebook-ads/connection-status');
      const data = await response.json();
      setIsConnected(data.connected);
      setConnectedAdAccountId(data.adAccountId || null);
      setIsDevelopmentMode(data.isDevelopmentMode || false);
    } catch (error) {
      console.error('Error checking Facebook connection:', error);
      setIsConnected(false);
      setConnectedAdAccountId(null);
      setIsDevelopmentMode(false);
    }
  };

  const connectToFacebook = async () => {
    setIsConnecting(true);
    try {
      window.location.href = '/api/facebook-ads/connect';
    } catch (error) {
      console.error('Error connecting to Facebook:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromFacebook = async () => {
    try {
      await fetch('/api/facebook-ads/disconnect', { method: 'POST' });
      await checkFacebookConnection();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const setAdAccount = async (accountId: string) => {
    const numericId = accountId.replace(/^act_/, '');
    try {
      const res = await fetch('/api/facebook-ads/ad-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId: numericId }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectedAdAccountId(data.adAccountId || accountId);
        await checkFacebookConnection();
        await fetchStats();
        await fetchCampaigns();
      }
    } catch (error) {
      console.error('Error setting ad account:', error);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/facebook-ads/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/facebook-ads/campaigns');
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'play' | 'pause' | 'edit' | 'delete') => {
    if (action === 'edit') {
      router.push(`/admin/ad-manager/campaigns/${campaignId}/edit`);
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
    <Container>
      <Header>
        <Title>
          <FaFacebook />
          Ad Manager
        </Title>
        <Subtitle>
          Create, manage, and optimize your Facebook and Instagram advertising campaigns
        </Subtitle>
      </Header>
      {isDevelopmentMode && (
        <DevelopmentBanner
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FaInfoCircle />
          <div className="content">
            <div className="title">Development Mode</div>
            <div className="description">
              Using mock Facebook data for testing. Configure your Facebook App credentials to enable production mode.
            </div>
          </div>
        </DevelopmentBanner>
      )}
      <ConnectionStatus
        $connected={isConnected}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {isConnected ? (
          <>
            <FaCheckCircle />
            <div style={{ flex: 1 }}>
              <strong>Connected to Facebook Ads {isDevelopmentMode && '(Development Mode)'}</strong>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                {isDevelopmentMode 
                  ? 'Using mock data for development - configure Facebook App for production'
                  : 'Your account is connected and ready to manage ads'
                }
                {connectedAdAccountId && !isDevelopmentMode && (
                  <span style={{ display: 'block', marginTop: '0.25rem' }}>
                    Ad account:{' '}
                    {adAccounts.length > 0 ? (
                      <select
                        value={connectedAdAccountId}
                        onChange={(e) => setAdAccount(e.target.value)}
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 4,
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(0,0,0,0.2)',
                          color: 'inherit',
                          minWidth: 180,
                        }}
                      >
                        {adAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.id})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <code style={{ fontSize: '0.85rem' }}>{connectedAdAccountId}</code>
                    )}
                  </span>
                )}
              </p>
            </div>
            <DisconnectButton
              type="button"
              onClick={disconnectFromFacebook}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaTrash />
              Disconnect
            </DisconnectButton>
          </>
        ) : (
          <>
            <FaExclamationTriangle />
            <div style={{ flex: 1 }}>
              <strong>Connect to Facebook Ads</strong>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                Connect your Facebook account to start creating and managing ads
              </p>
            </div>
            <ConnectButton 
              onClick={connectToFacebook}
              disabled={isConnecting}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaFacebook />
              {isConnecting ? 'Connecting...' : 'Connect Now'}
            </ConnectButton>
          </>
        )}
      </ConnectionStatus>
      {isConnected && (
        <>
          <StatsGrid>
            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <StatHeader>
                <StatIcon>
                  <FaChartLine />
                </StatIcon>
              </StatHeader>
              <StatValue>{statsLoading ? <StatLoadingSpinner size={20} /> : stats.totalCampaigns}</StatValue>
              <StatLabel>Total Campaigns</StatLabel>
            </StatCard>

            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <StatHeader>
                <StatIcon>
                  <FaPlay />
                </StatIcon>
              </StatHeader>
              <StatValue>{statsLoading ? <StatLoadingSpinner size={20} /> : stats.activeCampaigns}</StatValue>
              <StatLabel>Active Campaigns</StatLabel>
            </StatCard>

            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <StatHeader>
                <StatIcon>
                  <FaDollarSign />
                </StatIcon>
              </StatHeader>
              <StatValue>{statsLoading ? <StatLoadingSpinner size={20} /> : formatCurrency(stats.totalSpent)}</StatValue>
              <StatLabel>Total Spent</StatLabel>
            </StatCard>

            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <StatHeader>
                <StatIcon>
                  <FaEye />
                </StatIcon>
              </StatHeader>
              <StatValue>{statsLoading ? <StatLoadingSpinner size={20} /> : formatNumber(stats.totalImpressions)}</StatValue>
              <StatLabel>Total Impressions</StatLabel>
            </StatCard>

            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <StatHeader>
                <StatIcon>
                  <FaMousePointer />
                </StatIcon>
              </StatHeader>
              <StatValue>{statsLoading ? <StatLoadingSpinner size={20} /> : formatNumber(stats.totalClicks)}</StatValue>
              <StatLabel>Total Clicks</StatLabel>
            </StatCard>

            <StatCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <StatHeader>
                <StatIcon>
                  <FaUsers />
                </StatIcon>
              </StatHeader>
              <StatValue>{statsLoading ? <StatLoadingSpinner size={20} /> : `${stats.averageCTR}%`}</StatValue>
              <StatLabel>Average CTR</StatLabel>
            </StatCard>
          </StatsGrid>

          <ActionsGrid>
            <Link href="/admin/ad-manager/campaigns/create">
              <ActionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ y: -4 }}
              >
                <ActionIcon>
                  <FaPlus />
                </ActionIcon>
                <ActionTitle>Create Campaign</ActionTitle>
                <ActionDescription>
                  Set objective, buying type, and budget level (Meta: campaign level)
                </ActionDescription>
              </ActionCard>
            </Link>

            <Link href="/admin/ad-manager/campaigns/adsets/create">
              <ActionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                whileHover={{ y: -4 }}
              >
                <ActionIcon>
                  <FaBullseye />
                </ActionIcon>
                <ActionTitle>Create Ad Set</ActionTitle>
                <ActionDescription>
                  Choose a campaign, then set budget, targeting, and optimization
                </ActionDescription>
              </ActionCard>
            </Link>

            <Link href="/admin/ad-manager/campaigns/adsets">
              <ActionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ y: -4 }}
              >
                <ActionIcon>
                  <FaBullseye />
                </ActionIcon>
                <ActionTitle>View Ad Sets</ActionTitle>
                <ActionDescription>
                  List all ad sets; filter by campaign. Edit budget and targeting
                </ActionDescription>
              </ActionCard>
            </Link>

            <Link href="/admin/ad-manager/ads/create">
              <ActionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={{ y: -4 }}
              >
                <ActionIcon>
                  <FaImage />
                </ActionIcon>
                <ActionTitle>Create Ad</ActionTitle>
                <ActionDescription>
                  Create an ad within a campaign and ad set — creative builder
                </ActionDescription>
              </ActionCard>
            </Link>

            <Link href="/admin/ad-manager/audiences">
              <ActionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                whileHover={{ y: -4 }}
              >
                <ActionIcon>
                  <FaUsers />
                </ActionIcon>
                <ActionTitle>Manage Audiences</ActionTitle>
                <ActionDescription>
                  Create and manage custom audiences for targeted advertising
                </ActionDescription>
              </ActionCard>
            </Link>

            <Link href="/admin/ad-manager/analytics">
              <ActionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                whileHover={{ y: -4 }}
              >
                <ActionIcon>
                  <FaChartLine />
                </ActionIcon>
                <ActionTitle>View Analytics</ActionTitle>
                <ActionDescription>
                  Analyze campaign performance and optimize your ad spend
                </ActionDescription>
              </ActionCard>
            </Link>

            <Link href="/admin/ad-manager/settings">
              <ActionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                whileHover={{ y: -4 }}
              >
                <ActionIcon>
                  <FaCog />
                </ActionIcon>
                <ActionTitle>Settings</ActionTitle>
                <ActionDescription>
                  Configure Facebook integration and campaign preferences
                </ActionDescription>
              </ActionCard>
            </Link>
          </ActionsGrid>

          <CampaignsSection
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <SectionHeader>
              <SectionTitle>Recent Campaigns</SectionTitle>
              <ConnectButton 
                onClick={() => router.push('/admin/ad-manager/campaigns')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View All Campaigns
              </ConnectButton>
            </SectionHeader>
            
            {campaigns.length > 0 ? (
              <CampaignList>
                {campaigns.slice(0, 5).map((campaign, index) => (
                  <CampaignItem
                    key={campaign.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
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
                          Budget: {formatCurrency(campaign.budget)} • Spent: {formatCurrency(campaign.spent)}
                        </CampaignMeta>
                      </CampaignDetails>
                    </CampaignInfo>

                    <CampaignStats>
                      <CampaignStat>
                        <CampaignStatValue>{formatNumber(campaign.impressions)}</CampaignStatValue>
                        <CampaignStatLabel>Impressions</CampaignStatLabel>
                      </CampaignStat>
                      <CampaignStat>
                        <CampaignStatValue>{formatNumber(campaign.clicks)}</CampaignStatValue>
                        <CampaignStatLabel>Clicks</CampaignStatLabel>
                      </CampaignStat>
                      <CampaignStat>
                        <CampaignStatValue>{campaign.conversions}</CampaignStatValue>
                        <CampaignStatLabel>Conversions</CampaignStatLabel>
                      </CampaignStat>
                    </CampaignStats>

                    <CampaignActions>
                      <ActionButton
                        onClick={() => handleCampaignAction(campaign.id, campaign.status === 'active' ? 'pause' : 'play')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {campaign.status === 'active' ? <FaPause /> : <FaPlay />}
                      </ActionButton>
                      <ActionButton
                        onClick={() => router.push(`/admin/ad-manager/campaigns/${campaign.id}/edit`)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FaEdit />
                      </ActionButton>
                      <ActionButton
                        onClick={() => handleCampaignAction(campaign.id, 'delete')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FaTrash />
                      </ActionButton>
                    </CampaignActions>
                  </CampaignItem>
                ))}
              </CampaignList>
            ) : (
              <EmptyState>
                <EmptyStateIcon>
                  <FaChartLine />
                </EmptyStateIcon>
                <h3>No campaigns yet</h3>
                <p>Create your first advertising campaign to get started</p>
              </EmptyState>
            )}
          </CampaignsSection>
        </>
      )}
    </Container>
  );
} 