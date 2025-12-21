"use client";
import React, { useEffect, useState, useMemo } from "react";
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
import {
  getUserManagementRecords,
  createUserManagementRecord,
  updateUserManagementRecord,
  createUserManagementWithInvite,
  deleteUserManagementRecord,
  type UserManagementRecord,
} from "@/app/actions/user-management";
import {
  getProductGrants,
  getUserProductGrants,
  grantProduct,
  revokeProductGrant,
  type ProductGrant,
} from "@/app/actions/product-grants";


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

export default function UserManagementPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<UserManagementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);
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
  const [showGrantModal, setShowGrantModal] = useState<string | null>(null);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantFormProductId, setGrantFormProductId] = useState('');
  const [grantFormNotes, setGrantFormNotes] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');

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
      data.forEach(record => {
        original[record.user_email] = record.notes || '';
      });
      setOriginalNotes(original);
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

  const fetchProductGrants = async () => {
    try {
      const result = await getProductGrants();

      if (result.error) {
        console.error("Error fetching product grants:", result.error);
        return;
      }

      if (result.data) {
        // Group grants by user email
        const grouped: Record<string, ProductGrant[]> = {};
        result.data.forEach((grant) => {
          if (!grouped[grant.user_email]) {
            grouped[grant.user_email] = [];
          }
          grouped[grant.user_email].push(grant);
        });
        setProductGrants(grouped);
      }
    } catch (err) {
      console.error("Error fetching product grants:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=10000");
      const data = await response.json();

      if (data.success && data.products) {
        setProducts(data.products.filter((p: any) => p.status === "active"));
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
      fetchProductGrants();
      fetchProducts();
    }
  }, [user]);

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
        
        fetchProductGrants();
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

  const handleUpdatePro = async (email: string, newPro: boolean) => {
    try {
      setUpdatingEmail(email);
      const result = await updateUserManagementRecord(email, { pro: newPro });

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state
      setRecords(prev =>
        prev.map(record =>
          record.user_email === email ? { ...record, pro: newPro } : record
        )
      );
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update pro status');
      console.error('Update pro error:', err);
      // Revert local state on error
      fetchRecords();
    } finally {
      setUpdatingEmail(null);
    }
  };

  const handleUpdateNotes = async (email: string, newNotes: string) => {
    try {
      setUpdatingEmail(email);
      const result = await updateUserManagementRecord(email, {
        notes: newNotes || null,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state
      setRecords(prev =>
        prev.map(record =>
          record.user_email === email ? { ...record, notes: newNotes || null } : record
        )
      );
      
      // Update original notes to reflect the saved value
      setOriginalNotes(prev => ({
        ...prev,
        [email]: newNotes || '',
      }));
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update notes');
      console.error('Update notes error:', err);
      // Revert local state on error
      fetchRecords();
    } finally {
      setUpdatingEmail(null);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Are you sure you want to delete the user management record for ${email}?`)) {
      return;
    }

    try {
      setUpdatingEmail(email);
      const result = await deleteUserManagementRecord(email);

      if (result.error) {
        throw new Error(result.error);
      }

      // Remove from local state
      setRecords(prev => prev.filter(record => record.user_email !== email));
      
      // Remove from original notes
      setOriginalNotes(prev => {
        const next = { ...prev };
        delete next[email];
        return next;
      });

      showNotification('success', 'User management record deleted successfully');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete record');
      console.error('Delete error:', err);
    } finally {
      setUpdatingEmail(null);
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  // Compute filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const emailMatch = record.user_email.toLowerCase().includes(query);
      const notesMatch = (record.notes || '').toLowerCase().includes(query);
      const productGrantsList = productGrants[record.user_email] || [];
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
                      <React.Fragment key={record.user_email}>
                        <TableRow>
                          <EmailCell>
                            <span>{record.user_email}</span>
                          </EmailCell>
                          <TableCell>
                            {updatingEmail === record.user_email ? (
                              <NNAudioLoadingSpinner size={20} />
                            ) : (
                              <ToggleSwitch $checked={record.active !== false}>
                                <input
                                  type="checkbox"
                                  checked={record.active !== false}
                                  onChange={(e) => handleUpdateActive(record.user_email, e.target.checked)}
                                />
                                <span className="slider" />
                              </ToggleSwitch>
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                            onClick={() => {
                              setShowGrantModal(record.user_email);
                              setShowGrantForm(false);
                            }}
                            style={{
                              padding: '8px 16px',
                              background: (productGrants[record.user_email]?.length || 0) > 0 
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
                            {productGrants[record.user_email]?.length || 0} Product{productGrants[record.user_email]?.length !== 1 ? 's' : ''}
                          </button>
                        </TableCell>
                        <TableCell>
                          {updatingEmail === record.user_email ? (
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
                                      prev.map(r =>
                                        r.user_email === record.user_email
                                          ? { ...r, notes: newValue }
                                          : r
                                      )
                                    );
                                  }}
                                />
                                <SaveButton
                                  onClick={() => handleUpdateNotes(record.user_email, record.notes || '')}
                                  disabled={
                                    updatingEmail === record.user_email ||
                                    (record.notes || '') === (originalNotes[record.user_email] || '')
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
                              onClick={() => handleDelete(record.user_email)}
                              disabled={updatingEmail === record.user_email}
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
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '2rem',
                  marginBottom: '2rem'
                }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                      </div>
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
                </div>

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
        {showGrantModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowGrantModal(null);
              setShowGrantForm(false);
              setGrantFormProductId('');
              setGrantFormNotes('');
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
                  Product Grants - {showGrantModal}
                </ModalTitle>
                <CloseButton onClick={() => {
                  setShowGrantModal(null);
                  setShowGrantForm(false);
                  setGrantFormProductId('');
                  setGrantFormNotes('');
                  setProductSearchQuery('');
                }}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              {!showGrantForm ? (
                <div>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {productGrants[showGrantModal]?.length || 0} product{(productGrants[showGrantModal]?.length || 0) !== 1 ? 's' : ''} granted
                    </div>
                    <Button
                      $variant="primary"
                      onClick={() => setShowGrantForm(true)}
                      style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      <FaPlus /> Grant New Product
                    </Button>
                  </div>

                  {productGrants[showGrantModal]?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                      {productGrants[showGrantModal].map((grant: any) => (
                        <div
                          key={grant.id}
                          style={{
                            padding: '1.25rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }}
                        >
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', fontSize: '1rem' }}>
                              {grant.products?.name || 'Unknown Product'}
                            </div>
                            {grant.products?.slug && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                {grant.products.slug}
                              </div>
                            )}
                            {grant.notes && (
                              <div style={{ 
                                fontSize: '0.85rem', 
                                color: 'var(--text-secondary)', 
                                fontStyle: 'italic',
                                padding: '0.5rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '6px',
                                marginTop: '0.5rem'
                              }}>
                                {grant.notes}
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                              Granted: {new Date(grant.granted_at).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!confirm(`Revoke "${grant.products?.name || 'this product'}" from ${showGrantModal}?`)) return;
                              try {
                                const result = await revokeProductGrant(grant.id);
                                if (result.success) {
                                  showNotification('success', 'Product grant revoked');
                                  fetchProductGrants();
                                  if (productGrants[showGrantModal]?.length === 1) {
                                    setShowGrantModal(null);
                                  }
                                } else {
                                  throw new Error(result.error || 'Failed to revoke');
                                }
                              } catch (err: any) {
                                showNotification('error', err.message || 'Failed to revoke grant');
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              background: 'rgba(255, 94, 98, 0.15)',
                              border: '1px solid rgba(255, 94, 98, 0.3)',
                              borderRadius: '8px',
                              color: '#ff5e62',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              fontWeight: 600,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 94, 98, 0.25)';
                              e.currentTarget.style.borderColor = 'rgba(255, 94, 98, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 94, 98, 0.15)';
                              e.currentTarget.style.borderColor = 'rgba(255, 94, 98, 0.3)';
                            }}
                          >
                            <FaTrash /> Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '3rem',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px'
                    }}>
                      <FaGift style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
                      <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No products granted</div>
                      <div style={{ fontSize: '0.9rem' }}>Click "Grant New Product" to add one</div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!grantFormProductId) {
                    showNotification('error', 'Please select a product');
                    return;
                  }
                  try {
                    setGrantLoading(true);
                    const result = await grantProduct(
                      showGrantModal,
                      grantFormProductId,
                      grantFormNotes.trim() || null
                    );
                    
                    if (result.error) {
                      throw new Error(result.error);
                    }
                    
                    showNotification('success', 'Product granted successfully');
                    setShowGrantForm(false);
                    setGrantFormProductId('');
                    setGrantFormNotes('');
                    setProductSearchQuery('');
                    fetchProductGrants();
                  } catch (err: any) {
                    console.error("[Grant Product] Exception:", err);
                    showNotification('error', err.message || 'Failed to grant product');
                  } finally {
                    setGrantLoading(false);
                  }
                }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: 500 }}>
                      <FaBox style={{ marginRight: '8px' }} />
                      Product *
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
                      background: 'rgba(0, 0, 0, 0.2)'
                    }}>
                      {products
                        .filter(p => {
                          // Filter out already granted products
                          if (productGrants[showGrantModal]?.some((g: any) => g.product_id === p.id)) {
                            return false;
                          }
                          // Only show products that match the search query
                          if (!productSearchQuery.trim()) return false;
                          const query = productSearchQuery.toLowerCase();
                          return p.name.toLowerCase().includes(query) || 
                                 (p.slug && p.slug.toLowerCase().includes(query));
                        })
                        .map((product) => (
                          <div
                            key={product.id}
                            onClick={() => {
                              setGrantFormProductId(product.id);
                              setProductSearchQuery(product.name);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              transition: 'all 0.2s ease',
                              background: grantFormProductId === product.id 
                                ? 'rgba(108, 99, 255, 0.2)' 
                                : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (grantFormProductId !== product.id) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (grantFormProductId !== product.id) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
                              {product.name}
                            </div>
                            {product.slug && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {product.slug}
                              </div>
                            )}
                            {grantFormProductId === product.id && (
                              <div style={{ 
                                marginTop: '0.5rem', 
                                fontSize: '0.8rem', 
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <FaCheck /> Selected
                              </div>
                            )}
                          </div>
                        ))}
                      {(!productSearchQuery.trim() || products.filter(p => {
                        if (productGrants[showGrantModal]?.some((g: any) => g.product_id === p.id)) {
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
                    {grantFormProductId && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: 'rgba(108, 99, 255, 0.1)',
                        border: '1px solid rgba(108, 99, 255, 0.3)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>
                            Selected: {products.find(p => p.id === grantFormProductId)?.name || 'Unknown'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGrantFormProductId('');
                            setProductSearchQuery('');
                          }}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    )}
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
                      $variant="secondary"
                      onClick={() => {
                        setShowGrantForm(false);
                        setGrantFormProductId('');
                        setGrantFormNotes('');
                        setProductSearchQuery('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" $variant="primary" disabled={grantLoading || !grantFormProductId}>
                      {grantLoading ? (
                        <>
                          <NNAudioLoadingSpinner size={16} />
                          Granting...
                        </>
                      ) : (
                        <>
                          <FaGift /> Grant Product
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

