"use client";
import React, { useState, useEffect } from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { 
  FaFlask, 
  FaPlus,
  FaSearch,
  FaFilter,
  FaSort,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlay,
  FaPause,
  FaStop,
  FaChartLine,
  FaUsers,
  FaEnvelopeOpen,
  FaMousePointer,
  FaCalendarAlt,
  FaCrown,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaChevronRight,
  FaDownload,
  FaCopy,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { motion } from "framer-motion";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";

const ABTestContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Breadcrumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const BreadcrumbLink = styled(Link)`
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
  }
`;

const BreadcrumbCurrent = styled.span`
  color: var(--text);
  font-weight: 500;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const Title = styled.h1`
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
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  @media (max-width: 768px) {
    justify-content: flex-end;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
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
      case 'danger':
        return `
          background-color: #dc3545;
          color: white;
          &:hover {
            background-color: #c82333;
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

const FiltersRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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
    flex-wrap: wrap;
  }
`;

const SearchInput = styled.input`
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.3s ease;
  min-width: 250px;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const Select = styled.select`
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
`;

const TestsGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const TestCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const TestHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

const TestInfo = styled.div`
  flex: 1;
`;

const TestTitle = styled.h3`
  font-size: 1.3rem;
  color: var(--text);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TestDescription = styled.p`
  color: var(--text-secondary);
  margin-bottom: 1rem;
  line-height: 1.5;
`;

const TestMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);

  svg {
    color: var(--primary);
  }

  strong {
    color: var(--text);
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  
  ${(props) => {
    switch (props.status) {
      case 'running':
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        `;
      case 'completed':
        return `
          background-color: rgba(108, 99, 255, 0.2);
          color: var(--primary);
        `;
      case 'paused':
        return `
          background-color: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        `;
      case 'draft':
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
      case 'failed':
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

const TestActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
`;

const TestBody = styled.div`
  padding: 1.5rem;
`;

const VariantsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const VariantCard = styled.div<{ isWinner?: boolean }>`
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid ${props => props.isWinner ? '#28a745' : 'rgba(255, 255, 255, 0.1)'};
  background-color: ${props => props.isWinner ? 'rgba(40, 167, 69, 0.05)' : 'rgba(255, 255, 255, 0.02)'};
  position: relative;
`;

const VariantHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const VariantTitle = styled.h4`
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const WinnerBadge = styled.span`
  background-color: #28a745;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const VariantSubject = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  font-style: italic;
`;

const VariantStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;

const VariantStat = styled.div`
  text-align: center;
`;

const VariantStatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
`;

const VariantStatLabel = styled.div`
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TestProgress = styled.div`
  margin-bottom: 1rem;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const ProgressBar = styled.div`
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ percentage: number }>`
  height: 100%;
  width: ${props => props.percentage}%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  transition: width 0.3s ease;
`;

const ResultsSection = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ResultsTitle = styled.h4`
  color: var(--text);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  text-align: center;
`;

const ComparisonItem = styled.div``;

const ComparisonLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ComparisonValue = styled.div<{ trend?: 'up' | 'down' | 'neutral' }>`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => {
    switch (props.trend) {
      case 'up': return '#28a745';
      case 'down': return '#dc3545';
      default: return 'var(--text)';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
`;

// Mock data
const mockStats = [
  { label: "Active Tests", value: "12" },
  { label: "Completed Tests", value: "47" },
  { label: "Total Variants", value: "94" },
  { label: "Avg. Improvement", value: "+23%" }
];

const mockTests = [
  {
    id: "1",
    title: "Subject Line Optimization",
    description: "Testing different subject line approaches for the product launch campaign",
    status: "running",
    type: "Subject Line",
    startDate: "2024-01-15",
    endDate: "2024-01-22",
    progress: 67,
    totalSent: 5000,
    variants: [
      {
        id: "A",
        name: "Variant A (Control)",
        subject: "🎵 Introducing Our New Synthesizer Features!",
        sent: 2500,
        opens: 780,
        clicks: 156,
        openRate: 31.2,
        clickRate: 6.2,
        isWinner: false
      },
      {
        id: "B",
        name: "Variant B",
        subject: "Transform Your Music with Revolutionary Synth Technology",
        sent: 2500,
        opens: 925,
        clicks: 203,
        openRate: 37.0,
        clickRate: 8.1,
        isWinner: true
      }
    ]
  },
  {
    id: "2",
    title: "Send Time Optimization",
    description: "Finding the optimal send time for maximum engagement",
    status: "completed",
    type: "Send Time",
    startDate: "2024-01-08",
    endDate: "2024-01-15",
    progress: 100,
    totalSent: 8000,
    variants: [
      {
        id: "A",
        name: "Morning (9 AM)",
        subject: "Weekly Newsletter - New Features & Updates",
        sent: 2667,
        opens: 853,
        clicks: 128,
        openRate: 32.0,
        clickRate: 4.8,
        isWinner: false
      },
      {
        id: "B",
        name: "Afternoon (2 PM)",
        subject: "Weekly Newsletter - New Features & Updates",
        sent: 2667,
        opens: 987,
        clicks: 167,
        openRate: 37.0,
        clickRate: 6.3,
        isWinner: true
      },
      {
        id: "C",
        name: "Evening (7 PM)",
        subject: "Weekly Newsletter - New Features & Updates",
        sent: 2666,
        opens: 773,
        clicks: 116,
        openRate: 29.0,
        clickRate: 4.4,
        isWinner: false
      }
    ]
  },
  {
    id: "3",
    title: "CTA Button Color Test",
    description: "Testing different call-to-action button colors for conversion optimization",
    status: "paused",
    type: "Design",
    startDate: "2024-01-20",
    endDate: "2024-01-27",
    progress: 34,
    totalSent: 3000,
    variants: [
      {
        id: "A",
        name: "Blue Button",
        subject: "Upgrade Your Music Production Setup",
        sent: 1020,
        opens: 306,
        clicks: 43,
        openRate: 30.0,
        clickRate: 4.2,
        isWinner: false
      },
      {
        id: "B",
        name: "Orange Button",
        subject: "Upgrade Your Music Production Setup",
        sent: 1020,
        opens: 316,
        clicks: 57,
        openRate: 31.0,
        clickRate: 5.6,
        isWinner: false
      }
    ]
  },
  {
    id: "4",
    title: "Email Length Comparison",
    description: "Short vs. long email content performance analysis",
    status: "draft",
    type: "Content",
    startDate: "2024-01-25",
    endDate: "2024-02-01",
    progress: 0,
    totalSent: 0,
    variants: [
      {
        id: "A",
        name: "Short Email",
        subject: "Quick Update: New Synth Pads Available",
        sent: 0,
        opens: 0,
        clicks: 0,
        openRate: 0,
        clickRate: 0,
        isWinner: false
      },
      {
        id: "B",
        name: "Detailed Email",
        subject: "Quick Update: New Synth Pads Available",
        sent: 0,
        opens: 0,
        clicks: 0,
        openRate: 0,
        clickRate: 0,
        isWinner: false
      }
    ]
  }
];

function ABTestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();

  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  if (languageLoading || !translationsLoaded) {
    return <LoadingComponent />;
  }

  if (!user) {
    return <LoadingComponent />;
  }

  const filteredTests = mockTests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || test.status === statusFilter;
    const matchesType = typeFilter === "all" || test.type.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleAction = (action: string, testId: string) => {
    console.log(`${action} test:`, testId);
    // Implement action logic here
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <FaPlay />;
      case 'completed': return <FaCheckCircle />;
      case 'paused': return <FaPause />;
      case 'draft': return <FaClock />;
      case 'failed': return <FaTimesCircle />;
      default: return <FaClock />;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return <FaArrowUp />;
      case 'down': return <FaArrowDown />;
      default: return <FaEquals />;
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
    }),
  };

  return (
    <>
      <NextSEO
        title="A/B Tests"
        description="Manage and analyze email campaign A/B tests"
      />
      
      <ABTestContainer>
        <Breadcrumbs>
          <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          <FaChevronRight />
          <BreadcrumbLink href="/admin/email-campaigns/campaigns">Email Campaigns</BreadcrumbLink>
          <FaChevronRight />
          <BreadcrumbCurrent>A/B Tests</BreadcrumbCurrent>
        </Breadcrumbs>

        <Header>
          <HeaderLeft>
            <Title>
              <FaFlask />
              A/B Tests
            </Title>
            <Subtitle>
              Optimize your email campaigns with data-driven testing
            </Subtitle>
          </HeaderLeft>
          <HeaderActions>
            <ActionButton onClick={() => handleAction('export', '')}>
              <FaDownload />
              Export
            </ActionButton>
            <ActionButton variant="primary" onClick={() => router.push('/admin/email-campaigns/ab-tests/create')}>
              <FaPlus />
              Create Test
            </ActionButton>
          </HeaderActions>
        </Header>

        <StatsGrid>
          {mockStats.map((stat, index) => (
            <StatCard
              key={stat.label}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <StatValue>{stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsGrid>

        <FiltersRow>
          <FilterGroup>
            <SearchInput
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
              <option value="failed">Failed</option>
            </Select>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="subject line">Subject Line</option>
              <option value="send time">Send Time</option>
              <option value="design">Design</option>
              <option value="content">Content</option>
            </Select>
          </FilterGroup>
          <FilterGroup>
            <FaSort style={{ color: 'var(--text-secondary)' }} />
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="status">By Status</option>
              <option value="progress">By Progress</option>
            </Select>
          </FilterGroup>
        </FiltersRow>

        <TestsGrid>
          {filteredTests.map((test, index) => (
            <TestCard
              key={test.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <TestHeader>
                <TestInfo>
                  <TestTitle>
                    {getStatusIcon(test.status)}
                    {test.title}
                  </TestTitle>
                  <TestDescription>{test.description}</TestDescription>
                  <TestMeta>
                    <MetaItem>
                      <StatusBadge status={test.status}>{test.status}</StatusBadge>
                    </MetaItem>
                    <MetaItem>
                      <FaFlask />
                      <strong>{test.type}</strong>
                    </MetaItem>
                    <MetaItem>
                      <FaCalendarAlt />
                      {new Date(test.startDate).toLocaleDateString()} - {new Date(test.endDate).toLocaleDateString()}
                    </MetaItem>
                    <MetaItem>
                      <FaUsers />
                      <strong>{test.totalSent.toLocaleString()}</strong> recipients
                    </MetaItem>
                  </TestMeta>
                </TestInfo>
                <TestActions>
                  <ActionButton onClick={() => handleAction('view', test.id)}>
                    <FaEye />
                  </ActionButton>
                  <ActionButton onClick={() => handleAction('edit', test.id)}>
                    <FaEdit />
                  </ActionButton>
                  {test.status === 'running' && (
                    <ActionButton onClick={() => handleAction('pause', test.id)}>
                      <FaPause />
                    </ActionButton>
                  )}
                  {test.status === 'paused' && (
                    <ActionButton onClick={() => handleAction('resume', test.id)}>
                      <FaPlay />
                    </ActionButton>
                  )}
                  <ActionButton variant="danger" onClick={() => handleAction('delete', test.id)}>
                    <FaTrash />
                  </ActionButton>
                </TestActions>
              </TestHeader>

              <TestBody>
                {test.status !== 'draft' && (
                  <TestProgress>
                    <ProgressLabel>
                      <span>Test Progress</span>
                      <span>{test.progress}%</span>
                    </ProgressLabel>
                    <ProgressBar>
                      <ProgressFill percentage={test.progress} />
                    </ProgressBar>
                  </TestProgress>
                )}

                <VariantsGrid>
                  {test.variants.map((variant) => (
                    <VariantCard key={variant.id} isWinner={variant.isWinner}>
                      <VariantHeader>
                        <VariantTitle>
                          {variant.name}
                          {variant.isWinner && (
                            <WinnerBadge>
                              <FaCrown />
                              Winner
                            </WinnerBadge>
                          )}
                        </VariantTitle>
                      </VariantHeader>
                      <VariantSubject>&quot;{variant.subject}&quot;</VariantSubject>
                      {test.status !== 'draft' && (
                        <VariantStats>
                          <VariantStat>
                            <VariantStatValue>{variant.sent.toLocaleString()}</VariantStatValue>
                            <VariantStatLabel>Sent</VariantStatLabel>
                          </VariantStat>
                          <VariantStat>
                            <VariantStatValue>{variant.openRate}%</VariantStatValue>
                            <VariantStatLabel>Open Rate</VariantStatLabel>
                          </VariantStat>
                          <VariantStat>
                            <VariantStatValue>{variant.clickRate}%</VariantStatValue>
                            <VariantStatLabel>Click Rate</VariantStatLabel>
                          </VariantStat>
                        </VariantStats>
                      )}
                    </VariantCard>
                  ))}
                </VariantsGrid>

                {test.status === 'completed' && test.variants.length === 2 && (
                  <ResultsSection>
                    <ResultsTitle>
                      <FaChartLine />
                      Test Results
                    </ResultsTitle>
                    <ComparisonGrid>
                      <ComparisonItem>
                        <ComparisonLabel>Open Rate Difference</ComparisonLabel>
                        <ComparisonValue trend="up">
                          {getTrendIcon('up')}
                          +{(test.variants[1].openRate - test.variants[0].openRate).toFixed(1)}%
                        </ComparisonValue>
                      </ComparisonItem>
                      <ComparisonItem>
                        <ComparisonLabel>Click Rate Difference</ComparisonLabel>
                        <ComparisonValue trend="up">
                          {getTrendIcon('up')}
                          +{(test.variants[1].clickRate - test.variants[0].clickRate).toFixed(1)}%
                        </ComparisonValue>
                      </ComparisonItem>
                      <ComparisonItem>
                        <ComparisonLabel>Statistical Significance</ComparisonLabel>
                        <ComparisonValue trend="up">
                          {getTrendIcon('up')}
                          95%
                        </ComparisonValue>
                      </ComparisonItem>
                    </ComparisonGrid>
                  </ResultsSection>
                )}
              </TestBody>
            </TestCard>
          ))}
        </TestsGrid>

        {filteredTests.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            color: 'var(--text-secondary)',
            background: 'var(--card-bg)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <FaFlask style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>No A/B tests found</h3>
            <p>Create your first A/B test to start optimizing your email campaigns.</p>
            <ActionButton 
              variant="primary" 
              onClick={() => router.push('/admin/email-campaigns/ab-tests/create')}
              style={{ marginTop: '1rem' }}
            >
              <FaPlus />
              Create Your First Test
            </ActionButton>
          </div>
        )}
      </ABTestContainer>
    </>
  );
}

export default ABTestsPage; 