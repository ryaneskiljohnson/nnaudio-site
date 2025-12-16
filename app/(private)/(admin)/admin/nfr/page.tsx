"use client";
import React, { useEffect, useState } from "react";
import NextSEO from "@/components/NextSEO";
import {
  FaUsers,
  FaPlus,
  FaCheck,
  FaTimes,
  FaEnvelope,
  FaCrown,
  FaTrash,
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

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formPro, setFormPro] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formInvite, setFormInvite] = useState(false);
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');

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

  useEffect(() => {
    if (user) {
      fetchRecords();
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
          formLastName.trim() || null
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
          formNotes.trim() || null
        );

        if (result.error) {
          throw new Error(result.error);
        }

        showNotification('success', 'User created successfully');
      }

      setShowCreateModal(false);
      setFormEmail('');
      setFormPro(true);
      setFormNotes('');
      setFormInvite(false);
      setFormFirstName('');
      setFormLastName('');
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
                    <TableHeaderCell>Pro Status</TableHeaderCell>
                    <TableHeaderCell>Notes</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'center', width: '60px' }}>Actions</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <tr>
                      <TableCell colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>
                        <NNAudioLoadingSpinner size={40} />
                      </TableCell>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <TableCell colSpan={4}>
                        <EmptyState>No users found. Click "Add User" to create one.</EmptyState>
                      </TableCell>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.user_email}>
                        <EmailCell>
                          <span>{record.user_email}</span>
                        </EmailCell>
                        <TableCell>
                          {updatingEmail === record.user_email ? (
                            <NNAudioLoadingSpinner size={20} />
                          ) : (
                            <ToggleSwitch $checked={record.pro}>
                              <input
                                type="checkbox"
                                checked={record.pro}
                                onChange={(e) => handleUpdatePro(record.user_email, e.target.checked)}
                              />
                              <span className="slider" />
                            </ToggleSwitch>
                          )}
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
                }}>
                  <FaTimes />
                </CloseButton>
              </ModalHeader>

              <form onSubmit={handleCreate}>
                <FormGroup>
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

                <FormGroup>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </FormGroup>

                {formInvite && (
                  <>
                    <FormGroup>
                      <Label>First Name</Label>
                      <Input
                        type="text"
                        value={formFirstName}
                        onChange={(e) => setFormFirstName(e.target.value)}
                        placeholder="John"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Last Name</Label>
                      <Input
                        type="text"
                        value={formLastName}
                        onChange={(e) => setFormLastName(e.target.value)}
                        placeholder="Doe"
                      />
                    </FormGroup>
                  </>
                )}

                <FormGroup>
                  <Label>Pro Status</Label>
                  <CheckboxGroup>
                    <ToggleSwitch $checked={formPro}>
                      <input
                        type="checkbox"
                        checked={formPro}
                        onChange={(e) => setFormPro(e.target.checked)}
                      />
                      <span className="slider" />
                    </ToggleSwitch>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {formPro ? 'Pro enabled' : 'Pro disabled'}
                    </span>
                  </CheckboxGroup>
                </FormGroup>

                <FormGroup>
                  <Label>Notes</Label>
                  <Textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Optional notes about this user..."
                  />
                </FormGroup>

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

