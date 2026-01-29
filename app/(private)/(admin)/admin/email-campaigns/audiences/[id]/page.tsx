"use client";
import React, { useState, useEffect } from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { 
  FaUsers, 
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaArrowLeft,
  FaSave,
  FaTimes,
  FaFilter,
  FaUserPlus,
  FaUserMinus,
  FaEnvelope,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaTag,
  FaChartLine,
  FaEllipsisV,
  FaCheck,
  FaCog,
  FaHistory,
  FaClone,
  FaDownload,
  FaUpload
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled, { keyframes, css, createGlobalStyle } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { getAudience, updateAudience, deleteAudience, getAudienceSubscribers, addAudienceSubscriber, removeAudienceSubscriber, createAudience } from "@/app/actions/email-campaigns";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Global styles for animations
const GlobalStyles = createGlobalStyle`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(108, 99, 255, 0.3);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  ${css`
    animation: ${spin} 1s linear infinite;
  `}
`;


import TableLoadingRow from "@/components/common/TableLoadingRow";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const AudienceContainer = styled.div`
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
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const BackButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 16px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
    color: var(--text);
  }
`;

const AudienceTitle = styled.h1`
  font-size: 2.5rem;
  margin: 0;
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

const AudienceInfo = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 2rem;
  margin-bottom: 2rem;
`;

const AudienceHeader = styled.div`
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

const AudienceDetails = styled.div`
  flex: 1;
`;

const AudienceName = styled.h2`
  color: var(--text);
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
`;

const AudienceDescription = styled.div`
  color: var(--text-secondary);
  font-size: 1rem;
  margin-bottom: 1rem;
  line-height: 1.5;
`;

const AudienceMeta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;

  svg {
    color: var(--primary);
    font-size: 0.8rem;
  }
`;

const TypeBadge = styled.span<{ type: 'dynamic' | 'static' }>`
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    switch (props.type) {
      case 'dynamic':
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        `;
      case 'static':
        return `
          background-color: rgba(108, 99, 255, 0.2);
          color: var(--primary);
        `;
    }
  }}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;

  @media (max-width: 768px) {
    justify-content: space-between;
  }
`;

const HeaderActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-weight: 500;

  ${(props) => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(90deg, var(--primary), var(--accent));
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
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

const ContentSection = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: var(--text);
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const FilterConditions = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const FilterGroup = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.02);
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const FilterTitle = styled.h4`
  color: var(--text);
  margin: 0;
  font-size: 1rem;
`;

const FilterRule = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const EmailInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SubscriberSearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const RemoveButton = styled.button`
  padding: 6px;
  border: none;
  border-radius: 4px;
  background-color: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(220, 53, 69, 0.3);
  }
`;

const AddRuleButton = styled.button`
  padding: 8px 16px;
  border: 1px dashed rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
`;

const SubscribersTable = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
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

const TableRow = styled.tr`
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  color: var(--text);
  font-size: 0.9rem;
  vertical-align: middle;
`;

const SubscriberInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Avatar = styled.div<{ color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
`;

const SubscriberDetails = styled.div``;

const SubscriberName = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const SubscriberEmail = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  
  ${(props) => {
    switch (props.status) {
      case 'active':
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        `;
      case 'unsubscribed':
        return `
          background-color: rgba(220, 53, 69, 0.2);
          color: #dc3545;
        `;
      case 'bounced':
        return `
          background-color: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        `;
      case 'pending':
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
      default:
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
    }
  }}
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
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

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  
  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  h3 {
    margin-bottom: 0.5rem;
    color: var(--text);
  }
`;

const SourceBadge = styled.span<{ source: 'filter' | 'manual' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => {
    switch (props.source) {
      case 'manual':
        return `
          background-color: rgba(108, 99, 255, 0.2);
          color: var(--primary);
        `;
      case 'filter':
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        `;
      default:
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
    }
  }}

  svg {
    font-size: 0.6rem;
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  align-items: center;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
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
          &:hover {
            background-color: rgba(255, 255, 255, 0.2);
            color: var(--text);
          }
        `;
    }
  }}

  svg {
    font-size: 0.7rem;
  }
`;

// Fetch audience data using server function
const fetchAudienceData = async (id: string) => {
  try {
    console.log('Fetching audience data for ID:', id);
    const data = await getAudience(id);
    console.log('Successfully fetched audience data:', data);
    return data.audience;
  } catch (error) {
    console.error('Error fetching audience:', error);
    throw error;
  }
};

// Fetch audience subscribers using server function
const fetchAudienceSubscribers = async (id: string, page: number = 1, limit: number = 10, search: string = '') => {
  try {
    const data = await getAudienceSubscribers(id, { page, limit });
    return data;
  } catch (error) {
    console.error('Error fetching audience subscribers:', error);
    throw error;
  }
};

// Transform database audience data to display format
const transformAudienceData = (dbAudience: any) => {
  // Convert filters object to proper filter rules for the UI
  const filtersArray: Array<{
    id: string;
    field: string;
    operator: string;
    value: string;
    timeframe: string;
  }> = [];
  
  // Determine audience type based on filters
  let audienceType: "dynamic" | "static" = "static"; // Default to static
  
  if (dbAudience.filters && typeof dbAudience.filters === 'object') {
    const filters = dbAudience.filters;
    
    // Check if this is marked as a static audience
    if (filters.audience_type === 'static') {
      audienceType = "static";
    } else if (filters.audience_type === 'dynamic') {
      audienceType = "dynamic";
      
      // Process rules for dynamic audiences
      if (filters.rules && Array.isArray(filters.rules) && filters.rules.length > 0) {
        console.log('Processing rules array:', filters.rules);
        filters.rules.forEach((rule: any, index: number) => {
          console.log(`Processing rule ${index + 1}:`, rule);
      filtersArray.push({
        id: (index + 1).toString(),
            field: rule.field || "status",
            operator: rule.operator || "equals",
            value: String(rule.value || ""),
            timeframe: rule.timeframe || "all_time"
          });
        });
        console.log('Filters array after processing rules:', filtersArray);
      } else {
        // Handle legacy simple format for backward compatibility
        let hasFilters = false;
        
        // Add status filter if present (including 'active' status)
        if (filters.status) {
          hasFilters = true;
          filtersArray.push({
            id: "1",
            field: "status",
            operator: "equals",
            value: String(filters.status),
            timeframe: "all_time"
          });
        }
        
        // Add subscription filter if it's not 'none'
        if (filters.subscription && filters.subscription !== 'none') {
          hasFilters = true;
          filtersArray.push({
            id: "2", 
            field: "subscription",
            operator: "equals",
            value: String(filters.subscription),
            timeframe: "all_time"
          });
        }
        
        // Add other meaningful filters, but skip boolean values and common defaults
        Object.entries(filters).forEach(([key, value], index) => {
          if (key !== 'status' && key !== 'subscription' && key !== 'rules' && key !== 'audience_type' &&
              typeof value !== 'boolean' && 
              value !== 'active' && 
              value !== 'none' &&
              value !== null &&
              value !== undefined) {
            hasFilters = true;
            filtersArray.push({
              id: (index + 10).toString(), // Avoid ID conflicts
        field: key,
        operator: "equals",
        value: Array.isArray(value) ? value.join(', ') : String(value),
        timeframe: "all_time"
      });
          }
        });
      }
    } else {
      // Auto-detect based on presence of meaningful filters
      if (filters.rules && Array.isArray(filters.rules) && filters.rules.length > 0) {
        audienceType = "dynamic";
        filters.rules.forEach((rule: any, index: number) => {
          filtersArray.push({
            id: (index + 1).toString(),
            field: rule.field || "status",
            operator: rule.operator || "equals",
            value: String(rule.value || ""),
            timeframe: rule.timeframe || "all_time"
          });
        });
      }
    }
  }
  
  // If it's a dynamic audience but has no meaningful filters, start with a default one
  if (audienceType === "dynamic" && filtersArray.length === 0) {
    filtersArray.push({
      id: "default",
      field: "status",
      operator: "equals",
      value: "active",
      timeframe: "all_time"
    });
  }

  return {
    id: dbAudience.id,
    name: dbAudience.name,
    description: dbAudience.description || "No description provided",
    type: audienceType,
    subscribers: dbAudience.subscriber_count || 0,
    createdAt: dbAudience.created_at,
    lastUpdated: dbAudience.updated_at,
    filters: filtersArray
  };
};

function AudienceDetailPage() {
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const audienceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [audienceData, setAudienceData] = useState<any>(null);
  const [originalAudienceData, setOriginalAudienceData] = useState<any>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add subscriber modal state
  const [showAddSubscriberModal, setShowAddSubscriberModal] = useState(false);
  const [addSubscriberEmail, setAddSubscriberEmail] = useState('');
  const [isAddingSubscriber, setIsAddingSubscriber] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Remove subscriber modal state
  const [showRemoveSubscriberModal, setShowRemoveSubscriberModal] = useState(false);
  const [subscriberToRemove, setSubscriberToRemove] = useState<any>(null);
  const [isRemovingSubscriber, setIsRemovingSubscriber] = useState(false);

  useEffect(() => {
    // Load audience data when component mounts or audienceId/user changes
    if (audienceId && user) {
      loadAudienceData();
    }
  }, [audienceId, user]);

  // Load subscribers when audience data is available
  useEffect(() => {
    if (audienceData && audienceId && user) {
      console.log('🔥 Loading subscribers because audience data is available');
      loadSubscribers();
    }
  }, [audienceData, audienceId, user]); // Trigger when audience data is loaded

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (audienceData && audienceId && user) {
        loadSubscribers(1); // Reset to first page on search
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Debug pagination changes
  useEffect(() => {
    console.log('📊 Pagination state changed:', pagination);
  }, [pagination]);

  const loadAudienceData = async () => {
    console.log('Loading audience data for ID:', audienceId);
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const data = await fetchAudienceData(audienceId);
      console.log('Fetched audience data:', data);
      
      const transformedData = transformAudienceData(data);
      console.log('Transformed audience data:', transformedData);
      
      setAudienceData(transformedData);
      setOriginalAudienceData(JSON.parse(JSON.stringify(transformedData))); // Deep copy for cancel functionality
      console.log('Audience data loaded successfully');
    } catch (error) {
      console.error('Failed to load audience:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audience';
      setError(errorMessage);
      // Set loading to false even on error to prevent infinite loading
      setAudienceData(null);
    } finally {
      setLoading(false);
      console.log('Loading state set to false');
    }
  };

  const loadSubscribers = async (page?: number) => {
    console.log('🚀 loadSubscribers called with page:', page);
    console.log('🔍 Current user:', user?.id, user?.email);
    console.log('🔍 Current audience data:', audienceData?.type, audienceData?.name);
    
    try {
      setSubscribersLoading(true);
      const currentPage = page || pagination?.page || 1;
      console.log('Fetching subscribers for audience:', audienceId, 'page:', currentPage);
      const data = await fetchAudienceSubscribers(audienceId, currentPage, pagination?.limit || 10, searchTerm);
      console.log('Subscribers API response:', data);
      setSubscribers(data.subscribers || []);
      const newPagination = { 
        page: currentPage,
        limit: data.pagination?.limit || pagination?.limit || 10,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || Math.ceil((data.pagination?.total || 0) / (data.pagination?.limit || pagination?.limit || 10))
      };
      console.log('🔄 Setting pagination:', newPagination);
      setPagination(newPagination);
      console.log('✅ Subscribers loaded successfully:', data.subscribers?.length || 0, 'subscribers');
    } catch (error) {
      console.error('Failed to load subscribers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load subscribers';
      
      console.log('🔍 Error details:', {
        errorMessage,
        userLoggedIn: !!user,
        audienceType: audienceData?.type
      });
      
      // Show user-friendly error message
      if (errorMessage.includes('Authentication required')) {
        console.log('🔄 Redirecting to login due to auth error');
        // Redirect to login if not authenticated
        router.push('/login');
      } else {
        // Show error to user (you could replace this with a toast notification)
        alert(errorMessage);
      }
      
      setSubscribers([]);
      // Ensure pagination state is preserved even on error
      setPagination(prev => prev || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
      });
    } finally {
      setSubscribersLoading(false);
    }
  };

  if (languageLoading || loading || !user) {
    return null;
  }

  if (error) {
    return (
      <>
        <GlobalStyles />
        <AudienceContainer>
          <Header>
            <BackButton href="/admin/email-campaigns/audiences">
              <FaArrowLeft />
              Back to Audiences
            </BackButton>
            <AudienceTitle>
              <FaUsers />
              Error Loading Audience
            </AudienceTitle>
          </Header>
          
          <ContentSection>
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 2rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ 
                fontSize: '3rem', 
                color: 'var(--error-color)', 
                marginBottom: '1rem' 
              }}>
                ⚠️
              </div>
              <h2 style={{ 
                color: 'var(--text)', 
                marginBottom: '1rem' 
              }}>
                Failed to Load Audience
              </h2>
              <p style={{ 
                marginBottom: '2rem',
                maxWidth: '500px',
                margin: '0 auto 2rem auto',
                lineHeight: '1.6'
              }}>
                {error}
              </p>
              <HeaderActionButton 
                variant="primary" 
                onClick={() => {
                  setError(null);
                  loadAudienceData();
                }}
              >
                <FaEdit />
                Try Again
              </HeaderActionButton>
            </div>
          </ContentSection>
        </AudienceContainer>
      </>
    );
  }

  if (!audienceData) {
    return null;
  }

  // No need to filter on frontend since the API handles filtering
  // Just use the subscribers directly from the API
  const filteredSubscribers = subscribers;
  
  // Debug pagination state
  console.log('🔍 Current pagination state:', pagination);

  const getAvatarColor = (name: string) => {
    const colors = ['#6c63ff', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const updateSubscriberCount = async (filters: any) => {
    try {
      // First save the filters to the audience, then get the count
      await updateAudience(audienceId, { filters });
      
      // Now get subscriber count based on the updated filters
      const response = await getAudienceSubscribers(audienceId, { page: 1, limit: 1 });
      
      if (response) {
        return response.pagination?.total || 0;
      }
    } catch (error) {
      console.error('Failed to get subscriber count:', error);
    }
    return 0;
  };

  const handleSave = async () => {
    try {
      // Convert UI filter rules back to database format
      // Store filters as a structured array to support multiple rules per field
      const databaseFilters: any = {
        audience_type: audienceData.type, // Store the audience type
        rules: []
      };
      
      // Only process filters for dynamic audiences
      if (audienceData.type === 'dynamic') {
        audienceData.filters.forEach((filter: any) => {
          // Only save meaningful filters with values
          if (filter.value && filter.value.trim() !== '') {
            // Validate filter values to prevent database errors
            let validValue = filter.value.trim();
            
            // Validate status values
            if (filter.field === 'status') {
              const validStatuses = ['active', 'inactive', 'pending', 'unsubscribed', 'bounced'];
              if (!validStatuses.includes(validValue)) {
                validValue = 'active'; // Default to active for invalid status
              }
            }
            
            // Validate subscription values  
            if (filter.field === 'subscription') {
              const validSubscriptions = ['none', 'monthly', 'annual', 'lifetime'];
              if (!validSubscriptions.includes(validValue)) {
                validValue = 'none'; // Default to none for invalid subscription
              }
            }
            
            databaseFilters.rules.push({
              field: filter.field,
              operator: filter.operator,
              value: validValue,
              timeframe: filter.timeframe || 'all_time'
            });
          }
        });

        // If no rules for dynamic audience, fall back to simple format for backward compatibility
        if (databaseFilters.rules.length === 0) {
          databaseFilters.status = 'active';
        }
      }

      // Calculate new subscriber count for dynamic audiences
      let subscriberCount = audienceData.subscribers;
      if (audienceData.type === 'dynamic') {
        subscriberCount = await updateSubscriberCount(databaseFilters);
      }

      const updateData = {
        name: audienceData.name,
        description: audienceData.description,
        filters: databaseFilters,
        subscriber_count: subscriberCount
      };

      await updateAudience(audienceId, updateData);

      // Reload audience data to reflect changes and update original data
      await loadAudienceData();
      // Reload subscribers to reflect filter changes
      await loadSubscribers();
    setEditMode(false);
      
      console.log('Audience saved successfully');
    } catch (error) {
      console.error('Failed to save audience:', error);
      alert('Failed to save audience. Please try again.');
    }
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAudience = async () => {
    setIsDeleting(true);
    try {
      await deleteAudience(audienceId);

      console.log('Audience deleted successfully');
      router.push('/admin/email-campaigns/audiences');
    } catch (error) {
      console.error('Failed to delete audience:', error);
      // Keep modal open to show error state
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteAudience = () => {
    setShowDeleteModal(false);
    setIsDeleting(false);
  };

  const handleDuplicate = async () => {
    try {
      const { audience: newAudience } = await createAudience({
        name: `${audienceData.name} (Copy)`,
        description: audienceData.description,
        filters: audienceData.originalFilters || audienceData.filters
      });

      console.log('Audience duplicated successfully');
      // Navigate to the new audience
      router.push(`/admin/email-campaigns/audiences/${newAudience.id}`);
    } catch (error) {
      console.error('Error duplicating audience:', error);
    }
  };

  const handleExport = async () => {
    try {
      // Create CSV content with audience details and subscribers
      const csvRows = [
        ['Email', 'First Name', 'Last Name', 'Subscription', 'Status', 'Created Date', 'Last Updated'],
      ];

      // Add subscriber data
      subscribers.forEach(subscriber => {
        csvRows.push([
          subscriber.email || '',
          subscriber.first_name || '',
          subscriber.last_name || '',
          subscriber.subscription || 'none',
          subscriber.status || 'active',
          subscriber.created_at ? new Date(subscriber.created_at).toLocaleDateString() : '',
          subscriber.updated_at ? new Date(subscriber.updated_at).toLocaleDateString() : ''
        ]);
      });

      const csvContent = csvRows.map(row => 
        row.map(field => `"${field}"`).join(',')
      ).join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audience-${audienceData.name.toLowerCase().replace(/\s+/g, '-')}-subscribers.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Audience exported successfully');
    } catch (error) {
      console.error('Error exporting audience:', error);
    }
  };

  const addFilterRule = () => {
    const newRule = {
      id: Date.now().toString(),
      field: "status",
      operator: "equals", 
      value: "active",
      timeframe: "all_time"
    };
    
    setAudienceData((prev: any) => ({
      ...prev,
      filters: [...prev.filters, newRule]
    }));
  };

  const removeFilterRule = (ruleId: string) => {
    setAudienceData((prev: any) => ({
      ...prev,
      filters: prev.filters.filter((filter: any) => filter.id !== ruleId)
    }));
  };

  const updateFilterRule = (ruleId: string, field: string, value: string) => {
    setAudienceData((prev: any) => ({
      ...prev,
      filters: prev.filters.map((filter: any) =>
        filter.id === ruleId ? { ...filter, [field]: value } : filter
      )
    }));
  };

  const handleRemoveSubscriber = (subscriber: any) => {
    setSubscriberToRemove(subscriber);
    setShowRemoveSubscriberModal(true);
  };

  const handleAddSubscriber = async () => {
    if (!addSubscriberEmail.trim()) {
      alert('Please enter a valid email address');
      return;
    }

    setIsAddingSubscriber(true);
    try {
      console.log('Adding subscriber with email:', addSubscriberEmail.trim());
      console.log('Audience ID:', audienceId);
      
      await addAudienceSubscriber(audienceId, { email: addSubscriberEmail.trim() });
      console.log('Subscriber added successfully');
      
      setAddSubscriberEmail('');
      setShowAddSubscriberModal(false);
      setSearchResults([]);
      setShowSearchResults(false);
      
      // Reload subscribers to show the new addition
      await loadSubscribers();
      
    } catch (error) {
      console.error('Failed to add subscriber:', error);
      alert(`Failed to add subscriber: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingSubscriber(false);
    }
  };

  const searchSubscribers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/email-campaigns/subscribers?search=${encodeURIComponent(query)}&limit=10`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.subscribers || []);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubscriberInputChange = (value: string) => {
    setAddSubscriberEmail(value);
    
    // Debounce search
    clearTimeout((window as any).searchTimeout);
    (window as any).searchTimeout = setTimeout(() => {
      searchSubscribers(value);
    }, 300);
  };

  const selectSubscriber = (subscriber: any) => {
    setAddSubscriberEmail(subscriber.email);
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const resetAddSubscriberModal = () => {
    setShowAddSubscriberModal(false);
    setAddSubscriberEmail('');
    setSearchResults([]);
    setShowSearchResults(false);
    setIsAddingSubscriber(false);
  };

  const confirmRemoveSubscriber = async () => {
    if (!subscriberToRemove) return;

    setIsRemovingSubscriber(true);
    try {
      console.log('Removing subscriber:', subscriberToRemove.id, 'from audience:', audienceId);
      
      await removeAudienceSubscriber(audienceId, subscriberToRemove.id);

      console.log('✅ Subscriber removed successfully');
      
      // Close modal and reset state
      setShowRemoveSubscriberModal(false);
      setSubscriberToRemove(null);
      
      // Reload subscribers to reflect the removal
      await loadSubscribers();
      
    } catch (error) {
      console.error('Failed to remove subscriber:', error);
      // Don't use alert, just log the error for now
      console.error('Remove subscriber error:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRemovingSubscriber(false);
    }
  };

  const cancelRemoveSubscriber = () => {
    setShowRemoveSubscriberModal(false);
    setSubscriberToRemove(null);
    setIsRemovingSubscriber(false);
  };

  return (
    <>
      <GlobalStyles />
      <NextSEO
        title={`Audience: ${audienceData.name}`}
        description={`Manage ${audienceData.name} audience and subscribers`}
      />
      
      <AudienceContainer>
        <Header>
          <BackButton href="/admin/email-campaigns/audiences">
            <FaArrowLeft />
            Back to Audiences
          </BackButton>
          <AudienceTitle>
            <FaUsers />
            Audience Details
          </AudienceTitle>
        </Header>

        <AudienceInfo>
          <AudienceHeader>
            <AudienceDetails>
              {editMode ? (
                <>
                  <Input
                    type="text"
                    value={audienceData.name}
                    onChange={(e) => setAudienceData((prev: any) => ({ ...prev, name: e.target.value }))}
                    style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}
                    placeholder="Audience name"
                  />
                  <textarea
                    value={audienceData.description}
                    onChange={(e) => setAudienceData((prev: any) => ({ ...prev, description: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      minHeight: '60px',
                      background: 'transparent',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '1rem',
                      marginBottom: '0.5rem'
                    }}
                    placeholder="Audience description"
                  />
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Audience Type:
                    </label>
                    <Select
                      value={audienceData.type}
                      onChange={(e) => setAudienceData((prev: any) => ({ ...prev, type: e.target.value }))}
                      style={{ width: '200px' }}
                    >
                      <option value="dynamic">🔄 Dynamic (Filter-based)</option>
                      <option value="static">📌 Static (Manual list)</option>
                    </Select>
                  </div>
                </>
              ) : (
                <>
              <AudienceName>{audienceData.name}</AudienceName>
              <AudienceDescription>{audienceData.description}</AudienceDescription>
                </>
              )}
              <AudienceMeta>
                <MetaItem>
                  <TypeBadge type={audienceData.type}>
                    {audienceData.type === 'dynamic' ? '🔄 Dynamic' : '📌 Static'}
                  </TypeBadge>
                </MetaItem>
                <MetaItem>
                  <FaUsers />
                  {subscribersLoading ? 'Loading...' : (pagination.total > 0 ? pagination.total.toLocaleString() : (audienceData.subscribers || 0).toLocaleString())} subscribers
                </MetaItem>
                <MetaItem>
                  <FaCalendarAlt />
                  Created {new Date(audienceData.createdAt).toLocaleDateString()}
                </MetaItem>
                <MetaItem>
                  <FaHistory />
                  Updated {new Date(audienceData.lastUpdated).toLocaleDateString()}
                </MetaItem>
              </AudienceMeta>
            </AudienceDetails>
            <ActionButtons>
              {editMode ? (
                <>
                  <HeaderActionButton onClick={() => {
                    // Revert to original data on cancel
                    setAudienceData(JSON.parse(JSON.stringify(originalAudienceData)));
                    setEditMode(false);
                  }}>
                    <FaTimes />
                    Cancel
                  </HeaderActionButton>
                  <HeaderActionButton variant="primary" onClick={handleSave}>
                    <FaSave />
                    Save Changes
                  </HeaderActionButton>
                </>
              ) : (
                <>
                  <HeaderActionButton onClick={() => setEditMode(true)}>
                    <FaEdit />
                    Edit
                  </HeaderActionButton>
                  <HeaderActionButton onClick={handleDuplicate}>
                    <FaClone />
                    Duplicate
                  </HeaderActionButton>
                  <HeaderActionButton onClick={handleExport}>
                    <FaDownload />
                    Export
                  </HeaderActionButton>
                  <HeaderActionButton variant="danger" onClick={handleDelete}>
                    <FaTrash />
                    Delete
                  </HeaderActionButton>
                </>
              )}
            </ActionButtons>
          </AudienceHeader>
        </AudienceInfo>

        {audienceData.type === 'dynamic' ? (
          <>
            <ContentSection>
              <SectionTitle>
                <FaFilter />
                Filter Conditions
                <span style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--text-secondary)', 
                  fontWeight: 'normal',
                  marginLeft: '0.5rem'
                }}>
                  - Automatically includes subscribers matching these criteria
                </span>
              </SectionTitle>
              <FilterConditions>
                <FilterGroup>
                  <FilterHeader>
                    <FilterTitle>Conditions (Match ALL)</FilterTitle>
                    {editMode && (
                      <AddRuleButton onClick={addFilterRule}>
                        <FaPlus />
                        Add Rule
                      </AddRuleButton>
                    )}
                  </FilterHeader>
                  
                  {audienceData.filters.map((filter: any) => (
                    <FilterRule key={filter.id}>
                      <Select
                        value={filter.field}
                        onChange={(e) => updateFilterRule(filter.id, 'field', e.target.value)}
                        disabled={!editMode}
                      >
                        <option value="status">Status</option>
                        <option value="subscription">Subscription</option>
                        <option value="tags">Tags</option>
                        <option value="interests">Interests</option>
                        <option value="email_opens">Email Opens</option>
                        <option value="email_clicks">Email Clicks</option>
                        <option value="last_activity">Last Activity</option>
                        <option value="subscription_date">Subscription Date</option>
                        <option value="engagement_score">Engagement Score</option>
                        <option value="signup_date">Signup Date</option>
                        <option value="trial_status">Trial Status</option>
                        <option value="device_type">Device Type</option>
                        <option value="last_email_open">Last Email Open</option>
                        <option value="last_login">Last Login</option>
                      </Select>
                      
                      <Select
                        value={filter.operator}
                        onChange={(e) => updateFilterRule(filter.id, 'operator', e.target.value)}
                        disabled={!editMode}
                      >
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                      </Select>
                      
                      {filter.field === 'status' ? (
                        <Select
                          value={filter.value}
                          onChange={(e) => updateFilterRule(filter.id, 'value', e.target.value)}
                          disabled={!editMode}
                        >
                          <option value="">Select status...</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                          <option value="unsubscribed">Unsubscribed</option>
                          <option value="bounced">Bounced</option>
                        </Select>
                      ) : filter.field === 'subscription' ? (
                        <Select
                          value={filter.value}
                          onChange={(e) => updateFilterRule(filter.id, 'value', e.target.value)}
                          disabled={!editMode}
                        >
                          <option value="">Select subscription...</option>
                          <option value="none">None (Free)</option>
                          <option value="monthly">Monthly</option>
                          <option value="annual">Annual</option>
                          <option value="lifetime">Lifetime</option>
                        </Select>
                      ) : (
                      <Input
                        type="text"
                        value={filter.value}
                        onChange={(e) => updateFilterRule(filter.id, 'value', e.target.value)}
                        disabled={!editMode}
                        placeholder="Value"
                      />
                      )}
                      
                      {editMode && (
                        <RemoveButton onClick={() => removeFilterRule(filter.id)}>
                          <FaTimes />
                        </RemoveButton>
                      )}
                    </FilterRule>
                  ))}
                  
                  {audienceData.filters.length === 0 && (
                    <EmptyState>
                      <FaFilter />
                      <h3>No filter conditions</h3>
                      <p>Add filter conditions to define this dynamic audience.</p>
                    </EmptyState>
                  )}
                </FilterGroup>
              </FilterConditions>
            </ContentSection>

            <ContentSection>
              <SectionTitle>
                <FaUsers />
                Subscribers ({pagination.total > 0 ? pagination.total.toLocaleString() : (subscribersLoading ? 'Loading...' : '0')})
              </SectionTitle>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <SearchContainer style={{ marginBottom: 0 }}>
                  <SearchIcon>
                    <FaSearch />
                  </SearchIcon>
                  <SearchInput
                    type="text"
                    placeholder="Search subscribers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </SearchContainer>
                
                {audienceData.type === 'static' && (
                <HeaderActionButton 
                  variant="primary" 
                    onClick={() => setShowAddSubscriberModal(true)}
                  style={{ marginLeft: '1rem' }}
                >
                  <FaUserPlus />
                  Add Subscriber
                </HeaderActionButton>
                )}
              </div>

              <SubscribersTable>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHeaderCell>Subscriber</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Subscribe Date</TableHeaderCell>
                      <TableHeaderCell>Last Activity</TableHeaderCell>
                      <TableHeaderCell>Engagement</TableHeaderCell>
                      <TableHeaderCell>Source</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {subscribersLoading ? (
                      <TableLoadingRow colSpan={7} message="Loading subscribers..." />
                    ) : filteredSubscribers.length === 0 ? (
                      <tr>
                        <TableCell colSpan={7}>
                          <EmptyState>
                            <FaUsers />
                            <h3>No subscribers found</h3>
                          <p>
                            {pagination.total > 0 
                              ? `This audience should contain ${pagination.total} subscribers, but there may be an authentication issue preventing the list from loading. Try refreshing the page.`
                              : 'Try adjusting your search criteria or filter conditions.'
                            }
                          </p>
                          </EmptyState>
                        </TableCell>
                      </tr>
                    ) : (
                      filteredSubscribers.map((subscriber) => (
                        <TableRow key={subscriber.id}>
                          <TableCell>
                            <SubscriberInfo>
                              <Avatar color={getAvatarColor(subscriber.name)}>
                                {subscriber.name.split(' ').map((n: string) => n[0]).join('')}
                              </Avatar>
                              <SubscriberDetails>
                                <SubscriberName>{subscriber.name}</SubscriberName>
                                <SubscriberEmail>{subscriber.email}</SubscriberEmail>
                              </SubscriberDetails>
                            </SubscriberInfo>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={subscriber.status}>{subscriber.status}</StatusBadge>
                          </TableCell>
                          <TableCell>
                            {new Date(subscriber.subscribeDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(subscriber.lastActivity).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span style={{ 
                              color: subscriber.engagement === 'High' ? '#28a745' : 
                                     subscriber.engagement === 'Medium' ? '#ffc107' : '#dc3545',
                              fontWeight: '600'
                            }}>
                              {subscriber.engagement}
                            </span>
                          </TableCell>
                          <TableCell>
                            <SourceBadge source={subscriber.source || 'filter'}>
                              {subscriber.source === 'manual' ? (
                                <>
                                  <FaUserPlus />
                                  Manual
                                </>
                              ) : (
                                <>
                                  <FaFilter />
                                  Filter
                                </>
                              )}
                            </SourceBadge>
                          </TableCell>
                          <TableCell>
                            <ActionsContainer>
                              <ActionButton 
                                variant="danger" 
                                onClick={() => handleRemoveSubscriber(subscriber)}
                                title="Remove from audience"
                              >
                                <FaTimes />
                              </ActionButton>
                            </ActionsContainer>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </SubscribersTable>
              
              {/* Pagination Controls */}
              {pagination && pagination.total > 0 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: '2rem',
                  padding: '1rem',
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Showing {((pagination?.page || 1) - 1) * (pagination?.limit || 10) + 1} to {Math.min((pagination?.page || 1) * (pagination?.limit || 10), pagination?.total || 0)} of {pagination?.total || 0} subscribers
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        if ((pagination?.page || 1) > 1) {
                          const newPage = (pagination?.page || 1) - 1;
                          loadSubscribers(newPage);
                        }
                      }}
                      disabled={(pagination?.page || 1) <= 1 || subscribersLoading}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        backgroundColor: (pagination?.page || 1) <= 1 ? 'rgba(255, 255, 255, 0.05)' : 'var(--primary)',
                        color: (pagination?.page || 1) <= 1 ? 'var(--text-secondary)' : 'white',
                        cursor: (pagination?.page || 1) <= 1 || subscribersLoading ? 'not-allowed' : 'pointer',
                        opacity: subscribersLoading ? 0.5 : 1
                      }}
                    >
                      Previous
                    </button>
                    
                    <span style={{ 
                      color: 'var(--text)', 
                      fontSize: '0.9rem',
                      margin: '0 1rem'
                    }}>
                      Page {pagination?.page || 1} of {pagination?.totalPages || 1}
                    </span>
                    
                    <button
                      onClick={() => {
                        if ((pagination?.page || 1) < (pagination?.totalPages || 1)) {
                          const newPage = (pagination?.page || 1) + 1;
                          loadSubscribers(newPage);
                        }
                      }}
                      disabled={(pagination?.page || 1) >= (pagination?.totalPages || 1) || subscribersLoading}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        backgroundColor: (pagination?.page || 1) >= (pagination?.totalPages || 1) ? 'rgba(255, 255, 255, 0.05)' : 'var(--primary)',
                        color: (pagination?.page || 1) >= (pagination?.totalPages || 1) ? 'var(--text-secondary)' : 'white',
                        cursor: (pagination?.page || 1) >= (pagination?.totalPages || 1) || subscribersLoading ? 'not-allowed' : 'pointer',
                        opacity: subscribersLoading ? 0.5 : 1
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </ContentSection>
          </>
        ) : (
          <ContentSection>
            <SectionTitle>
              <FaUsers />
              Static Audience Management
            </SectionTitle>
            
            <div style={{ 
              background: 'rgba(108, 99, 255, 0.1)',
              border: '1px solid rgba(108, 99, 255, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>Static Audience Features:</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                <li>Add/remove specific subscribers</li>
                <li>Import subscriber lists from CSV files</li>
                <li>Full control over audience membership</li>
                <li>No automatic updates based on criteria</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <HeaderActionButton onClick={() => setShowAddSubscriberModal(true)}>
                <FaUserPlus />
                Add Subscriber
              </HeaderActionButton>
              <HeaderActionButton onClick={() => console.log('Import CSV')}>
                <FaUpload />
                Import CSV
              </HeaderActionButton>
              <HeaderActionButton onClick={() => console.log('Export list')}>
                <FaDownload />
                Export List
              </HeaderActionButton>
            </div>
            
            <SectionTitle>
              <FaUsers />
              Subscribers ({filteredSubscribers.length})
            </SectionTitle>
            
            <SearchContainer>
              <SearchIcon>
                <FaSearch />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Search subscribers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>

            <SubscribersTable>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell>Subscriber</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Subscribe Date</TableHeaderCell>
                    <TableHeaderCell>Last Activity</TableHeaderCell>
                    <TableHeaderCell>Engagement</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <TableCell colSpan={6}>
                        <EmptyState>
                          <FaUsers />
                          <h3>No subscribers found</h3>
                          <p>Try adjusting your search criteria.</p>
                        </EmptyState>
                      </TableCell>
                    </tr>
                  ) : (
                    filteredSubscribers.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell>
                          <SubscriberInfo>
                            <Avatar color={getAvatarColor(subscriber.name)}>
                              {subscriber.name.split(' ').map((n: string) => n[0]).join('')}
                            </Avatar>
                            <SubscriberDetails>
                              <SubscriberName>{subscriber.name}</SubscriberName>
                              <SubscriberEmail>{subscriber.email}</SubscriberEmail>
                            </SubscriberDetails>
                          </SubscriberInfo>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={subscriber.status}>{subscriber.status}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          {new Date(subscriber.subscribeDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(subscriber.lastActivity).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span style={{ 
                            color: subscriber.engagement === 'High' ? '#28a745' : 
                                   subscriber.engagement === 'Medium' ? '#ffc107' : '#dc3545',
                            fontWeight: '600'
                          }}>
                            {subscriber.engagement}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ActionsContainer>
                            <ActionButton 
                              variant="danger" 
                              onClick={() => handleRemoveSubscriber(subscriber)}
                              title="Remove from audience"
                            >
                              <FaTimes />
                            </ActionButton>
                          </ActionsContainer>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </SubscribersTable>
          </ContentSection>
        )}
      </AudienceContainer>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelDeleteAudience}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '1.5rem',
                color: 'var(--error-color)'
              }}>
                <FaTrash />
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Delete Audience</h2>
              </div>
              
              <div style={{ 
                padding: '1.5rem 0', 
                textAlign: 'center',
                lineHeight: '1.6'
              }}>
                <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                  Are you sure you want to delete the audience
                </p>
                <p style={{ 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem',
                  color: 'var(--primary)',
                  marginBottom: '1rem'
                }}>
                  "{audienceData?.name}"
                </p>
                <p style={{ 
                  color: 'var(--error-color)', 
                  fontSize: '0.95rem',
                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(220, 53, 69, 0.3)'
                }}>
                  ⚠️ This action cannot be undone. All data associated with this audience will be permanently deleted.
                </p>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'flex-end' 
              }}>
                <HeaderActionButton 
                  onClick={cancelDeleteAudience}
                  disabled={isDeleting}
                >
                  Cancel
                </HeaderActionButton>
                <HeaderActionButton 
                  variant="danger" 
                  onClick={confirmDeleteAudience}
                  disabled={isDeleting}
                  style={{
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545'
                  }}
                >
                  {isDeleting ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '0.5rem'
                      }} />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Delete Audience
                    </>
                  )}
                </HeaderActionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Subscriber Modal */}
      {showAddSubscriberModal && audienceData.type === 'static' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '2rem 2rem 0 2rem'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '1.5rem',
                color: 'var(--primary)'
              }}>
                <FaUserPlus />
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Add Subscriber</h2>
              </div>
            </div>
            
                        <div style={{
              padding: '0 2rem',
              flex: 1,
              overflow: 'visible'
            }}>
              <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <label 
                  htmlFor="subscriber-search-input"
                  style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}
                >
                  Search Subscribers:
                </label>
                <SubscriberSearchInput
                  type="text"
                  value={addSubscriberEmail}
                  onChange={(e) => handleSubscriberInputChange(e.target.value)}
                  placeholder="Type email to search existing subscribers..."
                  id="subscriber-search-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchResults.length > 0) {
                        selectSubscriber(searchResults[0]);
                      }
                    }
                  }}
                />
              
              {/* Autocomplete dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1050,
                  marginTop: '4px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(10px)'
                }}>
                {searchResults.map((subscriber, index) => (
                  <div
                    key={subscriber.id || index}
                    onClick={() => selectSubscriber(subscriber)}
                    style={{
                      padding: '12px',
                      borderBottom: index < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = 'rgba(108, 99, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: getAvatarColor(subscriber.name || subscriber.email),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      {subscriber.name ? 
                        subscriber.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 
                        subscriber.email.charAt(0).toUpperCase()
                      }
                    </div>
                    <div>
                      <div style={{ color: 'var(--text)', fontWeight: '500' }}>
                        {subscriber.name || 'Unknown User'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {subscriber.email}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
              </div>
            </div>
            
            <div style={{
              padding: '0 2rem 2rem 2rem'
            }}>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <HeaderActionButton 
                  onClick={resetAddSubscriberModal}
                  disabled={isAddingSubscriber}
                >
                  Cancel
                </HeaderActionButton>
                <HeaderActionButton 
                  variant="primary" 
                  onClick={handleAddSubscriber}
                  disabled={isAddingSubscriber}
                >
                  {isAddingSubscriber ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '0.5rem'
                      }} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <FaUserPlus />
                      Add Subscriber
                    </>
                  )}
                </HeaderActionButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Remove Subscriber Modal */}
      <AnimatePresence>
        {showRemoveSubscriberModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelRemoveSubscriber}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '1.5rem',
                color: 'var(--error-color)'
              }}>
                <FaTrash />
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Remove Subscriber</h2>
              </div>
              
              <div style={{ 
                padding: '1.5rem 0', 
                textAlign: 'center',
                lineHeight: '1.6'
              }}>
                <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                  Are you sure you want to remove the subscriber
                </p>
                <p style={{ 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem',
                  color: 'var(--primary)',
                  marginBottom: '1rem'
                }}>
                  "{subscriberToRemove?.name}"
                </p>
                <p style={{ 
                  color: 'var(--error-color)', 
                  fontSize: '0.95rem',
                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(220, 53, 69, 0.3)'
                }}>
                  ⚠️ This action cannot be undone. The subscriber will be permanently removed from the audience.
                </p>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'flex-end' 
              }}>
                <HeaderActionButton 
                  onClick={cancelRemoveSubscriber}
                  disabled={isRemovingSubscriber}
                >
                  Cancel
                </HeaderActionButton>
                <HeaderActionButton 
                  variant="danger" 
                  onClick={confirmRemoveSubscriber}
                  disabled={isRemovingSubscriber}
                  style={{
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545'
                  }}
                >
                  {isRemovingSubscriber ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '0.5rem'
                      }} />
                      Removing...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Remove Subscriber
                    </>
                  )}
                </HeaderActionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AudienceDetailPage; 