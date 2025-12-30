"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { 
  FaTicketAlt, 
  FaSearch,
  FaEye,
  FaReply,
  FaUserCog,
  FaEdit,
  FaTimes,
  FaPlus,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaCheckCircle,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisV,
  FaChevronDown,
  FaChevronUp,
  FaPaperPlane,
  FaPaperclip,
  FaImage,
  FaVideo,
  FaFile,
  FaUser,
  FaUserTie,
  FaCrown,
  FaUserShield,
  FaChartLine,
  FaTrash,
  FaMagic
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { 
  createSupportTicketAdmin, 
  updateSupportTicketStatusAdmin,
  getSupportTicketsAdmin,
  getSupportTicketAdmin,
  deleteSupportTicketAdmin,
  addSupportTicketMessageAdmin,
  deleteSupportTicketMessageAdmin,
  uploadSupportTicketAttachment,
  getUserByIdAdmin
} from "@/app/actions/user-management";
import type { UserData } from "@/utils/stripe/admin-analytics";
import UserProfileModal from "@/components/admin/UserProfileModal";

import TableLoadingRow from "@/components/common/TableLoadingRow";

const TicketsContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const TicketsTitle = styled.h1`
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

const TicketsSubtitle = styled.p`
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

const FiltersSection = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const FiltersRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 1rem;
  align-items: end;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const SearchContainer = styled.div`
  position: relative;
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
  min-width: 150px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  ${(props) => {
    switch (props.$variant) {
      case 'success':
        return `
          background: linear-gradient(90deg, #28a745, #20c997);
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
          }
        `;
      case 'primary':
      default:
        return `
          background: linear-gradient(90deg, var(--primary), var(--accent));
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
          }
        `;
    }
  }}

  svg {
    font-size: 0.9rem;
  }
`;

const TableContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: visible !important;
  position: relative;

  @media (max-width: 768px) {
    overflow-x: auto;
    
    table {
      min-width: 1200px;
    }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  overflow: visible !important;

  /* Define column widths */
  th:nth-child(1), td:nth-child(1) { width: 100px; } /* Ticket ID */
  th:nth-child(2), td:nth-child(2) { width: 300px; } /* Subject */
  th:nth-child(3), td:nth-child(3) { width: 350px; } /* User */
  th:nth-child(4), td:nth-child(4) { width: 150px; } /* Subscription */
  th:nth-child(5), td:nth-child(5) { width: 120px; } /* Status */
  th:nth-child(6), td:nth-child(6) { width: 110px; } /* Created */
  th:nth-child(7), td:nth-child(7) { width: 160px; } /* Actions */
`;

const TableHeader = styled.thead`
  background-color: rgba(255, 255, 255, 0.02);
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  position: relative;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  svg {
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin-left: 0.5rem;
    vertical-align: middle;
  }
`;

const TableBody = styled.tbody`
  /* Ensure dropdowns can extend outside table body */
  overflow: visible !important;
  position: relative;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
  overflow: visible !important;
  position: relative;
  z-index: 1;
  
  &:hover {
    z-index: 2;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
  
  /* When status dropdown is open, bring row to front */
  &[data-status-open="true"] {
    z-index: 10010 !important;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  color: var(--text);
  font-size: 0.9rem;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;

  /* Allow wrapping and overflow for action buttons */
`;

const SubjectTableCell = styled(TableCell)`
  min-width: 250px;
  max-width: 400px;
`;

const UserTableCell = styled(TableCell)`
  min-width: 300px;
  max-width: 500px;
`;

const SubjectHeaderCell = styled(TableHeaderCell)`
  min-width: 250px;
  max-width: 400px;
`;

const UserHeaderCell = styled(TableHeaderCell)`
  min-width: 300px;
  max-width: 500px;
  &:last-child {
    white-space: normal;
    overflow: visible;
  }

  /* Allow overflow for cells with dropdowns (status, more menu) */
  &[data-has-dropdown] {
    overflow: visible !important;
    position: relative;
    z-index: 10010 !important;
  }
`;

const TicketId = styled.span`
  font-family: monospace;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
`;

const ReplyIcon = styled(FaReply)`
  font-size: 0.9rem !important;
  color: var(--text-secondary) !important;
  opacity: 0.7;
  flex-shrink: 0;
`;

const TicketSubject = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TicketUser = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
    text-decoration: underline;
  }
`;

const SubscriptionBadge = styled.span<{
  $color: string;
  $variant?: "default" | "premium";
}>`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

  background-color: ${(props) => props.$color};
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);

  ${(props) =>
    props.$variant === "premium" &&
    `
    background: linear-gradient(135deg, ${props.$color}, ${props.$color}dd);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  `}

  svg {
    font-size: 0.7rem;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
  }
`;

const SubscriptionCell = styled(TableCell)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const StatusBadge = styled.span<{ $status: string; $clickable?: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  position: relative;
  ${props => props.$clickable ? `
    cursor: pointer;
    user-select: none;
    transition: transform 0.2s ease, opacity 0.2s ease;
    &:hover {
      transform: scale(1.05);
      opacity: 0.9;
    }
  ` : ''}
  
  ${(props) => {
    switch (props.$status) {
      case 'open':
        return `
          background-color: #ff6600;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
      case 'in_progress':
      case 'inProgress':
        return `
          background-color: #3498db;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
      case 'resolved':
        return `
          background-color: #20c997;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
      case 'closed':
        return `
          background-color: #6c757d;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
      default:
        return `
          background-color: #6c757d;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
    }
  }}

  svg {
    font-size: 0.7rem;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
  }
`;

const StatusDropdown = styled(motion.div)<{ $top?: number; $left?: number }>`
  position: fixed;
  top: ${props => props.$top ? `${props.$top}px` : 'auto'};
  left: ${props => props.$left ? `${props.$left}px` : 'auto'};
  background-color: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 99999 !important;
  min-width: 160px;
  overflow: visible !important;
  backdrop-filter: blur(10px);
`;

const StatusDropdownItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  color: var(--text);
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s ease;
  text-transform: capitalize;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &:first-child {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }

  &:last-child {
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  svg {
    font-size: 0.8rem;
  }
`;

const StatusContainer = styled.div`
  position: relative;
  display: inline-block;
  overflow: visible !important;
  z-index: 10010 !important;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const PaginationInfo = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
`;

const PaginationEllipsis = styled.span`
  padding: 0.5rem;
  color: var(--text-secondary);
`;

const PaginationButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  margin: 0 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background-color: ${props => props.$active ? 'var(--primary)' : 'transparent'};
  color: ${props => props.$active ? 'white' : 'var(--text)'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background-color: var(--primary);
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// More Menu Components
const MoreMenuContainer = styled.div<{ $isOpen?: boolean }>`
  position: relative;
  display: inline-block;
  z-index: ${props => props.$isOpen ? 10005 : 1};
  overflow: visible;
`;

const MoreMenuButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }

  svg {
    font-size: 1rem;
  }
`;

const MoreMenuDropdown = styled(motion.div)<{ $top?: number; $right?: number }>`
  position: fixed;
  top: ${props => props.$top !== undefined ? `${props.$top}px` : 'auto'};
  right: ${props => props.$right !== undefined ? `${props.$right}px` : 'auto'};
  background-color: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 99999 !important;
  min-width: 160px;
  overflow: visible !important;
  backdrop-filter: blur(10px);
  transform: translateZ(0);
  pointer-events: auto;
  visibility: visible;
  opacity: 1;
  
  /* Handle edge cases where dropdown might go off-screen */
  @media (max-width: 768px) {
    right: auto;
    left: ${props => props.$right !== undefined ? `calc(100vw - ${props.$right}px - 160px)` : 'auto'};
    min-width: 140px;
  }
`;

const MoreMenuItem = styled.button<{ $variant?: 'danger' }>`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  color: ${props => props.$variant === 'danger' ? '#e74c3c' : 'var(--text)'};
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;

  &:hover {
    background-color: ${props => props.$variant === 'danger' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  }

  svg {
    font-size: 0.8rem;
    width: 16px;
  }
`;

// Expandable Row Components
const ExpandButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }

  svg {
    font-size: 0.9rem;
    transition: transform 0.2s ease;
  }
`;

const ExpandableRow = styled(motion.tr)`
  background-color: rgba(255, 255, 255, 0.02);
  overflow: visible !important;
  position: relative;
  z-index: 1;
`;

const ExpandableCell = styled.td`
  padding: 0;
  border: none;
  overflow: visible !important;
  position: relative;
  z-index: 1;
`;

const ConversationContainer = styled(motion.div)`
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.01);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  overflow: visible !important;
  position: relative;
  z-index: 1;
`;

const ConversationHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const ConversationTitle = styled.h4`
  color: var(--text);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
`;

const ConversationMeta = styled.div`
  color: var(--text-secondary);
  font-size: 0.85rem;
  display: flex;
  gap: 1rem;
`;

const MessagesContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const JumpToCurrentButton = styled.button<{ $visible: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
  z-index: 100;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};

  &:hover {
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateX(-50%) translateY(0);
  }

  svg {
    font-size: 0.75rem;
  }
`;

const MessageInputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Message = styled.div<{ $isAdmin?: boolean }>`
  display: flex;
  margin-bottom: 0;
  align-items: flex-start;
  gap: 0.75rem;
  flex-direction: ${props => props.$isAdmin ? 'row-reverse' : 'row'};
  ${props => props.$isAdmin ? `
    align-self: flex-end;
    width: fit-content;
    max-width: 75%;
    margin-left: auto;
  ` : `
    width: fit-content;
    max-width: 75%;
  `}
`;

const MessageAvatar = styled.div<{ $isAdmin?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.$isAdmin ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'linear-gradient(135deg, #6c757d, #495057)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  flex-shrink: 0;
`;

const MessageBubble = styled.div<{ $isAdmin?: boolean }>`
  max-width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 18px;
  background-color: ${props => props.$isAdmin ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$isAdmin ? 'white' : 'var(--text)'};
  position: relative;
  word-wrap: break-word;

  /* Message tail */
  &::before {
    content: '';
    position: absolute;
    top: 10px;
    width: 0;
    height: 0;
    border: 6px solid transparent;
    ${props => props.$isAdmin ? `
      right: -12px;
      border-left-color: var(--primary);
    ` : `
      left: -12px;
      border-right-color: rgba(255, 255, 255, 0.08);
    `}
  }
`;

const MessageContent = styled.div`
  margin-bottom: 0.25rem;
  line-height: 1.4;
`;

const MessageTime = styled.div`
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 0.25rem;
`;

const MessageAttachment = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 600px;
`;

const AttachmentPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const AttachmentIcon = styled.div`
  color: var(--primary);
  font-size: 1rem;
`;

const AttachmentInfo = styled.div`
  flex: 1;
`;

const AttachmentName = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
`;

const AttachmentSize = styled.div`
  font-size: 0.7rem;
  color: var(--text-secondary);
`;

const AttachmentContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const AttachmentLink = styled.a`
  color: var(--primary);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  background-color: rgba(108, 99, 255, 0.1);
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(108, 99, 255, 0.2);
    text-decoration: underline;
  }
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 400px;
  width: auto;
  height: auto;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
  display: block;
  margin-bottom: 0.5rem;

  &:hover {
    transform: scale(1.02);
    opacity: 0.9;
  }
`;

const VideoPreview = styled.video`
  max-width: 100%;
  max-height: 400px;
  width: auto;
  height: auto;
  border-radius: 8px;
  display: block;
  margin-bottom: 0.5rem;
`;

const MessageInput = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const MessageTextArea = styled.textarea`
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  resize: none;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const MessageActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const AttachButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }

  svg {
    font-size: 1rem;
  }
`;

const SendButton = styled.button`
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  color: white;
  cursor: pointer;
  padding: 10px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  svg {
    font-size: 1rem;
  }
`;

const FileInput = styled.input`
  display: none;
`;

// Create Ticket Modal Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px;
    align-items: flex-end;
  }
`;

const CreateTicketModal = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;

  @media (max-width: 768px) {
    padding: 1.5rem;
    max-height: 95vh;
    border-radius: 8px;
  }
`;

const TicketModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  max-width: 1400px;
  width: 95%;
  height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 100%;
    height: 95vh;
    max-height: 95vh;
    padding: 1rem;
    border-radius: 8px;
  }
`;

const ConversationHeaderGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto auto auto auto;
  gap: 1rem;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    
    > div:nth-child(3),
    > div:nth-child(4),
    > div:nth-child(5),
    > div:nth-child(6) {
      grid-column: span 1;
    }
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s ease;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--text);
  }
`;

// Delete Confirmation Modal Components
const DeleteModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const DeleteModalTitle = styled.h3`
  font-size: 1.5rem;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  svg {
    color: #e74c3c;
  }
`;

const DeleteModalMessage = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const DeleteModalDetails = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: left;
`;

const DeleteModalDetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

const DeleteModalDetailLabel = styled.span`
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const DeleteModalDetailValue = styled.span`
  color: var(--text);
  font-size: 0.9rem;
`;

const DeleteModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const AIModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;

  @media (max-width: 768px) {
    padding: 1.5rem;
    max-height: 95vh;
    border-radius: 8px;
  }
`;

const AIModalSection = styled.div`
  margin-bottom: 1.5rem;
`;

const AIModalLabel = styled.label`
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const AIModalTextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const AIModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const AIModalButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${props => props.$variant === 'primary' ? `
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
    }
  ` : `
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AIButton = styled.button`
  background: transparent;
  color: white;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 1.2rem;
    color: white;
  }
`;

const DeleteModalButton = styled(motion.button)<{ $variant?: 'danger' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  ${props => props.$variant === 'danger' ? `
    background-color: #e74c3c;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #c0392b;
    }
  ` : `
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
    
    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.15);
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    font-size: 0.9rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background-color: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background-color: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background-color: rgba(255, 255, 255, 0.08);
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  border-left: 3px solid #ef4444;
`;

const SuccessMessage = styled.div`
  color: #10b981;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  border-left: 3px solid #10b981;
`;

interface TicketMessage {
  id: string;
  content: string;
  is_admin: boolean;
  user_id: string;
  user_email: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  attachments: Array<{
    id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    attachment_type: string;
    url: string | null;
    created_at: string;
  }>;
}

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string | null;
  status: string;
  user_id: string;
  user_email: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  user_subscription?: string;
  user_has_nfr?: boolean;
  last_reply_is_admin?: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  messages?: TicketMessage[];
}

function SupportTicketsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMoreMenu, setOpenMoreMenu] = useState<string | null>(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [moreMenuPosition, setMoreMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState<Map<string, boolean>>(new Map());
  const messagesContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newMessages, setNewMessages] = useState<{[key: string]: string}>({});
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: boolean}>({});
  const [pendingAttachments, setPendingAttachments] = useState<{[key: string]: File[]}>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTicketForm, setCreateTicketForm] = useState({
    subject: "",
    description: "",
  });
  const [createTicketLoading, setCreateTicketLoading] = useState(false);
  const [createTicketError, setCreateTicketError] = useState<string | null>(null);
  const [createTicketSuccess, setCreateTicketSuccess] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketDetails, setTicketDetails] = useState<Map<string, Ticket>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const itemsPerPage = 10;
  
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();
  const fileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const getDisplayName = (user: UserData) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "Unknown User";
  };

  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  // Show page immediately - no early returns
  const showContent = !languageLoading && translationsLoaded && user;

  // Fetch tickets from database
  useEffect(() => {
    if (showContent) {
      fetchTickets();
    }
  }, [showContent]);

  // Handle ticket query parameter to open ticket modal
  useEffect(() => {
    if (showContent) {
      const ticketId = searchParams.get('ticket');
      if (ticketId && ticketId !== selectedTicketId) {
        openTicketModal(ticketId);
        // Remove query parameter from URL after opening modal
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('ticket');
        const newUrl = newSearchParams.toString() 
          ? `${window.location.pathname}?${newSearchParams.toString()}`
          : window.location.pathname;
        router.replace(newUrl, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContent, searchParams]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const result = await getSupportTicketsAdmin();
      if (result.tickets) {
        setTickets(result.tickets);
      } else {
        console.error("Error fetching tickets:", result.error);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketDetails = async (ticketId: string, forceRefresh: boolean = false) => {
    // If already loading and not forcing refresh, skip
    if (!forceRefresh && loadingDetails.has(ticketId)) {
      return;
    }

    // If already loaded and not forcing refresh, skip
    if (!forceRefresh && ticketDetails.has(ticketId)) {
      return;
    }

    setLoadingDetails(prev => new Set(prev).add(ticketId));

    try {
      const result = await getSupportTicketAdmin(ticketId);
      if (result.ticket) {
        setTicketDetails(prev => new Map(prev).set(ticketId, result.ticket!));
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
    } finally {
      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }
  };

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Only close if clicking outside of any more menu container
      if (!target.closest('[data-more-menu]')) {
        setOpenMoreMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Temporarily disabled admin check for testing
  // if (user.profile?.subscription !== "admin") {
  //   return null;
  // }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateTicketError(null);
    setCreateTicketSuccess(null);

    if (!createTicketForm.subject.trim() || !createTicketForm.description.trim() || !user?.id) {
      setCreateTicketError("Please fill in all required fields");
      return;
    }

    setCreateTicketLoading(true);

    try {
      const result = await createSupportTicketAdmin({
        subject: createTicketForm.subject.trim(),
        description: createTicketForm.description.trim(),
        userId: user.id,
      });

      if (result.success && result.ticket) {
        setCreateTicketSuccess(`Ticket ${result.ticket.ticket_number} created successfully!`);
        setCreateTicketForm({
          subject: "",
          description: "",
        });
        // Refresh tickets
        await fetchTickets();
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateTicketSuccess(null);
        }, 2000);
      } else {
        setCreateTicketError(result.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      setCreateTicketError("An unexpected error occurred");
    } finally {
      setCreateTicketLoading(false);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateTicketForm({
      subject: "",
      description: "",
    });
    setCreateTicketError(null);
    setCreateTicketSuccess(null);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <FaCheckCircle />;
      case 'inProgress':
      case 'in_progress':
        return <FaClock />;
      case 'resolved':
        return <FaCheckCircle />;
      case 'closed':
        return <FaTimes />;
      default:
        return <FaClock />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.user_email || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    // Normalize status for comparison (in_progress vs inProgress)
    let normalizedStatus = ticket.status;
    if (normalizedStatus === "in_progress") {
      normalizedStatus = "inProgress";
    }
    
    const matchesFilter = filterStatus === "all" || normalizedStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = a[sortField as keyof typeof a];
    let bValue = b[sortField as keyof typeof b];
    
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // When a ticket is expanded, show only that ticket at the top
  const ticketsToDisplay = sortedTickets;

  const totalPages = Math.ceil(ticketsToDisplay.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTickets = ticketsToDisplay.slice(startIndex, startIndex + itemsPerPage);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
    }),
  };

  const openTicketModal = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    // Load ticket details if not already loaded
    if (!ticketDetails.has(ticketId)) {
      fetchTicketDetails(ticketId, false);
    }
    // Force scroll check after modal opens
    setTimeout(() => {
      const container = messagesContainerRefs.current.get(ticketId);
      if (container) {
        handleScroll(ticketId, container);
      }
    }, 300);
  };

  const closeTicketModal = () => {
    // Clean up refs and scroll state when closing modal
    if (selectedTicketId) {
      const container = messagesContainerRefs.current.get(selectedTicketId);
      if (container) {
        const oldHandler = (container as any)._scrollHandler;
        if (oldHandler) {
          container.removeEventListener('scroll', oldHandler);
        }
      }
      messagesContainerRefs.current.delete(selectedTicketId);
      setIsScrolledUp(prev => {
        const newMap = new Map(prev);
        newMap.delete(selectedTicketId);
        return newMap;
      });
    }
    setSelectedTicketId(null);
  };

  // Handle scroll to detect if user is scrolled up
  const handleScroll = useCallback((ticketId: string, element: HTMLDivElement) => {
    if (!element || !ticketId) return;
    const threshold = 50; // Show button if more than 50px from bottom
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Only show button if container is actually scrollable
    if (scrollHeight <= clientHeight) {
      setIsScrolledUp(prev => {
        const currentValue = prev.get(ticketId);
        if (currentValue === false) return prev; // No change needed
        const newMap = new Map(prev);
        newMap.set(ticketId, false);
        return newMap;
      });
      return;
    }
    
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < threshold;
    const shouldShow = !isNearBottom;
    
    setIsScrolledUp(prev => {
      const currentValue = prev.get(ticketId);
      if (currentValue === shouldShow) return prev; // No change needed
      const newMap = new Map(prev);
      newMap.set(ticketId, shouldShow);
      return newMap;
    });
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback((ticketId: string) => {
    const container = messagesContainerRefs.current.get(ticketId);
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Set ref callback for messages container
  const setMessagesContainerRef = useCallback((ticketId: string, element: HTMLDivElement | null) => {
    if (!ticketId) return;
    
    const previousElement = messagesContainerRefs.current.get(ticketId);
    
    // If element hasn't changed, don't do anything
    if (previousElement === element) {
      return;
    }
    
    // Clean up previous listener if element changed
    if (previousElement) {
      const oldHandler = (previousElement as any)._scrollHandler;
      if (oldHandler) {
        previousElement.removeEventListener('scroll', oldHandler);
      }
    }
    
    if (element && ticketId) {
      messagesContainerRefs.current.set(ticketId, element);
      // Add scroll listener
      const scrollHandler = () => {
        if (ticketId && element && messagesContainerRefs.current.get(ticketId) === element) {
          handleScroll(ticketId, element);
        }
      };
      element.addEventListener('scroll', scrollHandler, { passive: true });
      
      // Store handler for cleanup
      (element as any)._scrollHandler = scrollHandler;
      
      // Check initial scroll position after a short delay to ensure content is rendered
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (ticketId && element && messagesContainerRefs.current.get(ticketId) === element) {
            handleScroll(ticketId, element);
          }
        }, 100);
      });
    } else if (element === null && previousElement) {
      // Only clean up if we had a previous element and now it's null (unmounting)
      messagesContainerRefs.current.delete(ticketId);
      // Don't delete the scroll state - preserve it in case the element is recreated
    }
  }, [handleScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      messagesContainerRefs.current.forEach((element, ticketId) => {
        if ((element as any)._scrollHandler) {
          element.removeEventListener('scroll', (element as any)._scrollHandler);
        }
      });
      messagesContainerRefs.current.clear();
    };
  }, []);

  // Fetch ticket details when a ticket is selected
  useEffect(() => {
    // Fetch ticket details if a ticket is selected
    if (selectedTicketId && !ticketDetails.has(selectedTicketId) && !loadingDetails.has(selectedTicketId)) {
      fetchTicketDetails(selectedTicketId, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId]);

  // Re-evaluate scroll position when ticket details change
  useEffect(() => {
    if (selectedTicketId) {
      // Use multiple timeouts to catch content loading at different stages
      const checkScroll = () => {
        const container = messagesContainerRefs.current.get(selectedTicketId);
        if (container) {
          // Don't auto-scroll, just check current position
          handleScroll(selectedTicketId, container);
        }
      };
      
      // Check immediately and at intervals
      requestAnimationFrame(() => {
        setTimeout(checkScroll, 50);
        setTimeout(checkScroll, 200);
        setTimeout(checkScroll, 500);
        setTimeout(checkScroll, 1000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketDetails, selectedTicketId]);
  
  // Auto-scroll to bottom when messages first load (but don't interfere with scroll detection)
  useEffect(() => {
    if (selectedTicketId && ticketDetails.get(selectedTicketId)?.messages) {
      const container = messagesContainerRefs.current.get(selectedTicketId);
      if (container) {
        // Only auto-scroll if we're already at or near the bottom
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // If we're within 100px of bottom, auto-scroll to bottom
        if (distanceFromBottom < 100) {
          setTimeout(() => {
            container.scrollTop = container.scrollHeight;
            // Re-check scroll position after auto-scroll
            setTimeout(() => {
              handleScroll(selectedTicketId, container);
            }, 100);
          }, 100);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketDetails.get(selectedTicketId)?.messages?.length, selectedTicketId]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    if (!openStatusDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-status-dropdown]')) {
        setOpenStatusDropdown(null);
        setStatusDropdownPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openStatusDropdown]);

  // Close more menu when clicking outside
  useEffect(() => {
    if (!openMoreMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-more-menu]')) {
        setOpenMoreMenu(null);
        setMoreMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMoreMenu]);

  const handleStatusChange = async (ticketId: string, newStatus: "open" | "in_progress" | "resolved" | "closed") => {
    setUpdatingStatus(ticketId);
    setOpenStatusDropdown(null);
    setStatusDropdownPosition(null);
    
    try {
      const result = await updateSupportTicketStatusAdmin(ticketId, newStatus);
      if (result.success) {
        // Update ticket in state
        setTickets(prev => prev.map(t => 
          t.id === ticketId ? { ...t, status: newStatus } : t
        ));
      } else {
        alert(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("An error occurred while updating the status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleGenerateAIResponse = async () => {
    if (!aiPrompt.trim() || !selectedTicketId) {
      return;
    }

    setAiLoading(true);
    setAiResponse("");

    try {
      const response = await fetch('/api/admin/support-tickets/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          ticketId: selectedTicketId,
          allTickets: tickets.map(t => ({
            ticket_number: t.ticket_number,
            subject: t.subject,
            description: t.description,
            status: t.status,
            user_email: t.user_email,
            created_at: t.created_at,
            updated_at: t.updated_at,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Check if it's a fallback response
        if (data.isFallback) {
          setAiResponse(`⚠️ ${data.error || 'Using template response'}\n\n${data.response}`);
        } else {
          setAiResponse(data.response);
        }
      } else {
        // Handle specific error cases
        if (response.status === 429 || data.errorCode === 'QUOTA_EXCEEDED') {
          setAiResponse(`⚠️ OpenAI API quota exceeded. Please check your OpenAI billing and plan details.\n\nYou can still write your response manually below.`);
        } else if (response.status === 401 || data.errorCode === 'INVALID_API_KEY') {
          setAiResponse(`⚠️ OpenAI API key is invalid or expired. Please check your API configuration.\n\nYou can still write your response manually below.`);
        } else {
          setAiResponse(`Error: ${data.error || 'Failed to generate response'}\n\nYou can still write your response manually below.`);
        }
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      setAiResponse('Error: Failed to generate response. Please try again.\n\nYou can still write your response manually below.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleInsertAIResponse = () => {
    if (aiResponse && selectedTicketId) {
      setNewMessages(prev => ({
        ...prev,
        [selectedTicketId]: (prev[selectedTicketId] || '') + (prev[selectedTicketId] ? '\n\n' : '') + aiResponse,
      }));
      setShowAIModal(false);
      setAiPrompt("");
      setAiResponse("");
    }
  };

  const handleSendMessage = async (ticketId: string) => {
    const messageContent = newMessages[ticketId]?.trim();
    const attachments = pendingAttachments[ticketId] || [];
    
    if (!messageContent && attachments.length === 0) {
      return;
    }

    // If no message content but there are attachments, add a default message
    const finalMessage = messageContent || "Sent an attachment";

    try {
      // Create the message first
      const result = await addSupportTicketMessageAdmin(ticketId, finalMessage, true);
      if (!result.success || !result.messageId) {
        alert(result.error || "Failed to send message");
        return;
      }

      // Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const uploadResult = await uploadSupportTicketAttachment(
            ticketId,
            result.messageId,
            file
          );
          if (!uploadResult.success) {
            console.error("Error uploading attachment:", uploadResult.error);
            // Continue with other attachments even if one fails
          }
        }
      }

      // Clear message input and pending attachments
      setNewMessages(prev => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      setPendingAttachments(prev => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      
      // Clear file input
      if (fileInputRefs.current[ticketId]) {
        fileInputRefs.current[ticketId].value = '';
      }

      // Refresh ticket details (force refresh to get new message and attachments)
      await fetchTicketDetails(ticketId, true);
      // Refresh tickets list to update updated_at
      await fetchTickets();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("An error occurred while sending the message");
    }
  };

  // More menu handlers
  const handleMoreMenuClick = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openMoreMenu === ticketId) {
      setOpenMoreMenu(null);
      setMoreMenuPosition(null);
    } else {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      setMoreMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
      setOpenMoreMenu(ticketId);
    }
  };

  const handleMoreMenuAction = async (action: string, ticket: Ticket) => {
    setOpenMoreMenu(null);
    setMoreMenuPosition(null);
    
    switch (action) {
      case 'view':
        openTicketModal(ticket.id);
        break;
      case 'delete':
        setTicketToDelete(ticket);
        setShowDeleteModal(true);
        break;
      default:
        break;
    }
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteSupportTicketAdmin(ticketToDelete.id);
      if (result.success) {
        // Remove from state
        setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
        setTicketDetails(prev => {
          const next = new Map(prev);
          next.delete(ticketToDelete.id);
          return next;
        });
        setShowDeleteModal(false);
        setTicketToDelete(null);
      } else {
        alert(result.error || "Failed to delete ticket");
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      alert("An error occurred while deleting the ticket");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTicketToDelete(null);
  };

  const handleStatusClick = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openStatusDropdown === ticketId) {
      setOpenStatusDropdown(null);
      setStatusDropdownPosition(null);
    } else {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      setStatusDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
      setOpenStatusDropdown(ticketId);
    }
  };

  const getSubscriptionBadgeColor = (subscription: string) => {
    switch (subscription) {
      case "monthly":
        return "#4c46d6"; // Darker purple
      case "annual":
        return "#2d8a7a"; // Darker teal
      case "lifetime":
        return "#d4a017"; // Darker gold
      case "admin":
        return "#d63447"; // Darker red
      case "nfr":
        return "#9b59b6"; // Purple for NFR
      default:
        return "#6c757d"; // Darker gray
    }
  };

  const getSubscriptionIcon = (subscription: string) => {
    switch (subscription) {
      case "admin":
        return <FaUserShield />;
      case "lifetime":
        return <FaCrown />;
      case "nfr":
        return <FaCrown />;
      default:
        return null;
    }
  };

  const isSubscriptionPremium = (subscription: string) => {
    return ["lifetime", "admin"].includes(subscription);
  };

  const handleViewUser = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await getUserByIdAdmin(userId);
      if (result.user) {
        setSelectedUser(result.user);
        setShowUserModal(true);
      } else {
        alert(result.error || "Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      alert("Failed to fetch user data");
    }
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  const handleFileUpload = (ticketId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Convert FileList to Array
    const fileArray = Array.from(files);
    
    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    fileArray.forEach((file) => {
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (exceeds 10MB limit)`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      alert(`Some files were too large and were not added:\n${invalidFiles.join('\n')}`);
    }

    if (validFiles.length > 0) {
      // Add files to pending attachments
      setPendingAttachments(prev => ({
        ...prev,
        [ticketId]: [...(prev[ticketId] || []), ...validFiles]
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, ticketId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(ticketId);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderAttachment = (attachment: any) => {
    const { type, name, size, url } = attachment;

    switch (type) {
      case 'image':
        return (
          <MessageAttachment key={name}>
            <ImagePreview src={url} alt={name} />
            <AttachmentPreview>
              <AttachmentIcon><FaImage /></AttachmentIcon>
              <AttachmentInfo>
                <AttachmentName>{name}</AttachmentName>
                <AttachmentSize>{size}</AttachmentSize>
              </AttachmentInfo>
            </AttachmentPreview>
          </MessageAttachment>
        );
      case 'video':
        return (
          <MessageAttachment key={name}>
            <VideoPreview controls>
              <source src={url} type="video/mp4" />
            </VideoPreview>
            <AttachmentPreview>
              <AttachmentIcon><FaVideo /></AttachmentIcon>
              <AttachmentInfo>
                <AttachmentName>{name}</AttachmentName>
                <AttachmentSize>{size}</AttachmentSize>
              </AttachmentInfo>
            </AttachmentPreview>
          </MessageAttachment>
        );
      case 'file':
      default:
        return (
          <MessageAttachment key={name}>
            <AttachmentPreview>
              <AttachmentIcon><FaFile /></AttachmentIcon>
              <AttachmentInfo>
                <AttachmentName>{name}</AttachmentName>
                <AttachmentSize>{size}</AttachmentSize>
              </AttachmentInfo>
            </AttachmentPreview>
          </MessageAttachment>
        );
    }
  };

  return (
    <>
      <NextSEO
        title={t("admin.supportTickets", "Support Tickets")}
        description={t("admin.supportTickets.subtitle", "Manage customer support requests and issues")}
      />
      
      <TicketsContainer>
        <TicketsTitle>
          <FaTicketAlt />
          {showContent ? t("admin.supportTickets.title", "Support Tickets") : "Support Tickets"}
        </TicketsTitle>
        <TicketsSubtitle>
          {showContent ? t("admin.supportTickets.subtitle", "Manage customer support requests and issues") : "Manage customer support requests and issues"}
        </TicketsSubtitle>

        {showContent && (
          <>
        <FiltersSection>
          <FiltersRow>
            <SearchContainer>
              <SearchIcon>
                <FaSearch />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder={t("admin.supportTickets.searchPlaceholder", "Search tickets by subject, user, or ticket ID...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>
            
            <FilterSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">{t("admin.supportTickets.filters.all", "All Tickets")}</option>
              <option value="open">{t("admin.supportTickets.filters.open", "Open")}</option>
              <option value="in_progress">{t("admin.supportTickets.filters.inProgress", "In Progress")}</option>
              <option value="resolved">{t("admin.supportTickets.filters.resolved", "Resolved")}</option>
              <option value="closed">{t("admin.supportTickets.filters.closed", "Closed")}</option>
            </FilterSelect>

            <ActionButton $variant="success" onClick={() => setShowCreateModal(true)}>
              <FaPlus />
              {t("admin.supportTickets.createTicket", "Create Ticket")}
            </ActionButton>
          </FiltersRow>
        </FiltersSection>

        <TableContainer>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell onClick={() => handleSort('id')}>
                  {t("admin.supportTickets.ticketTable.id", "Ticket ID")}
                  {getSortIcon('id')}
                </TableHeaderCell>
                <SubjectHeaderCell onClick={() => handleSort('subject')}>
                  {t("admin.supportTickets.ticketTable.subject", "Subject")}
                  {getSortIcon('subject')}
                </SubjectHeaderCell>
                <UserHeaderCell onClick={() => handleSort('user')}>
                  {t("admin.supportTickets.ticketTable.user", "User")}
                  {getSortIcon('user')}
                </UserHeaderCell>
                <TableHeaderCell>
                  {t("admin.supportTickets.ticketTable.subscription", "Subscription")}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('status')}>
                  {t("admin.supportTickets.ticketTable.status", "Status")}
                  {getSortIcon('status')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('created')}>
                  {t("admin.supportTickets.ticketTable.created", "Created")}
                  {getSortIcon('created')}
                </TableHeaderCell>
                <TableHeaderCell>
                  {t("admin.supportTickets.ticketTable.actions", "Actions")}
                </TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {loadingTickets ? (
                <TableLoadingRow colSpan={7} message="Loading tickets..." />
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No support tickets found
                  </td>
                </tr>
              ) : paginatedTickets.map((ticket) => (
                <React.Fragment key={ticket.id}>
                  <TableRow data-status-open={openStatusDropdown === ticket.id ? "true" : "false"}>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TicketId 
                        onClick={() => openTicketModal(ticket.id)}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {ticket.ticket_number}
                      </TicketId>
                      {ticket.last_reply_is_admin && (
                        <ReplyIcon 
                          title="Replied to user"
                        />
                      )}
                    </div>
                  </TableCell>
                  <SubjectTableCell>
                    <TicketSubject 
                      onClick={() => openTicketModal(ticket.id)}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {ticket.subject}
                    </TicketSubject>
                  </SubjectTableCell>
                  <UserTableCell>
                    {ticket.user_id ? (
                      <TicketUser onClick={(e) => handleViewUser(ticket.user_id, e)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span>{ticket.user_email || "Unknown"}</span>
                          {(ticket.user_first_name || ticket.user_last_name) && (
                            <span style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '0.9em',
                              fontWeight: 'normal'
                            }}>
                              ({[ticket.user_first_name, ticket.user_last_name].filter(Boolean).join(' ')})
                            </span>
                          )}
                        </div>
                      </TicketUser>
                    ) : (
                      <TicketUser>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span>{ticket.user_email || "Unknown"}</span>
                          {(ticket.user_first_name || ticket.user_last_name) && (
                            <span style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '0.9em',
                              fontWeight: 'normal'
                            }}>
                              ({[ticket.user_first_name, ticket.user_last_name].filter(Boolean).join(' ')})
                            </span>
                          )}
                        </div>
                      </TicketUser>
                    )}
                  </UserTableCell>
                  <SubscriptionCell>
                    <SubscriptionBadge
                      $color={getSubscriptionBadgeColor(
                        ticket.user_has_nfr ? "nfr" : (ticket.user_subscription || "none")
                      )}
                      $variant={
                        ticket.user_has_nfr || isSubscriptionPremium(ticket.user_subscription || "none")
                          ? "premium"
                          : "default"
                      }
                    >
                      {ticket.user_has_nfr ? <FaCrown /> : getSubscriptionIcon(ticket.user_subscription || "none")}
                      {ticket.user_has_nfr ? "NFR" : (ticket.user_subscription || "none")}
                    </SubscriptionBadge>
                  </SubscriptionCell>
                  <TableCell data-has-dropdown>
                    <StatusContainer data-status-dropdown>
                      <StatusBadge 
                        $status={ticket.status} 
                        $clickable
                        onClick={(e) => handleStatusClick(ticket.id, e)}
                      >
                        {getStatusIcon(ticket.status)}
                        {t(`admin.supportTickets.filters.${ticket.status}`, ticket.status)}
                        {updatingStatus === ticket.id && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            style={{
                              width: "12px",
                              height: "12px",
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTop: "2px solid white",
                              borderRadius: "50%",
                            }}
                          />
                        )}
                      </StatusBadge>
                      <AnimatePresence>
                        {openStatusDropdown === ticket.id && statusDropdownPosition && (
                          <StatusDropdown
                            $top={statusDropdownPosition.top}
                            $left={statusDropdownPosition.left}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <StatusDropdownItem
                              $active={ticket.status === 'open'}
                              onClick={() => handleStatusChange(ticket.id, 'open')}
                            >
                              {getStatusIcon('open')}
                              Open
                            </StatusDropdownItem>
                            <StatusDropdownItem
                              $active={ticket.status === 'in_progress' || ticket.status === 'inProgress'}
                              onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                            >
                              {getStatusIcon('inProgress')}
                              In Progress
                            </StatusDropdownItem>
                            <StatusDropdownItem
                              $active={ticket.status === 'resolved'}
                              onClick={() => handleStatusChange(ticket.id, 'resolved')}
                            >
                              {getStatusIcon('resolved')}
                              Resolved
                            </StatusDropdownItem>
                            <StatusDropdownItem
                              $active={ticket.status === 'closed'}
                              onClick={() => handleStatusChange(ticket.id, 'closed')}
                            >
                              {getStatusIcon('closed')}
                              Closed
                            </StatusDropdownItem>
                          </StatusDropdown>
                        )}
                      </AnimatePresence>
                    </StatusContainer>
                  </TableCell>
                  <TableCell>{formatDate(ticket.created_at)}</TableCell>
                  <TableCell data-has-dropdown>
                    <MoreMenuContainer 
                      data-more-menu 
                      onClick={(e) => e.stopPropagation()}
                      $isOpen={openMoreMenu === ticket.id}
                    >
                      <MoreMenuButton
                        onClick={(e) => handleMoreMenuClick(ticket.id, e)}
                      >
                        <FaEllipsisV />
                      </MoreMenuButton>

                      <AnimatePresence>
                        {openMoreMenu === ticket.id && moreMenuPosition && (
                          <MoreMenuDropdown
                            key={`more-menu-${ticket.id}`}
                            $top={moreMenuPosition.top}
                            $right={moreMenuPosition.right}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                          >
                            <MoreMenuItem onClick={() => handleMoreMenuAction('view', ticket)}>
                              <FaEye />
                              {t("admin.supportTickets.ticketActions.view", "View Ticket")}
                            </MoreMenuItem>
                            <MoreMenuItem 
                              $variant="danger"
                              onClick={() => handleMoreMenuAction('delete', ticket)}
                            >
                              <FaTimes />
                              {t("admin.supportTickets.ticketActions.delete", "Delete")}
                            </MoreMenuItem>
                          </MoreMenuDropdown>
                        )}
                      </AnimatePresence>
                    </MoreMenuContainer>
                  </TableCell>
                </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          
          <Pagination>
            <PaginationInfo>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedTickets.length)} of {sortedTickets.length} tickets
            </PaginationInfo>
            <PaginationButtons>
              <PaginationButton 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <FaChevronLeft />
              </PaginationButton>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === totalPages || 
                  Math.abs(page - currentPage) <= 2
                )
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <PaginationEllipsis>...</PaginationEllipsis>
                    )}
                    <PaginationButton
                      onClick={() => setCurrentPage(page)}
                      $active={currentPage === page}
                    >
                      {page}
                    </PaginationButton>
                  </React.Fragment>
                ))}
              <PaginationButton 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <FaChevronRight />
              </PaginationButton>
            </PaginationButtons>
          </Pagination>
        </TableContainer>
        </>
        )}

        {/* Create Ticket Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseCreateModal}
            >
              <CreateTicketModal
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <ModalTitle>
                    <FaTicketAlt />
                    Create Support Ticket
                  </ModalTitle>
                  <CloseButton onClick={handleCloseCreateModal}>
                    <FaTimes />
                  </CloseButton>
                </ModalHeader>

                <form onSubmit={handleCreateTicket}>
                  <FormGroup>
                    <FormLabel htmlFor="subject">Subject *</FormLabel>
                    <FormInput
                      id="subject"
                      type="text"
                      placeholder="Brief description of the issue"
                      value={createTicketForm.subject}
                      onChange={(e) =>
                        setCreateTicketForm({ ...createTicketForm, subject: e.target.value })
                      }
                      required
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel htmlFor="description">Description *</FormLabel>
                    <FormTextarea
                      id="description"
                      placeholder="Detailed description of the issue..."
                      value={createTicketForm.description}
                      onChange={(e) =>
                        setCreateTicketForm({ ...createTicketForm, description: e.target.value })
                      }
                      required
                    />
                  </FormGroup>

                  {createTicketError && (
                    <ErrorMessage>{createTicketError}</ErrorMessage>
                  )}

                  {createTicketSuccess && (
                    <SuccessMessage>{createTicketSuccess}</SuccessMessage>
                  )}

                  <FormActions>
                    <CancelButton type="button" onClick={handleCloseCreateModal}>
                      Cancel
                    </CancelButton>
                    <SubmitButton type="submit" disabled={createTicketLoading}>
                      {createTicketLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            style={{
                              width: "16px",
                              height: "16px",
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTop: "2px solid white",
                              borderRadius: "50%",
                            }}
                          />
                          Creating...
                        </>
                      ) : (
                        <>
                          <FaPlus />
                          Create Ticket
                        </>
                      )}
                    </SubmitButton>
                  </FormActions>
                </form>
              </CreateTicketModal>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && ticketToDelete && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelDelete}
            >
              <DeleteModalContent
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <DeleteModalTitle>
                  <FaExclamationTriangle />
                  Delete Ticket Confirmation
                </DeleteModalTitle>
                <DeleteModalMessage>
                  Are you sure you want to delete this ticket? This action cannot be undone. All messages and attachments will be permanently deleted.
                </DeleteModalMessage>
                <DeleteModalDetails>
                  <DeleteModalDetailItem>
                    <DeleteModalDetailLabel>Ticket Number</DeleteModalDetailLabel>
                    <DeleteModalDetailValue>{ticketToDelete.ticket_number}</DeleteModalDetailValue>
                  </DeleteModalDetailItem>
                  <DeleteModalDetailItem>
                    <DeleteModalDetailLabel>Subject</DeleteModalDetailLabel>
                    <DeleteModalDetailValue>{ticketToDelete.subject}</DeleteModalDetailValue>
                  </DeleteModalDetailItem>
                  <DeleteModalDetailItem>
                    <DeleteModalDetailLabel>User</DeleteModalDetailLabel>
                    <DeleteModalDetailValue>{ticketToDelete.user_email || 'N/A'}</DeleteModalDetailValue>
                  </DeleteModalDetailItem>
                  <DeleteModalDetailItem>
                    <DeleteModalDetailLabel>Status</DeleteModalDetailLabel>
                    <DeleteModalDetailValue>{ticketToDelete.status}</DeleteModalDetailValue>
                  </DeleteModalDetailItem>
                </DeleteModalDetails>
                <DeleteModalActions>
                  <DeleteModalButton
                    $variant="secondary"
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </DeleteModalButton>
                  <DeleteModalButton
                    $variant="danger"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaTrash />
                    {isDeleting ? 'Deleting...' : 'Delete Ticket'}
                  </DeleteModalButton>
                </DeleteModalActions>
              </DeleteModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* User Profile Modal */}
        <UserProfileModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={closeUserModal}
          getSubscriptionBadgeColor={getSubscriptionBadgeColor}
          getSubscriptionIcon={getSubscriptionIcon}
          isSubscriptionPremium={isSubscriptionPremium}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          formatCurrency={formatCurrency}
          getDisplayName={getDisplayName}
        />

        {/* Ticket Conversation Modal */}
        <AnimatePresence>
          {selectedTicketId && (() => {
            const ticket = tickets.find(t => t.id === selectedTicketId);
            if (!ticket) return null;
            
            return (
              <ModalOverlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) closeTicketModal();
                }}
              >
                <TicketModalContent
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", damping: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ModalHeader>
                    <ModalTitle>
                      <FaTicketAlt />
                      {ticket.subject}
                    </ModalTitle>
                    <CloseButton onClick={closeTicketModal}>
                      <FaTimes />
                    </CloseButton>
                  </ModalHeader>

                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {loadingDetails.has(selectedTicketId) ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            border: '3px solid rgba(108, 99, 255, 0.3)', 
                            borderTop: '3px solid var(--primary)', 
                            borderRadius: '50%',
                            margin: '0 auto 1rem'
                          }}
                        />
                        Loading conversation...
                      </div>
                    ) : (
                      <>
                        <ConversationHeader style={{ padding: '0 1rem 1rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
                          <ConversationHeaderGrid>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {t("admin.supportTickets.ticketTable.id", "Ticket ID")}
                              </div>
                              <TicketId style={{ cursor: 'default', textDecoration: 'none' }}>
                                {ticket.ticket_number}
                              </TicketId>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {t("admin.supportTickets.ticketTable.subject", "Subject")}
                              </div>
                              <TicketSubject style={{ cursor: 'default', textDecoration: 'none' }}>
                                {ticket.subject}
                              </TicketSubject>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {t("admin.supportTickets.ticketTable.user", "User")}
                              </div>
                              <div 
                                onClick={(e) => {
                                  if (ticket.user_id) {
                                    e.stopPropagation();
                                    handleViewUser(ticket.user_id, e);
                                  }
                                }}
                                style={{ 
                                  color: 'var(--text-secondary)', 
                                  fontSize: '0.9rem',
                                  cursor: ticket.user_id ? 'pointer' : 'default',
                                  textDecoration: ticket.user_id ? 'underline' : 'none'
                                }}
                              >
                                {ticket.user_email || "Unknown"}
                                {(ticket.user_first_name || ticket.user_last_name) && (
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em' }}>
                                    {' '}({[ticket.user_first_name, ticket.user_last_name].filter(Boolean).join(' ')})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {t("admin.supportTickets.ticketTable.subscription", "Subscription")}
                              </div>
                              <SubscriptionBadge
                                $color={getSubscriptionBadgeColor(
                                  ticket.user_has_nfr ? "nfr" : (ticket.user_subscription || "none")
                                )}
                                $variant={
                                  ticket.user_has_nfr || isSubscriptionPremium(ticket.user_subscription || "none")
                                    ? "premium"
                                    : "default"
                                }
                              >
                                {ticket.user_has_nfr ? <FaCrown /> : getSubscriptionIcon(ticket.user_subscription || "none")}
                                {ticket.user_has_nfr ? "NFR" : (ticket.user_subscription || "none")}
                              </SubscriptionBadge>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {t("admin.supportTickets.ticketTable.status", "Status")}
                              </div>
                              <StatusBadge $status={ticket.status}>
                                {getStatusIcon(ticket.status)}
                                {t(`admin.supportTickets.filters.${ticket.status}`, ticket.status)}
                              </StatusBadge>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {t("admin.supportTickets.ticketTable.created", "Created")}
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {formatDate(ticket.created_at)}
                              </div>
                            </div>
                          </ConversationHeaderGrid>
                        </ConversationHeader>

                        <div
                          ref={(el) => {
                            if (selectedTicketId) {
                              setMessagesContainerRef(selectedTicketId, el);
                            }
                          }}
                          style={{ 
                            flex: '1 1 auto',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            padding: '1rem',
                            minHeight: 0,
                            height: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                          }}
                        >
                          {ticketDetails.get(selectedTicketId)?.messages?.map((message) => (
                            <Message key={message.id} $isAdmin={message.is_admin}>
                              <MessageAvatar $isAdmin={message.is_admin}>
                                {message.is_admin ? <FaUserTie /> : <FaUser />}
                              </MessageAvatar>
                              <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: message.is_admin ? 'flex-end' : 'flex-start'
                              }}>
                                <MessageBubble $isAdmin={message.is_admin}>
                                  <MessageContent>{message.content}</MessageContent>
                                  <MessageTime>
                                    {message.is_admin ? "Support Team" : (message.user_email || "Unknown")} • {formatDateTime(message.created_at)}
                                    {message.edited_at && ` (edited ${formatDateTime(message.edited_at)})`}
                                  </MessageTime>
                                </MessageBubble>
                                {message.attachments?.map((att) => (
                                  <MessageAttachment key={att.id}>
                                    {att.attachment_type === 'image' && att.url ? (
                                      <>
                                        <ImagePreview 
                                          src={att.url} 
                                          alt={att.file_name}
                                          onClick={() => window.open(att.url || '', '_blank')}
                                        />
                                        <AttachmentInfo style={{ marginTop: '0.5rem' }}>
                                          <AttachmentName>{att.file_name}</AttachmentName>
                                          <AttachmentSize>{(att.file_size / 1024).toFixed(2)} KB</AttachmentSize>
                                        </AttachmentInfo>
                                      </>
                                    ) : att.attachment_type === 'video' && att.url ? (
                                      <>
                                        <VideoPreview controls>
                                          <source src={att.url} type={att.file_type || 'video/mp4'} />
                                          Your browser does not support the video tag.
                                        </VideoPreview>
                                        <AttachmentInfo style={{ marginTop: '0.5rem' }}>
                                          <AttachmentName>{att.file_name}</AttachmentName>
                                          <AttachmentSize>{(att.file_size / 1024).toFixed(2)} KB</AttachmentSize>
                                        </AttachmentInfo>
                                      </>
                                    ) : (
                                      <AttachmentContainer>
                                        <AttachmentIcon>
                                          <FaFile />
                                        </AttachmentIcon>
                                        <AttachmentInfo>
                                          <AttachmentName>{att.file_name}</AttachmentName>
                                          <AttachmentSize>{(att.file_size / 1024).toFixed(2)} KB</AttachmentSize>
                                        </AttachmentInfo>
                                        {att.url && (
                                          <AttachmentLink href={att.url} target="_blank" rel="noopener noreferrer">
                                            View
                                          </AttachmentLink>
                                        )}
                                      </AttachmentContainer>
                                    )}
                                  </MessageAttachment>
                                ))}
                              </div>
                            </Message>
                          ))}
                          {(!ticketDetails.get(selectedTicketId)?.messages || ticketDetails.get(selectedTicketId)!.messages.length === 0) && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No messages yet. Start the conversation below.
                            </div>
                          )}
                        </div>

                        <MessageInputWrapper style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
                          {selectedTicketId && ticketDetails.get(selectedTicketId)?.messages && ticketDetails.get(selectedTicketId)!.messages!.length > 0 && (
                            <JumpToCurrentButton
                              $visible={!!isScrolledUp.get(selectedTicketId)}
                              onClick={() => {
                                if (selectedTicketId) {
                                  scrollToBottom(selectedTicketId);
                                }
                              }}
                              type="button"
                            >
                              <FaChevronDown />
                              See Recent
                            </JumpToCurrentButton>
                          )}
                          <MessageInput>
                          <MessageTextArea
                            placeholder={t("admin.supportTickets.conversation.placeholder", "Type your message...")}
                            value={newMessages[selectedTicketId] || ''}
                            onChange={(e) => setNewMessages(prev => ({
                              ...prev,
                              [selectedTicketId]: e.target.value
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(selectedTicketId);
                              }
                            }}
                            rows={1}
                          />
                          {pendingAttachments[selectedTicketId] && pendingAttachments[selectedTicketId].length > 0 && (
                            <div style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              color: 'var(--text-secondary)',
                              marginRight: '0.5rem'
                            }}>
                              <FaFile />
                              <span style={{ flex: 1 }}>{pendingAttachments[selectedTicketId].map(f => f.name).join(', ')}</span>
                              <button
                                onClick={() => {
                                  setPendingAttachments(prev => ({
                                    ...prev,
                                    [selectedTicketId]: []
                                  }));
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '0.25rem',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          )}
                          <MessageActions>
                            <AIButton
                              onClick={() => setShowAIModal(true)}
                              title="AI Response Assistant"
                            >
                              <FaMagic />
                            </AIButton>
                            <AttachButton
                              onClick={() => fileInputRefs.current[selectedTicketId]?.click()}
                              disabled={uploadingFiles[selectedTicketId]}
                            >
                              <FaPaperclip />
                            </AttachButton>
                            <SendButton
                              onClick={() => handleSendMessage(selectedTicketId)}
                              disabled={(!newMessages[selectedTicketId]?.trim() && (!pendingAttachments[selectedTicketId] || pendingAttachments[selectedTicketId].length === 0)) || uploadingFiles[selectedTicketId]}
                            >
                              <FaPaperPlane />
                            </SendButton>
                          </MessageActions>
                          <FileInput
                            ref={(el) => {
                              if (el) {
                                fileInputRefs.current[selectedTicketId] = el;
                              }
                            }}
                            type="file"
                            multiple
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                            onChange={(e) => handleFileUpload(selectedTicketId, e.target.files)}
                          />
                        </MessageInput>
                        </MessageInputWrapper>
                      </>
                    )}
                  </div>
                </TicketModalContent>
              </ModalOverlay>
            );
          })()}
        </AnimatePresence>

        {/* AI Response Modal */}
        <AnimatePresence>
          {showAIModal && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAIModal(false)}
            >
              <AIModalContent
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <ModalTitle>
                    <FaMagic />
                    AI Response Assistant
                  </ModalTitle>
                  <CloseButton onClick={() => setShowAIModal(false)}>
                    <FaTimes />
                  </CloseButton>
                </ModalHeader>

                <AIModalSection>
                  <AIModalLabel>Prompt</AIModalLabel>
                  <AIModalTextArea
                    placeholder="Describe what kind of response you need help writing..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                  />
                </AIModalSection>

                <AIModalSection>
                  <AIModalLabel>Generated Response</AIModalLabel>
                  <AIModalTextArea
                    placeholder={aiLoading ? "Generating response..." : "Response will appear here..."}
                    value={aiResponse}
                    onChange={(e) => setAiResponse(e.target.value)}
                    rows={10}
                    disabled={aiLoading}
                  />
                </AIModalSection>

                <AIModalActions>
                  <AIModalButton
                    $variant="secondary"
                    onClick={() => {
                      setShowAIModal(false);
                      setAiPrompt("");
                      setAiResponse("");
                    }}
                  >
                    Close
                  </AIModalButton>
                  <AIModalButton
                    $variant="primary"
                    onClick={handleGenerateAIResponse}
                    disabled={!aiPrompt.trim() || aiLoading}
                  >
                    {aiLoading ? "Generating..." : "Generate Response"}
                  </AIModalButton>
                  <AIModalButton
                    $variant="primary"
                    onClick={handleInsertAIResponse}
                    disabled={!aiResponse.trim()}
                  >
                    Insert into Message
                  </AIModalButton>
                </AIModalActions>
              </AIModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </TicketsContainer>
    </>
  );
}

export default SupportTicketsPage; 