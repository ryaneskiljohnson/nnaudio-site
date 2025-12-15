"use client";
import React, { useState, useEffect } from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { 
  FaEnvelopeOpen, 
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaPlay,
  FaPause,
  FaChartLine,
  FaCalendarAlt,
  FaUsers,
  FaEnvelope,
  FaEllipsisV,
  FaClone,
  FaDownload,
  FaStop,
  FaClock,
  FaPaperPlane,
  FaExclamationTriangle,
  FaTimes,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaExpandArrowsAlt,
  FaDesktop,
  FaMobileAlt,
  FaTabletAlt,
  FaCheck,
  FaImage
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

import TableLoadingRow from "@/components/common/TableLoadingRow";
import StatLoadingSpinner from "@/components/common/StatLoadingSpinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { getCampaigns, getCampaign, getAudiences, calculateBatchReach } from "@/app/actions/email-campaigns";

const CampaignsContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const CampaignsTitle = styled.h1`
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

const CampaignsSubtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1.25rem;
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
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const CampaignsGrid = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: visible;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  overflow: visible;
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
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    color: var(--text);
    background-color: rgba(255, 255, 255, 0.02);
  }

  &:nth-child(2), &:nth-child(3), &:nth-child(4), &:nth-child(5), &:nth-child(6) {
    text-align: center;
  }

  &:last-child {
    text-align: center;
    cursor: default;
    &:hover {
      background-color: transparent;
    }
  }
`;

const SortableHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &.center {
    justify-content: center;
  }
  
  svg {
    font-size: 0.8rem;
    opacity: 0.6;
    transition: opacity 0.2s ease;
  }
  
  &:hover svg {
    opacity: 1;
  }
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
  padding: 1rem;
  color: var(--text);
  font-size: 0.9rem;
  vertical-align: middle;
  text-align: left;

  &:nth-child(3), &:nth-child(4), &:nth-child(5), &:nth-child(6), &:nth-child(7) {
    text-align: center;
  }

  &:last-child {
    text-align: center;
  }
`;

const CampaignTitle = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
  text-align: left;
`;

const CampaignDescription = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.4;
  text-align: left;
`;

const PreviewIconButton = styled.button`
  padding: 4px 6px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-width: auto;

  &:hover {
    background-color: var(--primary);
    color: white;
  }

  svg {
    font-size: 0.75rem;
  }
`;


const EmailPreviewFrame = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: white;
  position: relative;
  height: 500px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
`;

const EmailPreviewIframe = styled.iframe`
  border: none;
  width: 100%;
  height: 100%;
  display: block;
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
      case 'completed':
        return `
          background-color: rgba(108, 99, 255, 0.2);
          color: var(--primary);
        `;
      default:
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
    }
  }}
`;

const MetricValue = styled.div`
  font-weight: 600;
  color: var(--text);
`;

const MetricLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
  width: 100%;
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
  overflow: visible;
  
  /* Ensure dropdown appears above other content */
  z-index: 9999;
  
  /* Handle positioning near edges */
  @media (max-width: 768px) {
    right: -10px;
    min-width: 160px;
  }
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

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 32px;
  height: 32px;
  justify-content: center;

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

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Tab = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  padding: 12px 20px;
  border: none;
  background: none;
  color: ${props => props.active ? 'var(--primary)' : 'var(--text-secondary)'};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 2px solid ${props => props.active ? 'var(--primary)' : 'transparent'};
  font-size: 0.9rem;

  &:hover {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.8rem;
  }
`;

// Confirmation Modal Styled Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  backdrop-filter: blur(8px);
`;

const ModalContent = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
`;

const ModalTitle = styled.h3`
  color: var(--text);
  font-size: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #f59e0b;
    font-size: 1.25rem;
  }
`;

const ModalMessage = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'danger' | 'secondary' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  min-width: 100px;

  ${props => {
    switch (props.variant) {
      case 'danger':
        return `
          background-color: #dc3545;
          color: white;
          &:hover {
            background-color: #c82333;
            transform: translateY(-1px);
          }
        `;
      case 'primary':
        return `
          background-color: var(--primary);
          color: white;
          &:hover {
            background-color: var(--accent);
            transform: translateY(-1px);
          }
        `;
      default:
        return `
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.2);
          &:hover {
            background-color: rgba(255, 255, 255, 0.2);
            color: var(--text);
          }
        `;
    }
  }}
`;

// Add preview-related styled components
const PreviewSection = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 1.5rem;
`;

const PreviewTitle = styled.h3`
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  
  svg:first-child {
    color: var(--primary);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }
`;

const PreviewContent = styled.div`
  background-color: white;
  color: #333;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const ExpandPreviewButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(108, 99, 255, 0.4);
    background: linear-gradient(135deg, var(--accent), var(--primary));

    &:before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);
  }
`;

const PreviewModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
  z-index: 10000;
  padding: 0;
`;

const PreviewModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: none;
  box-shadow: none;
  display: flex;
  flex-direction: column;
`;

const PreviewModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%);
  backdrop-filter: blur(20px);
  flex-shrink: 0;
`;

const PreviewModalTitle = styled.h3`
  color: #ffffff;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  &:before {
    content: '📧';
    font-size: 1.5rem;
  }
`;

const PreviewModalClose = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 12px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`;

const PreviewModalBody = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 0;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  display: flex;
  flex-direction: column;
`;

const DeviceToggleContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const DeviceToggle = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, var(--primary), var(--accent))' 
    : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$active ? 'white' : 'var(--text-primary)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.85rem;
  font-weight: 600;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid ${props => props.$active ? 'transparent' : 'rgba(255, 255, 255, 0.15)'};

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: ${props => props.$active 
      ? 'linear-gradient(135deg, var(--accent), var(--primary))' 
      : 'rgba(255, 255, 255, 0.15)'};
    color: ${props => props.$active ? 'white' : 'var(--text-primary)'};
    border-color: ${props => props.$active ? 'transparent' : 'rgba(255, 255, 255, 0.25)'};
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);

    &:before {
      left: 100%;
    }
  }
`;

const PreviewContainer = styled.div<{ $device: 'mobile' | 'tablet' | 'desktop' }>`
  width: ${props => {
    switch (props.$device) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
      default: return '100%';
    }
  }};
  max-width: ${props => {
    switch (props.$device) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return 'min(1400px, calc(100vw - 4rem))';
      default: return 'min(1400px, calc(100vw - 4rem))';
    }
  }};
  margin: 0 auto;
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
`;

const DeviceFrame = styled.div<{ $device: 'mobile' | 'tablet' | 'desktop' }>`
  position: relative;
  background: ${props => props.$device === 'desktop' ? 'transparent' : '#000'};
  border-radius: ${props => {
    switch (props.$device) {
      case 'mobile': return '25px';
      case 'tablet': return '20px';
      case 'desktop': return '8px';
      default: return '8px';
    }
  }};
  padding: ${props => {
    switch (props.$device) {
      case 'mobile': return '20px 8px';
      case 'tablet': return '15px 10px';
      case 'desktop': return '0';
      default: return '0';
    }
  }};

  &:before {
    content: '';
    position: absolute;
    top: ${props => props.$device === 'mobile' ? '8px' : '6px'};
    left: 50%;
    transform: translateX(-50%);
    width: ${props => {
      switch (props.$device) {
        case 'mobile': return '60px';
        case 'tablet': return '80px';
        case 'desktop': return '0px';
        default: return '0px';
      }
    }};
    height: ${props => {
      switch (props.$device) {
        case 'mobile': return '4px';
        case 'tablet': return '3px';
        case 'desktop': return '0px';
        default: return '0px';
      }
    }};
    background: #333;
    border-radius: 2px;
    display: ${props => props.$device === 'desktop' ? 'none' : 'block'};
  }
`;

function CampaignsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'drafts' | 'scheduled' | 'sent'>('drafts');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelCampaignId, setCancelCampaignId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);
  const [showDeliverabilityModal, setShowDeliverabilityModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [deliverabilityData, setDeliverabilityData] = useState<any>(null);
  const [loadingDeliverability, setLoadingDeliverability] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [audiences, setAudiences] = useState<any[]>([]);
  const [campaignAudienceData, setCampaignAudienceData] = useState<Record<string, {
    audienceIds: string[];
    excludedAudienceIds: string[];
    isLoaded: boolean;
  }>>({});
  const [campaignReachData, setCampaignReachData] = useState<Record<string, {
    totalIncluded: number;
    totalExcluded: number;
    estimatedReach: number;
    includedCount: number;
    excludedCount: number;
    isLoading: boolean;
  }>>({});
  
  // Preview click state
  const [clickedPreviewId, setClickedPreviewId] = useState<string | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Initialize audience IDs for campaign from batched API payload
  const ensureCampaignAudienceData = (campaign: any) => {
    if (campaignAudienceData[campaign.id]?.isLoaded) return;
    const audienceIds = campaign.audienceIds || [];
    const excludedAudienceIds = campaign.excludedAudienceIds || [];
    setCampaignAudienceData(prev => ({
      ...prev,
      [campaign.id]: {
        audienceIds,
        excludedAudienceIds,
        isLoaded: true
      }
    }));
  };

  // Copy exact function from edit modal that works
  const calculateAudienceStatsForCampaign = (audienceIds: string[], excludedAudienceIds: string[], campaignId: string) => {
    const includedAudiences = audiences.filter(a => audienceIds.includes(a.id));
    const excludedAudiences = audiences.filter(a => excludedAudienceIds.includes(a.id));
    
    // Calculate fallback totals from audience subscriber_count (EXACT same as edit modal)
    const fallbackTotalIncluded = includedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
    const fallbackTotalExcluded = excludedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
    
    return {
      totalIncluded: fallbackTotalIncluded,
      totalExcluded: fallbackTotalExcluded,
      estimatedReach: Math.max(0, fallbackTotalIncluded - fallbackTotalExcluded),
      includedCount: includedAudiences.length,
      excludedCount: excludedAudiences.length
    };
  };
  
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'scheduled' || tabParam === 'sent' || tabParam === 'drafts') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Function to update both tab state and URL
  const handleTabChange = (tab: 'drafts' | 'scheduled' | 'sent') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  // Function to calculate reach for a campaign (client-side using audiences list)
  const calculateCampaignReach = async (campaign: any) => {
    if (!campaign.id || campaignReachData[campaign.id]?.isLoading) return;

    // Don't calculate for sent campaigns that already have final metrics
    if (campaign.status === 'sent' || campaign.status === 'completed') {
      return;
    }

    // Require audiences to be loaded for accurate totals
    if (!audiences || audiences.length === 0) return;

    // Use audience IDs from batched campaigns API
    let audienceIds: string[] = campaign.audienceIds || [];
    let excludedAudienceIds: string[] = campaign.excludedAudienceIds || [];
    
    try {
      if (audienceIds.length === 0) {
        setCampaignReachData(prev => ({ 
          ...prev, 
          [campaign.id]: {
            totalIncluded: 0,
            totalExcluded: 0,
            estimatedReach: 0,
            includedCount: 0,
            excludedCount: 0,
            isLoading: false
          }
        }));
        return;
      }

      // Set loading state
      setCampaignReachData(prev => ({ 
        ...prev, 
        [campaign.id]: {
          ...prev[campaign.id],
          isLoading: true
        } as any
      }));
      // Client-side reach estimate from audience subscriber_count
      const includedAudiences = audiences.filter(a => audienceIds.includes(a.id));
      const excludedAudiences = audiences.filter(a => excludedAudienceIds.includes(a.id));
      const totalIncluded = includedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
      const totalExcluded = excludedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);

      setCampaignReachData(prev => ({ 
        ...prev, 
        [campaign.id]: {
          totalIncluded,
          totalExcluded,
          estimatedReach: Math.max(0, totalIncluded - totalExcluded),
          includedCount: includedAudiences.length,
          excludedCount: excludedAudiences.length,
          isLoading: false
        }
      }));
    } catch (error) {
      // Fallback calculation (same as edit modal)
      const includedAudiences = audiences.filter(a => (campaign.audienceIds || []).includes(a.id));
      const excludedAudiences = audiences.filter(a => (campaign.excludedAudienceIds || []).includes(a.id));
      const totalIncluded = includedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
      const totalExcluded = excludedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
      
      setCampaignReachData(prev => ({ 
        ...prev, 
        [campaign.id]: {
          totalIncluded,
          totalExcluded,
          estimatedReach: Math.max(0, totalIncluded - totalExcluded),
          includedCount: includedAudiences.length,
          excludedCount: excludedAudiences.length,
          isLoading: false
        }
      }));
    }
  };

  // Fetch campaigns from API
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!user) return;
      
      try {
        const data = await getCampaigns();
        console.log('📧 Fetched campaigns:', data);
        const fetchedCampaigns = data.campaigns || [];
        setCampaigns(fetchedCampaigns);
          
          console.log('🔍🔍🔍 =====CAMPAIGNS TABLE FILTER DEBUG=====');
          console.log('All fetched campaigns:', fetchedCampaigns.map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            scheduled_at: c.scheduled_at,
            scheduled_at_date: c.scheduled_at ? new Date(c.scheduled_at) : null,
            current_date: new Date(),
            is_future: c.scheduled_at ? new Date(c.scheduled_at) > new Date() : false
          })));
          
          // Calculate reach for scheduled AND draft campaigns (both need reach calculation)
          const campaignsNeedingReach = fetchedCampaigns.filter((c: any) => 
            c.status === 'scheduled' || c.status === 'draft' || (c.scheduled_at && new Date(c.scheduled_at) > new Date())
          );
          
          console.log('🔍 Campaigns that will get reach calculation:', campaignsNeedingReach.map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            scheduled_at: c.scheduled_at
          })));
          
          // Initialize audience IDs
          campaignsNeedingReach.forEach((campaign: any) => ensureCampaignAudienceData(campaign));

          // Compute accurate reach via batched server-side API
          try {
            const payload = campaignsNeedingReach.map((c: any) => ({
              id: c.id,
              audienceIds: c.audienceIds || [],
              excludedAudienceIds: c.excludedAudienceIds || []
            }));

            const { results } = await calculateBatchReach({ campaigns: payload });
            campaignsNeedingReach.forEach((c: any) => {
              const r = results?.[c.id];
              const includedAudiences = audiences.filter(a => (c.audienceIds || []).includes(a.id));
              const excludedAudiences = audiences.filter(a => (c.excludedAudienceIds || []).includes(a.id));
              setCampaignReachData(prev => ({
                ...prev,
                [c.id]: {
                  totalIncluded: r?.details?.totalIncluded ?? 0,
                  totalExcluded: r?.details?.totalExcluded ?? 0,
                  estimatedReach: r?.uniqueCount ?? 0,
                  includedCount: includedAudiences.length,
                  excludedCount: excludedAudiences.length,
                  isLoading: false
                }
              }));
            });
          } catch {
            campaignsNeedingReach.forEach((c: any) => calculateCampaignReach(c));
          }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [user]);

  // Load audiences for reach calculation fallbacks (same as edit modal)
  useEffect(() => {
    const loadAudiences = async () => {
      if (!user) return;
      
      try {
          const data = await getAudiences({ mode: 'light' });
          console.log('📊 Loaded audiences for reach calculations:', data.audiences?.length || 0);
          setAudiences(data.audiences || []);
          
          // After audiences load, compute reach for campaigns in state that need it
          const campaignsNeedingReach = campaigns.filter((c: any) => 
            c.status === 'scheduled' || c.status === 'draft' || (c.scheduled_at && new Date(c.scheduled_at) > new Date())
          );
          campaignsNeedingReach.forEach((c: any) => calculateCampaignReach(c));
      } catch (error) {
        console.error('Error loading audiences:', error);
      }
    };

    loadAudiences();
  }, [user]);



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

  // Reset sorting when tab changes (different tabs have different date meanings)
  useEffect(() => {
    setSortField('date');
    setSortDirection('desc');
  }, [activeTab]);

  // Show page immediately - no early returns
  const showContent = !languageLoading && translationsLoaded && user;

  // Handle sorting
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for new field
    }
  };

  // Helper function to render sortable header
  const renderSortableHeader = (label: string, field: string, centered: boolean = false) => {
    const isActive = sortField === field;
    const SortIcon = isActive 
      ? (sortDirection === 'asc' ? FaSortUp : FaSortDown)
      : FaSort;
    
    return (
      <SortableHeader className={centered ? 'center' : ''}>
        {label}
        <SortIcon />
      </SortableHeader>
    );
  };

  const getSortValue = (campaign: any, field: string) => {
    switch (field) {
      case 'name':
        return campaign.name?.toLowerCase() || '';
      case 'status':
        return campaign.status || '';
      case 'date':
        if (activeTab === 'sent' && campaign.sent_at) {
          return new Date(campaign.sent_at).getTime();
        }
        if (activeTab === 'scheduled' && campaign.scheduled_at) {
          return new Date(campaign.scheduled_at).getTime();
        }
        return campaign.created_at ? new Date(campaign.created_at).getTime() : 0;
      case 'scheduled_time':
        return campaign.scheduled_at ? new Date(campaign.scheduled_at).getTime() : 0;
      case 'recipients':
        return campaign.total_recipients || 0;
      case 'open_rate':
        return campaign.emails_sent > 0 ? (campaign.emails_opened || 0) / campaign.emails_sent : 0;
      case 'click_rate':
        return campaign.emails_sent > 0 ? (campaign.emails_clicked || 0) / campaign.emails_sent : 0;
      case 'reach':
        // For reach, we need to calculate it from audience data
        const campaignAudiences = campaignAudienceData[campaign.id];
        if (!campaignAudiences?.isLoaded || audiences.length === 0) return 0;
        const stats = calculateAudienceStatsForCampaign(
          campaignAudiences.audienceIds, 
          campaignAudiences.excludedAudienceIds, 
          campaign.id
        );
        return stats.estimatedReach;
      default:
        return '';
    }
  };

  const filteredCampaigns = campaigns
    .filter((campaign: any) => {
    // First filter by search term
    const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Then filter by tab
    switch (activeTab) {
      case 'drafts':
        return campaign.status === 'draft';
      case 'scheduled':
        return campaign.status === 'scheduled' || (campaign.scheduled_at && new Date(campaign.scheduled_at) > new Date());
      case 'sent':
        return campaign.status === 'sent' || campaign.status === 'completed';
      default:
        return campaign.status === 'draft';
    }
    })
    .sort((a: any, b: any) => {
      const aValue = getSortValue(a, sortField);
      const bValue = getSortValue(b, sortField);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortDirection === 'asc' ? comparison : -comparison;
  });

  const stats = [
    {
      value: campaigns.length.toString(),
      label: "Total Campaigns",
    },
    {
      value: campaigns.filter((c: any) => c.status === "draft").length.toString(),
      label: "Draft Campaigns",
    },
    {
      value: campaigns.filter((c: any) => c.status === "scheduled" || (c.scheduled_at && new Date(c.scheduled_at) > new Date())).length.toString(),
      label: "Scheduled",
    },
    {
      value: campaigns.filter((c: any) => c.status === "sent" || c.status === "completed").length.toString(),
      label: "Sent Campaigns",
    },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
    }),
  };

  const handleCampaignAction = (action: string, campaignId: string) => {
    console.log(`${action} campaign:`, campaignId);
    setOpenDropdown(null); // Close dropdown after action
    
    const campaign = campaigns.find(c => c.id === campaignId);
    
    switch (action) {
      case 'create':
        router.push('/admin/email-campaigns/campaigns/create');
        break;
        
      case 'edit':
        // Check if campaign is sent - prevent editing
        if (campaign && (campaign.status === 'sent' || campaign.status === 'completed')) {
          error('Sent campaigns cannot be edited.', 3000);
          return;
        }
        router.push(`/admin/email-campaigns/campaigns/create?edit=${campaignId}`);
        break;
        
      case 'send':
        // Navigate to step 3 (Review & Schedule) with Send Now pre-selected
        router.push(`/admin/email-campaigns/campaigns/create?edit=${campaignId}&step=3&scheduleType=immediate`);
        break;
        
      case 'schedule':
        // Navigate to step 3 (Review & Schedule) of campaign edit
        router.push(`/admin/email-campaigns/campaigns/create?edit=${campaignId}&step=3`);
        break;
        
      case 'editSchedule':
        // Navigate to step 3 (Review & Schedule) of campaign edit
        router.push(`/admin/email-campaigns/campaigns/create?edit=${campaignId}&step=3`);
        break;
        
      case 'editSchedule':
        // Navigate to step 3 (Review & Schedule) of campaign edit
        router.push(`/admin/email-campaigns/campaigns/create?edit=${campaignId}&step=3`);
        break;
        
      case 'cancel':
        // Show confirmation modal instead of browser alert
        setCancelCampaignId(campaignId);
        setShowCancelModal(true);
        break;
        
      case 'pause':
        if (confirm('Are you sure you want to pause this campaign?')) {
          // TODO: Implement pause functionality
          console.log('Pausing campaign:', campaignId);
          success('Campaign paused successfully!', 3000);
        }
        break;
        
      case 'resume':
        if (confirm('Are you sure you want to resume this campaign?')) {
          // TODO: Implement resume functionality
          console.log('Resuming campaign:', campaignId);
          success('Campaign resumed successfully!', 3000);
        }
        break;
        
      case 'view':
        // TODO: Navigate to analytics page
        console.log('Viewing analytics for:', campaignId);
        router.push(`/admin/email-campaigns/analytics?campaign=${campaignId}`);
        break;
        
      case 'clone':
        // TODO: Implement clone functionality
        console.log('Cloning campaign:', campaignId);
        router.push(`/admin/email-campaigns/campaigns/create?clone=${campaignId}`);
        break;
        
      case 'export':
        // TODO: Implement export functionality
        console.log('Exporting data for:', campaignId);
        success('Export functionality coming soon!', 3000);
        break;
        
      case 'delete':
        // Show delete confirmation modal
        const campaignToDelete = campaigns.find(c => c.id === campaignId);
        setDeleteCampaignId(campaignId);
        setCampaignToDelete(campaignToDelete);
        setShowDeleteModal(true);
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleDropdownToggle = (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === campaignId ? null : campaignId);
  };

  const handleCancelConfirm = async () => {
    if (cancelCampaignId) {
      try {
        console.log("Cancelling scheduled campaign:", cancelCampaignId);
        
        // Call API to update campaign status from "scheduled" to "draft"
        // Note: Update campaign would require a server action, keeping as API route for now
        // This is a write operation that should remain as API route
        const response = await fetch(`/api/email-campaigns/campaigns/${cancelCampaignId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            status: "draft",
            scheduled_at: null // Clear the scheduled time
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Campaign schedule cancelled:", result);
          
          // Update the local campaigns state to reflect the change
          setCampaigns(prevCampaigns => 
            prevCampaigns.map(campaign => 
              campaign.id === cancelCampaignId 
                ? { ...campaign, status: "draft", scheduled_at: null }
                : campaign
            )
          );
          
          // Show success toast
          success("Campaign schedule cancelled successfully! Campaign is now a draft.", 4000);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to cancel campaign schedule");
        }
        
        // Close modal and reset state
        setShowCancelModal(false);
        setCancelCampaignId(null);
      } catch (err) {
        // Show error toast
        error("Failed to cancel campaign schedule. Please try again.", 5000);
        console.error("Error cancelling campaign:", err);
      }
    }
  };

  const handleCancelClose = () => {
    setShowCancelModal(false);
    setCancelCampaignId(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteCampaignId) {
      try {
        console.log("Deleting campaign:", deleteCampaignId);
        
        // Call API to delete the campaign
        const response = await fetch(`/api/email-campaigns/campaigns/${deleteCampaignId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          console.log("✅ Campaign deleted successfully");
          
          // Remove the campaign from local state
          setCampaigns(prevCampaigns => 
            prevCampaigns.filter(campaign => campaign.id !== deleteCampaignId)
          );
          
          // Show success toast
          success(`Campaign "${campaignToDelete?.name || 'Untitled'}" deleted successfully!`, 4000);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete campaign");
        }
        
        // Close modal and reset state
        setShowDeleteModal(false);
        setDeleteCampaignId(null);
        setCampaignToDelete(null);
      } catch (err) {
        // Show error toast
        error("Failed to delete campaign. Please try again.", 5000);
        console.error("Error deleting campaign:", err);
        
        // Keep modal open on error so user can try again
      }
    }
  };

  const handleDeleteClose = () => {
    setShowDeleteModal(false);
    setDeleteCampaignId(null);
    setCampaignToDelete(null);
  };

  // Fetch detailed deliverability metrics for a campaign
  const fetchDeliverabilityData = async (campaignId: string) => {
    setLoadingDeliverability(true);
    try {
      const data = await getCampaign(campaignId);
      setDeliverabilityData(data.campaign);
    } catch (error) {
      console.error('Error fetching deliverability data:', error);
    } finally {
      setLoadingDeliverability(false);
    }
  };

  const handleShowDeliverabilityModal = (campaign: any) => {
    setSelectedCampaign(campaign);
    setShowDeliverabilityModal(true);
    fetchDeliverabilityData(campaign.id);
  };

  const handleCloseDeliverabilityModal = () => {
    setShowDeliverabilityModal(false);
    setSelectedCampaign(null);
    setDeliverabilityData(null);
  };

  // Generate preview HTML for sent campaigns
  const generatePreviewHtml = (campaign: any) => {
    const htmlContent = campaign?.html_content || '';
    
    // If the campaign has stored HTML content, use it
    if (htmlContent) {
      return htmlContent;
    }

    // Fallback: generate basic HTML structure
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${campaign?.subject || 'Email Preview'}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f7f7f7;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%);
            padding: 20px;
            text-align: center;
        }
        .logo {
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .logo .cyma {
            background: linear-gradient(90deg, #6c63ff, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .content {
            padding: 30px;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            background-color: #f8f9fa;
            color: #666666;
            border-top: 1px solid #e9ecef;
        }
        .footer a {
            color: #6c63ff;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <span class="cyma">CYMA</span><span>SPHERE</span>
            </div>
        </div>
        
        <div class="content">
            <h1 style="font-size: 2.5rem; color: #333; margin-bottom: 1rem; text-align: center; background: linear-gradient(135deg, #333, #666); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">${campaign?.subject || 'Welcome to Cymasphere! 🎵'}</h1>
            <p style="font-size: 1rem; color: #555; line-height: 1.6; margin-bottom: 1rem;">${campaign?.description || 'Thank you for joining our community of music creators and enthusiasts.'}</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} NNAud.io All rights reserved.</p>
            <p>
                <a href="#">Unsubscribe</a> | 
                <a href="#">Privacy Policy</a> | 
                <a href="#">Contact Us</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  };

  return (
    <>
      <NextSEO
        title="Email Campaigns"
        description="Manage and monitor your email marketing campaigns"
      />
      
      <CampaignsContainer>
        <CampaignsTitle>
          <FaEnvelopeOpen />
          {showContent ? t("admin.campaignsPage.title", "Email Campaigns") : "Email Campaigns"}
        </CampaignsTitle>
        <CampaignsSubtitle>
          {showContent ? t("admin.campaignsPage.subtitle", "Create, manage, and monitor your email marketing campaigns") : "Create, manage, and monitor your email marketing campaigns"}
        </CampaignsSubtitle>

        {showContent && (
          <>

        <StatsRow>
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <StatValue>{loading ? <StatLoadingSpinner size={20} /> : stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsRow>

        <ActionsRow>
          <SearchContainer>
            <SearchIcon>
              <FaSearch />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>
          
          <ActionButton variant="primary" onClick={() => handleCampaignAction('create', '')}>
            <FaPlus />
            Create Campaign
          </ActionButton>
        </ActionsRow>

        <TabsContainer>
          <Tab active={activeTab === 'drafts'} onClick={() => handleTabChange('drafts')}>
            Drafts
          </Tab>
          <Tab active={activeTab === 'scheduled'} onClick={() => handleTabChange('scheduled')}>
            Scheduled
          </Tab>
          <Tab active={activeTab === 'sent'} onClick={() => handleTabChange('sent')}>
            Sent
          </Tab>
        </TabsContainer>

        <CampaignsGrid>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell style={{ width: '30px', textAlign: 'center', padding: '0.5rem' }}></TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('name')}>
                  {renderSortableHeader('Campaign', 'name')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('status')}>
                  {renderSortableHeader('Status', 'status', true)}
                </TableHeaderCell>
                {activeTab === 'scheduled' ? (
                  <>
                    <TableHeaderCell onClick={() => handleSort('scheduled_time')}>
                      {renderSortableHeader('Scheduled Time', 'scheduled_time', true)}
                    </TableHeaderCell>  
                    <TableHeaderCell onClick={() => handleSort('reach')}>
                      {renderSortableHeader('Reach', 'reach', true)}
                    </TableHeaderCell>
                  </>
                ) : activeTab === 'drafts' ? (
                  <>
                    <TableHeaderCell onClick={() => handleSort('reach')}>
                      {renderSortableHeader('Reach', 'reach', true)}
                    </TableHeaderCell>
                  </>
                ) : (
                  <>
                    <TableHeaderCell onClick={() => handleSort('recipients')}>
                      {renderSortableHeader('Recipients', 'recipients', true)}
                    </TableHeaderCell>
                    <TableHeaderCell onClick={() => handleSort('open_rate')}>
                      {renderSortableHeader('Open Rate', 'open_rate', true)}
                    </TableHeaderCell>
                    <TableHeaderCell onClick={() => handleSort('click_rate')}>
                      {renderSortableHeader('Click Rate', 'click_rate', true)}
                    </TableHeaderCell>
                  </>
                )}
                <TableHeaderCell onClick={() => handleSort('date')}>
                  {renderSortableHeader(activeTab === 'sent' ? 'Sent Date' : 'Created', 'date', true)}
                </TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRow 
                  colSpan={activeTab === 'scheduled' ? 7 : 8} 
                  message="Loading campaigns..." 
                />
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <TableCell colSpan={activeTab === 'scheduled' ? 7 : 8}>
                    <EmptyState>
                      <FaEnvelopeOpen />
                      <h3>No campaigns found</h3>
                      <p>Try adjusting your search criteria or create a new campaign.</p>
                    </EmptyState>
                  </TableCell>
                </tr>
              ) : (
                filteredCampaigns.map((campaign: any, index: number) => (
                  <React.Fragment key={campaign.id}>
                    <TableRow
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    onClick={() => {
                      // Show deliverability modal for sent campaigns
                      if (campaign.status === 'sent' || campaign.status === 'completed') {
                        handleShowDeliverabilityModal(campaign);
                        return;
                      }
                      handleCampaignAction('edit', campaign.id);
                    }}
                  >
                    <TableCell style={{ textAlign: 'center', width: '30px', padding: '0.5rem' }}>
                      {campaign.html_content && (
                        <PreviewIconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setClickedPreviewId(clickedPreviewId === campaign.id ? null : campaign.id);
                          }}
                          style={{ padding: '4px 6px', minWidth: 'auto' }}
                        >
                          <FaImage style={{ fontSize: '0.75rem' }} />
                        </PreviewIconButton>
                      )}
                    </TableCell>
                    <TableCell>
                      <CampaignTitle>{campaign.name || 'Untitled'}</CampaignTitle>
                      <CampaignDescription>{campaign.subject || campaign.description || 'No description'}</CampaignDescription>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status || 'draft'}>{campaign.status || 'draft'}</StatusBadge>
                    </TableCell>
                    {activeTab === 'scheduled' ? (
                      <>
                        <TableCell>
                          <MetricValue>
                            {campaign.scheduled_at 
                              ? (() => {
                                  const scheduledDate = new Date(campaign.scheduled_at);
                                  console.log('📅 Displaying scheduled time:', {
                                    campaignName: campaign.name,
                                    storedValue: campaign.scheduled_at,
                                    parsedDate: scheduledDate.toString(),
                                    utcString: scheduledDate.toUTCString(),
                                    localString: scheduledDate.toLocaleString(),
                                    timezoneOffset: scheduledDate.getTimezoneOffset()
                                  });
                                  
                                  return scheduledDate.toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZoneName: 'short'
                                  });
                                })()
                              : 'Not scheduled'
                            }
                          </MetricValue>
                        </TableCell>
                        <TableCell>
                          <MetricValue>
                            {campaignReachData[campaign.id]?.isLoading ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  style={{ width: '12px', height: '12px', border: '2px solid rgba(108, 99, 255, 0.3)', borderTop: '2px solid var(--primary)', borderRadius: '50%' }}
                                />
                                Calculating...
                              </span>
                            ) : (() => {
                              // Get audience data (fetched separately like edit modal)
                              const campaignAudiences = campaignAudienceData[campaign.id];
                              
                              if (!campaignAudiences?.isLoaded) {
                                console.log(`🔄 Still loading audience data for ${campaign.name}...`);
                                return '...';
                              }
                              
                              const audienceIds = campaignAudiences.audienceIds || [];
                              const excludedAudienceIds = campaignAudiences.excludedAudienceIds || [];
                              
                              if (audienceIds.length === 0) {
                                console.log(`⚠️ No audiences for ${campaign.name}`);
                                return '0';
                              }
                              
                              if (audiences.length === 0) {
                                console.log(`🔄 Audiences list not loaded yet for ${campaign.name}`);
                                return '...';
                              }
                              
                              // Prefer server-calculated unique reach; fallback to client estimate
                              const stats = calculateAudienceStatsForCampaign(audienceIds, excludedAudienceIds, campaign.id);
                              const finalReach = (campaignReachData[campaign.id]?.estimatedReach ?? stats.estimatedReach);
                              
                              console.log(`🎯 FINAL REACH for ${campaign.name}:`, {
                                audienceIds,
                                excludedAudienceIds,
                                stats,
                                finalReach
                              });
                              
                              return finalReach.toLocaleString();
                            })()}
                          </MetricValue>
                          <MetricLabel>subscribers</MetricLabel>
                        </TableCell>
                      </>
                    ) : activeTab === 'drafts' ? (
                      <>
                        <TableCell>
                          <MetricValue>
                            {campaignReachData[campaign.id]?.isLoading ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  style={{ width: '12px', height: '12px', border: '2px solid rgba(108, 99, 255, 0.3)', borderTop: '2px solid var(--primary)', borderRadius: '50%' }}
                                />
                                Calculating...
                              </span>
                            ) : (() => {
                              // Get audience data (fetched separately like edit modal)
                              const campaignAudiences = campaignAudienceData[campaign.id];
                              
                              if (!campaignAudiences?.isLoaded) {
                                console.log(`🔄 Still loading audience data for ${campaign.name}...`);
                                return '...';
                              }
                              
                              const audienceIds = campaignAudiences.audienceIds || [];
                              const excludedAudienceIds = campaignAudiences.excludedAudienceIds || [];
                              
                              if (audienceIds.length === 0) {
                                console.log(`⚠️ No audiences for ${campaign.name}`);
                                return '0';
                              }
                              
                              if (audiences.length === 0) {
                                console.log(`🔄 Audiences list not loaded yet for ${campaign.name}`);
                                return '...';
                              }
                              
                              // Prefer server-calculated unique reach; fallback to client estimate
                              const stats = calculateAudienceStatsForCampaign(audienceIds, excludedAudienceIds, campaign.id);
                              const finalReach = (campaignReachData[campaign.id]?.estimatedReach ?? stats.estimatedReach);
                              
                              console.log(`🎯 FINAL REACH for ${campaign.name}:`, {
                                audienceIds,
                                excludedAudienceIds,
                                stats,
                                finalReach
                              });
                              
                              return finalReach.toLocaleString();
                            })()}
                          </MetricValue>
                          <MetricLabel>subscribers</MetricLabel>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <MetricValue>{campaign.total_recipients || 0}</MetricValue>
                        </TableCell>
                        <TableCell>
                          <MetricValue>
                            {campaign.emails_sent > 0 
                              ? `${((campaign.emails_opened || 0) / campaign.emails_sent * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </MetricValue>
                        </TableCell>
                        <TableCell>
                          <MetricValue>
                            {campaign.emails_sent > 0 
                              ? `${((campaign.emails_clicked || 0) / campaign.emails_sent * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </MetricValue>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      {activeTab === 'sent' && campaign.sent_at 
                        ? new Date(campaign.sent_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : campaign.created_at 
                          ? new Date(campaign.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'
                      }
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ActionsContainer data-dropdown>
                        <MoreButton 
                          onClick={(e) => handleDropdownToggle(campaign.id, e)}
                          className={openDropdown === campaign.id ? 'active' : ''}
                        >
                          <FaEllipsisV />
                        </MoreButton>
                        <AnimatePresence>
                          {openDropdown === campaign.id && (
                            <DropdownMenu
                              initial={{ opacity: 0, scale: 0.8, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: -10 }}
                              transition={{ duration: 0.15 }}
                            >
                              {/* Draft Campaign Options */}
                              {campaign.status === 'draft' && (
                                <>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('edit', campaign.id); }}>
                                    <FaEdit />
                                    Edit Campaign
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('send', campaign.id); }}>
                                    <FaPaperPlane />
                                    Send Now
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('schedule', campaign.id); }}>
                                    <FaClock />
                                    Schedule
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('clone', campaign.id); }}>
                                    <FaClone />
                                    Duplicate
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('delete', campaign.id); }}>
                                    <FaTrash />
                                    Delete
                                  </DropdownItem>
                                </>
                              )}

                              {/* Scheduled Campaign Options */}
                              {campaign.status === 'scheduled' && (
                                <>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('editSchedule', campaign.id); }}>
                                    <FaEdit />
                                    Edit Schedule
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('send', campaign.id); }}>
                                    <FaPaperPlane />
                                    Send Now
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('cancel', campaign.id); }}>
                                    <FaStop />
                                    Cancel Schedule
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('clone', campaign.id); }}>
                                    <FaClone />
                                    Duplicate
                                  </DropdownItem>
                                </>
                              )}

                              {/* Sent/Completed Campaign Options */}
                              {(campaign.status === 'sent' || campaign.status === 'completed') && (
                                <>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('view', campaign.id); }}>
                                    <FaEye />
                                    View Analytics
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('export', campaign.id); }}>
                                    <FaDownload />
                                    Export Data
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('clone', campaign.id); }}>
                                    <FaClone />
                                    Duplicate
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('delete', campaign.id); }}>
                                    <FaTrash />
                                    Delete
                                  </DropdownItem>
                                </>
                              )}

                              {/* Active/Paused Campaign Options */}
                              {campaign.status === 'active' && (
                                <>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('pause', campaign.id); }}>
                                    <FaPause />
                                    Pause Campaign
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('view', campaign.id); }}>
                                    <FaEye />
                                    View Analytics
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('clone', campaign.id); }}>
                                    <FaClone />
                                    Duplicate
                                  </DropdownItem>
                                </>
                              )}

                              {campaign.status === 'paused' && (
                                <>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('resume', campaign.id); }}>
                                    <FaPlay />
                                    Resume Campaign
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('edit', campaign.id); }}>
                                    <FaEdit />
                                    Edit Campaign
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('view', campaign.id); }}>
                                    <FaEye />
                                    View Analytics
                                  </DropdownItem>
                                  <DropdownItem onClick={(e) => { e.stopPropagation(); handleCampaignAction('clone', campaign.id); }}>
                                    <FaClone />
                                    Duplicate
                                  </DropdownItem>
                                </>
                              )}
                            </DropdownMenu>
                          )}
                        </AnimatePresence>
                      </ActionsContainer>
                    </TableCell>
                    </TableRow>
                    {/* Email Preview Row */}
                    {campaign.html_content && clickedPreviewId === campaign.id && (
                      <tr>
                        <TableCell colSpan={activeTab === 'scheduled' ? 7 : 8} style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <EmailPreviewFrame>
                            <EmailPreviewIframe
                              srcDoc={campaign.html_content}
                              title={`Email preview for ${campaign.name || 'campaign'}`}
                            />
                          </EmailPreviewFrame>
                        </TableCell>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CampaignsGrid>
        </>
        )}
      </CampaignsContainer>

      {/* Cancel Schedule Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancelClose}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalTitle>
                <FaExclamationTriangle />
                Cancel Scheduled Campaign
              </ModalTitle>
              <ModalMessage>
                Are you sure you want to cancel this scheduled campaign? This action cannot be undone and the campaign will not be sent to your subscribers.
              </ModalMessage>
              <ModalActions>
                <ModalButton onClick={handleCancelClose}>
                  Cancel
                </ModalButton>
                <ModalButton variant="danger" onClick={handleCancelConfirm}>
                  Yes, Cancel Schedule
                </ModalButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Delete Campaign Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDeleteClose}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalTitle>
                <FaExclamationTriangle />
                Delete Campaign
              </ModalTitle>
              <ModalMessage>
                Are you sure you want to delete the campaign "{campaignToDelete?.name || 'Untitled'}"? This action cannot be undone and all campaign data will be permanently lost.
              </ModalMessage>
              <ModalActions>
                <ModalButton onClick={handleDeleteClose}>
                  Cancel
                </ModalButton>
                <ModalButton variant="danger" onClick={handleDeleteConfirm}>
                  Yes, Delete Campaign
                </ModalButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Deliverability Modal */}
      <AnimatePresence>
        {showDeliverabilityModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseDeliverabilityModal}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '700px', width: '90vw' }}
            >
              <ModalTitle>
                <FaChartLine />
                Deliverability Metrics
              </ModalTitle>
              
              {selectedCampaign && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {selectedCampaign.name || 'Untitled Campaign'}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Subject: {selectedCampaign.subject || 'No subject'}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Sent: {selectedCampaign.sent_at 
                      ? new Date(selectedCampaign.sent_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
              )}

              {loadingDeliverability ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      border: '3px solid rgba(108, 99, 255, 0.3)', 
                      borderTop: '3px solid var(--primary)', 
                      borderRadius: '50%',
                      marginRight: '1rem'
                    }}
                  />
                  Loading deliverability data...
                </div>
              ) : (
                <>
                  {/* Email Preview Section */}
                  <PreviewSection>
                    <PreviewTitle>
                      <FaEye />
                      Email Preview
                      <ExpandPreviewButton 
                        onClick={() => setShowPreviewModal(true)}
                        style={{ marginLeft: 'auto' }}
                      >
                        <FaExpandArrowsAlt />
                        Full Screen Preview
                      </ExpandPreviewButton>
                    </PreviewTitle>
                    <div style={{ 
                      position: 'relative',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden'
                    }}>
                      {/* Email preview with subtle shadow */}
                      <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                        overflow: 'hidden',
                        maxHeight: '280px',
                        position: 'relative'
                      }}>
                        <iframe
                          srcDoc={generatePreviewHtml(selectedCampaign)}
                          style={{
                            width: '100%',
                            height: '380px',
                            border: 'none',
                            transform: 'scale(0.7)',
                            transformOrigin: 'top left',
                            pointerEvents: 'none'
                          }}
                          title="Email Preview"
                        />
                        
                        {/* Fade overlay to indicate more content */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '60px',
                          background: 'linear-gradient(transparent, rgba(255, 255, 255, 0.95))',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          paddingBottom: '0.75rem'
                        }}>
                          <div style={{
                            background: 'rgba(0, 0, 0, 0.1)',
                            color: '#666',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backdropFilter: 'blur(10px)'
                          }}>
                            Click "Full Screen Preview" for complete view
                          </div>
                        </div>
                      </div>

                      {/* Preview info */}
                      <div style={{
                        marginTop: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FaDesktop style={{ color: 'var(--primary)' }} />
                          Desktop View
                        </span>
                        <span>•</span>
                        <span>70% Scale</span>
                      </div>
                    </div>
                  </PreviewSection>

                  {/* Deliverability Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    backgroundColor: 'var(--surface)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {selectedCampaign?.emails_sent || 0}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Sent</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: 'var(--surface)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10B981' }}>
                      {selectedCampaign?.emails_sent > 0 
                        ? `${((selectedCampaign?.emails_opened || 0) / selectedCampaign?.emails_sent * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Open Rate</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      {selectedCampaign?.emails_opened || 0} opens
                    </div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: 'var(--surface)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3B82F6' }}>
                      {selectedCampaign?.emails_sent > 0 
                        ? `${((selectedCampaign?.emails_clicked || 0) / selectedCampaign?.emails_sent * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Click Rate</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      {selectedCampaign?.emails_clicked || 0} clicks
                    </div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: 'var(--surface)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F59E0B' }}>
                      {selectedCampaign?.emails_sent > 0 
                        ? `${(((selectedCampaign?.emails_sent || 0) - (selectedCampaign?.emails_bounced || 0)) / selectedCampaign?.emails_sent * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Delivery Rate</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      {(selectedCampaign?.emails_sent || 0) - (selectedCampaign?.emails_bounced || 0)} delivered
                    </div>
                  </div>
                </div>
                </>
              )}

              <ModalActions>
                <ModalButton onClick={handleCloseDeliverabilityModal}>
                  Close
                </ModalButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Email Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <PreviewModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreviewModal(false)}
          >
            <PreviewModalContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <PreviewModalHeader>
                <PreviewModalTitle>
                  {selectedCampaign?.subject || 'Email Preview'}
                </PreviewModalTitle>
                
                {/* Device Controls in Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <DeviceToggleContainer style={{ margin: 0, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.3rem' }}>
                    <DeviceToggle 
                      $active={previewDevice === 'mobile'}
                      onClick={() => setPreviewDevice('mobile')}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <FaMobileAlt />
                      Mobile
                    </DeviceToggle>
                    <DeviceToggle 
                      $active={previewDevice === 'tablet'}
                      onClick={() => setPreviewDevice('tablet')}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <FaTabletAlt />
                      Tablet
                    </DeviceToggle>
                    <DeviceToggle 
                      $active={previewDevice === 'desktop'}
                      onClick={() => setPreviewDevice('desktop')}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <FaDesktop />
                      Desktop
                    </DeviceToggle>
                  </DeviceToggleContainer>
                  
                  <PreviewModalClose onClick={() => setShowPreviewModal(false)}>
                    <FaTimes />
                  </PreviewModalClose>
                </div>
              </PreviewModalHeader>
              
              <PreviewModalBody>
                {/* Preview Area - Container handles scrolling */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflow: 'auto',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)'
                }}>
                  <PreviewContainer $device={previewDevice}>
                    <DeviceFrame $device={previewDevice}>
                      <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <iframe
                          srcDoc={generatePreviewHtml(selectedCampaign)}
                          style={{
                            width: '100%',
                            height: 'calc(100vh - 200px)',
                            border: 'none',
                            display: 'block',
                            overflow: 'hidden'
                          }}
                          scrolling="no"
                          title="Full Email Preview"
                        />
                      </div>
                    </DeviceFrame>
                  </PreviewContainer>
                </div>

                {/* Footer Info - Fixed at bottom */}
                <div style={{
                  textAlign: 'center',
                  padding: '1rem 2rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.8rem',
                  color: '#999',
                  background: 'rgba(0, 0, 0, 0.5)',
                  flexShrink: 0
                }}>
                  💡 Use the device buttons in the header to test how your email looks across different screen sizes
                </div>
              </PreviewModalBody>
            </PreviewModalContent>
          </PreviewModal>
        )}
      </AnimatePresence>
    </>
  );
}

export default CampaignsPage; 