"use client";
import React, { useState, useEffect } from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { 
  FaUser, 
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaArrowLeft,
  FaUsers,
  FaEnvelope,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaTag,
  FaChartLine,
  FaEllipsisV,
  FaCheck,
  FaTimes,
  FaCog,
  FaHistory,
  FaSave,
  FaExclamationTriangle
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import LoadingComponent from "@/components/common/LoadingComponent";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSubscriber, getAudiences, getSubscriberAudienceMemberships, addAudienceSubscriber, removeAudienceSubscriber } from "@/app/actions/email-campaigns";

const SubscriberContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 16px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
    color: var(--text);
  }
`;

const SubscriberTitle = styled.h1`
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

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-weight: 500;

  ${(props) => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(90deg, var(--primary), var(--accent));
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
          }
        `;
      case 'danger':
        return `
          background-color: rgba(220, 53, 69, 0.2);
          color: #dc3545;
          border: 1px solid rgba(220, 53, 69, 0.3);
          &:hover {
            background-color: rgba(220, 53, 69, 0.3);
            transform: translateY(-2px);
          }
        `;
      default:
        return `
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text);
          border: 1px solid rgba(255, 255, 255, 0.2);
          &:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
          }
        `;
    }
  }}
`;

const SubscriberInfo = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 2rem;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 2rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const Avatar = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'color'
})<{ color: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.8rem;
`;

const Details = styled.div``;

const SubscriberName = styled.h2`
  color: var(--text);
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
`;

const SubscriberEmail = styled.div`
  color: var(--text-secondary);
  font-size: 1rem;
  margin-bottom: 1rem;
`;

const SubscriberMeta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;

  svg {
    color: var(--primary);
    font-size: 0.8rem;
  }
`;

const StatusBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'status'
})<{ status: string }>`
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: capitalize;
  
  ${(props) => {
    switch (props.status) {
      case 'active':
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        `;
      case 'unsubscribed':
        return `
          background-color: rgba(220, 53, 69, 0.2);
          color: #dc3545;
        `;
      case 'bounced':
        return `
          background-color: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        `;
      case 'pending':
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
      default:
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
        `;
    }
  }}
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 2rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: var(--text);
  margin: 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: var(--primary);
  }
`;

const Form = styled.form`
  display: grid;
  gap: 1.5rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: var(--text);
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
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

const AudiencesList = styled.div`
  display: grid;
  gap: 1rem;
`;

const AudienceItem = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMember'
})<{ isMember: boolean }>`
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid ${props => props.isMember ? 'rgba(40, 167, 69, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  background-color: ${props => props.isMember ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.isMember ? 'rgba(40, 167, 69, 0.5)' : 'rgba(255, 255, 255, 0.2)'};
  }
`;

const AudienceItemInfo = styled.div`
  flex: 1;
`;

const AudienceItemName = styled.h4`
  color: var(--text);
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
`;

const AudienceItemDescription = styled.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
`;

const ToggleButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isActive'
})<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  font-weight: 500;

  ${props => props.isActive ? `
    background-color: rgba(220, 53, 69, 0.2);
    color: #dc3545;
    &:hover {
      background-color: rgba(220, 53, 69, 0.3);
    }
  ` : `
    background-color: rgba(40, 167, 69, 0.2);
    color: #28a745;
    &:hover {
      background-color: rgba(40, 167, 69, 0.3);
    }
  `}
`;

const MembershipBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMember'
})<{ isMember: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => props.isMember ? `
    background-color: rgba(40, 167, 69, 0.2);
    color: #28a745;
  ` : `
    background-color: rgba(108, 117, 125, 0.2);
    color: #6c757d;
  `}
`;

const BulkActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const BulkButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  font-weight: 500;

  ${props => props.variant === 'primary' ? `
    background-color: rgba(40, 167, 69, 0.2);
    color: #28a745;
    &:hover {
      background-color: rgba(40, 167, 69, 0.3);
    }
  ` : `
    background-color: rgba(108, 117, 125, 0.2);
    color: #6c757d;
    &:hover {
      background-color: rgba(108, 117, 125, 0.3);
    }
  `}
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
    color: #28a745;
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
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${props => {
    if (props.variant === 'primary') {
      return `
        background: linear-gradient(90deg, #6c63ff, #4ecdc4);
        color: white;
        &:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
      `;
    } else if (props.variant === 'danger') {
      return `
        background-color: rgba(220, 53, 69, 0.1);
        color: #dc3545;
        border: 1px solid rgba(220, 53, 69, 0.3);
        &:hover {
          background-color: rgba(220, 53, 69, 0.2);
        }
      `;
    } else {
      return `
        background-color: rgba(255, 255, 255, 0.1);
        color: var(--text);
        &:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

function SubscriberDetailPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [subscriberAudiences, setSubscriberAudiences] = useState<{[key: string]: boolean}>({});
  const [subscriber, setSubscriber] = useState<any>(null);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showResubscribeModal, setShowResubscribeModal] = useState(false);
  const [isResubscribing, setIsResubscribing] = useState(false);
  
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const subscriberId = params.id as string;

  // Ensure we're on the client side before making API calls
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  useEffect(() => {
    if (!translationsLoaded || !subscriberId || !isClient || !user) return;

    const loadSubscriberData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching subscriber data for ID:', subscriberId);
        
        const data = await getSubscriber(subscriberId);
        console.log('Subscriber data received:', data);
        setSubscriber(data.subscriber);
        
        // Initialize form data
        setFormData({
          name: data.subscriber.name,
          email: data.subscriber.email,
          status: data.subscriber.status,
          location: (data.subscriber as { location?: string }).location ?? "Unknown",
          engagement: data.subscriber.engagement || "Medium"
        });
        
      } catch (err) {
        console.error('Error fetching subscriber:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subscriber');
      } finally {
        setLoading(false);
      }
    };

    const loadAudiences = async () => {
      try {
        console.log('Fetching audiences...');
        
        const data = await getAudiences({ mode: 'light' });
        console.log('Audiences data received:', data);
        setAudiences(data.audiences || []);
        
        // Fetch the subscriber's actual audience memberships
        await fetchSubscriberAudienceMemberships(data.audiences || []);
        
      } catch (err) {
        console.error('Error fetching audiences:', err);
        // Don't set error here as it's not critical for the main page
      }
    };

    loadSubscriberData();
    loadAudiences();
  }, [translationsLoaded, subscriberId, isClient, user]);

  const fetchSubscriberAudienceMemberships = async (audiences: any[]) => {
    try {
      console.log('Fetching subscriber audience memberships for:', subscriberId);
      
      // Use server function to get all memberships at once
      const data = await getSubscriberAudienceMemberships(subscriberId);
      setSubscriberAudiences(data.memberships || {});
      console.log('✅ Subscriber audience memberships loaded:', data.memberships);
      
    } catch (err) {
      console.error('Error fetching subscriber audience memberships:', err);
      // Initialize all as false if there's an error
      const memberships: {[key: string]: boolean} = {};
      audiences.forEach((audience: any) => {
        memberships[audience.id] = false;
      });
      setSubscriberAudiences(memberships);
    }
  };

  // Don't render anything until we're on the client side
  if (!isClient) {
    return <LoadingComponent />;
  }

  if (languageLoading || !translationsLoaded) {
    return <LoadingComponent />;
  }

  if (!user) {
    return <LoadingComponent />;
  }

  if (loading) {
    return <LoadingComponent />;
  }

  if (error) {
    return (
      <SubscriberContainer>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Error Loading Subscriber</h2>
          <p>{error}</p>
          <ActionButton onClick={() => router.push('/admin/email-campaigns/subscribers')}>
            <FaArrowLeft />
            Back to Subscribers
          </ActionButton>
        </div>
      </SubscriberContainer>
    );
  }

  if (!subscriber) {
    return (
      <SubscriberContainer>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Subscriber Not Found</h2>
          <p>The requested subscriber could not be found.</p>
          <ActionButton onClick={() => router.push('/admin/email-campaigns/subscribers')}>
            <FaArrowLeft />
            Back to Subscribers
          </ActionButton>
        </div>
      </SubscriberContainer>
    );
  }

  const filteredAudiences = audiences.filter(audience =>
    audience.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audience.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAudienceToggle = async (audienceId: string) => {
    try {
      const currentMembership = subscriberAudiences[audienceId] || false;
      const newMembership = !currentMembership;
      
      // Find the audience to check if it's static
      const audience = audiences.find(a => a.id === audienceId);
      if (!audience) {
        console.error('Audience not found:', audienceId);
        return;
      }
      
      const filters = audience.filters || {};
      const isStatic = filters.audience_type === 'static';
      
      if (!isStatic) {
        alert('You can only manually add/remove subscribers from static audiences. Dynamic audiences are managed automatically based on their rules.');
        return;
      }
      
      if (newMembership) {
        // Add subscriber to audience
        await addAudienceSubscriber(audienceId, { email: subscriber.email });
      } else {
        // Remove subscriber from audience
        await removeAudienceSubscriber(audienceId, subscriberId);
      }
      
      // Update local state
      setSubscriberAudiences((prev: {[key: string]: boolean}) => ({
        ...prev,
        [audienceId]: newMembership
      }));
      
      console.log(`✅ Successfully ${newMembership ? 'added' : 'removed'} subscriber from audience: ${audience.name}`);
      
    } catch (error) {
      console.error('Error toggling audience membership:', error);
      alert(`Failed to update audience membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/email-campaigns/subscribers/${subscriberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscriber');
      }

      // Refresh subscriber data
      try {
        setLoading(true);
        const data = await getSubscriber(subscriberId);
        setSubscriber(data.subscriber);
        setFormData({
          name: data.subscriber.name,
          email: data.subscriber.email,
          status: data.subscriber.status,
          location: (data.subscriber as { location?: string }).location ?? "Unknown",
          engagement: data.subscriber.engagement || "Medium"
        });
      } catch (err) {
        console.error('Error refreshing subscriber:', err);
      } finally {
        setLoading(false);
      }
      setEditMode(false);
      success('Subscriber updated successfully!', 3000);
    } catch (err) {
      console.error('Error saving subscriber:', err);
      showError('Failed to save changes. Please try again.', 4000);
    }
  };

  const handleResubscribe = () => {
    if (!subscriber?.email) {
      showError('Subscriber email not found', 3000);
      return;
    }
    setShowResubscribeModal(true);
  };

  const handleResubscribeConfirm = async () => {
    if (!subscriber?.email) {
      return;
    }

    try {
      setIsResubscribing(true);
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: subscriber.email,
          action: 'resubscribe'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resubscribe');
      }

      // Refresh subscriber data
      const subscriberData = await getSubscriber(subscriberId);
      setSubscriber(subscriberData.subscriber);
      setFormData({
        name: subscriberData.subscriber.name,
        email: subscriberData.subscriber.email,
        status: subscriberData.subscriber.status,
        location: (subscriberData.subscriber as { location?: string }).location ?? "Unknown",
        engagement: subscriberData.subscriber.engagement || "Medium"
      });

      setShowResubscribeModal(false);
      success('Subscriber successfully resubscribed!', 3000);
    } catch (err) {
      console.error('Error resubscribing subscriber:', err);
      showError(`Failed to resubscribe: ${err instanceof Error ? err.message : 'Unknown error'}`, 4000);
    } finally {
      setIsResubscribing(false);
    }
  };

  const handleResubscribeCancel = () => {
    setShowResubscribeModal(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this subscriber?')) {
      console.log('Deleting subscriber:', subscriber.id);
      // Here you would make API call to delete
      router.push('/admin/email-campaigns/subscribers');
    }
  };

  const handleBulkAddAll = async () => {
    try {
      // Only add to static audiences
      const staticAudiences = audiences.filter(audience => {
        const filters = audience.filters || {};
        return filters.audience_type === 'static';
      });
      
      if (staticAudiences.length === 0) {
        alert('No static audiences available to add subscribers to.');
        return;
      }
      
      // Add subscriber to all static audiences
      for (const audience of staticAudiences) {
        const currentMembership = subscriberAudiences[audience.id] || false;
        if (!currentMembership) {
          await addAudienceSubscriber(audience.id, { email: subscriber.email });
        }
      }
      
      // Update local state
      const newMemberships: {[key: string]: boolean} = { ...subscriberAudiences };
      staticAudiences.forEach(audience => {
        newMemberships[audience.id] = true;
      });
      setSubscriberAudiences(newMemberships);
      
      console.log(`✅ Successfully added subscriber to ${staticAudiences.length} static audiences`);
      
    } catch (error) {
      console.error('Error in bulk add:', error);
      alert(`Failed to add subscriber to audiences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBulkRemoveAll = async () => {
    try {
      // Only remove from static audiences
      const staticAudiences = audiences.filter(audience => {
        const filters = audience.filters || {};
        return filters.audience_type === 'static';
      });
      
      if (staticAudiences.length === 0) {
        alert('No static audiences available to remove subscribers from.');
        return;
      }
      
      // Remove subscriber from all static audiences
      for (const audience of staticAudiences) {
        const currentMembership = subscriberAudiences[audience.id] || false;
        if (currentMembership) {
          await removeAudienceSubscriber(audience.id, subscriberId);
        }
      }
      
      // Update local state
      const newMemberships: {[key: string]: boolean} = { ...subscriberAudiences };
      staticAudiences.forEach(audience => {
        newMemberships[audience.id] = false;
      });
      setSubscriberAudiences(newMemberships);
      
      console.log(`✅ Successfully removed subscriber from ${staticAudiences.length} static audiences`);
      
    } catch (error) {
      console.error('Error in bulk remove:', error);
      alert(`Failed to remove subscriber from audiences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Generate avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = ['#6c63ff', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <>
      <NextSEO
        title={`Subscriber: ${subscriber.name}`}
        description={`Manage details and audience assignments for ${subscriber.name}`}
      />
      
      <SubscriberContainer>
        <Header>
          <HeaderLeft>
            <BackButton href="/admin/email-campaigns/subscribers">
              <FaArrowLeft />
              Back to Subscribers
            </BackButton>
            <SubscriberTitle>
              <FaUser />
              Subscriber Details
            </SubscriberTitle>
          </HeaderLeft>
          <HeaderActions>
            {editMode ? (
              <>
                <ActionButton onClick={() => setEditMode(false)}>
                  Cancel
                </ActionButton>
                <ActionButton variant="primary" onClick={handleSave}>
                  <FaSave />
                  Save Changes
                </ActionButton>
              </>
            ) : (
              <>
                {subscriber?.status === 'unsubscribed' && (
                  <ActionButton 
                    variant="primary" 
                    onClick={handleResubscribe}
                    disabled={loading}
                  >
                    <FaCheck />
                    Resubscribe
                  </ActionButton>
                )}
                <ActionButton variant="danger" onClick={handleDelete}>
                  <FaTrash />
                  Delete
                </ActionButton>
                <ActionButton onClick={() => setEditMode(true)}>
                  <FaEdit />
                  Edit
                </ActionButton>
                <ActionButton onClick={() => console.log('Send email to:', subscriber.email)}>
                  <FaEnvelope />
                  Send Email
                </ActionButton>
              </>
            )}
          </HeaderActions>
        </Header>

        <SubscriberInfo>
          <Avatar color={getAvatarColor(subscriber.name)}>
            {subscriber.name.split(' ').map((n: string) => n[0]).join('')}
          </Avatar>
          <Details>
            <SubscriberName>{subscriber.name}</SubscriberName>
            <SubscriberEmail>{subscriber.email}</SubscriberEmail>
            <SubscriberMeta>
              <MetaItem>
                <FaCalendarAlt />
                Joined {new Date(subscriber.subscribeDate).toLocaleDateString()}
              </MetaItem>
              <MetaItem>
                <FaHistory />
                Last active {new Date(subscriber.lastActivity).toLocaleDateString()}
              </MetaItem>
              <MetaItem>
                <FaMapMarkerAlt />
                {(subscriber as { location?: string }).location ?? "Unknown"}
              </MetaItem>
              <MetaItem>
                <FaChartLine />
                {subscriber.engagement || "Medium"} engagement
              </MetaItem>
              <MetaItem>
                <FaEnvelope />
                {subscriber.totalOpens || 0} opens, {subscriber.totalClicks || 0} clicks
              </MetaItem>
            </SubscriberMeta>
          </Details>
          <StatusBadge status={subscriber.status}>
            {subscriber.status}
          </StatusBadge>
        </SubscriberInfo>

        <ContentGrid>
          <Section>
            <SectionHeader>
              <SectionTitle>
                <FaEdit />
                Subscriber Information
              </SectionTitle>
            </SectionHeader>

            <Form>
              <FormRow>
                <FormField>
                  <Label>Name</Label>
                  <Input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    disabled={!editMode}
                    placeholder="Enter subscriber name"
                  />
                </FormField>
                <FormField>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    disabled={!editMode}
                    placeholder="Enter email address"
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField>
                  <Label>Status</Label>
                  <Select
                    value={formData.status || ''}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    disabled={!editMode}
                  >
                    <option value="active">Active</option>
                    <option value="unsubscribed">Unsubscribed</option>
                    <option value="bounced">Bounced</option>
                    <option value="pending">Pending</option>
                  </Select>
                </FormField>
                <FormField>
                  <Label>Location</Label>
                  <Input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                    disabled={!editMode}
                    placeholder="Enter location"
                  />
                </FormField>
              </FormRow>
              <FormField>
                <Label>Engagement Level</Label>
                <Select
                  value={formData.engagement || ''}
                  onChange={(e) => handleFormChange('engagement', e.target.value)}
                  disabled={!editMode}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>
              </FormField>
            </Form>
          </Section>

          <Section>
            <SectionHeader>
              <SectionTitle>
                <FaUsers />
                Audience Memberships
              </SectionTitle>
            </SectionHeader>

            <SearchContainer>
              <SearchIcon>
                <FaSearch />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Search audiences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>

            {editMode && (
              <BulkActions>
                <BulkButton variant="primary" onClick={handleBulkAddAll}>
                  <FaCheck />
                  Add All
                </BulkButton>
                <BulkButton onClick={handleBulkRemoveAll}>
                  <FaTimes />
                  Remove All
                </BulkButton>
              </BulkActions>
            )}

            <AudiencesList>
              {filteredAudiences.map((audience) => (
                <AudienceItem key={audience.id} isMember={subscriberAudiences[audience.id] || false}>
                  <AudienceItemInfo>
                    <AudienceItemName>{audience.name}</AudienceItemName>
                    <AudienceItemDescription>{audience.description}</AudienceItemDescription>
                  </AudienceItemInfo>
                  {editMode ? (
                    <ToggleButton
                      isActive={subscriberAudiences[audience.id] || false}
                      onClick={() => handleAudienceToggle(audience.id)}
                    >
                      {subscriberAudiences[audience.id] ? (
                        <>
                          <FaTimes />
                          Remove
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          Add
                        </>
                      )}
                    </ToggleButton>
                  ) : (
                    <MembershipBadge isMember={subscriberAudiences[audience.id] || false}>
                      {subscriberAudiences[audience.id] ? (
                        <>
                          <FaCheck />
                          Member
                        </>
                      ) : (
                        <>
                          <FaTimes />
                          Not Member
                        </>
                      )}
                    </MembershipBadge>
                  )}
                </AudienceItem>
              ))}
            </AudiencesList>
          </Section>
        </ContentGrid>
      </SubscriberContainer>

      {/* Resubscribe Confirmation Modal */}
      <AnimatePresence>
        {showResubscribeModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleResubscribeCancel}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalTitle>
                <FaCheck />
                Resubscribe Subscriber
              </ModalTitle>
              <ModalMessage>
                Are you sure you want to resubscribe <strong>{subscriber?.email}</strong>? 
                This will change their status from "unsubscribed" to "active" and they will 
                start receiving emails again.
              </ModalMessage>
              <ModalActions>
                <ModalButton 
                  onClick={handleResubscribeCancel}
                  disabled={isResubscribing}
                >
                  Cancel
                </ModalButton>
                <ModalButton 
                  variant="primary" 
                  onClick={handleResubscribeConfirm}
                  disabled={isResubscribing}
                >
                  <FaCheck />
                  {isResubscribing ? 'Resubscribing...' : 'Yes, Resubscribe'}
                </ModalButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </>
  );
}

export default SubscriberDetailPage; 