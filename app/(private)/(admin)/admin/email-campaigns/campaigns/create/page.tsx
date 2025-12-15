"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import NextSEO from "@/components/NextSEO";
import { useTranslation } from "react-i18next";
import useLanguage from "@/hooks/useLanguage";
import { 
  FaEnvelopeOpen, 
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaUsers,
  FaPalette,
  FaEdit,
  FaCalendarAlt,
  FaEye,
  FaSave,
  FaPaperPlane,
  FaChevronRight,
  FaInfoCircle,
  FaFilter,
  FaTag,
  FaImage,
  FaCode,
  FaClock,
  FaPlay,
  FaHeading,
  FaFont,
  FaMousePointer,
  FaDivide,
  FaShareAlt,
  FaExpandArrowsAlt,
  FaColumns,
  FaVideo,
  FaCog,
  FaDesktop,
  FaMobileAlt,
  FaEnvelope,
  FaPaintBrush,
  FaTextHeight,
  FaPuzzlePiece,
  FaTimes,
  FaExclamationTriangle,
  FaSearch,
  FaGlobe,
  FaTabletAlt,
  FaCopy,
  FaTrash
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { getCampaign, getAudiences, getTemplates, getTemplate, calculateReach, sendCampaign, previewEmail } from "@/app/actions/email-campaigns";
import styled, { keyframes, css } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import LoadingComponent from "@/components/common/LoadingComponent";
import Link from "next/link";
import VisualEditor from "@/components/email-campaigns/VisualEditor";

// Keyframes for spinner animation
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(108, 99, 255, 0.3);
  border-top: 2px solid var(--accent);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

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

const Step = styled.div<{ $active: boolean; $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  ${props => {
    if (props.$completed) {
      return `
        background-color: rgba(40, 167, 69, 0.2);
        color: #28a745;
        border: 2px solid #28a745;
      `;
    } else if (props.$active) {
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

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
`;

const StepConnector = styled.div<{ $completed: boolean }>`
  width: 40px;
  height: 2px;
  background-color: ${props => props.$completed ? '#28a745' : 'rgba(255, 255, 255, 0.1)'};
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

const StepTitle = styled.h2`
  font-size: 1.8rem;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: var(--primary);
  }
`;

const StepDescription = styled.p`
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 1rem;
  line-height: 1.6;
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

const AudienceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const AudienceCard = styled.div<{ selected: boolean }>`
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  background-color: ${props => props.selected ? 'rgba(108, 99, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    background-color: rgba(108, 99, 255, 0.05);
  }
`;

const AudienceTitle = styled.h4`
  color: var(--text);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AudienceDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const AudienceStats = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const TemplateCard = styled.div<{ selected: boolean }>`
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  background-color: ${props => props.selected ? 'rgba(108, 99, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    border-color: var(--primary);
    background-color: rgba(108, 99, 255, 0.05);
  }
`;

const TemplatePreview = styled.div`
  height: 150px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.9rem;
`;

const TemplateInfo = styled.div`
  padding: 1rem;
`;

const TemplateTitle = styled.h4`
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const TemplateDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.8rem;
  padding-bottom: 0.5rem;
`;

const ContentEditor = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  min-height: 400px;
  margin-bottom: 2rem;
`;

const EditorToolbar = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
`;

const ToolbarButton = styled.button<{ $active?: boolean }>`
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.$active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$active ? 'white' : 'var(--text-secondary)'};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;

  &:hover {
    background-color: ${props => props.$active ? 'var(--accent)' : 'rgba(255, 255, 255, 0.2)'};
    color: ${props => props.$active ? 'white' : 'var(--text)'};
  }
`;

const EditorContent = styled.div`
  padding: 1rem;
  min-height: 300px;
`;

const ScheduleOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ScheduleOption = styled.div<{ selected: boolean }>`
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  background-color: ${props => props.selected ? 'rgba(108, 99, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;

  &:hover {
    border-color: var(--primary);
    background-color: rgba(108, 99, 255, 0.05);
  }
`;

const ScheduleIcon = styled.div`
  font-size: 2rem;
  color: var(--primary);
  margin-bottom: 1rem;
`;

const ScheduleTitle = styled.h4`
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const ScheduleDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
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

const PreviewSection = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
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

const PreviewContent = styled.div`
  background-color: white;
  color: #333;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const ContentBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  text-align: center;

  &:hover {
    border-color: var(--primary);
    background-color: rgba(108, 99, 255, 0.05);
  }

  span:first-child {
    font-size: 1.2rem;
  }

  span:last-child {
    color: var(--text-secondary);
    font-weight: 500;
  }
`;

const VariableButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  font-family: 'Courier New', monospace;
  text-align: left;

  &:hover {
    border-color: var(--primary);
    background-color: rgba(108, 99, 255, 0.05);
    color: var(--text);
  }
`;

const DragElement = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  border: 2px solid transparent;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(10px);
  cursor: grab;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 10px;
  }

  &:hover {
    border-color: var(--primary);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 10px 30px rgba(108, 99, 255, 0.3);
    
    &:before {
      opacity: 0.1;
    }
  }

  &:active {
    cursor: grabbing;
    transform: translateY(-1px) scale(0.98);
  }

  span:first-child {
    font-size: 1.4rem;
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }

  span:last-child {
    color: var(--text);
    font-weight: 600;
    z-index: 1;
    letter-spacing: 0.5px;
  }
`;

const ViewToggle = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 25px;
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, var(--primary), var(--accent))' 
    : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$active ? 'white' : 'var(--text-secondary)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: ${props => props.$active 
      ? 'linear-gradient(135deg, var(--accent), var(--primary))' 
      : 'rgba(255, 255, 255, 0.15)'};
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);

    &:before {
      left: 100%;
    }
  }
`;

const EmailCanvas = styled.div`
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  min-height: 600px;
  position: relative;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.1);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.05"><circle cx="30" cy="30" r="1"/></g></svg>');
    border-radius: 16px;
    pointer-events: none;
  }
`;

const EmailContainer = styled.div`
  width: 600px;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.2), 0 12px 30px rgba(0, 0, 0, 0.15);
  }
`;

const EmailHeader = styled.div`
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
  position: relative;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(108, 99, 255, 0.3), transparent);
  }
`;

const EmailBody = styled.div`
  padding: 2.5rem;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
`;

const EmailFooter = styled.div`
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  border-top: 1px solid #dee2e6;
  position: relative;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(108, 99, 255, 0.3), transparent);
  }
`;

const EmailBlock = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 2px dashed transparent;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;

  &:hover {
    border-color: var(--primary);
    background: linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(108, 99, 255, 0.02) 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.15);
  }

  &:before {
    content: '✏️';
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-size: 1rem;
  }

  &:hover:before {
    opacity: 1;
  }
`;

const EmailButton = styled.a`
  display: inline-block;
  padding: 1.25rem 2.5rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 15px 40px rgba(108, 99, 255, 0.4);
    background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);

    &:before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-2px) scale(1.02);
  }
`;

const DropZone = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 4rem;
  border: 3px dashed #ccc;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  color: #666;
  font-size: 1rem;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(108, 99, 255, 0.02) 100%);
    opacity: 0;
    transition: opacity 0.4s ease;
    border-radius: 13px;
  }

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(108, 99, 255, 0.2);

    &:before {
      opacity: 1;
    }
  }

  span:first-child {
    font-size: 3rem;
    opacity: 0.6;
    transition: all 0.4s ease;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }

  &:hover span:first-child {
    opacity: 1;
    transform: scale(1.1);
  }

  span:last-child {
    font-weight: 600;
    letter-spacing: 0.5px;
  }
`;

const VariableTag = styled.div`
  padding: 0.75rem 1rem;
  border: 2px solid transparent;
  border-radius: 25px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 23px;
  }

  &:hover {
    border-color: var(--primary);
    color: var(--text);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.25);

    &:before {
      opacity: 0.15;
    }
  }
`;

const PreviewButton = styled.button`
  padding: 1rem;
  border: 2px solid transparent;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  font-weight: 600;
  width: 100%;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 10px;
  }

  &:hover {
    border-color: var(--primary);
    color: var(--text);
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(108, 99, 255, 0.3);

    &:before {
      opacity: 0.1;
    }
  }

  &:active {
    transform: translateY(-1px);
  }
`;

const PreviewModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
  z-index: 10000;
  padding: 0;
`;

const PreviewModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: none;
  box-shadow: none;
  display: flex;
  flex-direction: column;
`;

const PreviewModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%);
  backdrop-filter: blur(20px);
  flex-shrink: 0;
`;

const PreviewModalTitle = styled.h3`
  color: #ffffff;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  &:before {
    content: '📧';
    font-size: 1.5rem;
  }
`;

const PreviewModalClose = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 12px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`;

const PreviewModalBody = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 0;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  display: flex;
  flex-direction: column;
`;

const PreviewEmailFrame = styled.div`
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
`;

const ExpandPreviewButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(108, 99, 255, 0.4);
    background: linear-gradient(135deg, var(--accent), var(--primary));

    &:before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);
  }
`;

const DeviceToggleContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const DeviceToggle = styled.button<{ $active: boolean }>`
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.5rem !important;
  padding: 0.75rem 1rem !important;
  border: none;
  border-radius: 8px;
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, var(--primary), var(--accent))' 
    : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$active ? 'white' : 'var(--text-primary)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.85rem;
  font-weight: 600;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid ${props => props.$active ? 'transparent' : 'rgba(255, 255, 255, 0.15)'};
  white-space: nowrap !important;
  line-height: 1 !important;
  
  svg {
    display: inline-block !important;
    vertical-align: middle !important;
    flex-shrink: 0 !important;
    margin: 0 !important;
    float: none !important;
  }
  
  * {
    display: inline !important;
    vertical-align: middle !important;
  }

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: ${props => props.$active 
      ? 'linear-gradient(135deg, var(--accent), var(--primary))' 
      : 'rgba(255, 255, 255, 0.15)'};
    color: ${props => props.$active ? 'white' : 'var(--text-primary)'};
    border-color: ${props => props.$active ? 'transparent' : 'rgba(255, 255, 255, 0.25)'};
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);

    &:before {
      left: 100%;
    }
  }
`;

const PreviewContainer = styled.div<{ $device: 'mobile' | 'tablet' | 'desktop' }>`
  width: ${props => {
    switch (props.$device) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
      default: return '100%';
    }
  }};
  max-width: ${props => {
    switch (props.$device) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return 'min(1400px, calc(100vw - 4rem))';
      default: return 'min(1400px, calc(100vw - 4rem))';
    }
  }};
  margin: 0 auto;
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
`;

const DeviceFrame = styled.div<{ $device: 'mobile' | 'tablet' | 'desktop' }>`
  position: relative;
  background: ${props => props.$device === 'desktop' ? 'transparent' : '#000'};
  border-radius: ${props => {
    switch (props.$device) {
      case 'mobile': return '25px';
      case 'tablet': return '20px';
      case 'desktop': return '8px';
      default: return '8px';
    }
  }};
  padding: ${props => {
    switch (props.$device) {
      case 'mobile': return '20px 8px';
      case 'tablet': return '15px 10px';
      case 'desktop': return '0';
      default: return '0';
    }
  }};

  &:before {
    content: '';
    position: absolute;
    top: ${props => props.$device === 'mobile' ? '8px' : '6px'};
    left: 50%;
    transform: translateX(-50%);
    width: ${props => {
      switch (props.$device) {
        case 'mobile': return '60px';
        case 'tablet': return '80px';
        case 'desktop': return '0px';
        default: return '0px';
      }
    }};
    height: ${props => {
      switch (props.$device) {
        case 'mobile': return '4px';
        case 'tablet': return '3px';
        case 'desktop': return '0px';
        default: return '0px';
      }
    }};
    background: #333;
    border-radius: 2px;
    display: ${props => props.$device === 'desktop' ? 'none' : 'block'};
  }
`;

const SidebarPanel = styled.div`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    border-color: rgba(255, 255, 255, 0.15);
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const PanelIcon = styled.div`
  font-size: 1.2rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
`;

const PanelTitle = styled.h4`
  color: var(--text);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin: 0;
`;

const ViewToggleContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
  backdrop-filter: blur(10px);
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ControlLabel = styled.label`
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const ColorInput = styled.input`
  width: 100%;
  height: 48px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    transform: scale(1.02);
  }
`;

const ControlSelect = styled.select`
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  option {
    background-color: var(--card-bg);
    color: var(--text);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const SocialLink = styled.a`
  color: #6c63ff;
  text-decoration: none;
  margin: 0 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    color: var(--accent);
    transform: translateY(-1px);
  }
`;

const FooterLink = styled.a`
  color: #999;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #6c63ff;
  }
`;

const ToggleSwitch = styled.div`
  position: relative;
  width: 60px;
  height: 32px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;

  &:before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  &:hover {
    border-color: var(--primary);
    transform: scale(1.05);
  }

  &.active {
    background: linear-gradient(135deg, var(--primary), var(--accent));
    border-color: var(--primary);

    &:before {
      transform: translateX(28px);
      background: white;
    }
  }
`;

const DroppableArea = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isDragOver',
})<{ isDragOver: boolean }>`
  min-height: 50px;
  border: 2px dashed ${props => props.isDragOver ? 'var(--primary)' : 'transparent'};
  border-radius: 12px;
  background: ${props => props.isDragOver ? 'rgba(108, 99, 255, 0.1)' : 'transparent'};
  transition: all 0.3s ease;
  position: relative;
  margin: 1rem 0;

  &:before {
    content: '${props => props.isDragOver ? '✨ Drop here to add content' : ''}';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--primary);
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
  }
`;

const ContentElementsBar = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  margin-bottom: 1.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(90deg, var(--primary), var(--accent));
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(90deg, var(--accent), var(--primary));
  }
`;

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
  min-width: 0; /* Allow text truncation */
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

const ContentElementButton = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  min-width: 80px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  cursor: grab;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.8rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 10px;
  }

  &:hover {
    border-color: var(--primary);
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 10px 30px rgba(108, 99, 255, 0.3);
    
    &:before {
      opacity: 0.1;
    }
  }

  &:active {
    cursor: grabbing;
    transform: translateY(-1px) scale(0.98);
  }

  .icon {
    font-size: 1.4rem;
    color: var(--primary);
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }

  .label {
    color: var(--text);
    font-weight: 600;
    z-index: 1;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }
`;

const DragPreview = styled.div`
  position: fixed;
  top: -1000px;
  left: -1000px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const EmailElement = styled.div.withConfig({
  shouldForwardProp: (prop) => !['selected', 'editing'].includes(prop),
})<{ selected?: boolean; editing?: boolean }>`
  margin: 1rem 0;
  padding: 1rem;
  border: 2px solid ${props => {
    if (props.editing) return 'var(--accent)';
    if (props.selected) return 'var(--primary)';
    return 'transparent';
  }};
  border-radius: 8px;
  background: ${props => {
    if (props.editing) return 'rgba(255, 193, 7, 0.1)';
    if (props.selected) return 'rgba(108, 99, 255, 0.1)';
    return 'rgba(255, 255, 255, 0.02)';
  }};
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: ${props => props.editing ? 'var(--accent)' : 'var(--primary)'};
    background: ${props => {
      if (props.editing) return 'rgba(255, 193, 7, 0.15)';
      return 'rgba(108, 99, 255, 0.08)';
    }};
  }

  &:after {
    content: ${props => {
      if (props.editing) return '"✏️ Editing - Press Enter to save, Esc to cancel"';
      if (props.selected) return '"🎯 Selected - Double-click to edit"';
      return '"👆 Click to select, double-click to edit"';
    }};
    position: absolute;
    top: -30px;
    left: 0;
    right: 0;
    font-size: 0.75rem;
    color: ${props => {
      if (props.editing) return 'var(--accent)';
      if (props.selected) return 'var(--primary)';
      return 'var(--text-secondary)';
    }};
    opacity: ${props => (props.selected || props.editing) ? '1' : '0'};
    transition: opacity 0.3s ease;
    pointer-events: none;
    text-align: center;
    font-weight: 500;
  }

  &:hover:after {
    opacity: 1;
  }
`;

// Editable Text Component
const EditableText = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isEditing',
})<{ isEditing: boolean }>`
  outline: none;
  ${props => props.isEditing ? `
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid var(--accent);
    border-radius: 4px;
    padding: 4px 8px;
    color: #333;
  ` : ''}
`;

// Audience interface
interface Audience {
  id: string;
  name: string;
  description: string;
  subscriber_count: number;
  type: 'static' | 'dynamic';
}

interface Template {
  id: string;
  name: string;
  description: string;
  subject: string;
  template_type: string;
  status: string;
  html_content: string;
  text_content: string;
  variables: any;
  created_at: string;
  updated_at: string;
}



// Templates are now loaded from the database via API

interface CampaignData {
  name: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  preheader: string;
  description: string;
  brandHeader: string; // Editable brand header content
  audienceIds: string[]; // Array of selected audience IDs
  excludedAudienceIds: string[]; // Array of excluded audience IDs
  template: string;
  content: string;
  scheduleType: string;
  scheduleDate: string;
  scheduleTime: string;
}

// Campaign email elements will be loaded from the database when editing existing campaigns

const SendingFeedback = styled(motion.div)<{ type?: 'success' | 'error' | 'info' }>`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  z-index: 10001;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  
  ${props => {
    switch (props.type) {
      case 'success':
        return 'background-color: #28a745;';
      case 'error':
        return 'background-color: #dc3545;';
      default:
        return 'background-color: var(--primary);';
    }
  }}
`;

const ResultModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
`;

const ModalContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    color: var(--primary);
  }
`;

const ModalStats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const LoadingSpinner = styled(motion.div)`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  margin-right: 0.5rem;
`;

// Helper function to normalize short hex color codes to full 6-digit format
const normalizeHexColor = (color: string | undefined): string | undefined => {
  if (!color || typeof color !== 'string') return color;
  // Match 3-digit hex codes like #333, #555, #fff
  const shortHexMatch = color.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHexMatch) {
    // Expand to 6 digits: #333 -> #333333
    const hex = shortHexMatch[1];
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return color;
};

// Helper function to normalize color values in an element
const normalizeElementColors = (element: any): any => {
  if (!element) return element;
  const normalized = { ...element };
  if (normalized.textColor) {
    normalized.textColor = normalizeHexColor(normalized.textColor);
  }
  if (normalized.backgroundColor) {
    normalized.backgroundColor = normalizeHexColor(normalized.backgroundColor);
  }
  return normalized;
};

function CreateCampaignPage() {
  // Current year variable for use throughout the component
  const currentYear = new Date().getFullYear();
  
  // Helper function to format scheduled time consistently
  const formatScheduledTime = (isoString: string | null | undefined): string => {
    if (!isoString) return 'Not scheduled';
    const scheduledDate = new Date(isoString);
    return scheduledDate.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };
  
  // Helper to get the scheduled time from campaign result (single source of truth)
  const getScheduledTime = (result: any): string | null => {
    const time = result?.scheduledFor || result?.stats?.scheduledDateTime || null;
    if (result?.status === 'scheduled' && time) {
      console.log('🕐 getScheduledTime:', {
        scheduledFor: result?.scheduledFor,
        statsScheduledDateTime: result?.stats?.scheduledDateTime,
        selectedTime: time,
        formatted: formatScheduledTime(time)
      });
    }
    return time;
  };
  
  // Add audience state
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(true);
  const [audienceSearchTerm, setAudienceSearchTerm] = useState('');
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const campaignLoadedRef = useRef(false);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const templateId = searchParams.get('template');
  const shouldPrefill = searchParams.get('prefill') === 'true';
  const stepParam = searchParams.get('step');
  const scheduleTypeParam = searchParams.get('scheduleType');
  const isEditMode = Boolean(editId);
  
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => {
    const step = stepParam ? parseInt(stepParam, 10) : 1;
    return step >= 1 && step <= 3 ? step : 1;
  });
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
  const [currentView, setCurrentView] = useState<'desktop' | 'mobile' | 'text'>('desktop');
  
  // Campaign sending state
  const [isSending, setIsSending] = useState(false);
  const [sendingMessage, setSendingMessage] = useState('');
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop' | 'html'>('desktop');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const copyPreviewHtml = async () => {
    try {
      const html = generatePreviewHtml();
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(html);
      } else {
        const ta = document.createElement('textarea');
        ta.value = html;
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setSendingMessage('HTML copied to clipboard');
      setTimeout(() => setSendingMessage(''), 2500);
    } catch (e) {
      setSendingMessage('Failed to copy HTML');
      setTimeout(() => setSendingMessage(''), 2500);
    }
  };

  const handleSendTestEmail = async () => {
    const email = (testEmail || '').trim();
    const isValid = /.+@.+\..+/.test(email);
    if (!isValid) {
      setSendingMessage('Enter a valid email address');
      setTimeout(() => setSendingMessage(''), 2500);
      return;
    }

    // 🔍 DEBUG: Check padding values before sending test email
    console.log("🎯 TEST EMAIL PADDING DEBUG - First element before test send:", {
      id: emailElements[0]?.id,
      type: emailElements[0]?.type,
      paddingTop: emailElements[0]?.paddingTop,
      paddingBottom: emailElements[0]?.paddingBottom,
      paddingLeft: emailElements[0]?.paddingLeft,
      paddingRight: emailElements[0]?.paddingRight,
      fullWidth: emailElements[0]?.fullWidth,
      allKeys: Object.keys(emailElements[0] || {})
    });

    try {
      setIsSending(true);
      setSendingMessage(`Sending test to ${email}...`);
      const result = await sendCampaign({
        // Pass current campaign id when editing so "View in browser" gets a real UUID
        campaignId: editId || undefined,
        name: campaignData.name || 'Test Campaign',
        subject: campaignData.subject || 'Test',
        brandHeader: campaignData.brandHeader,
        audienceIds: campaignData.audienceIds || [],
        excludedAudienceIds: campaignData.excludedAudienceIds || [],
        emailElements,
        scheduleType: 'draft',
        testEmail: email
      });
      if (result.success) {
        setSendingMessage(`Test email sent to ${email}`);
        setShowTestModal(false);
      } else {
        setSendingMessage(`Error sending test: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setSendingMessage(`Error sending test: ${err?.message || String(err)}`);
    } finally {
      setIsSending(false);
      setTimeout(() => setSendingMessage(''), 4000);
    }
  };
  
  // Reach calculation state
  const [reachData, setReachData] = useState<{
    totalIncluded: number;
    totalExcluded: number;
    estimatedReach: number;
    includedCount: number;
    excludedCount: number;
    isLoading: boolean;
  }>({
    totalIncluded: 0,
    totalExcluded: 0,
    estimatedReach: 0,
    includedCount: 0,
    excludedCount: 0,
    isLoading: false
  });
  
  // Initialize email elements with default content
  const getInitialEmailElements = () => {
    return [
      { 
        id: 'brand-header', 
        type: 'brand-header', 
        content: 'CYMASPHERE', 
        fullWidth: true, 
        backgroundColor: 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)',
        textColor: '#ffffff',
        paddingTop: 16, 
        paddingBottom: 16 
      },
      { 
        id: 'header', 
        type: 'header', 
        content: 'Welcome to Cymasphere! 🎵', 
        fullWidth: false, 
        fontSize: '2.5rem', 
        fontWeight: '800', 
        textAlign: 'center', 
        textColor: '#333', 
        paddingTop: 16, 
        paddingBottom: 8 
      },
      { 
        id: 'text1', 
        type: 'text', 
        content: 'Hi {{firstName}}, Thank you for joining our community of music creators. We\'re excited to help you create amazing music with our powerful tools.', 
        fullWidth: false, 
        fontSize: '16px', 
        fontWeight: 'normal', 
        textAlign: 'left', 
        textColor: '#555', 
        paddingTop: 0, 
        paddingBottom: 16 
      },
      { 
        id: 'footer', 
        type: 'footer', 
        fullWidth: true,
        paddingTop: 0,
        paddingBottom: 0,
        backgroundColor: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
        textColor: '#ffffff',
        socialLinks: [
          { platform: 'facebook', url: 'https://www.facebook.com/cymasphere' },
          { platform: 'twitter', url: 'https://x.com/cymasphere' },
          { platform: 'instagram', url: 'https://www.instagram.com/cymasphere/' },
          { platform: 'youtube', url: 'https://www.youtube.com/@cymasphere' },
          { platform: 'discord', url: 'https://discord.gg/gXGqqYR47B' }
        ],
        footerText: `© ${new Date().getFullYear()} NNAud.io All rights reserved.`,
        unsubscribeText: 'Unsubscribe',
        unsubscribeUrl: 'https://cymasphere.com/unsubscribe?email={{email}}',
        privacyText: 'Privacy Policy',
        privacyUrl: 'https://cymasphere.com/privacy-policy',
        termsText: 'Terms of Service',
        termsUrl: 'https://cymasphere.com/terms-of-service'
      }
    ];
  };

  const [emailElements, setEmailElements] = useState<any[]>(getInitialEmailElements());
  
  // Function to ensure all elements have proper default properties
  const ensureElementProperties = (elements: any[]) => {
    return elements.map(element => {
      // Only set properties that are actually missing, preserve existing values
      const baseProps = {
        paddingTop: element.paddingTop !== undefined ? element.paddingTop : 16,
        paddingBottom: element.paddingBottom !== undefined ? element.paddingBottom : 16,
        fullWidth: element.fullWidth !== undefined ? element.fullWidth : false
      };
      
      switch (element.type) {
        case 'button':
          return {
            ...element,
            ...baseProps,
            textColor: element.textColor !== undefined ? element.textColor : '#ffffff',
            backgroundColor: element.backgroundColor !== undefined ? element.backgroundColor : 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)',
            fontSize: element.fontSize !== undefined ? element.fontSize : '1rem',
            fontWeight: element.fontWeight !== undefined ? element.fontWeight : '700',
            textAlign: element.textAlign !== undefined ? element.textAlign : 'center',
            fontFamily: element.fontFamily !== undefined ? element.fontFamily : 'Arial, sans-serif',
            lineHeight: element.lineHeight !== undefined ? element.lineHeight : '1.2'
          };
        case 'header':
          return {
            ...element,
            ...baseProps,
            fontSize: element.fontSize !== undefined ? element.fontSize : '2.5rem',
            fontWeight: element.fontWeight !== undefined ? element.fontWeight : '800',
            textAlign: element.textAlign !== undefined ? element.textAlign : 'center',
            textColor: element.textColor !== undefined ? element.textColor : '#333'
          };
        case 'text':
          return {
            ...element,
            ...baseProps,
            fontSize: element.fontSize !== undefined ? element.fontSize : '16px',
            fontWeight: element.fontWeight !== undefined ? element.fontWeight : 'normal',
            textAlign: element.textAlign !== undefined ? element.textAlign : 'left',
            textColor: element.textColor !== undefined ? element.textColor : '#555'
          };
        default:
          return { ...element, ...baseProps };
      }
    });
  };
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  
  // Initialize campaign data based on edit mode or template
  const getInitialCampaignData = (): CampaignData => {
    return {
    name: "",
    subject: "",
      senderName: "Cymasphere",
      senderEmail: "support@cymasphere.com",
      replyToEmail: "",
    preheader: "",
    description: "",
      brandHeader: "CYMASPHERE", // Default brand header text
      audienceIds: [],
      excludedAudienceIds: [],
    template: "",
    content: "",
    scheduleType: scheduleTypeParam || "immediate", // Use URL parameter or default to "Send Now"
    scheduleDate: "",
    scheduleTime: "09:00" // Default send time to 9:00 AM
    };
  };
  
  const [campaignData, setCampaignData] = useState<CampaignData>(getInitialCampaignData());
  
  const { t } = useTranslation();
  const { isLoading: languageLoading } = useLanguage();
  
  // Preview state - moved here for consistent hook ordering (before any early returns)
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);


  
  // Ensure all elements have proper properties when component mounts
  // Removed this useEffect as it was interfering with fullWidth property updates
  // useEffect(() => {
  //   setEmailElements(prev => ensureElementProperties(prev));
  // }, []);

  // Define reach calculation function using useCallback so it can be used in useEffect
  const updateReachCalculation = useCallback(async () => {
    console.log(`🎯🎯🎯 =====EDIT MODAL DEBUG=====`);
    console.log(`Campaign data audienceIds:`, campaignData.audienceIds);
    console.log(`Campaign data excludedAudienceIds:`, campaignData.excludedAudienceIds);
    console.log(`Available audiences in edit modal:`, audiences.map(a => ({ id: a.id, name: a.name, count: a.subscriber_count })));
    
    if (campaignData.audienceIds.length === 0) {
      console.log(`🎯 Edit modal: No audiences selected, setting reach to 0`);
      setReachData({
        totalIncluded: 0,
        totalExcluded: 0,
        estimatedReach: 0,
        includedCount: 0,
        excludedCount: 0,
        isLoading: false
      });
      return;
    }

    setReachData(prev => ({ ...prev, isLoading: true }));

    try {
      console.log(`🎯 Edit modal calling reach API with:`, {
        audienceIds: campaignData.audienceIds,
        excludedAudienceIds: campaignData.excludedAudienceIds
      });

      const data = await calculateReach({
        audienceIds: campaignData.audienceIds,
        excludedAudienceIds: campaignData.excludedAudienceIds
      });

      console.log(`🎯 Edit modal reach calculation result:`, data);
      console.log(`🎯 Edit modal reach API response data:`, JSON.stringify(data, null, 2));
      
      const includedAudiences = audiences.filter(a => campaignData.audienceIds.includes(a.id));
      const excludedAudiences = audiences.filter(a => campaignData.excludedAudienceIds.includes(a.id));
      
      console.log(`🎯 Edit modal matched included audiences:`, includedAudiences.map(a => ({ id: a.id, name: a.name, count: a.subscriber_count })));
      console.log(`🎯 Edit modal matched excluded audiences:`, excludedAudiences.map(a => ({ id: a.id, name: a.name, count: a.subscriber_count })));
      
      const finalReachData = {
        totalIncluded: data.details?.totalIncluded || 0,
        totalExcluded: data.details?.totalExcluded || 0,
        estimatedReach: data.uniqueCount || 0,
        includedCount: includedAudiences.length,
        excludedCount: excludedAudiences.length,
        isLoading: false
      };
      
      console.log(`🎯 Edit modal final reach data:`, finalReachData);
      console.log(`🎯 EDIT MODAL KEY VALUE - estimatedReach: ${finalReachData.estimatedReach}`);
      
      setReachData(finalReachData);
    } catch (error) {
      console.error('Failed to calculate reach:', error);
      // Fallback to simple calculation
      const includedAudiences = audiences.filter(a => campaignData.audienceIds.includes(a.id));
      const excludedAudiences = audiences.filter(a => campaignData.excludedAudienceIds.includes(a.id));
      const totalIncluded = includedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
      const totalExcluded = excludedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
      
      setReachData({
        totalIncluded,
        totalExcluded,
        estimatedReach: Math.max(0, totalIncluded - totalExcluded),
        includedCount: includedAudiences.length,
        excludedCount: excludedAudiences.length,
        isLoading: false
      });
    }
  }, [campaignData.audienceIds, campaignData.excludedAudienceIds, audiences, setReachData]);

  // Fetch preview HTML from server function (called when preview modal opens)
  const fetchPreviewFromAPI = useCallback(async () => {
    console.log('🔍 fetchPreviewFromAPI called with editId:', editId);
    if (!editId) {
      console.log('❌ No editId, returning early');
      return;
    }
    
    setIsLoadingPreview(true);
    try {
      console.log('📡 Fetching preview from server function...');
      const data = await previewEmail(editId);
      console.log('📡 Server function response:', data);
      if (data.success && data.html) {
        console.log('✅ Setting preview HTML, length:', data.html.length);
        setPreviewHtml(data.html);
      } else {
        console.log('❌ Server function response not successful or no HTML:', data.error);
      }
    } catch (error) {
      console.error('❌ Failed to fetch preview from server function, falling back to local:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [editId]);

  // Fetch preview when component mounts and editId is available
  useEffect(() => {
    console.log('🔍 Preview useEffect triggered with editId:', editId, 'isLoadingCampaign:', isLoadingCampaign);
    if (editId && !isLoadingCampaign) {
      console.log('✅ editId exists and campaign loaded, calling fetchPreviewFromAPI');
      fetchPreviewFromAPI();
    } else if (editId && isLoadingCampaign) {
      console.log('⏳ editId exists but campaign still loading, waiting...');
    } else {
      console.log('❌ No editId or campaign loading, not fetching preview');
    }
  }, [editId, isLoadingCampaign, fetchPreviewFromAPI]);

  useEffect(() => {
    if (!languageLoading) {
      setTranslationsLoaded(true);
    }
  }, [languageLoading]);

  // Handle URL parameter changes for scheduleType
  useEffect(() => {
    if (scheduleTypeParam && scheduleTypeParam !== campaignData.scheduleType) {
      setCampaignData(prev => ({
        ...prev,
        scheduleType: scheduleTypeParam
      }));
    }
  }, [scheduleTypeParam]);

  // Load audiences from API
  useEffect(() => {
    const loadAudiences = async () => {
      try {
        const data = await getAudiences({
          mode: 'light',
          refreshCounts: true,
        });
        setAudiences(data.audiences || []);
      } catch (error) {
        console.error('Error loading audiences:', error);
      } finally {
        setAudiencesLoading(false);
      }
    };

    const loadTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const data = await getTemplates();
        setTemplates(data.templates || []);
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setTemplatesLoading(false);
      }
    };

    if (user) {
      loadAudiences();
      loadTemplates();
    }
  }, [user]);

  // Update reach calculation when audience selection changes or when reaching review step
  useEffect(() => {
    updateReachCalculation();
  }, [updateReachCalculation]);

  // Trigger reach calculation when user reaches the review step
  useEffect(() => {
    if (currentStep === 3 && campaignData.audienceIds.length > 0) {
      updateReachCalculation();
    }
  }, [currentStep, updateReachCalculation]);

  // Load campaign data for editing
  useEffect(() => {
    // Reset the loaded ref when editId changes
    if (editId) {
      campaignLoadedRef.current = false;
    }
    
    console.log('🔍 Campaign loading effect triggered:', {
      isEditMode,
      editId,
      hasUser: !!user,
      searchParams: searchParams.toString(),
      currentURL: window.location.href
    });
    
    const loadCampaignData = async () => {
      if (isEditMode && editId && user && !campaignLoadedRef.current) {
        console.log('🔍 Starting campaign load for ID:', editId);
        campaignLoadedRef.current = true;
        setIsLoadingCampaign(true);
        try {
          const data = await getCampaign(editId);
          
          if (data) {
            const campaign = data.campaign;
            
            console.log('🔍 Frontend received campaign data:', JSON.stringify(data, null, 2));
            console.log('🔍 Campaign object:', JSON.stringify(campaign, null, 2));
            console.log('🔍 Field values:');
            console.log('  - campaign.name:', campaign.name);
            console.log('  - campaign.subject:', campaign.subject);
            console.log('  - campaign.senderName:', campaign.senderName);
            console.log('  - campaign.senderEmail:', campaign.senderEmail);
            console.log('  - campaign.replyToEmail:', campaign.replyToEmail);
            console.log('  - campaign.audienceIds:', campaign.audienceIds);
            
            // Update campaign data state
            setCampaignData({
              name: campaign.name || '',
              subject: campaign.subject || '',
              senderName: campaign.senderName || 'Cymasphere',
              senderEmail: campaign.senderEmail || 'support@cymasphere.com',
              replyToEmail: campaign.replyToEmail || '',
              preheader: campaign.preheader || '',
              description: campaign.description || '',
              brandHeader: campaign.brandHeader || 'CYMASPHERE',
              audienceIds: campaign.audienceIds || [],
              excludedAudienceIds: campaign.excludedAudienceIds || [],
              template: campaign.template_id || '',
              content: campaign.html_content || '',
              scheduleType: campaign.scheduled_at ? 'scheduled' : '',
              scheduleDate: campaign.scheduled_at ? (() => {
                const scheduledDate = new Date(campaign.scheduled_at);
                console.log('📅 Loading scheduled time for editing:', {
                  storedValue: campaign.scheduled_at,
                  parsedDate: scheduledDate.toString(),
                  localDateString: scheduledDate.toLocaleDateString('en-CA'), // YYYY-MM-DD format
                  localTimeString: scheduledDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }) // HH:MM format
                });
                return scheduledDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
              })() : '',
              scheduleTime: campaign.scheduled_at ? (() => {
                const scheduledDate = new Date(campaign.scheduled_at);
                return scheduledDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }); // HH:MM format
              })() : ''
            });
            
            // Parse email elements from html_content if available
            if (campaign.html_content) {
              // First try to extract embedded elements JSON comment
              const match = campaign.html_content.match(/<!--ELEMENTS_B64:([^>]*)-->/);
              let restoredElements: any[] | null = null;
              if (match && match[1]) {
                try {
                  const decoded = typeof window !== 'undefined'
                    ? decodeURIComponent(escape(window.atob(match[1])))
                    : Buffer.from(match[1], 'base64').toString('utf8');
                  const restored = JSON.parse(decoded);
                  if (Array.isArray(restored)) {
                    restoredElements = restored;
                  }
                } catch (e) {
                  console.warn('Failed to decode embedded elements JSON, falling back to naive parse', e);
                }
              }

              if (restoredElements && restoredElements.length > 0) {
                // Normalize color values (convert short hex to full hex)
                const normalizedElements = restoredElements.map(normalizeElementColors);
                console.log('✅ Setting emailElements from restored elements:', normalizedElements.length);
                setEmailElements(normalizedElements);
              } else {
                // Fallback: naive parse to at least show content
                const parser = new DOMParser();
                const doc = parser.parseFromString(campaign.html_content, 'text/html');
                const elements = Array.from(doc.body.children).map((element, index) => ({
                  id: `element_${index}`,
                  type: (element as HTMLElement).getAttribute('data-type') || (element.tagName.toLowerCase() === 'h1' ? 'header' : 'text'),
                  content: (element as HTMLElement).innerHTML || ''
                }));
                if (elements.length > 0) {
                  console.log('✅ Setting emailElements from fallback parse:', elements.length);
                  setEmailElements(elements);
                }
              }
            }
          } else if (response.status === 404) {
            console.warn(`Campaign with ID ${editId} not found, creating new campaign instead`);
            // Campaign doesn't exist, treat as create mode
            // Clear the edit parameter from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('edit');
            window.history.replaceState({}, '', url.toString());
          } else {
            console.error('Failed to load campaign:', response.status);
          }
        } catch (error) {
          console.error('Error loading campaign:', error);
        } finally {
          setIsLoadingCampaign(false);
        }
      } else {
        console.log('🔍 Campaign loading skipped:', {
          isEditMode,
          editId,
          hasUser: !!user,
          reason: !isEditMode ? 'not in edit mode' : !editId ? 'no edit ID' : !user ? 'no user' : 'unknown'
        });
      }
    };

    loadCampaignData();
  }, [isEditMode, editId, user]);

  if (languageLoading || !translationsLoaded) {
    return <LoadingComponent />;
  }

  if (!user) {
    return <LoadingComponent />;
  }

  if (isLoadingCampaign) {
    return <LoadingComponent text="Loading campaign..." />;
  }

  const steps = [
    { number: 1, title: "Campaign Setup", icon: FaInfoCircle },
    { number: 2, title: "Content", icon: FaEdit },
    { number: 3, title: "Review & Schedule", icon: FaEye }
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

  const handleSave = async () => {
    console.log("Saving campaign:", campaignData);
    
    try {
      // Commit any in-progress contentEditable edits by reading from DOM
      const committedElements = emailElements.map(el => {
        try {
          const domEl = typeof document !== 'undefined' 
            ? (document.querySelector(`[data-element-id="${el.id}"]`) as HTMLElement | null)
            : null;
          if (domEl) {
            return { ...el, content: domEl.innerHTML };
          }
        } catch {}
        return el;
      });

      // Serialize full editor state so drafts restore exact blocks/types/properties
      const elementsJson = JSON.stringify(committedElements);
      const elementsB64 = typeof window !== 'undefined'
        ? window.btoa(unescape(encodeURIComponent(elementsJson)))
        : Buffer.from(elementsJson, 'utf8').toString('base64');
      const embeddedComment = `<!--ELEMENTS_B64:${elementsB64}-->`;
      const generatedHtml = committedElements.map(el => `<div data-type="${el.type}" data-id="${el.id}">${el.content || ''}</div>`).join('\n');
      const htmlWithEmbed = `${embeddedComment}${generatedHtml}`;

      // Use PUT for editing existing campaigns, POST for creating new ones
      const isUpdating = isEditMode && editId;
      const url = isUpdating ? `/api/email-campaigns/campaigns/${editId}` : '/api/email-campaigns/campaigns';
      const method = isUpdating ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: campaignData.name,
          subject: campaignData.subject,
          senderName: campaignData.senderName,           // ✅ FIXED
          senderEmail: campaignData.senderEmail,         // ✅ FIXED
          replyToEmail: campaignData.replyToEmail,       // ✅ FIXED
          preheader: campaignData.preheader,
          description: campaignData.description,         // ✅ ADDED
          htmlContent: htmlWithEmbed, // Embed full elements in HTML comment for exact restoration
          textContent: committedElements.map(el => el.content).join('\n'),
          audienceIds: campaignData.audienceIds,         // ✅ FIXED
          excludedAudienceIds: campaignData.excludedAudienceIds, // ✅ FIXED
          status: 'draft'
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`Campaign ${isUpdating ? 'updated' : 'saved'} as draft:`, result);
        setSendingMessage(`Campaign ${isUpdating ? 'updated' : 'saved'} as draft successfully!`);
        setTimeout(() => setSendingMessage(''), 3000);
      } else {
        // Handle validation errors gracefully without throwing
        console.log(`Validation error ${isUpdating ? 'updating' : 'saving'} campaign:`, result.error);
        setSendingMessage(result.error || `Error ${isUpdating ? 'updating' : 'saving'} campaign`);
        setTimeout(() => setSendingMessage(''), 5000);
      }
    } catch (error) {
      console.log(`Error ${isEditMode ? 'updating' : 'saving'} campaign:`, error);
      setSendingMessage(`Error ${isEditMode ? 'updating' : 'saving'} campaign. Please try again.`);
      setTimeout(() => setSendingMessage(''), 5000);
    }
  };

  const handleSend = async () => {
    // Validate required fields
    if (!campaignData.name || !campaignData.subject || campaignData.audienceIds.length === 0) {
      setSendingMessage('Please fill in all required fields (name, subject, audience)');
      setTimeout(() => setSendingMessage(''), 5000);
      return;
    }

    if (emailElements.length === 0) {
      setSendingMessage('Please add some content to your email before sending');
      setTimeout(() => setSendingMessage(''), 5000);
      return;
    }

    // Validate scheduled campaign has date and time
    if (campaignData.scheduleType === 'scheduled') {
      if (!campaignData.scheduleDate || !campaignData.scheduleTime) {
        setSendingMessage('Please select both a date and time for scheduled campaigns');
        setTimeout(() => setSendingMessage(''), 5000);
        return;
      }
      console.log('📅 Scheduling campaign with:', {
        scheduleDate: campaignData.scheduleDate,
        scheduleTime: campaignData.scheduleTime,
        scheduleType: campaignData.scheduleType
      });
    }

    setIsSending(true);
    setSendingMessage('Preparing to send campaign...');
    setCampaignResult(null);

    try {
      // First save the campaign (use PUT if editing, POST if creating)
      const isUpdating = isEditMode && editId;
      const url = isUpdating ? `/api/email-campaigns/campaigns/${editId}` : '/api/email-campaigns/campaigns';
      const method = isUpdating ? 'PUT' : 'POST';
      
      // Commit any in-progress contentEditable edits by reading from DOM
      const committedElements = emailElements.map((el: any) => {
        try {
          const domEl = typeof document !== 'undefined' 
            ? (document.querySelector(`[data-element-id="${el.id}"]`) as HTMLElement | null)
            : null;
          if (domEl) {
            return { ...el, content: domEl.innerHTML };
          }
        } catch {}
        return el;
      });

      // 🔍 DEBUG: Check padding values before sending
      console.log("🎯 FRONTEND PADDING DEBUG - First element before send:", {
        id: committedElements[0]?.id,
        type: committedElements[0]?.type,
        paddingTop: committedElements[0]?.paddingTop,
        paddingBottom: committedElements[0]?.paddingBottom,
        paddingLeft: committedElements[0]?.paddingLeft,
        paddingRight: committedElements[0]?.paddingRight,
        fullWidth: committedElements[0]?.fullWidth,
        allKeys: Object.keys(committedElements[0] || {})
      });

      // Serialize full editor state so saved campaign retains exact blocks/types/properties
      const elementsJson = JSON.stringify(committedElements);
      const elementsB64 = typeof window !== 'undefined'
        ? window.btoa(unescape(encodeURIComponent(elementsJson)))
        : Buffer.from(elementsJson, 'utf8').toString('base64');
      const embeddedComment = `<!--ELEMENTS_B64:${elementsB64}-->`;
      const generatedHtml = committedElements.map((el: any) => `<div data-type="${el.type}" data-id="${el.id}">${el.content || ''}</div>`).join('');
      const htmlWithEmbed = `${embeddedComment}${generatedHtml}`;
      
      const saveResponse = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: campaignData.name,
          subject: campaignData.subject,
          senderName: campaignData.senderName,           // ✅ FIXED
          senderEmail: campaignData.senderEmail,         // ✅ FIXED
          replyToEmail: campaignData.replyToEmail,       // ✅ FIXED
          preheader: campaignData.preheader,
          description: campaignData.description,         // ✅ ADDED
          htmlContent: htmlWithEmbed,
          textContent: committedElements.map((el: any) => el.content).join('\n'),
          audienceIds: campaignData.audienceIds,         // ✅ FIXED
          excludedAudienceIds: campaignData.excludedAudienceIds, // ✅ FIXED
          status: campaignData.scheduleType === 'scheduled' ? 'scheduled' : 'sent',
          scheduled_at: campaignData.scheduleType === 'scheduled' ? 
            (() => {
              // Preserve local timezone by adding timezone offset explicitly
              const localDateTime = new Date(`${campaignData.scheduleDate}T${campaignData.scheduleTime}:00`);
              const timezoneOffset = localDateTime.getTimezoneOffset();
              const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
              const offsetMinutes = Math.abs(timezoneOffset) % 60;
              const offsetSign = timezoneOffset <= 0 ? '+' : '-';
              const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
              const localDateTimeString = `${campaignData.scheduleDate}T${campaignData.scheduleTime}:00${offsetString}`;
              
              console.log('📅 Saving scheduled time:', {
                originalDate: campaignData.scheduleDate,
                originalTime: campaignData.scheduleTime,
                timezoneOffset,
                offsetString,
                localDateTimeString,
                parsedBack: new Date(localDateTimeString).toString()
              });
              
              return localDateTimeString;
            })() : null
        }),
      });

      const result = await saveResponse.json();
      
      if (saveResponse.ok) {
        console.log('Campaign saved:', result);
        
        // Call the send API for all schedule types (it handles immediate, scheduled, timezone, and draft)
        setSendingMessage(
          campaignData.scheduleType === 'immediate' ? 'Sending emails now...' :
          campaignData.scheduleType === 'scheduled' ? 'Scheduling campaign...' :
          campaignData.scheduleType === 'timezone' ? 'Setting up timezone-based delivery...' :
          'Saving as draft...'
        );
        
        const sendResult = await sendCampaign({
          campaignId: result.campaign?.id,
          name: campaignData.name,
          subject: campaignData.subject,
          brandHeader: campaignData.brandHeader,
          audienceIds: campaignData.audienceIds,
          excludedAudienceIds: campaignData.excludedAudienceIds,
          emailElements: emailElements,
          scheduleType: campaignData.scheduleType,
          scheduleDate: campaignData.scheduleDate,
          scheduleTime: campaignData.scheduleTime
        });
        
        if (sendResult.success) {
          console.log('📧 Send result:', sendResult);
          setCampaignResult(sendResult);
          setShowResultModal(true);
          
          // Update message based on actual result
          if (sendResult.status === 'scheduled') {
            setSendingMessage(
              sendResult.scheduleType === 'timezone' 
                ? `Campaign scheduled for timezone-based delivery at ${sendResult.stats?.sendTime}!`
                : `Campaign scheduled for ${formatScheduledTime(sendResult.scheduledFor)}!`
            );
          } else if (sendResult.status === 'draft') {
            setSendingMessage('Campaign saved as draft!');
          } else {
            setSendingMessage(`Campaign sent successfully to ${sendResult.stats?.sent || 0} subscribers!`);
          }
        } else {
          console.error('❌ Error with campaign:', sendResult.error);
          setSendingMessage(`Error: ${sendResult.error}`);
        }
      } else {
        console.error('Error creating campaign:', result.error);
        setSendingMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      setSendingMessage('Error creating campaign. Please try again.');
    } finally {
      setIsSending(false);
      setTimeout(() => {
        if (!showResultModal) {
          setSendingMessage('');
        }
      }, 5000);
    }
  };

  const handleDelete = () => {
    if (!isEditMode || !editId) {
      setSendingMessage('Cannot delete: No campaign selected');
      setTimeout(() => setSendingMessage(''), 3000);
      return;
    }
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!isEditMode || !editId) return;
    
    setIsDeleting(true);
    setSendingMessage('Deleting campaign...');
    
    try {
      const response = await fetch(`/api/email-campaigns/campaigns/${editId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSendingMessage('Campaign deleted successfully!');
        setShowDeleteModal(false);
        
        // Redirect to campaigns list after a short delay
        setTimeout(() => {
          router.push('/admin/email-campaigns/campaigns');
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      setSendingMessage(`Error deleting campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSendingMessage(''), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClose = () => {
    setShowDeleteModal(false);
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } }
  };

  // Element editing functions
  const updateElement = (elementId: string, updates: any) => {
    setEmailElements(elements => 
      elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      )
    );
  };

  const selectElement = (elementId: string) => {
    setSelectedElementId(elementId);
    setEditingElementId(null);
  };

  const startEditing = (elementId: string) => {
    setEditingElementId(elementId);
    setSelectedElementId(elementId);
  };

  const stopEditing = () => {
    setEditingElementId(null);
  };

  const handleElementDoubleClick = (elementId: string) => {
    const element = emailElements.find(el => el.id === elementId);
    if (element && (element.type === 'header' || element.type === 'text')) {
      startEditing(elementId);
    }
  };

  const handleContentChange = (elementId: string, newContent: string) => {
    updateElement(elementId, { content: newContent });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, elementType: string) => {
    console.log('Drag started:', elementType);
    setDraggedElement(elementType);
    e.dataTransfer.setData('text/plain', elementType);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Create custom drag image
    if (dragPreviewRef.current) {
      dragPreviewRef.current.textContent = `Adding ${elementType}...`;
      e.dataTransfer.setDragImage(dragPreviewRef.current, 0, 0);
    }
  };

  const handleDragEnd = () => {
    console.log('Drag ended');
    setDraggedElement(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (index !== undefined) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    const elementType = e.dataTransfer.getData('text/plain');
    console.log('Drop detected:', { elementType, index, emailElements: emailElements.length });
    
    if (elementType) {
      const newElement = createNewElement(elementType);
      console.log('Created new element:', newElement);
      const newElements = [...emailElements];
      
      if (index !== undefined) {
        newElements.splice(index, 0, newElement);
        console.log('Inserted at index', index);
      } else {
        newElements.push(newElement);
        console.log('Added to end');
      }
      
      setEmailElements(newElements);
      console.log('Updated emailElements:', newElements);
    }
    
    setDragOverIndex(null);
    setDraggedElement(null);
  };

  const createNewElement = (type: string) => {
    const id = type + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // ✨ NEW: Base element with padding and width properties
    const baseElement = {
      id,
      type,
      paddingTop: 16,    // Default 16px top padding
      paddingBottom: 16, // Default 16px bottom padding
      fullWidth: false   // Default to constrained width with margins
    };
    
    switch (type) {
      case 'header':
        return { ...baseElement, content: 'Your Header Text Here', fullWidth: true };
      case 'text':
        return { ...baseElement, content: 'Add your text content here. You can edit this by double-clicking.' };
      case 'button':
        return { 
          ...baseElement, 
          content: 'Click Here', 
          url: '#',
          textColor: '#ffffff',
          backgroundColor: 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)',
          fontSize: '1rem',
          fontWeight: '700',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.2'
        };
      case 'image':
        return { ...baseElement, src: 'https://via.placeholder.com/600x300/6c63ff/ffffff?text=Your+Image', alt: 'Image description' };
      case 'divider':
        return { ...baseElement };
      case 'social':
        return { ...baseElement, links: [
          { platform: 'facebook', url: '#' },
          { platform: 'twitter', url: '#' },
          { platform: 'instagram', url: '#' },
          { platform: 'youtube', url: '#' },
          { platform: 'discord', url: '#' }
        ]};
      case 'spacer':
        return { ...baseElement, height: '30px' };
      case 'columns':
        return { ...baseElement, columns: [
          { content: 'Column 1 content' },
          { content: 'Column 2 content' }
        ]};
      case 'video':
        return { ...baseElement, thumbnail: 'https://via.placeholder.com/600x300/6c63ff/ffffff?text=Video+Placeholder', url: '#' };
      case 'footer':
        return { 
          ...baseElement, 
          fullWidth: true,
          socialLinks: [
            { platform: 'facebook', url: 'https://facebook.com/cymasphere' },
            { platform: 'twitter', url: 'https://twitter.com/cymasphere' },
            { platform: 'instagram', url: 'https://instagram.com/cymasphere' },
            { platform: 'youtube', url: 'https://youtube.com/cymasphere' },
            { platform: 'discord', url: 'https://discord.gg/gXGqqYR47B' }
          ],
          footerText: `© ${currentYear} NNAud.io All rights reserved.`,
          unsubscribeText: 'Unsubscribe',
          unsubscribeUrl: '#unsubscribe',
          privacyText: 'Privacy Policy',
          privacyUrl: '#privacy',
          contactText: 'Contact Us',
          contactUrl: '#contact'
        };
      
      case 'brand-header':
        return { 
          ...baseElement, 
          fullWidth: true,
          content: 'CYMASPHERE',
          backgroundColor: 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)',
          textColor: '#ffffff',
          logoStyle: 'gradient' // 'solid', 'gradient', 'outline'
        };
      default:
        return { ...baseElement, content: 'New element' };
    }
  };

  const removeElement = (elementId: string) => {
    setEmailElements(emailElements.filter(el => el.id !== elementId));
  };

  // Function to parse HTML template content and convert to email elements
  const parseTemplateHtml = (htmlContent: string) => {
    try {
      // Create a temporary DOM element to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const elements: any[] = [];
      
      // Parse different types of elements with proper structure
      doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((header, index) => {
        elements.push({
          type: 'header',
          content: header.textContent || `Header ${index + 1}`,
          fullWidth: true,
          paddingTop: 16,
          paddingBottom: 16,
          fontSize: '32px',
          fontWeight: 'bold',
          textAlign: 'center'
        });
      });
      
      doc.querySelectorAll('p').forEach((paragraph, index) => {
        elements.push({
          type: 'text',
          content: paragraph.textContent || `Paragraph ${index + 1}`,
          fullWidth: false,
          paddingTop: 16,
          paddingBottom: 16,
          fontSize: '16px',
          fontWeight: 'normal',
          textAlign: 'left'
        });
      });
      
      doc.querySelectorAll('a').forEach((link, index) => {
        if (link.textContent && link.href) {
          elements.push({
            type: 'button',
            content: link.textContent,
            url: link.href,
            fullWidth: false,
            textColor: '#ffffff',
            backgroundColor: 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)',
            paddingTop: 16,
            paddingBottom: 16,
            fontSize: '1rem',
            fontWeight: '700',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.2'
          });
        }
      });
      
      doc.querySelectorAll('img').forEach((image, index) => {
        elements.push({
          type: 'image',
          src: image.src || image.getAttribute('src') || '',
          alt: image.alt || `Image ${index + 1}`,
          fullWidth: false,
          paddingTop: 16,
          paddingBottom: 16
        });
      });
      
      // If no elements were found, create a default text element
      if (elements.length === 0) {
        // Strip HTML tags and create a text element
        const cleanText = htmlContent.replace(/<[^>]*>/g, '').trim();
        if (cleanText) {
          elements.push({
            type: 'text',
            content: cleanText,
            fullWidth: false,
            paddingTop: 16,
            paddingBottom: 16,
            fontSize: '16px',
            fontWeight: 'normal',
            textAlign: 'left'
          });
        }
      }
      
      // Ensure all parsed elements have proper properties
      return ensureElementProperties(elements);
    } catch (error) {
      console.error('Error parsing HTML template:', error);
      // Return a fallback text element with proper structure
      return ensureElementProperties([{
        type: 'text',
        content: 'Template content loaded',
        fullWidth: false,
        paddingTop: 16,
        paddingBottom: 16,
        fontSize: '16px',
        fontWeight: 'normal',
        textAlign: 'left'
      }]);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) {
      setCampaignData({...campaignData, template: ''});
      return;
    }

    try {
      // Fetch the selected template from the API
      const data = await getTemplate(templateId);
      const template = data.template;
      
      if (template) {
        
        // Update campaign data with template information
        setCampaignData({
          ...campaignData,
          template: templateId,
          subject: template.subject || campaignData.subject,
          preheader: template.description || campaignData.preheader,
        });
        
        // Load the template's visual elements directly (same as template editor)
        if (template.variables?.visual_elements && Array.isArray(template.variables.visual_elements)) {
          console.log('🎨 Loading template with visual elements:', template.variables.visual_elements.length);
          
          // Generate new IDs for each element to avoid conflicts
          const newElements = template.variables.visual_elements.map((element: any) => ({
            ...element,
            id: element.type + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
          }));
          
          // Add a brand header at the top if it doesn't already exist
          const hasBrandHeader = newElements.some((el: any) => el.type === 'brand-header');
          if (!hasBrandHeader) {
            const brandHeaderElement = {
              id: 'brand-header_' + Date.now(),
              type: 'brand-header',
              content: 'CYMASPHERE',
              fullWidth: true,
              backgroundColor: 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)',
              textColor: '#ffffff',
              paddingTop: 0,
              paddingBottom: 0,
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'center',
              fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              lineHeight: '1.2',
              logoStyle: 'gradient'
            };
            newElements.unshift(brandHeaderElement);
          }
          
          // Ensure all loaded elements have proper properties
          const elementsWithProperties = ensureElementProperties(newElements);
          setEmailElements(elementsWithProperties);
          console.log('Template visual elements loaded with brand header:', newElements);
        } else if (template.html_content) {
          // Fallback: If no visual elements, create a basic text element
          console.log('Template has no visual elements, creating fallback');
          const fallbackElement = {
            id: 'template_content_' + Date.now(),
            type: 'text',
            content: 'Template content loaded - edit to customize',
            fullWidth: false,
            paddingTop: 16,
            paddingBottom: 16,
            fontSize: '16px',
            fontWeight: 'normal',
            textAlign: 'left'
          };
          const fallbackWithProperties = ensureElementProperties([fallbackElement]);
          setEmailElements(fallbackWithProperties);
        } else {
          console.log('Template has no content');
        }
      } else {
        console.error('Failed to load template');
        // Just set the template ID without additional data
        setCampaignData({...campaignData, template: templateId});
      }
    } catch (error) {
      console.error('Error loading template:', error);
      // Just set the template ID without additional data
      setCampaignData({...campaignData, template: templateId});
    }
  };

  const handleAudienceToggle = (audienceId: string, isChecked: boolean) => {
    if (isChecked) {
      setCampaignData({
        ...campaignData,
        audienceIds: [...campaignData.audienceIds, audienceId],
        excludedAudienceIds: campaignData.excludedAudienceIds.filter(id => id !== audienceId)
      });
    } else {
      setCampaignData({
        ...campaignData,
        audienceIds: campaignData.audienceIds.filter(id => id !== audienceId)
      });
    }
  };

  const handleAudienceExclude = (audienceId: string) => {
    const isCurrentlyExcluded = campaignData.excludedAudienceIds.includes(audienceId);
    
    if (isCurrentlyExcluded) {
      // Remove from excluded
      setCampaignData({
        ...campaignData,
        excludedAudienceIds: campaignData.excludedAudienceIds.filter(id => id !== audienceId)
      });
    } else {
      // Add to excluded and remove from included
      setCampaignData({
        ...campaignData,
        audienceIds: campaignData.audienceIds.filter(id => id !== audienceId),
        excludedAudienceIds: [...campaignData.excludedAudienceIds, audienceId]
      });
    }
  };

  const calculateAudienceStats = () => {
    const includedAudiences = audiences.filter(a => campaignData.audienceIds.includes(a.id));
    const excludedAudiences = audiences.filter(a => campaignData.excludedAudienceIds.includes(a.id));
    
    // Calculate fallback totals from audience subscriber_count
    const fallbackTotalIncluded = includedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
    const fallbackTotalExcluded = excludedAudiences.reduce((sum, audience) => sum + audience.subscriber_count, 0);
    
    return {
      totalIncluded: reachData.isLoading ? fallbackTotalIncluded : (reachData.totalIncluded || fallbackTotalIncluded),
      totalExcluded: reachData.isLoading ? fallbackTotalExcluded : (reachData.totalExcluded || fallbackTotalExcluded),
      estimatedReach: reachData.isLoading ? Math.max(0, fallbackTotalIncluded - fallbackTotalExcluded) : (reachData.estimatedReach || Math.max(0, fallbackTotalIncluded - fallbackTotalExcluded)),
      includedCount: includedAudiences.length,
      excludedCount: excludedAudiences.length
    };
  };

  const getFilteredAudiences = () => {
    if (!audienceSearchTerm.trim()) {
      return audiences;
    }
    
    const searchTerm = audienceSearchTerm.toLowerCase();
    return audiences.filter(audience => 
      audience.name?.toLowerCase().includes(searchTerm) ||
      (audience.description && audience.description.toLowerCase().includes(searchTerm)) ||
      audience.type?.toLowerCase().includes(searchTerm)
    );
  };

  // Generate HTML from email elements - NOW USES THE SAME API AS ACTUAL EMAILS

  const generatePreviewHtml = () => {
    // Return cached preview HTML if available, otherwise generate locally
    if (previewHtml) {
      return previewHtml;
    }
    return generateLocalPreviewHtml();
  };

  // Fallback local HTML generation (for when API is not available)
  const generateLocalPreviewHtml = () => {
    console.log('🔍 generateLocalPreviewHtml called with emailElements:', emailElements);
    console.log('🔍 generateLocalPreviewHtml called with emailElements length:', emailElements?.length || 0);
    if (!emailElements || emailElements.length === 0) {
      console.log('❌ No email elements, returning empty HTML');
      return '<!DOCTYPE html><html><body><p>No email elements found</p></body></html>';
    }
    
    console.log('🔍 Processing elements:', emailElements.map(el => ({ id: el.id, type: el.type, content: el.content?.substring(0, 50) })));
    
    const elementHtml = emailElements.map(element => {
      // Determine container styling based on fullWidth
      const containerStyle = element.fullWidth 
        ? 'margin: 0; padding: 0;' 
        : 'margin: 0 auto; max-width: 600px;';
      
      const wrapperClass = element.fullWidth ? 'full-width' : 'constrained-width';
      
      // Get element properties with defaults - ALL properties from visual editor
      const fontSize = element.fontSize || '16px';
      const fontWeight = element.fontWeight || 'normal';
      const fontStyle = element.fontStyle || 'normal';
      const textDecoration = element.textDecoration || 'none';
      const textAlign = element.textAlign || 'left';
      const paddingTop = element.paddingTop ?? 16;
      const paddingBottom = element.paddingBottom ?? 16;
      const textColor = element.textColor || '#555';
      const backgroundColor = element.backgroundColor || 'transparent';
      const fontFamily = element.fontFamily || 'Arial, sans-serif';
      const lineHeight = element.lineHeight || '1.6';
      

      
      switch (element.type) {
        case 'header':
          return `<div class="${wrapperClass}" style="${containerStyle} padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <h1 style="
              font-size: ${fontSize}; 
              color: ${textColor}; 
              margin: 0 0 1rem 0; 
              text-align: ${textAlign}; 
              font-weight: ${fontWeight};
              font-style: ${fontStyle};
              text-decoration: ${textDecoration};
              line-height: ${lineHeight};
              font-family: ${fontFamily};
              ${element.fullWidth ? 'padding: 0 20px;' : ''}
            ">${element.content || 'Header Text'}</h1>
          </div>`;
        
        case 'text':
          return `<div class="${wrapperClass}" style="${containerStyle} padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <p style="
              font-size: ${fontSize}; 
              color: ${textColor}; 
              line-height: ${lineHeight}; 
              margin: 0 0 1rem 0; 
              text-align: ${textAlign};
              font-weight: ${fontWeight};
              font-style: ${fontStyle};
              text-decoration: ${textDecoration};
              font-family: ${fontFamily};
              ${element.fullWidth ? 'padding: 0 20px;' : ''}
            ">${element.content || 'Text content'}</p>
          </div>`;
        
        case 'button':
          return `<div class="${wrapperClass}" style="${containerStyle} text-align: center; padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <a href="${element.url || '#'}" style="
              display: ${element.fullWidth ? 'block' : 'inline-block'}; 
              padding: ${element.fullWidth ? '0' : '1.25rem 2.5rem'}; 
              background: ${element.gradient || (backgroundColor !== 'transparent' ? backgroundColor : 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)')}; 
              color: #ffffff !important; 
              text-decoration: ${textDecoration}; 
              border-radius: ${element.fullWidth ? '0' : '50px'}; 
              font-weight: ${fontWeight};
              font-size: ${fontSize};
              font-style: ${fontStyle};
              text-align: ${textAlign};
              font-family: ${fontFamily};
              line-height: ${lineHeight};
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              text-transform: uppercase;
              letter-spacing: 1px;
              box-shadow: ${element.fullWidth ? 'none' : '0 8px 25px rgba(108, 99, 255, 0.3)'};
              min-height: 1em;
              width: ${element.fullWidth ? '100%' : 'auto'};
            ">${element.content || 'Button Text'}</a>
          </div>`;
        
        case 'image':
          return `<div class="${wrapperClass}" style="${containerStyle} text-align: center; padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <img src="${element.src || 'https://via.placeholder.com/600x300'}" 
                 alt="${element.alt || 'Email Image'}" 
                 style="
                   max-width: 100%; 
                   height: auto; 
                   border-radius: ${element.fullWidth ? '0' : '8px'}; 
                   box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                 " />
          </div>`;
        
        case 'brand-header':
          return `<div class="${wrapperClass} brand-header" style="margin:0; padding:0;">
            <div style="
              text-align: center;
              background: ${element.backgroundColor || 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)'};
              padding: ${element.fullWidth ? '0' : '20px'};
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 60px;
              gap: 2px;
              border-radius: 0;
              box-shadow: none;
            ">
              <img src="/images/cm-logo-icon.png" alt="Cymasphere Logo" style="
                width: 36px;
                height: 36px;
                object-fit: contain;
                opacity: 0.9;
                display: block;
              " />
              <div style="
                font-size: ${element.fontSize || '1.5rem'};
                font-weight: ${element.fontWeight || '700'};
                text-transform: uppercase;
                letter-spacing: ${element.letterSpacing || '2.5px'};
                font-family: ${element.fontFamily || 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'};
                min-height: 1em;
                line-height: ${element.lineHeight || '1.2'};
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
              ">
                <span class="cyma-text">CYMA</span>
                <span class="sphere-text">SPHERE</span>
              </div>
            </div>
          </div>`;
        
        case 'divider':
          return `<div class="${wrapperClass}" style="${containerStyle} padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <div style="margin: 1rem 0; text-align: center;">
              <div style="height: 2px; background: linear-gradient(90deg, transparent, #ddd, transparent); width: 100%;"></div>
            </div>
          </div>`;
        
        case 'spacer':
          return `<div class="${wrapperClass}" style="${containerStyle} background-color: ${backgroundColor};">
            <div style="height: ${element.height || '20px'};"></div>
          </div>`;
        
        case 'footer':
          // Generate social links HTML with PNG icons
          const socialLinksHtml = element.socialLinks && element.socialLinks.length > 0
            ? element.socialLinks
                .map((social: any) => {
                  const icons = {
                    facebook: `<img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/fb.png" alt="Facebook" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;" />`,
                    twitter: `<img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/x.png" alt="Twitter" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;" />`,
                    instagram: `<img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/insta.png" alt="Instagram" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;" />`,
                    youtube: `<img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/youtube.png" alt="YouTube" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;" />`,
                    discord: `<img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/discord.png" alt="Discord" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;" />`
                  };
                  return `<a href="${social.url}" style="text-decoration: none; margin: 0 0.5rem; padding: 0.5rem; display: inline-block;">${icons[social.platform as keyof typeof icons] || "🔗"}</a>`;
                })
                .join("")
            : "";

          return `<div class="${wrapperClass}" style="${containerStyle} padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <div style="
              text-align: center; 
              padding: ${paddingTop}px 2rem ${paddingBottom}px 2rem; 
              font-size: ${fontSize}; 
              color: ${textColor}; 
              background: ${backgroundColor !== 'transparent' ? backgroundColor : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'}; 
              border-top: 1px solid #dee2e6; 
              margin-top: 2rem;
              font-weight: ${fontWeight};
              font-style: ${fontStyle};
              text-decoration: ${textDecoration};
              font-family: ${fontFamily};
              line-height: ${lineHeight};
            ">
              ${socialLinksHtml ? `<div style="margin-bottom: 0.5rem; text-align: center;">${socialLinksHtml}</div>` : ""}
              <div style="margin-bottom: 0.5rem;">
                ${element.footerText || `© ${new Date().getFullYear()} NNAud.io All rights reserved.`}
              </div>
              <div>
                <a href="${(element.unsubscribeUrl && element.unsubscribeUrl.trim()) ? element.unsubscribeUrl : 'https://cymasphere.com/unsubscribe?email={{email}}'}" style="color: #ffffff; text-decoration: underline; cursor: pointer;">${element.unsubscribeText || "Unsubscribe"}</a>
                &nbsp;|&nbsp;
                <a href="${(element.privacyUrl && element.privacyUrl.trim()) ? element.privacyUrl : 'https://cymasphere.com/privacy-policy'}" style="color: #ffffff; text-decoration: underline; cursor: pointer;">${element.privacyText || "Privacy Policy"}</a>
                &nbsp;|&nbsp;
                <a href="${(element.termsUrl && element.termsUrl.trim()) ? element.termsUrl : 'https://cymasphere.com/terms-of-service'}" style="color: #ffffff; text-decoration: underline; cursor: pointer;">${element.termsText || "Terms of Service"}</a>
              </div>
            </div>
          </div>`;
        

        
        case 'columns':
          const columnsHtml = element.columns && element.columns.length > 0
            ? element.columns.map((column: any, index: number) => 
                `<div style="flex: 1; padding: 0 10px; text-align: ${column.textAlign || textAlign};">
                  <div style="
                    font-size: ${fontSize}; 
                    color: ${column.textColor || textColor}; 
                    line-height: ${lineHeight};
                    font-weight: ${fontWeight};
                    font-style: ${fontStyle};
                    text-decoration: ${textDecoration};
                    font-family: ${fontFamily};
                  ">${column.content || `Column ${index + 1} content`}</div>
                </div>`
              ).join("")
            : "";
          
          return `<div class="${wrapperClass}" style="${containerStyle} padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <div style="display: flex; gap: 20px; margin: 1rem 0;">
              ${columnsHtml}
            </div>
          </div>`;
        
        case 'video':
          return `<div class="${wrapperClass}" style="${containerStyle} text-align: center; padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <div style="margin: 1rem 0;">
              <img src="${element.thumbnail || 'https://via.placeholder.com/600x300'}" 
                   alt="Video Thumbnail" 
                   style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer;" />
              <div style="margin-top: 0.5rem;">
                <a href="${element.url || '#'}" style="
                  color: ${textColor}; 
                  text-decoration: ${textDecoration}; 
                  font-weight: ${fontWeight};
                  font-size: ${fontSize};
                  font-style: ${fontStyle};
                  font-family: ${fontFamily};
                  line-height: ${lineHeight};
                ">▶ Watch Video</a>
              </div>
            </div>
          </div>`;
        
        default:
          return `<div class="${wrapperClass}" style="${containerStyle} padding: ${paddingTop}px 0 ${paddingBottom}px 0; background-color: ${backgroundColor};">
            <div style="
              color: ${textColor}; 
              margin: 1rem 0;
              font-size: ${fontSize};
              text-align: ${textAlign};
              font-weight: ${fontWeight};
              font-style: ${fontStyle};
              text-decoration: ${textDecoration};
              font-family: ${fontFamily};
              line-height: ${lineHeight};
            ">${element.content || 'Content'}</div>
          </div>`;
      }
    }).join('');

         return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${campaignData.subject || 'Email Preview'}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&family=Poppins:wght@400;500;600;700&family=Source+Sans+Pro:wght@400;600;700&family=Nunito:wght@400;600;700&family=Work+Sans:wght@400;500;600&family=Montserrat:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f7f7f7;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* Ensure emojis render in color */
        * {
            -webkit-text-fill-color: initial;
            color: inherit;
        }
        
        /* Force emoji color rendering - multiple approaches */
        emoji, span[role="img"], .emoji {
            -webkit-text-fill-color: initial !important;
            color: initial !important;
        }
        
        /* Remove any filters that might be making emojis grey */
        * {
            filter: none !important;
        }
        
        /* Ensure text rendering is optimal for emojis */
        body {
            text-rendering: optimizeLegibility;
            -webkit-font-feature-settings: "liga" 1, "kern" 1;
            font-feature-settings: "liga" 1, "kern" 1;
        }
        
        /* Force emoji color rendering with higher specificity */
        p, div, span, h1, h2, h3, h4, h5, h6 {
            -webkit-text-fill-color: initial !important;
            color: inherit !important;
        }
        
        /* Aggressive emoji color reset - but exclude brand header */
        *:not(.brand-header):not(.brand-header *) {
            -webkit-text-fill-color: initial !important;
            color: inherit !important;
            filter: none !important;
        }
        
        /* Ensure emojis are not affected by any color overrides */
        ::-webkit-text-fill-color {
            -webkit-text-fill-color: initial !important;
        }
        
        /* Reset any inherited CSS variables that might affect colors */
        :root {
            --text: initial !important;
            --text-secondary: initial !important;
            --primary: initial !important;
            --accent: initial !important;
        }
        
        /* Force emoji rendering with system emoji font */
        @font-face {
            font-family: 'Apple Color Emoji';
            src: local('Apple Color Emoji');
        }
        
        @font-face {
            font-family: 'Segoe UI Emoji';
            src: local('Segoe UI Emoji');
        }
        
        /* Apply emoji fonts to all text except brand header */
        *:not(.brand-header):not(.brand-header *) {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif !important;
        }
        
        /* Brand header specific styles - override the reset */
        .brand-header {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
        
        .brand-header .cyma-text {
            background: linear-gradient(90deg, #6c63ff, #4ecdc4) !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            background-clip: text !important;
            color: transparent !important;
        }
        
        .brand-header .sphere-text {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .content {
            padding: 0;
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
            margin: 0;
            padding: 0;
        }
        .constrained-width {
            max-width: 600px;
            margin: 0 auto;
            box-sizing: border-box;
            padding: 0 20px;
        }
        
        /* Responsive styles */
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .constrained-width {
                padding: 0 15px;
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
            .constrained-width {
                padding: 0 10px;
            }
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
        <div class="content">
            ${elementHtml}
        </div>
    </div>
</body>
</html>`;
  };

  const renderEmailElement = (element: any, index: number) => {
    const isSelected = selectedElementId === element.id;
    const isEditing = editingElementId === element.id;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        stopEditing();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        stopEditing();
      }
    };

    const handleBlur = () => {
      stopEditing();
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const newContent = e.currentTarget.textContent || '';
      handleContentChange(element.id, newContent);
    };

    switch (element.type) {
      case 'header':
        return (
          <EmailElement 
            key={element.id} 
            selected={isSelected}
            editing={isEditing}
            onClick={() => selectElement(element.id)}
            onDoubleClick={() => handleElementDoubleClick(element.id)}
          >
            <EditableText
              isEditing={isEditing}
              contentEditable={isEditing}
              suppressContentEditableWarning={true}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onInput={handleInput}
              style={{ 
                fontSize: '2.5rem', 
                color: '#333', 
                marginBottom: '1rem', 
                textAlign: 'center',
                background: 'linear-gradient(135deg, #333, #666)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: isEditing ? '#333' : 'transparent',
                fontWeight: '800',
                cursor: isEditing ? 'text' : 'pointer'
              }}
            >
              {element.content}
            </EditableText>
          </EmailElement>
        );
      
      case 'text':
        return (
          <EmailElement 
            key={element.id} 
            selected={isSelected}
            editing={isEditing}
            onClick={() => selectElement(element.id)}
            onDoubleClick={() => handleElementDoubleClick(element.id)}
          >
            <EditableText
              isEditing={isEditing}
              contentEditable={isEditing}
              suppressContentEditableWarning={true}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onInput={handleInput}
              style={{ 
                fontSize: '1rem', 
                lineHeight: '1.7', 
                color: isEditing ? '#333' : '#555', 
                marginBottom: '1.5rem',
                cursor: isEditing ? 'text' : 'pointer'
              }}
            >
              {element.content}
            </EditableText>
          </EmailElement>
        );
      
      case 'button':
        return (
          <EmailElement 
            key={element.id} 
            selected={isSelected}
            editing={isEditing}
            onClick={() => selectElement(element.id)}
            onDoubleClick={() => handleElementDoubleClick(element.id)}
          >
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <EmailButton>
                <EditableText
                  isEditing={isEditing}
                  contentEditable={isEditing}
                  suppressContentEditableWarning={true}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  onInput={handleInput}
                  style={{ 
                    cursor: isEditing ? 'text' : 'pointer',
                    color: isEditing ? '#333' : 'white'
                  }}
                >
                  {element.content}
                </EditableText>
              </EmailButton>
            </div>
          </EmailElement>
        );
      
      case 'image':
        return (
          <EmailElement 
            key={element.id} 
            selected={isSelected}
            onClick={() => selectElement(element.id)}
          >
            <div style={{ 
              borderRadius: '16px', 
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <img 
                src={element.src} 
                alt="Email content" 
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          </EmailElement>
        );
      
      case 'divider':
        return (
          <EmailElement 
            key={element.id} 
            selected={isSelected}
            onClick={() => selectElement(element.id)}
          >
            <hr style={{ 
              border: 'none', 
              height: '2px', 
              background: 'linear-gradient(90deg, transparent, #ddd, transparent)',
              margin: '2rem 0'
            }} />
          </EmailElement>
        );
      
      case 'spacer':
        return (
          <EmailElement 
            key={element.id} 
            selected={isSelected}
            onClick={() => selectElement(element.id)}
          >
            <div style={{ 
              height: element.height || '20px', 
              background: 'rgba(108, 99, 255, 0.1)', 
              borderRadius: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '0.8rem', 
              color: 'var(--primary)' 
            }}>
              Spacer ({element.height || '20px'})
            </div>
          </EmailElement>
        );
      
      default:
        return null;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepContent variants={stepVariants} initial="hidden" animate="visible" exit="exit" $isDesignStep={false}>
            <StepTitle>
              <FaInfoCircle />
              Campaign Setup
            </StepTitle>
            <StepDescription>
              Set up your campaign details, select your audience, and choose a template.
            </StepDescription>
            
            {/* Template Selection Section */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaPalette style={{ color: 'var(--primary)' }} />
                Choose Template
              </h3>
              <FormGroup>
                <Label>Email Template</Label>
                <Select
                  value={campaignData.template}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                >
                  <option value="">Choose a template...</option>
                  {templatesLoading ? (
                    <option value="">Loading templates...</option>
                  ) : templates.length === 0 ? (
                    <option value="">No templates available</option>
                  ) : (
                    templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.description}
                      </option>
                    ))
                  )}
                </Select>
              </FormGroup>
            </div>
            
            {/* Campaign Details Section */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaInfoCircle style={{ color: 'var(--primary)' }} />
                Campaign Details
              </h3>
            <FormGrid>
              <FormGroup>
                <Label>Campaign Name</Label>
                <Input
                  type="text"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData({...campaignData, name: e.target.value})}
                  placeholder="Enter campaign name"
                />
              </FormGroup>
              <FormGroup>
                <Label>Email Subject</Label>
                <Input
                  type="text"
                  value={campaignData.subject}
                  onChange={(e) => setCampaignData({...campaignData, subject: e.target.value})}
                  placeholder="Enter email subject line"
                />
              </FormGroup>
            </FormGrid>
            <FormGrid>
              <FormGroup>
                <Label>Sender Name</Label>
                <Input
                  type="text"
                  value={campaignData.senderName}
                  onChange={(e) => setCampaignData({...campaignData, senderName: e.target.value})}
                  placeholder="e.g. Cymasphere Team"
                />
              </FormGroup>
              <FormGroup>
                <Label>Sender Email</Label>
                <Input
                  type="email"
                  value={campaignData.senderEmail}
                  onChange={(e) => setCampaignData({...campaignData, senderEmail: e.target.value})}
                  placeholder="e.g. support@cymasphere.com"
                />
              </FormGroup>
            </FormGrid>
            <FormGrid>
              <FormGroup>
                <Label>Reply-To Email (Optional)</Label>
                <Input
                  type="email"
                  value={campaignData.replyToEmail}
                  onChange={(e) => setCampaignData({...campaignData, replyToEmail: e.target.value})}
                  placeholder="e.g. noreply@cymasphere.com"
                />
              </FormGroup>
              <FormGroup>
                <Label>Preheader Text</Label>
                <Input
                  type="text"
                  value={campaignData.preheader}
                  onChange={(e) => setCampaignData({...campaignData, preheader: e.target.value})}
                  placeholder="Preview text that appears next to subject line"
                />
              </FormGroup>
            </FormGrid>
            <FormGroup>
              <Label>Campaign Description</Label>
              <TextArea
                value={campaignData.description}
                onChange={(e) => setCampaignData({...campaignData, description: e.target.value})}
                placeholder="Describe the purpose of this campaign"
              />
            </FormGroup>
            </div>

            {/* Audience Selection Section */}
            <AudienceSelectionContainer>
              <h3 style={{ color: 'var(--text)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaUsers style={{ color: 'var(--primary)' }} />
                Select Target Audiences
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
                        const isIncluded = campaignData.audienceIds.includes(audience.id);
                        const isExcluded = campaignData.excludedAudienceIds.includes(audience.id);
                        
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
                              title={isExcluded ? 'Remove from exclusions' : 'Exclude from campaign'}
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
                  {(campaignData.audienceIds.length > 0 || campaignData.excludedAudienceIds.length > 0) && (
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
                          {reachData.isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Spinner />
                              Calculating...
            </div>
                          ) : (
                            <>
                              {calculateAudienceStats().estimatedReach.toLocaleString()}
                              {campaignData.audienceIds.length > 1 && (
                                <div style={{ 
                                  fontSize: '0.7rem', 
                                  color: 'var(--text-secondary)', 
                                  marginTop: '0.2rem',
                                  fontStyle: 'italic'
                                }}>
                                  ✨ Unique subscribers only
                                </div>
                              )}
                            </>
                          )}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <StepTitle>
                  <FaEdit />
                  Design Your Email
                </StepTitle>
                <StepDescription>
                  Drag and drop elements to build your email. See live preview as you design.
                </StepDescription>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <NavButton onClick={prevStep} disabled={currentStep <= 1}>
                  <FaArrowLeft />
                  Previous
                </NavButton>
                
                <NavButton onClick={handleSave}>
                  <FaSave />
                  Save Draft
                </NavButton>
                
                <NavButton variant="primary" onClick={nextStep}>
                  Next
                  <FaArrowRight />
                </NavButton>
              </div>
            </div>
            
            {/* Use the shared VisualEditor component */}
            <VisualEditor
              emailElements={emailElements}
              setEmailElements={setEmailElements}
              campaignData={{
                senderName: campaignData.senderName,
                subject: campaignData.subject,
                preheader: campaignData.preheader
              }}
              rightPanelExpanded={true}
            />
          </StepContent>
        );

      case 3:
        return (
          <StepContent variants={stepVariants} initial="hidden" animate="visible" exit="exit" $isDesignStep={false}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <StepTitle style={{ marginBottom: 0 }}>
                <FaEye />
                Review & Schedule
              </StepTitle>
              <button
                onClick={() => setShowTestModal(true)}
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.25)'
                }}
                title="Send Test Email"
              >
                <FaPaperPlane /> Send Test
              </button>
            </div>
            <StepDescription>
              Review your campaign details and choose when to send.
            </StepDescription>
            
            {/* Campaign Review Section */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaEye style={{ color: 'var(--primary)' }} />
                Campaign Summary
              </h3>
              <FormGrid>
                <div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px' }}>
                    <p><strong>Name:</strong> {campaignData.name || "Untitled Campaign"}</p>
                    <p><strong>Subject:</strong> {campaignData.subject || "No subject"}</p>
                    <p><strong>Audiences:</strong> {
                  campaignData.audienceIds.length === 0 
                    ? "No audiences selected" 
                    : campaignData.audienceIds.map(id => {
                        const audience = audiences.find(a => a.id === id);
                        return audience ? audience.name : 'Unknown';
                      }).join(', ')
                }</p>
                    {campaignData.audienceIds.length > 0 && (
                      <p><strong>Total Recipients:</strong> {
                        reachData.isLoading ? (
                          <span style={{ color: 'var(--text-secondary)' }}>Calculating...</span>
                        ) : (
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                            {(() => {
                              const reachValue = reachData.estimatedReach || calculateAudienceStats().estimatedReach;
                              console.log(`🎯 EDIT MODAL DISPLAY VALUE:`, {
                                'reachData.estimatedReach': reachData.estimatedReach,
                                'calculateAudienceStats().estimatedReach': calculateAudienceStats().estimatedReach,
                                'finalDisplayValue': reachValue,
                                'reachData': reachData,
                                'calculateAudienceStats()': calculateAudienceStats()
                              });
                              return reachValue.toLocaleString();
                            })()} subscribers
                          </span>
                        )
                      }</p>
                    )}
                    <p><strong>Template:</strong> {templates.find(t => t.id === campaignData.template)?.name || "No template selected"}</p>
                  </div>
                </div>
                <div>
                  <PreviewSection>
                    <PreviewTitle>
                      <FaEye />
                      Email Preview
                                              <ExpandPreviewButton 
                          onClick={() => {
                    console.log('🔍 Preview modal opening, emailElements:', emailElements);
                    console.log('🔍 Preview modal opening, emailElements length:', emailElements?.length || 0);
                    console.log('🔍 Preview modal opening, previewHtml length:', previewHtml?.length || 0);
                    console.log('🔍 Preview modal opening, editId:', editId);
                    console.log('🔍 Preview modal opening, isLoadingCampaign:', isLoadingCampaign);
                    
                    // Force generate preview HTML immediately
                    const localHtml = generateLocalPreviewHtml();
                    console.log('🔍 Generated local HTML length:', localHtml.length);
                    console.log('🔍 Generated local HTML preview:', localHtml.substring(0, 500));
                    
                    // Set the preview HTML so the modal can use it
                    setPreviewHtml(localHtml);
                    setShowPreviewModal(true);
                  }}
                          style={{ marginLeft: 'auto' }}
                        >
                        <FaExpandArrowsAlt />
                        Full Screen Preview
                      </ExpandPreviewButton>
                      {/* Removed old Send Test button here to avoid duplication */}
                    </PreviewTitle>
                    <PreviewContent>
                      <div style={{ 
                        position: 'relative',
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {/* Email preview with subtle shadow */}
                        <div style={{
                          background: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                          maxHeight: '280px',
                          position: 'relative'
                        }}>
                          <iframe
                            key={`small-preview-${emailElements.length}-${JSON.stringify(emailElements.map(el => ({ id: el.id, fullWidth: el.fullWidth })))}`}
                            srcDoc={generatePreviewHtml()}
                            style={{
                              width: '100%',
                              height: '380px',
                              border: 'none',
                              transform: 'scale(0.7)',
                              transformOrigin: 'top left'
                            }}
                            title="Email Preview"
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
                    </PreviewContent>
                  </PreviewSection>
                </div>
              </FormGrid>
            </div>

            {/* Schedule Section */}
            <div>
              <h3 style={{ color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaCalendarAlt style={{ color: 'var(--primary)' }} />
                Schedule Campaign
              </h3>
            <ScheduleOptions>
              <ScheduleOption
                selected={campaignData.scheduleType === "immediate"}
                onClick={() => setCampaignData({...campaignData, scheduleType: "immediate"})}
              >
                <ScheduleIcon><FaPaperPlane /></ScheduleIcon>
                <ScheduleTitle>Send Immediately</ScheduleTitle>
                <ScheduleDescription>Send the campaign right away</ScheduleDescription>
              </ScheduleOption>
              <ScheduleOption
                selected={campaignData.scheduleType === "scheduled"}
                onClick={() => setCampaignData({...campaignData, scheduleType: "scheduled"})}
              >
                <ScheduleIcon><FaClock /></ScheduleIcon>
                <ScheduleTitle>Schedule for Later</ScheduleTitle>
                <ScheduleDescription>Choose a specific date and time</ScheduleDescription>
              </ScheduleOption>
              <ScheduleOption
                selected={campaignData.scheduleType === "timezone"}
                onClick={() => setCampaignData({...campaignData, scheduleType: "timezone"})}
              >
                <ScheduleIcon><FaGlobe /></ScheduleIcon>
                <ScheduleTitle>Send by Timezone</ScheduleTitle>
                <ScheduleDescription>Send at optimal time for each subscriber's timezone</ScheduleDescription>
              </ScheduleOption>
            </ScheduleOptions>
            {campaignData.scheduleType === "scheduled" && (
              <FormGrid>
                <FormGroup>
                  <Label>Schedule Date</Label>
                  <Input
                    type="date"
                    value={campaignData.scheduleDate}
                    onChange={(e) => setCampaignData({...campaignData, scheduleDate: e.target.value})}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Schedule Time</Label>
                  <Input
                    type="time"
                    value={campaignData.scheduleTime}
                    onChange={(e) => setCampaignData({...campaignData, scheduleTime: e.target.value})}
                  />
                </FormGroup>
              </FormGrid>
            )}

            {campaignData.scheduleType === "timezone" && (
              <FormGrid>
                <FormGroup>
                  <Label>Send Time (in each subscriber's timezone)</Label>
                  <Input
                    type="time"
                    value={campaignData.scheduleTime || "09:00"}
                    onChange={(e) => setCampaignData({...campaignData, scheduleTime: e.target.value})}
                  />
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    💡 Best times: 9:00 AM or 2:00 PM for maximum engagement
                  </div>
                </FormGroup>
                <FormGroup>
                  <Label>Delivery Window</Label>
                  <select 
                    style={{
                      width: '100%',
                      padding: '0.9rem 1rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      color: 'var(--text)',
                      fontSize: '1rem'
                    }}
                    value={campaignData.scheduleDate || "24hours"}
                    onChange={(e) => setCampaignData({...campaignData, scheduleDate: e.target.value})}
                  >
                    <option value="24hours">Over 24 hours (recommended)</option>
                    <option value="12hours">Over 12 hours (faster)</option>
                    <option value="6hours">Over 6 hours (urgent)</option>
                  </select>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    🌍 Emails will be sent when it's the specified time in each subscriber's timezone
                  </div>
                </FormGroup>
              </FormGrid>
            )}
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
        title={isEditMode ? "Edit Campaign" : "Create Campaign"}
        description={isEditMode ? "Edit email campaign details and content" : "Create a new email marketing campaign"}
      />
      
      <CreateContainer $isDesignStep={currentStep === 2}>
        <Header>
          <Title>
            <FaEnvelopeOpen />
            {isEditMode ? 'Edit Campaign' : 'Create New Campaign'}
          </Title>
          <Subtitle>
            {isEditMode 
              ? 'Update your email campaign settings and content'
              : 'Follow the steps below to create and send your email campaign'
            }
          </Subtitle>
        </Header>

        <StepIndicator>
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <Step 
                $active={currentStep === step.number}
                $completed={currentStep > step.number}
                onClick={() => setCurrentStep(step.number)}
                style={{ cursor: 'pointer' }}
              >
                {currentStep > step.number ? <FaCheck /> : <step.icon />}
                {step.title}
              </Step>
              {index < steps.length - 1 && (
                <StepConnector $completed={currentStep > step.number} />
              )}
            </React.Fragment>
          ))}
        </StepIndicator>

        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>

        <NavigationButtons>
          <NavButton onClick={prevStep} disabled={currentStep <= 1 || isSending}>
            <FaArrowLeft />
            Previous
          </NavButton>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {isEditMode && (
              <NavButton 
                onClick={handleDelete}
                disabled={isSending || isDeleting}
                style={{ 
                  backgroundColor: 'rgba(220, 53, 69, 0.1)', 
                  color: '#dc3545', 
                  border: '1px solid rgba(220, 53, 69, 0.3)' 
                }}
              >
                <FaTrash />
                Delete
              </NavButton>
            )}
            
            <NavButton onClick={handleSave} disabled={isSending}>
              <FaSave />
              Save Draft
            </NavButton>
            
            {currentStep === steps.length ? (
              <NavButton variant="primary" onClick={handleSend} disabled={isSending}>
                {isSending && (
                  <LoadingSpinner
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
                {campaignData.scheduleType === 'immediate' && <FaPaperPlane />}
                {campaignData.scheduleType === 'scheduled' && <FaClock />}
                {campaignData.scheduleType === 'timezone' && <FaGlobe />}
                {!campaignData.scheduleType && <FaPaperPlane />}
                {isSending 
                  ? 'Processing...' 
                  : (() => {
                      if (campaignData.scheduleType === 'immediate') return 'Send Now';
                      if (campaignData.scheduleType === 'scheduled') return 'Schedule Campaign';
                      if (campaignData.scheduleType === 'timezone') return 'Send by Timezone';
                      return 'Send Now'; // Default
                    })()
                }
              </NavButton>
            ) : (
              <NavButton variant="primary" onClick={nextStep} disabled={isSending}>
                Next
                <FaArrowRight />
              </NavButton>
            )}
          </div>
        </NavigationButtons>

        {/* Sending Feedback Message */}
        <AnimatePresence>
          {sendingMessage && (
            <SendingFeedback
              type={sendingMessage.includes('Error') || sendingMessage.includes('Please') ? 'error' : 'success'}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ duration: 0.3 }}
            >
              {sendingMessage}
            </SendingFeedback>
          )}
        </AnimatePresence>

        {/* Campaign Result Modal */}
        <AnimatePresence>
          {showResultModal && campaignResult && (
            <ResultModal
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResultModal(false)}
            >
              <ModalContent
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalTitle>
                  <FaCheck />
                  Campaign {campaignResult.status === 'draft' ? 'Saved' : 
                           campaignResult.status === 'scheduled' ? 'Scheduled' : 'Sent'} Successfully!
                </ModalTitle>
                
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {campaignResult.status === 'scheduled' 
                    ? `Campaign scheduled for ${formatScheduledTime(getScheduledTime(campaignResult))}`
                    : campaignResult.message}
                </p>

                {campaignResult.stats && (
                  <ModalStats>
                    {/* For immediate sends, show delivery stats */}
                    {campaignResult.status !== 'scheduled' && (
                      <>
                        <StatItem>
                          <StatValue>{campaignResult.stats.total}</StatValue>
                          <StatLabel>Total Recipients</StatLabel>
                        </StatItem>
                        <StatItem>
                          <StatValue>{campaignResult.stats.sent}</StatValue>
                          <StatLabel>Successfully Sent</StatLabel>
                        </StatItem>
                        <StatItem>
                          <StatValue>{campaignResult.stats.failed}</StatValue>
                          <StatLabel>Failed</StatLabel>
                        </StatItem>
                        <StatItem>
                          <StatValue>{campaignResult.stats.successRate}%</StatValue>
                          <StatLabel>Success Rate</StatLabel>
                        </StatItem>
                      </>
                    )}
                    
                    {/* For scheduled sends, show schedule details */}
                    {campaignResult.status === 'scheduled' && (
                      <>
                        <StatItem>
                          <StatValue>{campaignResult.stats.audienceCount || 0}</StatValue>
                          <StatLabel>Target Audiences</StatLabel>
                        </StatItem>
                        <StatItem>
                          <StatValue>{campaignResult.stats.excludedAudienceCount || 0}</StatValue>
                          <StatLabel>Excluded Audiences</StatLabel>
                        </StatItem>
                        <StatItem>
                          <StatValue>{campaignResult.stats.scheduleType || 'scheduled'}</StatValue>
                          <StatLabel>Schedule Type</StatLabel>
                        </StatItem>
                        {campaignResult.stats.deliveryWindow && (
                          <StatItem>
                            <StatValue>{campaignResult.stats.deliveryWindow}</StatValue>
                            <StatLabel>Delivery Window</StatLabel>
                          </StatItem>
                        )}
                      </>
                    )}
                  </ModalStats>
                )}

                {campaignResult.status === 'scheduled' && (
                  <div style={{ 
                    background: 'rgba(108, 99, 255, 0.1)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    margin: '1rem 0'
                  }}>
                    {campaignResult.scheduleType === 'timezone' ? (
                      <div>
                        <p style={{ color: 'var(--primary)', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
                          <FaGlobe style={{ marginRight: '0.5rem' }} />
                          Timezone-Based Delivery
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                          Send Time: {campaignResult.stats?.sendTime} (in each subscriber's timezone)
                        </p>
                        {campaignResult.stats?.deliveryWindow && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                            Delivery Window: {campaignResult.stats.deliveryWindow}
                          </p>
                        )}
                        {campaignResult.stats?.estimatedCompletionTime && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                            Estimated Completion: {campaignResult.stats.estimatedCompletionTime}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--primary)', fontWeight: '600', margin: 0 }}>
                        <FaClock style={{ marginRight: '0.5rem' }} />
                        Scheduled for: {formatScheduledTime(getScheduledTime(campaignResult))}
                      </p>
                    )}
                  </div>
                )}

                <ModalActions>
                  <NavButton onClick={() => setShowResultModal(false)}>
                    Close
                  </NavButton>
                  <NavButton 
                    variant="primary" 
                    onClick={() => {
                      setShowResultModal(false);
                      // Determine which tab to navigate to based on campaign status
                      let targetTab = 'drafts'; // default
                      if (campaignResult.status === 'scheduled') {
                        targetTab = 'scheduled';
                      } else if (campaignResult.status === 'sent' || campaignResult.status === 'completed') {
                        targetTab = 'sent';
                      } else if (campaignData.scheduleType === 'immediate') {
                        // For immediate sends, always go to sent tab (even if status isn't properly set)
                        targetTab = 'sent';
                      }
                      router.push(`/admin/email-campaigns/campaigns?tab=${targetTab}`);
                    }}
                  >
                    View Campaigns
                  </NavButton>
                </ModalActions>
              </ModalContent>
            </ResultModal>
          )}
        </AnimatePresence>

        {/* Email Preview Modal */}
        <AnimatePresence>
            {showPreviewModal && (
            <PreviewModal
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreviewModal(false)}
            >
              <PreviewModalContent
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <PreviewModalHeader>
                  <PreviewModalTitle>
                    {campaignData.subject || 'Email Preview'}
                  </PreviewModalTitle>
                  
                  {/* Device Controls in Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <DeviceToggleContainer style={{ margin: 0, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.3rem' }}>
                      <DeviceToggle 
                        $active={previewDevice === 'mobile'}
                        onClick={() => setPreviewDevice('mobile')}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <FaMobileAlt />
                        Mobile
                      </DeviceToggle>
                      <DeviceToggle 
                        $active={previewDevice === 'tablet'}
                        onClick={() => setPreviewDevice('tablet')}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <FaTabletAlt />
                        Tablet
                      </DeviceToggle>
                      <DeviceToggle 
                        $active={previewDevice === 'desktop'}
                        onClick={() => setPreviewDevice('desktop')}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <FaDesktop />
                        Desktop
                      </DeviceToggle>
                      <DeviceToggle 
                        $active={previewDevice === 'html'}
                        onClick={() => setPreviewDevice('html')}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <FaCode />
                        HTML
                      </DeviceToggle>
                    </DeviceToggleContainer>
                    {previewDevice === 'html' && (
                      <button
                        onClick={copyPreviewHtml}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        title="Copy HTML"
                      >
                        <FaCopy /> Copy
                      </button>
                    )}
                    <button
                      onClick={() => setShowTestModal(true)}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.25)'
                      }}
                      title="Send Test Email"
                    >
                      <FaPaperPlane /> Send Test
                    </button>
                    <PreviewModalClose onClick={() => setShowPreviewModal(false)}>
                      <FaTimes />
                    </PreviewModalClose>
                  </div>
                </PreviewModalHeader>
                
                <PreviewModalBody>
                  {/* Preview Area - Container handles scrolling */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    overflow: 'auto',
                    padding: '2rem',
                    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)'
                  }}>
                    {previewDevice === 'html' ? (
                      <div style={{
                        width: 'min(1400px, 95vw)',
                        margin: '0 auto',
                        background: '#0d0d0d',
                        color: '#ddd',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '1rem',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        overflow: 'auto',
                        maxHeight: 'calc(100vh - 220px)',
                        userSelect: 'text',
                        WebkitUserSelect: 'text',
                        MozUserSelect: 'text',
                        msUserSelect: 'text'
                      }}>
                        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text', msUserSelect: 'text' }}>{previewHtml || generatePreviewHtml()}</pre>
                      </div>
                    ) : (
                      <PreviewContainer $device={previewDevice}>
                        <DeviceFrame $device={previewDevice}>
                          <div style={{
                            background: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            {(() => {
                              console.log('🔍 Preview render - emailElements:', emailElements);
                              console.log('🔍 Preview render - emailElements length:', emailElements?.length || 0);
                              console.log('🔍 Preview render - previewHtml length:', previewHtml?.length || 0);
                              
                              // Check if we have email elements loaded
                              if (!emailElements || emailElements.length === 0) {
                                return (
                                  <div style={{
                                    width: '100%',
                                    height: 'calc(100vh - 200px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#f5f5f5',
                                    color: '#666',
                                    fontSize: '16px'
                                  }}>
                                    <div style={{ textAlign: 'center' }}>
                                      <p>❌ No email elements loaded</p>
                                      <p>Campaign still loading...</p>
                                      <p>emailElements: {emailElements?.length || 0}</p>
                                      <p>isLoadingCampaign: {isLoadingCampaign ? 'true' : 'false'}</p>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Use the preview HTML that was generated when the modal opened
                              const html = previewHtml || generateLocalPreviewHtml();
                              console.log('🔍 Generated HTML length:', html.length);
                              console.log('🔍 Generated HTML preview:', html.substring(0, 500));
                              
                              if (!html || html.length < 100) {
                                return (
                                  <div style={{
                                    width: '100%',
                                    height: 'calc(100vh - 200px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#f5f5f5',
                                    color: '#666',
                                    fontSize: '16px'
                                  }}>
                                    <div style={{ textAlign: 'center' }}>
                                      <p>❌ No preview content available</p>
                                      <p>emailElements: {emailElements?.length || 0}</p>
                                      <p>previewHtml: {previewHtml?.length || 0}</p>
                                      <button 
                                        onClick={() => {
                                          console.log('🔍 Regenerate button clicked');
                                          const newHtml = generateLocalPreviewHtml();
                                          console.log('🔍 New HTML length:', newHtml.length);
                                          setPreviewHtml(newHtml);
                                        }}
                                        style={{
                                          padding: '10px 20px',
                                          background: '#007bff',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '5px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Regenerate Preview
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <iframe
                                  key={`preview-${Date.now()}-${html.length}`}
                                  srcDoc={html}
                                  style={{
                                    width: '100%',
                                    height: 'calc(100vh - 200px)',
                                    border: 'none',
                                    display: 'block',
                                    background: 'white'
                                  }}
                                  title="Full Email Preview"
                                  onLoad={() => console.log('🔍 Iframe loaded successfully')}
                                  onError={(e) => console.error('🔍 Iframe error:', e)}
                                />
                              );
                            })()}
                          </div>
                        </DeviceFrame>
                      </PreviewContainer>
                    )}
                  </div>

                  {/* Footer Info - Fixed at bottom */}
                  <div style={{
                    textAlign: 'center',
                    padding: '1rem 2rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.8rem',
                    color: '#999',
                    background: 'rgba(0, 0, 0, 0.5)',
                    flexShrink: 0
                  }}>
                    💡 Use the device buttons in the header to test how your email looks across different screen sizes
                  </div>
                </PreviewModalBody>
              </PreviewModalContent>
            </PreviewModal>
          )}
        </AnimatePresence>

        {/* Test Email Modal */}
        <AnimatePresence>
          {showTestModal && (
            <ResultModal
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTestModal(false)}
            >
              <ModalContent
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalTitle>
                  <FaPaperPlane />
                  Send Test Email
                </ModalTitle>
                
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Enter an email address to send a test version of this campaign.
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    color: 'var(--text)',
                    fontWeight: '500'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email address..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <ModalActions>
                  <button
                    onClick={() => setShowTestModal(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'transparent',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendTestEmail}
                    disabled={!testEmail.trim() || isSending}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      color: 'white',
                      cursor: !testEmail.trim() || isSending ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      opacity: !testEmail.trim() || isSending ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isSending ? (
                      <>
                        <LoadingSpinner animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane />
                        Send Test
                      </>
                    )}
                  </button>
                </ModalActions>
              </ModalContent>
            </ResultModal>
          )}
        </AnimatePresence>

        {/* Delete Campaign Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <ResultModal
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDeleteClose}
            >
              <ModalContent
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalTitle>
                  <FaExclamationTriangle />
                  Delete Campaign
                </ModalTitle>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Are you sure you want to delete the campaign "{campaignData.name || 'Untitled'}"? 
                  This action cannot be undone and all campaign data will be permanently lost.
                </p>
                <ModalActions>
                  <NavButton onClick={handleDeleteClose} disabled={isDeleting}>
                    Cancel
                  </NavButton>
                  <NavButton 
                    onClick={handleDeleteConfirm} 
                    disabled={isDeleting}
                    style={{ 
                      backgroundColor: 'rgba(220, 53, 69, 0.1)', 
                      color: '#dc3545', 
                      border: '1px solid rgba(220, 53, 69, 0.3)' 
                    }}
                  >
                    {isDeleting && (
                      <LoadingSpinner
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    <FaTrash />
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Campaign'}
                  </NavButton>
                </ModalActions>
              </ModalContent>
            </ResultModal>
          )}
        </AnimatePresence>
      </CreateContainer>
    </>
  );
}

export default CreateCampaignPage; 