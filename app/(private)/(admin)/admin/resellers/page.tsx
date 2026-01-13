/**
 * @fileoverview Admin page for managing resellers and their product codes
 * @module admin/resellers
 */

"use client";

import React, { useEffect, useState } from "react";
import NextSEO from "@/components/NextSEO";
import Image from "next/image";
import Link from "next/link";
import {
  FaStore,
  FaPlus,
  FaSearch,
  FaEye,
  FaTrash,
  FaDownload,
  FaTimes,
  FaBox,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaEllipsisV,
  FaKey,
  FaBan,
  FaUndo,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinningIcon = styled(FaSpinner)`
  animation: ${spin} 1s linear infinite;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
  position: relative;
  overflow: visible;

  @media (max-width: 768px) {
    padding: 20px 15px;
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

const ActionsBar = styled.div`
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
  padding: 12px 20px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: var(--card-bg);
  border-radius: 12px;
  overflow: visible;
  margin-bottom: 2rem;
  position: relative;
`;

const Thead = styled.thead`
  background: rgba(108, 99, 255, 0.1);
`;

const Th = styled.th`
  padding: 1rem;
  text-align: left;
  color: var(--text);
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;

  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }
`;

const Tbody = styled.tbody`
  position: relative;
  overflow: visible;
`;

const Tr = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
  cursor: pointer;
  position: relative;
  overflow: visible;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: 1rem;
  color: var(--text);
  font-size: 0.9rem;
  position: relative;
  overflow: visible;

  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ActionButton = styled.button<{ $variant?: "primary" | "danger" }>`
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;

  ${(props) => {
    switch (props.$variant) {
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
    font-size: 0.7rem;
  }
`;

const MoreMenuContainer = styled.div`
  position: relative;
  display: inline-block;
  z-index: 10;
  overflow: visible;
  
  [data-dropdown] {
    position: relative;
    overflow: visible;
  }
`;

const MoreMenuButton = styled.button`
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }

  &.active {
    background-color: rgba(108, 99, 255, 0.1);
    color: var(--primary);
  }
`;

const MoreMenuDropdown = styled(motion.div)<{ $top?: number; $right?: number }>`
  position: fixed;
  top: ${props => props.$top ? `${props.$top}px` : 'auto'};
  right: ${props => props.$right ? `${props.$right}px` : 'auto'};
  margin-top: 0.5rem;
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  min-width: 200px;
  overflow: visible;
`;

const StatusBadge = styled.span<{ $status: "active" | "suspended" | "deleted" }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: ${props => {
    switch (props.$status) {
      case "active": return "rgba(46, 204, 113, 0.2)";
      case "suspended": return "rgba(255, 193, 7, 0.2)";
      case "deleted": return "rgba(231, 76, 60, 0.2)";
      default: return "rgba(255, 255, 255, 0.1)";
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case "active": return "#2ecc71";
      case "suspended": return "#ffc107";
      case "deleted": return "#e74c3c";
      default: return "var(--text-secondary)";
    }
  }};
  border: 1px solid ${props => {
    switch (props.$status) {
      case "active": return "rgba(46, 204, 113, 0.3)";
      case "suspended": return "rgba(255, 193, 7, 0.3)";
      case "deleted": return "rgba(231, 76, 60, 0.3)";
      default: return "rgba(255, 255, 255, 0.1)";
    }
  }};
`;

const ConfirmDialog = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ConfirmDialogContent = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const ConfirmDialogTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 1rem;
`;

const ConfirmDialogMessage = styled.div`
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 2rem;
  
  p {
    margin: 0;
  }
  
  ul {
    margin: 0.5rem 0;
  }
  
  li {
    margin: 0.25rem 0;
  }
`;

const ConfirmDialogActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button<{ $variant?: "danger" | "primary" }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  
  ${props => {
    if (props.$variant === "danger") {
      return `
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
        }
      `;
    } else if (props.$variant === "primary") {
      return `
        background: linear-gradient(135deg, var(--primary), var(--accent));
        color: white;
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
        }
      `;
    } else {
      return `
        background: rgba(255, 255, 255, 0.1);
        color: var(--text);
        border: 1px solid rgba(255, 255, 255, 0.2);
        &:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const MoreMenuItem = styled.div<{ $variant?: "danger" }>`
  padding: 12px 16px;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--primary);
  }

  ${(props) =>
    props.$variant === "danger" &&
    `
    color: #e74c3c;
    &:hover {
      background-color: rgba(231, 76, 60, 0.1);
      color: #c0392b;
    }
  `}

  svg {
    font-size: 0.85rem;
  }
`;

// Modal Components
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
  max-width: 900px;
  max-height: 90vh;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: var(--primary);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const ProductCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--primary);
    transform: translateY(-2px);
  }
`;

const ProductName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
    font-size: 0.9rem;
  }
`;

const ProductStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
`;

const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// Add Reseller Modal
const AddResellerModal = styled(ModalContent)`
  max-width: 500px;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text);
  font-weight: 500;
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

const InfoBox = styled.div`
  padding: 1rem 1.25rem;
  background: rgba(108, 99, 255, 0.1);
  border: 1px solid rgba(108, 99, 255, 0.2);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
`;

const ProductSelectCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--primary);
  }
`;

const ProductThumbnail = styled.div`
  width: 60px;
  height: 60px;
  min-width: 60px;
  min-height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  svg {
    width: 24px;
    height: 24px;
    color: var(--text-secondary);
  }
`;

const ProductSelectInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const QuantityInput = styled(Input)`
  width: 80px;
  text-align: center;
  padding: 8px;
  font-weight: 600;
`;

const GlobalQuantityContainer = styled.div`
  padding: 1rem;
  background: rgba(108, 99, 255, 0.05);
  border: 1px solid rgba(108, 99, 255, 0.2);
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const GlobalQuantityLabel = styled(Label)`
  margin: 0;
  white-space: nowrap;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const Button = styled.button<{ $variant?: "primary" | "secondary" }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  ${(props) => {
    switch (props.$variant) {
      case "primary":
        return `
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
          }
        `;
      default:
        return `
          background: rgba(255, 255, 255, 0.1);
          color: var(--text);
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Notification = styled(motion.div)<{ $type: "success" | "error" }>`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  background-color: ${(props) =>
    props.$type === "success" ? "rgba(46, 204, 113, 0.9)" : "rgba(231, 76, 60, 0.9)"};
  color: white;
  font-weight: 500;
  z-index: 10001;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

interface Reseller {
  id: string;
  name: string;
  email: string | null;
  contact_info: string | null;
  notes: string | null;
  status: "active" | "suspended" | "deleted";
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  featured_image_url?: string | null;
  logo_url?: string | null;
}

interface ResellerCode {
  id: string;
  reseller_id: string;
  product_id: string;
  serial_code: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
  products?: Product;
  redeemed_by_user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface ProductCodeStats {
  product: Product;
  total: number;
  available: number;
  redeemed: number;
}

/**
 * @brief Format a serial code with hyphens every 4 characters
 * @param {string} code - The serial code to format
 * @returns {string} Formatted code with hyphens
 * @example
 * formatSerialCode("ABCD1234EFGH5678") // Returns "ABCD-1234-EFGH-5678"
 */
const formatSerialCode = (code: string): string => {
  if (!code) return "";
  // Remove any existing hyphens/spaces, then add hyphens every 4 characters
  const cleanCode = code.replace(/[-\s]/g, "");
  return cleanCode.match(/.{1,4}/g)?.join("-") || cleanCode;
};

export default function ResellersPage() {
  const { user } = useAuth();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productStats, setProductStats] = useState<ProductCodeStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showAddCodesModal, setShowAddCodesModal] = useState(false);
  const [showGenerateCodesModal, setShowGenerateCodesModal] = useState(false);
  const [selectedProductForCodes, setSelectedProductForCodes] = useState<Product | null>(null);
  const [codesInput, setCodesInput] = useState("");
  const [addingCodes, setAddingCodes] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    count: "10",
    prefix: "",
    length: "12",
  });
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [viewingCodes, setViewingCodes] = useState<ResellerCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [openMoreMenu, setOpenMoreMenu] = useState<string | null>(null);
  const [moreMenuPosition, setMoreMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [showProductSelectModal, setShowProductSelectModal] = useState(false);
  const [codeActionType, setCodeActionType] = useState<"generate" | "add" | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productQuantities, setProductQuantities] = useState<Record<string, string>>({});
  const [globalQuantity, setGlobalQuantity] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "delete" | "reactivate"; reseller: Reseller } | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Add reseller form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact_info: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResellers();
    fetchProducts();
  }, []);

  // Refetch stats when products are loaded (to get image URLs)
  useEffect(() => {
    if (selectedReseller && products.length > 0 && showDetailsModal) {
      fetchResellerStats(selectedReseller.id);
    }
  }, [products.length, selectedReseller?.id]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (openMoreMenu && !target.closest('[data-dropdown]')) {
        setOpenMoreMenu(null);
        setMoreMenuPosition(null);
      }
    };

    if (openMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMoreMenu]);

  const fetchResellers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/resellers");
      const data = await response.json();

      if (response.ok) {
        setResellers(data.resellers || []);
      } else {
        showNotification("error", data.error || "Failed to fetch resellers");
      }
    } catch (error: any) {
      console.error("Error fetching resellers:", error);
      showNotification("error", "Failed to fetch resellers");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=10000");
      const data = await response.json();

      if (data.success) {
        const productsWithImages = (data.products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          featured_image_url: p.featured_image_url,
          logo_url: p.logo_url,
        }));
        setProducts(productsWithImages);
        // Debug: Check if products have images
        const productsWithImagesCount = productsWithImages.filter((p: any) => p.featured_image_url || p.logo_url).length;
        console.log("[Resellers] Fetched products:", productsWithImages.length, "Products with images:", productsWithImagesCount);
        if (productsWithImages.length > 0) {
          console.log("[Resellers] First 3 products with image URLs:", productsWithImages.slice(0, 3).map((p: any) => ({
            name: p.name,
            featured_image_url: p.featured_image_url,
            logo_url: p.logo_url,
            hasImage: !!(p.featured_image_url || p.logo_url),
          })));
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchResellerStats = async (resellerId: string) => {
    try {
      setLoadingStats(true);
      const response = await fetch(
        `/api/admin/reseller-codes?reseller_id=${resellerId}`
      );
      const data = await response.json();

      if (response.ok && data.codes) {
        // Group codes by product
        const statsMap = new Map<string, ProductCodeStats>();

        data.codes.forEach((code: ResellerCode) => {
          const productId = code.product_id;
          if (!statsMap.has(productId)) {
            const foundProduct = products.find((p) => p.id === productId);
            const product: Product = foundProduct ? {
              ...foundProduct,
            } : {
              id: productId,
              name: code.products?.name || "Unknown Product",
              slug: code.products?.slug || "",
              featured_image_url: null,
              logo_url: null,
            };
            statsMap.set(productId, {
              product,
              total: 0,
              available: 0,
              redeemed: 0,
            });
          }

          const stats = statsMap.get(productId)!;
          stats.total++;
          if (code.redeemed_at) {
            stats.redeemed++;
          } else {
            stats.available++;
          }
        });

        const finalStats = Array.from(statsMap.values());
        setProductStats(finalStats);
        // Debug: Log first product's image URLs
        if (finalStats.length > 0) {
          console.log("[Reseller Stats] First product:", {
            name: finalStats[0].product.name,
            featured_image_url: finalStats[0].product.featured_image_url,
            logo_url: finalStats[0].product.logo_url,
            hasImage: !!(finalStats[0].product.featured_image_url || finalStats[0].product.logo_url),
          });
        }
      }
    } catch (error) {
      console.error("Error fetching reseller stats:", error);
      showNotification("error", "Failed to load product statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAddReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/resellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("success", "Reseller added successfully");
        setShowAddModal(false);
        setFormData({ name: "", email: "", contact_info: "", notes: "" });
        fetchResellers();
      } else {
        showNotification("error", data.error || "Failed to add reseller");
      }
    } catch (error: any) {
      console.error("Error adding reseller:", error);
      showNotification("error", "Failed to add reseller");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (reseller: Reseller) => {
    setSelectedReseller(reseller);
    setShowDetailsModal(true);
    fetchResellerStats(reseller.id);
  };

  const handleDownloadCSV = async (productId: string) => {
    if (!selectedReseller) return;

    try {
      const response = await fetch(
        `/api/admin/reseller-codes/export?reseller_id=${selectedReseller.id}&product_id=${productId}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reseller_codes_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification("success", "CSV downloaded successfully");
      } else {
        const data = await response.json();
        showNotification("error", data.error || "Failed to download CSV");
      }
    } catch (error) {
      console.error("Error downloading CSV:", error);
      showNotification("error", "Failed to download CSV");
    }
  };

  const handleAddCodes = (product: Product) => {
    setSelectedProductForCodes(product);
    setCodesInput("");
    setShowAddCodesModal(true);
  };

  const handleGenerateCodes = (product: Product) => {
    setSelectedProductForCodes(product);
    setGenerateForm({ count: "10", prefix: "", length: "12" });
    setShowGenerateCodesModal(true);
  };

  const handleGenerateCodesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReseller || !selectedProductForCodes) return;

    const count = parseInt(generateForm.count);
    if (!count || count < 1 || count > 10000) {
      showNotification("error", "Count must be between 1 and 10000");
      return;
    }

    setGeneratingCodes(true);

    try {
      const response = await fetch("/api/admin/reseller-codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reseller_id: selectedReseller.id,
          product_id: selectedProductForCodes.id,
          count,
          prefix: generateForm.prefix.trim() || undefined,
          length: parseInt(generateForm.length) || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification(
          "success",
          `Successfully generated ${data.count} code(s)`
        );
        setShowGenerateCodesModal(false);
        setGenerateForm({ count: "10", prefix: "", length: "12" });
        fetchResellerStats(selectedReseller.id);
      } else {
        showNotification("error", data.error || "Failed to generate codes");
      }
    } catch (error: any) {
      console.error("Error generating codes:", error);
      showNotification("error", "Failed to generate codes");
    } finally {
      setGeneratingCodes(false);
    }
  };

  const handleViewCodes = async (productId: string) => {
    if (!selectedReseller) return;

    const product = products.find((p) => p.id === productId);
    if (product) {
      setSelectedProductForCodes(product);
    }

    setLoadingCodes(true);
    setShowCodesModal(true);

    try {
      const response = await fetch(
        `/api/admin/reseller-codes?reseller_id=${selectedReseller.id}&product_id=${productId}`
      );
      const data = await response.json();

      if (response.ok) {
        setViewingCodes(data.codes || []);
      } else {
        showNotification("error", data.error || "Failed to load codes");
        setShowCodesModal(false);
      }
    } catch (error) {
      console.error("Error loading codes:", error);
      showNotification("error", "Failed to load codes");
      setShowCodesModal(false);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleMoreMenuToggle = (resellerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (openMoreMenu === resellerId) {
      setOpenMoreMenu(null);
      setMoreMenuPosition(null);
    } else {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      setMoreMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
      setOpenMoreMenu(resellerId);
    }
  };

  const handleMoreMenuAction = (action: string, reseller: Reseller) => {
    setOpenMoreMenu(null);
    setMoreMenuPosition(null);
    
    if (action === "view") {
      handleViewDetails(reseller);
    } else if (action === "generate-codes") {
      setSelectedReseller(reseller);
      setCodeActionType("generate");
      setShowProductSelectModal(true);
    } else if (action === "add-codes") {
      setSelectedReseller(reseller);
      setCodeActionType("add");
      setShowProductSelectModal(true);
    } else if (action === "suspend" || action === "delete" || action === "reactivate") {
      setConfirmAction({ type: action as "suspend" | "delete" | "reactivate", reseller });
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/resellers/${confirmAction.reseller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: confirmAction.type }),
      });

      const data = await response.json();

      if (response.ok) {
        const actionText = confirmAction.type === "suspend" ? "suspended" : confirmAction.type === "delete" ? "deleted" : "reactivated";
        showNotification("success", `Reseller ${actionText} successfully`);
        fetchResellers();
        setShowConfirmDialog(false);
        setConfirmAction(null);
      } else {
        showNotification("error", data.error || `Failed to ${confirmAction.type} reseller`);
      }
    } catch (error: any) {
      console.error(`Error ${confirmAction.type}ing reseller:`, error);
      showNotification("error", `Failed to ${confirmAction.type} reseller`);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    const quantity = productQuantities[product.id] || "10";
    setSelectedProductForCodes(product);
    setShowProductSelectModal(false);
    setProductSearchQuery("");
    setProductQuantities({});
    setGlobalQuantity("");
    
    if (codeActionType === "generate") {
      setGenerateForm({ count: quantity, prefix: "", length: "12" });
      setShowGenerateCodesModal(true);
    } else if (codeActionType === "add") {
      setCodesInput("");
      setShowAddCodesModal(true);
    }
  };

  const handleGenerateMultiple = async () => {
    if (!selectedReseller) return;

    const productsToGenerate = products
      .filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
          p.slug.toLowerCase().includes(productSearchQuery.toLowerCase());
        const quantity = productQuantities[p.id];
        const hasQuantity = quantity !== undefined && quantity !== "" && !isNaN(parseInt(quantity)) && parseInt(quantity) >= 0;
        return matchesSearch && hasQuantity;
      })
      .map((p) => ({
        product: p,
        quantity: parseInt(productQuantities[p.id]) || 0,
      }));

    if (productsToGenerate.length === 0) {
      showNotification("error", "Please select at least one product with a quantity");
      return;
    }

    setGeneratingCodes(true);

    try {
      let totalGenerated = 0;
      const errors: string[] = [];

      for (const { product, quantity } of productsToGenerate) {
        try {
          const response = await fetch("/api/admin/reseller-codes/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reseller_id: selectedReseller.id,
              product_id: product.id,
              count: quantity,
              prefix: generateForm.prefix.trim() || undefined,
              length: parseInt(generateForm.length) || undefined,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            totalGenerated += data.count || 0;
          } else {
            errors.push(`${product.name}: ${data.error || "Failed"}`);
          }
        } catch (error: any) {
          errors.push(`${product.name}: ${error.message || "Failed"}`);
        }
      }

      if (totalGenerated > 0) {
        showNotification("success", `Successfully generated ${totalGenerated} code(s) across ${productsToGenerate.length} product(s)`);
        setShowProductSelectModal(false);
        setProductSearchQuery("");
        setProductQuantities({});
        setGlobalQuantity("");
        setGenerateForm({ count: "10", prefix: "", length: "12" });
        if (selectedReseller) {
          fetchResellerStats(selectedReseller.id);
        }
      } else {
        showNotification("error", errors.join(", ") || "Failed to generate codes");
      }
    } catch (error: any) {
      console.error("Error generating codes:", error);
      showNotification("error", "Failed to generate codes");
    } finally {
      setGeneratingCodes(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.slug.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const handleGlobalQuantityApply = () => {
    if (globalQuantity === "" || isNaN(parseInt(globalQuantity)) || parseInt(globalQuantity) < 0) {
      showNotification("error", "Please enter a valid quantity (0 or greater)");
      return;
    }

    const newQuantities: Record<string, string> = {};
    filteredProducts.forEach((product) => {
      newQuantities[product.id] = globalQuantity;
    });
    setProductQuantities(newQuantities);
    showNotification("success", `Applied quantity ${globalQuantity} to all products`);
  };

  const handleSubmitCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReseller || !selectedProductForCodes) return;

    // Parse codes from input (split by newline, comma, or space)
    const codes = codesInput
      .split(/[\n,]+/)
      .map((code) => code.trim())
      .filter((code) => code.length > 0);

    if (codes.length === 0) {
      showNotification("error", "Please enter at least one code");
      return;
    }

    setAddingCodes(true);

    try {
      const response = await fetch("/api/admin/reseller-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reseller_id: selectedReseller.id,
          product_id: selectedProductForCodes.id,
          codes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("success", `Successfully added ${data.count} code(s)`);
        setShowAddCodesModal(false);
        setCodesInput("");
        fetchResellerStats(selectedReseller.id);
      } else {
        if (data.duplicates && data.duplicates.length > 0) {
          showNotification(
            "error",
            `Some codes already exist: ${data.duplicates.join(", ")}`
          );
        } else {
          showNotification("error", data.error || "Failed to add codes");
        }
      }
    } catch (error: any) {
      console.error("Error adding codes:", error);
      showNotification("error", "Failed to add codes");
    } finally {
      setAddingCodes(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredResellers = resellers
    .filter((reseller) => reseller.status !== "deleted") // Hide deleted resellers from main table
    .filter((reseller) =>
      reseller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reseller.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (loading) {
    return (
      <Container>
        <NNAudioLoadingSpinner text="Loading resellers..." />
      </Container>
    );
  }

  return (
    <>
      <NextSEO title="Resellers - Admin" />
      <Container>
        <Header>
          <Title>
            <FaStore /> Resellers
          </Title>
          <Subtitle>
            Manage reseller partners and their product code distributions
          </Subtitle>
        </Header>

        <ActionsBar>
          <SearchContainer>
            <SearchIcon>
              <FaSearch />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search resellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchContainer>
          <CreateButton onClick={() => setShowAddModal(true)}>
            <FaPlus /> Add Reseller
          </CreateButton>
        </ActionsBar>

        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Email</Th>
              <Th>Contact Info</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {filteredResellers.length === 0 ? (
              <tr>
                <Td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>
                  {searchQuery
                    ? "No resellers found matching your search"
                    : "No resellers yet. Click 'Add Reseller' to get started."}
                </Td>
              </tr>
            ) : (
              filteredResellers.map((reseller) => (
                <Tr key={reseller.id} onClick={() => handleViewDetails(reseller)}>
                  <Td>
                    <strong>{reseller.name}</strong>
                  </Td>
                  <Td>
                    <StatusBadge $status={reseller.status || "active"}>
                      {reseller.status || "active"}
                    </StatusBadge>
                  </Td>
                  <Td>{reseller.email || "—"}</Td>
                  <Td>{reseller.contact_info || "—"}</Td>
                  <Td>
                    {new Date(reseller.created_at).toLocaleDateString()}
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <MoreMenuContainer data-dropdown>
                      <MoreMenuButton
                        onClick={(e) => handleMoreMenuToggle(reseller.id, e)}
                        className={openMoreMenu === reseller.id ? "active" : ""}
                      >
                        <FaEllipsisV />
                      </MoreMenuButton>
                      <AnimatePresence>
                        {openMoreMenu === reseller.id && moreMenuPosition && (
                          <MoreMenuDropdown
                            $top={moreMenuPosition.top}
                            $right={moreMenuPosition.right}
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                          >
                            <MoreMenuItem onClick={() => handleMoreMenuAction("view", reseller)}>
                              <FaEye /> View Details
                            </MoreMenuItem>
                            <MoreMenuItem onClick={() => handleMoreMenuAction("generate-codes", reseller)}>
                              <FaKey /> Generate Product Codes
                            </MoreMenuItem>
                            <MoreMenuItem onClick={() => handleMoreMenuAction("add-codes", reseller)}>
                              <FaPlus /> Add Product Codes
                            </MoreMenuItem>
                            {reseller.status === "active" && (
                              <>
                                <MoreMenuItem onClick={() => handleMoreMenuAction("suspend", reseller)} $variant="danger">
                                  <FaBan /> Suspend Reseller
                                </MoreMenuItem>
                                <MoreMenuItem onClick={() => handleMoreMenuAction("delete", reseller)} $variant="danger">
                                  <FaTrash /> Delete Reseller
                                </MoreMenuItem>
                              </>
                            )}
                            {reseller.status === "suspended" && (
                              <>
                                <MoreMenuItem onClick={() => handleMoreMenuAction("reactivate", reseller)}>
                                  <FaUndo /> Reactivate Reseller
                                </MoreMenuItem>
                                <MoreMenuItem onClick={() => handleMoreMenuAction("delete", reseller)} $variant="danger">
                                  <FaTrash /> Delete Reseller
                                </MoreMenuItem>
                              </>
                            )}
                            {reseller.status === "deleted" && (
                              <MoreMenuItem onClick={() => handleMoreMenuAction("reactivate", reseller)}>
                                <FaUndo /> Reactivate Reseller
                              </MoreMenuItem>
                            )}
                          </MoreMenuDropdown>
                        )}
                      </AnimatePresence>
                    </MoreMenuContainer>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Container>

      {/* Add Reseller Modal */}
      <AnimatePresence>
        {showAddModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <AddResellerModal
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaPlus /> Add New Reseller
                </ModalTitle>
                <CloseButton onClick={() => setShowAddModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <form onSubmit={handleAddReseller}>
                <FormGroup>
                  <Label>Name *</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Reseller name"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="reseller@example.com"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Contact Info</Label>
                  <Input
                    type="text"
                    value={formData.contact_info}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_info: e.target.value })
                    }
                    placeholder="Additional contact information"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Notes</Label>
                  <TextArea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Optional notes about this reseller"
                  />
                </FormGroup>

                <ModalFooter>
                  <Button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" $variant="primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <SpinningIcon /> Adding...
                      </>
                    ) : (
                      <>
                        <FaPlus /> Add Reseller
                      </>
                    )}
                  </Button>
                </ModalFooter>
              </form>
            </AddResellerModal>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Reseller Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedReseller && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailsModal(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "1000px" }}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaStore /> {selectedReseller.name}
                </ModalTitle>
                <CloseButton onClick={() => setShowDetailsModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <ModalBody>
                {loadingStats ? (
                  <div style={{ textAlign: "center", padding: "3rem" }}>
                    <SpinningIcon style={{ fontSize: "2rem", marginBottom: "1rem" }} />
                    <p>Loading product statistics...</p>
                  </div>
                ) : productStats.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem" }}>
                    <FaBox style={{ fontSize: "3rem", color: "var(--text-secondary)", marginBottom: "1rem" }} />
                    <p style={{ color: "var(--text-secondary)" }}>
                      No product codes found for this reseller.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <Table>
                      <Thead>
                        <tr>
                          <Th>Product</Th>
                          <Th style={{ textAlign: "center" }}>Total</Th>
                          <Th style={{ textAlign: "center" }}>Available</Th>
                          <Th style={{ textAlign: "center" }}>Redeemed</Th>
                          <Th style={{ textAlign: "center" }}>Actions</Th>
                        </tr>
                      </Thead>
                      <Tbody>
                        {productStats.map((stat) => (
                          <Tr key={stat.product.id} style={{ cursor: "default" }}>
                            <Td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                {stat.product.featured_image_url || stat.product.logo_url ? (
                                  <ProductThumbnail style={{ width: "40px", height: "40px", minWidth: "40px", minHeight: "40px", position: "relative" }}>
                                    <Image
                                      src={stat.product.featured_image_url || stat.product.logo_url || ''}
                                      alt={stat.product.name}
                                      fill
                                      style={{ objectFit: 'cover' }}
                                      unoptimized
                                      onError={(e) => {
                                        console.error("[Product Stats Thumbnail] Image failed to load:", stat.product.name, (e.target as HTMLImageElement).src);
                                      }}
                                    />
                                  </ProductThumbnail>
                                ) : (
                                  <ProductThumbnail style={{ width: "40px", height: "40px", minWidth: "40px", minHeight: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <FaBox size={20} style={{ color: "var(--text-secondary)" }} />
                                  </ProductThumbnail>
                                )}
                                <div>
                                  <div style={{ fontWeight: "600" }}>
                                    {stat.product.name}
                                  </div>
                                </div>
                              </div>
                            </Td>
                            <Td style={{ textAlign: "center", fontWeight: "600" }}>
                              {stat.total}
                            </Td>
                            <Td style={{ textAlign: "center" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                backgroundColor: "rgba(46, 204, 113, 0.2)",
                                color: "#2ecc71",
                              }}>
                                {stat.available}
                              </span>
                            </Td>
                            <Td style={{ textAlign: "center" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                backgroundColor: "rgba(231, 76, 60, 0.2)",
                                color: "#e74c3c",
                              }}>
                                {stat.redeemed}
                              </span>
                            </Td>
                            <Td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                              <ActionButtons style={{ justifyContent: "center" }}>
                                <ActionButton
                                  $variant="primary"
                                  onClick={() => handleViewCodes(stat.product.id)}
                                  disabled={stat.total === 0}
                                  title="View all codes"
                                >
                                  <FaEye /> View Codes
                                </ActionButton>
                              </ActionButtons>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </div>
                )}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Add Codes Modal */}
      <AnimatePresence>
        {showAddCodesModal && selectedReseller && selectedProductForCodes && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddCodesModal(false)}
          >
            <AddResellerModal
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaPlus /> Add Codes - {selectedProductForCodes.name}
                </ModalTitle>
                <CloseButton onClick={() => setShowAddCodesModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <form onSubmit={handleSubmitCodes}>
                <FormGroup>
                  <Label>
                    Serial Codes (one per line or comma-separated) *
                  </Label>
                  <TextArea
                    value={codesInput}
                    onChange={(e) => setCodesInput(e.target.value)}
                    placeholder="ABC123&#10;XYZ789&#10;DEF456"
                    required
                    rows={10}
                    style={{ fontFamily: "'Courier New', monospace", fontSize: "0.9rem" }}
                  />
                  <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Enter codes separated by newlines or commas. Codes will be automatically converted to uppercase.
                  </div>
                </FormGroup>

                <ModalFooter>
                  <Button
                    type="button"
                    onClick={() => setShowAddCodesModal(false)}
                    disabled={addingCodes}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" $variant="primary" disabled={addingCodes || !codesInput.trim()}>
                    {addingCodes ? (
                      <>
                        <SpinningIcon /> Adding...
                      </>
                    ) : (
                      <>
                        <FaPlus /> Add Codes
                      </>
                    )}
                  </Button>
                </ModalFooter>
              </form>
            </AddResellerModal>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* View Codes Modal */}
      <AnimatePresence>
        {showCodesModal && selectedReseller && selectedProductForCodes && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCodesModal(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "1000px", maxHeight: "80vh" }}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaEye /> Codes - {selectedProductForCodes.name}
                </ModalTitle>
                <CloseButton onClick={() => setShowCodesModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <ModalBody>
                {loadingCodes ? (
                  <div style={{ textAlign: "center", padding: "3rem" }}>
                    <SpinningIcon style={{ fontSize: "2rem", marginBottom: "1rem" }} />
                    <p>Loading codes...</p>
                  </div>
                ) : viewingCodes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem" }}>
                    <FaBox style={{ fontSize: "3rem", color: "var(--text-secondary)", marginBottom: "1rem" }} />
                    <p style={{ color: "var(--text-secondary)" }}>No codes found</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <Table>
                      <Thead>
                        <tr>
                          <Th>Serial Code</Th>
                          <Th>Status</Th>
                          <Th>Created</Th>
                          <Th>Redeemed</Th>
                          <Th>Redeemed By</Th>
                        </tr>
                      </Thead>
                      <Tbody>
                        {viewingCodes.map((code) => (
                          <Tr key={code.id}>
                            <Td>
                              <div style={{ 
                                fontFamily: "'Courier New', monospace", 
                                fontWeight: "600",
                                fontSize: "0.95rem",
                                color: "#ffffff"
                              }}>
                                {formatSerialCode(code.serial_code)}
                              </div>
                            </Td>
                            <Td>
                              {code.redeemed_at ? (
                                <span style={{
                                  padding: "0.25rem 0.75rem",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  backgroundColor: "rgba(231, 76, 60, 0.2)",
                                  color: "#e74c3c",
                                  textTransform: "uppercase"
                                }}>
                                  Redeemed
                                </span>
                              ) : (
                                <span style={{
                                  padding: "0.25rem 0.75rem",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  backgroundColor: "rgba(46, 204, 113, 0.2)",
                                  color: "#2ecc71",
                                  textTransform: "uppercase"
                                }}>
                                  Available
                                </span>
                              )}
                            </Td>
                            <Td>
                              {new Date(code.created_at).toLocaleDateString()}
                            </Td>
                            <Td>
                              {code.redeemed_at 
                                ? new Date(code.redeemed_at).toLocaleDateString()
                                : "—"
                              }
                            </Td>
                            <Td>
                              {code.redeemed_by_user ? (
                                <Link
                                  href={`/admin/users?user=${code.redeemed_by_user.id}`}
                                  style={{
                                    color: "var(--primary)",
                                    textDecoration: "none",
                                    fontWeight: "500",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {code.redeemed_by_user.first_name || code.redeemed_by_user.last_name
                                    ? `${[code.redeemed_by_user.first_name, code.redeemed_by_user.last_name].filter(Boolean).join(" ")} (${code.redeemed_by_user.email})`
                                    : code.redeemed_by_user.email}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </div>
                )}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Product Selection Modal */}
      <AnimatePresence>
        {showProductSelectModal && selectedReseller && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
              onClick={() => {
                setShowProductSelectModal(false);
                setProductSearchQuery("");
                setProductQuantities({});
                setGlobalQuantity("");
              }}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "700px", maxHeight: "80vh" }}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaBox /> {codeActionType === "generate" ? "Generate Codes" : "Add Codes"} - Select Products
                </ModalTitle>
                <CloseButton               onClick={() => {
                setShowProductSelectModal(false);
                setProductSearchQuery("");
                setProductQuantities({});
                setGlobalQuantity("");
              }}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <ModalBody>
                <FormGroup>
                  <Label>Search Products</Label>
                  <SearchContainer>
                    <SearchIcon>
                      <FaSearch />
                    </SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Search by name or slug..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                    />
                  </SearchContainer>
                </FormGroup>

                {codeActionType === "generate" && (
                  <GlobalQuantityContainer>
                    <GlobalQuantityLabel>Global Quantity:</GlobalQuantityLabel>
                    <QuantityInput
                      type="number"
                      min="0"
                      max="10000"
                      value={globalQuantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || (!isNaN(parseInt(value)) && parseInt(value) >= 0 && parseInt(value) <= 10000)) {
                          setGlobalQuantity(value);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      $variant="primary"
                      onClick={handleGlobalQuantityApply}
                      disabled={!globalQuantity || globalQuantity === "" || isNaN(parseInt(globalQuantity)) || parseInt(globalQuantity) < 0}
                      style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                    >
                      Apply to All
                    </Button>
                  </GlobalQuantityContainer>
                )}

                {products.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem" }}>
                    <FaBox style={{ fontSize: "3rem", color: "var(--text-secondary)", marginBottom: "1rem" }} />
                    <p style={{ color: "var(--text-secondary)" }}>No products available</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem" }}>
                    <FaSearch style={{ fontSize: "3rem", color: "var(--text-secondary)", marginBottom: "1rem" }} />
                    <p style={{ color: "var(--text-secondary)" }}>No products found matching your search</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto" }}>
                    {filteredProducts.map((product) => {
                      const imageUrl = product.featured_image_url || product.logo_url;
                      if (filteredProducts.indexOf(product) < 3) {
                        console.log("[Product Select] Product:", product.name, "Image URL:", imageUrl);
                      }
                      return (
                        <ProductSelectCard key={product.id}>
                          <ProductThumbnail>
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={product.name}
                                fill
                                style={{ objectFit: 'cover' }}
                                unoptimized
                                onError={(e) => {
                                  console.error("[Product Thumbnail] Image failed to load:", product.name, imageUrl, (e.target as HTMLImageElement).src);
                                }}
                                onLoad={() => {
                                  console.log("[Product Thumbnail] Image loaded successfully:", product.name, imageUrl);
                                }}
                              />
                            ) : (
                              <FaBox size={24} style={{ color: "var(--text-secondary)" }} />
                            )}
                          </ProductThumbnail>
                          <ProductSelectInfo>
                            <ProductName style={{ fontSize: "0.95rem" }}>
                              {product.name}
                            </ProductName>
                          </ProductSelectInfo>
                          {codeActionType === "generate" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Label style={{ margin: 0, fontSize: "0.85rem" }}>Qty:</Label>
                            <QuantityInput
                              type="number"
                              min="0"
                              max="10000"
                              value={productQuantities[product.id] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || (!isNaN(parseInt(value)) && parseInt(value) >= 0 && parseInt(value) <= 10000)) {
                                  setProductQuantities({
                                    ...productQuantities,
                                    [product.id]: value,
                                  });
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <DownloadButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductSelect(product);
                            }}
                            style={{ minWidth: "120px" }}
                          >
                            <FaPlus /> Add Codes
                          </DownloadButton>
                        )}
                        </ProductSelectCard>
                      );
                    })}
                  </div>
                )}

                {codeActionType === "generate" && (
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                    <FormGroup>
                      <Label>Code Prefix (Optional)</Label>
                      <Input
                        type="text"
                        value={generateForm.prefix}
                        onChange={(e) =>
                          setGenerateForm({ ...generateForm, prefix: e.target.value.toUpperCase() })
                        }
                        placeholder="NNA"
                        maxLength={8}
                        style={{ textTransform: "uppercase" }}
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label>Code Length</Label>
                      <Input
                        type="number"
                        value={generateForm.length}
                        onChange={(e) =>
                          setGenerateForm({ ...generateForm, length: e.target.value })
                        }
                        placeholder="12"
                        min="6"
                        max="32"
                      />
                    </FormGroup>
                  </div>
                )}
              </ModalBody>

              {codeActionType === "generate" && (
                <ModalFooter>
                  <Button
                    type="button"
              onClick={() => {
                setShowProductSelectModal(false);
                setProductSearchQuery("");
                setProductQuantities({});
                setGlobalQuantity("");
              }}
                    disabled={generatingCodes}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    $variant="primary"
                    onClick={handleGenerateMultiple}
                    disabled={generatingCodes || Object.values(productQuantities).every(q => !q || q === "" || isNaN(parseInt(q)) || parseInt(q) < 0)}
                  >
                    {generatingCodes ? (
                      <>
                        <SpinningIcon /> Generating...
                      </>
                    ) : (
                      <>
                        <FaKey /> Generate Codes
                      </>
                    )}
                  </Button>
                </ModalFooter>
              )}
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Generate Codes Modal */}
      <AnimatePresence>
        {showGenerateCodesModal && selectedReseller && selectedProductForCodes && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGenerateCodesModal(false)}
          >
            <AddResellerModal
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaPlus /> Generate Codes - {selectedProductForCodes.name}
                </ModalTitle>
                <CloseButton onClick={() => setShowGenerateCodesModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <form onSubmit={handleGenerateCodesSubmit}>
                <FormGroup>
                  <Label>Number of Codes to Generate *</Label>
                  <Input
                    type="number"
                    value={generateForm.count}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, count: e.target.value })
                    }
                    placeholder="10"
                    min="1"
                    max="10000"
                    required
                  />
                  <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Enter the number of codes to generate (1-10,000)
                  </div>
                </FormGroup>

                <FormGroup>
                  <Label>Code Prefix (Optional)</Label>
                  <Input
                    type="text"
                    value={generateForm.prefix}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, prefix: e.target.value.toUpperCase() })
                    }
                    placeholder="NNA"
                    maxLength={8}
                    style={{ textTransform: "uppercase" }}
                  />
                  <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Optional prefix for all codes (e.g., "NNA" will create codes like "NNAABC123XYZ")
                  </div>
                </FormGroup>

                <FormGroup>
                  <Label>Code Length *</Label>
                  <Input
                    type="number"
                    value={generateForm.length}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, length: e.target.value })
                    }
                    placeholder="12"
                    min="6"
                    max="32"
                    required
                  />
                  <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Total length of each code including prefix (6-32 characters)
                  </div>
                </FormGroup>

                <div style={{ 
                  padding: "1rem 1.25rem",
                  background: "rgba(108, 99, 255, 0.1)",
                  border: "1px solid rgba(108, 99, 255, 0.2)",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  lineHeight: "1.6",
                  marginTop: "1rem"
                }}>
                  <strong>💡 Code Generation:</strong> Codes will be automatically generated with random alphanumeric characters (excluding I, O, 0, 1 for clarity). Each code will be unique and ready for distribution.
                </div>

                <ModalFooter>
                  <Button
                    type="button"
                    onClick={() => setShowGenerateCodesModal(false)}
                    disabled={generatingCodes}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" $variant="primary" disabled={generatingCodes || !generateForm.count}>
                    {generatingCodes ? (
                      <>
                        <SpinningIcon /> Generating...
                      </>
                    ) : (
                      <>
                        <FaPlus /> Generate Codes
                      </>
                    )}
                  </Button>
                </ModalFooter>
              </form>
            </AddResellerModal>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <Notification
            $type={notification.type}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
          >
            {notification.type === "success" ? (
              <FaCheckCircle />
            ) : (
              <FaExclamationCircle />
            )}
            {notification.message}
          </Notification>
        )}
      </AnimatePresence>

      {/* Confirm Action Dialog */}
      <AnimatePresence>
        {showConfirmDialog && confirmAction && (
          <ConfirmDialog
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !processingAction && setShowConfirmDialog(false)}
          >
            <ConfirmDialogContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ConfirmDialogTitle>
                {confirmAction.type === "suspend" && "⚠️ Suspend Reseller"}
                {confirmAction.type === "delete" && "🗑️ Delete Reseller"}
                {confirmAction.type === "reactivate" && "✅ Reactivate Reseller"}
              </ConfirmDialogTitle>
              <ConfirmDialogMessage>
                {confirmAction.type === "suspend" && (
                  <>
                    <p style={{ marginBottom: "1rem", fontWeight: 600, color: "var(--text)" }}>
                      Are you sure you want to suspend <strong>{confirmAction.reseller.name}</strong>?
                    </p>
                    <div style={{ 
                      background: "rgba(255, 193, 7, 0.1)", 
                      border: "1px solid rgba(255, 193, 7, 0.3)", 
                      borderRadius: "8px", 
                      padding: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <p style={{ marginBottom: "0.5rem", fontWeight: 600, color: "#ffc107" }}>What this means:</p>
                      <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                        <li>All <strong>unredeemed codes</strong> from this reseller will <strong>no longer be redeemable</strong></li>
                        <li>Users who try to redeem codes will see an error message</li>
                        <li>All <strong>already redeemed codes</strong> will <strong>remain valid</strong> - users keep their products</li>
                        <li>You can reactivate the reseller later to restore code redemption</li>
                      </ul>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      This action can be reversed by reactivating the reseller.
                    </p>
                  </>
                )}
                {confirmAction.type === "delete" && (
                  <>
                    <p style={{ marginBottom: "1rem", fontWeight: 600, color: "var(--text)" }}>
                      Are you sure you want to delete <strong>{confirmAction.reseller.name}</strong>?
                    </p>
                    <div style={{ 
                      background: "rgba(231, 76, 60, 0.1)", 
                      border: "1px solid rgba(231, 76, 60, 0.3)", 
                      borderRadius: "8px", 
                      padding: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <p style={{ marginBottom: "0.5rem", fontWeight: 600, color: "#e74c3c" }}>What this means:</p>
                      <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                        <li>All <strong>unredeemed codes</strong> from this reseller will <strong>no longer be redeemable</strong></li>
                        <li>Users who try to redeem codes will see an error message</li>
                        <li>All <strong>already redeemed codes</strong> will <strong>remain valid</strong> - users keep their products</li>
                        <li>If the reseller has redeemed codes, this will be a <strong>soft delete</strong> to preserve redemption history</li>
                        <li>If the reseller has no redeemed codes, this will be a <strong>permanent deletion</strong></li>
                      </ul>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      This action can be reversed by reactivating the reseller (if soft deleted).
                    </p>
                  </>
                )}
                {confirmAction.type === "reactivate" && (
                  <>
                    <p style={{ marginBottom: "1rem", fontWeight: 600, color: "var(--text)" }}>
                      Are you sure you want to reactivate <strong>{confirmAction.reseller.name}</strong>?
                    </p>
                    <div style={{ 
                      background: "rgba(46, 204, 113, 0.1)", 
                      border: "1px solid rgba(46, 204, 113, 0.3)", 
                      borderRadius: "8px", 
                      padding: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <p style={{ marginBottom: "0.5rem", fontWeight: 600, color: "#2ecc71" }}>What this means:</p>
                      <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                        <li>All codes from this reseller will be <strong>redeemable again</strong></li>
                        <li>Users can now redeem codes that were previously blocked</li>
                        <li>Already redeemed codes remain unchanged</li>
                      </ul>
                    </div>
                  </>
                )}
              </ConfirmDialogMessage>
              <ConfirmDialogActions>
                <ConfirmButton
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setConfirmAction(null);
                  }}
                  disabled={processingAction}
                >
                  Cancel
                </ConfirmButton>
                <ConfirmButton
                  $variant={confirmAction.type === "delete" ? "danger" : "primary"}
                  onClick={handleConfirmAction}
                  disabled={processingAction}
                >
                  {processingAction ? (
                    <>
                      <SpinningIcon style={{ marginRight: "0.5rem" }} />
                      Processing...
                    </>
                  ) : (
                    <>
                      {confirmAction.type === "suspend" && "Suspend"}
                      {confirmAction.type === "delete" && "Delete"}
                      {confirmAction.type === "reactivate" && "Reactivate"}
                    </>
                  )}
                </ConfirmButton>
              </ConfirmDialogActions>
            </ConfirmDialogContent>
          </ConfirmDialog>
        )}
      </AnimatePresence>
    </>
  );
}
