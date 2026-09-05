'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FaChartLine, 
  FaEnvelope, 
  FaUsers, 
  FaEye, 
  FaMousePointer,
  FaCalendarAlt,
  FaFilter,
  FaDownload
} from 'react-icons/fa';
import StatLoadingSpinner from '@/components/common/StatLoadingSpinner';
import { getAnalytics } from '@/app/actions/email-campaigns';
import AdminResponsiveList from "@/components/admin/AdminResponsiveList";
import {
  AdminDataCard,
  AdminDataCardHeader,
  AdminDataCardMeta,
  AdminDataCardRow,
  AdminMobileCardList,
} from "@/components/admin/AdminDataCard";
import { AdminMobileEmpty } from "@/components/admin/AdminMobileLoading";

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 8px 0;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: var(--primary);
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }
  ` : `
    background: var(--background);
    color: var(--text-secondary);

  &:hover {
      background: var(--card-bg);
  }
  `}

  @media (max-width: 768px) {
    width: 100%;
    min-height: 44px;
    justify-content: center;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const StatIcon = styled.div<{ color: string }>`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color}20;
  color: ${props => props.color};
  font-size: 1.5rem;
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const StatChange = styled.div<{ positive: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.positive ? '#28a745' : '#dc3545'};
  margin-top: 0.5rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const ChartTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1.5rem;
`;

const ChartStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr 64px;
  gap: 0.75rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
`;

const ChartBarWrap = styled.div`
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: var(--background);
  overflow: hidden;
`;

const ChartBar = styled.div<{ $width: number; $variant?: 'primary' | 'secondary' }>`
  width: ${(props) => props.$width}%;
  height: 100%;
  border-radius: 999px;
  background: ${(props) =>
    props.$variant === 'secondary'
      ? 'linear-gradient(135deg, #17a2b8 0%, #20c997 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
`;

const ChartValue = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-align: right;
`;

const TableCard = styled.div`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 2rem;
`;

const TableTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1.5rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 1rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.08);
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableRow = styled.tr`
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
`;

const CampaignName = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const CampaignType = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const MetricBadge = styled.span<{ type: 'success' | 'warning' | 'danger' | 'info' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  
  ${props => {
    switch (props.type) {
      case 'success':
        return 'background: #d4edda; color: #155724;';
      case 'warning':
        return 'background: #fff3cd; color: #856404;';
      case 'danger':
        return 'background: #f8d7da; color: #721c24;';
      case 'info':
        return 'background: #d1ecf1; color: #0c5460;';
      default:
        return 'background: #f8f9fa; color: #6c757d;';
    }
  }}
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-secondary);
`;

interface CampaignData {
  id: string;
  name: string;
  type: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  sentDate: string;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface AnalyticsState {
  summary: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribes: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    activeSubscribers: number;
  };
  trends: {
    openRateChange: number;
    clickRateChange: number;
    unsubscribeRateChange: number;
    bounceRateChange: number;
  };
  campaigns: CampaignData[];
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsState | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const result = await getAnalytics({ timeRange });
        if (!result.success) {
          throw new Error('Failed to load analytics');
        }

        setAnalytics({
          summary: result.data.summary,
          trends: result.data.trends,
          campaigns: result.data.campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            type: campaign.type,
            sent: campaign.sent,
            delivered: campaign.delivered,
            opened: campaign.opens,
            clicked: campaign.clicks,
            unsubscribed: campaign.unsubscribes,
            sentDate: campaign.sentAt || '',
            openRate: campaign.openRate,
            clickRate: campaign.clickRate,
            bounceRate: campaign.bounceRate,
          })),
        });
      } catch (error) {
        console.error('Error loading analytics:', error);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, [timeRange]);

  const campaigns = analytics?.campaigns || [];
  const summary = analytics?.summary;
  const trends = analytics?.trends;
  const topOpenCampaigns = [...campaigns]
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, 6);
  const topClickCampaigns = [...campaigns]
    .sort((a, b) => b.clickRate - a.clickRate)
    .slice(0, 6);



  return (
    <Container>
      <Header>
        <Title>
          <FaChartLine />
          Email Analytics
        </Title>
        <Controls>
            <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </Select>
          <Button>
            <FaFilter />
            Filter
          </Button>
          <Button variant="primary">
            <FaDownload />
            Export
          </Button>
        </Controls>
      </Header>

      <StatsGrid>
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
        >
          <StatHeader>
            <StatIcon color="#667eea">
              <FaEnvelope />
            </StatIcon>
          </StatHeader>
          <StatValue>{loading ? <StatLoadingSpinner size={20} /> : (summary?.totalSent || 0).toLocaleString()}</StatValue>
          <StatLabel>Emails Sent</StatLabel>
          <StatChange positive={true}>{summary ? `${summary.activeSubscribers.toLocaleString()} active subscribers` : 'No subscriber data'}</StatChange>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
              >
          <StatHeader>
            <StatIcon color="#28a745">
              <FaUsers />
            </StatIcon>
          </StatHeader>
          <StatValue>{loading ? <StatLoadingSpinner size={20} /> : `${(summary ? ((summary.totalDelivered / Math.max(summary.totalSent, 1)) * 100) : 0).toFixed(1)}%`}</StatValue>
          <StatLabel>Delivery Rate</StatLabel>
          <StatChange positive={true}>{summary ? `${summary.totalDelivered.toLocaleString()} delivered` : 'No delivery data'}</StatChange>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatHeader>
            <StatIcon color="#ffc107">
              <FaEye />
            </StatIcon>
          </StatHeader>
          <StatValue>{loading ? <StatLoadingSpinner size={20} /> : `${summary?.openRate.toFixed(1) || '0.0'}%`}</StatValue>
          <StatLabel>Open Rate</StatLabel>
          <StatChange positive={(trends?.openRateChange || 0) >= 0}>{trends ? `${trends.openRateChange > 0 ? '+' : ''}${trends.openRateChange.toFixed(2)} pts vs prior period` : 'No trend data'}</StatChange>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <StatHeader>
            <StatIcon color="#17a2b8">
              <FaMousePointer />
            </StatIcon>
          </StatHeader>
          <StatValue>{loading ? <StatLoadingSpinner size={20} /> : `${summary?.clickRate.toFixed(1) || '0.0'}%`}</StatValue>
          <StatLabel>Click Rate</StatLabel>
          <StatChange positive={(trends?.clickRateChange || 0) >= 0}>{trends ? `${trends.clickRateChange > 0 ? '+' : ''}${trends.clickRateChange.toFixed(2)} pts vs prior period` : 'No trend data'}</StatChange>
        </StatCard>
      </StatsGrid>

        <ChartsGrid>
          <ChartCard>
          <ChartTitle>Top Campaigns by Open Rate</ChartTitle>
            <ChartStack>
              {loading ? (
                <LoadingState><StatLoadingSpinner size={24} /></LoadingState>
              ) : topOpenCampaigns.length === 0 ? (
                <LoadingState>No campaign data available.</LoadingState>
              ) : (
                topOpenCampaigns.map((campaign) => (
                  <ChartRow key={`open-${campaign.id}`}>
                    <ChartLabel>{campaign.name}</ChartLabel>
                    <ChartBarWrap>
                      <ChartBar $width={Math.max(3, Math.min(100, campaign.openRate))} />
                    </ChartBarWrap>
                    <ChartValue>{campaign.openRate.toFixed(1)}%</ChartValue>
                  </ChartRow>
                ))
              )}
            </ChartStack>
          </ChartCard>
          
          <ChartCard>
          <ChartTitle>Top Campaigns by Click Rate</ChartTitle>
            <ChartStack>
              {loading ? (
                <LoadingState><StatLoadingSpinner size={24} /></LoadingState>
              ) : topClickCampaigns.length === 0 ? (
                <LoadingState>No campaign data available.</LoadingState>
              ) : (
                topClickCampaigns.map((campaign) => (
                  <ChartRow key={`click-${campaign.id}`}>
                    <ChartLabel>{campaign.name}</ChartLabel>
                    <ChartBarWrap>
                      <ChartBar
                        $width={Math.max(3, Math.min(100, campaign.clickRate * 4))}
                        $variant="secondary"
                      />
                    </ChartBarWrap>
                    <ChartValue>{campaign.clickRate.toFixed(1)}%</ChartValue>
                  </ChartRow>
                ))
              )}
            </ChartStack>
          </ChartCard>
        </ChartsGrid>

        <TableCard>
        <TableTitle>Recent Campaigns</TableTitle>
          <AdminResponsiveList
            desktop={
          <Table>
          <thead>
              <tr>
              <TableHeader>Campaign</TableHeader>
              <TableHeader>Sent</TableHeader>
              <TableHeader>Delivered</TableHeader>
              <TableHeader>Open Rate</TableHeader>
              <TableHeader>Click Rate</TableHeader>
              <TableHeader>Unsubscribes</TableHeader>
              <TableHeader>Date</TableHeader>
              </tr>
          </thead>
          <tbody>
            {campaigns.map(campaign => {
              const campaignOpenRate = campaign.openRate.toFixed(1);
              const campaignClickRate = campaign.clickRate.toFixed(1);

              return (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <CampaignName>{campaign.name}</CampaignName>
                    <CampaignType>{campaign.type}</CampaignType>
                  </TableCell>
                  <TableCell>{campaign.sent.toLocaleString()}</TableCell>
                  <TableCell>{campaign.delivered.toLocaleString()}</TableCell>
                  <TableCell>
                    <MetricBadge type={parseFloat(campaignOpenRate) > 25 ? 'success' : 'warning'}>
                      {campaignOpenRate}%
                    </MetricBadge>
                  </TableCell>
                  <TableCell>
                    <MetricBadge type={parseFloat(campaignClickRate) > 3 ? 'success' : 'warning'}>
                      {campaignClickRate}%
                    </MetricBadge>
                  </TableCell>
                  <TableCell>{campaign.unsubscribed}</TableCell>
                  <TableCell>{campaign.sentDate ? new Date(campaign.sentDate).toLocaleDateString() : 'N/A'}</TableCell>
                </TableRow>
              );
            })}
          </tbody>
          </Table>
            }
            mobile={
              campaigns.length === 0 ? (
                <AdminMobileEmpty message="No campaign data available." />
              ) : (
                <AdminMobileCardList>
                  {campaigns.map((campaign) => (
                    <AdminDataCard key={campaign.id}>
                      <AdminDataCardHeader
                        title={campaign.name}
                        subtitle={campaign.type}
                      />
                      <AdminDataCardMeta
                        items={[
                          { label: "Sent", value: campaign.sent.toLocaleString() },
                          { label: "Delivered", value: campaign.delivered.toLocaleString() },
                          { label: "Open Rate", value: `${campaign.openRate.toFixed(1)}%` },
                          { label: "Click Rate", value: `${campaign.clickRate.toFixed(1)}%` },
                        ]}
                      />
                      <AdminDataCardRow label="Unsubscribes" value={campaign.unsubscribed} />
                      <AdminDataCardRow
                        label="Date"
                        value={campaign.sentDate ? new Date(campaign.sentDate).toLocaleDateString() : "N/A"}
                      />
                    </AdminDataCard>
                  ))}
                </AdminMobileCardList>
              )
            }
          />
        </TableCard>
    </Container>
  );
}