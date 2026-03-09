/**
 * @fileoverview Ad Manager — Analytics: account-level metrics and campaign performance. Date presets (last 7/30/90 days), platform breakdown, from Insights API.
 * @module ad-manager/analytics
 */
"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaChartLine,
  FaFacebook,
  FaInstagram,
  FaDollarSign,
  FaEye,
  FaMousePointer,
  FaUsers,
  FaCalendarAlt,
  FaArrowLeft,
  FaArrowUp,
  FaArrowDown,
  FaDownload,
  FaFilter,
  FaSync,
  FaPlay,
  FaPause,
  FaInfoCircle,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";

import TableLoadingRow from "@/components/common/TableLoadingRow";
import StatLoadingSpinner from "@/components/common/StatLoadingSpinner";
import Link from "next/link";

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

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    justify-content: space-between;
  }
`;

const Select = styled.select`
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

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 768px) {
    justify-content: stretch;
  }
`;

const Button = styled(motion.button)<{ $variant?: 'primary' | 'secondary' }>`
  background: ${props => props.$variant === 'secondary' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)'
  };
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

  @media (max-width: 768px) {
    flex: 1;
    justify-content: center;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const MetricCard = styled(motion.div)`
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
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const MetricIcon = styled.div`
  font-size: 1.5rem;
  color: var(--primary);
`;

const MetricTrend = styled.div<{ $trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: ${props => {
    switch (props.$trend) {
      case 'up': return '#22c55e';
      case 'down': return '#ef4444';
      default: return 'var(--text-secondary)';
    }
  }};
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const MetricLabel = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const ChartTitle = styled.h3`
  font-size: 1.3rem;
  color: var(--text);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChartPlaceholder = styled.div`
  height: 300px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border: 1px dashed rgba(255, 255, 255, 0.2);
`;

const PlatformBreakdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PlatformItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

const PlatformInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PlatformIcon = styled.div<{ $platform: 'facebook' | 'instagram' }>`
  font-size: 1.5rem;
  color: ${props => props.$platform === 'facebook' ? '#1877f2' : '#e4405f'};
`;

const PlatformDetails = styled.div``;

const PlatformName = styled.div`
  font-weight: 600;
  color: var(--text);
`;

const PlatformMetric = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const PlatformValue = styled.div`
  text-align: right;
`;

const PlatformAmount = styled.div`
  font-weight: 600;
  color: var(--text);
`;

const PlatformPercentage = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const CampaignTable = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
`;

const TableHeader = styled.div`
  padding: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const TableTitle = styled.h3`
  font-size: 1.3rem;
  color: var(--text);
  margin: 0;
`;

const Table = styled.div`
  overflow-x: auto;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 80px;
  gap: 1rem;
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  min-width: 800px;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderRow = styled(TableRow)`
  background: rgba(255, 255, 255, 0.05);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.9rem;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const CampaignName = styled.div`
  color: var(--text);
  font-weight: 600;
`;

const CampaignStatus = styled.div<{ $status: 'active' | 'paused' | 'ended' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'active': return 'rgba(34, 197, 94, 0.2)';
      case 'paused': return 'rgba(245, 158, 11, 0.2)';
      default: return 'rgba(107, 114, 128, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return '#22c55e';
      case 'paused': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-secondary);
`;

interface AnalyticsData {
  overview: {
    totalSpent: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    averageCTR: number;
    averageCPC: number;
    averageCPM: number;
    roas: number;
  };
  trends: {
    spentTrend: 'up' | 'down' | 'neutral';
    impressionsTrend: 'up' | 'down' | 'neutral';
    clicksTrend: 'up' | 'down' | 'neutral';
    conversionsTrend: 'up' | 'down' | 'neutral';
  };
  platformBreakdown: {
    facebook: { spent: number; impressions: number; clicks: number; conversions: number };
    instagram: { spent: number; impressions: number; clicks: number; conversions: number };
  };
  campaigns: Array<{
    id: string;
    name: string;
    status: 'active' | 'paused' | 'ended';
    spent: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
  }>;
}

const mockAnalytics: AnalyticsData = {
  overview: {
    totalSpent: 12459.75,
    totalImpressions: 4562300,
    totalClicks: 89456,
    totalConversions: 2347,
    averageCTR: 1.96,
    averageCPC: 0.139,
    averageCPM: 2.73,
    roas: 4.2
  },
  trends: {
    spentTrend: 'up',
    impressionsTrend: 'up',
    clicksTrend: 'down',
    conversionsTrend: 'up'
  },
  platformBreakdown: {
    facebook: {
      spent: 8234.50,
      impressions: 3045200,
      clicks: 61234,
      conversions: 1678
    },
    instagram: {
      spent: 4225.25,
      impressions: 1517100,
      clicks: 28222,
      conversions: 669
    }
  },
  campaigns: [
    {
      id: "1",
      name: "Cymasphere Launch Campaign",
      status: "active",
      spent: 5234.75,
      impressions: 2134500,
      clicks: 42890,
      conversions: 1123,
      ctr: 2.01,
      cpc: 0.122
    },
    {
      id: "2",
      name: "Instagram Promotion",
      status: "paused",
      spent: 2456.30,
      impressions: 967800,
      clicks: 18456,
      conversions: 445,
      ctr: 1.91,
      cpc: 0.133
    },
    {
      id: "3",
      name: "Brand Awareness Drive",
      status: "active",
      spent: 4768.70,
      impressions: 1460000,
      clicks: 28110,
      conversions: 779,
      ctr: 1.93,
      cpc: 0.170
    }
  ]
};

const emptyAnalytics: AnalyticsData = {
  overview: { totalSpent: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0, averageCTR: 0, averageCPC: 0, averageCPM: 0, roas: 0 },
  trends: { spentTrend: 'neutral', impressionsTrend: 'neutral', clicksTrend: 'neutral', conversionsTrend: 'neutral' },
  platformBreakdown: { facebook: { spent: 0, impressions: 0, clicks: 0, conversions: 0 }, instagram: { spent: 0, impressions: 0, clicks: 0, conversions: 0 } },
  campaigns: []
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("last_30_days");
  const [platform, setPlatform] = useState("all");
  const [data, setData] = useState<AnalyticsData>(emptyAnalytics);

  const fetchInsights = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/facebook-ads/insights?datePreset=${encodeURIComponent(dateRange)}`);
      const json = await res.json();
      if (json.success && json.overview) {
        setData({
          overview: json.overview,
          trends: json.trends || emptyAnalytics.trends,
          platformBreakdown: json.platformBreakdown || emptyAnalytics.platformBreakdown,
          campaigns: Array.isArray(json.campaigns) ? json.campaigns : emptyAnalytics.campaigns
        });
      }
    } catch (err) {
      console.error('Failed to fetch insights', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (user) fetchInsights();
  }, [user, fetchInsights]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return <FaArrowUp />;
      case 'down': return <FaArrowDown />;
      default: return null;
    }
  };

  // Show page immediately - no early returns
  const showContent = user;

  return (
    <Container>
      <Header>
        <BackButton href="/admin/ad-manager">
          <FaArrowLeft /> Back to Ad Manager
        </BackButton>
        <Title>
          <FaChartLine />
          {showContent ? "Ad Analytics" : "Ad Analytics"}
        </Title>
        <Subtitle>
          {showContent
            ? "Account-level summary and campaign performance for the selected date range (Insights API)."
            : "Account-level summary and campaign performance for the selected date range (Insights API)."}
        </Subtitle>
      </Header>

      {showContent && (
        <>

      <Controls>
        <FilterGroup>
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_90_days">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </Select>

          <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="all">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </Select>
        </FilterGroup>

        <ActionButtons>
          <Button
            $variant="secondary"
            onClick={() => console.log('Export analytics clicked')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaDownload />
            Export
          </Button>
          <Button
            onClick={() => fetchInsights()}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaSync />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </ActionButtons>
      </Controls>

      <MetricsGrid>
        <MetricCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MetricHeader>
            <MetricIcon>
              <FaDollarSign />
            </MetricIcon>
            <MetricTrend $trend={data.trends.spentTrend}>
              {getTrendIcon(data.trends.spentTrend)} 12.5%
            </MetricTrend>
          </MetricHeader>
          <MetricValue>{loading ? <StatLoadingSpinner size={20} /> : formatCurrency(data.overview.totalSpent)}</MetricValue>
          <MetricLabel>Total Spent</MetricLabel>
        </MetricCard>

        <MetricCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <MetricHeader>
            <MetricIcon>
              <FaEye />
            </MetricIcon>
            <MetricTrend $trend={data.trends.impressionsTrend}>
              {getTrendIcon(data.trends.impressionsTrend)} 8.3%
            </MetricTrend>
          </MetricHeader>
          <MetricValue>{loading ? <StatLoadingSpinner size={20} /> : formatNumber(data.overview.totalImpressions)}</MetricValue>
          <MetricLabel>Total Impressions</MetricLabel>
        </MetricCard>

        <MetricCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <MetricHeader>
            <MetricIcon>
              <FaMousePointer />
            </MetricIcon>
            <MetricTrend $trend={data.trends.clicksTrend}>
              {getTrendIcon(data.trends.clicksTrend)} 3.2%
            </MetricTrend>
          </MetricHeader>
          <MetricValue>{loading ? <StatLoadingSpinner size={20} /> : formatNumber(data.overview.totalClicks)}</MetricValue>
          <MetricLabel>Total Clicks</MetricLabel>
        </MetricCard>

        <MetricCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <MetricHeader>
            <MetricIcon>
              <FaUsers />
            </MetricIcon>
            <MetricTrend $trend={data.trends.conversionsTrend}>
              {getTrendIcon(data.trends.conversionsTrend)} 15.7%
            </MetricTrend>
          </MetricHeader>
          <MetricValue>{loading ? <StatLoadingSpinner size={20} /> : formatNumber(data.overview.totalConversions)}</MetricValue>
          <MetricLabel>Total Conversions</MetricLabel>
        </MetricCard>

        <MetricCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <MetricHeader>
            <MetricIcon>
              <FaMousePointer />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{loading ? <StatLoadingSpinner size={20} /> : formatPercentage(data.overview.averageCTR)}</MetricValue>
          <MetricLabel>Average CTR</MetricLabel>
        </MetricCard>

        <MetricCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <MetricHeader>
            <MetricIcon>
              <FaDollarSign />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{loading ? <StatLoadingSpinner size={20} /> : formatCurrency(data.overview.averageCPC)}</MetricValue>
          <MetricLabel>Average CPC</MetricLabel>
        </MetricCard>

        <MetricCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <MetricHeader>
            <MetricIcon>
              <FaDollarSign />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{loading ? <StatLoadingSpinner size={20} /> : formatCurrency(data.overview.averageCPM)}</MetricValue>
          <MetricLabel>Average CPM</MetricLabel>
        </MetricCard>

        <MetricCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <MetricHeader>
            <MetricIcon>
              <FaChartLine />
            </MetricIcon>
          </MetricHeader>
          <MetricValue>{loading ? <StatLoadingSpinner size={20} /> : `${data.overview.roas.toFixed(1)}x`}</MetricValue>
          <MetricLabel>ROAS</MetricLabel>
        </MetricCard>
      </MetricsGrid>

      <ChartsGrid>
        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ChartTitle>
            <FaChartLine />
            Performance Over Time
          </ChartTitle>
          <ChartPlaceholder>
            <div>
              <FaInfoCircle style={{ fontSize: '2rem', marginBottom: '1rem' }} />
              <div>Interactive charts coming soon</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
                Spend, impressions, clicks, and conversions over time
              </div>
            </div>
          </ChartPlaceholder>
        </ChartCard>

        <ChartCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ChartTitle>
            <FaUsers />
            Platform Breakdown
          </ChartTitle>
          <PlatformBreakdown>
            <PlatformItem>
              <PlatformInfo>
                <PlatformIcon $platform="facebook">
                  <FaFacebook />
                </PlatformIcon>
                <PlatformDetails>
                  <PlatformName>Facebook</PlatformName>
                  <PlatformMetric>{formatNumber(data.platformBreakdown.facebook.impressions)} impressions</PlatformMetric>
                </PlatformDetails>
              </PlatformInfo>
              <PlatformValue>
                <PlatformAmount>{formatCurrency(data.platformBreakdown.facebook.spent)}</PlatformAmount>
                <PlatformPercentage>66.1%</PlatformPercentage>
              </PlatformValue>
            </PlatformItem>

            <PlatformItem>
              <PlatformInfo>
                <PlatformIcon $platform="instagram">
                  <FaInstagram />
                </PlatformIcon>
                <PlatformDetails>
                  <PlatformName>Instagram</PlatformName>
                  <PlatformMetric>{formatNumber(data.platformBreakdown.instagram.impressions)} impressions</PlatformMetric>
                </PlatformDetails>
              </PlatformInfo>
              <PlatformValue>
                <PlatformAmount>{formatCurrency(data.platformBreakdown.instagram.spent)}</PlatformAmount>
                <PlatformPercentage>33.9%</PlatformPercentage>
              </PlatformValue>
            </PlatformItem>
          </PlatformBreakdown>
        </ChartCard>
      </ChartsGrid>

      <CampaignTable
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <TableHeader>
          <TableTitle>Campaign Performance</TableTitle>
        </TableHeader>
        <Table>
          <TableHeaderRow>
            <div>Campaign Name</div>
            <div>Status</div>
            <div>Spent</div>
            <div>Impressions</div>
            <div>Clicks</div>
            <div>CTR</div>
            <div>CPC</div>
          </TableHeaderRow>
          {loading ? (
            <TableLoadingRow colSpan={7} message="Loading campaigns..." />
          ) : data.campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <CampaignName>{campaign.name}</CampaignName>
              <CampaignStatus $status={campaign.status}>
                {campaign.status === 'active' ? <FaPlay /> : <FaPause />}
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </CampaignStatus>
              <div>{formatCurrency(campaign.spent)}</div>
              <div>{formatNumber(campaign.impressions)}</div>
              <div>{formatNumber(campaign.clicks)}</div>
              <div>{formatPercentage(campaign.ctr)}</div>
              <div>{formatCurrency(campaign.cpc)}</div>
            </TableRow>
          ))}
        </Table>
      </CampaignTable>
      </>
      )}
    </Container>
  );
} 