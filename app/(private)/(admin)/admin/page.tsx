"use client";
import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaUsers,
  FaMoneyBillWave,
  FaTicketAlt,
  FaChartLine,
  FaPlus,
  FaArrowDown,
  FaCrown,
  FaBell,
  FaExternalLinkAlt,
  FaDollarSign,
  FaClock,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";

import {
  getTotalUsers,
  getActiveSubscriptions,
  getLifetimeCustomers,
  getMonthlyRevenue,
  getMRR,
  getTrialUsers,
  getTrialUsersByType,
  getChurnRate,
  getAdminUsers,
  getRecentActivity,
  getAverageSubscriptionLifespan,
  getYTDSales,
  getAnalyticsTimeSeries,
  AdminActivity,
} from "@/utils/stripe/admin-analytics";
import StatLoadingSpinner from "@/components/common/StatLoadingSpinner";
import { getRecentSupportTicketMessagesAdmin } from "@/app/actions/user-management";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const TabNavigation = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 1rem 2rem;
  background: none;
  border: none;
  color: ${props => props.$active ? 'var(--primary)' : 'var(--text-secondary)'};
  font-size: 1rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  border-bottom: 2px solid ${props => props.$active ? 'var(--primary)' : 'transparent'};
  margin-bottom: -2px;

  &:hover {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
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
    color: var(--primary);
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
  }
`;

const StatCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border-color: rgba(255, 255, 255, 0.12);
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }
`;

const StatIcon = styled.div`
  font-size: 3rem;
  color: var(--primary);
  flex-shrink: 0;
  opacity: 0.9;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const StatContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  background: linear-gradient(135deg, var(--text), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const StatLabel = styled.p`
  font-size: 0.95rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
  font-weight: 600;
`;

const StatDetail = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  opacity: 0.8;
  line-height: 1.4;
`;

const RecentActivitySection = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 10px;
    margin-bottom: 2rem;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
`;

const ActivityList = styled.div`
  margin-bottom: 2rem;
`;

const ActivityItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const ActivityIcon = styled.div`
  font-size: 1.2rem;
  color: var(--primary);
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityDescription = styled.p`
  margin: 0 0 0.25rem 0;
  color: var(--text);
  font-size: 0.9rem;
`;

const ActivityTime = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const ActivityAmount = styled.span`
  font-size: 0.9rem;
  color: var(--primary);
  font-weight: 600;
`;

const EmptyState = styled.div`
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 2rem;
`;

const AdditionalStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
  }
`;

const AdditionalStatCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    border-color: rgba(255, 255, 255, 0.12);
  }

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
    padding: 1.5rem;
    border-radius: 12px;
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: var(--error);
  font-size: 1.2rem;
  padding: 2rem;
`;

const ActivityHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const ActivityFilters = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const ActivityFilterButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ $active }) => 
    $active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${({ $active }) => ($active ? 'white' : 'var(--text-secondary)')};
  border: 1px solid ${({ $active }) => 
    $active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;

  &:hover {
    background-color: ${({ $active }) => 
      $active ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)'};
    color: ${({ $active }) => ($active ? 'white' : 'var(--text)')};
    border-color: ${({ $active }) => 
      $active ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)'};
    transform: translateY(-1px);
  }

  svg {
    font-size: 0.8rem;
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
`;

const NotificationsSection = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 10px;
    margin-bottom: 2rem;
  }
`;

const NotificationItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  margin-bottom: 0.5rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
  }

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`;

const NotificationIcon = styled.div`
  font-size: 1.5rem;
  color: var(--primary);
  flex-shrink: 0;
  margin-top: 0.25rem;
`;

const NotificationContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  gap: 1rem;
`;

const NotificationTitle = styled.div`
  font-weight: 600;
  color: var(--text);
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NotificationLink = styled(Link)`
  color: var(--primary);
  text-decoration: none;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  svg {
    font-size: 0.7rem;
  }
`;

const NotificationText = styled.p`
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const NotificationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const NotificationBadge = styled.span<{ $status: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  ${(props) => {
    switch (props.$status) {
      case 'open':
        return 'background-color: rgba(255, 102, 0, 0.2); color: #ff6600;';
      case 'in_progress':
        return 'background-color: rgba(52, 152, 219, 0.2); color: #3498db;';
      case 'resolved':
        return 'background-color: rgba(32, 201, 151, 0.2); color: #20c997;';
      case 'closed':
        return 'background-color: rgba(108, 117, 125, 0.2); color: #6c757d;';
      default:
        return 'background-color: rgba(108, 117, 125, 0.2); color: #6c757d;';
    }
  }}
`;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'summaries' | 'analytics' | 'notifications'>('summaries');
  
  // Individual stat states
  const [totalUsersData, setTotalUsersData] = useState<{ totalUsers: number; freeUsers: number; activeSubscriptions: number } | null>(null);
  const [activeSubscriptionsData, setActiveSubscriptionsData] = useState<{ activeSubscriptions: number; monthlySubscribers: number; annualSubscribers: number } | null>(null);
  const [lifetimeCustomers, setLifetimeCustomers] = useState<number | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number | null>(null);
  const [ytdSales, setYtdSales] = useState<number | null>(null);
  const [mrr, setMrr] = useState<number | null>(null);
  const [trialUsers, setTrialUsers] = useState<number | null>(null);
  const [trialUsersByType, setTrialUsersByType] = useState<{ 
    sevenDayTrials: number; 
    fourteenDayTrials: number;
    sevenDayConversionRate: number;
    fourteenDayConversionRate: number;
  } | null>(null);
  const [churnRate, setChurnRate] = useState<number | null>(null);
  const [adminUsers, setAdminUsers] = useState<number | null>(null);
  const [averageSubscriptionLifespan, setAverageSubscriptionLifespan] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminActivity[]>([]);
  const [supportNotifications, setSupportNotifications] = useState<Array<{
    id: string;
    ticket_id: string;
    ticket_number: string;
    ticket_subject: string;
    ticket_status: string;
    content: string;
    user_id: string;
    user_email: string | null;
    created_at: string;
    message_count: number;
  }>>([]);
  
  // Individual loading states
  const [loadingTotalUsers, setLoadingTotalUsers] = useState(true);
  const [loadingActiveSubscriptions, setLoadingActiveSubscriptions] = useState(true);
  const [loadingLifetimeCustomers, setLoadingLifetimeCustomers] = useState(true);
  const [loadingMonthlyRevenue, setLoadingMonthlyRevenue] = useState(true);
  const [loadingYtdSales, setLoadingYtdSales] = useState(true);
  const [loadingMrr, setLoadingMrr] = useState(true);
  const [loadingTrialUsers, setLoadingTrialUsers] = useState(true);
  const [loadingTrialUsersByType, setLoadingTrialUsersByType] = useState(true);
  const [loadingChurnRate, setLoadingChurnRate] = useState(true);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(true);
  const [loadingAverageSubscriptionLifespan, setLoadingAverageSubscriptionLifespan] = useState(true);
  const [loadingRecentActivity, setLoadingRecentActivity] = useState(true);
  const [loadingSupportNotifications, setLoadingSupportNotifications] = useState(true);
  
  const [activityFilter, setActivityFilter] = useState<AdminActivity['type'] | 'all'>('all');

  // Fetch individual stats
  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        setLoadingTotalUsers(true);
        const data = await getTotalUsers();
        setTotalUsersData(data);
      } catch (err) {
        console.error("Error fetching total users:", err);
      } finally {
        setLoadingTotalUsers(false);
      }
    };

    const fetchActiveSubscriptions = async () => {
      try {
        setLoadingActiveSubscriptions(true);
        const data = await getActiveSubscriptions();
        setActiveSubscriptionsData(data);
      } catch (err) {
        console.error("Error fetching active subscriptions:", err);
      } finally {
        setLoadingActiveSubscriptions(false);
      }
    };

    const fetchLifetimeCustomers = async () => {
      try {
        setLoadingLifetimeCustomers(true);
        const data = await getLifetimeCustomers();
        setLifetimeCustomers(data);
      } catch (err) {
        console.error("Error fetching lifetime customers:", err);
      } finally {
        setLoadingLifetimeCustomers(false);
      }
    };

    const fetchMonthlyRevenue = async () => {
      try {
        setLoadingMonthlyRevenue(true);
        const data = await getMonthlyRevenue();
        setMonthlyRevenue(data);
      } catch (err) {
        console.error("Error fetching monthly revenue:", err);
      } finally {
        setLoadingMonthlyRevenue(false);
      }
    };

    const fetchYTDSales = async () => {
      try {
        setLoadingYtdSales(true);
        const data = await getYTDSales();
        setYtdSales(data);
      } catch (err) {
        console.error("Error fetching YTD sales:", err);
      } finally {
        setLoadingYtdSales(false);
      }
    };

    const fetchMRR = async () => {
      try {
        setLoadingMrr(true);
        const data = await getMRR();
        console.log("MRR calculated:", data, "Type:", typeof data);
        setMrr(data);
      } catch (err) {
        console.error("Error fetching MRR:", err);
        setMrr(0); // Set to 0 on error so it still displays
      } finally {
        setLoadingMrr(false);
      }
    };

    const fetchTrialUsers = async () => {
      try {
        setLoadingTrialUsers(true);
        const data = await getTrialUsers();
        setTrialUsers(data);
      } catch (err) {
        console.error("Error fetching trial users:", err);
      } finally {
        setLoadingTrialUsers(false);
      }
    };

    const fetchTrialUsersByType = async () => {
      try {
        setLoadingTrialUsersByType(true);
        const data = await getTrialUsersByType();
        setTrialUsersByType(data);
      } catch (err) {
        console.error("Error fetching trial users by type:", err);
      } finally {
        setLoadingTrialUsersByType(false);
      }
    };

    const fetchChurnRate = async () => {
      try {
        setLoadingChurnRate(true);
        const data = await getChurnRate();
        setChurnRate(data);
      } catch (err) {
        console.error("Error fetching churn rate:", err);
      } finally {
        setLoadingChurnRate(false);
      }
    };

    const fetchAdminUsers = async () => {
      try {
        setLoadingAdminUsers(true);
        const data = await getAdminUsers();
        setAdminUsers(data);
      } catch (err) {
        console.error("Error fetching admin users:", err);
      } finally {
        setLoadingAdminUsers(false);
      }
    };

    const fetchAverageSubscriptionLifespan = async () => {
      try {
        setLoadingAverageSubscriptionLifespan(true);
        const data = await getAverageSubscriptionLifespan();
        setAverageSubscriptionLifespan(data);
      } catch (err) {
        console.error("Error fetching average subscription lifespan:", err);
      } finally {
        setLoadingAverageSubscriptionLifespan(false);
      }
    };

    const fetchRecentActivity = async () => {
      try {
        setLoadingRecentActivity(true);
        const data = await getRecentActivity();
        setRecentActivity(data);
      } catch (err) {
        console.error("Error fetching recent activity:", err);
      } finally {
        setLoadingRecentActivity(false);
      }
    };

    const fetchSupportNotifications = async () => {
      try {
        setLoadingSupportNotifications(true);
        const result = await getRecentSupportTicketMessagesAdmin(5);
        if (result.messages) {
          setSupportNotifications(result.messages);
        }
      } catch (err) {
        console.error("Error fetching support notifications:", err);
      } finally {
        setLoadingSupportNotifications(false);
      }
    };

    // Fetch all stats independently
    fetchTotalUsers();
    fetchActiveSubscriptions();
    fetchLifetimeCustomers();
    fetchMonthlyRevenue();
    fetchYTDSales();
    fetchMRR();
    fetchTrialUsers();
    fetchTrialUsersByType();
    fetchChurnRate();
    fetchAdminUsers();
    fetchAverageSubscriptionLifespan();
    fetchRecentActivity();
    fetchSupportNotifications();

    // Poll for new support notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      fetchSupportNotifications();
    }, 30000);

    return () => clearInterval(notificationInterval);
  }, []);

  if (!user) {
    return null;
  }

  // Temporarily disabled admin check for testing
  // if (user.profile?.subscription !== "admin") {
  //   return null;
  // }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const formatCurrency = (amount: number) => {
    // Round to nearest cent (2 decimal places)
    const rounded = Math.round(amount * 100) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rounded);
  };

  const formatCurrencyWholeDollars = (amount: number) => {
    // Round to nearest dollar (no cents)
    const rounded = Math.round(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rounded);
  };

  const formatCurrencyForChart = (amount: number) => {
    // Round to nearest dollar for charts
    const rounded = Math.round(amount);
    return formatCurrencyWholeDollars(rounded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLifespan = (days: number): { value: string; unit: string } => {
    // Always convert to months
    const months = days / 30;
    return { value: `${months.toFixed(1)}`, unit: 'months' };
  };

  const getActivityIcon = (type: AdminActivity['type']) => {
    switch (type) {
      case 'subscription':
        return <FaMoneyBillWave />;
      case 'payment':
        return <FaChartLine />;
      case 'user_signup':
        return <FaUsers />;
      case 'cancellation':
        return <FaArrowDown />;
      default:
        return <FaPlus />;
    }
  };

  const getFilteredActivities = () => {
    if (!recentActivity || recentActivity.length === 0) return [];
    
    if (activityFilter === 'all') {
      return recentActivity;
    }
    
    return recentActivity.filter(activity => activity.type === activityFilter);
  };

  const getActivityTypeLabel = (type: AdminActivity['type'] | 'all') => {
    switch (type) {
      case 'subscription':
        return 'Subscriptions';
      case 'payment':
        return 'Payments';
      case 'user_signup':
        return 'Signups';
      case 'cancellation':
        return 'Cancellations';
      default:
        return 'All Activities';
    }
  };

  const getActivityTypeCount = (type: AdminActivity['type'] | 'all') => {
    if (!recentActivity || recentActivity.length === 0) return 0;
    
    if (type === 'all') {
      return recentActivity.length;
    }
    
    return recentActivity.filter(activity => activity.type === type).length;
  };

  return (
    <Container>
      <motion.div initial="hidden" animate="visible" variants={staggerChildren}>
        <TabNavigation>
          <TabButton 
            $active={activeTab === 'summaries'} 
            onClick={() => setActiveTab('summaries')}
          >
            Summaries
          </TabButton>
          <TabButton 
            $active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </TabButton>
          <TabButton 
            $active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </TabButton>
        </TabNavigation>

        {activeTab === 'summaries' && (
          <>
        <Header>
          <Title>
            <FaCrown />
            Admin Dashboard
          </Title>
          <Subtitle>
            Cymasphere Analytics & Management
          </Subtitle>
        </Header>

        <motion.div variants={staggerChildren} initial="hidden" animate="visible">
          <StatsGrid>
            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaUsers />
              </StatIcon>
              <StatContent>
                <StatLabel>Total Users</StatLabel>
                <StatValue>
                  {loadingTotalUsers ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    totalUsersData?.totalUsers.toLocaleString() ?? "0"
                  )}
                </StatValue>
                <StatDetail>
                  {loadingTotalUsers ? (
                    <StatLoadingSpinner size={12} />
                  ) : (
                    `${totalUsersData?.freeUsers ?? 0} free, ${totalUsersData?.activeSubscriptions ?? 0} paid`
                  )}
                </StatDetail>
              </StatContent>
            </StatCard>

            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaMoneyBillWave />
              </StatIcon>
              <StatContent>
                <StatLabel>Active Subscriptions</StatLabel>
                <StatValue>
                  {loadingActiveSubscriptions ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    <>
                      {activeSubscriptionsData?.activeSubscriptions ?? 0}
                      {!loadingMrr && typeof mrr === 'number' && (
                        <span style={{ 
                          fontSize: '0.5em', 
                          color: 'white', 
                          marginLeft: '0.5rem', 
                          fontWeight: 'normal', 
                          opacity: 0.9,
                          WebkitTextFillColor: 'white'
                        }}>
                          (MRR: {formatCurrency(mrr)})
                        </span>
                      )}
                    </>
                  )}
                </StatValue>
                <StatDetail>
                  {loadingActiveSubscriptions ? (
                    <StatLoadingSpinner size={12} />
                  ) : (
                    `${activeSubscriptionsData?.monthlySubscribers ?? 0} monthly, ${activeSubscriptionsData?.annualSubscribers ?? 0} annual`
                  )}
                </StatDetail>
              </StatContent>
            </StatCard>

            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaTicketAlt />
              </StatIcon>
              <StatContent>
                <StatLabel>Lifetime Customers</StatLabel>
                <StatValue>
                  {loadingLifetimeCustomers ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    lifetimeCustomers ?? 0
                  )}
                </StatValue>
                <StatDetail>
                  One-time purchases
                </StatDetail>
              </StatContent>
            </StatCard>

            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaChartLine />
              </StatIcon>
              <StatContent>
                <StatLabel>Monthly Revenue</StatLabel>
                <StatValue>
                  {loadingMonthlyRevenue ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    formatCurrency(monthlyRevenue ?? 0)
                  )}
                </StatValue>
                <StatDetail>
                  Last 30 days
                </StatDetail>
              </StatContent>
            </StatCard>
          </StatsGrid>

          <StatsGrid style={{ marginTop: '2rem' }}>
            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaClock />
              </StatIcon>
              <StatContent>
                <StatLabel>7-Day Trials</StatLabel>
                <StatValue>
                  {loadingTrialUsersByType ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    trialUsersByType?.sevenDayTrials ?? 0
                  )}
                </StatValue>
                <StatDetail>
                  Active 7-day trials
                  {!loadingTrialUsersByType && typeof trialUsersByType?.sevenDayConversionRate === 'number' && (
                    <span style={{ 
                      display: 'block', 
                      marginTop: '0.5rem', 
                      fontSize: '0.9em', 
                      color: 'var(--primary)',
                      fontWeight: '600'
                    }}>
                      {trialUsersByType.sevenDayConversionRate.toFixed(1)}% conversion rate
                    </span>
                  )}
                </StatDetail>
              </StatContent>
            </StatCard>

            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaClock />
              </StatIcon>
              <StatContent>
                <StatLabel>14-Day Trials</StatLabel>
                <StatValue>
                  {loadingTrialUsersByType ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    trialUsersByType?.fourteenDayTrials ?? 0
                  )}
                </StatValue>
                <StatDetail>
                  Active 14-day trials
                  {!loadingTrialUsersByType && typeof trialUsersByType?.fourteenDayConversionRate === 'number' && (
                    <span style={{ 
                      display: 'block', 
                      marginTop: '0.5rem', 
                      fontSize: '0.9em', 
                      color: 'var(--primary)',
                      fontWeight: '600'
                    }}>
                      {trialUsersByType.fourteenDayConversionRate.toFixed(1)}% conversion rate
                    </span>
                  )}
                </StatDetail>
              </StatContent>
            </StatCard>

            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaChartLine />
              </StatIcon>
              <StatContent>
                <StatLabel>Avg. Sub Lifespan</StatLabel>
                <StatValue>
                  {loadingAverageSubscriptionLifespan ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    averageSubscriptionLifespan !== null && averageSubscriptionLifespan > 0
                      ? (() => {
                          const formatted = formatLifespan(averageSubscriptionLifespan);
                          return (
                            <>
                              {formatted.value}
                              <span style={{ 
                                fontSize: '0.5em', 
                                marginLeft: '0.25rem',
                                fontWeight: 'normal',
                                opacity: 0.8,
                                color: 'white',
                                WebkitTextFillColor: 'white'
                              }}>
                                {formatted.unit}
                              </span>
                            </>
                          );
                        })()
                      : (
                        <>
                          0.0
                          <span style={{ 
                            fontSize: '0.5em', 
                            marginLeft: '0.25rem',
                            fontWeight: 'normal',
                            opacity: 0.8,
                            color: 'white',
                            WebkitTextFillColor: 'white'
                          }}>
                            months
                          </span>
                        </>
                      )
                  )}
                </StatValue>
                <StatDetail>
                  Average time paying subscribers stay
                </StatDetail>
              </StatContent>
            </StatCard>

            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaChartLine />
              </StatIcon>
              <StatContent>
                <StatLabel>Churn Rate</StatLabel>
                <StatValue>
                  {loadingChurnRate ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    `${(churnRate ?? 0).toFixed(1)}%`
                  )}
                </StatValue>
                <StatDetail>
                  Subscription churn
                </StatDetail>
              </StatContent>
            </StatCard>

            <StatCard variants={fadeIn}>
              <StatIcon>
                <FaDollarSign />
              </StatIcon>
              <StatContent>
                <StatLabel>YTD Sales</StatLabel>
                <StatValue>
                  {loadingYtdSales ? (
                    <StatLoadingSpinner size={20} />
                  ) : (
                    formatCurrency(ytdSales ?? 0)
                  )}
                </StatValue>
                <StatDetail>
                  Year-to-date revenue
                </StatDetail>
              </StatContent>
            </StatCard>
          </StatsGrid>
        </motion.div>
          </>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            totalUsersData={totalUsersData}
            activeSubscriptionsData={activeSubscriptionsData}
            monthlyRevenue={monthlyRevenue}
            mrr={mrr}
            trialUsersByType={trialUsersByType}
            churnRate={churnRate}
            averageSubscriptionLifespan={averageSubscriptionLifespan}
            ytdSales={ytdSales}
            formatCurrency={formatCurrency}
            formatCurrencyWholeDollars={formatCurrencyWholeDollars}
            formatCurrencyForChart={formatCurrencyForChart}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            supportNotifications={supportNotifications}
            loadingSupportNotifications={loadingSupportNotifications}
            recentActivity={recentActivity}
            loadingRecentActivity={loadingRecentActivity}
            activityFilter={activityFilter}
            setActivityFilter={setActivityFilter}
            getFilteredActivities={getFilteredActivities}
            getActivityTypeCount={getActivityTypeCount}
            getActivityTypeLabel={getActivityTypeLabel}
            getActivityIcon={getActivityIcon}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            fadeIn={fadeIn}
          />
        )}
      </motion.div>
    </Container>
  );
}

// Analytics Tab Component
interface AnalyticsTabProps {
  totalUsersData: { totalUsers: number; freeUsers: number; activeSubscriptions: number } | null;
  activeSubscriptionsData: { activeSubscriptions: number; monthlySubscribers: number; annualSubscribers: number } | null;
  monthlyRevenue: number | null;
  mrr: number | null;
  trialUsersByType: { sevenDayTrials: number; fourteenDayTrials: number; sevenDayConversionRate: number; fourteenDayConversionRate: number } | null;
  churnRate: number | null;
  averageSubscriptionLifespan: number | null;
  ytdSales: number | null;
  formatCurrency: (amount: number) => string;
  formatCurrencyWholeDollars: (amount: number) => string;
  formatCurrencyForChart: (amount: number) => string;
}

const AnalyticsSection = styled(motion.div)`
  margin-bottom: 3rem;
`;

const ChartCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

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

  svg {
    color: var(--primary);
  }
`;

const TimeRangeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

const ProjectionsPanel = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const ProjectionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ProjectionsTitle = styled.h3`
  font-size: 1.1rem;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ProjectionsControls = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ControlLabel = styled.label`
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
`;

const ControlInput = styled.input`
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const CurrencyInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  
  &::before {
    content: '$';
    position: absolute;
    left: 0.75rem;
    color: var(--text-secondary);
    font-size: 1rem;
    pointer-events: none;
  }
`;

const CurrencyInput = styled.input`
  padding: 0.75rem 0.75rem 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const ControlSelect = styled.select`
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
  
  option {
    background: var(--card-bg);
    color: var(--text);
  }
`;

const TimeRangeButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  color: ${props => props.$active ? 'white' : 'var(--text-secondary)'};
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const ProjectionsButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  border-style: ${props => props.$active ? 'dashed' : 'solid'};
  border-radius: 8px;
  color: ${props => props.$active ? 'var(--primary)' : 'var(--text-secondary)'};
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--primary);
  }
`;

function AnalyticsTab({
  totalUsersData,
  activeSubscriptionsData,
  monthlyRevenue,
  mrr,
  trialUsersByType,
  churnRate,
  averageSubscriptionLifespan,
  ytdSales,
  formatCurrency,
  formatCurrencyWholeDollars,
  formatCurrencyForChart,
}: AnalyticsTabProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'year' | 'projections'>('month');
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [projectionParams, setProjectionParams] = useState({
    monthlyAdSpend: 0,
    monthlyMarketingCost: 0,
    roas: 3.0, // Return on Ad Spend (3x means $3 revenue per $1 spent)
    projectionPeriod: 'endOfYear' as 'endOfYear' | 'nextYear',
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      // Check cache first
      const cacheKey = `analytics_${timeRange}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      // If we have cached data that's less than 5 minutes old, use it immediately
      if (cachedData && cacheTimestamp) {
        const age = now - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          try {
            const parsed = JSON.parse(cachedData);
            setAnalyticsData(parsed);
            setLoadingAnalytics(false);
            // Still fetch fresh data in background
            fetchFreshData();
            return;
          } catch (e) {
            console.error("Error parsing cached data:", e);
          }
        }
      }

      // No cache or cache expired, fetch fresh data
      setLoadingAnalytics(true);
      await fetchFreshData();
    };

    const fetchFreshData = async () => {
      try {
        const data = await getAnalyticsTimeSeries(timeRange === 'projections' ? 'year' : timeRange);
        setAnalyticsData(data);
        
        // Cache the data
        const cacheKey = `analytics_${timeRange}`;
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        // If fetch fails and we have no data, try to use stale cache
        const cacheKey = `analytics_${timeRange}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            setAnalyticsData(parsed);
          } catch (e) {
            setAnalyticsData([]);
          }
        } else {
          setAnalyticsData([]);
        }
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  // Calculate projections based on historical data and inputs - recalculates when params change
  const projectionData = useMemo(() => {
    if (timeRange !== 'projections' || !analyticsData || analyticsData.length === 0) return [];

    const projections: any[] = [];
    const historicalData = [...analyticsData];
    
    // Get the last data point as baseline
    const lastDataPoint = historicalData[historicalData.length - 1];
    if (!lastDataPoint) return [];

    // Calculate average monthly revenue from recent months (last 3 months for stability)
    const recentMonths = historicalData.slice(-3);
    const avgMonthlyRevenue = recentMonths.length > 0
      ? recentMonths.reduce((sum, d) => sum + (d.revenue || 0), 0) / recentMonths.length
      : lastDataPoint.revenue || 0;
    
    const avgMRR = recentMonths.length > 0
      ? recentMonths.reduce((sum, d) => sum + (d.mrr || 0), 0) / recentMonths.length
      : lastDataPoint.mrr || 0;

    // Calculate growth trend (simple linear regression on last 6 months)
    const trendData = historicalData.slice(-6);
    let revenueTrend = 0;
    if (trendData.length >= 2) {
      const firstRevenue = trendData[0].revenue || 0;
      const lastRevenue = trendData[trendData.length - 1].revenue || 0;
      if (firstRevenue > 0) {
        revenueTrend = (lastRevenue - firstRevenue) / (trendData.length - 1);
      }
    }

    // Determine projection period
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let targetDate: Date;
    if (projectionParams.projectionPeriod === 'endOfYear') {
      targetDate = new Date(currentYear, 11, 31); // December 31st of current year
    } else {
      targetDate = new Date(currentYear + 1, 11, 31); // December 31st of next year
    }

    // Calculate months to project from current month
    const monthsToProject = (targetDate.getFullYear() - currentYear) * 12 + 
                           (targetDate.getMonth() - currentMonth);
    
    // Start from current month's baseline (use average of recent months)
    let projectedRevenue = avgMonthlyRevenue;
    let projectedMRR = avgMRR;
    
    // Start from next month
    let projectedDate = new Date(currentYear, currentMonth + 1, 1);

    for (let i = 0; i < monthsToProject && i < 24; i++) { // Limit to 24 months
      // Apply organic growth trend (linear, not exponential)
      projectedRevenue += revenueTrend;
      
      // MRR grows more conservatively (50% of revenue trend)
      projectedMRR += revenueTrend * 0.5;

      // Add ad spend impact (this is incremental revenue from ads)
      const adRevenue = projectionParams.monthlyAdSpend * projectionParams.roas;
      projectedRevenue += adRevenue;
      
      // For MRR: assume ads bring in new subscribers
      // If average subscription is ~$30/month, and ROAS is 3x, $100 ad spend = $300 revenue
      // Conservative: 20% of ad revenue converts to recurring MRR
      const mrrFromAds = adRevenue * 0.2;
      projectedMRR += mrrFromAds;

      // Calculate net revenue (revenue minus ad spend and marketing costs)
      const totalCosts = projectionParams.monthlyAdSpend + projectionParams.monthlyMarketingCost;
      const netRevenue = projectedRevenue - totalCosts;

      // Ensure values don't go negative
      projectedRevenue = Math.max(0, projectedRevenue);
      projectedMRR = Math.max(0, projectedMRR);

      // Round to nearest dollar
      projectedRevenue = Math.round(projectedRevenue);
      projectedMRR = Math.round(projectedMRR);
      const netRevenueRounded = Math.round(netRevenue);

      projections.push({
        date: projectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: projectedRevenue,
        netRevenue: netRevenueRounded,
        mrr: projectedMRR,
        users: lastDataPoint.users || 0,
        subscriptions: lastDataPoint.subscriptions || 0,
        churnRate: lastDataPoint.churnRate || 0,
        sevenDayTrials: lastDataPoint.sevenDayTrials || 0,
        fourteenDayTrials: lastDataPoint.fourteenDayTrials || 0,
        isProjection: true,
      });

      projectedDate.setMonth(projectedDate.getMonth() + 1);
    }

    return projections;
  }, [timeRange, analyticsData, projectionParams.monthlyAdSpend, projectionParams.monthlyMarketingCost, projectionParams.roas, projectionParams.projectionPeriod]);

  // Add net revenue to historical data as well
  const combinedData = useMemo(() => {
    const historicalWithNet = analyticsData.map((point: any) => ({
      ...point,
      revenue: Math.round(point.revenue || 0), // Round to nearest dollar
      mrr: Math.round(point.mrr || 0), // Round to nearest dollar
      netRevenue: Math.round(point.revenue || 0), // For historical data, net = revenue (no costs applied)
    }));
    // Projection data is already rounded in calculateProjections
    return [...historicalWithNet, ...projectionData];
  }, [analyticsData, projectionData]);

  return (
    <>
      <Header>
        <Title>
          <FaChartLine />
          Analytics Dashboard
        </Title>
        <Subtitle>Track metrics over time</Subtitle>
      </Header>

      <TimeRangeSelector>
        <TimeRangeButton 
          $active={timeRange === 'month'} 
          onClick={() => setTimeRange('month')}
        >
          Last 30 Days
        </TimeRangeButton>
        <TimeRangeButton 
          $active={timeRange === 'year'} 
          onClick={() => setTimeRange('year')}
        >
          Last 12 Months
        </TimeRangeButton>
        <TimeRangeButton 
          $active={timeRange === 'projections'} 
          onClick={() => setTimeRange('projections')}
        >
          Growth Projections
        </TimeRangeButton>
      </TimeRangeSelector>

      {timeRange === 'projections' && (
        <ProjectionsPanel variants={fadeIn}>
          <ProjectionsHeader>
            <ProjectionsTitle>
              <FaChartLine />
              Projection Model
            </ProjectionsTitle>
          </ProjectionsHeader>
          <ProjectionsControls>
            <ControlGroup>
              <ControlLabel>Monthly Ad Spend</ControlLabel>
              <CurrencyInputWrapper>
                <CurrencyInput
                  type="number"
                  min="0"
                  step="1"
                  value={projectionParams.monthlyAdSpend > 0 ? projectionParams.monthlyAdSpend : ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 0;
                    setProjectionParams({
                      ...projectionParams,
                      monthlyAdSpend: value,
                    });
                  }}
                  placeholder="0"
                />
              </CurrencyInputWrapper>
            </ControlGroup>
            <ControlGroup>
              <ControlLabel>Monthly Marketing Cost</ControlLabel>
              <CurrencyInputWrapper>
                <CurrencyInput
                  type="number"
                  min="0"
                  step="1"
                  value={projectionParams.monthlyMarketingCost > 0 ? projectionParams.monthlyMarketingCost : ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 0;
                    setProjectionParams({
                      ...projectionParams,
                      monthlyMarketingCost: value,
                    });
                  }}
                  placeholder="0"
                />
              </CurrencyInputWrapper>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Other marketing expenses (salaries, tools, etc.)
              </small>
            </ControlGroup>
            <ControlGroup>
              <ControlLabel>ROAS (Return on Ad Spend)</ControlLabel>
              <ControlInput
                type="number"
                min="0"
                step="0.1"
                value={projectionParams.roas > 0 ? projectionParams.roas : ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setProjectionParams({
                    ...projectionParams,
                    roas: value,
                  });
                }}
                placeholder="3.0"
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {projectionParams.roas > 0 ? `${projectionParams.roas}x means $${projectionParams.roas} revenue per $1 spent` : 'Enter ROAS multiplier'}
              </small>
            </ControlGroup>
            <ControlGroup>
              <ControlLabel>Projection Period</ControlLabel>
              <ControlSelect
                value={projectionParams.projectionPeriod}
                onChange={(e) => setProjectionParams({
                  ...projectionParams,
                  projectionPeriod: e.target.value as 'endOfYear' | 'nextYear',
                })}
              >
                <option value="endOfYear">End of Current Year</option>
                <option value="nextYear">End of Next Year</option>
              </ControlSelect>
            </ControlGroup>
          </ProjectionsControls>
        </ProjectionsPanel>
      )}

      {loadingAnalytics ? (
        <EmptyState>
          <StatLoadingSpinner size={20} />
        </EmptyState>
      ) : (
        <>
          <AnalyticsSection variants={fadeIn}>
            <ChartCard>
              <ChartTitle>
                <FaMoneyBillWave />
                Revenue & MRR Over Time
              </ChartTitle>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    tickFormatter={(value) => formatCurrencyForChart(value)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrencyForChart(value)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#22c55e" 
                    strokeWidth={2} 
                    name="Revenue ($)"
                    strokeDasharray={timeRange === 'projections' ? "5 5" : "0"}
                    dot={false}
                  />
                  {timeRange === 'projections' && (
                    <Line 
                      type="monotone" 
                      dataKey="netRevenue" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      name="Net Revenue ($)"
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                  <Line 
                    type="monotone" 
                    dataKey="mrr" 
                    stroke="var(--primary)" 
                    strokeWidth={2} 
                    name="MRR ($)"
                    strokeDasharray={timeRange === 'projections' ? "5 5" : "0"}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnalyticsSection>

          <AnalyticsSection variants={fadeIn}>
            <ChartCard>
              <ChartTitle>
                <FaUsers />
                Total Users Over Time
              </ChartTitle>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Area type="monotone" dataKey="users" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnalyticsSection>

          <AnalyticsSection variants={fadeIn}>
            <ChartCard>
              <ChartTitle>
                <FaTicketAlt />
                Active Subscriptions Over Time
              </ChartTitle>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Area type="monotone" dataKey="subscriptions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnalyticsSection>

          <AnalyticsSection variants={fadeIn}>
            <ChartCard>
              <ChartTitle>
                <FaClock />
                Trial Users Over Time
              </ChartTitle>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sevenDayTrials" stroke="#f59e0b" strokeWidth={2} name="7-Day Trials" />
                  <Line type="monotone" dataKey="fourteenDayTrials" stroke="#8b5cf6" strokeWidth={2} name="14-Day Trials" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnalyticsSection>

          <AnalyticsSection variants={fadeIn}>
            <ChartCard>
              <ChartTitle>
                <FaChartLine />
                Churn Rate Over Time
              </ChartTitle>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="churnRate" stroke="#ef4444" strokeWidth={2} name="Churn Rate (%)" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnalyticsSection>
        </>
      )}
    </>
  );
}

// Notifications Tab Component
interface NotificationsTabProps {
  supportNotifications: Array<{
    id: string;
    ticket_id: string;
    ticket_number: string;
    ticket_subject: string;
    ticket_status: string;
    content: string;
    user_id: string;
    user_email: string | null;
    created_at: string;
    message_count: number;
  }>;
  loadingSupportNotifications: boolean;
  recentActivity: AdminActivity[];
  loadingRecentActivity: boolean;
  activityFilter: AdminActivity['type'] | 'all';
  setActivityFilter: (filter: AdminActivity['type'] | 'all') => void;
  getFilteredActivities: () => AdminActivity[];
  getActivityTypeCount: (type: AdminActivity['type'] | 'all') => number;
  getActivityTypeLabel: (type: AdminActivity['type'] | 'all') => string;
  getActivityIcon: (type: AdminActivity['type']) => React.ReactNode;
  formatDate: (dateString: string) => string;
  formatCurrency: (amount: number) => string;
  fadeIn: any;
}

function NotificationsTab({
  supportNotifications,
  loadingSupportNotifications,
  recentActivity,
  loadingRecentActivity,
  activityFilter,
  setActivityFilter,
  getFilteredActivities,
  getActivityTypeCount,
  getActivityTypeLabel,
  getActivityIcon,
  formatDate,
  formatCurrency,
  fadeIn,
}: NotificationsTabProps) {
  return (
    <>
      <Header>
        <Title>
          <FaBell />
          Notifications
        </Title>
        <Subtitle>Support tickets and recent activity</Subtitle>
      </Header>

      <NotificationsSection variants={fadeIn}>
        <SectionTitle>
          <FaBell />
          Support Ticket Notifications
        </SectionTitle>
        {loadingSupportNotifications ? (
          <EmptyState>
            <StatLoadingSpinner size={20} />
          </EmptyState>
        ) : (
          <>
            {supportNotifications.length === 0 ? (
              <EmptyState>
                No new support messages
              </EmptyState>
            ) : (
              supportNotifications.map((notification, index) => (
                <NotificationItem
                  key={notification.id}
                  variants={fadeIn}
                  custom={index}
                  onClick={() => window.location.href = `/admin/support-tickets?ticket=${notification.ticket_id}`}
                >
                  <NotificationIcon>
                    <FaTicketAlt />
                  </NotificationIcon>
                  <NotificationContent>
                    <NotificationHeader>
                      <NotificationTitle>
                        {notification.ticket_number}: {notification.ticket_subject}
                        {notification.message_count > 1 && (
                          <span style={{ 
                            fontSize: '0.85em', 
                            marginLeft: '0.5rem', 
                            color: 'var(--primary)',
                            fontWeight: '600'
                          }}>
                            ({notification.message_count} messages)
                          </span>
                        )}
                      </NotificationTitle>
                      <NotificationLink
                        href={`/admin/support-tickets?ticket=${notification.ticket_id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Ticket
                        <FaExternalLinkAlt />
                      </NotificationLink>
                    </NotificationHeader>
                    <NotificationText>
                      {notification.content}
                    </NotificationText>
                    <NotificationMeta>
                      <span>From: {notification.user_email || "Unknown"}</span>
                      <span>•</span>
                      <span>{formatDate(notification.created_at)}</span>
                      <NotificationBadge $status={notification.ticket_status}>
                        {notification.ticket_status.replace('_', ' ')}
                      </NotificationBadge>
                    </NotificationMeta>
                  </NotificationContent>
                </NotificationItem>
              ))
            )}
          </>
        )}
      </NotificationsSection>

          <RecentActivitySection variants={fadeIn}>
            <ActivityHeader>
              <SectionTitle>Recent Activity</SectionTitle>
              <ActivityFilters>
                <ActivityFilterButton
                  $active={activityFilter === 'all'}
                  onClick={() => setActivityFilter('all')}
                >
                  All ({getActivityTypeCount('all')})
                </ActivityFilterButton>
                <ActivityFilterButton
                  $active={activityFilter === 'subscription'}
                  onClick={() => setActivityFilter('subscription')}
                >
                  <FaMoneyBillWave />
                  Subscriptions ({getActivityTypeCount('subscription')})
                </ActivityFilterButton>
                <ActivityFilterButton
                  $active={activityFilter === 'payment'}
                  onClick={() => setActivityFilter('payment')}
                >
                  <FaChartLine />
                  Payments ({getActivityTypeCount('payment')})
                </ActivityFilterButton>
                <ActivityFilterButton
                  $active={activityFilter === 'user_signup'}
                  onClick={() => setActivityFilter('user_signup')}
                >
                  <FaUsers />
                  Signups ({getActivityTypeCount('user_signup')})
                </ActivityFilterButton>
                <ActivityFilterButton
                  $active={activityFilter === 'cancellation'}
                  onClick={() => setActivityFilter('cancellation')}
                >
                  <FaArrowDown />
                  Cancellations ({getActivityTypeCount('cancellation')})
                </ActivityFilterButton>
              </ActivityFilters>
            </ActivityHeader>
            <ActivityList>
              {loadingRecentActivity ? (
                <EmptyState>
                  <StatLoadingSpinner size={20} />
                </EmptyState>
              ) : (
                <>
                  {getFilteredActivities().map((activity, index) => (
                    <ActivityItem key={activity.id} variants={fadeIn} custom={index}>
                      <ActivityIcon>
                        {getActivityIcon(activity.type)}
                      </ActivityIcon>
                      <ActivityContent>
                        <ActivityDescription>{activity.description}</ActivityDescription>
                        <ActivityTime>{formatDate(activity.timestamp)}</ActivityTime>
                      </ActivityContent>
                      {activity.amount && (
                        <ActivityAmount>
                          {formatCurrency(activity.amount)}
                        </ActivityAmount>
                      )}
                    </ActivityItem>
                  ))}
                  {getFilteredActivities().length === 0 && (
                    <EmptyState>
                      No {getActivityTypeLabel(activityFilter).toLowerCase()} to display
                    </EmptyState>
                  )}
                </>
              )}
            </ActivityList>
          </RecentActivitySection>
    </>
  );
} 