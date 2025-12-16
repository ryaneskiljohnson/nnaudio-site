"use client";
import React, { useEffect, useState } from "react";
import NextSEO from "@/components/NextSEO";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import {
  FaUsers,
  FaSearch,
  FaFilter,
  FaEye,
  FaEdit,
  FaEnvelope,
  FaTrash,
  FaCrown,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaTimes,
  FaChartLine,
  FaTicketAlt,
  FaEllipsisV,
  FaUserShield,
  FaBan,
  FaUndo,
  FaCheck,
  FaExclamationTriangle,
  FaSyncAlt,
  FaCreditCard,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled from "styled-components";
import { motion } from "framer-motion";
import StatLoadingSpinner from "@/components/common/StatLoadingSpinner";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";
import {
  getAllUsersForCRMAdmin,
  getUsersForCRMCountAdmin,
  getAdditionalUserDataAdmin,
  getUserSupportTicketsAdmin,
  getUserSupportTicketCountsAdmin,
  getCustomerPurchasesAdmin,
  getCustomerInvoicesAdmin,
  getUserByIdAdmin,
} from "@/app/actions/user-management";
import type { UserData } from "@/utils/stripe/admin-analytics";
import {
  refundPaymentIntent,
  refundInvoice,
  cancelSubscriptionAdmin,
  reactivateSubscription,
  changeSubscriptionPlan,
  getCustomerSubscriptions,
  getPrices,
} from "@/utils/stripe/actions";
import { deleteUserAccount } from "@/utils/stripe/supabase-stripe";
import { updateUserProfileFromStripe } from "@/app/actions/user-management";
import { updateUserProStatus } from "@/utils/subscriptions/check-subscription";

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: var(--error);
  font-size: 1.2rem;
  padding: 2rem;
`;

const StatContent = styled.div`
  text-align: center;
`;

const PaginationEllipsis = styled.span`
  padding: 0.5rem;
  color: var(--text-secondary);
`;

const CRMContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const CRMTitle = styled.h1`
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

const CRMSubtitle = styled.p`
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
  grid-template-columns: 1fr auto auto;
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

const SearchInput = styled.input<{ $isLoading?: boolean }>`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
    background-color: rgba(255, 255, 255, 0.05) !important;
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active,
  &:-webkit-autofill-selected {
    -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.05) inset !important;
    -webkit-text-fill-color: var(--text) !important;
    background-color: rgba(255, 255, 255, 0.05) !important;
    background-clip: content-box !important;
    caret-color: var(--text) !important;
    transition: background-color 5000s ease-in-out 0s,
      color 5000s ease-in-out 0s !important;
  }

  &:-moz-autofill,
  &:-moz-autofill:hover,
  &:-moz-autofill:focus {
    background-color: rgba(255, 255, 255, 0.05) !important;
    color: var(--text) !important;
    box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.05) inset !important;
  }

  &::placeholder {
    color: var(--text-secondary);
  }

  ${(props) =>
    props.$isLoading &&
    `
    background-color: rgba(255, 255, 255, 0.08) !important;
    border-color: var(--primary);
  `}
`;

const SearchIcon = styled.div<{ $isLoading?: boolean }>`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 1rem;

  ${(props) =>
    props.$isLoading &&
    `
    color: var(--primary);
    animation: pulse 1.5s ease-in-out infinite;
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `}
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

const PageSizeSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.85rem;
  min-width: 80px;
  cursor: pointer;
  margin-left: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const TableContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  overflow-x: auto;
  overflow-y: visible;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;

  @media (max-width: 768px) {
    overflow-x: auto;

    table {
      min-width: 1000px;
    }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  /* Define column widths */
  th:nth-child(1),
  td:nth-child(1) {
    width: 200px;
  } /* Name */
  th:nth-child(2),
  td:nth-child(2) {
    width: 220px;
  } /* Email */
  th:nth-child(3),
  td:nth-child(3) {
    width: 140px;
  } /* Subscription */
  th:nth-child(4),
  td:nth-child(4) {
    width: 50px;
  } /* Trial */
  th:nth-child(5),
  td:nth-child(5) {
    width: 110px;
  } /* Join Date */
  th:nth-child(6),
  td:nth-child(6) {
    width: 110px;
  } /* Last Active */
  th:nth-child(7),
  td:nth-child(7) {
    width: 100px;
  } /* Support Tickets */
  th:nth-child(8),
  td:nth-child(8) {
    width: 100px;
  } /* Total Spent */
  th:nth-child(9),
  td:nth-child(9) {
    width: 80px;
  } /* Actions */
`;

const TableHeader = styled.thead`
  background-color: rgba(255, 255, 255, 0.02);
`;

const TableHeaderCell = styled.th<{ $sortable?: boolean }>`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: ${(props) => (props.$sortable !== false ? "pointer" : "default")};
  user-select: none;
  transition: background-color 0.2s ease;
  position: relative;

  &:hover {
    background-color: ${(props) =>
      props.$sortable !== false ? "rgba(255, 255, 255, 0.02)" : "transparent"};
  }

  svg {
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin-left: 0.5rem;
    vertical-align: middle;
  }
`;

const LastActiveHeaderCell = styled(TableHeaderCell)`
  min-width: 180px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  z-index: 10;
  color: var(--text-secondary);
  gap: 0.75rem;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* Allow wrapping for action buttons */
  &:last-child {
    white-space: normal;
    overflow: visible;
  }
`;

const JoinDateTableCell = styled(TableCell)`
  white-space: normal;
  overflow: visible;
  word-wrap: break-word;
`;

const LastActiveTableCell = styled(TableCell)`
  min-width: 180px;
  white-space: normal;
  overflow: visible;
`;

const UserAvatar = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const UserEmail = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
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

const NfrBadge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  margin-left: 0.5rem;
`;

const SubscriptionCell = styled(TableCell)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const TrialBadge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background-color: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.4);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
`;

const TrialCell = styled(TableCell)`
  padding: 0.5rem;
`;

const TrialBadgeBox = styled.span<{ $isActive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.$isActive ? "rgba(34, 197, 94, 0.2)" : "rgba(156, 163, 175, 0.2)"};
  color: ${(props) => (props.$isActive ? "#22c55e" : "#9ca3af")};
  border: 1px solid
    ${(props) =>
      props.$isActive ? "rgba(34, 197, 94, 0.4)" : "rgba(156, 163, 175, 0.4)"};
`;

const SupportTicketsCount = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
`;

const TicketBadge = styled.span<{
  $openCount: number;
  $closedCount: number;
  $totalCount: number;
}>`
  background-color: ${(props) => {
    // Red if there are open tickets
    if (props.$openCount > 0) return "#e74c3c";
    // Green if there are closed tickets but no open tickets
    if (props.$closedCount > 0) return "#16a34a";
    // Grey if there are no tickets
    return "#95a5a6";
  }};
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button<{
  variant?: "primary" | "secondary" | "danger";
}>`
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  ${(props) => {
    switch (props.variant) {
      case "primary":
        return `
          background-color: rgba(108, 99, 255, 0.1);
          color: var(--primary);
          &:hover {
            background-color: rgba(108, 99, 255, 0.2);
          }
        `;
      case "danger":
        return `
          background-color: rgba(220, 53, 69, 0.1);
          color: #dc3545;
          &:hover {
            background-color: rgba(220, 53, 69, 0.2);
          }
        `;
      default:
        return `
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          &:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: var(--text);
          }
        `;
    }
  }}

  svg {
    font-size: 0.8rem;
  }
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SearchLoadingSpinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(108, 99, 255, 0.3);
  border-top: 2px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
`;

const PaginationButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  margin: 0 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background-color: ${(props) =>
    props.$active ? "var(--primary)" : "transparent"};
  color: ${(props) => (props.$active ? "white" : "var(--text)")};
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
  }
`;

const MobileFooterSection = styled.div`
  width: 80%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

// User Detail Modal Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 1000px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
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
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: var(--text);
  }
`;

const ModalSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const InfoItem = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const InfoLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`;

const InfoValue = styled.div`
  font-size: 1rem;
  color: var(--text);
  font-weight: 500;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const DataTableHeader = styled.thead`
  background-color: rgba(255, 255, 255, 0.02);
`;

const DataTableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-size: 0.9rem;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const DataTableBody = styled.tbody``;

const DataTableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }
`;

const DataTableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: var(--text);
`;

const StripeLink = styled.a`
  color: var(--primary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--accent);
    text-decoration: underline;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
  background-color: ${({ $status }) => {
    switch ($status) {
      case "active":
      case "succeeded":
      case "paid":
        return "rgba(46, 204, 113, 0.2)";
      case "canceled":
      case "failed":
        return "rgba(231, 76, 60, 0.2)";
      case "pending":
      case "processing":
        return "rgba(241, 196, 15, 0.2)";
      default:
        return "rgba(149, 165, 166, 0.2)";
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case "active":
      case "succeeded":
      case "paid":
        return "#2ecc71";
      case "canceled":
      case "failed":
        return "#e74c3c";
      case "pending":
      case "processing":
        return "#f1c40f";
      default:
        return "#95a5a6";
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
`;

const PlanSelect = styled.select<{ $disabled?: boolean }>`
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;

  &:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
    padding: 8px;
  }

  option:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  option:checked {
    background-color: var(--primary);
    color: white;
  }
`;

// More Menu Components
const MoreMenuContainer = styled.div`
  position: relative;
  display: inline-block;
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

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }

  svg {
    font-size: 1rem;
  }
`;

const MoreMenuDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  min-width: 160px;
  overflow: hidden;
  margin-top: 4px;
`;

const MoreMenuItem = styled.button<{ variant?: "danger" }>`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  color: ${(props) => (props.variant === "danger" ? "#e74c3c" : "var(--text)")};
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;

  &:hover {
    background-color: ${(props) =>
      props.variant === "danger"
        ? "rgba(231, 76, 60, 0.1)"
        : "rgba(255, 255, 255, 0.05)"};
  }

  svg {
    font-size: 0.8rem;
    width: 16px;
  }
`;

// Refund Components
const RefundButton = styled.button<{
  variant?: "primary" | "danger";
  disabled?: boolean;
}>`
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${(props) =>
    props.disabled &&
    `
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  `}

  ${(props) => {
    switch (props.variant) {
      case "danger":
        return `
          background-color: rgba(220, 53, 69, 0.1);
          color: #dc3545;
          border: 1px solid rgba(220, 53, 69, 0.2);
          &:hover:not(:disabled) {
            background-color: rgba(220, 53, 69, 0.2);
          }
        `;
      default:
        return `
          background-color: rgba(108, 99, 255, 0.1);
          color: var(--primary);
          border: 1px solid rgba(108, 99, 255, 0.2);
          &:hover:not(:disabled) {
            background-color: rgba(108, 99, 255, 0.2);
          }
        `;
    }
  }}

  svg {
    font-size: 0.7rem;
  }
`;

const RefundNotification = styled(motion.div)<{ type: "success" | "error" }>`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 10001;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 400px;

  ${(props) =>
    props.type === "success"
      ? `
    background-color: #2ecc71;
    border: 1px solid #27ae60;
  `
      : `
    background-color: #e74c3c;
    border: 1px solid #c0392b;
  `}

  svg {
    font-size: 1rem;
  }
`;

const LoadingSpinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const RefreshButton = styled.button`
  background: rgba(108, 99, 255, 0.2) !important;
  border: 2px solid rgba(108, 99, 255, 0.6) !important;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  color: #6c63ff !important;
  transition: all 0.2s ease;
  font-size: 16px;
  min-width: 36px;
  height: 36px;
  flex-shrink: 0;
  margin-left: 8px;

  &:hover:not(:disabled) {
    background: rgba(108, 99, 255, 0.3) !important;
    border-color: rgba(108, 99, 255, 0.8) !important;
    transform: rotate(180deg);
  }

  &:active:not(:disabled) {
    transform: rotate(180deg) scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
    color: #6c63ff;
    display: block;
  }
`;

// Confirmation Modal Components
const ConfirmationModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  padding: 20px;
`;

const ConfirmationModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const ConfirmationTitle = styled.h3`
  font-size: 1.5rem;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const ConfirmationMessage = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const ConfirmationDetails = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ConfirmationDetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ConfirmationDetailLabel = styled.span`
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const ConfirmationDetailValue = styled.span`
  font-size: 0.9rem;
  color: var(--text);
  font-weight: 500;
`;

const ConfirmationButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const ConfirmationButton = styled.button<{ variant: "danger" | "secondary" }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  justify-content: center;

  ${(props) =>
    props.variant === "danger"
      ? `
    background-color: #dc3545;
    color: white;
    &:hover:not(:disabled) {
      background-color: #c82333;
      transform: translateY(-1px);
    }
  `
      : `
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
    border: 1px solid rgba(255, 255, 255, 0.2);
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

export default function AdminCRM() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof UserData>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [usersPerPage, setUsersPerPage] = useState(10);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [supportTickets, setSupportTickets] = useState<
    Array<{
      id: string;
      ticket_number: string;
      subject: string;
      status: string;
      priority: string;
      created_at: string;
      updated_at: string;
    }>
  >([]);
  const [loadingSupportTickets, setLoadingSupportTickets] = useState(false);
  const [userPurchases, setUserPurchases] = useState<
    Array<{
      id: string;
      amount: number;
      status: string;
      createdAt: string;
      description: string;
      metadata?: Record<string, string>;
    }>
  >([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [userInvoices, setUserInvoices] = useState<
    Array<{
      id: string;
      number: string | null;
      amount: number;
      status: string;
      createdAt: string;
      paidAt: string | null;
      dueDate: string | null;
    }>
  >([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [supportTicketCounts, setSupportTicketCounts] = useState<
    Record<string, { open: number; closed: number; total: number }>
  >({});
  const [hasPaymentMethod, setHasPaymentMethod] = useState<
    Record<string, boolean>
  >({});
  const [selectedUserHasPaymentMethod, setSelectedUserHasPaymentMethod] =
    useState<boolean | null>(null);

  // More menu state
  const [openMoreMenu, setOpenMoreMenu] = useState<string | null>(null);

  // Refund state
  const [refundLoading, setRefundLoading] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Confirmation modal state
  const [showRefundConfirmation, setShowRefundConfirmation] = useState(false);
  const [refundConfirmationData, setRefundConfirmationData] = useState<{
    id: string;
    type: "purchase" | "invoice";
    amount: number;
    description: string;
  } | null>(null);

  // Subscription management state
  const [subscriptionLoading, setSubscriptionLoading] = useState<string | null>(
    null
  );
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(
    null
  );
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null
  );
  const [availablePlans, setAvailablePlans] = useState<any>(null);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [cancelConfirmationData, setCancelConfirmationData] = useState<{
    subscriptionId: string;
    customerId: string;
    userName: string;
  } | null>(null);

  // Delete user state
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationData, setDeleteConfirmationData] = useState<{
    userId: string;
    userName: string;
    userEmail: string;
  } | null>(null);

  // Subscription refresh state
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [subscriptionRefreshMessage, setSubscriptionRefreshMessage] = useState<
    string | null
  >(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset to first page when search changes
      if (searchTerm !== debouncedSearchTerm) {
        setCurrentPage(1);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm]);

  // Reset to page 1 and recalculate total pages when page size changes
  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(Math.ceil(totalCount / usersPerPage));
  }, [usersPerPage, totalCount]);

  // Fetch count separately (only when search/filter changes)
  const fetchCount = async () => {
    try {
      const result = await getUsersForCRMCountAdmin(
        debouncedSearchTerm || undefined,
        subscriptionFilter
      );

      if (result.error) {
        console.error("Error fetching count:", result.error);
        return;
      }

      setTotalCount(result.count);
      setTotalPages(Math.ceil(result.count / usersPerPage));
    } catch (err) {
      console.error("Error fetching count:", err);
    }
  };

  // Fetch users (data only, no count)
  const fetchUsers = async (isSearchOperation = false) => {
    try {
      if (isSearchOperation) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }

      console.log(
        `[Frontend] Fetching users with sortField=${sortField}, sortDirection=${sortDirection}`
      );

      const result = await getAllUsersForCRMAdmin(
        currentPage,
        usersPerPage,
        debouncedSearchTerm || undefined,
        subscriptionFilter,
        sortField,
        sortDirection
      );

      if (result.error) {
        throw new Error(result.error);
      }

      console.log(`[Frontend] Received ${result.users.length} users from API`);

      // All sorting is done in the database query - just use the results as-is
      setUsers(result.users);
      // Clear support ticket counts when users change (will be repopulated)
      setSupportTicketCounts({});
      // Clear payment method status when users change (will be repopulated)
      setHasPaymentMethod({});

      // Fetch additional data (lastActive, totalSpent) separately
      // This allows users to be displayed immediately while additional data loads
      if (result.users.length > 0) {
        const userIds = result.users.map((u) => u.id);

        // Fetch payment method status for users with customer IDs
        const usersWithCustomerIds = result.users
          .filter((u) => u.customerId)
          .map((u) => ({ userId: u.id, customerId: u.customerId! }));

        if (usersWithCustomerIds.length > 0) {
          // Check payment methods for all customers in parallel
          const paymentMethodChecks = usersWithCustomerIds.map(
            async ({ userId, customerId }) => {
              try {
                const response = await fetch(
                  `/api/admin/customer-has-payment-method?customerId=${customerId}`
                );
                const data = await response.json();
                return {
                  userId,
                  hasPaymentMethod: data.success && data.hasPaymentMethod,
                };
              } catch (error) {
                console.error(
                  `Error checking payment method for ${customerId}:`,
                  error
                );
                return { userId, hasPaymentMethod: false };
              }
            }
          );

          Promise.allSettled(paymentMethodChecks).then((results) => {
            const paymentMethodMap: Record<string, boolean> = {};
            results.forEach((result) => {
              if (result.status === "fulfilled") {
                paymentMethodMap[result.value.userId] =
                  result.value.hasPaymentMethod;
              }
            });
            setHasPaymentMethod((prev) => ({ ...prev, ...paymentMethodMap }));
          });
        }

        getAdditionalUserDataAdmin(userIds)
          .then((additionalData) => {
            if (additionalData.error) {
              console.error(
                "Error fetching additional data:",
                additionalData.error
              );
              return;
            }

            // Update users with additional data
            setUsers((prevUsers) => {
              let updatedUsers = prevUsers.map((user) => ({
                ...user,
                lastActive:
                  additionalData.lastActive[user.id] || user.createdAt, // Fallback to join date if no session data
                totalSpent:
                  additionalData.totalSpent[user.id] !== undefined
                    ? additionalData.totalSpent[user.id]
                    : 0, // Default to 0 if no data found
              }));

              // Apply client-side sorting for fields that can't be sorted server-side
              if (
                sortField === "lastActive" ||
                sortField === "totalSpent" ||
                sortField === "supportTickets"
              ) {
                updatedUsers = [...updatedUsers].sort((a, b) => {
                  let aValue: any;
                  let bValue: any;

                  if (sortField === "lastActive") {
                    aValue = a.lastActive || a.createdAt;
                    bValue = b.lastActive || b.createdAt;
                  } else if (sortField === "totalSpent") {
                    aValue = a.totalSpent;
                    bValue = b.totalSpent;
                  } else if (sortField === "supportTickets") {
                    aValue = supportTicketCounts[a.id]?.total || 0;
                    bValue = supportTicketCounts[b.id]?.total || 0;
                  }

                  // Handle null/undefined values
                  if (aValue == null && bValue == null) return 0;
                  if (aValue == null) return 1; // null values go to end
                  if (bValue == null) return -1;

                  // Compare values
                  if (sortField === "lastActive") {
                    // Compare dates
                    const aDate = new Date(aValue).getTime();
                    const bDate = new Date(bValue).getTime();
                    return sortDirection === "asc"
                      ? aDate - bDate
                      : bDate - aDate;
                  } else {
                    // Compare numbers
                    return sortDirection === "asc"
                      ? aValue - bValue
                      : bValue - aValue;
                  }
                });
              }

              return updatedUsers;
            });
          })
          .catch((err) => {
            console.error("Error fetching additional user data:", err);
          });

        // Fetch support ticket counts
        getUserSupportTicketCountsAdmin(userIds)
          .then((countsData) => {
            if (countsData.error) {
              console.error(
                "Error fetching support ticket counts:",
                countsData.error
              );
              return;
            }

            setSupportTicketCounts(countsData.counts);
          })
          .catch((err) => {
            console.error("Error fetching support ticket counts:", err);
          });
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load user data");
    } finally {
      if (isSearchOperation) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch count when search/filter changes (independent of pagination)
  useEffect(() => {
    if (user && !languageLoading) {
      fetchCount();
    }
  }, [user, languageLoading, debouncedSearchTerm, subscriptionFilter]);

  // Fetch users when page/sort changes or on initial load
  useEffect(() => {
    if (user && !languageLoading) {
      // Determine if this is a search operation by checking if search term changed
      const isSearchOperation = debouncedSearchTerm !== previousSearchTerm;

      fetchUsers(isSearchOperation);

      // Update previous search term
      setPreviousSearchTerm(debouncedSearchTerm);
    }
  }, [
    currentPage,
    debouncedSearchTerm,
    subscriptionFilter,
    sortField,
    sortDirection,
    usersPerPage,
    user,
    languageLoading,
  ]);

  // Apply client-side sorting when sortField changes to a client-sortable field
  useEffect(() => {
    if (
      sortField === "lastActive" ||
      sortField === "totalSpent" ||
      sortField === "supportTickets"
    ) {
      setUsers((prevUsers) => {
        // Only sort if we have the data
        const hasData = prevUsers.every(
          (u) =>
            (sortField === "lastActive" && u.lastActive) ||
            (sortField === "totalSpent" && u.totalSpent !== -1) ||
            (sortField === "supportTickets" &&
              supportTicketCounts[u.id] !== undefined)
        );

        if (!hasData) return prevUsers; // Wait for data to load

        return [...prevUsers].sort((a, b) => {
          let aValue: any;
          let bValue: any;

          if (sortField === "lastActive") {
            aValue = a.lastActive || a.createdAt;
            bValue = b.lastActive || b.createdAt;
          } else if (sortField === "totalSpent") {
            aValue = a.totalSpent;
            bValue = b.totalSpent;
          } else if (sortField === "supportTickets") {
            aValue = supportTicketCounts[a.id]?.total || 0;
            bValue = supportTicketCounts[b.id]?.total || 0;
          }

          // Handle null/undefined values
          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return 1; // null values go to end
          if (bValue == null) return -1;

          // Compare values
          if (sortField === "lastActive") {
            // Compare dates
            const aDate = new Date(aValue).getTime();
            const bDate = new Date(bValue).getTime();
            return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
          } else {
            // Compare numbers
            return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
          }
        });
      });
    }
  }, [sortField, sortDirection, supportTicketCounts]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Only close if clicking outside of any more menu container
      if (!target.closest("[data-more-menu]")) {
        setOpenMoreMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSort = (field: keyof UserData) => {
    // All fields are now sortable
    // Some are sorted server-side (database fields), others are sorted client-side
    const serverSortableFields = [
      "firstName",
      "lastName",
      "subscription",
      "createdAt",
      "email",
      "trialExpiration",
    ];

    // Fields that need client-side sorting (from external sources)
    const clientSortableFields = ["lastActive", "totalSpent", "supportTickets"];

    const allSortableFields = [
      ...serverSortableFields,
      ...clientSortableFields,
    ];

    if (!allSortableFields.includes(field as string)) {
      console.log(`Field "${field}" is not sortable`);
      return;
    }

    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field as keyof UserData);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const getSortIcon = (field: keyof UserData) => {
    // All fields are sortable - show sort indicator for all
    const allSortableFields = [
      "firstName",
      "lastName",
      "subscription",
      "createdAt",
      "email",
      "trialExpiration",
      "lastActive",
      "totalSpent",
      "supportTickets",
    ];
    const isSortable = allSortableFields.includes(field as string);

    if (!isSortable) {
      return null; // Don't show sort icon for non-sortable fields (like Actions)
    }

    if (sortField !== field) return <FaSort />;
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
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

  // Get support ticket count for a user from fetched data
  const getSupportTicketCount = (userId: string) => {
    // Get real count from fetched data, default to 0 if not loaded yet
    return supportTicketCounts[userId] || { open: 0, closed: 0, total: 0 };
  };

  const formatDate = (dateString: string) => {
    // Convert UTC to local time and format as date only
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    // Convert UTC to local time and format with date and time
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

  const formatDateTimeNoLeadingZero = (dateString: string) => {
    // Convert UTC to local time and format with date and time, removing leading zero from hour
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Use "numeric" for hour to avoid leading zeros (e.g., "8:30 AM" instead of "08:30 AM")
    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr}, ${timeStr}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getRemainingTrialDays = (trialExpiration?: string): number | null => {
    if (!trialExpiration) return null;

    const trialEnd = new Date(trialExpiration);
    const now = new Date();

    // Check if trial is still active (not expired)
    if (trialEnd <= now) return null;

    // Calculate days remaining
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : null;
  };

  const getTrialInfo = (
    trialExpiration?: string,
    createdAt?: string,
    subscriptionExpiration?: string
  ): { days: number | string; isActive: boolean } | null => {
    if (!trialExpiration) return null;

    const trialEnd = new Date(trialExpiration);
    const now = new Date();

    // Check if trial is still active
    if (trialEnd > now) {
      // Active trial - return remaining days
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { days: diffDays > 0 ? diffDays : 0, isActive: true };
    }

    // Trial has expired - calculate duration
    // Try to determine if it was 7 or 14 days
    let estimatedDuration = 7; // Default to 7 days (most common)

    if (createdAt) {
      const accountCreated = new Date(createdAt);
      const daysFromCreationToTrialEnd = Math.floor(
        (trialEnd.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Heuristic:
      // - 7-day trials typically end 6-9 days after account creation
      // - 14-day trials typically end 13-16 days after account creation
      if (
        daysFromCreationToTrialEnd >= 13 &&
        daysFromCreationToTrialEnd <= 16
      ) {
        estimatedDuration = 14;
      } else if (
        daysFromCreationToTrialEnd >= 6 &&
        daysFromCreationToTrialEnd <= 9
      ) {
        estimatedDuration = 7;
      }
    }

    // If we have subscription expiration, we can also check when subscription started
    // Subscription typically starts right after trial ends
    if (subscriptionExpiration) {
      const subStart = new Date(subscriptionExpiration);
      // If subscription started very close to trial end, we can infer trial duration
      // But this is less reliable, so we'll stick with the creation-based heuristic
    }

    return { days: estimatedDuration, isActive: false };
  };

  const getDisplayName = (user: UserData) => {
    if (
      user.firstName &&
      user.lastName &&
      user.firstName.trim() &&
      user.lastName.trim()
    ) {
      return `${user.firstName.trim()} ${user.lastName.trim()}`;
    }
    if (user.email && user.email.includes("@")) {
      return user.email.split("@")[0];
    }
    return "Unknown User";
  };

  const getInitials = (user: UserData) => {
    if (
      user.firstName &&
      user.lastName &&
      user.firstName.length > 0 &&
      user.lastName.length > 0
    ) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email && user.email.length > 0) {
      return user.email[0].toUpperCase();
    }
    return "?";
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      "#6c63ff",
      "#4ecdc4",
      "#ffd93d",
      "#ff6b6b",
      "#95a5a6",
      "#e74c3c",
      "#3498db",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
    ];
    if (!email || email.length === 0) {
      return colors[0]; // Default to first color
    }
    const index = email
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const handleViewUser = async (user: UserData) => {
    // Set initial user data immediately for quick display
    setSelectedUser(user);
    setShowUserModal(true);

    // Fetch all data
    let purchases: Array<{
      id: string;
      amount: number;
      status: string;
      createdAt: string;
      description: string;
      metadata?: Record<string, string>;
    }> = [];
    let invoices: Array<{
      id: string;
      number: string | null;
      amount: number;
      status: string;
      createdAt: string;
      paidAt: string | null;
      dueDate: string | null;
    }> = [];

    // Fetch real subscription data if user has a customer ID
    if (user.customerId) {
      await Promise.all([
        fetchUserSubscriptions(user.customerId),
        fetchUserPurchases(user.customerId).then((p) => {
          purchases = p;
        }),
        fetchUserInvoices(user.customerId).then((i) => {
          invoices = i;
        }),
      ]);
    } else {
      setUserSubscriptions([]);
      setUserPurchases([]);
      setUserInvoices([]);
      setSelectedUserHasPaymentMethod(false);
    }

    // Fetch support tickets for the user
    await fetchUserSupportTickets(user.id);

    // Recalculate totalSpent using server-side API endpoint
    // This ensures Stripe secret key is only used on the server
    if (user.customerId) {
      try {
        const [totalSpentResponse, paymentMethodResponse] = await Promise.all([
          fetch(
            `/api/admin/customer-total-spent?customerId=${user.customerId}`
          ),
          fetch(
            `/api/admin/customer-has-payment-method?customerId=${user.customerId}`
          ),
        ]);

        const totalSpentData = await totalSpentResponse.json();
        const paymentMethodData = await paymentMethodResponse.json();

        // Update payment method status
        if (paymentMethodData.success) {
          setSelectedUserHasPaymentMethod(paymentMethodData.hasPaymentMethod);
        } else {
          setSelectedUserHasPaymentMethod(null);
        }

        if (
          totalSpentData.success &&
          typeof totalSpentData.totalSpent === "number"
        ) {
          // Update selectedUser with recalculated totalSpent
          setSelectedUser((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              totalSpent:
                totalSpentData.totalSpent >= 0
                  ? totalSpentData.totalSpent
                  : prev.totalSpent === -1
                  ? -1
                  : 0,
            };
          });
        } else {
          console.error(
            "Error recalculating totalSpent:",
            totalSpentData.error
          );
          // Fall back to calculation from fetched data if API fails
          const purchasesTotal = purchases
            .filter(
              (p) =>
                p.status === "succeeded" &&
                p.description !== "Subscription payment"
            )
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          const invoicesTotal = invoices
            .filter((inv) => inv.status === "paid")
            .reduce((sum, inv) => sum + (inv.amount || 0), 0);

          const totalSpent = purchasesTotal + invoicesTotal;

          setSelectedUser((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              totalSpent:
                totalSpent >= 0 ? totalSpent : prev.totalSpent === -1 ? -1 : 0,
            };
          });
        }
      } catch (error) {
        console.error("Error recalculating totalSpent from API:", error);
        // Fall back to calculation from fetched data if API fails
        const purchasesTotal = purchases
          .filter(
            (p) =>
              p.status === "succeeded" &&
              p.description !== "Subscription payment"
          )
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const invoicesTotal = invoices
          .filter((inv) => inv.status === "paid")
          .reduce((sum, inv) => sum + (inv.amount || 0), 0);

        const totalSpent = purchasesTotal + invoicesTotal;

        setSelectedUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            totalSpent:
              totalSpent >= 0 ? totalSpent : prev.totalSpent === -1 ? -1 : 0,
          };
        });
      }
    }
  };

  const fetchUserSubscriptions = async (customerId: string) => {
    try {
      setLoadingSubscriptions(true);
      const result = await getCustomerSubscriptions(customerId);

      if (result.success && result.subscriptions) {
        setUserSubscriptions(result.subscriptions);
      } else {
        setUserSubscriptions([]);
        console.error("Error fetching subscriptions:", result.error);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setUserSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const fetchUserSupportTickets = async (userId: string) => {
    try {
      setLoadingSupportTickets(true);
      const result = await getUserSupportTicketsAdmin(userId);

      if (result.error) {
        console.error("Error fetching support tickets:", result.error);
        setSupportTickets([]);
      } else {
        setSupportTickets(result.tickets);
      }
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      setSupportTickets([]);
    } finally {
      setLoadingSupportTickets(false);
    }
  };

  const fetchUserPurchases = async (customerId: string) => {
    try {
      setLoadingPurchases(true);
      const result = await getCustomerPurchasesAdmin(customerId);

      if (result.error) {
        console.error("Error fetching purchases:", result.error);
        setUserPurchases([]);
        return [];
      } else {
        setUserPurchases(result.purchases);
        return result.purchases;
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
      setUserPurchases([]);
      return [];
    } finally {
      setLoadingPurchases(false);
    }
  };

  const fetchUserInvoices = async (customerId: string) => {
    try {
      setLoadingInvoices(true);
      const result = await getCustomerInvoicesAdmin(customerId);

      if (result.error) {
        console.error("Error fetching invoices:", result.error);
        setUserInvoices([]);
        return [];
      } else {
        setUserInvoices(result.invoices);
        return result.invoices;
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setUserInvoices([]);
      return [];
    } finally {
      setLoadingInvoices(false);
    }
  };

  const closeModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
    setUserSubscriptions([]);
    setSubscriptionError(null);
    setSubscriptionSuccess(null);
    setSupportTickets([]);
    setUserPurchases([]);
    setUserInvoices([]);
  };

  // Mock detailed data for demonstration
  const getMockUserDetails = (user: UserData) => {
    const mockSubscriptions =
      user.subscription !== "none"
        ? [
            {
              id: `sub_${user.id.slice(0, 8)}`,
              status: "active",
              currentPeriodStart: new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
              currentPeriodEnd: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
              cancelAtPeriodEnd: false,
              priceId: `price_${user.subscription}`,
              amount:
                user.subscription === "monthly"
                  ? 0
                  : user.subscription === "annual"
                  ? 0
                  : 0,
              interval:
                user.subscription === "monthly"
                  ? "month"
                  : user.subscription === "annual"
                  ? "year"
                  : "lifetime",
            },
          ]
        : [];

    const mockPurchases =
      user.totalSpent > 0
        ? [
            {
              id: `pi_${user.id.slice(0, 8)}`,
              amount: user.totalSpent,
              status: "succeeded",
              createdAt: new Date(
                Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
              ).toISOString(),
              description:
                user.subscription === "lifetime"
                  ? "Lifetime Access Purchase"
                  : "One-time purchase",
            },
          ]
        : [];

    const mockInvoices =
      user.subscription !== "none"
        ? [
            {
              id: `in_${user.id.slice(0, 8)}`,
              number: `INV-${new Date().getFullYear()}-${String(
                Math.floor(Math.random() * 10000)
              ).padStart(4, "0")}`,
              amount:
                user.subscription === "monthly"
                  ? 0
                  : user.subscription === "annual"
                  ? 0
                  : 0,
              status: "paid",
              createdAt: new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
              paidAt: new Date(
                Date.now() - 29 * 24 * 60 * 60 * 1000
              ).toISOString(),
              dueDate: new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
              description: `${
                user.subscription.charAt(0).toUpperCase() +
                user.subscription.slice(1)
              } subscription`,
            },
          ]
        : [];

    return {
      subscriptions: mockSubscriptions,
      purchases: mockPurchases,
      invoices: mockInvoices,
    };
  };

  const handleMoreMenuClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMoreMenu(openMoreMenu === userId ? null : userId);
  };

  const handleMoreMenuAction = (action: string, user: UserData) => {
    setOpenMoreMenu(null);

    switch (action) {
      case "view":
        handleViewUser(user);
        break;
      case "edit":
        console.log("Edit user:", user.id);
        break;
      case "email":
        console.log("Send email to:", user.email);
        break;
      case "ban":
        console.log("Ban user:", user.id);
        break;
      case "delete":
        setDeleteConfirmationData({
          userId: user.id,
          userName: getDisplayName(user),
          userEmail: user.email,
        });
        setShowDeleteConfirmation(true);
        break;
    }
  };

  // Refund handlers
  const showRefundConfirmationDialog = (
    id: string,
    type: "purchase" | "invoice",
    amount: number,
    description: string
  ) => {
    setRefundConfirmationData({ id, type, amount, description });
    setShowRefundConfirmation(true);
  };

  const handleConfirmRefund = async () => {
    if (!refundConfirmationData) return;

    const { id, type, amount } = refundConfirmationData;

    try {
      setRefundLoading(id);
      setRefundError(null);
      setRefundSuccess(null);
      setShowRefundConfirmation(false);
      setRefundConfirmationData(null);

      let result;
      if (type === "purchase") {
        result = await refundPaymentIntent(id);
      } else {
        result = await refundInvoice(id);
      }

      if (result.success) {
        setRefundSuccess(id);
        // Refresh user data to show updated information
        fetchUsers();
      } else {
        setRefundError(result.error || "Failed to process refund");
      }
    } catch (error) {
      setRefundError("An unexpected error occurred");
      console.error("Refund error:", error);
    } finally {
      setRefundLoading(null);
    }
  };

  const handleCancelRefund = () => {
    setShowRefundConfirmation(false);
    setRefundConfirmationData(null);
  };

  const handleRefundPurchase = (
    purchaseId: string,
    amount: number,
    description: string
  ) => {
    showRefundConfirmationDialog(purchaseId, "purchase", amount, description);
  };

  const handleRefundInvoiceClick = (
    invoiceId: string,
    amount: number,
    description: string
  ) => {
    showRefundConfirmationDialog(invoiceId, "invoice", amount, description);
  };

  const clearRefundMessages = () => {
    setRefundSuccess(null);
    setRefundError(null);
  };

  // Delete user handlers
  const handleConfirmDelete = async () => {
    if (!deleteConfirmationData) return;

    const { userId } = deleteConfirmationData;

    try {
      setDeleteLoading(userId);
      setDeleteError(null);
      setDeleteSuccess(null);
      setShowDeleteConfirmation(false);

      const result = await deleteUserAccount(userId);

      if (result.success) {
        setDeleteSuccess(userId);
        // Refresh user data to remove deleted user
        fetchUsers();
        // Clear confirmation data after a delay
        setTimeout(() => {
          setDeleteConfirmationData(null);
        }, 2000);
      } else {
        setDeleteError(result.error || "Failed to delete user");
        setShowDeleteConfirmation(true); // Keep modal open on error
      }
    } catch (error) {
      setDeleteError("An unexpected error occurred");
      console.error("Delete user error:", error);
      setShowDeleteConfirmation(true); // Keep modal open on error
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setDeleteConfirmationData(null);
  };

  const clearDeleteMessages = () => {
    setDeleteSuccess(null);
    setDeleteError(null);
  };

  // Subscription management handlers
  const handleCancelSubscription = (
    subscriptionId: string,
    customerId: string
  ) => {
    if (!selectedUser) return;
    setCancelConfirmationData({
      subscriptionId,
      customerId,
      userName: getDisplayName(selectedUser),
    });
    setShowCancelConfirmation(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelConfirmationData) return;

    try {
      setSubscriptionLoading(cancelConfirmationData.subscriptionId);
      setSubscriptionError(null);
      setSubscriptionSuccess(null);
      setShowCancelConfirmation(false);

      const result = await cancelSubscriptionAdmin(
        cancelConfirmationData.subscriptionId
      );

      if (result.success) {
        setSubscriptionSuccess(cancelConfirmationData.subscriptionId);
        // Update user profile from Stripe (same as AuthContext refreshUser)
        if (selectedUser?.id) {
          await updateUserProfileFromStripe(selectedUser.id);
        }
        // Refresh subscriptions from Stripe
        await fetchUserSubscriptions(cancelConfirmationData.customerId);
        // Refresh user list to show updated subscription status
        fetchUsers();
      } else {
        setSubscriptionError(result.error || "Failed to cancel subscription");
      }
    } catch (error) {
      setSubscriptionError("An unexpected error occurred");
      console.error("Cancel subscription error:", error);
    } finally {
      setSubscriptionLoading(null);
      setCancelConfirmationData(null);
    }
  };

  const handleCancelCancel = () => {
    setShowCancelConfirmation(false);
    setCancelConfirmationData(null);
  };

  const handleReactivateSubscription = async (
    subscriptionId: string,
    customerId: string
  ) => {
    try {
      setSubscriptionLoading(subscriptionId);
      setSubscriptionError(null);
      setSubscriptionSuccess(null);

      const result = await reactivateSubscription(subscriptionId);

      if (result.success) {
        setSubscriptionSuccess(subscriptionId);
        // Update user profile from Stripe (same as AuthContext refreshUser)
        if (selectedUser?.id) {
          await updateUserProfileFromStripe(selectedUser.id);
        }
        // Refresh subscriptions from Stripe
        await fetchUserSubscriptions(customerId);
        // Refresh user list to show updated subscription status
        fetchUsers();
      } else {
        setSubscriptionError(
          result.error || "Failed to reactivate subscription"
        );
      }
    } catch (error) {
      setSubscriptionError("An unexpected error occurred");
      console.error("Reactivate subscription error:", error);
    } finally {
      setSubscriptionLoading(null);
    }
  };

  const handleChangePlan = async (
    subscriptionId: string,
    newPlanType: "monthly" | "annual",
    customerId: string
  ) => {
    try {
      setSubscriptionLoading(subscriptionId);
      setSubscriptionError(null);
      setSubscriptionSuccess(null);

      // Get price ID for the new plan
      const pricesResult = await getPrices();
      if (!pricesResult.prices) {
        setSubscriptionError("Failed to fetch plan prices");
        return;
      }

      const newPriceId =
        newPlanType === "monthly"
          ? pricesResult.prices.monthly.id
          : pricesResult.prices.annual.id;

      const result = await changeSubscriptionPlan(subscriptionId, newPriceId);

      if (result.success) {
        setSubscriptionSuccess(subscriptionId);

        // Wait a moment for Stripe to propagate the changes
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update user profile from Stripe (same as AuthContext refreshUser)
        // This must happen after Stripe changes are propagated
        if (selectedUser?.id) {
          const updateResult = await updateUserProfileFromStripe(
            selectedUser.id
          );
          if (!updateResult.success) {
            console.error(
              "Failed to update user profile from Stripe:",
              updateResult.error
            );
          }
        }

        // Refresh subscriptions from Stripe
        await fetchUserSubscriptions(customerId);

        // Refresh user list to show updated subscription status
        await fetchUsers();
      } else {
        setSubscriptionError(
          result.error || "Failed to change subscription plan"
        );
      }
    } catch (error) {
      setSubscriptionError("An unexpected error occurred");
      console.error("Change plan error:", error);
    } finally {
      setSubscriptionLoading(null);
    }
  };

  const clearSubscriptionMessages = () => {
    setSubscriptionSuccess(null);
    setSubscriptionError(null);
  };

  const handleRefreshSubscription = async () => {
    if (!selectedUser?.id) return;

    try {
      setRefreshingSubscription(true);
      setSubscriptionRefreshMessage(null);

      const result = await updateUserProStatus(selectedUser.id);

      setSubscriptionRefreshMessage(
        `Subscription updated: ${result.subscription} (${result.source})`
      );

      // Refresh user data
      await fetchUsers();

      // Update selected user if modal is still open
      const updatedUsersResult = await getAllUsersForCRMAdmin(
        currentPage,
        usersPerPage,
        debouncedSearchTerm,
        subscriptionFilter,
        sortField,
        sortDirection
      );
      if (updatedUsersResult && updatedUsersResult.users) {
        const updatedUser = updatedUsersResult.users.find(
          (u) => u.id === selectedUser.id
        );
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
    } catch (error) {
      console.error("Error refreshing subscription:", error);
      setSubscriptionRefreshMessage("Error: Failed to refresh subscription");
    } finally {
      setRefreshingSubscription(false);
      // Clear message after 3 seconds
      setTimeout(() => {
        setSubscriptionRefreshMessage(null);
      }, 3000);
    }
  };

  // Auto-dismiss refund notifications
  useEffect(() => {
    if (refundSuccess) {
      const timer = setTimeout(() => {
        setRefundSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [refundSuccess]);

  useEffect(() => {
    if (refundError) {
      const timer = setTimeout(() => {
        setRefundError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [refundError]);

  // Auto-dismiss delete notifications
  useEffect(() => {
    if (deleteSuccess) {
      const timer = setTimeout(() => {
        setDeleteSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [deleteSuccess]);

  useEffect(() => {
    if (deleteError) {
      const timer = setTimeout(() => {
        setDeleteError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [deleteError]);

  // Auto-dismiss subscription notifications
  useEffect(() => {
    if (subscriptionSuccess) {
      const timer = setTimeout(() => {
        setSubscriptionSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [subscriptionSuccess]);

  useEffect(() => {
    if (subscriptionError) {
      const timer = setTimeout(() => {
        setSubscriptionError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [subscriptionError]);

  // Show page immediately - no early returns
  const showContent = !languageLoading && user;

  // Temporarily disabled admin check for testing
  // if (user.profile?.subscription !== "admin") {
  //   return null;
  // }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  return (
    <Container>
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Header>
          <Title>
            <FaUsers />
            {showContent
              ? t("admin.usersPage.title", "Users Management")
              : "Users Management"}
          </Title>
          <Subtitle>
            {showContent
              ? t(
                  "admin.usersPage.subtitle",
                  "Manage users, subscriptions, purchases, and invoices"
                )
              : "Manage users, subscriptions, purchases, and invoices"}
          </Subtitle>
        </Header>

        {showContent && (
          <>
            <FiltersSection>
              <FiltersRow>
                <SearchContainer>
                  <SearchIcon $isLoading={searchLoading}>
                    <FaSearch />
                  </SearchIcon>
                  <SearchInput
                    type="search"
                    placeholder={
                      searchLoading
                        ? "Loading..."
                        : t(
                            "admin.crmPage.searchPlaceholder",
                            "Search users by name, email, or ID..."
                          )
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    $isLoading={searchLoading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </SearchContainer>

                <FilterSelect
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value)}
                >
                  <option value="all">
                    {t("admin.crmPage.filters.all", "All Users")}
                  </option>
                  <option value="none">
                    {t("admin.crmPage.filters.free", "Free Users")}
                  </option>
                  <option value="monthly">
                    {t("admin.crmPage.filters.monthly", "Monthly Subscribers")}
                  </option>
                  <option value="annual">
                    {t("admin.crmPage.filters.annual", "Annual Subscribers")}
                  </option>
                  <option value="lifetime">
                    {t("admin.crmPage.filters.lifetime", "Lifetime Users")}
                  </option>
                  <option value="admin">
                    {t("admin.crmPage.filters.admin", "Admin Users")}
                  </option>
                </FilterSelect>
              </FiltersRow>
            </FiltersSection>

            <TableContainer>
              {loading && (
                <LoadingOverlay>
                  <NNAudioLoadingSpinner text="Loading users..." size={40} />
                </LoadingOverlay>
              )}
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell
                      $sortable={true}
                      onClick={() => handleSort("firstName")}
                    >
                      {t("admin.crmPage.userTable.name", "Name")}
                      {getSortIcon("firstName")}
                    </TableHeaderCell>
                    <TableHeaderCell
                      $sortable={true}
                      onClick={() => handleSort("email")}
                    >
                      {t("admin.crmPage.userTable.email", "Email")}
                      {getSortIcon("email")}
                    </TableHeaderCell>
                    <TableHeaderCell
                      $sortable={true}
                      onClick={() => handleSort("subscription")}
                    >
                      {t(
                        "admin.crmPage.userTable.subscription",
                        "Subscription"
                      )}
                      {getSortIcon("subscription")}
                    </TableHeaderCell>
                    <TableHeaderCell
                      $sortable={true}
                      onClick={() => handleSort("trialExpiration")}
                    >
                      Trial
                      {getSortIcon("trialExpiration")}
                    </TableHeaderCell>
                    <TableHeaderCell
                      $sortable={true}
                      onClick={() => handleSort("createdAt")}
                    >
                      {t("admin.crmPage.userTable.joinDate", "Join Date")}
                      {getSortIcon("createdAt")}
                    </TableHeaderCell>
                    <LastActiveHeaderCell
                      $sortable={true}
                      onClick={() => handleSort("lastActive")}
                    >
                      Last Active
                      {getSortIcon("lastActive")}
                    </LastActiveHeaderCell>
                    <TableHeaderCell
                      $sortable={true}
                      onClick={() =>
                        handleSort("supportTickets" as keyof UserData)
                      }
                    >
                      Support Tickets
                      {getSortIcon("supportTickets" as keyof UserData)}
                    </TableHeaderCell>
                    <TableHeaderCell
                      $sortable={true}
                      onClick={() => handleSort("totalSpent")}
                    >
                      {t("admin.crmPage.userTable.totalSpent", "Total Spent")}
                      {getSortIcon("totalSpent")}
                    </TableHeaderCell>
                    <TableHeaderCell $sortable={false}>Actions</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <TableRow
                          key={`loading-placeholder-${i}`}
                          style={{ pointerEvents: "none" }}
                        >
                          <TableCell>&nbsp;</TableCell>
                          <TableCell>&nbsp;</TableCell>
                          <TableCell>&nbsp;</TableCell>
                          <TableCell>&nbsp;</TableCell>
                          <LastActiveTableCell>
                            {/* Simulate wrapped content to match actual row height */}
                            <span style={{ visibility: "hidden" }}>
                              11/15/2025, 02:30 PM
                            </span>
                          </LastActiveTableCell>
                          <TableCell>&nbsp;</TableCell>
                          <TableCell>&nbsp;</TableCell>
                          <TableCell>&nbsp;</TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : (
                    users.map((userData, index) => {
                      const supportTicketCount = getSupportTicketCount(
                        userData.id
                      );
                      return (
                        <TableRow
                          key={userData.id}
                          as={motion.tr}
                          variants={fadeIn}
                          custom={index}
                          initial="hidden"
                          animate="visible"
                          onClick={() => handleViewUser(userData)}
                        >
                          <TableCell>
                            <UserInfo>
                              <UserAvatar
                                $color={getAvatarColor(userData.email)}
                              >
                                {getInitials(userData)}
                              </UserAvatar>
                              <UserDetails>
                                <UserName>{getDisplayName(userData)}</UserName>
                              </UserDetails>
                            </UserInfo>
                          </TableCell>
                          <TableCell>
                            <UserEmail>{userData.email}</UserEmail>
                          </TableCell>
                          <SubscriptionCell>
                            <SubscriptionBadge
                              $color={getSubscriptionBadgeColor(
                                userData.hasNfr ? "nfr" : userData.subscription
                              )}
                              $variant={
                                userData.hasNfr ||
                                isSubscriptionPremium(userData.subscription)
                                  ? "premium"
                                  : "default"
                              }
                            >
                              {userData.hasNfr ? (
                                <FaCrown />
                              ) : (
                                getSubscriptionIcon(userData.subscription)
                              )}
                              {userData.hasNfr ? "NFR" : userData.subscription}
                            </SubscriptionBadge>
                            {userData.customerId &&
                              hasPaymentMethod[userData.id] && (
                                <FaCreditCard
                                  style={{
                                    fontSize: "0.9rem",
                                    color: "var(--text-secondary)",
                                    marginLeft: "0.25rem",
                                  }}
                                  title="Credit card on file"
                                />
                              )}
                          </SubscriptionCell>
                          <TrialCell>
                            {(() => {
                              const trialInfo = getTrialInfo(
                                userData.trialExpiration,
                                userData.createdAt,
                                userData.subscriptionExpiration
                              );
                              if (!trialInfo) return null;
                              return (
                                <TrialBadgeBox $isActive={trialInfo.isActive}>
                                  {trialInfo.days}
                                </TrialBadgeBox>
                              );
                            })()}
                          </TrialCell>
                          <JoinDateTableCell>
                            {formatDateTimeNoLeadingZero(userData.createdAt)}
                          </JoinDateTableCell>
                          <LastActiveTableCell>
                            {formatDateTimeNoLeadingZero(
                              userData.lastActive || userData.createdAt
                            )}
                          </LastActiveTableCell>
                          <TableCell>
                            <SupportTicketsCount>
                              <FaTicketAlt />
                              <TicketBadge
                                $openCount={supportTicketCount.open}
                                $closedCount={supportTicketCount.closed}
                                $totalCount={supportTicketCount.total}
                              >
                                {supportTicketCount.total}
                              </TicketBadge>
                            </SupportTicketsCount>
                          </TableCell>
                          <TableCell>
                            {userData.totalSpent === -1 ? (
                              <LoadingSpinner
                                style={{ display: "inline-block" }}
                              />
                            ) : (
                              formatCurrency(userData.totalSpent)
                            )}
                          </TableCell>
                          <TableCell>
                            <MoreMenuContainer
                              data-more-menu
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreMenuButton
                                onClick={(e) =>
                                  handleMoreMenuClick(userData.id, e)
                                }
                              >
                                <FaEllipsisV />
                              </MoreMenuButton>

                              {openMoreMenu === userData.id && (
                                <MoreMenuDropdown
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  <MoreMenuItem
                                    onClick={() =>
                                      handleMoreMenuAction("view", userData)
                                    }
                                  >
                                    <FaEye />
                                    View Profile
                                  </MoreMenuItem>
                                  <MoreMenuItem
                                    onClick={() =>
                                      handleMoreMenuAction("edit", userData)
                                    }
                                  >
                                    <FaEdit />
                                    Edit User
                                  </MoreMenuItem>
                                  <MoreMenuItem
                                    onClick={() =>
                                      handleMoreMenuAction("email", userData)
                                    }
                                  >
                                    <FaEnvelope />
                                    Send Email
                                  </MoreMenuItem>
                                  <MoreMenuItem
                                    onClick={() =>
                                      handleMoreMenuAction("ban", userData)
                                    }
                                  >
                                    <FaBan />
                                    Ban User
                                  </MoreMenuItem>
                                  <MoreMenuItem
                                    variant="danger"
                                    onClick={() =>
                                      handleMoreMenuAction("delete", userData)
                                    }
                                  >
                                    <FaTrash />
                                    Delete User
                                  </MoreMenuItem>
                                </MoreMenuDropdown>
                              )}
                            </MoreMenuContainer>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <Pagination>
                <PaginationInfo>
                  {searchLoading ? (
                    <>
                      {t("admin.crmPage.loading", "Loading...")}
                      <SearchLoadingSpinner />
                    </>
                  ) : (
                    <>
                      Showing {(currentPage - 1) * usersPerPage + 1} to{" "}
                      {Math.min(currentPage * usersPerPage, totalCount)} of{" "}
                      {totalCount} users
                      <PageSizeSelect
                        value={usersPerPage}
                        onChange={(e) =>
                          setUsersPerPage(Number(e.target.value))
                        }
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </PageSizeSelect>
                      <span
                        style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}
                      >
                        per page
                      </span>
                    </>
                  )}
                </PaginationInfo>
                <PaginationButtons>
                  <PaginationButton
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <FaChevronLeft />
                  </PaginationButton>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
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
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <FaChevronRight />
                  </PaginationButton>
                </PaginationButtons>
              </Pagination>
            </TableContainer>
          </>
        )}

        {/* User Detail Modal */}
        {showUserModal && selectedUser && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaUser />
                  {getDisplayName(selectedUser)}
                </ModalTitle>
                <CloseButton onClick={closeModal}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              {/* User Information */}
              <ModalSection>
                <SectionTitle>
                  <FaUser />
                  User Information
                </SectionTitle>
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel>Email</InfoLabel>
                    <InfoValue>{selectedUser.email}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Subscription</InfoLabel>
                    <InfoValue>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                          width: "100%",
                        }}
                      >
                        <SubscriptionBadge
                          $color={getSubscriptionBadgeColor(
                            selectedUser.hasNfr
                              ? "nfr"
                              : selectedUser.subscription
                          )}
                          $variant={
                            selectedUser.hasNfr ||
                            isSubscriptionPremium(selectedUser.subscription)
                              ? "premium"
                              : "default"
                          }
                        >
                          {selectedUser.hasNfr ? (
                            <FaCrown />
                          ) : (
                            getSubscriptionIcon(selectedUser.subscription)
                          )}
                          {selectedUser.hasNfr
                            ? "NFR"
                            : selectedUser.subscription}
                        </SubscriptionBadge>
                        <RefreshButton
                          onClick={handleRefreshSubscription}
                          disabled={refreshingSubscription}
                          title="Refresh subscription status"
                          type="button"
                        >
                          {refreshingSubscription ? (
                            <LoadingSpinner />
                          ) : (
                            <FaSyncAlt style={{ display: "block" }} />
                          )}
                        </RefreshButton>
                        {subscriptionRefreshMessage && (
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--success)",
                              marginLeft: "8px",
                            }}
                          >
                            {subscriptionRefreshMessage}
                          </span>
                        )}
                      </div>
                    </InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Trial Days Left</InfoLabel>
                    <InfoValue>
                      {(() => {
                        const daysLeft = getRemainingTrialDays(
                          selectedUser.trialExpiration
                        );
                        if (daysLeft === null) {
                          return "N/A";
                        }
                        return `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
                      })()}
                    </InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Has Payment Method</InfoLabel>
                    <InfoValue>
                      {selectedUserHasPaymentMethod === null ? (
                        <LoadingSpinner
                          style={{
                            display: "inline-block",
                            marginRight: "8px",
                          }}
                        />
                      ) : selectedUserHasPaymentMethod ? (
                        "Yes"
                      ) : (
                        "No"
                      )}
                    </InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Total Spent</InfoLabel>
                    <InfoValue>
                      {selectedUser.totalSpent === -1 ? (
                        <LoadingSpinner
                          style={{
                            display: "inline-block",
                            marginRight: "8px",
                          }}
                        />
                      ) : (
                        formatCurrency(selectedUser.totalSpent)
                      )}
                    </InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Join Date</InfoLabel>
                    <InfoValue>
                      {formatDateTimeNoLeadingZero(selectedUser.createdAt)}
                    </InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Last Active</InfoLabel>
                    <InfoValue>
                      {formatDateTimeNoLeadingZero(
                        selectedUser.lastActive || selectedUser.createdAt
                      )}
                    </InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Customer ID</InfoLabel>
                    <InfoValue>
                      {selectedUser.customerId ? (
                        <StripeLink
                          href={`https://dashboard.stripe.com/customers/${selectedUser.customerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedUser.customerId}
                        </StripeLink>
                      ) : (
                        "N/A"
                      )}
                    </InfoValue>
                  </InfoItem>
                </InfoGrid>
              </ModalSection>

              {/* Subscriptions */}
              <ModalSection>
                <SectionTitle>
                  <FaCrown />
                  Subscriptions
                </SectionTitle>
                {loadingSubscriptions ? (
                  <EmptyState>Loading subscriptions...</EmptyState>
                ) : userSubscriptions.length > 0 ? (
                  <>
                    <DataTable>
                      <DataTableHeader>
                        <tr>
                          <DataTableHeaderCell>ID</DataTableHeaderCell>
                          <DataTableHeaderCell>Status</DataTableHeaderCell>
                          <DataTableHeaderCell>Plan</DataTableHeaderCell>
                          <DataTableHeaderCell>Amount</DataTableHeaderCell>
                          <DataTableHeaderCell>
                            Current Period
                          </DataTableHeaderCell>
                          <DataTableHeaderCell>Auto Renew</DataTableHeaderCell>
                          <DataTableHeaderCell>Actions</DataTableHeaderCell>
                        </tr>
                      </DataTableHeader>
                      <DataTableBody>
                        {userSubscriptions.map((sub) => {
                          const isActive =
                            sub.status === "active" ||
                            sub.status === "trialing";
                          const isCanceled =
                            sub.status === "canceled" ||
                            sub.cancel_at_period_end;
                          const price = sub.items?.[0]?.price;
                          const priceId = price?.id || "";
                          const interval = price?.recurring?.interval || "";
                          const isMonthly = interval === "month";
                          const isAnnual = interval === "year";
                          const currentPlan = isMonthly
                            ? "monthly"
                            : isAnnual
                            ? "annual"
                            : "unknown";
                          const amount = price?.unit_amount
                            ? price.unit_amount / 100
                            : 0;
                          const customerId =
                            typeof sub.customer === "string"
                              ? sub.customer
                              : sub.customer?.id ||
                                selectedUser?.customerId ||
                                "";

                          return (
                            <DataTableRow key={sub.id}>
                              <DataTableCell
                                style={{
                                  fontSize: "0.8rem",
                                  wordBreak: "break-all",
                                }}
                              >
                                <StripeLink
                                  href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {sub.id}
                                </StripeLink>
                              </DataTableCell>
                              <DataTableCell>
                                <StatusBadge $status={sub.status}>
                                  {sub.status}
                                </StatusBadge>
                              </DataTableCell>
                              <DataTableCell>
                                <PlanSelect
                                  value={currentPlan}
                                  onChange={(e) => {
                                    const newPlan = e.target.value as
                                      | "monthly"
                                      | "annual";
                                    if (newPlan !== currentPlan && isActive) {
                                      handleChangePlan(
                                        sub.id,
                                        newPlan,
                                        customerId
                                      );
                                    }
                                  }}
                                  disabled={
                                    !isActive || subscriptionLoading === sub.id
                                  }
                                  $disabled={
                                    !isActive || subscriptionLoading === sub.id
                                  }
                                >
                                  <option value="monthly">Monthly</option>
                                  <option value="annual">Annual</option>
                                </PlanSelect>
                              </DataTableCell>
                              <DataTableCell>
                                {formatCurrency(amount)}
                              </DataTableCell>
                              <DataTableCell>
                                {sub.current_period_start &&
                                sub.current_period_end
                                  ? `${new Date(
                                      sub.current_period_start * 1000
                                    ).toLocaleDateString()} - ${new Date(
                                      sub.current_period_end * 1000
                                    ).toLocaleDateString()}`
                                  : "N/A"}
                              </DataTableCell>
                              <DataTableCell>
                                {isCanceled ? "No" : "Yes"}
                              </DataTableCell>
                              <DataTableCell>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {isActive && !isCanceled && (
                                    <RefundButton
                                      variant="danger"
                                      disabled={subscriptionLoading === sub.id}
                                      onClick={() =>
                                        handleCancelSubscription(
                                          sub.id,
                                          customerId
                                        )
                                      }
                                    >
                                      {subscriptionLoading === sub.id ? (
                                        <LoadingSpinner />
                                      ) : (
                                        <FaBan />
                                      )}
                                      Cancel
                                    </RefundButton>
                                  )}
                                  {isCanceled && (
                                    <RefundButton
                                      variant="primary"
                                      disabled={subscriptionLoading === sub.id}
                                      onClick={() =>
                                        handleReactivateSubscription(
                                          sub.id,
                                          customerId
                                        )
                                      }
                                    >
                                      {subscriptionLoading === sub.id ? (
                                        <LoadingSpinner />
                                      ) : (
                                        <FaUndo />
                                      )}
                                      Reactivate
                                    </RefundButton>
                                  )}
                                </div>
                              </DataTableCell>
                            </DataTableRow>
                          );
                        })}
                      </DataTableBody>
                    </DataTable>
                  </>
                ) : (
                  <EmptyState>No subscriptions found</EmptyState>
                )}
              </ModalSection>

              {/* Support Tickets */}
              <ModalSection>
                <SectionTitle>
                  <FaTicketAlt />
                  Support Tickets
                </SectionTitle>
                {loadingSupportTickets ? (
                  <EmptyState>Loading support tickets...</EmptyState>
                ) : supportTickets.length > 0 ? (
                  <>
                    <div style={{ marginBottom: "1rem" }}>
                      <Link
                        href="/admin/support-tickets"
                        style={{
                          color: "var(--primary)",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.9rem",
                        }}
                      >
                        <FaTicketAlt />
                        View all tickets
                      </Link>
                    </div>
                    <DataTable>
                      <DataTableHeader>
                        <tr>
                          <DataTableHeaderCell>Ticket #</DataTableHeaderCell>
                          <DataTableHeaderCell>Subject</DataTableHeaderCell>
                          <DataTableHeaderCell>Status</DataTableHeaderCell>
                          <DataTableHeaderCell>Created</DataTableHeaderCell>
                        </tr>
                      </DataTableHeader>
                      <DataTableBody>
                        {supportTickets.map((ticket) => (
                          <DataTableRow key={ticket.id}>
                            <DataTableCell>
                              <Link
                                href={`/admin/support-tickets?ticket=${ticket.id}`}
                                style={{
                                  color: "var(--primary)",
                                  textDecoration: "none",
                                }}
                              >
                                {ticket.ticket_number}
                              </Link>
                            </DataTableCell>
                            <DataTableCell>{ticket.subject}</DataTableCell>
                            <DataTableCell>
                              <span
                                style={{
                                  textTransform: "capitalize",
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    ticket.status === "open"
                                      ? "rgba(52, 152, 219, 0.2)"
                                      : ticket.status === "in_progress"
                                      ? "rgba(241, 196, 15, 0.2)"
                                      : ticket.status === "resolved"
                                      ? "rgba(46, 204, 113, 0.2)"
                                      : "rgba(149, 165, 166, 0.2)",
                                  color: "var(--text)",
                                }}
                              >
                                {ticket.status.replace("_", " ")}
                              </span>
                            </DataTableCell>
                            <DataTableCell>
                              {formatDate(ticket.created_at)}
                            </DataTableCell>
                          </DataTableRow>
                        ))}
                      </DataTableBody>
                    </DataTable>
                  </>
                ) : (
                  <EmptyState>No support tickets found</EmptyState>
                )}
              </ModalSection>

              {/* Purchases */}
              <ModalSection>
                <SectionTitle>
                  <FaChartLine />
                  Purchases
                </SectionTitle>
                {loadingPurchases ? (
                  <EmptyState>Loading purchases...</EmptyState>
                ) : userPurchases.length > 0 ? (
                  <DataTable>
                    <DataTableHeader>
                      <tr>
                        <DataTableHeaderCell>ID</DataTableHeaderCell>
                        <DataTableHeaderCell>Description</DataTableHeaderCell>
                        <DataTableHeaderCell>Amount</DataTableHeaderCell>
                        <DataTableHeaderCell>Status</DataTableHeaderCell>
                        <DataTableHeaderCell>Date</DataTableHeaderCell>
                        <DataTableHeaderCell>Actions</DataTableHeaderCell>
                      </tr>
                    </DataTableHeader>
                    <DataTableBody>
                      {userPurchases.map((purchase) => (
                        <DataTableRow key={purchase.id}>
                          <DataTableCell>
                            <StripeLink
                              href={`https://dashboard.stripe.com/payments/${purchase.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {purchase.id}
                            </StripeLink>
                          </DataTableCell>
                          <DataTableCell>{purchase.description}</DataTableCell>
                          <DataTableCell>
                            {formatCurrency(purchase.amount)}
                          </DataTableCell>
                          <DataTableCell>
                            <StatusBadge $status={purchase.status}>
                              {purchase.status}
                            </StatusBadge>
                          </DataTableCell>
                          <DataTableCell>
                            {formatDate(purchase.createdAt)}
                          </DataTableCell>
                          <DataTableCell>
                            {purchase.status === "succeeded" && (
                              <RefundButton
                                variant="danger"
                                disabled={refundLoading === purchase.id}
                                onClick={() =>
                                  handleRefundPurchase(
                                    purchase.id,
                                    purchase.amount,
                                    purchase.description
                                  )
                                }
                              >
                                {refundLoading === purchase.id ? (
                                  <LoadingSpinner />
                                ) : (
                                  <FaUndo />
                                )}
                                {refundSuccess === purchase.id
                                  ? "Refunded"
                                  : "Refund"}
                              </RefundButton>
                            )}
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                ) : (
                  <EmptyState>No purchases found</EmptyState>
                )}
              </ModalSection>

              {/* Invoices */}
              <ModalSection>
                <SectionTitle>
                  <FaTicketAlt />
                  Invoices
                </SectionTitle>
                {loadingInvoices ? (
                  <EmptyState>Loading invoices...</EmptyState>
                ) : userInvoices.length > 0 ? (
                  <DataTable>
                    <DataTableHeader>
                      <tr>
                        <DataTableHeaderCell>ID</DataTableHeaderCell>
                        <DataTableHeaderCell>Number</DataTableHeaderCell>
                        <DataTableHeaderCell>Amount</DataTableHeaderCell>
                        <DataTableHeaderCell>Status</DataTableHeaderCell>
                        <DataTableHeaderCell>Created</DataTableHeaderCell>
                        <DataTableHeaderCell>Paid</DataTableHeaderCell>
                        <DataTableHeaderCell>Actions</DataTableHeaderCell>
                      </tr>
                    </DataTableHeader>
                    <DataTableBody>
                      {userInvoices.map((invoice) => (
                        <DataTableRow key={invoice.id}>
                          <DataTableCell>
                            <StripeLink
                              href={`https://dashboard.stripe.com/invoices/${invoice.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {invoice.id}
                            </StripeLink>
                          </DataTableCell>
                          <DataTableCell>
                            {invoice.number || "N/A"}
                          </DataTableCell>
                          <DataTableCell>
                            {formatCurrency(invoice.amount)}
                          </DataTableCell>
                          <DataTableCell>
                            <StatusBadge $status={invoice.status}>
                              {invoice.status}
                            </StatusBadge>
                          </DataTableCell>
                          <DataTableCell>
                            {formatDate(invoice.createdAt)}
                          </DataTableCell>
                          <DataTableCell>
                            {invoice.paidAt
                              ? formatDate(invoice.paidAt)
                              : "N/A"}
                          </DataTableCell>
                          <DataTableCell>
                            {invoice.status === "paid" && (
                              <RefundButton
                                variant="danger"
                                disabled={refundLoading === invoice.id}
                                onClick={() =>
                                  handleRefundInvoiceClick(
                                    invoice.id,
                                    invoice.amount,
                                    `Invoice ${invoice.number || invoice.id}`
                                  )
                                }
                              >
                                {refundLoading === invoice.id ? (
                                  <LoadingSpinner />
                                ) : (
                                  <FaUndo />
                                )}
                                {refundSuccess === invoice.id
                                  ? "Refunded"
                                  : "Refund"}
                              </RefundButton>
                            )}
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                ) : (
                  <EmptyState>No invoices found</EmptyState>
                )}
              </ModalSection>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* Refund Notifications */}
        {refundSuccess && (
          <RefundNotification
            type="success"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            onClick={clearRefundMessages}
          >
            <FaCheck />
            Refund processed successfully!
          </RefundNotification>
        )}

        {refundError && (
          <RefundNotification
            type="error"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            onClick={clearRefundMessages}
          >
            <FaExclamationTriangle />
            {refundError}
          </RefundNotification>
        )}

        {/* Delete User Notifications */}
        {deleteSuccess && (
          <RefundNotification
            type="success"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            onClick={clearDeleteMessages}
          >
            <FaCheck />
            User deleted successfully!
          </RefundNotification>
        )}

        {deleteError && !showDeleteConfirmation && (
          <RefundNotification
            type="error"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            onClick={clearDeleteMessages}
          >
            <FaExclamationTriangle />
            {deleteError}
          </RefundNotification>
        )}

        {/* Subscription Management Notifications */}
        {subscriptionSuccess && (
          <RefundNotification
            type="success"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            onClick={clearSubscriptionMessages}
          >
            <FaCheck />
            Subscription updated successfully!
          </RefundNotification>
        )}

        {subscriptionError && !showCancelConfirmation && (
          <RefundNotification
            type="error"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            onClick={clearSubscriptionMessages}
          >
            <FaExclamationTriangle />
            {subscriptionError}
          </RefundNotification>
        )}

        {/* Refund Confirmation Modal */}
        {showRefundConfirmation && (
          <ConfirmationModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancelRefund}
          >
            <ConfirmationModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ConfirmationTitle>
                <FaCheck />
                Refund Confirmation
              </ConfirmationTitle>
              <ConfirmationMessage>
                Are you sure you want to refund this transaction?
              </ConfirmationMessage>
              <ConfirmationDetails>
                <ConfirmationDetailItem>
                  <ConfirmationDetailLabel>Amount</ConfirmationDetailLabel>
                  <ConfirmationDetailValue>
                    {refundConfirmationData
                      ? formatCurrency(refundConfirmationData.amount)
                      : "N/A"}
                  </ConfirmationDetailValue>
                </ConfirmationDetailItem>
                <ConfirmationDetailItem>
                  <ConfirmationDetailLabel>Description</ConfirmationDetailLabel>
                  <ConfirmationDetailValue>
                    {refundConfirmationData?.description}
                  </ConfirmationDetailValue>
                </ConfirmationDetailItem>
              </ConfirmationDetails>
              <ConfirmationButtons>
                <ConfirmationButton
                  variant="danger"
                  onClick={handleConfirmRefund}
                >
                  <FaTrash />
                  Refund
                </ConfirmationButton>
                <ConfirmationButton
                  variant="secondary"
                  onClick={handleCancelRefund}
                >
                  <FaTimes />
                  Cancel
                </ConfirmationButton>
              </ConfirmationButtons>
            </ConfirmationModalContent>
          </ConfirmationModalOverlay>
        )}

        {/* Cancel Subscription Confirmation Modal */}
        {showCancelConfirmation && cancelConfirmationData && (
          <ConfirmationModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancelCancel}
          >
            <ConfirmationModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ConfirmationTitle>
                <FaExclamationTriangle />
                Cancel Subscription
              </ConfirmationTitle>
              <ConfirmationMessage>
                Are you sure you want to cancel this subscription? This action
                will cancel the subscription immediately.
              </ConfirmationMessage>
              <ConfirmationDetails>
                <ConfirmationDetailItem>
                  <ConfirmationDetailLabel>User</ConfirmationDetailLabel>
                  <ConfirmationDetailValue>
                    {cancelConfirmationData.userName}
                  </ConfirmationDetailValue>
                </ConfirmationDetailItem>
                <ConfirmationDetailItem>
                  <ConfirmationDetailLabel>
                    Subscription ID
                  </ConfirmationDetailLabel>
                  <ConfirmationDetailValue
                    style={{ fontSize: "0.8rem", wordBreak: "break-all" }}
                  >
                    {cancelConfirmationData.subscriptionId}
                  </ConfirmationDetailValue>
                </ConfirmationDetailItem>
              </ConfirmationDetails>
              {subscriptionError && (
                <ConfirmationMessage
                  style={{
                    color: "#e74c3c",
                    marginTop: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <FaExclamationTriangle style={{ marginRight: "0.5rem" }} />
                  {subscriptionError}
                </ConfirmationMessage>
              )}
              <ConfirmationButtons>
                <ConfirmationButton
                  variant="danger"
                  onClick={handleConfirmCancel}
                  disabled={
                    subscriptionLoading ===
                    cancelConfirmationData.subscriptionId
                  }
                >
                  {subscriptionLoading ===
                  cancelConfirmationData.subscriptionId ? (
                    <>
                      <LoadingSpinner />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <FaBan />
                      Cancel Subscription
                    </>
                  )}
                </ConfirmationButton>
                <ConfirmationButton
                  variant="secondary"
                  onClick={handleCancelCancel}
                  disabled={
                    subscriptionLoading ===
                    cancelConfirmationData.subscriptionId
                  }
                >
                  <FaTimes />
                  Keep Active
                </ConfirmationButton>
              </ConfirmationButtons>
            </ConfirmationModalContent>
          </ConfirmationModalOverlay>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteConfirmation && deleteConfirmationData && (
          <ConfirmationModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancelDelete}
          >
            <ConfirmationModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ConfirmationTitle>
                <FaExclamationTriangle />
                Delete User Confirmation
              </ConfirmationTitle>
              <ConfirmationMessage>
                Are you sure you want to delete this user? This action cannot be
                undone. All subscriptions will be canceled and the user account
                will be permanently deleted.
              </ConfirmationMessage>
              <ConfirmationDetails>
                <ConfirmationDetailItem>
                  <ConfirmationDetailLabel>Name</ConfirmationDetailLabel>
                  <ConfirmationDetailValue>
                    {deleteConfirmationData.userName}
                  </ConfirmationDetailValue>
                </ConfirmationDetailItem>
                <ConfirmationDetailItem>
                  <ConfirmationDetailLabel>Email</ConfirmationDetailLabel>
                  <ConfirmationDetailValue>
                    {deleteConfirmationData.userEmail}
                  </ConfirmationDetailValue>
                </ConfirmationDetailItem>
                <ConfirmationDetailItem>
                  <ConfirmationDetailLabel>User ID</ConfirmationDetailLabel>
                  <ConfirmationDetailValue
                    style={{ fontSize: "0.8rem", wordBreak: "break-all" }}
                  >
                    {deleteConfirmationData.userId}
                  </ConfirmationDetailValue>
                </ConfirmationDetailItem>
              </ConfirmationDetails>
              {deleteError && (
                <ConfirmationMessage
                  style={{
                    color: "#e74c3c",
                    marginTop: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <FaExclamationTriangle style={{ marginRight: "0.5rem" }} />
                  {deleteError}
                </ConfirmationMessage>
              )}
              <ConfirmationButtons>
                <ConfirmationButton
                  variant="danger"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading === deleteConfirmationData.userId}
                >
                  {deleteLoading === deleteConfirmationData.userId ? (
                    <>
                      <LoadingSpinner />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Delete User
                    </>
                  )}
                </ConfirmationButton>
                <ConfirmationButton
                  variant="secondary"
                  onClick={handleCancelDelete}
                  disabled={deleteLoading === deleteConfirmationData.userId}
                >
                  <FaTimes />
                  Cancel
                </ConfirmationButton>
              </ConfirmationButtons>
            </ConfirmationModalContent>
          </ConfirmationModalOverlay>
        )}
      </motion.div>
    </Container>
  );
}
