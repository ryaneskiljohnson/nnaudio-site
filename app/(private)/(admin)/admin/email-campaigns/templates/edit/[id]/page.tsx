"use client";
import React, { useState, useEffect } from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { 
  FaFileAlt, 
  FaArrowLeft,
  FaArrowRight,
  FaChevronRight,
  FaInfoCircle,
  FaEdit,
  FaEye,
  FaSave,
  FaUsers,
  FaPalette,
  FaSearch,
  FaTimes,
  FaExclamationTriangle,
  FaExpandArrowsAlt,
  FaDesktop,
  FaMobileAlt
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import VisualEditor from "@/components/email-campaigns/VisualEditor";
import { getAudiences, getTemplate } from "@/app/actions/email-campaigns";

const CreateContainer = styled.div<{ $isDesignStep: boolean }>`
  width: 100%;
  max-width: ${props => props.$isDesignStep ? 'none' : '1200px'};
  margin: ${props => props.$isDesignStep ? '0' : '0 auto'};
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Breadcrumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const BreadcrumbLink = styled(Link)`
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
  }
`;

const BreadcrumbCurrent = styled.span`
  color: var(--text);
  font-weight: 500;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
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
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const Step = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'completed' && prop !== 'clickable'
})<{ active: boolean; completed: boolean; clickable?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  
  ${props => {
    if (props.completed) {
      return `
        background-color: rgba(40, 167, 69, 0.2);
        color: #28a745;
        border: 2px solid #28a745;
      `;
    } else if (props.active) {
      return `
        background-color: rgba(108, 99, 255, 0.2);
        color: var(--primary);
        border: 2px solid var(--primary);
      `;
    } else {
      return `
        background-color: rgba(255, 255, 255, 0.05);
        color: var(--text-secondary);
        border: 2px solid rgba(255, 255, 255, 0.1);
      `;
    }
  }}

  ${props => props.clickable && `
    &:hover {
      background-color: rgba(108, 99, 255, 0.1);
      color: var(--primary);
      border-color: var(--primary);
      transform: translateY(-2px);
    }
  `}

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
`;

const StepConnector = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'completed'
})<{ completed: boolean }>`
  width: 40px;
  height: 2px;
  background-color: ${props => props.completed ? '#28a745' : 'rgba(255, 255, 255, 0.1)'};
  transition: background-color 0.3s ease;

  @media (max-width: 768px) {
    width: 20px;
  }
`;

const StepContent = styled(motion.div)<{ $isDesignStep?: boolean }>`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: ${props => props.$isDesignStep ? '1rem' : '2rem'};
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2rem;
  min-height: 600px;
  width: 100%;
  max-width: ${props => props.$isDesignStep ? 'none' : 'none'};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--text);
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
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.3s ease;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-secondary);
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

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
`;

const StatusToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 1rem;
`;

const StatusToggle = styled.div<{ $isActive: boolean }>`
  position: relative;
  width: 60px;
  height: 30px;
  background-color: ${props => props.$isActive ? '#28a745' : '#ffc107'};
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${props => props.$isActive ? '33px' : '3px'};
    width: 24px;
    height: 24px;
    background-color: white;
    border-radius: 50%;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const StatusLabel = styled.span<{ $isActive: boolean }>`
  font-weight: 600;
  color: ${props => props.$isActive ? '#28a745' : '#ffc107'};
  font-size: 0.9rem;
`;

const NavButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 600;

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
      default:
        return `
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.1);
          &:hover {
            background-color: rgba(255, 255, 255, 0.2);
            color: var(--text);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

// Audience Selection Components (copied from campaigns)
const AudienceSelectionContainer = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SearchInputContainer = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 45px;
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
    background-color: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 0.9rem;
  pointer-events: none;
`;

const ClearSearchButton = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.1);
  }
`;

const AudienceList = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  
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

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AudienceItem = styled.div<{ $isSelected: boolean; $isExcluded: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: ${props => {
    if (props.$isExcluded) return 'rgba(220, 53, 69, 0.1)';
    if (props.$isSelected) return 'rgba(40, 167, 69, 0.15)';
    return 'rgba(255, 255, 255, 0.02)';
  }};
  border: 1px solid ${props => {
    if (props.$isExcluded) return 'rgba(220, 53, 69, 0.3)';
    if (props.$isSelected) return 'rgba(40, 167, 69, 0.4)';
    return 'rgba(255, 255, 255, 0.05)';
  }};
  transition: all 0.3s ease;
  cursor: pointer;
  gap: 0.75rem;
  
  &:hover {
    background: ${props => {
      if (props.$isExcluded) return 'rgba(220, 53, 69, 0.15)';
      if (props.$isSelected) return 'rgba(40, 167, 69, 0.2)';
      return 'rgba(255, 255, 255, 0.05)';
    }};
    border-color: ${props => {
      if (props.$isExcluded) return 'rgba(220, 53, 69, 0.5)';
      if (props.$isSelected) return 'rgba(40, 167, 69, 0.6)';
      return 'rgba(255, 255, 255, 0.1)';
    }};
    transform: translateY(-1px);
  }
`;

const AudienceCheckbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #28a745;
  flex-shrink: 0;
`;

const AudienceInfo = styled.div`
  flex: 1;
  cursor: pointer;
  min-width: 0;
`;

const AudienceName = styled.div`
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.125rem;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AudienceDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const AudienceCount = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
`;

const AudienceType = styled.span<{ $type: 'static' | 'dynamic' }>`
  background: ${props => props.$type === 'static' ? 'rgba(255,193,7,0.2)' : 'rgba(40,167,69,0.2)'};
  color: ${props => props.$type === 'static' ? '#ffc107' : '#28a745'};
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
`;

const ExcludeButton = styled.button<{ $isExcluded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid ${props => props.$isExcluded ? '#dc3545' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 4px;
  background: ${props => props.$isExcluded ? 'rgba(220, 53, 69, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$isExcluded ? '#dc3545' : 'var(--text-secondary)'};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  
  &:hover {
    background: ${props => props.$isExcluded ? 'rgba(220, 53, 69, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.$isExcluded ? '#dc3545' : 'rgba(255, 255, 255, 0.3)'};
    transform: translateY(-1px);
  }
  
  svg {
    font-size: 0.7rem;
  }
`;

const AudienceStatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const AudienceStatItem = styled.div`
  text-align: center;
`;

const AudienceStatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.25rem;
`;

const AudienceStatLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StepTitle = styled.h2`
  color: var(--text);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
`;

const StepDescription = styled.p`
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
`;

// Preview-related styled components
const PreviewSection = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 1.5rem;
`;

const PreviewTitle = styled.h3`
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  
  svg:first-child {
    color: var(--primary);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }
`;

const ExpandPreviewButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: var(--text);
    border-color: var(--primary);
    transform: translateY(-1px);
  }
`;

interface TemplateData {
  id: string;
  name: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  preheader: string;
  description: string;
  type: string;
  status: string;
  audienceIds: string[];
  excludedAudienceIds: string[];
}

interface Audience {
  id: string;
  name: string;
  description: string;
  subscriber_count: number;
  type: 'static' | 'dynamic';
}

// HTML parser to convert saved HTML content back to visual editor elements
const parseHtmlToElements = (htmlContent: string): any[] => {
  if (!htmlContent) return [];
  
  const elements: any[] = [];
  
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Process each child element
  Array.from(tempDiv.children).forEach((element, index) => {
    const id = `parsed_${Date.now()}_${index}`;
    
    switch (element.tagName.toLowerCase()) {
      case 'h1':
        elements.push({
          id,
          type: 'header',
          content: element.innerHTML || '',
          fontSize: '32px',
          fontWeight: 'bold',
          textAlign: 'center',
          fullWidth: true
        });
        break;
        
      case 'p':
        elements.push({
          id,
          type: 'text',
          content: element.innerHTML || '',
          fontSize: '16px',
          textAlign: 'left'
        });
        break;
        
      case 'a':
        const aElement = element as HTMLAnchorElement;
        elements.push({
          id,
          type: 'button',
          content: element.innerHTML || '',
          url: aElement.href || '#',
          fontSize: '16px',
          fontWeight: 'bold',
          textAlign: 'center'
        });
        break;
        
      case 'img':
        const imgElement = element as HTMLImageElement;
        elements.push({
          id,
          type: 'image',
          src: imgElement.src || '',
          alt: imgElement.alt || ''
        });
        break;
        
      case 'hr':
        elements.push({
          id,
          type: 'divider'
        });
        break;
        
      case 'div':
        // Check if it's a spacer (div with height style)
        const style = (element as HTMLElement).style;
        if (style.height) {
          elements.push({
            id,
            type: 'spacer',
            height: style.height
          });
        } else {
          // Generic div content - treat as text
          elements.push({
            id,
            type: 'text',
            content: element.innerHTML || '',
            fontSize: '16px',
            textAlign: 'left'
          });
        }
        break;
        
      default:
        // For any other elements, extract HTML content
        if (element.innerHTML && element.innerHTML.trim()) {
          elements.push({
            id,
            type: 'text',
            content: element.innerHTML,
            fontSize: '16px',
            textAlign: 'left'
          });
        }
        break;
    }
  });
  
  return elements;
};

function EditTemplatePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const isNewTemplate = params.id === 'new';
  const [templateData, setTemplateData] = useState<TemplateData>({
    id: isNewTemplate ? '' : params.id as string,
    name: isNewTemplate ? "" : "Welcome Email Template",
    subject: isNewTemplate ? "" : "Welcome to Cymasphere! 🎵",
    senderName: "Cymasphere Team",
    senderEmail: "support@cymasphere.com",
    replyToEmail: "",
    preheader: isNewTemplate ? "" : "We're excited to have you join our community",
    description: isNewTemplate ? "" : "A warm welcome message for new subscribers",
    type: "welcome",
    status: "draft",
    audienceIds: [],
    excludedAudienceIds: []
  });

  // Audience management state
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(true);
  const [audienceSearchTerm, setAudienceSearchTerm] = useState('');

  // Email elements for the visual editor
  const [emailElements, setEmailElements] = useState([
    { id: 'header_' + Date.now(), type: 'header', content: 'Welcome to Cymasphere! 🎵' },
    { id: 'text_' + Date.now() + 1, type: 'text', content: 'Hi {{firstName}}, We\'re excited to have you join our community of music creators and synthesizer enthusiasts.' },
    { id: 'button_' + Date.now(), type: 'button', content: '🚀 Get Started Now', url: '#' },
          { id: 'image_' + Date.now(), type: 'image', src: 'https://via.placeholder.com/600x300/667eea/ffffff?text=Welcome+to+Cymasphere' }
  ]);

  // Preview state variables
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();

  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  // Handle ESC key for closing preview modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPreviewModal) {
        setShowPreviewModal(false);
      }
    };

    if (showPreviewModal) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset'; // Restore scrolling
    };
  }, [showPreviewModal]);

  // Load audiences on component mount (must be before early returns)
  useEffect(() => {
    const loadAudiences = async () => {
      try {
        setAudiencesLoading(true);
        const data = await getAudiences({ mode: 'light' });
        setAudiences(data.audiences || []);
      } catch (error) {
        console.error('Error loading audiences:', error);
        setAudiences([]);
      } finally {
        setAudiencesLoading(false);
      }
    };

    loadAudiences();
  }, []);

  // Load existing template data when editing
  useEffect(() => {
    const loadTemplateData = async () => {
      if (isNewTemplate) {
        setIsLoading(false);
        return; // Skip for new templates
      }
      
      try {
        setIsLoading(true);
        console.log('Loading template data for ID:', params.id);
        console.log('Making fetch request to:', `/api/email-campaigns/templates/${params.id}`);
        const data = await getTemplate(params.id);
        console.log('Raw API response:', data);
        const template = data.template;
        
        if (template) {
          
          console.log('Loaded template data:', template);
          console.log('Template audiences:', template.audiences);
          console.log('Template excluded audiences:', template.excludedAudiences);
          
          // Update template data state
          setTemplateData({
            id: template.id,
            name: template.name || '',
            subject: template.subject || '',
            senderName: template.sender_name || 'Cymasphere Team',
            senderEmail: template.sender_email || 'support@cymasphere.com',
            replyToEmail: template.reply_to_email || '',
            preheader: template.preheader || '',
            description: template.description || '',
            type: template.type || 'custom',
            status: template.status || 'draft',
            audienceIds: template.audienceIds || [],
            excludedAudienceIds: template.excludedAudienceIds || []
          });

          // Template audience IDs are already stored in templateData.audienceIds and templateData.excludedAudienceIds
          // No need to merge audience objects here since audiences are loaded separately

          // Parse HTML content back to email elements if available
          if (template.htmlContent || template.html_content) {
            const htmlContent = template.htmlContent || template.html_content;
            
            // Check if template has visual_elements in variables (new format)
            if (template.variables?.visual_elements && Array.isArray(template.variables.visual_elements)) {
              console.log('🎨 Loading template with visual elements:', template.variables.visual_elements.length);
              setEmailElements(template.variables.visual_elements);
            } else {
              // Fallback: Parse HTML content back to structured elements
              const parsedElements = parseHtmlToElements(htmlContent);
              setEmailElements(parsedElements.length > 0 ? parsedElements : [
                { 
                  id: 'loaded_content_' + Date.now(), 
                  type: 'text', 
                  content: htmlContent.replace(/<[^>]*>/g, '') // Fallback for unparseable content
                }
              ]);
            }
          }
          
        } else {
          console.error('Failed to load template');
        }
      } catch (error) {
        console.error('Error loading template data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplateData();
  }, [isNewTemplate, params.id]);

  if (languageLoading || !translationsLoaded) {
    return <LoadingComponent />;
  }

  if (!user) {
    return <LoadingComponent />;
  }

  if (isLoading) {
    return <LoadingComponent text="Loading template..." />;
  }

  // Generate HTML preview from email elements
  const generatePreviewHtml = () => {
    const elementHtml = emailElements.map(element => {
      // Type-safe property access
      const fullWidth = (element as any).fullWidth || false;
      const elementUrl = (element as any).url || '#';
      const elementSrc = (element as any).src || 'https://via.placeholder.com/600x300';
      const elementAlt = (element as any).alt || 'Email Image';
      const elementHeight = (element as any).height || '20px';
      
      // Determine container styling based on fullWidth
      const containerStyle = fullWidth 
        ? 'margin: 0; padding: 0;' 
        : 'margin: 0 auto; max-width: 100%;';
      
      const wrapperClass = fullWidth ? 'full-width' : 'constrained-width';
      
      switch (element.type) {
        case 'header':
          return `<div class="${wrapperClass}" style="${containerStyle}"><h1 style="font-size: 2.5rem; color: #333; margin-bottom: 1rem; text-align: center; background: linear-gradient(135deg, #333, #666); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; ${fullWidth ? 'padding: 0 20px;' : ''}">${element.content}</h1></div>`;
        
        case 'text':
          return `<div class="${wrapperClass}" style="${containerStyle}"><p style="font-size: 1rem; color: #555; line-height: 1.6; margin-bottom: 1rem; ${fullWidth ? 'padding: 0 20px;' : ''}">${element.content}</p></div>`;
        
        case 'button':
          return `<div class="${wrapperClass}" style="${containerStyle} text-align: center; margin: 2rem 0;"><a href="${elementUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s ease;">${element.content}</a></div>`;
        
        case 'image':
          return `<div class="${wrapperClass}" style="${containerStyle} text-align: center; margin: 2rem 0; ${fullWidth ? 'padding: 0;' : ''}"><img src="${elementSrc}" alt="${elementAlt}" style="max-width: 100%; height: auto; border-radius: ${fullWidth ? '0' : '8px'}; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);"></div>`;
        
        case 'divider':
          return `<div class="${wrapperClass}" style="${containerStyle}"><div style="margin: 2rem ${fullWidth ? '0' : '0'}; text-align: center;"><div style="height: 2px; background: linear-gradient(90deg, transparent, #ddd, transparent); width: 100%;"></div></div></div>`;
        
        case 'spacer':
          return `<div class="${wrapperClass}" style="${containerStyle} height: ${elementHeight};"></div>`;
        
        default:
          return `<div class="${wrapperClass}" style="${containerStyle}">${element.content || ''}</div>`;
      }
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${templateData.subject || 'Template Preview'}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f7f7f7;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%);
            padding: 20px;
            text-align: center;
        }
        .logo {
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .logo .cyma {
            background: linear-gradient(90deg, #6c63ff, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .content {
            padding: 30px;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            background-color: #f8f9fa;
            color: #666666;
            border-top: 1px solid #e9ecef;
        }
        .footer a {
            color: #6c63ff;
            text-decoration: none;
        }
        .full-width {
            width: 100%;
            margin-left: calc(-30px);
            margin-right: calc(-30px);
            padding-left: 30px;
            padding-right: 30px;
        }
        .constrained-width {
            max-width: 100%;
            margin: 0 auto;
        }
        
        /* Responsive styles */
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .header {
                padding: 15px;
            }
            .logo {
                font-size: 1.2rem;
                letter-spacing: 1px;
            }
            .content {
                padding: 20px;
            }
            .footer {
                padding: 15px;
                font-size: 11px;
            }
            h1 {
                font-size: 2rem !important;
            }
            p {
                font-size: 0.9rem !important;
            }
        }
        
        @media only screen and (max-width: 480px) {
            .content {
                padding: 15px;
            }
            h1 {
                font-size: 1.8rem !important;
            }
            p {
                font-size: 0.85rem !important;
            }
            .logo {
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <span class="cyma">CYMA</span><span>SPHERE</span>
            </div>
        </div>
        
        <div class="content">
            ${elementHtml}
        </div>
        
        <div class="footer">
            <p>© {new Date().getFullYear()} NNAud.io All rights reserved.</p>
            <p>
                <a href="#">Unsubscribe</a> | 
                <a href="#">Privacy Policy</a> | 
                <a href="#">Contact Us</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  };

  const steps = [
    { number: 1, title: "Template Setup", icon: FaInfoCircle },
    { number: 2, title: "Content", icon: FaEdit },
    { number: 3, title: "Preview", icon: FaEye }
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= steps.length) {
      setCurrentStep(stepNumber);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavingMessage('Saving template...');
    
    try {
      // Generate HTML content from email elements
      const htmlContent = emailElements.map((element: any) => {
        switch (element.type) {
          case 'header':
            return `<h1>${element.content}</h1>`;
          case 'text':
            return `<p>${element.content}</p>`;
          case 'button':
            return `<a href="${element.url || '#'}" style="display: inline-block; padding: 12px 24px; background-color: #6c63ff; color: white; text-decoration: none; border-radius: 6px;">${element.content}</a>`;
          case 'image':
            return `<img src="${element.src}" alt="${element.alt || ''}" style="max-width: 100%; height: auto;" />`;
          case 'divider':
            return `<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />`;
          case 'spacer':
            return `<div style="height: ${element.height || '20px'};"></div>`;
          default:
            return '';
        }
      }).join('');

      // Generate text content
      const textContent = emailElements.map(element => {
        switch (element.type) {
          case 'header':
          case 'text':
            return element.content;
          case 'button':
            return `${element.content}: ${element.url || '#'}`;
          default:
            return '';
        }
      }).filter(Boolean).join('\n\n');

      const templatePayload = {
        ...(isNewTemplate ? {} : { id: templateData.id }),
        name: templateData.name,
        description: templateData.description,
        subject: templateData.subject,
        htmlContent: htmlContent,
        textContent: textContent,
        template_type: templateData.type || 'custom',
        status: templateData.status,
        audienceIds: templateData.audienceIds,
        excludedAudienceIds: templateData.excludedAudienceIds,
        variables: { 
          visual_elements: emailElements // Store visual elements for editor persistence
        }
      };

      console.log('🚀 Sending template payload:', templatePayload);
      console.log('📋 Template data state:', templateData);

      const url = '/api/email-campaigns/templates';
      const method = isNewTemplate ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(templatePayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save template');
      }

      const result = await response.json();
      console.log('Template saved:', result);
      
      if (templateData.status === 'draft') {
        setSavingMessage('Template saved as draft!');
        // Don't redirect when saving as draft, let user continue editing
        setTimeout(() => setSavingMessage(''), 3000);
      } else {
        setSavingMessage(isNewTemplate ? 'Template created successfully!' : 'Template updated successfully!');
        setTimeout(() => {
          router.push('/admin/email-campaigns/templates');
        }, 1500);
      }
      
    } catch (error) {
      console.error('Error saving template:', error);
      setSavingMessage(`Error saving template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSavingMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusToggle = () => {
    setTemplateData(prev => ({
      ...prev,
      status: prev.status === 'active' ? 'draft' : 'active'
    }));
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  // Audience management functions (copied from campaigns)
  const handleAudienceToggle = (audienceId: string, isChecked: boolean) => {
    console.log('🎯 Audience toggle:', { audienceId, isChecked });
    if (isChecked) {
      // Add to included, remove from excluded if present - SIMPLIFIED LOGIC
      setTemplateData(prev => {
        const newData = {
          ...prev,
          audienceIds: [...prev.audienceIds, audienceId], // ✅ Simple append like campaigns
          excludedAudienceIds: prev.excludedAudienceIds.filter(id => id !== audienceId)
        };
        console.log('📝 Updated template data (include):', newData);
        return newData;
      });
    } else {
      // Remove from included
      setTemplateData(prev => {
        const newData = {
          ...prev,
          audienceIds: prev.audienceIds.filter(id => id !== audienceId)
        };
        console.log('📝 Updated template data (remove):', newData);
        return newData;
      });
    }
  };

  const handleAudienceExclude = (audienceId: string) => {
    const isCurrentlyExcluded = templateData.excludedAudienceIds.includes(audienceId);
    
    if (isCurrentlyExcluded) {
      // Remove from excluded
      setTemplateData(prev => ({
        ...prev,
        excludedAudienceIds: prev.excludedAudienceIds.filter(id => id !== audienceId)
      }));
    } else {
      // Add to excluded and remove from included - MATCH CAMPAIGNS EXACTLY
      setTemplateData(prev => ({
        ...prev,
        audienceIds: prev.audienceIds.filter(id => id !== audienceId),
        excludedAudienceIds: [...prev.excludedAudienceIds, audienceId] // ✅ Simple append like campaigns
      }));
    }
  };

  const calculateAudienceStats = () => {
    const includedAudiences = audiences.filter(a => templateData.audienceIds.includes(a.id));
    const excludedAudiences = audiences.filter(a => templateData.excludedAudienceIds.includes(a.id));
    
    const totalIncluded = includedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
    const totalExcluded = excludedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
    
    return {
      includedCount: includedAudiences.length,
      excludedCount: excludedAudiences.length,
      totalIncluded,
      totalExcluded,
      estimatedReach: Math.max(0, totalIncluded - totalExcluded)
    };
  };

  const getFilteredAudiences = () => {
    if (!audienceSearchTerm.trim()) {
      return audiences;
    }
    
    const searchTerm = audienceSearchTerm.toLowerCase();
    return audiences.filter(audience => 
      audience.name.toLowerCase().includes(searchTerm) ||
      audience.description?.toLowerCase().includes(searchTerm) ||
      audience.type.toLowerCase().includes(searchTerm)
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepContent variants={stepVariants} initial="hidden" animate="visible" exit="exit" $isDesignStep={false}>
            <StepTitle>
              <FaInfoCircle />
              Template Setup
            </StepTitle>
            <StepDescription>
              Set up your template details, select your default audience, and configure template settings.
            </StepDescription>
            
            {/* Template Details Section */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaInfoCircle style={{ color: 'var(--primary)' }} />
                Template Details
              </h3>
              <FormGrid>
                <FormGroup>
                  <Label>Template Name</Label>
                  <Input
                    type="text"
                    value={templateData.name}
                    onChange={(e) => setTemplateData({...templateData, name: e.target.value})}
                    placeholder="Enter template name"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Default Email Subject</Label>
                  <Input
                    type="text"
                    value={templateData.subject}
                    onChange={(e) => setTemplateData({...templateData, subject: e.target.value})}
                    placeholder="Enter default email subject line"
                  />
                </FormGroup>
              </FormGrid>
              <FormGrid>
                <FormGroup>
                  <Label>Default Sender Name</Label>
                  <Input
                    type="text"
                    value={templateData.senderName}
                    onChange={(e) => setTemplateData({...templateData, senderName: e.target.value})}
                    placeholder="e.g. Cymasphere Team"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Default Sender Email</Label>
                  <Input
                    type="email"
                    value={templateData.senderEmail}
                    onChange={(e) => setTemplateData({...templateData, senderEmail: e.target.value})}
                    placeholder="e.g. support@cymasphere.com"
                  />
                </FormGroup>
              </FormGrid>
              <FormGrid>
                <FormGroup>
                  <Label>Default Reply-To Email (Optional)</Label>
                  <Input
                    type="email"
                    value={templateData.replyToEmail}
                    onChange={(e) => setTemplateData({...templateData, replyToEmail: e.target.value})}
                    placeholder="e.g. noreply@cymasphere.com"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Default Preheader Text</Label>
                  <Input
                    type="text"
                    value={templateData.preheader}
                    onChange={(e) => setTemplateData({...templateData, preheader: e.target.value})}
                    placeholder="Preview text that appears next to subject line"
                  />
                </FormGroup>
              </FormGrid>
              <FormGroup>
                <Label>Template Description</Label>
                <TextArea
                  value={templateData.description}
                  onChange={(e) => setTemplateData({...templateData, description: e.target.value})}
                  placeholder="Describe the purpose of this template"
                />
              </FormGroup>
              <FormGrid>
                <FormGroup>
                  <Label>Template Type</Label>
                  <Select
                    value={templateData.type}
                    onChange={(e) => setTemplateData({...templateData, type: e.target.value})}
                  >
                    <option value="welcome">Welcome Email</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="promotional">Promotional</option>
                    <option value="transactional">Transactional</option>
                    <option value="announcement">Announcement</option>
                    <option value="event">Event</option>
                  </Select>
                </FormGroup>
              </FormGrid>
            </div>

            {/* Default Audience Selection Section */}
            <AudienceSelectionContainer>
              <h3 style={{ color: 'var(--text)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaUsers style={{ color: 'var(--primary)' }} />
                Select Default Target Audiences
              </h3>
              
              {!audiencesLoading && audiences.length > 0 && (
                <SearchInputContainer>
                  <SearchIcon>
                    <FaSearch />
                  </SearchIcon>
                  <SearchInput
                    type="text"
                    placeholder="Search audiences by name, description, or type..."
                    value={audienceSearchTerm}
                    onChange={(e) => setAudienceSearchTerm(e.target.value)}
                  />
                  {audienceSearchTerm && (
                    <ClearSearchButton
                      onClick={() => setAudienceSearchTerm('')}
                      title="Clear search"
                    >
                      <FaTimes />
                    </ClearSearchButton>
                  )}
                </SearchInputContainer>
              )}
              
              {audiencesLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Loading audiences...
                </div>
              ) : audiences.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: 'var(--text-secondary)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <FaExclamationTriangle style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--accent)' }} />
                  <div>No audiences available. Create an audience first.</div>
                </div>
              ) : (
                <>
                  {getFilteredAudiences().length === 0 && audienceSearchTerm ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem', 
                      color: 'var(--text-secondary)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <FaSearch style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }} />
                      <div>No audiences found matching "{audienceSearchTerm}"</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Try searching for a different term or{' '}
                        <button 
                          onClick={() => setAudienceSearchTerm('')}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--primary)', 
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          clear the search
                        </button>
                      </div>
                    </div>
                  ) : (
                    <AudienceList>
                      {getFilteredAudiences().map((audience) => {
                        const isIncluded = templateData.audienceIds.includes(audience.id);
                        const isExcluded = templateData.excludedAudienceIds.includes(audience.id);
                        
                        return (
                          <AudienceItem 
                            key={audience.id}
                            $isSelected={isIncluded}
                            $isExcluded={isExcluded}
                          >
                            <AudienceCheckbox
                              type="checkbox"
                              id={`audience-${audience.id}`}
                              checked={isIncluded}
                              onChange={(e) => handleAudienceToggle(audience.id, e.target.checked)}
                            />
                            
                            <AudienceInfo onClick={() => handleAudienceToggle(audience.id, !isIncluded)}>
                              <AudienceName>{audience.name}</AudienceName>
                              <AudienceDetails>
                                <AudienceCount>
                                  <FaUsers />
                                  {audience.subscriber_count.toLocaleString()} subscribers
                                </AudienceCount>
                                <AudienceType $type={audience.type}>
                                  {audience.type}
                                </AudienceType>
                              </AudienceDetails>
                            </AudienceInfo>
                            
                            <ExcludeButton
                              $isExcluded={isExcluded}
                              onClick={() => handleAudienceExclude(audience.id)}
                              title={isExcluded ? 'Remove from exclusions' : 'Exclude from template'}
                            >
                              <FaTimes />
                              {isExcluded ? 'Excluded' : 'Exclude'}
                            </ExcludeButton>
                          </AudienceItem>
                        );
                      })}
                    </AudienceList>
                  )}
                  
                  {/* Audience Statistics */}
                  {(templateData.audienceIds.length > 0 || templateData.excludedAudienceIds.length > 0) && (
                    <AudienceStatsContainer>
                      <AudienceStatItem>
                        <AudienceStatValue>{calculateAudienceStats().includedCount}</AudienceStatValue>
                        <AudienceStatLabel>Included</AudienceStatLabel>
                      </AudienceStatItem>
                      <AudienceStatItem>
                        <AudienceStatValue>{calculateAudienceStats().excludedCount}</AudienceStatValue>
                        <AudienceStatLabel>Excluded</AudienceStatLabel>
                      </AudienceStatItem>
                      <AudienceStatItem>
                        <AudienceStatValue>{calculateAudienceStats().totalIncluded.toLocaleString()}</AudienceStatValue>
                        <AudienceStatLabel>Total Included</AudienceStatLabel>
                      </AudienceStatItem>
                      <AudienceStatItem>
                        <AudienceStatValue>{calculateAudienceStats().totalExcluded.toLocaleString()}</AudienceStatValue>
                        <AudienceStatLabel>Total Excluded</AudienceStatLabel>
                      </AudienceStatItem>
                      <AudienceStatItem>
                        <AudienceStatValue style={{ color: 'var(--accent)' }}>
                          {calculateAudienceStats().estimatedReach.toLocaleString()}
                        </AudienceStatValue>
                        <AudienceStatLabel>Estimated Reach</AudienceStatLabel>
                      </AudienceStatItem>
                    </AudienceStatsContainer>
                  )}
                </>
              )}
            </AudienceSelectionContainer>
          </StepContent>
        );

      case 2:
        return (
          <StepContent variants={stepVariants} initial="hidden" animate="visible" exit="exit" $isDesignStep={true}>
            <StepTitle>
              <FaEdit />
              Design Your Template
            </StepTitle>
            <StepDescription>
              Use the drag-and-drop visual editor to design your email template.
            </StepDescription>
            
            <VisualEditor
              emailElements={emailElements}
              setEmailElements={setEmailElements}
              campaignData={{
                senderName: templateData.senderName,
                subject: templateData.subject,
                preheader: templateData.preheader
              }}
              rightPanelExpanded={true}
            />
          </StepContent>
        );

      case 3:
        return (
          <StepContent variants={stepVariants} initial="hidden" animate="visible" exit="exit" $isDesignStep={false}>
            <StepTitle>
              <FaEye />
              Preview Your Template
            </StepTitle>
            <StepDescription>
              Review how your template will look when sent to subscribers.
            </StepDescription>
            
            {/* Template Summary */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaInfoCircle style={{ color: 'var(--primary)' }} />
                Template Summary
              </h3>
              <FormGrid>
                <div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px' }}>
                    <p><strong>Name:</strong> {templateData.name || "Untitled Template"}</p>
                    <p><strong>Subject:</strong> {templateData.subject || "No subject"}</p>
                    <p><strong>Type:</strong> {templateData.type || "Custom"}</p>
                    <p><strong>Status:</strong> {templateData.status === 'active' ? '🟢 Active' : '🟡 Draft'}</p>
                    <p><strong>Default Audiences:</strong> {
                      templateData.audienceIds.length === 0 
                        ? "No default audiences selected" 
                        : templateData.audienceIds.map(id => {
                            const audience = audiences.find(a => a.id === id);
                            return audience ? audience.name : 'Unknown';
                          }).join(', ')
                    }</p>
                  </div>
                </div>
                
                <div>
                  <PreviewSection>
                    <PreviewTitle>
                      <FaEye />
                      Template Preview
                      <ExpandPreviewButton 
                        onClick={() => setShowPreviewModal(true)}
                        style={{ marginLeft: 'auto' }}
                      >
                        <FaExpandArrowsAlt />
                        Full Screen Preview
                      </ExpandPreviewButton>
                    </PreviewTitle>
                    <div style={{ 
                      position: 'relative',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden'
                    }}>
                      {/* Email preview with subtle shadow */}
                      <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                        overflow: 'hidden',
                        maxHeight: '280px',
                        position: 'relative'
                      }}>
                        <iframe
                          srcDoc={generatePreviewHtml()}
                          style={{
                            width: '100%',
                            height: '380px',
                            border: 'none',
                            transform: 'scale(0.7)',
                            transformOrigin: 'top left',
                            pointerEvents: 'none'
                          }}
                          title="Template Preview"
                        />
                        
                        {/* Fade overlay to indicate more content */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '60px',
                          background: 'linear-gradient(transparent, rgba(255, 255, 255, 0.95))',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          paddingBottom: '0.75rem'
                        }}>
                          <div style={{
                            background: 'rgba(0, 0, 0, 0.1)',
                            color: '#666',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backdropFilter: 'blur(10px)'
                          }}>
                            Scroll to see more content
                          </div>
                        </div>
                      </div>

                      {/* Preview info */}
                      <div style={{
                        marginTop: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FaDesktop style={{ color: 'var(--primary)' }} />
                          Desktop View
                        </span>
                        <span>•</span>
                        <span>70% Scale</span>
                      </div>
                    </div>
                  </PreviewSection>
                </div>
              </FormGrid>
            </div>
          </StepContent>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <NextSEO
        title={isNewTemplate ? "Create New Template" : `Edit Template: ${templateData.name}`}
        description={isNewTemplate ? "Create a new email template with visual editor" : "Edit email template with visual editor"}
      />
      
      <CreateContainer $isDesignStep={currentStep === 2}>
        <Breadcrumbs>
          <BreadcrumbLink href="/admin/email-campaigns">Email Campaigns</BreadcrumbLink>
          <FaChevronRight />
          <BreadcrumbLink href="/admin/email-campaigns/templates">Templates</BreadcrumbLink>
          <FaChevronRight />
          <BreadcrumbCurrent>{isNewTemplate ? "Create Template" : `Edit: ${templateData.name}`}</BreadcrumbCurrent>
        </Breadcrumbs>

        <Header>
          <Title>
            <FaFileAlt />
            {isNewTemplate ? "Create New Template" : "Edit Template"}
          </Title>
          <Subtitle>
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
          </Subtitle>
        </Header>

        <StepIndicator>
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <Step
                active={currentStep === step.number}
                completed={currentStep > step.number}
                clickable={true}
                onClick={() => goToStep(step.number)}
              >
                <step.icon />
                {step.title}
              </Step>
              {index < steps.length - 1 && (
                <StepConnector completed={currentStep > step.number} />
              )}
            </React.Fragment>
          ))}
        </StepIndicator>

        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>

        {/* Status Toggle */}
        <StatusToggleContainer>
          <StatusLabel $isActive={templateData.status === 'active'}>
            {templateData.status === 'active' ? 'Active' : 'Draft'}
          </StatusLabel>
          <StatusToggle 
            $isActive={templateData.status === 'active'} 
            onClick={handleStatusToggle}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {templateData.status === 'active' 
              ? 'Template is active and available for automations' 
              : 'Template is a draft and not available for automations'}
          </span>
        </StatusToggleContainer>

        <NavigationButtons>
          <NavButton onClick={() => router.back()}>
            <FaArrowLeft />
            Back to Templates
          </NavButton>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {currentStep > 1 && (
              <NavButton onClick={prevStep}>
                <FaArrowLeft />
                Previous
              </NavButton>
            )}
            
            {currentStep < steps.length ? (
              <>
                {/* Add Save button for Design step (step 2) */}
                {currentStep === 2 && (
                  <NavButton onClick={handleSave} disabled={isSaving}>
                    <FaSave />
                    {isSaving ? 'Saving...' : 'Save Template'}
                  </NavButton>
                )}
                <NavButton variant="primary" onClick={nextStep}>
                  Next
                  <FaArrowRight />
                </NavButton>
              </>
            ) : (
              <NavButton variant="primary" onClick={handleSave} disabled={isSaving}>
                <FaSave />
                {isSaving ? 'Saving...' : (isNewTemplate ? 'Create Template' : 'Save Template')}
              </NavButton>
            )}
          </div>
        </NavigationButtons>

        {/* Saving Feedback Message */}
        <AnimatePresence>
          {savingMessage && (
            <motion.div
              style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '1rem 1.5rem',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                zIndex: 1000,
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
                backgroundColor: savingMessage.includes('Error') ? '#dc3545' : '#28a745'
              }}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ duration: 0.3 }}
            >
              {savingMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Screen Preview Modal */}
        <AnimatePresence>
          {showPreviewModal && (
            <motion.div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#0a0a0a',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10000,
                padding: 0
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreviewModal(false)}
            >
              <motion.div
                style={{
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  border: 'none',
                  boxShadow: 'none',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.5rem 2rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)',
                  backdropFilter: 'blur(20px)',
                  flexShrink: 0
                }}>
                  <h3 style={{
                    color: '#ffffff',
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    📧 {templateData.subject || 'Template Preview'}
                  </h3>
                  
                  {/* Device Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.25rem'
                    }}>
                      <button
                        onClick={() => setPreviewDevice('desktop')}
                        style={{
                          background: previewDevice === 'desktop' ? 'var(--primary)' : 'transparent',
                          border: 'none',
                          color: previewDevice === 'desktop' ? 'white' : 'var(--text-secondary)',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.9rem'
                        }}
                      >
                        <FaDesktop />
                        Desktop
                      </button>
                      <button
                        onClick={() => setPreviewDevice('mobile')}
                        style={{
                          background: previewDevice === 'mobile' ? 'var(--primary)' : 'transparent',
                          border: 'none',
                          color: previewDevice === 'mobile' ? 'white' : 'var(--text-secondary)',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.9rem'
                        }}
                      >
                        <FaMobileAlt />
                        Mobile
                      </button>
                    </div>
                    
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                                {/* Preview Body */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflow: 'auto',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)'
                }}>
                  <div style={{
                    width: previewDevice === 'mobile' ? '375px' : '600px',
                    maxWidth: '100%',
                    transition: 'all 0.3s ease',
                    paddingBottom: '2rem' // Extra padding for better scrolling
                  }}>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      overflow: 'visible',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <iframe
                        srcDoc={generatePreviewHtml()}
                        style={{
                          width: '100%',
                          height: '800px', // Fixed height that allows for longer content
                          border: 'none',
                          display: 'block'
                        }}
                        scrolling="yes"
                        title="Full Template Preview"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div style={{
                  padding: '1rem 2rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0
                }}>
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    Preview Mode: {previewDevice === 'mobile' ? '📱 Mobile (375px)' : '🖥️ Desktop (600px)'}
                  </div>
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    Press ESC or click outside to close
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CreateContainer>
    </>
  );
}

export default EditTemplatePage; 