/**
 * @fileoverview Admin Promotions Manager — include-list targets (subscription tiers, shop, bundles), Stripe coupons.
 * @module app/(private)/(admin)/admin/promotions/page
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBullhorn,
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaFire,
  FaCalendarAlt,
  FaDollarSign,
  FaPercent,
  FaSave,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaSync,
  FaStripe,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import LoadingComponent from "@/components/common/LoadingComponent";
import { utcToPSTDate, formatPSTDate } from "@/utils/timezoneUtils";
import { computePromotionalUnitPrice } from "@/utils/promotions/apply-promotion";

// Types
interface Promotion {
  id: string;
  name: string;
  title: string;
  description: string;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  discount_type: 'percentage' | 'amount';
  discount_value: number;
  stripe_coupon_code: string | null;
  stripe_coupon_id: string | null;
  stripe_coupon_created: boolean;
  banner_theme: {
    background: string;
    textColor: string;
    accentColor: string;
  };
  priority: number;
  promotion_target_mode?: 'all' | 'selected';
  /** @brief Keys: product:<uuid>, product:<uuid>:tier, bundle:<uuid>:tier */
  included_targets?: string[];
  views: number;
  conversions: number;
  revenue: number;
  created_at: string;
  updated_at: string;
}

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

type PromotionTargetOption = {
  key: string;
  label: string;
  group: string;
  list_price?: number | null;
};

/**
 * @brief Formats a dollar amount for the modal sale preview.
 * @param n Amount in USD.
 * @returns String like `$12.00`.
 */
function formatPreviewUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const HeaderContent = styled.div``;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: #FF6B6B;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return 'linear-gradient(135deg, var(--primary), var(--accent))';
      case 'danger': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  }};
  color: ${props => props.$variant === 'secondary' ? 'var(--text)' : 'white'};
  border: 1px solid ${props => props.$variant === 'secondary' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
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

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const Td = styled.td`
  padding: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;

  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$active 
    ? 'rgba(16, 185, 129, 0.2)' 
    : 'rgba(107, 114, 128, 0.2)'};
  color: ${props => props.$active ? '#10b981' : '#6b7280'};
  border: 1px solid ${props => props.$active 
    ? 'rgba(16, 185, 129, 0.3)' 
    : 'rgba(107, 114, 128, 0.3)'};
`;

const PriceBadge = styled.span`
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  background: rgba(255, 107, 107, 0.2);
  color: #FF6B6B;
  border: 1px solid rgba(255, 107, 107, 0.3);
`;

const ActionButton = styled.button<{ $variant?: 'edit' | 'delete' | 'toggle' }>`
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${props => {
    switch (props.$variant) {
      case 'delete': return '#ef4444';
      case 'edit': return 'var(--primary)';
      default: return 'var(--text-secondary)';
    }
  }};

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const Modal = styled(motion.div)`
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
  padding: 1rem;
  overflow-y: auto;
`;

const ModalContent = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.5rem;
  padding: 0.5rem;
  transition: color 0.2s ease;

  &:hover {
    color: var(--text);
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  grid-column: ${props => props.$fullWidth ? '1 / -1' : 'auto'};
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Textarea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }

  option {
    background: var(--card-bg);
    color: var(--text);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);

  input[type="checkbox"] {
    cursor: pointer;
  }
`;

const Alert = styled(motion.div)<{ $type: 'success' | 'error' | 'warning' }>`
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: ${props => {
    switch (props.$type) {
      case 'success': return 'rgba(16, 185, 129, 0.1)';
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(245, 158, 11, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'success': return 'rgba(16, 185, 129, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
    }
  }};

  svg {
    font-size: 1.25rem;
    flex-shrink: 0;
  }
`;

const HelpText = styled.p`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
  font-style: italic;
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;

  @media (max-width: 768px) {
    flex-direction: column-reverse;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);

  svg {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.3;
  }

  h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text);
  }

  p {
    margin-bottom: 1.5rem;
  }
`;

export default function PromotionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [targetOptions, setTargetOptions] = useState<PromotionTargetOption[]>(
    []
  );
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetFilter, setTargetFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    active: false,
    start_date: '',
    end_date: '',
    discount_type: 'amount' as 'percentage' | 'amount',
    discount_value: 50,
    stripe_coupon_code: '',
    create_stripe_coupon: true,
    priority: 0,
    promotion_target_mode: 'selected' as 'all' | 'selected',
    included_targets: [] as string[],
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    let cancelled = false;
    (async () => {
      setTargetsLoading(true);
      try {
        const res = await fetch('/api/admin/promotion-targets');
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.targets)) {
          setTargetOptions(data.targets);
        }
      } catch (e) {
        console.error('Failed to load promotion targets', e);
      } finally {
        if (!cancelled) setTargetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showModal]);

  const salePreviewExampleList = useMemo(() => {
    const found = targetOptions.find(
      (o) => o.list_price != null && Number.isFinite(o.list_price)
    );
    return found?.list_price ?? 59;
  }, [targetOptions]);

  const salePreviewLines = useMemo(() => {
    const dVal = Number(formData.discount_value);
    if (formData.promotion_target_mode === "all") {
      const sale = computePromotionalUnitPrice(
        salePreviewExampleList,
        formData.discount_type,
        dVal
      );
      return {
        mode: "all" as const,
        exampleList: salePreviewExampleList,
        exampleSale: sale,
      };
    }
    if (formData.included_targets.length === 0) {
      return { mode: "empty" as const };
    }
    const rows = formData.included_targets.map((key) => {
      const opt = targetOptions.find((o) => o.key === key);
      const label = opt?.label ?? key;
      const list =
        opt?.list_price != null && Number.isFinite(opt.list_price)
          ? opt.list_price
          : null;
      const sale =
        list != null
          ? computePromotionalUnitPrice(list, formData.discount_type, dVal)
          : null;
      return { key, label, list, sale };
    });
    return { mode: "selected" as const, rows };
  }, [
    formData.discount_type,
    formData.discount_value,
    formData.included_targets,
    formData.promotion_target_mode,
    salePreviewExampleList,
    targetOptions,
  ]);

  const loadPromotions = async () => {
    try {
      const response = await fetch('/api/admin/promotions');
      const data = await response.json();

      if (data.success) {
        setPromotions(data.promotions || []);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPromotion(null);
    setFormData({
      name: '',
      title: '',
      description: '',
      active: false,
      start_date: '',
      end_date: '',
      discount_type: 'amount',
      discount_value: 50,
      stripe_coupon_code: '',
      create_stripe_coupon: true,
      priority: 0,
      promotion_target_mode: 'selected',
      included_targets: [],
    });
    setTargetFilter('');
    setShowModal(true);
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    
    // Convert UTC dates to PST date format for input (YYYY-MM-DD)
    const formatDateForInput = (dateString: string | null) => {
      if (!dateString) return '';
      return utcToPSTDate(dateString) || '';
    };
    
    // If coupon code exists but coupon wasn't created, allow creating it
    // Default on: sync to Stripe whenever this promotion is not yet marked created (avoids missing checkbox after adding a code).
    setFormData({
      name: promotion.name,
      title: promotion.title,
      description: promotion.description || '',
      active: promotion.active,
      start_date: formatDateForInput(promotion.start_date),
      end_date: formatDateForInput(promotion.end_date),
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      stripe_coupon_code: promotion.stripe_coupon_code ?? "",
      create_stripe_coupon: !promotion.stripe_coupon_created,
      priority: promotion.priority,
      promotion_target_mode:
        promotion.promotion_target_mode === 'all' ? 'all' : 'selected',
      included_targets: Array.isArray(promotion.included_targets)
        ? [...promotion.included_targets]
        : [],
    });
    setTargetFilter('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingPromotion && {
            id: editingPromotion.id,
            stripe_coupon_id: editingPromotion.stripe_coupon_id,
            stripe_coupon_created: editingPromotion.stripe_coupon_created,
            banner_theme: editingPromotion.banner_theme,
          }),
          ...formData,
          included_targets:
            formData.promotion_target_mode === 'all'
              ? []
              : formData.included_targets,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Promotion ${editingPromotion ? 'updated' : 'created'} successfully!${data.stripe_coupon_created ? ' Stripe coupon created.' : ''}`,
        });
        setShowModal(false);
        loadPromotions();
      } else {
        const detail =
          typeof data.details === 'string' && data.details.trim()
            ? ` ${data.details}`
            : '';
        setMessage({
          type: 'error',
          text: `${data.error || 'Failed to save promotion'}${detail}`,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save promotion',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (promotion: Promotion) => {
    setPromotionToDelete(promotion);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!promotionToDelete) return;

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/promotions?id=${promotionToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Promotion "${promotionToDelete.title}" deleted successfully`,
        });
        setShowDeleteModal(false);
        setPromotionToDelete(null);
        loadPromotions();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to delete promotion',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to delete promotion',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPromotionToDelete(null);
  };

  const handleToggle = async (promotion: Promotion) => {
    try {
      // Convert UTC dates back to PST date format (YYYY-MM-DD) for the API
      const formatDateForAPI = (isoString: string | null) => {
        if (!isoString) return '';
        return utcToPSTDate(isoString) || '';
      };

      // Only send the fields needed for toggle - preserve all other data
      const response = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: promotion.id,
          name: promotion.name,
          title: promotion.title,
          description: promotion.description,
          active: !promotion.active, // Toggle the active status
          start_date: formatDateForAPI(promotion.start_date),
          end_date: formatDateForAPI(promotion.end_date),
          discount_type: promotion.discount_type,
          discount_value: promotion.discount_value,
          stripe_coupon_code: promotion.stripe_coupon_code,
          stripe_coupon_id: promotion.stripe_coupon_id,
          stripe_coupon_created: promotion.stripe_coupon_created,
          banner_theme: promotion.banner_theme,
          priority: promotion.priority,
          promotion_target_mode:
            promotion.promotion_target_mode === 'all' ? 'all' : 'selected',
          included_targets: Array.isArray(promotion.included_targets)
            ? promotion.included_targets
            : [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        loadPromotions();
      } else {
        console.error('Error toggling promotion:', data.error);
      }
    } catch (error) {
      console.error('Error toggling promotion:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No limit';
    // Display dates in PST timezone
    return formatPSTDate(dateString);
  };

  if (!user || !user.is_admin) {
    return <LoadingComponent fullScreen={true} />;
  }

  if (loading) {
    return <LoadingComponent fullScreen={true} />;
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <Title>
            <FaBullhorn />
            Promotions Manager
          </Title>
          <Subtitle>
            Manage sales, discounts, and promotional campaigns
          </Subtitle>
        </HeaderContent>
        <Button $variant="primary" onClick={handleCreate}>
          <FaPlus />
          Create Promotion
        </Button>
      </Header>

      {message && (
        <Alert
          $type={message.type}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message.type === 'success' && <FaCheckCircle />}
          {message.type === 'error' && <FaExclamationTriangle />}
          {message.type === 'warning' && <FaExclamationTriangle />}
          <span>{message.text}</span>
        </Alert>
      )}

      {promotions.length === 0 ? (
        <EmptyState>
          <FaBullhorn />
          <h3>No Promotions Yet</h3>
          <p>Create your first promotional campaign to get started</p>
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Status</Th>
              <Th>Campaign</Th>
              <Th>Discount</Th>
              <Th>Scope</Th>
              <Th>List pricing</Th>
              <Th>Dates</Th>
              <Th>Coupon</Th>
              <Th>Stats</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {promotions.map(promotion => (
              <Tr key={promotion.id}>
                <Td>
                  <StatusBadge $active={promotion.active}>
                    {promotion.active ? <FaToggleOn /> : <FaToggleOff />}
                    {promotion.active ? 'ACTIVE' : 'INACTIVE'}
                  </StatusBadge>
                </Td>
                <Td>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
                    {promotion.title}
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    {promotion.description}
                  </div>
                </Td>
                <Td>
                  {promotion.discount_type === 'percentage' 
                    ? `${promotion.discount_value}% OFF`
                    : `$${promotion.discount_value} OFF`
                  }
                </Td>
                <Td>
                  <div style={{ fontSize: '0.8rem' }}>
                    {promotion.promotion_target_mode === 'all'
                      ? 'All offers'
                      : `${promotion.included_targets?.length ?? 0} target(s)`}
                  </div>
                </Td>
                <Td>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {promotion.promotion_target_mode === 'all'
                      ? 'Each offer uses its own list price'
                      : 'Discount applies to selected targets’ list prices'}
                  </span>
                </Td>
                <Td>
                  <div style={{ fontSize: '0.8rem' }}>
                    {formatDate(promotion.start_date)}
                    <br />
                    to {formatDate(promotion.end_date)}
                  </div>
                </Td>
                <Td>
                  <div style={{ fontSize: '0.8rem' }}>
                    {promotion.stripe_coupon_code}
                    {promotion.stripe_coupon_created && (
                      <div style={{ color: '#10b981', marginTop: '0.25rem' }}>
                        ✓ Created in Stripe
                      </div>
                    )}
                  </div>
                </Td>
                <Td>
                  <div style={{ fontSize: '0.8rem' }}>
                    <div>Views: {promotion.views}</div>
                    <div>Conversions: {promotion.conversions}</div>
                    <div>Revenue: ${promotion.revenue || 0}</div>
                  </div>
                </Td>
                <Td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <ActionButton
                      $variant="toggle"
                      onClick={() => handleToggle(promotion)}
                      title={promotion.active ? 'Deactivate' : 'Activate'}
                    >
                      {promotion.active ? <FaToggleOff /> : <FaToggleOn />}
                    </ActionButton>
                    <ActionButton
                      $variant="edit"
                      onClick={() => handleEdit(promotion)}
                      title="Edit"
                    >
                      <FaEdit />
                    </ActionButton>
                    <ActionButton
                      $variant="delete"
                      onClick={() => handleDeleteClick(promotion)}
                      title="Delete"
                    >
                      <FaTrash />
                    </ActionButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence mode="wait">
        {showModal && (
          <Modal
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaBullhorn />
                  {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
                </ModalTitle>
                <CloseButton onClick={() => setShowModal(false)}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <FormGrid>
                <FormGroup $fullWidth>
                  <Label>Campaign Name (Internal ID)</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="black_friday_2025"
                  />
                  <HelpText>
                    Unique in the database. You can change it when editing; saving fails if another promotion already
                    uses that name. This is separate from the Stripe coupon code.
                  </HelpText>
                </FormGroup>

                <FormGroup $fullWidth>
                  <Label>
                    <FaFire />
                    Banner Title
                  </Label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="🔥 Black Friday Sale"
                  />
                </FormGroup>

                <FormGroup $fullWidth>
                  <Label>Banner Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Lifetime access for just $99 - Save $150!"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>
                    <FaCalendarAlt />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                  <HelpText>Leave empty for no start date</HelpText>
                </FormGroup>

                <FormGroup>
                  <Label>
                    <FaCalendarAlt />
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                  <HelpText>Leave empty for no end date</HelpText>
                </FormGroup>

                <FormGroup>
                  <Label>
                    <FaPercent />
                    Discount Type
                  </Label>
                  <Select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'amount' })}
                  >
                    <option value="amount">Fixed Amount ($)</option>
                    <option value="percentage">Percentage (%)</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>
                    <FaDollarSign />
                    Discount Value
                  </Label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : 200}
                  />
                  <HelpText>
                    {formData.discount_type === 'percentage' 
                      ? '% off normal price' 
                      : '$ off normal price'
                    }
                  </HelpText>
                </FormGroup>

                <FormGroup $fullWidth>
                  <Label>Applies to</Label>
                  <Select
                    value={formData.promotion_target_mode}
                    onChange={(e) => {
                      const v = e.target.value as 'all' | 'selected';
                      setFormData({
                        ...formData,
                        promotion_target_mode: v,
                        included_targets: v === 'all' ? [] : formData.included_targets,
                      });
                    }}
                  >
                    <option value="all">All offers (Cymasphere, shop, every elite bundle tier)</option>
                    <option value="selected">Selected offers only (check below)</option>
                  </Select>
                  <HelpText>
                    Elite bundles list each tier separately (e.g. Ultimate — Monthly). Cymasphere uses
                    the three membership rows.
                  </HelpText>
                </FormGroup>

                {formData.promotion_target_mode === 'selected' && (
                  <FormGroup $fullWidth>
                    <Label>Include these offers</Label>
                    <Input
                      type="search"
                      placeholder="Filter by name…"
                      value={targetFilter}
                      onChange={(e) => setTargetFilter(e.target.value)}
                    />
                    {targetsLoading ? (
                      <HelpText>Loading offer list…</HelpText>
                    ) : (
                      <div
                        style={{
                          maxHeight: '280px',
                          overflowY: 'auto',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          marginTop: '0.5rem',
                        }}
                      >
                        {Array.from(new Set(targetOptions.map((t) => t.group))).map((group) => (
                          <div key={group} style={{ marginBottom: '1rem' }}>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                marginBottom: '0.35rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {group}
                            </div>
                            {targetOptions
                              .filter((t) => t.group === group)
                              .filter((t) =>
                                targetFilter.trim()
                                  ? t.label
                                      .toLowerCase()
                                      .includes(targetFilter.trim().toLowerCase())
                                  : true
                              )
                              .map((opt) => (
                                <CheckboxLabel
                                  key={opt.key}
                                  style={{
                                    display: 'flex',
                                    width: '100%',
                                    marginBottom: '0.35rem',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.included_targets.includes(opt.key)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          included_targets: [
                                            ...formData.included_targets,
                                            opt.key,
                                          ],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          included_targets:
                                            formData.included_targets.filter(
                                              (k) => k !== opt.key
                                            ),
                                        });
                                      }
                                    }}
                                  />
                                  <span style={{ marginLeft: '0.35rem' }}>{opt.label}</span>
                                </CheckboxLabel>
                              ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </FormGroup>
                )}

                <FormGroup>
                  <Label>
                    <FaStripe />
                    Stripe Coupon Code
                  </Label>
                  <Input
                    type="text"
                    value={formData.stripe_coupon_code ?? ""}
                    onChange={(e) => setFormData({ ...formData, stripe_coupon_code: e.target.value })}
                    placeholder="BLACKFRIDAY2025 (optional — leave blank to use internal name)"
                  />
                  <HelpText>
                    If empty and sync is on below, the coupon id is derived from the internal name (letters, numbers,
                    underscores). Customers enter that code at checkout.
                  </HelpText>
                </FormGroup>

                <FormGroup>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    min="0"
                  />
                  <HelpText>Higher priority = shown first (if multiple active)</HelpText>
                </FormGroup>

                <FormGroup $fullWidth>
                  <CheckboxLabel>
                    <input
                      type="checkbox"
                      checked={formData.create_stripe_coupon}
                      onChange={(e) => setFormData({ ...formData, create_stripe_coupon: e.target.checked })}
                    />
                    {editingPromotion && editingPromotion.stripe_coupon_created
                      ? 'Sync Stripe coupon when saving (discount, dates, title)'
                      : 'Create / sync Stripe coupon in Stripe'}
                  </CheckboxLabel>
                  {editingPromotion &&
                    !editingPromotion.stripe_coupon_created &&
                    (formData.stripe_coupon_code || formData.create_stripe_coupon) && (
                      <HelpText style={{ color: '#ffc107', marginTop: '8px' }}>
                        Stripe coupon is not created yet — saving will sync it unless you turn off the option above.
                      </HelpText>
                    )}
                </FormGroup>
              </FormGrid>

              <div
                style={{
                  background: "rgba(255, 107, 107, 0.05)",
                  border: "1px solid rgba(255, 107, 107, 0.3)",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginTop: "1rem",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: "var(--text)",
                  }}
                >
                  Sale preview
                </div>
                {targetsLoading ? (
                  <span>Loading target prices…</span>
                ) : salePreviewLines.mode === "all" ? (
                  <>
                    <p style={{ margin: "0 0 0.5rem" }}>
                      All offers — each checkout or catalog row uses its own list
                      price with this discount (nothing stored on the promotion).
                    </p>
                    <div>
                      Example at {formatPreviewUsd(salePreviewLines.exampleList)}{" "}
                      list:{" "}
                      <strong style={{ color: "#FF6B6B" }}>
                        {formatPreviewUsd(salePreviewLines.exampleSale)}
                      </strong>
                    </div>
                  </>
                ) : salePreviewLines.mode === "empty" ? (
                  <span>Select targets to see per-offer list → sale amounts.</span>
                ) : (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1.25rem",
                      color: "var(--text)",
                    }}
                  >
                    {salePreviewLines.rows.map((row) => (
                      <li key={row.key} style={{ marginBottom: "0.35rem" }}>
                        <strong>{row.label}</strong>
                        {row.list != null && row.sale != null ? (
                          <>
                            {": "}
                            {formatPreviewUsd(row.list)} →{" "}
                            <strong style={{ color: "#FF6B6B" }}>
                              {formatPreviewUsd(row.sale)}
                            </strong>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-secondary)" }}>
                            {" "}
                            — set a list price on this product or tier to preview
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <ModalFooter>
                <Button $variant="secondary" onClick={() => setShowModal(false)}>
                  <FaTimes />
                  Cancel
                </Button>
                <Button
                  $variant="primary"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !formData.name ||
                    !formData.title ||
                    (formData.promotion_target_mode === 'selected' &&
                      formData.included_targets.length === 0)
                  }
                >
                  <FaSave />
                  {saving ? 'Saving...' : editingPromotion ? 'Update' : 'Create'}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence mode="wait">
        {showDeleteModal && promotionToDelete && (
          <Modal
            key="delete-modal"
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
                    Delete Promotion
                  </ModalTitle>
                  <CloseButton onClick={handleDeleteCancel}>
                    <FaTimes />
                  </CloseButton>
                </ModalHeader>

                <div style={{ padding: '24px' }}>
                  <p style={{ marginBottom: '16px', color: 'var(--text)', fontSize: '16px', lineHeight: '1.6' }}>
                    Are you sure you want to delete this promotion? This action cannot be undone.
                  </p>
                  
                  <div style={{
                    background: 'rgba(255, 94, 98, 0.1)',
                    border: '1px solid rgba(255, 94, 98, 0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      {promotionToDelete.title}
                    </p>
                    {promotionToDelete.description && (
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {promotionToDelete.description}
                      </p>
                    )}
                    <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Coupon: <strong>{promotionToDelete.stripe_coupon_code || 'N/A'}</strong>
                      </span>
                      {promotionToDelete.stripe_coupon_created && (
                        <span style={{ fontSize: '12px', color: '#ff5e62' }}>
                          ⚠️ Stripe coupon will remain in Stripe
                        </span>
                      )}
                    </div>
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
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      style={{ minWidth: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {deleting ? (
                        <>
                          <SpinningIcon />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <FaTrash />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </ModalContent>
            </Modal>
          )}
        </AnimatePresence>
      </Container>
    );
  }

