"use client";
import React, { useEffect, useState } from "react";
import NextSEO from "@/components/NextSEO";
import { 
  FaTicketAlt, 
  FaPlus,
  FaSearch,
  FaEye,
  FaTrash,
  FaBan,
  FaCopy,
  FaCheck,
  FaExclamationTriangle,
  FaPercent,
  FaDollarSign,
  FaCalendarAlt,
  FaHashtag,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaSync,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";

import { 
  createOneTimeDiscountCode, 
  listPromotionCodes, 
  listCoupons,
  deactivatePromotionCode 
} from "@/utils/stripe/actions";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinningIcon = styled(FaSync)`
  animation: ${spin} 1s linear infinite;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
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
      case 'danger':
        return `
          background: #dc3545;
          color: white;
          &:hover:not(:disabled) {
            background: #c82333;
            transform: translateY(-2px);
          }
        `;
      case 'secondary':
        return `
          background: rgba(255, 255, 255, 0.1);
          color: var(--text);
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
          }
        `;
      default:
        return `
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
  }
`;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 2rem;
`;

const Thead = styled.thead`
  background: rgba(108, 99, 255, 0.1);
`;

const Th = styled.th<{ $sortable?: boolean }>`
  padding: 1rem;
  text-align: left;
  color: var(--text);
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  transition: background 0.2s ease;

  ${props => props.$sortable && `
  &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  `}

  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }
`;

const ThContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    opacity: 0.5;
    font-size: 0.8rem;
  }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;

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

  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }
`;

const CouponCode = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary);
  font-family: 'Courier New', monospace;
  background-color: rgba(108, 99, 255, 0.1);
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(108, 99, 255, 0.2);
  display: inline-block;
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  display: inline-block;
  
  ${props => props.$active ? `
    background-color: rgba(46, 204, 113, 0.2);
    color: #2ecc71;
  ` : `
    background-color: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
  `}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
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
      case 'primary':
        return `
          background-color: rgba(108, 99, 255, 0.1);
          color: var(--primary);
          &:hover {
            background-color: rgba(108, 99, 255, 0.2);
          }
        `;
      case 'danger':
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

// Create Coupon Modal Components
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
  max-width: 500px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
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

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 0.9rem;
  color: var(--text);
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const FormInput = styled.input`
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

const FormSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
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

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const SubmitButton = styled.button<{ disabled?: boolean }>`
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    font-size: 0.9rem;
  }
`;


const Notification = styled(motion.div)<{ type: 'success' | 'error' }>`
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
  
  ${props => props.type === 'success' ? `
    background-color: #2ecc71;
    border: 1px solid #27ae60;
  ` : `
    background-color: #e74c3c;
    border: 1px solid #c0392b;
  `}
  
  svg {
    font-size: 1rem;
  }
`;

interface PromotionCodeData {
  id: string;
  code: string;
  active: boolean;
  coupon: {
    id: string;
    name: string | null;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
  };
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: number | null;
  created: number;
}

interface CouponData {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  valid: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  redeem_by: number | null;
  created: number;
}

export default function AdminCoupons() {
  const { user } = useAuth();

  const [promotionCodes, setPromotionCodes] = useState<PromotionCodeData[]>([]);
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<'code' | 'name' | 'discount' | 'status' | 'used' | 'created' | 'expires'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; code: string; type: 'promotion_code' | 'coupon' } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Form state
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [couponName, setCouponName] = useState('');
  const [expirationDays, setExpirationDays] = useState('');
  
  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchPromotionCodes = async () => {
    try {
      setLoading(true);
      // Fetch both promotion codes and coupons
      const [promotionCodesResult, couponsResult] = await Promise.all([
        listPromotionCodes({ active: true }),
        listCoupons({ limit: 100 })
      ]);
      
      if (promotionCodesResult.error) {
        console.error("Error fetching promotion codes:", promotionCodesResult.error);
      } else {
        setPromotionCodes(promotionCodesResult.promotionCodes as PromotionCodeData[]);
      }

      if (couponsResult.error) {
        console.error("Error fetching coupons:", couponsResult.error);
      } else {
        setCoupons(couponsResult.coupons as CouponData[]);
      }
    } catch (err) {
      console.error("Error fetching coupons/promotion codes:", err);
      setError("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPromotionCodes();
    }
  }, [user]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!discountValue) {
      showNotification('error', 'Please enter a discount value');
      return;
    }

    try {
      setCreateLoading(true);
      
      const value = parseFloat(discountValue);
      const options: any = {};
      
      if (customCode) options.code = customCode;
      if (couponName) options.name = couponName;
      if (expirationDays) {
        const expiresAt = Math.floor(Date.now() / 1000) + (parseInt(expirationDays) * 24 * 60 * 60);
        options.expiresAt = expiresAt;
      }
      
      const result = await createOneTimeDiscountCode(
        discountType,
        discountType === 'amount' ? Math.round(value * 100) : value, // Convert dollars to cents for amount
        options
      );
      
      if (result.success) {
        showNotification('success', `Coupon created successfully! Code: ${result.code}`);
        setShowCreateModal(false);
        resetForm();
        fetchPromotionCodes();
      } else {
        showNotification('error', result.error || 'Failed to create coupon');
      }
    } catch (error) {
      showNotification('error', 'An unexpected error occurred');
      console.error('Create coupon error:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeactivateClick = (itemId: string, itemCode: string, itemType: 'promotion_code' | 'coupon') => {
    setItemToDelete({ id: itemId, code: itemCode, type: itemType });
    setShowDeleteModal(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!itemToDelete) return;

    setDeleting(true);

    try {
      if (itemToDelete.type === 'promotion_code') {
        // Deactivate promotion code
        const result = await deactivatePromotionCode(itemToDelete.id);
      
      if (result.success) {
          showNotification('success', 'Promotion code deactivated successfully');
          setShowDeleteModal(false);
          setItemToDelete(null);
        fetchPromotionCodes();
      } else {
          showNotification('error', result.error || 'Failed to deactivate promotion code');
        }
      } else {
        // Delete coupon via Stripe API
        const response = await fetch(`/api/stripe/coupons/${itemToDelete.id}`, {
          method: 'DELETE',
        });
        
        const data = await response.json();
        
        if (data.success) {
          showNotification('success', 'Coupon deleted successfully');
          setShowDeleteModal(false);
          setItemToDelete(null);
          fetchPromotionCodes();
        } else {
          showNotification('error', data.error || 'Failed to delete coupon');
        }
      }
    } catch (error) {
      showNotification('error', 'An unexpected error occurred');
      console.error('Delete/deactivate error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showNotification('success', 'Code copied to clipboard!');
    } catch (error) {
      showNotification('error', 'Failed to copy code');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const resetForm = () => {
    setDiscountType('percent');
    setDiscountValue('');
    setCustomCode('');
    setCouponName('');
    setExpirationDays('');
  };

  const formatDiscount = (coupon: PromotionCodeData['coupon'] | CouponData) => {
    if (coupon.percent_off) {
      return `${coupon.percent_off}% off`;
    } else if (coupon.amount_off && coupon.currency) {
      return `$${(coupon.amount_off / 100).toFixed(2)} off`;
    }
    return 'Unknown discount';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Combine promotion codes and coupons for display
  // Convert coupons to a format similar to promotion codes for unified display
  const allCoupons = [
    ...promotionCodes.map(pc => ({
      id: pc.id,
      code: pc.code,
      type: 'promotion_code' as const,
      coupon: pc.coupon,
      active: pc.active,
      created: pc.created,
      expires_at: pc.expires_at,
      times_redeemed: pc.times_redeemed,
      max_redemptions: pc.max_redemptions,
    })),
    ...coupons.map(c => ({
      id: c.id,
      code: c.id, // Coupon ID can be used as code
      type: 'coupon' as const,
      coupon: {
        id: c.id,
        name: c.name,
        percent_off: c.percent_off,
        amount_off: c.amount_off,
        currency: c.currency,
      },
      active: c.valid,
      created: c.created,
      expires_at: c.redeem_by,
      times_redeemed: c.times_redeemed,
      max_redemptions: c.max_redemptions,
    }))
  ];

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <FaSort />;
    }
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  // Filter and sort coupons
  const filteredAndSortedCoupons = allCoupons
    .filter(item =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.coupon.name && item.coupon.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'name':
          const nameA = a.coupon.name || '';
          const nameB = b.coupon.name || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'discount':
          const discountA = a.coupon.percent_off || a.coupon.amount_off || 0;
          const discountB = b.coupon.percent_off || b.coupon.amount_off || 0;
          comparison = discountA - discountB;
          break;
        case 'status':
          comparison = (a.active === b.active) ? 0 : a.active ? -1 : 1;
          break;
        case 'used':
          comparison = a.times_redeemed - b.times_redeemed;
          break;
        case 'created':
          comparison = a.created - b.created;
          break;
        case 'expires':
          const expiresA = a.expires_at || 0;
          const expiresB = b.expires_at || 0;
          comparison = expiresA - expiresB;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Show page immediately - no early returns
  const showContent = user && !loading;

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <Container>
      <NextSEO title="Coupon Management - Admin" />
      
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Header>
          <Title>
            <FaTicketAlt />
            {showContent ? "Coupon Management" : "Coupon Management"}
          </Title>
          <Subtitle>{showContent ? "Create and manage discount codes and promotion coupons" : "Create and manage discount codes and promotion coupons"}</Subtitle>
        </Header>

        {showContent && (
          <>

        <ActionsBar>
          <SearchContainer>
            <SearchIcon>
              <FaSearch />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search coupons by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>
          
          <CreateButton onClick={() => setShowCreateModal(true)}>
            <FaPlus />
            Create Coupon
          </CreateButton>
        </ActionsBar>

        {error && (
          <div style={{ color: 'var(--error)', textAlign: 'center', padding: '2rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
            Loading coupons...
          </div>
        ) : filteredAndSortedCoupons.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
            {searchTerm ? 'No coupons found matching your search.' : 'No coupons created yet.'}
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th $sortable onClick={() => handleSort('code')}>
                  <ThContent>
                    Code
                    {getSortIcon('code')}
                  </ThContent>
                </Th>
                <Th $sortable onClick={() => handleSort('name')}>
                  <ThContent>
                    Name
                    {getSortIcon('name')}
                  </ThContent>
                </Th>
                <Th $sortable onClick={() => handleSort('discount')}>
                  <ThContent>
                    Discount
                    {getSortIcon('discount')}
                  </ThContent>
                </Th>
                <Th $sortable onClick={() => handleSort('status')}>
                  <ThContent>
                    Status
                    {getSortIcon('status')}
                  </ThContent>
                </Th>
                <Th $sortable onClick={() => handleSort('used')}>
                  <ThContent>
                    Used
                    {getSortIcon('used')}
                  </ThContent>
                </Th>
                <Th $sortable onClick={() => handleSort('created')}>
                  <ThContent>
                    Created
                    {getSortIcon('created')}
                  </ThContent>
                </Th>
                <Th $sortable onClick={() => handleSort('expires')}>
                  <ThContent>
                    Expires
                    {getSortIcon('expires')}
                  </ThContent>
                </Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredAndSortedCoupons.map((code) => (
              <Tr key={code.id}>
                <Td>
                <CouponCode>{code.code}</CouponCode>
                </Td>
                <Td>
                  {code.coupon.name || '-'}
                </Td>
                <Td>
                  {formatDiscount(code.coupon)}
                </Td>
                <Td>
                  <StatusBadge $active={code.active}>
                  {code.active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </Td>
                <Td>
                    {code.times_redeemed} / {code.max_redemptions || '∞'}
                </Td>
                <Td>
                  {formatDate(code.created)}
                </Td>
                <Td>
                  {code.expires_at ? formatDate(code.expires_at) : '-'}
                </Td>
                <Td>
                  <ActionButtons>
                <ActionButton
                      $variant="primary"
                  onClick={() => handleCopyCode(code.code)}
                      title="Copy code"
                >
                  <FaCopy />
                </ActionButton>
                {code.active && (
                  <ActionButton
                        $variant="danger"
                        onClick={() => handleDeactivateClick(code.id, code.code, code.type)}
                        title={code.type === 'coupon' ? 'Delete' : 'Deactivate'}
                  >
                        {code.type === 'coupon' ? <FaTrash /> : <FaBan />}
                  </ActionButton>
                )}
                  </ActionButtons>
                </Td>
              </Tr>
          ))}
            </Tbody>
          </Table>
        )}

        {/* Create Coupon Modal */}
        {showCreateModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaPlus />
                  Create New Coupon
                </ModalTitle>
                <CloseButton onClick={() => setShowCreateModal(false)}>
                  ×
                </CloseButton>
              </ModalHeader>

              <form onSubmit={handleCreateCoupon}>
                <FormGroup>
                  <FormLabel>Discount Type</FormLabel>
                  <FormSelect
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                  >
                    <option value="percent">Percentage</option>
                    <option value="amount">Fixed Amount</option>
                  </FormSelect>
                </FormGroup>

                <FormRow>
                  <FormGroup>
                    <FormLabel>
                      {discountType === 'percent' ? 'Percentage (%)' : 'Amount ($)'}
                    </FormLabel>
                    <FormInput
                      type="number"
                      step={discountType === 'percent' ? '1' : '0.01'}
                      min="0"
                      max={discountType === 'percent' ? '100' : undefined}
                      placeholder={discountType === 'percent' ? '10' : '5.00'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      required
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <FormLabel>Expiration (Days)</FormLabel>
                    <FormInput
                      type="number"
                      min="1"
                      placeholder="30"
                      value={expirationDays}
                      onChange={(e) => setExpirationDays(e.target.value)}
                    />
                  </FormGroup>
                </FormRow>

                <FormGroup>
                  <FormLabel>Custom Code (Optional)</FormLabel>
                  <FormInput
                    type="text"
                    placeholder="SAVE20 (leave empty for auto-generated)"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Coupon Name (Optional)</FormLabel>
                  <FormInput
                    type="text"
                    placeholder="Holiday Sale 2024"
                    value={couponName}
                    onChange={(e) => setCouponName(e.target.value)}
                  />
                </FormGroup>

                <SubmitButton type="submit" disabled={createLoading}>
                  {createLoading ? (
                    <NNAudioLoadingSpinner size={20} />
                  ) : (
                    <>
                      <FaPlus />
                      Create Coupon
                    </>
                  )}
                </SubmitButton>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* Delete/Deactivate Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && itemToDelete && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDeleteCancel}
            >
              <ModalContent
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '500px' }}
              >
                <ModalHeader>
                  <ModalTitle style={{ color: '#ff5e62', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaExclamationTriangle />
                    {itemToDelete.type === 'coupon' ? 'Delete Coupon' : 'Deactivate Promotion Code'}
                  </ModalTitle>
                  <CloseButton onClick={handleDeleteCancel}>
                    <FaTimes />
                  </CloseButton>
                </ModalHeader>

                <div style={{ padding: '24px' }}>
                  <p style={{ marginBottom: '16px', color: 'var(--text)', fontSize: '16px', lineHeight: '1.6' }}>
                    {itemToDelete.type === 'coupon' 
                      ? 'Are you sure you want to permanently delete this coupon? This action cannot be undone.'
                      : 'Are you sure you want to deactivate this promotion code? Customers will no longer be able to use it.'}
                  </p>
                  
                  <div style={{
                    background: 'rgba(255, 94, 98, 0.1)',
                    border: '1px solid rgba(255, 94, 98, 0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace', fontSize: '18px' }}>
                      {itemToDelete.code}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button
                      $variant="secondary"
                      onClick={handleDeleteCancel}
                      disabled={deleting}
                      style={{ minWidth: '100px' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      $variant="danger"
                      onClick={handleDeactivateConfirm}
                      disabled={deleting}
                      style={{ minWidth: '120px' }}
                    >
                      {deleting ? (
                        <>
                          <SpinningIcon />
                          {itemToDelete.type === 'coupon' ? 'Deleting...' : 'Deactivating...'}
                        </>
                      ) : (
                        <>
                          {itemToDelete.type === 'coupon' ? <FaTrash /> : <FaBan />}
                          {itemToDelete.type === 'coupon' ? 'Delete' : 'Deactivate'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Notifications */}
        {notification && (
          <Notification
            type={notification.type}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            onClick={() => setNotification(null)}
          >
            {notification.type === 'success' ? <FaCheck /> : <FaExclamationTriangle />}
            {notification.message}
          </Notification>
        )}
        </>
        )}
      </motion.div>
    </Container>
  );
} 