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
  FaDownload,
  FaUpload,
  FaFilter,
  FaTag,
  FaChartLine,
  FaFileExport,
  FaFileImport,
  FaUserPlus,
  FaUserMinus,
  FaEnvelope,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCog,
  FaSync,
  FaShare,
  FaClone,
  FaPalette,
  FaDatabase,
  FaEllipsisV,
  FaTimes,
  FaSave,
  FaCheck
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled, { css, createGlobalStyle } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

import TableLoadingRow from "@/components/common/TableLoadingRow";
import { useRouter } from "next/navigation";
import { getAudiences, createAudience, deleteAudience, getAudienceSubscribers } from "@/app/actions/email-campaigns";

// Global styles for animations
const GlobalStyles = createGlobalStyle`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const AudiencesContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const AudiencesTitle = styled.h1`
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

const AudiencesSubtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const ActionsRow = styled.div`
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

const LeftActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;

  @media (max-width: 768px) {
    max-width: none;
  }
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

const FilterSelect = styled.select`
  padding: 12px 16px;
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

const RightActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  @media (max-width: 768px) {
    justify-content: space-between;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
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

const AudiencesTable = styled.div`
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
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const TableBody = styled.tbody``;

const TableRow = styled(motion.tr)`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem 1.5rem;
  color: var(--text);
  font-size: 0.9rem;
  vertical-align: middle;
`;

const AudienceName = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const AudienceDescription = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.3;
`;

const StatusBadge = styled.span<{ type: 'dynamic' | 'static' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
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

const TagsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
`;

const Tag = styled.span<{ type?: 'status' | 'segment' | 'behavior' }>`
  padding: 0.125rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;

  ${props => {
    switch (props.type) {
      case 'status':
        return `
          background-color: rgba(40, 167, 69, 0.15);
          color: #28a745;
        `;
      case 'segment':
        return `
          background-color: rgba(108, 99, 255, 0.15);
          color: var(--primary);
        `;
      case 'behavior':
        return `
          background-color: rgba(255, 193, 7, 0.15);
          color: #ffc107;
        `;
      default:
        return `
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
        `;
    }
  }}
`;

const ActionsCell = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
  position: relative;
`;

const MoreButton = styled.button`
  padding: 8px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;

  &:hover {
    background-color: var(--primary);
    color: white;
  }

  &.active {
    background-color: var(--primary);
    color: white;
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 180px;
  overflow: hidden;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--primary);
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  svg {
    font-size: 0.9rem;
    width: 16px;
  }
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

const CreateAudienceModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    color: var(--primary);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  color: var(--text);
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
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

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.3s ease;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
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

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

// Define the database audience interface
interface DatabaseAudience {
  id: string;
  name: string;
  description: string | null;
  filters: any;
  subscriber_count: number | null;
  created_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
}


// Convert database audience to display format
const convertToDisplayAudience = (dbAudience: DatabaseAudience, realTimeCount?: number) => {
  // Determine audience type from filters
  const filters = dbAudience.filters || {};
  const audienceType = filters.audience_type === 'static' ? 'static' : 'dynamic';
  
  // Use real-time count if provided, otherwise fall back to cached count
  const subscriberCount = realTimeCount !== undefined ? realTimeCount : (dbAudience.subscriber_count || 0);
  
  return {
  id: dbAudience.id,
  name: dbAudience.name,
  description: dbAudience.description || "No description provided",
    subscribers: subscriberCount,
  growthRate: "+0%", // This would need to be calculated from historical data
  engagementRate: "N/A", // This would need to be calculated from email metrics
  lastActive: dbAudience.updated_at ? new Date(dbAudience.updated_at).toISOString().split('T')[0] : "Unknown",
    tags: [
      { text: audienceType === 'static' ? "Static" : "Dynamic", type: "status" as const }
    ],
    criteria: audienceType === 'static' 
      ? "Subscriber management" 
      : `Custom filters: ${Object.keys(dbAudience.filters || {}).length} rules`,
    type: audienceType as 'static' | 'dynamic',
    originalFilters: dbAudience.filters // Store original filters for cloning
  };
};

function AudiencesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [audienceToDelete, setAudienceToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newAudience, setNewAudience] = useState({
    name: "",
    description: "",
    type: "dynamic" as "dynamic" | "static"
  });
  const [audiences, setAudiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!user || languageLoading) return;

    const loadAudiences = async () => {
      setLoading(true);
      try {
        console.log('🔄 Loading audiences...');
        const data = await getAudiences({
          mode: 'light',
          refreshCounts: true,
        });
        const dbAudiences = data.audiences || [];
        console.log('📊 Received audiences from API:', dbAudiences);
        
        // Get real-time subscriber counts for all audiences
        console.log('🔄 Fetching real-time subscriber counts...');
        const displayAudiences = await Promise.all(
          dbAudiences.map(async (dbAudience) => {
            try {
              // Get real-time count using server function
              const data = await getAudienceSubscribers(dbAudience.id, { page: 1, limit: 1 });
              const realTimeCount = data.pagination?.total || data.subscribers?.length || 0;
              console.log(`📊 ${dbAudience.name}: ${realTimeCount} subscribers (was ${dbAudience.subscriber_count})`);
              return convertToDisplayAudience(dbAudience, realTimeCount);
            } catch (error) {
              console.warn(`Error getting real-time count for ${dbAudience.name}:`, error);
              return convertToDisplayAudience(dbAudience);
            }
          })
        );
        
        console.log('🎯 Converted to display format with real-time counts:', displayAudiences);
        setAudiences(displayAudiences);
      } catch (error) {
        console.error('Failed to load audiences:', error);
        setAudiences([]);
      } finally {
        setLoading(false);
      }
    };

    loadAudiences();
  }, [user, languageLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('[data-dropdown]')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Show page immediately - no early returns
  const showContent = !languageLoading && user;

  const filteredAudiences = audiences.filter((audience: any) => {
    const matchesSearch = audience.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audience.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === "all" || audience.type === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
    }),
  };

  const handleAudienceAction = (action: string, audienceId: string) => {
    console.log(`${action} audience:`, audienceId);
    setOpenDropdown(null);
    switch (action) {
      case 'edit':
        router.push(`/admin/email-campaigns/audiences/${audienceId}`);
        break;
      case 'export':
        handleExportAudience(audienceId);
        break;
      case 'delete':
        handleDeleteAudience(audienceId);
        break;
      case 'clone':
        handleCloneAudience(audienceId);
        break;
      case 'email':
        router.push(`/admin/email-campaigns/campaigns/create?audience=${audienceId}`);
        break;
    }
  };

  const handleExportAudience = async (audienceId: string) => {
    try {
      // Find the audience data
      const audience = audiences.find(a => a.id === audienceId);
      if (!audience) return;

      // Create CSV content
      const csvContent = [
        ['Audience Name', 'Description', 'Subscribers', 'Type', 'Last Updated'],
        [
          audience.name,
          audience.description,
          audience.subscribers.toString(),
          audience.type,
          audience.lastActive
        ]
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audience-${audience.name.toLowerCase().replace(/\s+/g, '-')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Audience exported successfully');
    } catch (error) {
      console.error('Error exporting audience:', error);
    }
  };

  const handleDeleteAudience = (audienceId: string) => {
    const audience = audiences.find(a => a.id === audienceId);
    if (!audience) return;

    setAudienceToDelete(audience);
    setShowDeleteModal(true);
  };

  const confirmDeleteAudience = async () => {
    if (!audienceToDelete) return;

    setIsDeleting(true);
    try {
      await deleteAudience(audienceToDelete.id);
      // Remove from local state
      setAudiences(prev => prev.filter(a => a.id !== audienceToDelete.id));
      console.log('Audience deleted successfully');
      setShowDeleteModal(false);
      setAudienceToDelete(null);
    } catch (error) {
      console.error('Error deleting audience:', error);
      // Keep modal open to show error state
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteAudience = () => {
    setShowDeleteModal(false);
    setAudienceToDelete(null);
    setIsDeleting(false);
  };

  const handleCloneAudience = async (audienceId: string) => {
    try {
      const audience = audiences.find(a => a.id === audienceId);
      if (!audience) return;

      const { audience: newAudience } = await createAudience({
        name: `${audience.name} (Copy)`,
        description: audience.description,
        filters: audience.originalFilters // Use original filters for cloning
      });

      // Reload audiences to include the new one
      const data = await getAudiences({ mode: 'light', refreshCounts: true });
      const dbAudiences = data.audiences || [];
      const displayAudiences = await Promise.all(
        dbAudiences.map(async (dbAudience) => {
          try {
            const data = await getAudienceSubscribers(dbAudience.id, { page: 1, limit: 1 });
            const realTimeCount = data.pagination?.total || data.subscribers?.length || 0;
            return convertToDisplayAudience(dbAudience, realTimeCount);
          } catch {
            return convertToDisplayAudience(dbAudience);
          }
        })
      );
      setAudiences(displayAudiences);
      console.log('Audience cloned successfully');
    } catch (error) {
      console.error('Error cloning audience:', error);
      // Could show error notification instead of alert
    }
  };

  const handleDropdownToggle = (audienceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === audienceId ? null : audienceId);
  };

  const handleAudienceClick = (audienceId: string) => {
    router.push(`/admin/email-campaigns/audiences/${audienceId}`);
  };

  const handleCreateAudience = async () => {
    if (!newAudience.name.trim()) {
      // Could add proper form validation here instead of alert
      return;
    }

    try {
      const { audience: createdAudience } = await createAudience({
        name: newAudience.name,
        description: newAudience.description,
        filters: {} // Start with empty filters - user can edit later
      });
      
      // Reload audiences to include the new one
      const data = await getAudiences({ mode: 'light', refreshCounts: true });
      const dbAudiences = data.audiences || [];
      const displayAudiences = await Promise.all(
        dbAudiences.map(async (dbAudience) => {
          try {
            const data = await getAudienceSubscribers(dbAudience.id, { page: 1, limit: 1 });
            const realTimeCount = data.pagination?.total || data.subscribers?.length || 0;
            return convertToDisplayAudience(dbAudience, realTimeCount);
          } catch {
            return convertToDisplayAudience(dbAudience);
          }
        })
      );
      setAudiences(displayAudiences);
      
      // Close modal and reset form
      setShowCreateModal(false);
      setNewAudience({ name: "", description: "", type: "dynamic" });
      
      console.log('Audience created successfully');
      
      // Navigate to edit the new audience
      router.push(`/admin/email-campaigns/audiences/${createdAudience.id}`);
    } catch (error) {
      console.error('Error creating audience:', error);
      // Could show error state in modal instead of alert
    }
  };

  return (
    <>
      <GlobalStyles />
      <NextSEO
        title="Email Audiences"
        description="Manage and segment your email audiences for targeted campaigns"
      />
      
      <AudiencesContainer>
        <AudiencesTitle>
          <FaUsers />
          {showContent ? t("admin.audiencesPage.title", "Email Audiences") : "Email Audiences"}
        </AudiencesTitle>
        <AudiencesSubtitle>
          {showContent ? t("admin.audiencesPage.subtitle", "Create, manage, and analyze your audience segments for targeted email campaigns") : "Create, manage, and analyze your audience segments for targeted email campaigns"}
        </AudiencesSubtitle>

        {showContent && (
          <>

        <ActionsRow>
          <LeftActions>
            <SearchContainer>
              <SearchIcon>
                <FaSearch />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Search audiences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>
            
            <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="dynamic">Dynamic Audiences</option>
              <option value="static">Static Audiences</option>
            </FilterSelect>
          </LeftActions>
          
          <RightActions>
            <ActionButton onClick={() => {
              if (!user) return;
              const reload = async () => {
                setLoading(true);
                try {
                  const data = await getAudiences({ mode: 'light', refreshCounts: true });
                  const dbAudiences = data.audiences || [];
                  const displayAudiences = await Promise.all(
                    dbAudiences.map(async (dbAudience) => {
                      try {
                        const response = await fetch(`/api/email-campaigns/audiences/${dbAudience.id}/subscribers`);
                        if (response.ok) {
                          const data = await response.json();
                          const realTimeCount = data.pagination?.total || data.subscribers?.length || 0;
                          return convertToDisplayAudience(dbAudience, realTimeCount);
                        }
                        return convertToDisplayAudience(dbAudience);
                      } catch {
                        return convertToDisplayAudience(dbAudience);
                      }
                    })
                  );
                  setAudiences(displayAudiences);
                } catch (error) {
                  console.error('Failed to reload audiences:', error);
                } finally {
                  setLoading(false);
                }
              };
              reload();
            }} disabled={loading}>
              <FaSync />
              {loading ? 'Refreshing...' : 'Refresh'}
            </ActionButton>
            <ActionButton variant="primary" onClick={() => setShowCreateModal(true)}>
              <FaPlus />
              Create Audience
            </ActionButton>
          </RightActions>
        </ActionsRow>

        <AudiencesTable>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell>Audience</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Subscribers</TableHeaderCell>
                <TableHeaderCell>Engagement</TableHeaderCell>
                <TableHeaderCell>Tags</TableHeaderCell>
                <TableHeaderCell>Last Active</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={7} message="Loading audiences..." />
              ) : filteredAudiences.length === 0 ? (
                <tr>
                  <TableCell colSpan={7}>
                    <EmptyState>
                      <FaUsers />
                      <h3>No audiences found</h3>
                      <p>Try adjusting your search criteria or create a new audience.</p>
                    </EmptyState>
                  </TableCell>
                </tr>
              ) : (
                filteredAudiences.map((audience, index) => (
                  <TableRow
                    key={audience.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    onClick={() => handleAudienceClick(audience.id)}
                  >
                    <TableCell>
                      <AudienceName>{audience.name}</AudienceName>
                      <AudienceDescription>{audience.description}</AudienceDescription>
                    </TableCell>
                    <TableCell>
                      <StatusBadge type={audience.type}>
                        {audience.type === 'dynamic' ? '🔄 Dynamic' : '📌 Static'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <strong>{audience.subscribers.toLocaleString()}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {audience.growthRate}
                      </div>
                    </TableCell>
                    <TableCell>
                      <strong>{audience.engagementRate}</strong>
                    </TableCell>
                    <TableCell>
                      <TagsList>
                        {audience.tags.slice(0, 2).map((tag: any, tagIndex: number) => (
                          <Tag key={tagIndex} type={tag.type}>
                            {tag.text}
                          </Tag>
                        ))}
                        {audience.tags.length > 2 && (
                          <Tag>+{audience.tags.length - 2}</Tag>
                        )}
                      </TagsList>
                    </TableCell>
                    <TableCell>
                      {new Date(audience.lastActive).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ActionsCell data-dropdown>
                        <MoreButton 
                          onClick={(e) => handleDropdownToggle(audience.id, e)}
                          className={openDropdown === audience.id ? 'active' : ''}
                        >
                          <FaEllipsisV />
                        </MoreButton>
                        <AnimatePresence>
                          {openDropdown === audience.id && (
                            <DropdownMenu
                              initial={{ opacity: 0, scale: 0.8, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: -10 }}
                              transition={{ duration: 0.15 }}
                            >
                              <DropdownItem onClick={(e) => { e.stopPropagation(); handleAudienceAction('edit', audience.id); }}>
                                <FaEdit />
                                Edit Audience
                              </DropdownItem>
                              <DropdownItem onClick={(e) => { e.stopPropagation(); handleAudienceAction('email', audience.id); }}>
                                <FaEnvelope />
                                Send Campaign
                              </DropdownItem>
                              <DropdownItem onClick={(e) => { e.stopPropagation(); handleAudienceAction('clone', audience.id); }}>
                                <FaClone />
                                Duplicate
                              </DropdownItem>
                              <DropdownItem onClick={(e) => { e.stopPropagation(); handleAudienceAction('export', audience.id); }}>
                                <FaDownload />
                                Export Data
                              </DropdownItem>
                              <DropdownItem onClick={(e) => { e.stopPropagation(); handleAudienceAction('delete', audience.id); }}>
                                <FaTrash />
                                Delete
                              </DropdownItem>
                            </DropdownMenu>
                          )}
                        </AnimatePresence>
                      </ActionsCell>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </AudiencesTable>
        </>
        )}

        {/* Create Audience Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <CreateAudienceModal
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
            >
              <ModalContent
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalTitle>
                  <FaUsers />
                  Create New Audience
                </ModalTitle>
                
                <FormGroup>
                  <Label>Audience Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter audience name"
                    value={newAudience.name}
                    onChange={(e) => setNewAudience({...newAudience, name: e.target.value})}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Description</Label>
                  <TextArea
                    placeholder="Describe this audience..."
                    value={newAudience.description}
                    onChange={(e) => setNewAudience({...newAudience, description: e.target.value})}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Type</Label>
                  <Select
                    value={newAudience.type}
                    onChange={(e) => setNewAudience({...newAudience, type: e.target.value as "dynamic" | "static"})}
                  >
                    <option value="dynamic">Dynamic - Updates automatically</option>
                    <option value="static">Static - Manual management</option>
                  </Select>
                </FormGroup>

                <ModalActions>
                  <ActionButton onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </ActionButton>
                  <ActionButton variant="primary" onClick={handleCreateAudience}>
                    <FaPlus />
                    Create Audience
                  </ActionButton>
                </ModalActions>
              </ModalContent>
            </CreateAudienceModal>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && audienceToDelete && (
            <CreateAudienceModal
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelDeleteAudience}
            >
              <ModalContent
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '500px' }}
              >
                <ModalTitle style={{ color: 'var(--error-color)' }}>
                  <FaTrash />
                  Delete Audience
                </ModalTitle>
                
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
                    color: 'var(--primary-color)',
                    marginBottom: '1rem'
                  }}>
                    "{audienceToDelete.name}"
                  </p>
                  <p style={{ 
                    color: 'var(--error-color)', 
                    fontSize: '0.95rem',
                    backgroundColor: 'var(--error-bg)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--error-border)'
                  }}>
                    ⚠️ This action cannot be undone. All data associated with this audience will be permanently deleted.
                  </p>
                </div>

                <ModalActions>
                  <ActionButton 
                    onClick={cancelDeleteAudience}
                    disabled={isDeleting}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton 
                    variant="danger" 
                    onClick={confirmDeleteAudience}
                    disabled={isDeleting}
                    style={{
                      backgroundColor: 'var(--error-color)',
                      borderColor: 'var(--error-color)'
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
                  </ActionButton>
                </ModalActions>
              </ModalContent>
            </CreateAudienceModal>
          )}
        </AnimatePresence>
      </AudiencesContainer>
    </>
  );
}

export default AudiencesPage; 