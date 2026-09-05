"use client";
import React, { useState, useEffect } from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { 
  FaChartLine, 
  FaSearch,
  FaFilter,
  FaDownload,
  FaCalendarAlt,
  FaEnvelopeOpen,
  FaMousePointer,
  FaUsers,
  FaPercentage,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaEdit,
  FaShare,
  FaCog,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaGlobe,
  FaMobile,
  FaDesktop,
  FaTablet,
  FaEnvelope,
  FaBan,
  FaHeart
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import AdminResponsiveList from "@/components/admin/AdminResponsiveList";
import {
  AdminDataCard,
  AdminDataCardHeader,
  AdminDataCardMeta,
  AdminDataCardRow,
  AdminMobileCardList,
} from "@/components/admin/AdminDataCard";
import { AdminMobileEmpty } from "@/components/admin/AdminMobileLoading";
import { motion } from "framer-motion";
import LoadingComponent from "@/components/common/LoadingComponent";
import { getAnalytics } from "@/app/actions/email-campaigns";

const PerformanceContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 8px 0;
  }
`;

const PerformanceTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
`;

const PerformanceSubtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const FiltersRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  background-color: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const LeftFilters = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterSelect = styled.select`
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;

  ${(props) => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: var(--primary);
          color: white;
          &:hover {
            background-color: var(--accent);
          }
        `;
      default:
        return `
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.1);
          &:hover {
            background-color: rgba(255, 255, 255, 0.2);
            color: var(--text);
          }
        `;
    }
  }}
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled(motion.div)<{ variant?: string }>`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'success': return 'rgba(40, 167, 69, 0.3)';
      case 'warning': return 'rgba(255, 193, 7, 0.3)';
      case 'danger': return 'rgba(220, 53, 69, 0.3)';
      case 'info': return 'rgba(23, 162, 184, 0.3)';
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  }};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => {
      switch (props.variant) {
        case 'success': return 'linear-gradient(90deg, #28a745, #20c997)';
        case 'warning': return 'linear-gradient(90deg, #ffc107, #fd7e14)';
        case 'danger': return 'linear-gradient(90deg, #dc3545, #e83e8c)';
        case 'info': return 'linear-gradient(90deg, #17a2b8, #6f42c1)';
        default: return 'linear-gradient(90deg, var(--primary), var(--accent))';
      }
    }};
  }
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const MetricTitle = styled.h3`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

const MetricIcon = styled.div<{ variant?: string }>`
  font-size: 1.2rem;
  color: ${props => {
    switch (props.variant) {
      case 'success': return '#28a745';
      case 'warning': return '#ffc107';
      case 'danger': return '#dc3545';
      case 'info': return '#17a2b8';
      default: return 'var(--primary)';
    }
  }};
`;

const MetricValue = styled.div<{ variant?: string }>`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => {
    switch (props.variant) {
      case 'success': return '#28a745';
      case 'warning': return '#ffc107';
      case 'danger': return '#dc3545';
      case 'info': return '#17a2b8';
      default: return 'var(--text)';
    }
  }};
  margin-bottom: 0.5rem;
`;

const MetricChange = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'positive',
})<{ positive: boolean }>`
  font-size: 0.8rem;
  color: ${props => props.positive ? '#28a745' : '#dc3545'};
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
`;

const ChartHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChartTitle = styled.h3`
  font-size: 1.2rem;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: var(--primary);
  }
`;

const ChartContent = styled.div`
  padding: 1.5rem;
  min-height: 300px;
`;

const ChartStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 150px 1fr 70px;
  gap: 0.75rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartLabel = styled.div`
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
`;

const ChartBarTrack = styled.div`
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
`;

const ChartBarFill = styled.div<{ $width: number; $color?: string }>`
  width: ${(props) => props.$width}%;
  height: 100%;
  border-radius: 999px;
  background: ${(props) => props.$color || "linear-gradient(90deg, var(--primary), var(--accent))"};
`;

const ChartNumber = styled.div`
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 700;
  text-align: right;
`;

const DeviceBreakdownGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const DeviceCard = styled.div`
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
`;

const DeviceIcon = styled.div`
  font-size: 2rem;
  color: var(--primary);
  margin-bottom: 0.5rem;
`;

const DeviceLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
`;

const DevicePercentage = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
`;

const CampaignPerformanceSection = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.3rem;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: var(--primary);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background-color: rgba(255, 255, 255, 0.02);
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const TableBody = styled.tbody``;

const TableRow = styled(motion.tr)`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  color: var(--text);
  font-size: 0.9rem;
  vertical-align: middle;
`;

const CampaignName = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const CampaignMeta = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const PerformanceBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.25rem;
`;

const PerformanceFill = styled.div<{ percentage: number; color?: string }>`
  height: 100%;
  width: ${props => props.percentage}%;
  background-color: ${props => props.color || 'var(--primary)'};
  transition: width 0.3s ease;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${(props) => {
    switch (props.status) {
      case 'excellent':
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        `;
      case 'good':
        return `
          background-color: rgba(108, 99, 255, 0.2);
          color: var(--primary);
        `;
      case 'average':
        return `
          background-color: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        `;
      case 'poor':
        return `
          background-color: rgba(220, 53, 69, 0.2);
          color: #dc3545;
        `;
      default:
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
    }
  }}
`;

interface PerformanceData {
  overview: {
    totalSent: number;
    totalOpens: number;
    totalClicks: number;
    totalUnsubscribes: number;
    openRate: number;
    clickRate: number;
    unsubscribeRate: number;
    bounceRate: number;
  };
  trends: {
    openRateChange: number;
    clickRateChange: number;
    unsubscribeRateChange: number;
    bounceRateChange: number;
  };
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    sent: number;
    opens: number;
    clicks: number;
    openRate: number;
    clickRate: number;
    performance: string;
    sentDate: string;
  }>;
}

function PerformancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();

  // Fetch performance data
  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getAnalytics({
        timeRange,
        campaignType: campaignFilter !== 'all' ? campaignFilter : undefined,
      });
      
      if (result.success) {
        const { summary, trends, devices, campaigns } = result.data;
        
        const transformedData: PerformanceData = {
          overview: {
            totalSent: summary.totalSent,
            totalOpens: summary.totalOpened,
            totalClicks: summary.totalClicked,
            totalUnsubscribes: summary.totalUnsubscribes,
            openRate: summary.openRate,
            clickRate: summary.clickRate,
            unsubscribeRate: summary.unsubscribeRate,
            bounceRate: summary.bounceRate
          },
          trends,
          devices,
          campaigns: campaigns.map((campaign: any) => ({
            id: campaign.id,
            name: campaign.name,
            sent: campaign.sent,
            opens: campaign.opens,
            clicks: campaign.clicks,
            openRate: campaign.openRate,
            clickRate: campaign.clickRate,
            performance: campaign.openRate > 25 ? 'excellent' : campaign.openRate > 20 ? 'good' : campaign.openRate > 15 ? 'average' : 'poor',
            sentDate: campaign.sentDate
          }))
        };
        
        setPerformanceData(transformedData);
      } else {
        throw new Error((result as { error?: string }).error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  useEffect(() => {
    if (user && translationsLoaded) {
      fetchPerformanceData();
    }
  }, [user, translationsLoaded, timeRange, campaignFilter]);

  if (languageLoading || !translationsLoaded) {
    return <LoadingComponent />;
  }

  if (!user) {
    return <LoadingComponent />;
  }

  if (error) {
    return (
      <PerformanceContainer>
        <div style={{ color: 'var(--color-error)', textAlign: 'center', padding: '2rem' }}>
          <FaExclamationTriangle size={48} style={{ marginBottom: '1rem' }} />
          <h3>Error Loading Performance Data</h3>
          <p>{error}</p>
          <button onClick={fetchPerformanceData} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </PerformanceContainer>
    );
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
    }),
  };

  const handleCampaignClick = (campaignId: string) => {
    router.push(`/admin/email-campaigns/campaigns/${campaignId}`);
  };

  const topCampaigns = [...(performanceData?.campaigns || [])]
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, 6);

  const engagementBreakdown = performanceData
    ? [
        {
          label: "Opens",
          value: performanceData.overview.totalOpens,
          percentage:
            performanceData.overview.totalSent > 0
              ? (performanceData.overview.totalOpens /
                  performanceData.overview.totalSent) *
                100
              : 0,
          color: "linear-gradient(90deg, #28a745, #20c997)",
        },
        {
          label: "Clicks",
          value: performanceData.overview.totalClicks,
          percentage:
            performanceData.overview.totalSent > 0
              ? (performanceData.overview.totalClicks /
                  performanceData.overview.totalSent) *
                100
              : 0,
          color: "linear-gradient(90deg, #17a2b8, #6f42c1)",
        },
        {
          label: "Unsubscribes",
          value: performanceData.overview.totalUnsubscribes,
          percentage:
            performanceData.overview.totalSent > 0
              ? (performanceData.overview.totalUnsubscribes /
                  performanceData.overview.totalSent) *
                100
              : 0,
          color: "linear-gradient(90deg, #ffc107, #fd7e14)",
        },
      ]
    : [];

  return (
    <>
      <NextSEO
        title="Email Performance Analytics"
        description="Comprehensive email campaign performance analytics and insights"
      />
      
      <PerformanceContainer>
        <PerformanceTitle>
          <FaChartLine />
          Email Performance Analytics
        </PerformanceTitle>
        <PerformanceSubtitle>
          Comprehensive insights into your email campaign performance and engagement metrics
        </PerformanceSubtitle>

        <FiltersRow>
          <LeftFilters>
            <FilterSelect value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </FilterSelect>
            
            <FilterSelect value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
              <option value="all">All Campaigns</option>
              <option value="newsletter">Newsletters</option>
              <option value="promotional">Promotional</option>
              <option value="transactional">Transactional</option>
            </FilterSelect>
          </LeftFilters>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ActionButton>
              <FaDownload />
              Export Report
            </ActionButton>
            <ActionButton variant="primary">
              <FaShare />
              Share Dashboard
            </ActionButton>
          </div>
        </FiltersRow>

        <MetricsGrid>
          <MetricCard
            variant="info"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <MetricHeader>
              <MetricTitle>Total Sent</MetricTitle>
              <MetricIcon variant="info">
                <FaEnvelope />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{performanceData?.overview.totalSent.toLocaleString()}</MetricValue>
            <MetricChange positive={true}>
              <FaEnvelopeOpen />
              {performanceData?.overview.totalOpens.toLocaleString()} opens tracked
            </MetricChange>
          </MetricCard>

          <MetricCard
            variant="success"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            <MetricHeader>
              <MetricTitle>Open Rate</MetricTitle>
              <MetricIcon variant="success">
                <FaEnvelopeOpen />
              </MetricIcon>
            </MetricHeader>
            <MetricValue variant="success">{performanceData?.overview.openRate.toFixed(1)}%</MetricValue>
            <MetricChange positive={(performanceData?.trends.openRateChange || 0) > 0}>
              {(performanceData?.trends.openRateChange || 0) > 0 ? <FaArrowUp /> : <FaArrowDown />}
              {Math.abs(performanceData?.trends.openRateChange || 0).toFixed(1)}% from last period
            </MetricChange>
          </MetricCard>

          <MetricCard
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            <MetricHeader>
              <MetricTitle>Click Rate</MetricTitle>
              <MetricIcon>
                <FaMousePointer />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{performanceData?.overview.clickRate.toFixed(1)}%</MetricValue>
            <MetricChange positive={(performanceData?.trends.clickRateChange || 0) > 0}>
              {(performanceData?.trends.clickRateChange || 0) > 0 ? <FaArrowUp /> : <FaArrowDown />}
              {Math.abs(performanceData?.trends.clickRateChange || 0).toFixed(1)}% from last period
            </MetricChange>
          </MetricCard>

          <MetricCard
            variant="warning"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <MetricHeader>
              <MetricTitle>Unsubscribe Rate</MetricTitle>
              <MetricIcon variant="warning">
                <FaBan />
              </MetricIcon>
            </MetricHeader>
            <MetricValue variant="warning">{performanceData?.overview.unsubscribeRate.toFixed(1)}%</MetricValue>
            <MetricChange positive={(performanceData?.trends.unsubscribeRateChange || 0) < 0}>
              {(performanceData?.trends.unsubscribeRateChange || 0) > 0 ? <FaArrowUp /> : <FaArrowDown />}
              {Math.abs(performanceData?.trends.unsubscribeRateChange || 0).toFixed(1)}% from last period
            </MetricChange>
          </MetricCard>
        </MetricsGrid>

        <ChartsGrid>
          <ChartCard>
            <ChartHeader>
              <ChartTitle>
                <FaArrowUp />
                Performance Trends
              </ChartTitle>
              <ActionButton>
                <FaCog />
                Configure
              </ActionButton>
            </ChartHeader>
            <ChartContent>
              <ChartStack>
                {topCampaigns.map((campaign) => (
                  <ChartRow key={campaign.id}>
                    <ChartLabel>{campaign.name}</ChartLabel>
                    <ChartBarTrack>
                      <ChartBarFill $width={Math.max(3, Math.min(100, campaign.openRate))} />
                    </ChartBarTrack>
                    <ChartNumber>{campaign.openRate.toFixed(1)}%</ChartNumber>
                  </ChartRow>
                ))}
              </ChartStack>
            </ChartContent>
          </ChartCard>

          <ChartCard>
            <ChartHeader>
              <ChartTitle>
                <FaUsers />
                Engagement Breakdown
              </ChartTitle>
            </ChartHeader>
            <ChartContent>
              <ChartStack>
                {engagementBreakdown.map((item) => (
                  <ChartRow key={item.label}>
                    <ChartLabel>{item.label}</ChartLabel>
                    <ChartBarTrack>
                      <ChartBarFill
                        $width={Math.max(2, Math.min(100, item.percentage))}
                        $color={item.color}
                      />
                    </ChartBarTrack>
                    <ChartNumber>
                      {item.percentage.toFixed(1)}% ({item.value.toLocaleString()})
                    </ChartNumber>
                  </ChartRow>
                ))}
              </ChartStack>
            </ChartContent>
          </ChartCard>
        </ChartsGrid>

        <DeviceBreakdownGrid>
          <DeviceCard>
            <DeviceIcon>
              <FaMobile />
            </DeviceIcon>
            <DeviceLabel>Mobile</DeviceLabel>
            <DevicePercentage>{performanceData?.devices.mobile}%</DevicePercentage>
          </DeviceCard>
          
          <DeviceCard>
            <DeviceIcon>
              <FaDesktop />
            </DeviceIcon>
            <DeviceLabel>Desktop</DeviceLabel>
            <DevicePercentage>{performanceData?.devices.desktop}%</DevicePercentage>
          </DeviceCard>
          
          <DeviceCard>
            <DeviceIcon>
              <FaTablet />
            </DeviceIcon>
            <DeviceLabel>Tablet</DeviceLabel>
            <DevicePercentage>{performanceData?.devices.tablet}%</DevicePercentage>
          </DeviceCard>
        </DeviceBreakdownGrid>

        <CampaignPerformanceSection>
          <SectionHeader>
            <SectionTitle>
              <FaEnvelopeOpen />
              Campaign Performance
            </SectionTitle>
            <ActionButton>
              <FaEye />
              View All
            </ActionButton>
          </SectionHeader>

          <AdminResponsiveList
            desktop={
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell>Campaign</TableHeaderCell>
                <TableHeaderCell>Sent</TableHeaderCell>
                <TableHeaderCell>Open Rate</TableHeaderCell>
                <TableHeaderCell>Click Rate</TableHeaderCell>
                <TableHeaderCell>Performance</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {performanceData?.campaigns.map((campaign, index) => (
                <TableRow
                  key={campaign.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  onClick={() => handleCampaignClick(campaign.id)}
                >
                  <TableCell>
                    <CampaignName>{campaign.name}</CampaignName>
                    <CampaignMeta>
                      {campaign.opens.toLocaleString()} opens • {campaign.clicks.toLocaleString()} clicks
                    </CampaignMeta>
                  </TableCell>
                  <TableCell>{campaign.sent.toLocaleString()}</TableCell>
                  <TableCell>
                    <div>{campaign.openRate}%</div>
                    <PerformanceBar>
                      <PerformanceFill 
                        percentage={campaign.openRate} 
                        color={campaign.openRate >= 25 ? '#28a745' : campaign.openRate >= 20 ? '#ffc107' : '#dc3545'}
                      />
                    </PerformanceBar>
                  </TableCell>
                  <TableCell>
                    <div>{campaign.clickRate}%</div>
                    <PerformanceBar>
                      <PerformanceFill 
                        percentage={campaign.clickRate * 5} 
                        color={campaign.clickRate >= 5 ? '#28a745' : campaign.clickRate >= 3 ? '#ffc107' : '#dc3545'}
                      />
                    </PerformanceBar>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={campaign.performance}>
                      {campaign.performance}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {new Date(campaign.sentDate).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            }
            mobile={
              !performanceData?.campaigns?.length ? (
                <AdminMobileEmpty message="No campaign performance data yet." />
              ) : (
                <AdminMobileCardList>
                  {performanceData.campaigns.map((campaign) => (
                    <AdminDataCard
                      key={campaign.id}
                      onClick={() => handleCampaignClick(campaign.id)}
                    >
                      <AdminDataCardHeader
                        title={campaign.name}
                        subtitle={`${campaign.opens.toLocaleString()} opens • ${campaign.clicks.toLocaleString()} clicks`}
                        badge={
                          <StatusBadge status={campaign.performance}>
                            {campaign.performance}
                          </StatusBadge>
                        }
                      />
                      <AdminDataCardMeta
                        items={[
                          { label: "Sent", value: campaign.sent.toLocaleString() },
                          { label: "Open Rate", value: `${campaign.openRate}%` },
                          { label: "Click Rate", value: `${campaign.clickRate}%` },
                          { label: "Date", value: new Date(campaign.sentDate).toLocaleDateString() },
                        ]}
                      />
                    </AdminDataCard>
                  ))}
                </AdminMobileCardList>
              )
            }
          />
        </CampaignPerformanceSection>
      </PerformanceContainer>
    </>
  );
}

export default PerformancePage; 