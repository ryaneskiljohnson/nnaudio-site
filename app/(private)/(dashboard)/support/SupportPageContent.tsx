"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import {
  FaTicketAlt,
  FaSearch,
  FaPlus,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaPaperPlane,
  FaPaperclip,
  FaImage,
  FaVideo,
  FaFile,
  FaUser,
  FaUserTie,
  FaEye,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import {
  createSupportTicket,
  getUserSupportTickets,
  getUserSupportTicket,
  addSupportTicketMessage,
  uploadSupportTicketAttachment,
} from "@/app/actions/user-management";

import TableLoadingRow from "@/components/common/TableLoadingRow";
import * as SupportComponents from "@/components/support/SupportTicketsComponents";

// Use shared components
import styled from "styled-components";

const {
  TicketsContainer,
  TicketsTitle,
  TicketsSubtitle,
  FiltersSection,
  SearchContainer,
  SearchInput,
  SearchIcon,
  FilterSelect,
  ActionButton,
  TableContainer,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TicketId,
  TicketSubject,
  StatusBadge,
  ConversationContainer,
  ConversationHeader,
  ConversationTitle,
  ConversationMeta,
  MessagesContainer,
  Message,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  MessageTime,
  AttachmentContainer,
  AttachmentIcon,
  AttachmentInfo,
  AttachmentName,
  AttachmentSize,
  AttachmentLink,
  MessageAttachment,
  ImagePreview,
  VideoPreview,
  MessageInput,
  MessageTextArea,
  MessageActions,
  AttachButton,
  SendButton,
  FileInput,
  Pagination,
  PaginationInfo,
  PaginationButtons,
  PaginationButton,
  PaginationEllipsis,
  ModalOverlay,
  CreateTicketModal,
  ModalHeader,
  ModalTitle,
  CloseButton,
  FormGroup,
  FormLabel,
  FormInput,
  FormTextarea,
  FormActions,
  CancelButton,
  SubmitButton,
  ErrorMessage,
  SuccessMessage,
} = SupportComponents;

// Customer page specific: FiltersRow with 3 columns (search, filter, create button)
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

const CreateButtonWrapper = styled.div`
  @media (max-width: 768px) {
    width: 100%;

    button {
      width: 100%;
      justify-content: center;
    }
  }
`;

const FilterSelectWrapper = styled.div`
  @media (max-width: 768px) {
    display: none;
  }
`;

// Wider columns for subject
const SubjectTableCell = styled(TableCell)`
  min-width: 250px;
  max-width: 400px;
`;

const SubjectHeaderCell = styled(TableHeaderCell)`
  min-width: 250px;
  max-width: 400px;
`;

const SecurityWarning = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 6px;
  font-size: 0.75rem;
  color: rgba(255, 193, 7, 0.9);
  line-height: 1.4;
  width: 100%;

  svg {
    flex-shrink: 0;
  }

  span {
    flex: 1;
  }

  @media (max-width: 768px) {
    padding: 0.5rem;
    font-size: 0.7rem;
    line-height: 1.3;

    svg {
      font-size: 0.7rem;
      margin-right: 0.5rem;
    }
  }
`;

const JumpToCurrentButton = styled.button<{ $visible: boolean }>`
  display: ${(props) => (props.$visible ? "flex" : "none")};
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
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 100;
  pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
  opacity: ${(props) => (props.$visible ? 1 : 0)};

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

// Mobile card layout
const TicketsCardContainer = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
`;

const TicketCard = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.98);
    background-color: rgba(255, 255, 255, 0.02);
  }
`;

const CardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CardLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
`;

const CardValue = styled.div`
  font-size: 0.9rem;
  color: var(--text);
  word-break: break-word;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const CardTitle = styled.div`
  flex: 1;
`;

const CardSubject = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
  word-break: break-word;
`;

const CardId = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ConversationHeaderGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 1rem;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;

    > div:nth-child(3),
    > div:nth-child(4) {
      grid-column: span 1;
    }
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
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
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  messages?: TicketMessage[];
}

function SupportPage() {
  const { user, refreshUser } = useAuth();
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Refresh pro status on mount (same as login)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]); // Run on mount and when refreshUser changes
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState<Map<string, boolean>>(
    new Map()
  );
  const messagesContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle scroll to detect if user is scrolled up
  const handleScroll = useCallback(
    (ticketId: string, element: HTMLDivElement) => {
      if (!element || !ticketId) return;
      const threshold = 50; // Show button if more than 50px from bottom
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      // Only show button if container is actually scrollable
      if (scrollHeight <= clientHeight) {
        setIsScrolledUp((prev) => {
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

      setIsScrolledUp((prev) => {
        const currentValue = prev.get(ticketId);
        if (currentValue === shouldShow) return prev; // No change needed
        const newMap = new Map(prev);
        newMap.set(ticketId, shouldShow);
        return newMap;
      });
    },
    []
  );

  // Scroll to bottom of messages
  const scrollToBottom = useCallback((ticketId: string) => {
    const container = messagesContainerRefs.current.get(ticketId);
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // Set ref callback for messages container
  const setMessagesContainerRef = useCallback(
    (ticketId: string, element: HTMLDivElement | null) => {
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
          previousElement.removeEventListener("scroll", oldHandler);
        }
      }

      if (element && ticketId) {
        messagesContainerRefs.current.set(ticketId, element);
        // Add scroll listener
        const scrollHandler = () => {
          if (
            ticketId &&
            element &&
            messagesContainerRefs.current.get(ticketId) === element
          ) {
            handleScroll(ticketId, element);
          }
        };
        element.addEventListener("scroll", scrollHandler, { passive: true });

        // Store handler for cleanup
        (element as any)._scrollHandler = scrollHandler;

        // Check initial scroll position after a short delay to ensure content is rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (
              ticketId &&
              element &&
              messagesContainerRefs.current.get(ticketId) === element
            ) {
              handleScroll(ticketId, element);
            }
          }, 100);
        });
      } else if (element === null && previousElement) {
        // Only clean up if we had a previous element and now it's null (unmounting)
        messagesContainerRefs.current.delete(ticketId);
        // Don't delete the scroll state - preserve it in case the element is recreated
      }
    },
    [handleScroll]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      messagesContainerRefs.current.forEach((element, ticketId) => {
        if ((element as any)._scrollHandler) {
          element.removeEventListener(
            "scroll",
            (element as any)._scrollHandler
          );
        }
      });
      messagesContainerRefs.current.clear();
    };
  }, []);

  const [newMessages, setNewMessages] = useState<{ [key: string]: string }>({});
  const [uploadingFiles, setUploadingFiles] = useState<{
    [key: string]: boolean;
  }>({});
  const [pendingAttachments, setPendingAttachments] = useState<{
    [key: string]: File[];
  }>({});
  const [showSecurityWarning, setShowSecurityWarning] = useState<{
    [key: string]: boolean;
  }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTicketForm, setCreateTicketForm] = useState({
    subject: "",
    description: "",
  });
  const [createTicketLoading, setCreateTicketLoading] = useState(false);
  const [createTicketError, setCreateTicketError] = useState<string | null>(
    null
  );
  const [createTicketSuccess, setCreateTicketSuccess] = useState<string | null>(
    null
  );
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketDetails, setTicketDetails] = useState<Map<string, Ticket>>(
    new Map()
  );
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const searchParams = useSearchParams();

  // Check scroll position when ticket details change
  useEffect(() => {
    ticketDetails.forEach((ticket, ticketId) => {
      if (ticket.messages && ticket.messages.length > 0) {
        setTimeout(() => {
          const container = messagesContainerRefs.current.get(ticketId);
          if (container) {
            handleScroll(ticketId, container);
          }
        }, 300);
      }
    });
  }, [ticketDetails, handleScroll]);

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

  // Auto-expand ticket if ticket query parameter is present
  useEffect(() => {
    if (showContent && tickets.length > 0) {
      const ticketIdFromUrl = searchParams.get("ticket");
      if (ticketIdFromUrl && selectedTicketId !== ticketIdFromUrl) {
        // Find the ticket in the list
        const ticket = tickets.find((t) => t.id === ticketIdFromUrl);
        if (ticket) {
          // Open the ticket modal
          openTicketModal(ticketIdFromUrl);
          // Fetch ticket details if not already loaded
          if (!ticketDetails.has(ticketIdFromUrl)) {
            fetchTicketDetails(ticketIdFromUrl, true);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContent, tickets, searchParams]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const result = await getUserSupportTickets();
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

  const fetchTicketDetails = async (
    ticketId: string,
    forceRefresh: boolean = false
  ) => {
    // If already loading and not forcing refresh, skip
    if (!forceRefresh && loadingDetails.has(ticketId)) {
      return;
    }

    // If already loaded and not forcing refresh, skip
    if (!forceRefresh && ticketDetails.has(ticketId)) {
      return;
    }

    setLoadingDetails((prev) => new Set(prev).add(ticketId));

    try {
      const result = await getUserSupportTicket(ticketId);
      if (result.ticket) {
        setTicketDetails((prev) => new Map(prev).set(ticketId, result.ticket!));

        // Check scroll position after messages are loaded
        setTimeout(() => {
          const container = messagesContainerRefs.current.get(ticketId);
          if (container) {
            handleScroll(ticketId, container);
          }
        }, 200);
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
    } finally {
      setLoadingDetails((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }
  };

  // Fetch ticket details when a row is expanded
  useEffect(() => {
    // Fetch ticket details if a ticket is selected
    if (
      selectedTicketId &&
      !ticketDetails.has(selectedTicketId) &&
      !loadingDetails.has(selectedTicketId)
    ) {
      fetchTicketDetails(selectedTicketId, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId]);

  // Re-evaluate scroll position when ticket details change
  useEffect(() => {
    if (selectedTicketId) {
      const container = messagesContainerRefs.current.get(selectedTicketId);
      if (container) {
        // Use requestAnimationFrame to avoid rapid updates
        requestAnimationFrame(() => {
          setTimeout(() => {
            handleScroll(selectedTicketId, container);
          }, 100);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketDetails, selectedTicketId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateTicketError(null);
    setCreateTicketSuccess(null);

    if (
      !createTicketForm.subject.trim() ||
      !createTicketForm.description.trim()
    ) {
      setCreateTicketError("Please fill in all required fields");
      return;
    }

    setCreateTicketLoading(true);

    try {
      const result = await createSupportTicket({
        subject: createTicketForm.subject.trim(),
        description: createTicketForm.description.trim(),
      });

      if (result.success && result.ticket) {
        setCreateTicketSuccess(
          `Ticket ${result.ticket.ticket_number} created successfully!`
        );
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <FaCheckCircle />;
      case "inProgress":
      case "in_progress":
        return <FaClock />;
      case "resolved":
        return <FaCheckCircle />;
      case "closed":
        return <FaTimes />;
      default:
        return <FaClock />;
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());

    // Normalize status for comparison
    const normalizedStatus = ticket.status;
    let normalizedFilter = filterStatus;

    // Map UI filter values to database values
    if (normalizedFilter === "inProgress") {
      normalizedFilter = "in_progress";
    }

    const matchesFilter =
      normalizedFilter === "all" || normalizedStatus === normalizedFilter;

    return matchesSearch && matchesFilter;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (!sortField) return 0;

    let aValue = a[sortField as keyof typeof a];
    let bValue = b[sortField as keyof typeof b];

    if (aValue == null || bValue == null) return 0;
    if (typeof aValue === "string") aValue = aValue.toLowerCase();
    if (typeof bValue === "string") bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // When a ticket is expanded, show only that ticket at the top
  const ticketsToDisplay = sortedTickets;

  const totalPages = Math.ceil(ticketsToDisplay.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTickets = ticketsToDisplay.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const openTicketModal = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    // Load ticket details if not already loaded
    if (!ticketDetails.has(ticketId)) {
      fetchTicketDetails(ticketId, false);
    }
  };

  const closeTicketModal = () => {
    // Clean up refs and scroll state when closing modal
    if (selectedTicketId) {
      const container = messagesContainerRefs.current.get(selectedTicketId);
      if (container) {
        const oldHandler = (container as any)._scrollHandler;
        if (oldHandler) {
          container.removeEventListener("scroll", oldHandler);
        }
      }
      messagesContainerRefs.current.delete(selectedTicketId);
      setIsScrolledUp((prev) => {
        const newMap = new Map(prev);
        newMap.delete(selectedTicketId);
        return newMap;
      });
    }
    setSelectedTicketId(null);
  };

  const handleSendMessage = async (ticketId: string) => {
    const messageContent = newMessages[ticketId]?.trim();
    const attachments = pendingAttachments[ticketId] || [];

    if (!messageContent && attachments.length === 0) {
      return;
    }

    // If no message content but there are attachments, add a default message
    const finalMessage = messageContent || "Sent an attachment";

    // Set uploading state
    setUploadingFiles((prev) => ({ ...prev, [ticketId]: true }));

    try {
      // Validate file sizes before attempting upload
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = attachments.filter((file) => file.size > maxSize);
      if (oversizedFiles.length > 0) {
        alert(
          `One or more files exceed the 10MB size limit. Please reduce file size and try again.`
        );
        setUploadingFiles((prev) => ({ ...prev, [ticketId]: false }));
        return;
      }

      // Create the message first
      const result = await addSupportTicketMessage(ticketId, finalMessage);
      if (!result.success || !result.messageId) {
        alert(result.error || "Failed to send message");
        setUploadingFiles((prev) => ({ ...prev, [ticketId]: false }));
        return;
      }

      // Upload attachments if any
      if (attachments.length > 0) {
        const uploadErrors: string[] = [];
        for (const file of attachments) {
          try {
            const uploadResult = await uploadSupportTicketAttachment(
              ticketId,
              result.messageId,
              file
            );
            if (!uploadResult.success) {
              uploadErrors.push(
                `${file.name}: ${uploadResult.error || "Upload failed"}`
              );
              console.error("Error uploading attachment:", uploadResult.error);
            }
          } catch (uploadError) {
            const errorMessage =
              uploadError instanceof Error
                ? uploadError.message
                : "Unknown error";
            uploadErrors.push(`${file.name}: ${errorMessage}`);
            console.error("Error uploading attachment:", uploadError);
          }
        }

        if (
          uploadErrors.length > 0 &&
          uploadErrors.length === attachments.length
        ) {
          // All uploads failed
          alert(`Failed to upload attachments:\n${uploadErrors.join("\n")}`);
          setUploadingFiles((prev) => ({ ...prev, [ticketId]: false }));
          return;
        } else if (uploadErrors.length > 0) {
          // Some uploads failed
          alert(
            `Some attachments failed to upload:\n${uploadErrors.join("\n")}`
          );
        }
      }

      // Clear message input and pending attachments
      setNewMessages((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      setPendingAttachments((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });

      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollToBottom(ticketId);
      }, 100);

      // Clear file input
      if (fileInputRefs.current[ticketId]) {
        fileInputRefs.current[ticketId].value = "";
      }

      // Refresh ticket details (force refresh to get new message and attachments)
      await fetchTicketDetails(ticketId, true);
      // Refresh tickets list to update updated_at
      await fetchTickets();
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Provide more specific error messages
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("network")
      ) {
        alert(
          "Network error: Please check your connection and try again. If the file is large, it may take longer to upload."
        );
      } else if (
        errorMessage.includes("body") ||
        errorMessage.includes("size")
      ) {
        alert("File too large: Please ensure each file is under 10MB.");
      } else {
        alert(`An error occurred while sending the message: ${errorMessage}`);
      }
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleFileUpload = (ticketId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Convert FileList to Array
    const fileArray = Array.from(files);

    // Add files to pending attachments
    setPendingAttachments((prev) => ({
      ...prev,
      [ticketId]: [...(prev[ticketId] || []), ...fileArray],
    }));
  };

  if (!showContent) {
    return null;
  }

  return (
    <>
      <NextSEO
        title={t("dashboard.support.title", "Support")}
        description={t(
          "dashboard.support.subtitle",
          "Get help and support for your account"
        )}
      />

      <TicketsContainer data-support-tickets-region="true">
        <TicketsTitle>
          <FaTicketAlt />
          {t("dashboard.support.title", "Support")}
        </TicketsTitle>
        <TicketsSubtitle>
          {t(
            "dashboard.support.subtitle",
            "Create and manage your support tickets"
          )}
        </TicketsSubtitle>

        <FiltersSection>
          <FiltersRow>
            <SearchContainer>
              <SearchIcon>
                <FaSearch />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder={t(
                  "dashboard.support.searchPlaceholder",
                  "Search tickets by subject or ticket ID..."
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>

            <FilterSelectWrapper>
              <FilterSelect
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">
                  {t("dashboard.support.filters.all", "All Tickets")}
                </option>
                <option value="open">
                  {t("dashboard.support.filters.open", "Open")}
                </option>
                <option value="in_progress">
                  {t("dashboard.support.filters.inProgress", "In Progress")}
                </option>
                <option value="resolved">
                  {t("dashboard.support.filters.resolved", "Resolved")}
                </option>
                <option value="closed">
                  {t("dashboard.support.filters.closed", "Closed")}
                </option>
              </FilterSelect>
            </FilterSelectWrapper>

            <CreateButtonWrapper>
              <ActionButton
                variant="success"
                onClick={() => setShowCreateModal(true)}
              >
                <FaPlus />
                {t("dashboard.support.createTicket", "Create Ticket")}
              </ActionButton>
            </CreateButtonWrapper>
          </FiltersRow>
        </FiltersSection>

        {/* Desktop Table View */}
        <TableContainer>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell
                  $sortable
                  onClick={() => handleSort("ticket_number")}
                >
                  {t("dashboard.support.ticketTable.id", "Ticket ID")}
                  {getSortIcon("ticket_number")}
                </TableHeaderCell>
                <SubjectHeaderCell
                  $sortable
                  onClick={() => handleSort("subject")}
                >
                  {t("dashboard.support.ticketTable.subject", "Subject")}
                  {getSortIcon("subject")}
                </SubjectHeaderCell>
                <TableHeaderCell>
                  {t("dashboard.support.ticketTable.status", "Status")}
                </TableHeaderCell>
                <TableHeaderCell
                  $sortable
                  onClick={() => handleSort("created_at")}
                >
                  {t("dashboard.support.ticketTable.created", "Created")}
                  {getSortIcon("created_at")}
                </TableHeaderCell>
                <TableHeaderCell>
                  {t("dashboard.support.ticketTable.actions", "Actions")}
                </TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {loadingTickets ? (
                <TableLoadingRow colSpan={5} message="Loading..." />
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {searchTerm || filterStatus !== "all"
                      ? t(
                          "dashboard.support.noTicketsFound",
                          "No tickets found matching your filters"
                        )
                      : t(
                          "dashboard.support.noTickets",
                          "No support tickets yet. Create your first ticket to get started!"
                        )}
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => (
                  <React.Fragment key={ticket.id}>
                    <TableRow data-ticket-id={ticket.id}>
                      <TableCell>
                        <TicketId
                          onClick={() => openTicketModal(ticket.id)}
                          style={{
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {ticket.ticket_number}
                        </TicketId>
                      </TableCell>
                      <SubjectTableCell>
                        <TicketSubject
                          onClick={() => openTicketModal(ticket.id)}
                          style={{
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {ticket.subject}
                        </TicketSubject>
                      </SubjectTableCell>
                      <TableCell>
                        <StatusBadge $status={ticket.status}>
                          {getStatusIcon(ticket.status)}
                          {t(
                            `dashboard.support.filters.${ticket.status}`,
                            ticket.status
                          )}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{formatDate(ticket.created_at)}</TableCell>
                      <TableCell>
                        <ActionButton
                          variant="secondary"
                          onClick={() => openTicketModal(ticket.id)}
                        >
                          <FaEye />
                          {t("dashboard.support.viewTicket", "View")}
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Mobile Card View */}
        <TicketsCardContainer>
          {loadingTickets ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-secondary)",
              }}
            >
              {t("dashboard.support.loading", "Loading tickets...")}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-secondary)",
              }}
            >
              {searchTerm || filterStatus !== "all"
                ? t(
                    "dashboard.support.noTicketsFound",
                    "No tickets found matching your filters"
                  )
                : t(
                    "dashboard.support.noTickets",
                    "No support tickets yet. Create your first ticket to get started!"
                  )}
            </div>
          ) : (
            paginatedTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                onClick={() => openTicketModal(ticket.id)}
              >
                <CardHeader>
                  <CardTitle>
                    <CardSubject>{ticket.subject}</CardSubject>
                    <CardId>{ticket.ticket_number}</CardId>
                  </CardTitle>
                  <StatusBadge $status={ticket.status}>
                    {getStatusIcon(ticket.status)}
                    {t(
                      `dashboard.support.filters.${ticket.status}`,
                      ticket.status
                    )}
                  </StatusBadge>
                </CardHeader>

                <CardRow>
                  <div style={{ flex: 1 }}>
                    <CardLabel>
                      {t("dashboard.support.ticketTable.created", "Created")}
                    </CardLabel>
                    <CardValue>{formatDate(ticket.created_at)}</CardValue>
                  </div>
                </CardRow>

                <CardActions>
                  <ActionButton
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTicketModal(ticket.id);
                    }}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    <FaEye />
                    {t("dashboard.support.viewTicket", "View Ticket")}
                  </ActionButton>
                </CardActions>
              </TicketCard>
            ))
          )}
        </TicketsCardContainer>

        <Pagination>
          <PaginationInfo>
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, sortedTickets.length)} of{" "}
            {sortedTickets.length} tickets
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
                    style={{
                      backgroundColor:
                        currentPage === page ? "var(--primary)" : undefined,
                      color: currentPage === page ? "white" : undefined,
                    }}
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
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <ModalTitle>
                    <FaTicketAlt />
                    {t(
                      "dashboard.support.createTicket",
                      "Create Support Ticket"
                    )}
                  </ModalTitle>
                  <CloseButton onClick={handleCloseCreateModal}>
                    <FaTimes />
                  </CloseButton>
                </ModalHeader>

                <form onSubmit={handleCreateTicket}>
                  <FormGroup>
                    <FormLabel>
                      {t("dashboard.support.form.subject", "Subject")} *
                    </FormLabel>
                    <FormInput
                      type="text"
                      placeholder={t(
                        "dashboard.support.form.subjectPlaceholder",
                        "Brief description of your issue"
                      )}
                      value={createTicketForm.subject}
                      onChange={(e) =>
                        setCreateTicketForm((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      required
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>
                      {t("dashboard.support.form.description", "Description")} *
                    </FormLabel>
                    <FormTextarea
                      placeholder={t(
                        "dashboard.support.form.descriptionPlaceholder",
                        "Please provide details about your issue..."
                      )}
                      value={createTicketForm.description}
                      onChange={(e) =>
                        setCreateTicketForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
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
                    <CancelButton
                      type="button"
                      onClick={handleCloseCreateModal}
                    >
                      {t("dashboard.support.form.cancel", "Cancel")}
                    </CancelButton>
                    <SubmitButton type="submit" disabled={createTicketLoading}>
                      {createTicketLoading
                        ? t("dashboard.support.form.creating", "Creating...")
                        : t("dashboard.support.form.create", "Create Ticket")}
                    </SubmitButton>
                  </FormActions>
                </form>
              </CreateTicketModal>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Ticket Conversation Modal */}
        <AnimatePresence>
          {selectedTicketId &&
            (() => {
              const ticket = tickets.find((t) => t.id === selectedTicketId);
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

                    <div
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                      }}
                    >
                      {loadingDetails.has(selectedTicketId) ? (
                        <div
                          style={{
                            padding: "2rem",
                            textAlign: "center",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear" as const,
                            }}
                            style={{
                              width: "20px",
                              height: "20px",
                              border: "3px solid rgba(108, 99, 255, 0.3)",
                              borderTop: "3px solid var(--primary)",
                              borderRadius: "50%",
                              margin: "0 auto 1rem",
                            }}
                          />
                          Loading conversation...
                        </div>
                      ) : (
                        <>
                          <ConversationHeader
                            style={{
                              padding: "0 1rem 1rem 1rem",
                              borderBottom:
                                "1px solid rgba(255, 255, 255, 0.1)",
                              flexShrink: 0,
                            }}
                          >
                            <ConversationHeaderGrid>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.25rem",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                    textTransform: "uppercase",
                                    fontWeight: 600,
                                  }}
                                >
                                  {t(
                                    "dashboard.support.ticketTable.id",
                                    "Ticket ID"
                                  )}
                                </div>
                                <TicketId
                                  style={{
                                    cursor: "default",
                                    textDecoration: "none",
                                  }}
                                >
                                  {ticket.ticket_number}
                                </TicketId>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.25rem",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                    textTransform: "uppercase",
                                    fontWeight: 600,
                                  }}
                                >
                                  {t(
                                    "dashboard.support.ticketTable.subject",
                                    "Subject"
                                  )}
                                </div>
                                <TicketSubject
                                  style={{
                                    cursor: "default",
                                    textDecoration: "none",
                                  }}
                                >
                                  {ticket.subject}
                                </TicketSubject>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.25rem",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                    textTransform: "uppercase",
                                    fontWeight: 600,
                                  }}
                                >
                                  {t(
                                    "dashboard.support.ticketTable.status",
                                    "Status"
                                  )}
                                </div>
                                <StatusBadge $status={ticket.status}>
                                  {getStatusIcon(ticket.status)}
                                  {t(
                                    `dashboard.support.filters.${ticket.status}`,
                                    ticket.status
                                  )}
                                </StatusBadge>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.25rem",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                    textTransform: "uppercase",
                                    fontWeight: 600,
                                  }}
                                >
                                  {t(
                                    "dashboard.support.ticketTable.created",
                                    "Created"
                                  )}
                                </div>
                                <div
                                  style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.9rem",
                                  }}
                                >
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
                              flex: "1 1 auto",
                              overflowY: "auto",
                              overflowX: "hidden",
                              padding: "1rem",
                              minHeight: 0,
                              height: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: "1rem",
                            }}
                          >
                            {ticketDetails
                              .get(selectedTicketId)
                              ?.messages?.map((message) => {
                                const isCurrentUser =
                                  message.user_id === user?.id;
                                return (
                                  <Message
                                    key={message.id}
                                    $isAdmin={isCurrentUser}
                                  >
                                    <MessageAvatar $isAdmin={isCurrentUser}>
                                      {isCurrentUser ? (
                                        <FaUser />
                                      ) : (
                                        <FaUserTie />
                                      )}
                                    </MessageAvatar>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: isCurrentUser
                                          ? "flex-end"
                                          : "flex-start",
                                      }}
                                    >
                                      <MessageBubble $isAdmin={isCurrentUser}>
                                        <MessageContent>
                                          {message.content}
                                        </MessageContent>
                                        <MessageTime>
                                          {message.is_admin
                                            ? "Support Team"
                                            : message.user_email || "You"}{" "}
                                          • {formatDateTime(message.created_at)}
                                          {message.edited_at &&
                                            ` (edited ${formatDateTime(
                                              message.edited_at
                                            )})`}
                                        </MessageTime>
                                      </MessageBubble>
                                      {message.attachments?.map((att) => (
                                        <MessageAttachment key={att.id}>
                                          {att.attachment_type === "image" &&
                                          att.url ? (
                                            <>
                                              <ImagePreview
                                                src={att.url}
                                                alt={att.file_name}
                                                onClick={() =>
                                                  window.open(
                                                    att.url || "",
                                                    "_blank"
                                                  )
                                                }
                                              />
                                              <AttachmentInfo
                                                style={{ marginTop: "0.5rem" }}
                                              >
                                                <AttachmentName>
                                                  {att.file_name}
                                                </AttachmentName>
                                                <AttachmentSize>
                                                  {(
                                                    att.file_size / 1024
                                                  ).toFixed(2)}{" "}
                                                  KB
                                                </AttachmentSize>
                                              </AttachmentInfo>
                                            </>
                                          ) : att.attachment_type === "video" &&
                                            att.url ? (
                                            <>
                                              <VideoPreview controls>
                                                <source
                                                  src={att.url}
                                                  type={
                                                    att.file_type || "video/mp4"
                                                  }
                                                />
                                                Your browser does not support
                                                the video tag.
                                              </VideoPreview>
                                              <AttachmentInfo
                                                style={{ marginTop: "0.5rem" }}
                                              >
                                                <AttachmentName>
                                                  {att.file_name}
                                                </AttachmentName>
                                                <AttachmentSize>
                                                  {(
                                                    att.file_size / 1024
                                                  ).toFixed(2)}{" "}
                                                  KB
                                                </AttachmentSize>
                                              </AttachmentInfo>
                                            </>
                                          ) : (
                                            <AttachmentContainer>
                                              <AttachmentIcon>
                                                <FaFile />
                                              </AttachmentIcon>
                                              <AttachmentInfo>
                                                <AttachmentName>
                                                  {att.file_name}
                                                </AttachmentName>
                                                <AttachmentSize>
                                                  {(
                                                    att.file_size / 1024
                                                  ).toFixed(2)}{" "}
                                                  KB
                                                </AttachmentSize>
                                              </AttachmentInfo>
                                              {att.url && (
                                                <AttachmentLink
                                                  href={att.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  View
                                                </AttachmentLink>
                                              )}
                                            </AttachmentContainer>
                                          )}
                                        </MessageAttachment>
                                      ))}
                                    </div>
                                  </Message>
                                );
                              })}
                            {(!ticketDetails.get(selectedTicketId)?.messages ||
                              (ticketDetails.get(selectedTicketId)?.messages?.length ?? 0) === 0) && (
                              <div
                                style={{
                                  padding: "2rem",
                                  textAlign: "center",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                No messages yet. Start the conversation below.
                              </div>
                            )}
                          </div>

                          <MessageInputWrapper
                            style={{
                              padding: "1rem",
                              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                              flexShrink: 0,
                            }}
                          >
                            {ticketDetails.get(selectedTicketId)?.messages &&
                              ticketDetails.get(selectedTicketId)!.messages!
                                .length > 0 && (
                                <JumpToCurrentButton
                                  $visible={
                                    isScrolledUp.get(selectedTicketId) || false
                                  }
                                  onClick={() =>
                                    scrollToBottom(selectedTicketId)
                                  }
                                  type="button"
                                >
                                  <FaChevronDown />
                                  See Recent
                                </JumpToCurrentButton>
                              )}
                            <MessageInput>
                              <MessageTextArea
                                placeholder={t(
                                  "dashboard.support.conversation.placeholder",
                                  "Type your message..."
                                )}
                                value={newMessages[selectedTicketId] || ""}
                                onChange={(e) =>
                                  setNewMessages((prev) => ({
                                    ...prev,
                                    [selectedTicketId]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(selectedTicketId);
                                  }
                                }}
                                rows={1}
                              />
                              {pendingAttachments[selectedTicketId] &&
                                pendingAttachments[selectedTicketId].length >
                                  0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      padding: "0.5rem",
                                      background: "rgba(255, 255, 255, 0.05)",
                                      borderRadius: "8px",
                                      fontSize: "0.85rem",
                                      color: "var(--text-secondary)",
                                      marginRight: "0.5rem",
                                    }}
                                  >
                                    <FaFile />
                                    <span style={{ flex: 1 }}>
                                      {pendingAttachments[selectedTicketId]
                                        .map((f) => f.name)
                                        .join(", ")}
                                    </span>
                                    <button
                                      onClick={() => {
                                        pendingAttachments[
                                          selectedTicketId
                                        ].forEach((file) => {
                                          if (file.type.startsWith("image/")) {
                                            const imageUrl =
                                              URL.createObjectURL(file);
                                            URL.revokeObjectURL(imageUrl);
                                          }
                                        });
                                        setPendingAttachments((prev) => ({
                                          ...prev,
                                          [selectedTicketId]: [],
                                        }));
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--text-secondary)",
                                        cursor: "pointer",
                                        padding: "0.25rem",
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <FaTimes />
                                    </button>
                                  </div>
                                )}
                              <MessageActions>
                                <AttachButton
                                  onClick={() => {
                                    setShowSecurityWarning((prev) => ({
                                      ...prev,
                                      [selectedTicketId]: true,
                                    }));
                                    fileInputRefs.current[
                                      selectedTicketId
                                    ]?.click();
                                  }}
                                  disabled={uploadingFiles[selectedTicketId]}
                                >
                                  <FaPaperclip />
                                </AttachButton>
                                <SendButton
                                  onClick={() =>
                                    handleSendMessage(selectedTicketId)
                                  }
                                  disabled={
                                    (!newMessages[selectedTicketId]?.trim() &&
                                      (!pendingAttachments[selectedTicketId] ||
                                        pendingAttachments[selectedTicketId]
                                          .length === 0)) ||
                                    uploadingFiles[selectedTicketId]
                                  }
                                >
                                  <FaPaperPlane />
                                </SendButton>
                              </MessageActions>
                              <FileInput
                                ref={(el) => {
                                  if (el) {
                                    fileInputRefs.current[selectedTicketId] =
                                      el;
                                  }
                                }}
                                type="file"
                                multiple
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                                onChange={(e) =>
                                  handleFileUpload(
                                    selectedTicketId,
                                    e.target.files
                                  )
                                }
                              />
                            </MessageInput>
                          </MessageInputWrapper>
                          {showSecurityWarning[selectedTicketId] && (
                            <SecurityWarning style={{ marginTop: "0.5rem" }}>
                              <FaFile
                                style={{
                                  marginRight: "0.5rem",
                                  fontSize: "0.85rem",
                                }}
                              />
                              <span>
                                Please do not upload sensitive information such
                                as credit card numbers, payment methods, or
                                passwords.
                              </span>
                            </SecurityWarning>
                          )}
                        </>
                      )}
                    </div>
                  </TicketModalContent>
                </ModalOverlay>
              );
            })()}
        </AnimatePresence>
      </TicketsContainer>
    </>
  );
}

export default SupportPage;
