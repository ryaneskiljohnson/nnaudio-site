/**
 * @fileoverview Admin NFR (user_management) licenses: list records, create users, and product grants.
 * Optional query `?email=` prefill from support tickets opens grants or the create-user flow for that address.
 * @module app/(private)/(admin)/admin/nfr/page
 */

"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NextSEO from "@/components/NextSEO";
import {
  FaUsers,
  FaPlus,
  FaCheck,
  FaTimes,
  FaEnvelope,
  FaCrown,
  FaTrash,
  FaGift,
  FaBox,
  FaSearch,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import styled from "styled-components";
import { motion } from "framer-motion";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";
import AdminResponsiveList from "@/components/admin/AdminResponsiveList";
import {
  AdminDataCard,
  AdminDataCardActions,
  AdminDataCardHeader,
  AdminDataCardMeta,
  AdminDataCardRow,
  AdminMobileCardList,
} from "@/components/admin/AdminDataCard";
import { AdminMobileEmpty, AdminMobileLoading } from "@/components/admin/AdminMobileLoading";
import {
  getUserManagementRecords,
  createUserManagementRecord,
  updateUserManagementRecordById,
  createUserManagementWithInvite,
  deleteUserManagementRecordById,
  type UserManagementRecord,
} from "@/app/actions/user-management";
import {
  getProductGrantsForUsers,
  getUserProductGrants,
  grantProduct,
  revokeProductGrant,
  type ProductGrant,
} from "@/app/actions/product-grants";
import { normalizeEmailForGrantLookup } from "@/utils/supabase/email-grant-normalize";

/**
 * @brief Whether a grant row belongs to a user_management row (by user_id or email).
 */
function grantMatchesRecord(
  grant: ProductGrant,
  record: UserManagementRecord
): boolean {
  const re = normalizeEmailForGrantLookup(record.user_email ?? "");
  const ge = normalizeEmailForGrantLookup(grant.user_email ?? "");
  const rid = record.user_id?.trim();
  const gid = grant.user_id?.trim() ?? "";

  if (rid && gid && rid === gid) return true;
  if (re && ge && re === ge) return true;
  return false;
}

/**
 * @brief Key for `productGrants` map: stable `user_id` when set, else normalized email.
 */
function grantsMapKey(record: UserManagementRecord): string {
  const uid = record.user_id?.trim();
  if (uid) return `uid:${uid}`;
  return normalizeEmailForGrantLookup(record.user_email ?? "");
}

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 8px 0;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const Title = styled.h1`
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
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
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

  @media (max-width: 768px) {
    width: 100%;
    min-height: 44px;
    justify-content: center;
  }
`;

const TableContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    overflow-x: auto;
    
    table {
      min-width: 800px;
    }
  }
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
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;

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
`;

const EmailCell = styled(TableCell)`
  font-weight: 500;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DeleteButton = styled.button`
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background-color: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background-color: rgba(220, 53, 69, 0.2);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    font-size: 0.8rem;
  }
`;

const NotesCellContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
`;

const CardNotesBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.4rem;
  width: 100%;
  margin-bottom: 0.55rem;
`;

const CardNotesLabel = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
`;

const NotesInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
    background-color: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SaveButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(108, 99, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    font-size: 0.7rem;
  }
`;

const ToggleSwitch = styled.label<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.$checked ? 'var(--primary)' : 'rgba(255, 255, 255, 0.2)'};
    transition: 0.3s;
    border-radius: 26px;

    &:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
      transform: ${props => props.$checked ? 'translateX(24px)' : 'translateX(0)'};
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-style: italic;
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
  border-radius: 16px;
  padding: 2.5rem;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    width: min(100vw - 24px, 520px);
    max-height: 85dvh;
    padding: 1.25rem;
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

const FormColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
`;

const NameFields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  min-height: 100px;
  resize: vertical;
  transition: all 0.3s ease;
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

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
`;

const CheckboxLabel = styled.label`
  color: var(--text);
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${props => props.variant === 'primary' ? `
    background: linear-gradient(90deg, var(--primary), var(--accent));
    color: white;
    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
    }
  ` : `
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
    border: 1px solid rgba(255, 255, 255, 0.2);
    &:hover {
      background-color: rgba(255, 255, 255, 0.15);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
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

const GrantListToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  gap: 0.75rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
`;

const GrantListCount = styled.span`
  color: var(--text-secondary);
  font-size: 0.8rem;
`;

const GrantListTableWrap = styled.div`
  max-height: 420px;
  overflow-y: auto;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
`;

const GrantListTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
`;

const GrantListHead = styled.thead`
  background: rgba(255, 255, 255, 0.04);
  position: sticky;
  top: 0;
  z-index: 1;
`;

const GrantListTh = styled.th`
  padding: 6px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;

  &:last-child {
    width: 36px;
    text-align: center;
  }
`;

const GrantListRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const GrantListTd = styled.td`
  padding: 5px 10px;
  color: var(--text);
  vertical-align: middle;
`;

const GrantProductName = styled.div`
  font-weight: 600;
  line-height: 1.25;
`;

const GrantProductSlug = styled.span`
  color: var(--text-secondary);
  font-weight: 400;
  font-size: 0.75rem;
`;

const GrantNotes = styled.span`
  color: var(--text-secondary);
  font-size: 0.75rem;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
`;

const GrantDate = styled.span`
  color: var(--text-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
`;

const GrantRevokeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 94, 98, 0.15);
    border-color: rgba(255, 94, 98, 0.35);
    color: #ff5e62;
  }
`;

const GrantEmptyState = styled.div`
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  font-size: 0.875rem;

  svg {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    opacity: 0.45;
  }
`;

export default function UserManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  /** @note Cleared when `email` is absent so the same link can be used again after navigation. */
  const lastProcessedEmailQueryRef = useRef<string | null>(null);
  const [records, setRecords] = useState<UserManagementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Track original notes values from last DB load
  const [originalNotes, setOriginalNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formPro, setFormPro] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formInvite, setFormInvite] = useState(false);
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formSelectedProducts, setFormSelectedProducts] = useState<string[]>([]);
  const [formProductSearch, setFormProductSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Array<{ email: string; id: string }>>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);

  // Product grants state
  const [productGrants, setProductGrants] = useState<Record<string, ProductGrant[]>>({});
  const [grantModalRecordId, setGrantModalRecordId] = useState<string | null>(
    null,
  );
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantFormSelectedProductIds, setGrantFormSelectedProductIds] = useState<
    string[]
  >([]);
  const [grantFormNotes, setGrantFormNotes] = useState('');
  const [grantFormAmount, setGrantFormAmount] = useState<string>('0');
  const [grantLoading, setGrantLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const grantModalRecord = useMemo(
    () => records.find((r) => r.id === grantModalRecordId) ?? null,
    [records, grantModalRecordId],
  );
  const grantMapKey = grantModalRecord
    ? grantsMapKey(grantModalRecord)
    : "";
  const grantDisplayLabel =
    grantModalRecord?.user_email?.trim() || grantModalRecord?.id || "—";

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const result = await getUserManagementRecords();

      if (result.error) {
        throw new Error(result.error);
      }

      const data = result.data || [];
      setRecords(data);

      // Store original notes values
      const original: Record<string, string> = {};
      data.forEach((record) => {
        original[record.id] = record.notes || "";
      });
      setOriginalNotes(original);

      // Fetch product grants for these NFR rows (user_id + email; avoids loading 100k+ grants)
      const userDescriptors = data.map((r) => ({
        userId: r.user_id ?? null,
        email: r.user_email ?? null,
      }));
      const hasAnyDescriptor = userDescriptors.some(
        (u) =>
          (typeof u.userId === "string" && u.userId.trim().length > 0) ||
          (typeof u.email === "string" && u.email.trim().length > 0)
      );
      if (hasAnyDescriptor) {
        const grantsResult = await getProductGrantsForUsers(userDescriptors);
        if (grantsResult.error) {
          console.error("Error fetching product grants for NFR users:", grantsResult.error);
        } else if (grantsResult.data) {
          const grouped: Record<string, ProductGrant[]> = {};
          for (const r of data) {
            grouped[grantsMapKey(r)] = [];
          }
          for (const grant of grantsResult.data) {
            for (const r of data) {
              if (grantMatchesRecord(grant, r)) {
                const k = grantsMapKey(r);
                if (!grouped[k]) grouped[k] = [];
                if (!grouped[k].some((g) => g.id === grant.id)) {
                  grouped[k].push(grant);
                }
              }
            }
          }
          setProductGrants(grouped);
        }
      } else {
        setProductGrants({});
      }
    } catch (err: any) {
      console.error("Error fetching records:", err);
      setError(err.message || "Failed to load user management records");
    } finally {
      setLoading(false);
    }
  };

  // Search users for email autocomplete
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      setShowUserDropdown(false);
      setIsExistingUser(false);
      return;
    }

    try {
      setUserSearchLoading(true);
      const response = await fetch(`/api/admin/search-users?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      
      if (response.ok && data.users) {
        setUserSearchResults(data.users);
        setShowUserDropdown(true);
        // Check if current email exactly matches any result (case-insensitive)
        const normalizedQuery = query.trim().toLowerCase();
        const exists = data.users.some((u: { email: string }) => 
          u.email.toLowerCase() === normalizedQuery
        );
        setIsExistingUser(exists);
      } else {
        setUserSearchResults([]);
        setIsExistingUser(false);
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setUserSearchResults([]);
      setIsExistingUser(false);
    } finally {
      setUserSearchLoading(false);
    }
  };

  // Check if email exactly matches an existing user
  const checkExactEmailMatch = async (email: string) => {
    if (!email.trim()) {
      setIsExistingUser(false);
      return;
    }

    try {
      // Do an exact search for the email
      const response = await fetch(`/api/admin/search-users?q=${encodeURIComponent(email.trim())}&exact=true`);
      const data = await response.json();
      
      if (response.ok && data.users && data.users.length > 0) {
        const normalizedEmail = email.trim().toLowerCase();
        const exists = data.users.some((u: { email: string }) => 
          u.email.toLowerCase() === normalizedEmail
        );
        setIsExistingUser(exists);
      } else {
        setIsExistingUser(false);
      }
    } catch (err) {
      console.error('Error checking exact email match:', err);
      setIsExistingUser(false);
    }
  };

  // Debounce user search
  const [userSearchTimeout, setUserSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleEmailChange = (value: string) => {
    setFormEmail(value);
    setShowUserDropdown(false);
    setIsExistingUser(false); // Reset until we check

    if (userSearchTimeout) {
      clearTimeout(userSearchTimeout);
    }

    const timeout = setTimeout(() => {
      searchUsers(value);
      // Also check for exact match after a longer delay
      setTimeout(() => {
        checkExactEmailMatch(value);
      }, 100);
    }, 300);

    setUserSearchTimeout(timeout);
  };

  const fetchProducts = async () => {
    try {
      // Include all products (active and inactive) plus free NNAudio Access for NFR grants.
      const response = await fetch(
        "/api/products?status=all&limit=10000&include_nnaudio_access_product=true"
      );
      const data = await response.json();

      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  /** Refresh product grants for a single email (e.g. after add/revoke in modal). */
  const refreshGrantsForEmail = async (email: string) => {
    const result = await getUserProductGrants(email);
    if (result.error || !result.data) return;
    const key = email.trim().toLowerCase();
    setProductGrants((prev) => ({ ...prev, [key]: result.data! }));
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
      fetchProducts();
    }
  }, [user]);

  /**
   * @brief Applies `?email=` from the URL: opens product grants for existing NFR rows or the create modal otherwise.
   * @note Uses a ref keyed by normalized email to avoid duplicate modals under React Strict Mode; strips the query after apply.
   */
  useEffect(() => {
    const raw = searchParams.get("email");
    if (!raw?.trim()) {
      lastProcessedEmailQueryRef.current = null;
      return;
    }
    if (!user || loading) return;

    const normalized = raw.trim().toLowerCase();
    const queryKey = `email=${normalized}`;
    if (lastProcessedEmailQueryRef.current === queryKey) return;
    lastProcessedEmailQueryRef.current = queryKey;

    const record = records.find(
      (r) => (r.user_email?.toLowerCase() ?? "") === normalized
    );
    if (record) {
      const displayEmail = record.user_email ?? "";
      setSearchQuery(displayEmail);
      setGrantModalRecordId(record.id);
      setShowGrantForm(true);
      void refreshGrantsForEmail(displayEmail);
    } else {
      setShowCreateModal(true);
      setFormEmail(raw.trim());
      void checkExactEmailMatch(raw.trim());
    }

    router.replace("/admin/nfr", { scroll: false });
  }, [user, loading, records, searchParams, router]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formEmail.trim()) {
      showNotification('error', 'Email is required');
      return;
    }

    try {
      setCreateLoading(true);

      if (formInvite) {
        // Use invite server function
        const result = await createUserManagementWithInvite(
          formEmail.trim(),
          formPro,
          formNotes.trim() || null,
          formFirstName.trim() || null,
          formLastName.trim() || null,
          formActive
        );

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.warning) {
          showNotification('error', result.warning);
        } else {
          showNotification('success', 'User created and invite sent successfully');
        }
      } else {
        // Use regular create server function
        const result = await createUserManagementRecord(
          formEmail.trim(),
          formPro,
          formNotes.trim() || null,
          formActive
        );

        if (result.error) {
          throw new Error(result.error);
        }

        showNotification('success', 'User created successfully');
      }

      // Grant products if any were selected
      if (formSelectedProducts.length > 0) {
        const email = formEmail.trim().toLowerCase();
        const grantResults: Array<{ success: boolean; productId: string; error?: string }> = [];
        
        for (const productId of formSelectedProducts) {
          try {
            const result = await grantProduct(email, productId, null);
            
            if (result.error) {
              grantResults.push({ 
                success: false, 
                productId, 
                error: result.error
              });
              console.error(`Failed to grant product ${productId}:`, result.error);
            } else {
              grantResults.push({ success: true, productId });
            }
          } catch (err: any) {
            grantResults.push({ 
              success: false, 
              productId, 
              error: err.message || 'Network error' 
            });
            console.error(`Error granting product ${productId}:`, err);
          }
        }
        
        const successCount = grantResults.filter(r => r.success).length;
        const failCount = grantResults.filter(r => !r.success).length;
        
        if (successCount > 0) {
          showNotification('success', `Successfully granted ${successCount} product${successCount !== 1 ? 's' : ''}`);
        }
        if (failCount > 0) {
          const errors = grantResults.filter(r => !r.success).map(r => r.error).join(', ');
          showNotification('error', `Failed to grant ${failCount} product${failCount !== 1 ? 's' : ''}: ${errors}`);
        }
      }

      setShowCreateModal(false);
      setFormEmail('');
      setFormPro(true);
      setFormNotes('');
      setFormInvite(false);
      setFormFirstName('');
      setFormLastName('');
      setFormSelectedProducts([]);
      setFormProductSearch('');
      setFormActive(true);
      fetchRecords();
    } catch (err: any) {
      showNotification('error', err.message || 'An unexpected error occurred');
      console.error('Create error:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateActive = async (recordId: string, active: boolean) => {
    try {
      setUpdatingRowId(recordId);
      const result = await updateUserManagementRecordById(recordId, { active });

      if (result.error) {
        throw new Error(result.error);
      }

      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId ? { ...record, active } : record,
        ),
      );
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update active status');
      console.error('Update active error:', err);
      fetchRecords();
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleUpdateNotes = async (recordId: string, newNotes: string) => {
    try {
      setUpdatingRowId(recordId);
      const result = await updateUserManagementRecordById(recordId, {
        notes: newNotes || null,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId
            ? { ...record, notes: newNotes || null }
            : record,
        ),
      );

      setOriginalNotes((prev) => ({
        ...prev,
        [recordId]: newNotes || '',
      }));
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update notes');
      console.error('Update notes error:', err);
      fetchRecords();
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleDelete = async (record: UserManagementRecord) => {
    const label = record.user_email?.trim() || record.id;
    if (!confirm(`Are you sure you want to delete the user management record for ${label}?`)) {
      return;
    }

    try {
      setUpdatingRowId(record.id);
      const result = await deleteUserManagementRecordById(record.id);

      if (result.error) {
        throw new Error(result.error);
      }

      setRecords((prev) => prev.filter((r) => r.id !== record.id));

      setOriginalNotes((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });

      showNotification('success', 'User management record deleted successfully');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete record');
      console.error('Delete error:', err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  // Compute filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const emailStr = record.user_email ?? "";
      const emailMatch = emailStr.toLowerCase().includes(query);
      const notesMatch = (record.notes || '').toLowerCase().includes(query);
      const productGrantsList = productGrants[grantsMapKey(record)] || [];
      const productMatch = productGrantsList.some((grant: any) => 
        grant.products?.name?.toLowerCase().includes(query) ||
        grant.products?.slug?.toLowerCase().includes(query)
      );
      return emailMatch || notesMatch || productMatch;
    });
  }, [records, searchQuery, productGrants]);

  return (
    <Container>
      <NextSEO title="NFR Licenses - Admin" />
      
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Header>
          <TitleRow>
            <Title>
              <FaUsers />
              NFR Licenses
            </Title>
            {user && (
              <CreateButton onClick={() => setShowCreateModal(true)}>
                <FaPlus />
                Add User
              </CreateButton>
            )}
          </TitleRow>
          <Subtitle>Manage user pro status and notes by email address</Subtitle>
        </Header>

        {user && (
          <>
            <div style={{ 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ 
                position: 'relative',
                flex: 1,
                maxWidth: '500px'
              }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontSize: '1rem'
                }} />
                <input
                  type="text"
                  placeholder="Search by email, notes, or products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 44px',
                    background: 'var(--input-bg)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(108, 99, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FaTimes /> Clear
                </button>
              )}
            </div>

            {error && (
              <div style={{ color: 'var(--error)', textAlign: 'center', padding: '2rem' }}>
                {error}
              </div>
            )}

            <AdminResponsiveList
              desktop={
            <TableContainer>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Product Grants</TableHeaderCell>
                    <TableHeaderCell>Notes</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'center', width: '60px' }}>Actions</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <tr>
                      <TableCell colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                        <NNAudioLoadingSpinner size={40} />
                      </TableCell>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <TableCell colSpan={5}>
                        <EmptyState>No users found. Click "Add User" to create one.</EmptyState>
                      </TableCell>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <TableCell colSpan={5}>
                        <EmptyState>
                          No users match your search "{searchQuery}". 
                          <button
                            onClick={() => setSearchQuery('')}
                            style={{
                              marginLeft: '0.5rem',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            Clear search
                          </button>
                        </EmptyState>
                      </TableCell>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <React.Fragment key={record.id}>
                        <TableRow>
                          <EmailCell>
                            <span>{record.user_email ?? "—"}</span>
                          </EmailCell>
                          <TableCell>
                            {updatingRowId === record.id ? (
                              <NNAudioLoadingSpinner size={20} />
                            ) : (
                              <ToggleSwitch $checked={record.active !== false}>
                                <input
                                  type="checkbox"
                                  checked={record.active !== false}
                                  onChange={(e) =>
                                    handleUpdateActive(
                                      record.id,
                                      e.target.checked
                                    )
                                  }
                                />
                                <span className="slider" />
                              </ToggleSwitch>
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                            onClick={() => {
                              setGrantModalRecordId(record.id);
                              setShowGrantForm(false);
                            }}
                            style={{
                              padding: '8px 16px',
                              background: (productGrants[grantsMapKey(record)]?.length || 0) > 0 
                                ? 'linear-gradient(90deg, var(--primary), var(--accent))'
                                : 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '6px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontWeight: 600,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <FaGift />
                            {productGrants[grantsMapKey(record)]?.length || 0} Product{productGrants[grantsMapKey(record)]?.length !== 1 ? 's' : ''}
                          </button>
                        </TableCell>
                        <TableCell>
                          {updatingRowId === record.id ? (
                            <NNAudioLoadingSpinner size={20} />
                          ) : (
                            <NotesCellContainer>
                                <NotesInput
                                  type="text"
                                  value={record.notes || ''}
                                  placeholder="Add notes..."
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    // Update local state immediately for better UX
                                    setRecords(prev =>
                                      prev.map((r) =>
                                        r.id === record.id
                                          ? { ...r, notes: newValue }
                                          : r
                                      )
                                    );
                                  }}
                                />
                                <SaveButton
                                  onClick={() =>
                                    handleUpdateNotes(
                                      record.id,
                                      record.notes || ""
                                    )
                                  }
                                  disabled={
                                    updatingRowId === record.id ||
                                    (record.notes || "") ===
                                      (originalNotes[record.id] || "")
                                  }
                                >
                                  <FaCheck />
                                  Save
                                </SaveButton>
                              </NotesCellContainer>
                            )}
                          </TableCell>
                          <TableCell style={{ textAlign: 'center' }}>
                            <DeleteButton
                              onClick={() =>
                                handleDelete(record)
                              }
                              disabled={updatingRowId === record.id}
                              title="Delete user management record"
                            >
                              <FaTrash />
                            </DeleteButton>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
              }
              mobile={
                loading ? (
                  <AdminMobileLoading count={4} />
                ) : records.length === 0 ? (
                  <AdminMobileEmpty message='No users found. Click "Add User" to create one.' />
                ) : filteredRecords.length === 0 ? (
                  <AdminMobileEmpty message={`No users match your search "${searchQuery}".`} />
                ) : (
                  <AdminMobileCardList>
                    {filteredRecords.map((record) => (
                      <AdminDataCard key={record.id}>
                        <AdminDataCardHeader
                          title={record.user_email ?? "—"}
                          badge={
                            updatingRowId === record.id ? (
                              <NNAudioLoadingSpinner size={20} />
                            ) : (
                              <ToggleSwitch $checked={record.active !== false}>
                                <input
                                  type="checkbox"
                                  checked={record.active !== false}
                                  onChange={(e) =>
                                    handleUpdateActive(record.id, e.target.checked)
                                  }
                                />
                                <span className="slider" />
                              </ToggleSwitch>
                            )
                          }
                        />
                        <CardNotesBlock>
                          <CardNotesLabel>Notes</CardNotesLabel>
                          {updatingRowId === record.id ? (
                            <NNAudioLoadingSpinner size={20} />
                          ) : (
                            <NotesCellContainer>
                              <NotesInput
                                type="text"
                                value={record.notes || ""}
                                placeholder="Add notes..."
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setRecords((prev) =>
                                    prev.map((r) =>
                                      r.id === record.id ? { ...r, notes: newValue } : r
                                    )
                                  );
                                }}
                              />
                              <SaveButton
                                onClick={() =>
                                  handleUpdateNotes(record.id, record.notes || "")
                                }
                                disabled={
                                  updatingRowId === record.id ||
                                  (record.notes || "") === (originalNotes[record.id] || "")
                                }
                              >
                                <FaCheck />
                                Save
                              </SaveButton>
                            </NotesCellContainer>
                          )}
                        </CardNotesBlock>
                        <AdminDataCardActions>
                          <button
                            onClick={() => {
                              setGrantModalRecordId(record.id);
                              setShowGrantForm(false);
                            }}
                            style={{
                              padding: "8px 16px",
                              background:
                                (productGrants[grantsMapKey(record)]?.length || 0) > 0
                                  ? "linear-gradient(90deg, var(--primary), var(--accent))"
                                  : "rgba(255, 255, 255, 0.1)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "6px",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              fontWeight: 600,
                            }}
                          >
                            <FaGift />
                            {productGrants[grantsMapKey(record)]?.length || 0} Product
                            {productGrants[grantsMapKey(record)]?.length !== 1 ? "s" : ""}
                          </button>
                          <DeleteButton
                            onClick={() => handleDelete(record)}
                            disabled={updatingRowId === record.id}
                            title="Delete user management record"
                          >
                            <FaTrash />
                          </DeleteButton>
                        </AdminDataCardActions>
                      </AdminDataCard>
                    ))}
                  </AdminMobileCardList>
                )
              }
            />
          </>
        )}

        {/* Create Modal */}
        {showCreateModal && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCreateModal(false);
                setFormEmail('');
                setFormPro(true);
                setFormNotes('');
                setFormInvite(false);
                setFormFirstName('');
                setFormLastName('');
                setFormSelectedProducts([]);
                setFormProductSearch('');
                setFormActive(true);
                setUserSearchResults([]);
                setShowUserDropdown(false);
                setIsExistingUser(false);
                if (userSearchTimeout) {
                  clearTimeout(userSearchTimeout);
                  setUserSearchTimeout(null);
                }
              }}
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
                  Add User
                </ModalTitle>
                <CloseButton onClick={() => {
                  setShowCreateModal(false);
                  setFormEmail('');
                  setFormPro(true);
                  setFormNotes('');
                  setFormInvite(false);
                  setFormFirstName('');
                  setFormLastName('');
                  setFormSelectedProducts([]);
                  setFormProductSearch('');
                  setFormActive(true);
                  setUserSearchResults([]);
                  setShowUserDropdown(false);
                  setIsExistingUser(false);
                  if (userSearchTimeout) {
                    clearTimeout(userSearchTimeout);
                    setUserSearchTimeout(null);
                  }
                }}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <form onSubmit={handleCreate}>
                <FormColumns>
                  {/* Left Column - User Info */}
                  <div>
                    <h3 style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 600, 
                      color: 'var(--text)', 
                      marginBottom: '1.5rem',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      User Information
                    </h3>

                    <FormGroup>
                      <Label>Email Address *</Label>
                      <div style={{ position: 'relative' }}>
                        <FaSearch style={{
                          position: 'absolute',
                          left: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-secondary)',
                          fontSize: '1rem',
                          zIndex: 1
                        }} />
                        <Input
                          type="email"
                          value={formEmail}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          onFocus={() => {
                            if (userSearchResults.length > 0) {
                              setShowUserDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            // Delay hiding dropdown to allow click events
                            setTimeout(() => setShowUserDropdown(false), 200);
                          }}
                          placeholder="Search existing users or enter new email..."
                          required
                          style={{ 
                            fontSize: '1rem', 
                            padding: '14px 16px 14px 44px',
                            width: '100%'
                          }}
                        />
                        {userSearchLoading && (
                          <div style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)'
                          }}>
                            <NNAudioLoadingSpinner size={16} />
                          </div>
                        )}
                        {showUserDropdown && userSearchResults.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '0.5rem',
                            background: 'var(--card-bg)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                            zIndex: 1000,
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}>
                            {userSearchResults.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => {
                                  setFormEmail(user.email);
                                  setShowUserDropdown(false);
                                  setUserSearchResults([]);
                                  setIsExistingUser(true); // User selected from dropdown, so they exist
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(108, 99, 255, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div style={{ 
                                  fontWeight: 600, 
                                  color: 'var(--text)',
                                  fontSize: '0.95rem'
                                }}>
                                  {user.email}
                                </div>
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: 'var(--text-secondary)',
                                  marginTop: '0.25rem'
                                }}>
                                  Existing user
                                </div>
                              </div>
                            ))}
                            <div
                              onClick={() => {
                                setShowUserDropdown(false);
                                setUserSearchResults([]);
                              }}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(108, 99, 255, 0.1)',
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                textAlign: 'center',
                                fontWeight: 500
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(108, 99, 255, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(108, 99, 255, 0.1)';
                              }}
                            >
                              Create new account: {formEmail || 'new email'}
                            </div>
                          </div>
                        )}
                      </div>
                      {formEmail && userSearchResults.length === 0 && !userSearchLoading && formEmail.length > 0 && (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          background: 'rgba(138, 43, 226, 0.1)',
                          border: '1px solid rgba(138, 43, 226, 0.3)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <FaPlus style={{ fontSize: '0.75rem' }} />
                          Will create new account for: {formEmail}
                        </div>
                      )}

                      {!isExistingUser && formEmail.trim().length > 0 && (
                        <FormGroup style={{ marginTop: '1rem' }}>
                          <CheckboxGroup>
                            <Checkbox
                              type="checkbox"
                              id="invite-checkbox"
                              checked={formInvite}
                              onChange={(e) => setFormInvite(e.target.checked)}
                            />
                            <CheckboxLabel htmlFor="invite-checkbox">
                              <FaEnvelope />
                              Send Supabase invite email
                            </CheckboxLabel>
                          </CheckboxGroup>
                        </FormGroup>
                      )}

                      {isExistingUser && formEmail.trim().length > 0 && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '0.75rem',
                          background: 'rgba(108, 99, 255, 0.1)',
                          border: '1px solid rgba(108, 99, 255, 0.3)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <FaCheck style={{ color: 'var(--primary)' }} />
                          User already exists in system
                        </div>
                      )}
                    </FormGroup>

                    {formInvite && (
                      <NameFields>
                        <FormGroup>
                          <Label>First Name</Label>
                          <Input
                            type="text"
                            value={formFirstName}
                            onChange={(e) => setFormFirstName(e.target.value)}
                            placeholder="John"
                            style={{ fontSize: '1rem', padding: '14px 16px' }}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>Last Name</Label>
                          <Input
                            type="text"
                            value={formLastName}
                            onChange={(e) => setFormLastName(e.target.value)}
                            placeholder="Doe"
                            style={{ fontSize: '1rem', padding: '14px 16px' }}
                          />
                        </FormGroup>
                      </NameFields>
                    )}

                    <FormGroup>
                      <Label>Notes</Label>
                      <Textarea
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Optional notes about this user..."
                        style={{ fontSize: '1rem', padding: '14px 16px', minHeight: '100px' }}
                      />
                    </FormGroup>
                  </div>

                  {/* Right Column - Product Grants */}
                  <div>
                    <h3 style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 600, 
                      color: 'var(--text)', 
                      marginBottom: '1.5rem',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaGift />
                      Grant Products
                    </h3>

                    <FormGroup>
                      <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <FaSearch style={{
                          position: 'absolute',
                          left: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-secondary)',
                          fontSize: '1rem',
                          zIndex: 1
                        }} />
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={formProductSearch}
                          onChange={(e) => setFormProductSearch(e.target.value)}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.boxShadow = '0 0 0 2px rgba(108, 99, 255, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.boxShadow = 'none';
                          }}
                          style={{
                            width: '100%',
                            padding: '14px 16px 14px 44px',
                            background: 'var(--input-bg)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: 'var(--text)',
                            fontSize: '1rem',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      </div>
                      <div style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '0.5rem'
                      }}>
                    {products
                      .filter(p => {
                        // Only show products that match the search query
                        if (!formProductSearch.trim()) return false;
                        const query = formProductSearch.toLowerCase();
                        return p.name.toLowerCase().includes(query) || 
                               (p.slug && p.slug.toLowerCase().includes(query));
                      })
                      .map((product) => {
                        const isSelected = formSelectedProducts.includes(product.id);
                        return (
                          <div
                            key={product.id}
                            onClick={() => {
                              if (isSelected) {
                                setFormSelectedProducts(prev => prev.filter(id => id !== product.id));
                              } else {
                                setFormSelectedProducts(prev => [...prev, product.id]);
                              }
                            }}
                            style={{
                              padding: '14px 16px',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              marginBottom: '0.5rem',
                              transition: 'all 0.2s ease',
                              background: isSelected 
                                ? 'rgba(108, 99, 255, 0.25)' 
                                : 'rgba(255, 255, 255, 0.03)',
                              border: isSelected 
                                ? '1px solid rgba(108, 99, 255, 0.5)' 
                                : '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '24px',
                                height: '24px',
                                border: '2px solid rgba(255, 255, 255, 0.4)',
                                borderRadius: '6px',
                                background: isSelected ? 'var(--primary)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {isSelected && <FaCheck style={{ fontSize: '0.875rem', color: 'white' }} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                                  {product.name}
                                </div>
                                {product.slug && (
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {product.slug}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {(!formProductSearch.trim() || products.filter(p => {
                      const query = formProductSearch.toLowerCase();
                      return p.name.toLowerCase().includes(query) || 
                             (p.slug && p.slug.toLowerCase().includes(query));
                    }).length === 0) && (
                      <div style={{ 
                        padding: '3rem 2rem', 
                        textAlign: 'center', 
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem'
                      }}>
                        {!formProductSearch.trim()
                          ? 'Start typing to search for products...'
                          : `No products found matching "${formProductSearch}"`}
                      </div>
                    )}
                      </div>
                      {formSelectedProducts.length > 0 && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.15), rgba(138, 43, 226, 0.15))',
                          border: '1px solid rgba(108, 99, 255, 0.3)',
                          borderRadius: '10px'
                        }}>
                          <div style={{ 
                            fontSize: '0.95rem', 
                            color: 'var(--text)', 
                            marginBottom: '0.75rem', 
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <FaGift />
                            {formSelectedProducts.length} product{formSelectedProducts.length !== 1 ? 's' : ''} will be granted
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {formSelectedProducts.map(productId => {
                              const product = products.find(p => p.id === productId);
                              return product ? (
                                <div
                                  key={productId}
                                  style={{
                                    padding: '6px 12px',
                                    background: 'rgba(108, 99, 255, 0.25)',
                                    border: '1px solid rgba(108, 99, 255, 0.4)',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 500
                                  }}
                                >
                                  <span>{product.name}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFormSelectedProducts(prev => prev.filter(id => id !== productId));
                                    }}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.1)',
                                      border: 'none',
                                      borderRadius: '4px',
                                      color: 'var(--text)',
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'rgba(255, 94, 98, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                  >
                                    <FaTimes style={{ fontSize: '0.75rem' }} />
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </FormGroup>
                  </div>
                </FormColumns>

                <ModalActions>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormEmail('');
                      setFormPro(true);
                      setFormNotes('');
                      setFormInvite(false);
                      setFormFirstName('');
                      setFormLastName('');
                      setFormSelectedProducts([]);
                      setFormProductSearch('');
                      setFormActive(true);
                      setUserSearchResults([]);
                      setShowUserDropdown(false);
                      setIsExistingUser(false);
                      if (userSearchTimeout) {
                        clearTimeout(userSearchTimeout);
                        setUserSearchTimeout(null);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={createLoading}>
                    {createLoading ? (
                      <>
                        <NNAudioLoadingSpinner size={20} />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        Create User
                      </>
                    )}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* Product Grants Modal */}
        {grantModalRecordId && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setGrantModalRecordId(null);
              setShowGrantForm(false);
              setGrantFormSelectedProductIds([]);
              setGrantFormNotes('');
              setGrantFormAmount('0');
              setProductSearchQuery('');
            }}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '1000px' }}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaGift />
                  Product Grants - {grantDisplayLabel}
                </ModalTitle>
                <CloseButton onClick={() => {
                  setGrantModalRecordId(null);
                  setShowGrantForm(false);
                  setGrantFormSelectedProductIds([]);
                  setGrantFormNotes('');
                  setGrantFormAmount('0');
                  setProductSearchQuery('');
                }}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              {!showGrantForm ? (
                <div>
                  <GrantListToolbar>
                    <GrantListCount>
                      {productGrants[grantMapKey]?.length || 0} product{(productGrants[grantMapKey]?.length || 0) !== 1 ? 's' : ''} granted
                    </GrantListCount>
                    <Button
                      variant="primary"
                      onClick={() => setShowGrantForm(true)}
                      disabled={!grantModalRecord?.user_email?.trim()}
                      style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
                    >
                      <FaPlus /> Grant Product
                    </Button>
                  </GrantListToolbar>

                  {(productGrants[grantMapKey]?.length ?? 0) > 0 ? (
                    <AdminResponsiveList
                      desktop={
                    <GrantListTableWrap>
                      <GrantListTable>
                        <GrantListHead>
                          <tr>
                            <GrantListTh>Product</GrantListTh>
                            <GrantListTh>Granted</GrantListTh>
                            <GrantListTh>Notes</GrantListTh>
                            <GrantListTh aria-label="Actions" />
                          </tr>
                        </GrantListHead>
                        <tbody>
                          {(productGrants[grantMapKey] ?? []).map((grant: ProductGrant) => (
                            <GrantListRow key={grant.id}>
                              <GrantListTd>
                                <GrantProductName>
                                  {grant.products?.name || 'Unknown Product'}
                                  {grant.products?.slug ? (
                                    <>
                                      {' '}
                                      <GrantProductSlug>({grant.products.slug})</GrantProductSlug>
                                    </>
                                  ) : null}
                                </GrantProductName>
                              </GrantListTd>
                              <GrantListTd>
                                <GrantDate>
                                  {new Date(grant.granted_at).toLocaleDateString()}
                                </GrantDate>
                              </GrantListTd>
                              <GrantListTd>
                                {grant.notes ? (
                                  <GrantNotes title={grant.notes}>{grant.notes}</GrantNotes>
                                ) : (
                                  <GrantNotes style={{ opacity: 0.45 }}>—</GrantNotes>
                                )}
                              </GrantListTd>
                              <GrantListTd>
                                <GrantRevokeButton
                                  type="button"
                                  title={`Revoke ${grant.products?.name || 'product'}`}
                                  onClick={async () => {
                                    if (!confirm(`Revoke "${grant.products?.name || 'this product'}" from ${grantDisplayLabel}?`)) return;
                                    try {
                                      const result = await revokeProductGrant(grant.id);
                                      if (result.success) {
                                        showNotification('success', 'Product grant revoked');
                                        const em = grantModalRecord?.user_email?.trim();
                                        if (em) void refreshGrantsForEmail(em);
                                        if ((productGrants[grantMapKey]?.length ?? 0) === 1) {
                                          setGrantModalRecordId(null);
                                        }
                                      } else {
                                        throw new Error(result.error || 'Failed to revoke');
                                      }
                                    } catch (err: unknown) {
                                      const message = err instanceof Error ? err.message : 'Failed to revoke grant';
                                      showNotification('error', message);
                                    }
                                  }}
                                >
                                  <FaTrash size={12} />
                                </GrantRevokeButton>
                              </GrantListTd>
                            </GrantListRow>
                          ))}
                        </tbody>
                      </GrantListTable>
                    </GrantListTableWrap>
                      }
                      mobile={
                        <AdminMobileCardList>
                          {(productGrants[grantMapKey] ?? []).map((grant: ProductGrant) => (
                            <AdminDataCard key={grant.id}>
                              <AdminDataCardHeader
                                title={grant.products?.name || "Unknown Product"}
                                subtitle={grant.products?.slug || undefined}
                              />
                              <AdminDataCardRow
                                label="Granted"
                                value={new Date(grant.granted_at).toLocaleDateString()}
                              />
                              <AdminDataCardRow label="Notes" value={grant.notes || "—"} />
                              <AdminDataCardActions>
                                <GrantRevokeButton
                                  type="button"
                                  title={`Revoke ${grant.products?.name || "product"}`}
                                  onClick={async () => {
                                    if (!confirm(`Revoke "${grant.products?.name || "this product"}" from ${grantDisplayLabel}?`)) return;
                                    try {
                                      const result = await revokeProductGrant(grant.id);
                                      if (result.success) {
                                        showNotification("success", "Product grant revoked");
                                        const em = grantModalRecord?.user_email?.trim();
                                        if (em) void refreshGrantsForEmail(em);
                                        if ((productGrants[grantMapKey]?.length ?? 0) === 1) {
                                          setGrantModalRecordId(null);
                                        }
                                      } else {
                                        throw new Error(result.error || "Failed to revoke");
                                      }
                                    } catch (err: unknown) {
                                      const message = err instanceof Error ? err.message : "Failed to revoke grant";
                                      showNotification("error", message);
                                    }
                                  }}
                                >
                                  <FaTrash size={12} />
                                </GrantRevokeButton>
                              </AdminDataCardActions>
                            </AdminDataCard>
                          ))}
                        </AdminMobileCardList>
                      }
                    />
                  ) : (
                    <GrantEmptyState>
                      <FaGift />
                      <div>No products granted</div>
                    </GrantEmptyState>
                  )}
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (grantFormSelectedProductIds.length === 0) {
                    showNotification('error', 'Please select at least one product');
                    return;
                  }
                  const grantEmail = grantModalRecord?.user_email?.trim();
                  if (!grantEmail) {
                    showNotification('error', 'This NFR record needs an email before granting products.');
                    return;
                  }
                  const notes = grantFormNotes.trim() || null;
                  const amount = parseFloat(grantFormAmount) || 0;
                  try {
                    setGrantLoading(true);
                    const grantResults: Array<{
                      success: boolean;
                      productId: string;
                      error?: string;
                    }> = [];

                    for (const productId of grantFormSelectedProductIds) {
                      try {
                        const result = await grantProduct(
                          grantEmail,
                          productId,
                          notes,
                          amount
                        );
                        if (result.error) {
                          grantResults.push({
                            success: false,
                            productId,
                            error: result.error,
                          });
                        } else {
                          grantResults.push({ success: true, productId });
                        }
                      } catch (err: unknown) {
                        const message =
                          err instanceof Error ? err.message : "Network error";
                        grantResults.push({
                          success: false,
                          productId,
                          error: message,
                        });
                      }
                    }

                    const successCount = grantResults.filter((r) => r.success).length;
                    const failCount = grantResults.filter((r) => !r.success).length;

                    if (successCount > 0) {
                      showNotification(
                        "success",
                        `Granted ${successCount} product${successCount !== 1 ? "s" : ""}`
                      );
                    }
                    if (failCount > 0) {
                      const errors = grantResults
                        .filter((r) => !r.success)
                        .map((r) => r.error)
                        .join(", ");
                      showNotification(
                        "error",
                        `Failed to grant ${failCount} product${failCount !== 1 ? "s" : ""}: ${errors}`
                      );
                    }

                    if (successCount > 0) {
                      setShowGrantForm(false);
                      setGrantFormSelectedProductIds([]);
                      setGrantFormNotes("");
                      setGrantFormAmount("0");
                      setProductSearchQuery("");
                      void refreshGrantsForEmail(grantEmail);
                    }
                  } catch (err: unknown) {
                    console.error("[Grant Product] Exception:", err);
                    const message =
                      err instanceof Error ? err.message : "Failed to grant products";
                    showNotification("error", message);
                  } finally {
                    setGrantLoading(false);
                  }
                }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: 500 }}>
                      <FaBox style={{ marginRight: '8px' }} />
                      Products *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <FaSearch style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)',
                        fontSize: '1rem',
                        zIndex: 1
                      }} />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 2px rgba(108, 99, 255, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.boxShadow = 'none';
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px 12px 44px',
                          background: 'var(--input-bg)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: '1rem',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>
                    <div style={{
                      marginTop: '0.5rem',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '0.5rem'
                    }}>
                      {products
                        .filter(p => {
                          // Filter out already granted products
                          if (productGrants[grantMapKey]?.some((g: any) => g.product_id === p.id)) {
                            return false;
                          }
                          // Only show products that match the search query
                          if (!productSearchQuery.trim()) return false;
                          const query = productSearchQuery.toLowerCase();
                          return p.name.toLowerCase().includes(query) || 
                                 (p.slug && p.slug.toLowerCase().includes(query));
                        })
                        .map((product) => {
                          const isSelected = grantFormSelectedProductIds.includes(product.id);
                          return (
                          <div
                            key={product.id}
                            onClick={() => {
                              if (isSelected) {
                                setGrantFormSelectedProductIds((prev) => {
                                  const next = prev.filter((id) => id !== product.id);
                                  if (next.length === 0) {
                                    setGrantFormAmount("0");
                                  }
                                  return next;
                                });
                              } else {
                                setGrantFormSelectedProductIds((prev) => {
                                  if (prev.length === 0) {
                                    const price =
                                      product.sale_price != null && product.sale_price > 0
                                        ? product.sale_price
                                        : product.price ?? 0;
                                    setGrantFormAmount(String(price));
                                  }
                                  return [...prev, product.id];
                                });
                              }
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              marginBottom: '0.5rem',
                              transition: 'all 0.2s ease',
                              background: isSelected
                                ? 'rgba(108, 99, 255, 0.25)'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: isSelected
                                ? '1px solid rgba(108, 99, 255, 0.5)'
                                : '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '22px',
                                height: '22px',
                                border: '2px solid rgba(255, 255, 255, 0.4)',
                                borderRadius: '6px',
                                background: isSelected ? 'var(--primary)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {isSelected && <FaCheck style={{ fontSize: '0.75rem', color: 'white' }} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
                                  {product.name}
                                </div>
                                {product.slug && (
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {product.slug}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      {(!productSearchQuery.trim() || products.filter(p => {
                        if (productGrants[grantMapKey]?.some((g: any) => g.product_id === p.id)) {
                          return false;
                        }
                        const query = productSearchQuery.toLowerCase();
                        return p.name.toLowerCase().includes(query) || 
                               (p.slug && p.slug.toLowerCase().includes(query));
                      }).length === 0) && (
                        <div style={{ 
                          padding: '2rem', 
                          textAlign: 'center', 
                          color: 'var(--text-secondary)',
                          fontSize: '0.9rem'
                        }}>
                          {!productSearchQuery.trim()
                            ? 'Start typing to search for products...'
                            : `No products found matching "${productSearchQuery}"`}
                        </div>
                      )}
                    </div>
                    {grantFormSelectedProductIds.length > 0 && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.15), rgba(138, 43, 226, 0.15))',
                        border: '1px solid rgba(108, 99, 255, 0.3)',
                        borderRadius: '10px'
                      }}>
                        <div style={{
                          fontSize: '0.95rem',
                          color: 'var(--text)',
                          marginBottom: '0.75rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <FaGift />
                          {grantFormSelectedProductIds.length} product{grantFormSelectedProductIds.length !== 1 ? 's' : ''} selected
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {grantFormSelectedProductIds.map((productId) => {
                            const product = products.find((p) => p.id === productId);
                            return product ? (
                              <div
                                key={productId}
                                style={{
                                  padding: '6px 12px',
                                  background: 'rgba(108, 99, 255, 0.25)',
                                  border: '1px solid rgba(108, 99, 255, 0.4)',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  fontWeight: 500
                                }}
                              >
                                <span>{product.name}</span>
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setGrantFormSelectedProductIds((prev) => {
                                      const next = prev.filter((id) => id !== productId);
                                      if (next.length === 0) {
                                        setGrantFormAmount('0');
                                      }
                                      return next;
                                    });
                                  }}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'var(--text)',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(ev) => {
                                    ev.currentTarget.style.background = 'rgba(255, 94, 98, 0.3)';
                                  }}
                                  onMouseLeave={(ev) => {
                                    ev.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                  }}
                                >
                                  <FaTimes style={{ fontSize: '0.75rem' }} />
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: 500 }}>
                      Recorded Amount ($) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={grantFormAmount}
                      onChange={(e) => setGrantFormAmount(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--input-bg)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '1rem'
                      }}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Transaction amount for historical record (no Stripe charge)
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: 500 }}>
                      Notes (Optional)
                    </label>
                    <textarea
                      value={grantFormNotes}
                      onChange={(e) => setGrantFormNotes(e.target.value)}
                      placeholder="e.g., Influencer NFR, Support account, etc."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--input-bg)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '1rem',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <ModalActions>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowGrantForm(false);
                        setGrantFormSelectedProductIds([]);
                        setGrantFormNotes('');
                        setGrantFormAmount('0');
                        setProductSearchQuery('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={grantLoading || grantFormSelectedProductIds.length === 0}>
                      {grantLoading ? (
                        <>
                          <NNAudioLoadingSpinner size={16} />
                          Granting...
                        </>
                      ) : (
                        <>
                          <FaGift /> Grant
                          {grantFormSelectedProductIds.length > 0
                            ? ` ${grantFormSelectedProductIds.length} product${grantFormSelectedProductIds.length !== 1 ? "s" : ""}`
                            : " products"}
                        </>
                      )}
                    </Button>
                  </ModalActions>
                </form>
              )}
            </ModalContent>
          </ModalOverlay>
        )}

        {/* Notification */}
        {notification && (
          <Notification
            type={notification.type}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            onClick={() => setNotification(null)}
          >
            {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
            {notification.message}
          </Notification>
        )}
      </motion.div>
    </Container>
  );
}

