"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { 
  FaFont, 
  FaHeading,
  FaMousePointer, 
  FaImage, 
  FaDivide, 
  FaShareAlt, 
  FaExpandArrowsAlt, 
  FaColumns, 
  FaVideo,
  FaDesktop,
  FaMobileAlt,
  FaEnvelope,
  FaTrash,
  FaEdit,
  FaTimes,
  FaCog,
  FaPaintBrush,
  FaTextHeight,
  FaCopy,
  FaGripVertical,
  FaBold,
  FaItalic,
  FaUnderline,
  FaLink,
  FaPalette,
  FaUpload,
  FaCloudUploadAlt,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,

  FaYoutube,
  FaFacebookF,
  FaInstagram,
  FaDiscord,
  FaEye,
  FaCode,
  FaSave
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

// Simple CSS to ensure basic styling works
const fontSizeStyles = `
  .editable-text {
    transition: all 0.2s ease;
  }
`;

// Styled components for the visual editor

const ViewToggle = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.5rem !important;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 25px;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, var(--primary), var(--accent))' 
    : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.active ? 'white' : 'var(--text-secondary)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
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

  &:hover {
    background: ${props => props.active 
      ? 'linear-gradient(135deg, var(--accent), var(--primary))' 
      : 'rgba(255, 255, 255, 0.15)'};
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
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
  flex-wrap: wrap;
`;

const EmailCanvas = styled.div`
  flex: 1;
  background: #f1f3f5; /* light grey margins to match preview */
  border-radius: 16px;
  padding: 0.75rem;
  overflow: visible;
  display: flex;
  justify-content: flex-start;
  min-height: 600px;
  position: relative;
`;

const EmailContainer = styled.div`
  background-color: #f1f3f5; /* canvas grey */
  border-radius: 16px;
  overflow: visible;
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 0; /* show left/right grey margins outside 600px content */

  .email-content {
    background-color: #ffffff;
    max-width: 600px;
    min-width: 320px;
    margin: 0 auto;
    padding: 0 24px;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.04);
    
    /* Ensure no top spacing */
    > *:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
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
  padding: 0;
  background: transparent;
  overflow: visible;
  position: relative;
`;

const EmailFooter = styled.div`
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
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

const EmailElement = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'selected' && prop !== 'editing' && prop !== 'fullWidth' && prop !== 'tightSpacing' && prop !== 'removeBottomMargin' && prop !== 'removeTopMargin' && prop !== 'isBrandHeader',
})<{ selected: boolean; editing: boolean; fullWidth?: boolean; tightSpacing?: boolean; removeBottomMargin?: boolean; removeTopMargin?: boolean; isBrandHeader?: boolean }>`
  margin: ${props => props.fullWidth ? '0 -24px 0 -24px' : '0'};
  padding: 0;
  max-width: ${props => props.fullWidth ? 'none' : 'none'};
  border: none;
  position: relative;
  
  ${props => props.selected && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: ${props.fullWidth ? '0' : '-24px'};
      right: ${props.fullWidth ? '0' : '-24px'};
      bottom: 0;
      border: 2px solid var(--primary);
      border-radius: 0;
      pointer-events: none;
      z-index: 1;
    }
  `}
  border-radius: ${props => props.fullWidth ? '0' : '12px'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: grab;
  overflow: visible;
  background: ${props => 
    props.editing ? 'rgba(108, 99, 255, 0.1)' :
    props.selected ? 'rgba(108, 99, 255, 0.05)' : 
    'transparent'
  };
  
  ${props => props.fullWidth && `
    box-shadow: inset 2px 0 0 rgba(108, 99, 255, 0.3), inset -2px 0 0 rgba(108, 99, 255, 0.3);
  `}

  &:first-child {
    margin-top: 0;
  }

  &:hover {
    border-color: ${props => props.selected ? 'var(--primary)' : 'rgba(108, 99, 255, 0.5)'};
    background: ${props => 
      props.editing ? 'rgba(108, 99, 255, 0.15)' :
      props.selected ? 'rgba(108, 99, 255, 0.08)' : 
      'rgba(108, 99, 255, 0.03)'
    };
    
    .drag-handle {
      opacity: 1 !important;
      transform: translateY(-50%) scale(1.05);
    }
  }

  &:active {
    cursor: grabbing;
  }

  &[draggable="true"] {
    cursor: grab;
  }

  &[draggable="true"]:active {
    cursor: grabbing;
  }
  
  .drag-handle {
    opacity: 0.8;
  }

  .element-controls {
    position: absolute;
    top: 0.5rem;
    right: ${props => props.fullWidth ? '0.5rem' : '-20px'};
    display: flex;
    gap: 0.5rem;
    opacity: 1;
    transition: opacity 0.3s ease;
    z-index: 10;
    pointer-events: auto;
  }

  &:hover .element-controls {
    opacity: 1;
  }
`;

const ElementControl = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);

  &:hover {
    background: var(--primary);
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
  }
`;

// Drag handle for element reordering
const DragHandle = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'fullWidth',
})<{ fullWidth?: boolean }>`
  position: absolute;
  left: ${props => props.fullWidth ? '4px' : '-20px'};
  top: 4px;
  width: 24px;
  height: 24px;
  background: rgba(108, 99, 255, 1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  color: white;
  user-select: none;
  border: 2px solid rgba(255, 255, 255, 0.8);
  pointer-events: auto;
  opacity: 1 !important;
  
  &:hover {
    opacity: 1 !important;
    background: var(--primary);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4);
    cursor: grab;
  }
  
  &:active {
    transform: scale(0.95);
    cursor: grabbing;
  }
  
  &[draggable="true"] {
    cursor: grab;
  }
  
  &[draggable="true"]:active {
    cursor: grabbing;
  }
`;

// ✨ NEW: Rich text formatting toolbar
const FormattingToolbar = styled.div`
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  gap: 0.25rem;
  z-index: 30;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &.show {
    opacity: 1;
    visibility: visible;
  }
`;

const FormatButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  &.active {
    background: var(--primary);
  }
`;

// ✨ NEW: Image upload area
const ImageUploadArea = styled.div`
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--primary);
    background: rgba(108, 99, 255, 0.05);
  }
  
  &.dragover {
    border-color: var(--primary);
    background: rgba(108, 99, 255, 0.1);
  }
`;

const FileInput = styled.input`
  display: none;
`;

// ✨ NEW: Spinning animation for upload indicators
const SpinKeyframes = styled.div`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EditableText = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'editing',
})<{ editing: boolean }>`
  outline: ${props => props.editing ? '2px solid var(--primary)' : 'none'};
  border-radius: 4px;
  padding: ${props => props.editing ? '0.5rem' : '0.25rem'};
  background: ${props => props.editing ? 'rgba(108, 99, 255, 0.1)' : 'transparent'};
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.editing ? 'rgba(108, 99, 255, 0.1)' : 'rgba(108, 99, 255, 0.05)'};
  }

  &:focus {
    outline: 2px solid var(--primary) !important;
    background: rgba(108, 99, 255, 0.1) !important;
  }
  
  &:focus-within {
    outline: 2px solid var(--primary) !important;
    background: rgba(108, 99, 255, 0.1) !important;
  }
`;

// Sidebar styled components
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
  color: var(--primary);
`;

const PanelTitle = styled.h4`
  color: var(--text);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin: 0;
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

  &:hover {
    border-color: var(--primary);
    background: linear-gradient(135deg, rgba(108, 99, 255, 0.2) 0%, rgba(108, 99, 255, 0.1) 100%);
    color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
  }
`;

// Modal components
const ModalOverlay = styled.div`
  position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 300px;
  max-width: 400px;
  width: 90%;
`;

const ModalTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: var(--text);
  font-size: 1.25rem;
  font-weight: 600;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 1rem;
  margin-bottom: 1.5rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
  }
`;

const ColorPickerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ColorInputModal = styled.input`
  width: 100%;
  height: 80px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  background: transparent;
  
  &::-webkit-color-swatch-wrapper {
    padding: 4px;
    border-radius: 8px;
  }
  
  &::-webkit-color-swatch {
    border: none;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  &::-moz-color-swatch {
    border: none;
    border-radius: 8px;
  }

  &:hover {
    border-color: var(--primary);
    transform: scale(1.02);
  }
`;

const ColorPresets = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.5rem;
`;

const ColorPreset = styled.button`
  width: 32px;
  height: 32px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    border-color: var(--primary);
  }
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.$variant === 'primary' ? `
    background: var(--primary);
    color: white;
    
    &:hover {
      background: var(--accent);
      transform: translateY(-1px);
    }
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `}
`;

const ElementBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: grab;
  transition: all 0.3s ease;
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  user-select: none;

  &:hover {
    background: rgba(108, 99, 255, 0.1);
    border-color: rgba(108, 99, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.2);
    color: var(--primary);
  }

  &:active {
    transform: translateY(0);
    cursor: grabbing;
  }

  &[draggable="true"]:hover {
    cursor: grab;
  }

  &[draggable="true"]:active {
    cursor: grabbing;
    opacity: 0.7;
    transform: scale(0.95);
  }
`;

// ✨ NEW: Padding control components
const PaddingControl = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PaddingLabel = styled.label`
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PaddingSlider = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  opacity: 0.8;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 1;
  }
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(108, 99, 255, 0.3);
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.2);
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.5);
    }
  }
  
  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(108, 99, 255, 0.3);
  }
`;

const PaddingValue = styled.span`
  color: var(--primary);
  font-weight: 700;
  font-size: 0.75rem;
`;

const UrlInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
    background: rgba(255, 255, 255, 0.15);
  }
`;

interface VisualEditorProps {
  emailElements: any[];
  setEmailElements: (elements: any[]) => void;
  campaignData: {
    senderName: string;
    subject: string;
    preheader?: string;
  };
  rightPanelExpanded?: boolean;
}

export default function VisualEditor({ 
  emailElements, 
  setEmailElements, 
  campaignData, 
  rightPanelExpanded = true 
}: VisualEditorProps) {
  
  // ✨ NEW: Force update mechanism
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const forceReRender = () => {
    setForceUpdate(prev => prev + 1);
  };


  
  // Helper function to normalize short hex color codes to full 6-digit format
  const normalizeHexColor = useCallback((color: string | undefined): string | undefined => {
    if (!color || typeof color !== 'string') return color;
    // Match 3-digit hex codes like #333, #555, #fff
    const shortHexMatch = color.match(/^#([0-9a-fA-F]{3})$/);
    if (shortHexMatch) {
      // Expand to 6 digits: #333 -> #333333
      const hex = shortHexMatch[1];
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
    return color;
  }, []);

  // ✨ NEW: Normalize elements to ensure they have all required properties
  const normalizeElements = useCallback((elements: any[]) => {
    return elements.map(element => {
      const normalized = {
        // Base properties that all elements should have
        paddingTop: 16,
        paddingBottom: 16,
        fullWidth: false,
        fontSize: '16px',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        fontFamily: 'Arial, sans-serif',
        textColor: '#333333',
        backgroundColor: 'transparent',
        lineHeight: '1.6',
        // Spread existing element properties (these will override defaults)
        ...element,
      // Ensure specific element types have appropriate defaults
      ...(element.type === 'header' && {
        fontSize: element.fontSize || '32px',
        fontWeight: element.fontWeight || 'bold',
        textAlign: element.textAlign || 'center',
        fontFamily: element.fontFamily || 'Arial, sans-serif'
      }),
      ...(element.type === 'text' && {
        fontSize: element.fontSize || '16px',
        fontFamily: element.fontFamily || 'Arial, sans-serif',
        lineHeight: element.lineHeight || '1.6'
      }),
      ...(element.type === 'button' && {
        fontSize: element.fontSize || '16px',
        fontWeight: element.fontWeight || 'bold',
        textAlign: element.textAlign || 'center',
        fontFamily: element.fontFamily || 'Arial, sans-serif'
      }),
      ...(element.type === 'footer' && {
        unsubscribeUrl: element.unsubscribeUrl || 'https://cymasphere.com/unsubscribe?email={{email}}',
        unsubscribeText: element.unsubscribeText || 'Unsubscribe',
        privacyUrl: element.privacyUrl || 'https://cymasphere.com/privacy-policy',
        privacyText: element.privacyText || 'Privacy Policy',
        termsUrl: element.termsUrl || 'https://cymasphere.com/terms-of-service',
        termsText: element.termsText || 'Terms of Service',
        footerText: (() => {
          const year = new Date().getFullYear();
          return element.footerText || ('© ' + year + ' NNAud.io All rights reserved.');
        })()
      })
      };
      
      // Normalize color values (convert short hex to full hex)
      if (normalized.textColor) {
        normalized.textColor = normalizeHexColor(normalized.textColor);
      }
      if (normalized.backgroundColor) {
        normalized.backgroundColor = normalizeHexColor(normalized.backgroundColor);
      }
      
      return normalized;
    });
  }, [normalizeHexColor]);
  
  // ✨ NEW: Normalize elements when they're loaded
  useEffect(() => {
    if (emailElements && emailElements.length > 0) {
      const normalizedElements = normalizeElements(emailElements);
      // Only update if normalization actually changed something
      const hasChanges = JSON.stringify(normalizedElements) !== JSON.stringify(emailElements);
      if (hasChanges) {
        setEmailElements(normalizedElements);
      }
    }
  }, [emailElements, normalizeElements, setEmailElements]);
  
  const [currentView, setCurrentView] = useState<'desktop' | 'mobile' | 'text' | 'html'>('desktop');
  
  // Element reordering state
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [draggedElementIndex, setDraggedElementIndex] = useState<number | null>(null);
  const [elementDragOverIndex, setElementDragOverIndex] = useState<number | null>(null);
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [rightPanelState, setRightPanelState] = useState(rightPanelExpanded);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  // ✨ NEW: Design settings state
  const [designSettings, setDesignSettings] = useState({
    backgroundColor: '#ffffff',
    contentWidth: '1200px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    primaryColor: '#6c63ff',
    textColor: '#333333'
  });

  // ✨ NEW: Rich text formatting state
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [showRawHtmlElements, setShowRawHtmlElements] = useState<Record<string, boolean>>({}); // Toggle between raw HTML and rendered HTML per element
  
  // ✨ NEW: Image upload state
  const [imageUploadElement, setImageUploadElement] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Link and color picker modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibraryItems, setMediaLibraryItems] = useState<Array<{ name: string; path: string; publicUrl: string; type: 'image' | 'video' | 'unknown'; size: number | null; updatedAt: string | null }>>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [mediaSort, setMediaSort] = useState<'recent' | 'name_asc' | 'name_desc' | 'size_desc'>('recent');
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaPageSize, setMediaPageSize] = useState(24);
  const [mediaModalLeft, setMediaModalLeft] = useState<number>(0);
  const [mediaModalWidth, setMediaModalWidth] = useState<number>(800);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [colorPickerType, setColorPickerType] = useState<'text' | 'background'>('text');
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<{
    startOffset: number;
    endOffset: number;
    selectedText: string;
    elementId: string;
  } | null>(null);

  // ✨ NEW: Update design setting
  const updateDesignSetting = (key: string, value: string) => {
    setDesignSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // ✨ NEW: Modern rich text formatting functions
  const applyFormat = (command: string, value?: string) => {
    if (!editingElement) {
      console.warn('❌ No editing element found');
      return;
    }

    try {
      // Find the currently editing element
      const editingElementDOM = document.querySelector(`[data-element-id="${editingElement}"]`) as HTMLElement;
      if (!editingElementDOM) {
        console.warn('❌ Could not find editing element in DOM');
        return;
      }
      
      console.log(`🎯 Found editing element:`, editingElementDOM);
      
      // Make sure the element is focused before applying formatting
      editingElementDOM.focus();
      
      // Handle different commands
      switch (command) {
        case 'bold':
        case 'italic':
        case 'underline':
          document.execCommand(command, false);
          break;
        case 'createLink':
          if (value) {
    document.execCommand(command, false, value);
          }
          break;
        case 'foreColor':
        case 'backColor':
          if (value) {
            document.execCommand(command, false, value);
          }
          break;
        case 'justifyLeft':
        case 'justifyCenter':
        case 'justifyRight':
          const align = command.replace('justify', '').toLowerCase();
          // For alignment, we'll update the element's textAlign style
          updateElement(editingElement, { textAlign: align });
          return;
        default:
          document.execCommand(command, false, value);
      }
      
      // No need to update state - content will be saved when editing stops
      console.log(`📄 Formatting applied to element:`, editingElement);
    } catch (error) {
      console.error('❌ Error applying format:', error);
    }
  };

  const handleTextSelect = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't update toolbar state during editing to avoid re-renders
    // Toolbar is always visible when editing anyway
  };



  // Link and color picker handlers
  const openLinkModal = () => {
    // Only work if we're editing an element
    if (!editingElement) {
      return;
    }
    
    // Get the editing element
    const editingElementDOM = document.querySelector(`[data-element-id="${editingElement}"]`) as HTMLElement;
    if (!editingElementDOM) return;
    
    // Save the current selection with text-based positioning
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      // Get the full text content of the element
      const fullText = editingElementDOM.textContent || '';
      
      // Find the position of the selected text within the full text
      const selectionStart = fullText.indexOf(selectedText);
      const selectionEnd = selectionStart + selectedText.length;
      
      console.log('💾 Saving selection info:', {
        selectedText,
        fullText,
        selectionStart,
        selectionEnd,
        elementId: editingElement
      });
      
      setSelectionInfo({
        startOffset: selectionStart,
        endOffset: selectionEnd,
        selectedText,
        elementId: editingElement
      });
      
      setLinkText(selectedText);
    } else {
      setSelectionInfo(null);
      setLinkText('');
      console.log('❌ No selection to save for link');
    }
    
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
    setSavedSelection(null);
    setSelectionInfo(null);
  };

  const applyLink = () => {
    console.log('🔗 Applying link:', { linkUrl, linkText, editingElement, selectionInfo, selectedElementId });
    
    // Check if this is for a button element (when not editing but selected)
    if (!editingElement && selectedElementId) {
      const selectedElement = emailElements.find(el => el.id === selectedElementId);
      if (selectedElement?.type === 'button') {
        if (!linkUrl.trim()) {
          console.log('❌ Missing URL for button');
          return;
        }
        // Update button URL directly
        updateElement(selectedElementId, { url: linkUrl.trim() });
        console.log('✅ Button URL updated');
        closeLinkModal();
        return;
      }
    }
    
    if (!linkUrl.trim() || !linkText.trim()) {
      console.log('❌ Missing URL or text');
      return;
    }

    if (!editingElement) {
      console.log('❌ No editing element');
      closeLinkModal();
      return;
    }

    // Get the editing element
    const editingElementDOM = document.querySelector(`[data-element-id="${editingElement}"]`) as HTMLElement;
    console.log('📝 Found editing element:', editingElementDOM);
    
    if (editingElementDOM) {
      if (selectionInfo && selectionInfo.selectedText) {
        console.log('📝 Current HTML content:', editingElementDOM.innerHTML);
        console.log('🎯 Target selection:', selectionInfo);
        
        // Use a more sophisticated approach that preserves HTML structure
        const currentHtml = editingElementDOM.innerHTML;
        const selectedText = selectionInfo.selectedText;
        
        // Create the link HTML - use the text from the modal (allows user to change the text)
        const linkHtml = `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer">${linkText.trim()}</a>`;
        
        // Find and replace the selected text in the HTML, being careful to preserve other HTML tags
        // Use a more precise replacement that handles HTML content
        let newHtml = currentHtml;
        
        // Try to find the exact text match in the HTML
        const textIndex = currentHtml.indexOf(selectedText);
        if (textIndex !== -1) {
          // Simple case: the selected text appears as plain text in the HTML
          newHtml = currentHtml.substring(0, textIndex) + linkHtml + currentHtml.substring(textIndex + selectedText.length);
          console.log('✅ Found plain text match, replacing directly');
        } else {
          // More complex case: the selected text might span across HTML tags
          // Use a temporary element to help with the replacement
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = currentHtml;
          
          // Use the Selection API on the temporary element
          const walker = document.createTreeWalker(
            tempDiv,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let textNodes = [];
          let currentNode;
          while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
          }
          
          // Find the text nodes that contain our selected text
          let combinedText = '';
          let startNode = null;
          let endNode = null;
          let startOffset = 0;
          let endOffset = 0;
          
          for (let i = 0; i < textNodes.length; i++) {
            const nodeText = textNodes[i].textContent || '';
            const beforeLength = combinedText.length;
            combinedText += nodeText;
            
            if (combinedText.includes(selectedText) && !startNode) {
              const selectionStart = combinedText.indexOf(selectedText);
              const selectionEnd = selectionStart + selectedText.length;
              
              // Find which nodes contain the start and end of our selection
              let currentLength = 0;
              for (let j = 0; j <= i; j++) {
                const nodeLength = textNodes[j].textContent?.length || 0;
                if (currentLength <= selectionStart && currentLength + nodeLength > selectionStart) {
                  startNode = textNodes[j];
                  startOffset = selectionStart - currentLength;
                }
                if (currentLength < selectionEnd && currentLength + nodeLength >= selectionEnd) {
                  endNode = textNodes[j];
                  endOffset = selectionEnd - currentLength;
                  break;
                }
                currentLength += nodeLength;
              }
              break;
            }
          }
          
          if (startNode && endNode) {
            // Create a range and replace the content
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            
            // Create the link element
            const linkElement = document.createElement('a');
            linkElement.href = linkUrl.trim();
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.textContent = linkText.trim();
            
            // Replace the range content with the link
            range.deleteContents();
            range.insertNode(linkElement);
            
            newHtml = tempDiv.innerHTML;
            console.log('✅ Applied link using complex HTML-aware replacement');
          } else {
            // Fallback: append to the end
            newHtml = currentHtml + ' ' + linkHtml;
            console.log('✅ Fallback: appended link to end');
          }
        }
        
                 console.log('🔄 New HTML content:', newHtml);
         editingElementDOM.innerHTML = newHtml;
         console.log('✅ Link applied while preserving HTML structure');
       } else {
          // No selection info, append link to the end
          const displayText = linkText?.trim() || 'Click here';
          const linkHtml = `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer">${displayText}</a>`;
          editingElementDOM.innerHTML += ' ' + linkHtml;
          console.log('✅ Link appended to element (no selection)');
        }
      
      console.log('✅ Link applied to DOM (will save on Save button click)');
      console.log('🔍 Current DOM content after link:', editingElementDOM.innerHTML);
    }
    
    closeLinkModal();
  };

  const openColorPicker = (type: 'text' | 'background') => {
    // Only work if we're editing an element
    if (!editingElement) {
      return;
    }
    
    // Get the editing element
    const editingElementDOM = document.querySelector(`[data-element-id="${editingElement}"]`) as HTMLElement;
    if (!editingElementDOM) return;
    
    // Save the current selection with text-based positioning
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      // Get the full text content of the element
      const fullText = editingElementDOM.textContent || '';
      
      // Find the position of the selected text within the full text
      const selectionStart = fullText.indexOf(selectedText);
      const selectionEnd = selectionStart + selectedText.length;
      
      console.log('💾 Saving color selection info:', {
        selectedText,
        fullText,
        selectionStart,
        selectionEnd,
        elementId: editingElement,
        type
      });
      
      setSelectionInfo({
        startOffset: selectionStart,
        endOffset: selectionEnd,
        selectedText,
        elementId: editingElement
      });
    } else {
      setSelectionInfo(null);
      console.log('❌ No selection to save for color');
    }
    
    setColorPickerType(type);
    setSelectedColor('#000000');
    setShowColorPicker(true);
  };

  const closeColorPicker = () => {
    setShowColorPicker(false);
    setSelectedColor('#000000');
    setSavedSelection(null);
    setSelectionInfo(null);
  };

  const computeMediaModalPlacement = () => {
    const container = leftPaneRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const width = Math.max(600, Math.floor(rect.width * 0.95));
    const left = Math.floor(rect.left + (rect.width - width) / 2);
    setMediaModalWidth(width);
    setMediaModalLeft(left);
  };

  const openMediaLibrary = async () => {
    try {
      setIsLoadingMedia(true);
      setShowMediaLibrary(true);
      setMediaPage(1);
      computeMediaModalPlacement();
      const { listMedia } = await import('@/app/actions/email-campaigns');
      const json = await listMedia();
      if (json.success) {
        setMediaLibraryItems(json.items || []);
      } else {
        console.error('Failed to load media:', json.error);
      }
    } catch (err) {
      console.error('Error loading media library:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const closeMediaLibrary = () => {
    setShowMediaLibrary(false);
  };

  useEffect(() => {
    if (!showMediaLibrary) return;
    computeMediaModalPlacement();
    const onResize = () => computeMediaModalPlacement();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [showMediaLibrary, rightPanelState]);

  const filterSortMedia = (items: typeof mediaLibraryItems) => {
    let result = items;
    if (mediaTypeFilter !== 'all') {
      result = result.filter(i => i.type === mediaTypeFilter);
    }
    if (mediaSearch.trim()) {
      const q = mediaSearch.trim().toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }
    switch (mediaSort) {
      case 'name_asc':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result = [...result].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'size_desc':
        result = [...result].sort((a, b) => (b.size || 0) - (a.size || 0));
        break;
      case 'recent':
      default:
        result = [...result].sort((a, b) => {
          const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return bt - at;
        });
    }
    return result;
  };

  const filteredMediaItems = filterSortMedia(mediaLibraryItems);
  const totalMediaPages = Math.max(1, Math.ceil(filteredMediaItems.length / mediaPageSize));
  const currentMediaPage = Math.min(mediaPage, totalMediaPages);
  const pagedMediaItems = filteredMediaItems.slice((currentMediaPage - 1) * mediaPageSize, currentMediaPage * mediaPageSize);

  const applyColor = () => {
    if (!selectedColor || !editingElement) {
      console.log('❌ Missing color or editing element');
      closeColorPicker();
      return;
    }

    // Get the editing element
    const editingElementDOM = document.querySelector(`[data-element-id="${editingElement}"]`) as HTMLElement;
    console.log('📝 Found editing element:', editingElementDOM);
    
    if (editingElementDOM) {
      // Focus the element to ensure selection works
      editingElementDOM.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        console.log('🎯 Current selection:', selectedText);
        
        if (selectedText.length > 0) {
          // Apply color to selected text only
          const span = document.createElement('span');
          const styleProperty = colorPickerType === 'text' ? 'color' : 'background-color';
          span.style.setProperty(styleProperty, selectedColor);
          
          try {
            // Extract the selected content and wrap it in the styled span
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
            
            // Clear the selection
            selection.removeAllRanges();
            
            console.log('✅ Color applied to selected text only');
            console.log('🔍 DOM after color application:', editingElementDOM.innerHTML);
          } catch (error) {
            console.error('❌ Error applying color to selection:', error);
            // Fallback: apply to entire element
            const currentText = editingElementDOM.textContent || '';
            const styledContent = `<span style="${styleProperty}: ${selectedColor};">${currentText}</span>`;
            editingElementDOM.innerHTML = styledContent;
            console.log('✅ Fallback: Color applied to entire element');
          }
        } else {
          // No text selected, apply to entire element
          const currentText = editingElementDOM.textContent || '';
          const styleProperty = colorPickerType === 'text' ? 'color' : 'background-color';
          const styledContent = `<span style="${styleProperty}: ${selectedColor};">${currentText}</span>`;
          editingElementDOM.innerHTML = styledContent;
          console.log('✅ Color applied to entire element (no selection)');
        }
      } else {
        // No selection, apply to entire element
        const currentText = editingElementDOM.textContent || '';
        const styleProperty = colorPickerType === 'text' ? 'color' : 'background-color';
        const styledContent = `<span style="${styleProperty}: ${selectedColor};">${currentText}</span>`;
        editingElementDOM.innerHTML = styledContent;
        console.log('✅ Color applied to entire element (no selection API)');
      }
      
      console.log('✅ Color applied to DOM (will save on Save button click)');
    }
    
    closeColorPicker();
  };

  const colorPresets = [
    // Special
    'transparent',
    // Grayscale
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    // Primary colors
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    // Dark colors
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080',
    // Bright colors
    '#FFA500', '#FFC0CB', '#A52A2A', '#90EE90', '#87CEEB', '#DDA0DD',
    // Professional colors
    '#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#6A994E', '#582F0E',
    // Modern colors
    '#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51', '#E63946'
  ];

  // ✨ NEW: Image upload functions (use unified upload-media endpoint)
  const uploadImageToSupabase = async (file: File, elementId: string) => {
    try {
      setImageUploading(elementId);
      setUploadError(null);
      
      // Validate file
      if (!file || !(file instanceof File)) {
        throw new Error('Invalid file object');
      }
      
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }
      
      if (file.size === 0) {
        throw new Error('File is empty');
      }
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 10MB');
      }
      
      console.log('📤 Uploading image to Supabase storage:', file.name, 'Size:', file.size, 'Type:', file.type);
      const { uploadMedia } = await import('@/app/actions/email-campaigns');
      const result = await uploadMedia({ file });
      console.log('📤 Upload result:', result);
      
      if (result.success && result.data?.publicUrl) {
        updateElement(elementId, { src: result.data.publicUrl, alt: file.name });
        setUploadError(null);
        console.log('✅ Image uploaded successfully:', result.data.publicUrl);
      } else {
        const errorMsg = result.error || 'Failed to upload image';
        setUploadError(errorMsg);
        console.error('❌ Upload failed:', errorMsg, result);
        // Show alert for critical errors
        alert(`Upload failed: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred while uploading image';
      setUploadError(errorMsg);
      console.error('❌ Upload error:', error);
      // Show alert for critical errors
      alert(`Upload error: ${errorMsg}`);
    } finally {
      setImageUploading(null);
    }
  };

  const handleImageUpload = (elementId: string) => {
    setImageUploadElement(elementId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const elementId = imageUploadElement;
    
    if (!file) {
      console.warn('⚠️ No file selected');
      setImageUploadElement(null);
      return;
    }
    
    if (!elementId) {
      console.warn('⚠️ No element ID for upload');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    console.log('📁 File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    try {
      await uploadImageToSupabase(file, elementId);
    } catch (error) {
      console.error('❌ Error in handleFileChange:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Reset upload element state after processing
      setImageUploadElement(null);
    }
  };

  const handleImageDrop = async (e: React.DragEvent, elementId: string) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await uploadImageToSupabase(file, elementId);
      }
    }
  };

  // Media upload (image or video)
  const uploadMediaFile = async (file: File): Promise<{ url?: string; type?: 'image' | 'video'; error?: string }> => {
    try {
      const { uploadMedia } = await import('@/app/actions/email-campaigns');
      const result = await uploadMedia({ file });
      if (result.success && result.data?.publicUrl) {
        return { url: result.data.publicUrl, type: file.type.startsWith('image/') ? 'image' : 'video' };
      }
      return { error: result.error || 'Upload failed' };
    } catch (e) {
      return { error: 'Network error' };
    }
  };

  // Element reordering drag handlers
  const handleElementDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Always allow drop and set visual feedback
    e.dataTransfer.dropEffect = draggedElementId ? 'move' : 'copy';
    setElementDragOverIndex(index);
  };

  const handleElementDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    // Check if we're dropping a new element from the palette
    const elementType = e.dataTransfer.getData('text/element-type') || e.dataTransfer.getData('text/plain');
    if (elementType) {
      const newElement = createNewElement(elementType);
      
      // Handle multiple elements (like header-text combo)
      if (Array.isArray(newElement)) {
        const newElements = [...emailElements];
        newElements.splice(dropIndex, 0, ...newElement);
        setEmailElements(newElements);
      } else {
        const newElements = [...emailElements];
        newElements.splice(dropIndex, 0, newElement);
        setEmailElements(newElements);
      }
      
      setElementDragOverIndex(null);
      return;
    }
    
    // Otherwise, handle reordering existing elements
    
    if (draggedElementId && draggedElementIndex !== null && draggedElementIndex !== dropIndex) {
      console.log('✅ Valid drop: moving from', draggedElementIndex, 'to', dropIndex);
      const newElements = [...emailElements];
      const draggedElement = newElements[draggedElementIndex];
      
      // Remove from old position
      newElements.splice(draggedElementIndex, 1);
      
      // Calculate new position (adjust if dropping after original position)
      const adjustedDropIndex = dropIndex > draggedElementIndex ? dropIndex - 1 : dropIndex;
      console.log('🎯 Adjusted drop index:', adjustedDropIndex);
      
      // Insert at new position
      newElements.splice(adjustedDropIndex, 0, draggedElement);
      
      setEmailElements(newElements);
      
      // Reset drag state
      setDraggedElementId(null);
      setDraggedElementIndex(null);
      setElementDragOverIndex(null);
      e.stopPropagation(); // Prevent event from bubbling to main container
      return;
    } else {
      console.log('❌ Invalid drop:', { draggedElementId, draggedElementIndex, dropIndex });
    }
    
    // Reset drag state
    setDraggedElementId(null);
    setDraggedElementIndex(null);
    setElementDragOverIndex(null);
  };

  const createNewElement = (type: string) => {
    const id = type + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // ✨ NEW: Base element with padding, width, and formatting properties
    const baseElement = {
      id,
      type,
      paddingTop: 16,    // Default 16px top padding
      paddingBottom: 16, // Default 16px bottom padding
      fullWidth: false,  // Default to constrained width with margins
      // Rich text formatting properties
      fontSize: '16px',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      fontFamily: 'Arial, sans-serif'  // Default font family
    };
    
    switch (type) {
      case 'header':
        return { 
          ...baseElement, 
          content: 'Your Header Text Here', 
          fullWidth: false,
          fontSize: '32px',
          fontWeight: 'bold',
          textAlign: 'center'
        };
      case 'text':
        return { 
          ...baseElement, 
          content: 'Add your text content here. You can edit this by double-clicking.',
          fontSize: '16px',
          textAlign: 'left'
        };
      case 'button':
        return { 
          ...baseElement, 
          content: 'Click Here', 
          url: '#',
          fontSize: '16px',
          fontWeight: 'bold',
          textAlign: 'center',
          backgroundColor: 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)',
          textColor: '#ffffff'
        };
      case 'header-text':
        return [
          { 
            ...baseElement, 
            id: id + '_header',
            type: 'header',
            content: 'Your Header Text Here', 
            fullWidth: false,
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'left',
            paddingBottom: 0
          },
          { 
            ...baseElement, 
            id: id + '_text',
            type: 'text',
            content: 'Add your text content here. This is a common combination of header and text elements.',
            fontSize: '16px',
            textAlign: 'left',
            paddingTop: 0
          }
        ];
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
          paddingTop: 16,
          paddingBottom: 16,
          backgroundColor: '#363636',
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
    const updatedElements = emailElements.filter(el => el.id !== elementId);
    setEmailElements(updatedElements);
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const duplicateElement = (elementId: string) => {
    const elementToDuplicate = emailElements.find(el => el.id === elementId);
    if (elementToDuplicate) {
      const newElement = {
        ...elementToDuplicate,
        id: `${elementToDuplicate.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: elementToDuplicate.content + ' (Copy)'
      };
      const index = emailElements.findIndex(el => el.id === elementId);
      const updatedElements = [...emailElements];
      updatedElements.splice(index + 1, 0, newElement);
      setEmailElements(updatedElements);
      setSelectedElementId(newElement.id);
    }
  };

  // ✨ NEW: Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Delete key - remove selected element
    if (e.key === 'Delete' && selectedElementId && editingElement !== selectedElementId) {
      e.preventDefault();
      removeElement(selectedElementId);
    }
    
    // Ctrl+D / Cmd+D - duplicate selected element
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedElementId) {
      e.preventDefault();
      duplicateElement(selectedElementId);
    }
    
    // Escape key - deselect element and stop editing
    if (e.key === 'Escape') {
      e.preventDefault();
    setSelectedElementId(null);
      setEditingElement(null);
    }
  }, [selectedElementId, editingElement]);

  // ✨ NEW: Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const selectElement = (elementId: string) => {
    setSelectedElementId(elementId);
    // DON'T clear editing state when selecting - only clear when explicitly stopping edit
    // setEditingElement(null);
    setUploadError(null); // Clear any upload errors when selecting different element
  };

  const startEditing = (elementId: string) => {
    console.log('🎯 START EDITING called for element:', elementId);
    console.log('🎯 Current editingElement state:', editingElement);
    setEditingElement(elementId);
    console.log('🎯 Called setEditingElement with:', elementId);
    
    // Set the DOM content when editing starts (since we're not using dangerouslySetInnerHTML in edit mode)
    setTimeout(() => {
      const element = emailElements.find(el => el.id === elementId);
      const domElement = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
      if (domElement && element) {
        let content = '';
        if (element.type === 'footer') {
          const year = new Date().getFullYear();
          content = element.footerText || ('© ' + year + ' NNAud.io All rights reserved.');
        } else {
          content = element.content || (element.type === 'header' ? 'Enter header text...' : 'Enter your text...');
        }
        domElement.innerHTML = content;
        domElement.focus();
        console.log('🎯 Set DOM content for editing:', domElement.innerHTML);
      }
    }, 0);
  };

  const saveAndStopEditing = () => {
    console.log('💾 SAVE AND STOP EDITING called');
    
    // Save the current content before stopping editing
    if (editingElement) {
      try {
        // Try to find the element in multiple ways
        let editingElementDOM = document.querySelector(`[data-element-id="${editingElement}"]`);
        if (!editingElementDOM) {
          editingElementDOM = document.querySelector(`[data-element-id="${editingElement}"] .editable-text`);
        }
        if (!editingElementDOM) {
          editingElementDOM = document.querySelector(`.editable-text[data-element-id="${editingElement}"]`);
        }

        if (!editingElementDOM) {
          console.log('⚠️ Could not find editing element DOM, using stored content');
          setEditingElement(null);
          return;
        }

        // Get the current content, handling both contentEditable divs and textareas
        let currentContent = '';
        if (editingElementDOM instanceof HTMLTextAreaElement) {
          currentContent = editingElementDOM.value;
        } else {
          currentContent = editingElementDOM.innerHTML;
        }

        const element = emailElements.find(el => el.id === editingElement);
        if (!element) {
          console.log('⚠️ Could not find element in emailElements');
          setEditingElement(null);
          return;
        }

        console.log('💾 SAVING CONTENT:');
        console.log('💾 Previous:', element.content);
        console.log('💾 Current:', currentContent);
        console.log('💾 Has colors?', currentContent.includes('color:') || currentContent.includes('style='));
        console.log('💾 Has spans?', currentContent.includes('<span'));
        console.log('💾 Has links?', currentContent.includes('<a'));
        
        // Only update if we have content
        const existingContent = element.type === 'footer' ? element.footerText : element.content;
        if (currentContent && currentContent !== existingContent) {
          // Handle different element types
          if (element.type === 'footer') {
            setEmailElements(emailElements.map(el => 
              el.id === editingElement ? { ...el, footerText: currentContent } : el
            ));
          } else {
            setEmailElements(emailElements.map(el => 
              el.id === editingElement ? { ...el, content: currentContent } : el
            ));
          }
          console.log('✅ Content saved successfully');
        } else {
          console.log('ℹ️ No content changes to save');
        }
      } catch (error) {
        console.log('⚠️ Error while saving content:', error);
      }
    } else {
      console.log('ℹ️ No editing element to save');
    }
    
    setEditingElement(null);
  };

  const cancelEditing = () => {
    console.log('❌ CANCEL EDITING called');
    
    // Restore original content without saving changes
    if (editingElement) {
      const editingElementDOM = document.querySelector(`[data-element-id="${editingElement}"]`) as HTMLElement;
      const originalElement = emailElements.find(el => el.id === editingElement);
      
      if (editingElementDOM && originalElement) {
        // Restore the original content to the DOM
        if (originalElement.type === 'footer') {
          editingElementDOM.innerHTML = originalElement.footerText || `© ${new Date().getFullYear()} NNAud.io All rights reserved.`;
        } else {
          editingElementDOM.innerHTML = originalElement.content || '';
        }
      }
    }
    
    setEditingElement(null);
  };

  const isElementEditing = (elementId: string) => {
    return editingElement === elementId;
  };

  const handleElementDoubleClick = (elementId: string) => {
    startEditing(elementId);
  };

  // ✨ FIXED: Cursor position preservation for contentEditable
  const saveCursorPosition = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return preCaretRange.toString().length;
  };
  
  const restoreCursorPosition = (element: HTMLElement, cursorPosition: number) => {
    const selection = window.getSelection();
    if (!selection) return;
    
    let charCount = 0;
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const textLength = node.textContent?.length || 0;
      if (charCount + textLength >= cursorPosition) {
        const range = document.createRange();
        range.setStart(node, cursorPosition - charCount);
        range.setEnd(node, cursorPosition - charCount);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      charCount += textLength;
    }
    
    // If we can't find the exact position, place cursor at the end
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleContentChange = (elementId: string, newContent: string, elementRef?: HTMLElement) => {
    // Save cursor position before state update
    const cursorPosition = elementRef ? saveCursorPosition(elementRef) : null;
    
    setEmailElements(emailElements.map(el => 
      el.id === elementId ? { ...el, content: newContent } : el
    ));
    
    // Restore cursor position after React re-render
    if (elementRef && cursorPosition !== null) {
      setTimeout(() => {
        restoreCursorPosition(elementRef, cursorPosition);
      }, 0);
    }
  };

  const updateElement = (elementId: string, updates: any) => {
    // Capture any unsaved text content from the DOM before updating
    const currentTextContent = (() => {
      try {
        const domEl = typeof document !== 'undefined' 
          ? (document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement | null)
          : null;
        if (domEl && domEl.isContentEditable) {
          return domEl.innerHTML;
        }
      } catch {}
      return null;
    })();
    
    const newElements = emailElements.map(el => {
      if (el.id === elementId) {
        // Preserve all existing properties and block-specific settings
        const updatedElement = {
          ...el,
          ...updates,
          // Preserve unsaved text content if available
          content: currentTextContent || el.content,
          // Ensure block type is preserved
          type: updates.type || el.type,
          // Preserve header-specific properties
          headerType: el.type === 'header' ? (updates.headerType || el.headerType) : undefined,
          fontSize: updates.fontSize || el.fontSize,
          fontFamily: updates.fontFamily || el.fontFamily,
          backgroundColor: updates.backgroundColor || el.backgroundColor,
          textColor: updates.textColor || el.textColor,
          // Preserve button-specific properties
          buttonStyle: el.type === 'button' ? (updates.buttonStyle || el.buttonStyle) : undefined,
          url: el.type === 'button' ? (updates.url || el.url) : undefined,
          // Preserve brand header properties
          brandStyle: el.type === 'brand-header' ? (updates.brandStyle || el.brandStyle) : undefined,
          logoStyle: el.type === 'brand-header' ? (updates.logoStyle || el.logoStyle) : undefined,
        };
        
        console.log('🔄 Element updated:', { 
          id: updatedElement.id, 
          type: updatedElement.type, 
          fontSize: updatedElement.fontSize,
          fontFamily: updatedElement.fontFamily,
          contentPreserved: !!currentTextContent
        });
        
        return updatedElement;
      }
      return el;
    });
    
    setEmailElements(newElements);
  };

  // ✨ NEW: Update element padding
  const updateElementPadding = (elementId: string, paddingType: 'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight', value: number) => {
    setEmailElements(emailElements.map(el => 
      el.id === elementId ? { ...el, [paddingType]: value } : el
    ));
  };

  // ✨ NEW: Insert variable into selected element content
  const insertVariable = (variable: string) => {
    if (!selectedElementId) {
      alert('Please select a text or header element first, then click the variable to insert it.');
      return;
    }
    
    const selectedElement = emailElements.find(el => el.id === selectedElementId);
    if (!selectedElement || !['text', 'header', 'button'].includes(selectedElement.type)) {
      alert('Variables can only be inserted into text, header, or button elements.');
      return;
    }
    
    // Insert the variable at the end of the current content
    const currentContent = selectedElement.content || '';
    const newContent = currentContent + (currentContent ? ' ' : '') + variable;
    
    updateElement(selectedElementId, { content: newContent });
  };

  // Helper functions for HTML toggle per element
  const toggleRawHtml = (elementId: string) => {
    setShowRawHtmlElements(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  };

  const isShowingRawHtml = (elementId: string) => {
    return showRawHtmlElements[elementId] || false;
  };

  const renderEmailElement = (element: any, index: number) => {
    // Check if this element should have tight spacing with adjacent elements
    const shouldRemoveBottomMargin = element.paddingBottom === 0 && 
                                   index < emailElements.length - 1 && 
                                   emailElements[index + 1].paddingTop === 0;
    
    const shouldRemoveTopMargin = element.paddingTop === 0 && 
                                index > 0 && 
                                emailElements[index - 1].paddingBottom === 0;
    
    // For non-fullWidth elements, check if they should have tight spacing
    const hasTightSpacing = !element.fullWidth && (shouldRemoveTopMargin || shouldRemoveBottomMargin);
    
    const isSelected = selectedElementId === element.id;
    const isEditing = isElementEditing(element.id);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Allow Enter to create new lines (don't prevent default)
        // Only Shift+Enter or Escape will exit editing mode
        if (e.shiftKey) {
        e.preventDefault();
          saveAndStopEditing();
      }
        // Regular Enter creates a new line (browser default behavior)
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    };

    const handleBlur = (e: React.FocusEvent) => {
      console.log('💡 BLUR EVENT triggered for element:', element.id);
      console.log('💡 Related target:', e.relatedTarget);
      console.log('💡 Current target:', e.currentTarget);
      
      // Delay blur handling to allow toolbar clicks to process
      setTimeout(() => {
        const relatedTarget = e.relatedTarget as HTMLElement;
        
        console.log('💡 Checking blur conditions...');
        console.log('💡 Related target after timeout:', relatedTarget);
        
        // Don't stop editing if:
        // 1. No related target (internal cursor movement)
        // 2. Clicking on toolbar buttons
        // 3. Clicking within the same contentEditable element
        // 4. Clicking on other contentEditable elements (for multi-selection)
        if (!relatedTarget || (relatedTarget && (
          relatedTarget.closest('.formatting-toolbar') ||
          relatedTarget.closest('[data-toolbar-button]') ||
          relatedTarget.matches('[data-toolbar-button]') ||
          relatedTarget.contentEditable === 'true' ||
          relatedTarget.closest('.editable-text') ||
          relatedTarget.closest('.email-element') // Don't exit when clicking within the same element container
        ))) {
          console.log('🎯 Staying in edit mode - safe target or no target');
          return;
        }
        
        // Only exit if truly clicking outside the editing area
        console.log('👋 Exiting edit mode due to blur outside editing area');
        saveAndStopEditing();
      }, 150);
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      // DO NOTHING during editing to prevent re-renders from wiping out formatting
      // All changes (including colors and links) will be saved when user clicks Save
      console.log('📝 Input detected but not updating state (preserving DOM changes)');
    };

    const handleDragStart = (e: React.DragEvent) => {
      console.log('🚀 DRAG START - Element:', element.id, 'Index:', index, 'Type:', element.type);
      console.log('🚀 Event target:', e.target);
      console.log('🚀 Current target:', e.currentTarget);
      console.log('🚀 Target class name:', (e.target as HTMLElement).className);
      console.log('🚀 Current target class name:', (e.currentTarget as HTMLElement).className);
      
      // Prevent drag if element is being edited
      if (isEditing) {
        console.log('❌ Preventing drag - element is being edited');
        e.preventDefault();
        return;
      }
      
      // Drag handle is the only draggable element, so this check is not needed
      console.log('✅ Drag initiated from drag handle for element:', element.id);
      
      // Set drag data
      setDraggedElementId(element.id);
      setDraggedElementIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/element-id', element.id);
      e.dataTransfer.setData('text/element-index', index.toString());
      
      // Change cursor
      document.body.style.cursor = 'grabbing';
      console.log('✅ Drag data set successfully for element:', element.id);
      console.log('✅ Dragged element ID set to:', element.id);
    };

    const handleDragEnd = (e: React.DragEvent) => {
      console.log('🎯 DRAG END - Element:', element.id);
      console.log('🎯 Event target:', e.target);
      console.log('🎯 Target class name:', (e.target as HTMLElement).className);
      e.stopPropagation();
      
      // Reset drag state
      setDraggedElementId(null);
      setDraggedElementIndex(null);
      setElementDragOverIndex(null);
      
      // Reset cursor
      document.body.style.cursor = '';
      console.log('✅ Drag ended, state cleared for element:', element.id);
      console.log('✅ All drag state reset');
    };

    const handleClickCapture = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore clicks on controls/toolbar/drag handle to avoid stealing focus
      if (
        target.closest('.drag-handle') ||
        target.closest('.formatting-toolbar') ||
        target.closest('.element-controls') ||
        target.closest('.image-overlay-actions') ||
        target.closest('[data-toolbar-button]') ||
        target.matches('[data-toolbar-button]') ||
        target.matches('[data-overlay-action]')
      ) {
        return;
      }
      // Select the element on any other click within its wrapper
      e.stopPropagation();
      selectElement(element.id);
    };



    return (
      <EmailElement
        key={element.id}
        selected={isSelected}
        editing={isEditing}
        fullWidth={element.fullWidth}
        tightSpacing={hasTightSpacing}
        removeBottomMargin={shouldRemoveBottomMargin}
        removeTopMargin={shouldRemoveTopMargin}
        isBrandHeader={element.type === 'brand-header'}
        draggable={false}
        onClickCapture={handleClickCapture}
        onDoubleClick={() => handleElementDoubleClick(element.id)}
        onDragOver={(e) => handleElementDragOver(e, index)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleElementDrop(e, index);
        }}
        onDragLeave={() => setElementDragOverIndex(null)}
        style={{
          paddingTop: '0',
          paddingBottom: '0',
          marginTop: '0',
          marginBottom: '0',
          marginLeft: element.fullWidth ? '-24px' : '0',
          marginRight: element.fullWidth ? '-24px' : '0',
          opacity: draggedElementId === element.id ? 0.5 : 1,
          transform: draggedElementId === element.id ? 'scale(0.95)' : 'scale(1)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          borderTop: elementDragOverIndex === index ? '3px solid var(--primary)' : 'none',
          cursor: isEditing ? 'default' : (draggedElementId === element.id ? 'grabbing' : 'grab'),
          background: undefined
        }}
      >
        <div className="element-controls">
          {isEditing ? (
            <>
              <ElementControl onClick={(e) => { e.stopPropagation(); saveAndStopEditing(); }} title="Save Changes">
                <FaSave size={12} />
              </ElementControl>
              <ElementControl onClick={(e) => { e.stopPropagation(); cancelEditing(); }} title="Cancel (Discard Changes)">
                <FaTimes size={12} />
              </ElementControl>
            </>
          ) : (
            <>
              <ElementControl onClick={(e) => { 
                console.log('🔥 EDIT BUTTON CLICKED for element:', element.id);
                e.stopPropagation(); 
                startEditing(element.id); 
              }} title="Edit">
            <FaEdit size={12} />
          </ElementControl>
              <ElementControl onClick={(e) => { 
                console.log('🔥 DUPLICATE BUTTON CLICKED for element:', element.id);
                e.stopPropagation(); 
                duplicateElement(element.id); 
              }} title="Duplicate">
            <FaCopy size={12} />
          </ElementControl>
              <ElementControl onClick={(e) => { 
                console.log('🔥 DELETE BUTTON CLICKED for element:', element.id);
                e.stopPropagation(); 
                removeElement(element.id); 
              }} title="Delete">
            <FaTrash size={12} />
          </ElementControl>
            </>
          )}
        </div>
        {/* Enhanced Drag handle for visual feedback */}
        <DragHandle 
          className="drag-handle" 
          title="Drag to reorder this element"
          draggable={true}
          fullWidth={element.fullWidth}
          onDragStart={(e) => {
            console.log('🚀 DRAG START on drag handle for element:', element.id);
            handleDragStart(e);
          }}
          onDragEnd={(e) => {
            console.log('🎯 DRAG END on drag handle for element:', element.id);
            handleDragEnd(e);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            console.log('🖱️ Drag handle mousedown for element:', element.id);
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('🖱️ Drag handle click for element:', element.id);
          }}
          style={{ userSelect: 'none' }}
        >
          <FaGripVertical size={10} style={{ pointerEvents: 'none', userSelect: 'none' }} />
        </DragHandle>
        {element.type === 'header' && (
          <div style={{ 
            position: 'relative',
            padding: `${element.paddingTop ?? 16}px ${element.paddingRight ?? (element.fullWidth ? 24 : 32)}px ${element.paddingBottom ?? 16}px ${element.paddingLeft ?? (element.fullWidth ? 24 : 32)}px`
          }}>
            {isShowingRawHtml(element.id) ? (
              <textarea
                value={element.content}
                onChange={(e) => handleContentChange(element.id, e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '3em',
                  background: 'transparent',
                  border: '1px dashed rgba(108, 99, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                  color: '#333333',
                  resize: 'vertical'
                }}
              />
            ) : (
          <EditableText
            key={`${element.id}-${element.fontSize}`}
            className="editable-text"
            editing={isEditing}
                contentEditable={isEditing}
            suppressContentEditableWarning={true}
            onKeyDown={handleKeyDown}
                // onBlur={handleBlur}
            onInput={handleInput}
            onMouseUp={isEditing ? handleTextSelect : undefined}
            onClick={(e) => {
              e.stopPropagation();
                  // Only select element if NOT in editing mode
              if (!isEditing) {
                    selectElement(element.id);
              }
            }}
                dangerouslySetInnerHTML={!isEditing ? { __html: element.content || 'Enter header text...' } : undefined}
                data-element-id={element.id}
                            style={{
                  fontSize: element.fontSize || (element.headerType === 'h1' ? '32px' : 
                           element.headerType === 'h2' ? '28px' : 
                           element.headerType === 'h3' ? '24px' : '20px'),
                  fontWeight: element.fontWeight || 'bold',
                  fontStyle: element.fontStyle || 'normal',
                  textDecoration: element.textDecoration || 'none',
                  lineHeight: '1.2',
                  color: element.textColor || '#333333',
                  margin: 0,
                  position: 'relative',
                  cursor: isEditing ? 'text' : 'default',
                  minHeight: '1em',
                  width: element.fullWidth ? '100%' : 'auto',
                  backgroundColor: element.backgroundColor || 'transparent',
                  padding: '0',
                  fontFamily: element.fontFamily || 'Arial, sans-serif',
                  borderRadius: element.fullWidth ? '0' : '0',
                  textAlign: element.textAlign || 'left',
                  outline: 'none'
                }}
              />
            )}
            
            {/* ✨ UPDATED: Always show toolbar when editing */}
            {isEditing && (
              <FormattingToolbar className="show formatting-toolbar">
                <FormatButton 
                  data-toolbar-button="true"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleRawHtml(element.id)} 
                  title={isShowingRawHtml(element.id) ? "Switch to Visual Editor" : "Switch to Raw HTML"}
                  style={{
                    background: isShowingRawHtml(element.id) ? '#6c63ff' : 'transparent',
                    color: 'white'
                  }}
                >
                  {isShowingRawHtml(element.id) ? <FaEye /> : <FaCode />}
                </FormatButton>
                
                {!isShowingRawHtml(element.id) && (
                  <>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="Bold">
                  <FaBold />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} title="Italic">
                  <FaItalic />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} title="Underline">
                  <FaUnderline />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={openLinkModal} title="Add Link">
                      <FaLink />
                    </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => openColorPicker('text')} title="Text Color">
                      <FaPalette />
                    </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyLeft')} title="Align Left">
                  <FaAlignLeft />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyCenter')} title="Align Center">
                  <FaAlignCenter />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyRight')} title="Align Right">
                  <FaAlignRight />
                </FormatButton>
                  </>
                )}
              </FormattingToolbar>
            )}
          </div>
        )}
        {element.type === 'text' && (
          <div style={{ 
            position: 'relative',
            padding: `${element.paddingTop ?? 16}px ${element.paddingRight ?? (element.fullWidth ? 24 : 32)}px ${element.paddingBottom ?? 16}px ${element.paddingLeft ?? (element.fullWidth ? 24 : 32)}px`
          }}>
            {isShowingRawHtml(element.id) ? (
              <textarea
                value={element.content}
                onChange={(e) => handleContentChange(element.id, e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '3em',
                  background: 'transparent',
                  border: '1px dashed rgba(108, 99, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                  color: '#333333',
                  resize: 'vertical'
                }}
              />
            ) : (
          <EditableText
            key={`${element.id}-${element.fontSize}`}
            className="editable-text"
            editing={isEditing}
                contentEditable={isEditing}
            suppressContentEditableWarning={true}
            onKeyDown={handleKeyDown}
                // onBlur={handleBlur}
            onInput={handleInput}
            onMouseUp={isEditing ? handleTextSelect : undefined}
            onClick={(e) => {
              e.stopPropagation();
                  // Only select element if NOT in editing mode
              if (!isEditing) {
                    selectElement(element.id);
              }
            }}
                dangerouslySetInnerHTML={!isEditing ? { __html: element.content || 'Enter your text...' } : undefined}
                data-element-id={element.id}
            style={{
              fontSize: element.fontSize || '16px',
              fontWeight: element.fontWeight || 'normal',
              fontStyle: element.fontStyle || 'normal',
              textDecoration: element.textDecoration || 'none',
              fontFamily: element.fontFamily || 'Arial, sans-serif',
              lineHeight: element.lineHeight || '1.6',
              color: element.textColor || '#333',
              margin: 0,
              position: 'relative',
                  cursor: isEditing ? 'text' : 'default',
              minHeight: '1em',
              width: element.fullWidth ? '100%' : 'auto',
              background: element.backgroundColor || (element.fullWidth ? 'rgba(108, 99, 255, 0.05)' : 'transparent'),
              padding: '0',
              borderRadius: element.fullWidth ? '0' : '0',
                  textAlign: element.textAlign || 'left',
              outline: 'none'
                }}
                data-font-size={element.fontSize || '16px'}
                data-element-type={element.type}
              />
            )}
            
            {/* ✨ UPDATED: Always show toolbar when editing */}
            {isEditing && (
              <FormattingToolbar className="show formatting-toolbar">
                <FormatButton 
                  data-toolbar-button="true"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleRawHtml(element.id)} 
                  title={isShowingRawHtml(element.id) ? "Switch to Visual Editor" : "Switch to Raw HTML"}
                  style={{
                    background: isShowingRawHtml(element.id) ? '#6c63ff' : 'transparent',
                    color: 'white'
                  }}
                >
                  {isShowingRawHtml(element.id) ? <FaEye /> : <FaCode />}
                </FormatButton>
                
                {!isShowingRawHtml(element.id) && (
                  <>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="Bold">
                  <FaBold />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} title="Italic">
                  <FaItalic />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} title="Underline">
                  <FaUnderline />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={openLinkModal} title="Add Link">
                      <FaLink />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => openColorPicker('text')} title="Text Color">
                      <FaPalette />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyLeft')} title="Align Left">
                  <FaAlignLeft />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyCenter')} title="Align Center">
                  <FaAlignCenter />
                </FormatButton>
                    <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyRight')} title="Align Right">
                  <FaAlignRight />
                </FormatButton>
                  </>
                )}
              </FormattingToolbar>
            )}
          </div>
        )}
        {element.type === 'button' && (
          <div style={{ 
            textAlign: element.fullWidth ? 'left' : 'center', 
            margin: 0,
            width: element.fullWidth ? '100%' : 'auto',
            position: 'relative',
            padding: `${element.paddingTop ?? 16}px ${element.paddingRight ?? 0}px ${element.paddingBottom ?? 16}px ${element.paddingLeft ?? 0}px`
          }}>
            {/* ✨ NEW: Formatting toolbar for button text - ABOVE the button */}
            {isEditing && (
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <FormattingToolbar className="show formatting-toolbar">
                  <FormatButton 
                    data-toolbar-button="true"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleRawHtml(element.id)} 
                    title={isShowingRawHtml(element.id) ? "Switch to Visual Editor" : "Switch to Raw HTML"}
                    style={{
                      background: isShowingRawHtml(element.id) ? '#6c63ff' : 'transparent',
                      color: 'white'
                    }}
                  >
                    {isShowingRawHtml(element.id) ? <FaEye /> : <FaCode />}
                  </FormatButton>
                  
                  {!isShowingRawHtml(element.id) && (
                    <>
                      <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="Bold">
                        <FaBold />
                      </FormatButton>
                      <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} title="Italic">
                        <FaItalic />
                      </FormatButton>
                      <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} title="Underline">
                        <FaUnderline />
                      </FormatButton>
                      <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => openColorPicker('text')} title="Text Color">
                        <FaPalette />
                      </FormatButton>
                      <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyLeft')} title="Align Left">
                        <FaAlignLeft />
                      </FormatButton>
                      <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyCenter')} title="Align Center">
                        <FaAlignCenter />
                      </FormatButton>
                      <FormatButton data-toolbar-button="true" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyRight')} title="Align Right">
                        <FaAlignRight />
                      </FormatButton>
                    </>
                  )}
                </FormattingToolbar>
              </div>
            )}
            
            {isEditing ? (
            <EditableText
              key={`${element.id}-${element.fontSize}`}
              className="editable-text"
              editing={isEditing}
              contentEditable={true}
              suppressContentEditableWarning={true}
              onKeyDown={handleKeyDown}
                // onBlur={handleBlur}
              onInput={handleInput}
              onClick={(e) => {
                e.stopPropagation();
              }}
              data-element-id={element.id}
              style={{
                display: element.fullWidth ? 'block' : 'inline-block',
                padding: element.fullWidth ? '0' : '1.25rem 2.5rem',
                background: element.backgroundColor || 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                color: element.textColor || 'white',
                textDecoration: 'none',
                borderRadius: element.fullWidth ? '0' : '50px',
                fontWeight: element.fontWeight || '700',
                fontSize: element.fontSize || '1rem',
                fontFamily: element.fontFamily || 'Arial, sans-serif',
                cursor: 'text',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: element.fullWidth ? 'none' : '0 8px 25px rgba(108, 99, 255, 0.3)',
                minHeight: '1em',
                width: element.fullWidth ? '100%' : 'auto',
                textAlign: element.textAlign || 'center'
              }}
            >
              {element.content}
            </EditableText>
            ) : (
              <a
                href={element.url || '#'}
                target={element.url && element.url.startsWith('http') ? '_blank' : '_self'}
                rel={element.url && element.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startEditing(element.id);
                }}
                style={{
                  display: element.fullWidth ? 'block' : 'inline-block',
                  padding: element.fullWidth ? '0' : '1.25rem 2.5rem',
                  background: element.backgroundColor || 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  color: element.textColor || 'white',
                  textDecoration: 'none',
                  borderRadius: element.fullWidth ? '0' : '50px',
                  fontWeight: element.fontWeight || '700',
                  fontSize: element.fontSize || '1rem',
                  fontFamily: element.fontFamily || 'Arial, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: element.fullWidth ? 'none' : '0 8px 25px rgba(108, 99, 255, 0.3)',
                  width: element.fullWidth ? '100%' : 'auto',
                  textAlign: element.textAlign || 'center'
                }}
                dangerouslySetInnerHTML={{ __html: element.content }}
              />
            )}
            
            {/* URL hint when selected but not editing */}
            {isSelected && !isEditing && element.url && element.url !== '#' && (
              <div style={{
                position: 'absolute',
                top: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                zIndex: 10,
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                🔗 Links to: {element.url}
              </div>
            )}
            
            {/* ✨ Link icon next to button when editing */}
            {isEditing && (
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '-60px',
                transform: 'translateY(-50%)',
                zIndex: 20
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLinkUrl(element.url || '');
                    setShowLinkModal(true);
                  }}
                  style={{
                    background: 'var(--primary)',
                    border: '2px solid white',
                    color: 'white',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(108, 99, 255, 0.5)',
                    transition: 'all 0.3s ease',
                    width: '44px',
                    height: '44px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent)';
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(108, 99, 255, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.5)';
                  }}
                  title="Edit Button URL"
                >
                  <FaLink size={16} />
                </button>
              </div>
            )}

          </div>
        )}
        {element.type === 'image' && (
          <div style={{ 
            textAlign: element.fullWidth ? 'left' : 'center', 
            margin: 0, 
            position: 'relative',
            width: element.fullWidth ? '100%' : 'auto',
            padding: `${element.paddingTop ?? 16}px ${element.paddingRight ?? 0}px ${element.paddingBottom ?? 16}px ${element.paddingLeft ?? 0}px`
          }}>
            {/* Upload progress indicator */}
            {imageUploading === element.id && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(108, 99, 255, 0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                backdropFilter: 'blur(2px)'
              }}>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Uploading to storage...
                </div>
              </div>
            )}
            
            {/* Error message - always show if there's an error */}
            {uploadError && (
              <div style={{
                position: 'absolute',
                top: '-60px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                zIndex: 15,
                whiteSpace: 'nowrap'
              }}>
                {uploadError}
              </div>
            )}
            
            {element.src ? (
              <div style={{ position: 'relative' }}>
            <img 
              src={element.src} 
              alt={element.alt || 'Email image'} 
              draggable={false}
              onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onAuxClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              style={{ 
                maxWidth: '100%', 
                width: element.fullWidth ? '100%' : 'auto',
                height: 'auto', 
                borderRadius: element.fullWidth ? '0' : '8px',
                boxShadow: element.fullWidth ? 'none' : '0 4px 15px rgba(0, 0, 0, 0.1)',
                opacity: imageUploading === element.id ? 0.5 : 1,
                transition: 'opacity 0.3s ease'
              }} 
            />
                {/* ✨ NEW: Image upload overlay when selected */}
                {isSelected && imageUploading !== element.id && (
                  <div className="image-overlay-actions" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}>
                    <button
                      data-overlay-action
                      onClick={() => handleImageUpload(element.id)}
                      style={{
                        background: 'var(--primary)',
                        border: 'none',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <FaUpload size={14} />
                      Upload
                    </button>
                    <button
                      data-overlay-action
                      onClick={openMediaLibrary}
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Select Media
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ✨ NEW: Image upload area when no image */
              (<ImageUploadArea
                onClick={() => imageUploading !== element.id && handleImageUpload(element.id)}
                onDrop={(e) => imageUploading !== element.id && handleImageDrop(e, element.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (imageUploading !== element.id) {
                  e.currentTarget.classList.add('dragover');
                  }
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('dragover');
                }}
                style={{
                  opacity: imageUploading === element.id ? 0.5 : 1,
                  cursor: imageUploading === element.id ? 'not-allowed' : 'pointer'
                }}
              >
                {imageUploading === element.id ? (
                  <>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      border: '3px solid rgba(108, 99, 255, 0.3)',
                      borderTop: '3px solid #6c63ff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '1rem'
                    }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Uploading to Storage...
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666666' }}>
                      Please wait while we save your image
                    </div>
                  </>
                ) : (
                  <>
                <FaCloudUploadAlt size={48} style={{ color: '#6c63ff', marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Upload Image or Video</div>
                <div style={{ fontSize: '0.9rem', color: '#666666', marginBottom: '1rem' }}>
                  Click to browse or drag and drop
                </div>
                <div style={{ fontSize: '0.8rem', color: '#999999' }}>Supports JPG, PNG, GIF (max 10MB), MP4/WebM/Ogg (max 100MB)</div>
                  </>
                )}
              </ImageUploadArea>)
            )}
          </div>
        )}
        {element.type === 'divider' && (
          <div style={{ 
            margin: 0, 
            textAlign: 'center',
            width: element.fullWidth ? '100%' : 'auto'
          }}>
            <div style={{
              height: '2px',
              background: element.fullWidth 
                ? 'linear-gradient(90deg, #ddd, #ddd, #ddd)' 
                : 'linear-gradient(90deg, transparent, #ddd, transparent)',
              width: '100%'
            }} />
          </div>
        )}
        {element.type === 'spacer' && (
          <div style={{ height: element.height || '30px' }} />
        )}
        {element.type === 'social' && (
          <div style={{ textAlign: 'center', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {element.links?.map((link: any, idx: number) => (
                <a key={idx} href={link.url} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: '#6c63ff',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  minWidth: '120px',
                  justifyContent: 'center'
                }}>
                  {link.platform === 'facebook' && <FaFacebookF size={16} />}
                  {link.platform === 'twitter' && <FaXTwitter size={16} />}
                  {link.platform === 'instagram' && <FaInstagram size={16} />}
                  {link.platform === 'youtube' && <FaYoutube size={16} />}
                  {link.platform === 'discord' && <FaDiscord size={16} />}
                </a>
              ))}
            </div>
          </div>
        )}
        {element.type === 'columns' && (
          <div style={{ display: 'flex', gap: '2rem', margin: 0 }}>
            {element.columns?.map((column: any, idx: number) => (
              <div key={idx} style={{ flex: 1, padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <EditableText
                  editing={isEditing}
                  contentEditable={isEditing}
                  suppressContentEditableWarning={true}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  onInput={(e) => {
                    // Save cursor position before update
                    const cursorPosition = saveCursorPosition(e.currentTarget);
                    
                    const newColumns = [...element.columns];
                    newColumns[idx] = { ...newColumns[idx], content: e.currentTarget.textContent || '' };
                    updateElement(element.id, { columns: newColumns });
                    
                    // Restore cursor position after update
                    if (cursorPosition !== null) {
                      setTimeout(() => {
                        restoreCursorPosition(e.currentTarget, cursorPosition);
                      }, 0);
                    }
                  }}
                >
                  {column.content}
                </EditableText>
              </div>
            ))}
          </div>
        )}
        {element.type === 'video' && (
          <div style={{ textAlign: 'center', margin: 0 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={element.thumbnail} 
                alt="Video thumbnail" 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '60px',
                background: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem'
              }}>
                ▶️
              </div>
            </div>
          </div>
        )}
        {element.type === 'footer' && (
          <div style={{ 
            textAlign: 'center', 
            padding: `${element.paddingTop ?? 0}px ${element.paddingRight ?? 0}px ${element.paddingBottom ?? 0}px ${element.paddingLeft ?? 0}px`,
            fontSize: '0.8rem', 
            color: element.textColor || '#ffffff',
            background: element.backgroundColor || '#363636',
            borderTop: element.fullWidth ? 'none' : '1px solid #dee2e6',
            margin: 0,
            width: element.fullWidth ? '100%' : 'auto',
            borderRadius: element.fullWidth ? '0' : 'inherit',
            minHeight: '100px'
          }}>
            {/* Social Links */}
            {element.socialLinks && element.socialLinks.length > 0 && (
              <div style={{ marginTop: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                {element.socialLinks.map((social: any, idx: number) => (
                  <a key={idx} href={social.url} style={{ 
                    textDecoration: 'none',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}>
                    {social.platform === 'facebook' && <img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/fb.png" alt="Facebook" style={{ width: '20px', height: '20px' }} />}
                    {social.platform === 'twitter' && <img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/x.png" alt="Twitter" style={{ width: '20px', height: '20px' }} />}
                    {social.platform === 'instagram' && <img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/insta.png" alt="Instagram" style={{ width: '20px', height: '20px' }} />}
                    {social.platform === 'youtube' && <img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/youtube.png" alt="YouTube" style={{ width: '20px', height: '20px' }} />}
                    {social.platform === 'discord' && <img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/discord.png" alt="Discord" style={{ width: '20px', height: '20px' }} />}
                  </a>
                ))}
              </div>
            )}
            
            {/* Footer Text */}
            {isEditing ? (
              <textarea
                data-element-id={element.id}
                value={(() => {
                  const year = new Date().getFullYear();
                  return element.footerText || ('© ' + year + ' NNAud.io All rights reserved.');
                })()}
                onChange={(e) => {
                  const newVal = e.target.value;
                  setEmailElements(emailElements.map(el => 
                    el.id === element.id ? { ...el, footerText: newVal } : el
                  ));
                }}
                style={{
                  width: '100%',
                  minHeight: '3em',
                  background: 'transparent',
                  border: '1px dashed rgba(108, 99, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                  color: '#ffffff',
                  resize: 'vertical',
                  marginBottom: '1rem'
                }}
              />
            ) : (
              <div
                dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    const year = new Date().getFullYear();
                    const footerText = element.footerText || ('© ' + year + ' NNAud.io All rights reserved.');
                    return String(footerText).replace(/\$\{/g, '&#36;{');
                  })()
                }}
                data-element-id={element.id}
                style={{ marginBottom: '1rem' }}
              />
            )}
            
            {/* Footer Links */}
            <div style={{ marginBottom: '1.5rem' }}>
              <a 
                href={(() => {
                  const url = element.unsubscribeUrl;
                  const finalUrl = (url && typeof url === 'string' && url.trim()) 
                    ? url.trim() 
                    : 'https://cymasphere.com/unsubscribe?email={{email}}';
                  // Ensure URL is always valid
                  if (!finalUrl || finalUrl === '#' || finalUrl.trim() === '') {
                    return 'https://cymasphere.com/unsubscribe?email={{email}}';
                  }
                  return finalUrl;
                })()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ 
                  color: '#ffffff', 
                  textDecoration: 'underline !important',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  display: 'inline-block',
                  textDecorationColor: '#ffffff',
                  textUnderlineOffset: '2px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
              >
                {element.unsubscribeText || 'Unsubscribe'}
              </a>
              {' | '}
              <a 
                href={(() => {
                  const url = element.privacyUrl;
                  if (url && typeof url === 'string' && url.trim()) {
                    return url.trim();
                  }
                  return 'https://cymasphere.com/privacy-policy';
                })()}
                onClick={(e) => e.preventDefault()}
                style={{ 
                  color: '#ffffff', 
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  display: 'inline-block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {element.privacyText || 'Privacy Policy'}
              </a>
              {' | '}
              <a 
                href={(() => {
                  const url = element.termsUrl;
                  if (url && typeof url === 'string' && url.trim()) {
                    return url.trim();
                  }
                  return 'https://cymasphere.com/terms-of-service';
                })()}
                onClick={(e) => e.preventDefault()}
                style={{ 
                  color: '#ffffff', 
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  display: 'inline-block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {element.termsText || 'Terms of Service'}
              </a>
            </div>
            
            {/* Edit hint when selected */}
            {isSelected && !isEditing && (
              <div style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                zIndex: 10
              }}>
                Double-click to edit footer content
              </div>
            )}
          </div>
        )}
        {element.type === 'brand-header' && (
          <div style={{ 
            textAlign: 'center', 
            padding: `${element.paddingTop ?? 0}px ${element.paddingRight ?? 0}px ${element.paddingBottom ?? 0}px ${element.paddingLeft ?? 0}px`,
            background: element.backgroundColor || 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60px',
            gap: '2px',
            width: '100%'
          }}>
            {/* Logo */}
            <img 
              src="/images/cm-logo-icon.png" 
              alt="Cymasphere Logo" 
              style={{
                width: '36px',
                height: '36px',
                objectFit: 'contain',
                opacity: 0.9
              }}
            />
            
            <EditableText
              className="editable-text brand-header"
              editing={isEditing && selectedElementId === element.id}
              contentEditable={isEditing && selectedElementId === element.id}
              suppressContentEditableWarning={true}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onInput={(e) => {
                const newContent = e.currentTarget.textContent || '';
                updateElement(element.id, { content: newContent });
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isEditing) {
                  startEditing(element.id);
                }
              }}
              style={{
                color: element.textColor || '#ffffff',
                fontSize: '1.5rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '2.5px',
                fontFamily: 'var(--font-montserrat), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                cursor: isEditing ? 'text' : 'pointer',
                outline: 'none',
                minHeight: '1em'
              }}
            >
              {element.logoStyle === 'gradient' ? (
                <>
                  <span style={{
                    background: 'linear-gradient(90deg, #6c63ff, #4ecdc4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {element.content ? element.content.slice(0, 4) : 'CYMA'}
                  </span>
                  <span>
                    {element.content ? element.content.slice(4) : 'SPHERE'}
                  </span>
                </>
              ) : (
                <span>{element.content || 'CYMASPHERE'}</span>
              )}
            </EditableText>
            
            {/* Edit hint when selected */}
            {isSelected && !isEditing && (
              <div style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                zIndex: 10
              }}>
                Double-click to edit brand header
              </div>
            )}
          </div>
        )}
      </EmailElement>
    );
  };

  const handleElementHtmlChange = (elementId: string, newHtml: string, elementRef?: HTMLElement) => {
    const cursorPosition = elementRef ? saveCursorPosition(elementRef) : null;

    setEmailElements(emailElements.map(el => {
      if (el.id !== elementId) return el;
      if (el.type === 'footer') {
        return { ...el, footerText: newHtml };
      }
      return { ...el, content: newHtml };
    }));

    if (elementRef && cursorPosition !== null) {
      setTimeout(() => {
        restoreCursorPosition(elementRef, cursorPosition);
      }, 0);
    }
  };

  return (
    <div>
      {/* Keyframes for animations */}
      <SpinKeyframes />
      {/* Visual Email Canvas */}
      {/* Element Palette - Horizontal Top Bar */}
      <div style={{ 
        marginBottom: '1rem',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)',
        borderRadius: '12px',
        padding: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex', 
        gap: '0.75rem', 
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging header element from palette');
            e.dataTransfer.setData('text/element-type', 'header');
            e.dataTransfer.effectAllowed = 'copy';
            console.log('📦 Drag data set:', e.dataTransfer.getData('text/element-type'));
          }}
          onClick={() => {
            const newElement = createNewElement('header');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaHeading size={14} />
          <span>Header</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging text element from palette');
            e.dataTransfer.setData('text/element-type', 'text');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('text');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaFont size={12} />
          <span>Text</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging header-text element from palette');
            e.dataTransfer.setData('text/element-type', 'header-text');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('header-text');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaHeading size={12} />
          <span>Header + Text</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging button element from palette');
            e.dataTransfer.setData('text/plain', 'button');
            e.dataTransfer.setData('text/element-type', 'button');
            e.dataTransfer.effectAllowed = 'copy';
            console.log('📦 Drag data set:', e.dataTransfer.getData('text/element-type'));
          }}
          onClick={() => {
            const newElement = createNewElement('button');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaMousePointer size={12} />
          <span>Button</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging image element from palette');
            e.dataTransfer.setData('text/element-type', 'image');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('image');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaImage size={12} />
          <span>Image</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging divider element from palette');
            e.dataTransfer.setData('text/element-type', 'divider');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('divider');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaDivide size={12} />
          <span>Divider</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging spacer element from palette');
            e.dataTransfer.setData('text/element-type', 'spacer');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('spacer');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaExpandArrowsAlt size={12} />
          <span>Spacer</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging social element from palette');
            e.dataTransfer.setData('text/element-type', 'social');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('social');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaShareAlt size={12} />
          <span>Social</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging columns element from palette');
            e.dataTransfer.setData('text/element-type', 'columns');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('columns');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaColumns size={12} />
          <span>Columns</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging video element from palette');
            e.dataTransfer.setData('text/element-type', 'video');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('video');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaVideo size={12} />
          <span>Video</span>
        </ElementBlock>
        
        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging footer element from palette');
            e.dataTransfer.setData('text/element-type', 'footer');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('footer');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaCog size={12} />
          <span>Footer</span>
        </ElementBlock>

        <ElementBlock 
          draggable={true}
          onDragStart={(e) => {
            console.log('🚀 Dragging brand-header element from palette');
            e.dataTransfer.setData('text/element-type', 'brand-header');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => {
            const newElement = createNewElement('brand-header');
            if (Array.isArray(newElement)) {
              setEmailElements([...emailElements, ...newElement]);
            } else {
              setEmailElements([...emailElements, newElement]);
            }
          }}
        >
          <FaBold size={12} />
          <span>Brand Header</span>
        </ElementBlock>
      </div>

      <div style={{ 
        display: 'flex',
        gap: '0.5rem', 
        minHeight: '600px',
        overflow: 'visible',
        width: '100%'
      }}>
        
        {/* Visual Email Canvas - Left */}
        <div ref={leftPaneRef} style={{ 
          flex: rightPanelState ? '8' : '1 1 auto',
          display: 'flex', 
          flexDirection: 'column',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)',
          borderRadius: '16px',
          padding: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          alignSelf: 'flex-start',
          transition: 'all 0.3s ease',
          overflow: 'visible',
          minWidth: 0
        }}>
          <ViewToggleContainer>
            <ViewToggle 
              active={currentView === 'desktop'}
              onClick={() => setCurrentView('desktop')}
            >
              <FaDesktop style={{ marginRight: '0.5rem' }} />
              Desktop
            </ViewToggle>
            <ViewToggle 
              active={currentView === 'mobile'}
              onClick={() => setCurrentView('mobile')}
            >
              <FaMobileAlt style={{ marginRight: '0.5rem' }} />
              Mobile
            </ViewToggle>
            <ViewToggle 
              active={currentView === 'text'}
              onClick={() => setCurrentView('text')}
            >
              <FaEnvelope style={{ marginRight: '0.5rem' }} />
              Text Only
            </ViewToggle>
            <ViewToggle 
              active={currentView === 'html'}
              onClick={() => setCurrentView('html')}
            >
              <FaCode style={{ marginRight: '0.5rem' }} />
              HTML Code
            </ViewToggle>
            
            
            {currentView === 'html' && (
              <button
                onClick={() => {
                  try {
                    const html = document.getElementById('ve-html-code')?.textContent || '';
                    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(html);
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
                  } catch {}
                }}
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
                title="Copy HTML"
              >
                Copy HTML
              </button>
            )}
            {/* Send Test removed from editor per request */}
          </ViewToggleContainer>

          <EmailCanvas>
            <style dangerouslySetInnerHTML={{ __html: fontSizeStyles }} />
            <EmailContainer style={{
              width: currentView === 'mobile' ? '375px' : '100%',
              maxWidth: currentView === 'text' ? '500px' : 'none',
              backgroundColor: (currentView === 'text' || currentView === 'html') ? '#f8f9fa' : '#f1f3f5',
              fontFamily: currentView === 'html' ? 'monospace' : designSettings.fontFamily,
              fontSize: currentView === 'html' ? '13px' : designSettings.fontSize,
              color: currentView === 'html' ? '#1a1a1a' : designSettings.textColor,
              boxShadow: 'none',
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}>
              {currentView === 'html' ? (
                // HTML code view
                <div style={{ padding: '2rem', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', userSelect: 'text' }}>
                  <pre id="ve-html-code" style={{ whiteSpace: 'pre-wrap', margin: 0, userSelect: 'text' }}>{`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${campaignData?.subject || 'Email Campaign'}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&family=Poppins:wght@400;500;600;700&family=Source+Sans+Pro:wght@400;600;700&family=Nunito:wght@400;600;700&family=Work+Sans:wght@400;500;600&family=Montserrat:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; min-width: 320px; margin: 0 auto;">
                    <tr>
                        <td style="background-color: #ffffff; padding: 0 24px;">
                            ${emailElements.map(element => {
                              switch(element.type) {
                                case 'header':
                                  return `<${element.headerType || 'h1'} style="
                                    font-family: ${element.fontFamily || 'Arial, sans-serif'};
                                    font-size: ${element.fontSize || '24px'};
                                    color: ${element.textColor || '#333333'};
                                    background-color: ${element.backgroundColor || 'transparent'};
                                    padding: 8px;
                                    margin: 0;
                                    text-align: ${element.textAlign || 'center'};
                                    font-weight: ${element.fontWeight || '800'};
                                    line-height: ${element.lineHeight || '1.2'};
                                    ">` + String(element.content || '').replace(/\$\{/g, '&#36;{') + '</' + (element.headerType || 'h1') + '>';
                                case 'text':
                                  return `<div style="
                                    font-family: ${element.fontFamily || 'Arial, sans-serif'};
                                    font-size: ${element.fontSize || '16px'};
                                    color: ${element.textColor || '#333333'};
                                    line-height: ${element.lineHeight || '1.6'};
                                    margin: 0 0 16px 0;
                                    text-align: ${element.textAlign || 'left'};
                                    font-weight: ${element.fontWeight || 'normal'};
                                    ">` + String(element.content || '').replace(/\$\{/g, '&#36;{') + '</div>';
                                case 'button':
                                  return `<a href="${element.url || '#'}" style="
                                    display: ${element.fullWidth ? 'block' : 'inline-block'};
                                    padding: ${element.fullWidth ? '0' : '1.25rem 2.5rem'};
                                    background: ${element.backgroundColor || 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)'};
                                    color: ${element.textColor || '#ffffff'};
                                    text-decoration: none;
                                    border-radius: ${element.fullWidth ? '0' : '50px'};
                                    font-family: ${element.fontFamily || 'Arial, sans-serif'};
                                    font-weight: ${element.fontWeight || '700'};
                                    font-size: ${element.fontSize || '1rem'};
                                    line-height: ${element.lineHeight || '1.2'};
                                    text-align: ${element.textAlign || 'center'};
                                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                                    text-transform: uppercase;
                                    letter-spacing: 1px;
                                    box-shadow: ${element.fullWidth ? 'none' : '0 8px 25px rgba(108, 99, 255, 0.3)'};
                                    min-height: 1em;
                                    width: ${element.fullWidth ? '100%' : 'auto'};
                                    ">` + String(element.content || '').replace(/\$\{/g, '&#36;{') + '</a>';
                                case 'brand-header':
                                  return `<div style="
                                    text-align: center;
                                    background: ${element.backgroundColor || 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)'};
                                    padding: ${element.fullWidth ? '0' : '20px'};
                                    margin: 0 -24px;
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
                                      font-size: 1.5rem;
                                      font-weight: 700;
                                      text-transform: uppercase;
                                      letter-spacing: 2.5px;
                                      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                      min-height: 1em;
                                      line-height: 1.2;
                                      margin: 0;
                                      padding: 0;
                                      display: flex;
                                      align-items: center;
                                    ">
                                      <span style="
                                        background: linear-gradient(90deg, #6c63ff, #4ecdc4);
                                        -webkit-background-clip: text;
                                        -webkit-text-fill-color: transparent;
                                        background-clip: text;
                                      ">CYMA</span>
                                      <span style="
                                        color: ${element.textColor || '#ffffff'};
                                      ">SPHERE</span>
                                    </div>
                                  </div>`;
                                case 'image':
                                  return `<div style="text-align: ${element.textAlign || 'center'}; margin: 16px 0;">
                                    <img src="${element.src || 'https://via.placeholder.com/600x300'}" 
                                         alt="${element.alt || 'Email Image'}" 
                                         style="
                                           max-width: 100%; 
                                           height: auto; 
                                           border-radius: ${element.fullWidth ? '0' : '8px'}; 
                                           box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                                         " />
                                  </div>`;
                                case 'divider':
                                  return `<div style="text-align: ${element.textAlign || 'center'}; margin: 16px 0;">
                                    <hr style="border: none; height: 2px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); margin: 16px 0;" />
                                  </div>`;
                                case 'spacer':
                                  return `<div style="height: ${element.height || '20px'};"></div>`;
                                case 'footer':
                                  return `<div style="
                                    text-align: ${element.textAlign || 'center'}; 
                                    padding: 2rem; 
                                    font-size: ${element.fontSize || '0.8rem'}; 
                                    color: ${element.textColor || '#666666'}; 
                                    background: ${element.backgroundColor || 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'}; 
                                    font-weight: ${element.fontWeight || 'normal'}; 
                                    font-family: ${element.fontFamily || 'Arial, sans-serif'}; 
                                    line-height: ${element.lineHeight || '1.4'}; 
                                    border-top: 1px solid #dee2e6; 
                                    margin-top: 2rem;
                                  ">
                                    ' + (() => {
                                    const year = new Date().getFullYear();
                                    const footerText = element.footerText || ('© ' + year + ' NNAud.io All rights reserved.');
                                    return String(footerText).replace(/\$\{/g, '&#36;{');
                                  })() + '
                                  </div>`;
                                default:
                                  return '';
                              }
                            }).join('\n                            ')}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`}</pre>
                </div>
              ) : currentView === 'text' ? (
                // Text-only view
                (<div style={{ padding: '2rem', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #ddd' }}>
                    <strong>From:</strong> {campaignData.senderName || 'Sender Name'}<br/>
                    <strong>Subject:</strong> {campaignData.subject || 'Email Subject'}<br/>
                    {campaignData.preheader && (
                      <>
                        <strong>Preheader:</strong> {campaignData.preheader}<br/>
                      </>
                    )}
                  </div>
                  

                  
                  {emailElements.map((element, index) => {
                    // Helper function to strip HTML tags for text-only view
                    const stripHtml = (html: string) => {
                      const div = document.createElement('div');
                      div.innerHTML = html;
                      return div.textContent || div.innerText || '';
                    };
                    
                    return (
                    <div key={element.id} style={{ marginBottom: '1rem' }}>
                      {element.type === 'header' && <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stripHtml(element.content)}</div>}
                      {element.type === 'text' && <div>{stripHtml(element.content)}</div>}
                      {element.type === 'button' && <div style={{ padding: '0.5rem', border: '1px solid #ddd', display: 'inline-block' }}>[BUTTON: {stripHtml(element.content)}]</div>}
                      {element.type === 'image' && <div style={{ fontStyle: 'italic' }}>[IMAGE: {element.src}]</div>}
                      {element.type === 'divider' && <div>{'─'.repeat(50)}</div>}
                      {element.type === 'spacer' && <div style={{ height: element.height || '20px' }}></div>}
                      {element.type === 'footer' && (
                  <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #dddddd', fontSize: '0.8rem', color: '#666666' }}>
                          {/* Social Links */}
                          {element.socialLinks && element.socialLinks.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              Social Links: {element.socialLinks.map((social: any, idx: number) => (
                                `${social.platform}: ${social.url}`
                              )).join(' | ')}
                  </div>
                          )}
                          {/* Footer Text */}
                          <div style={{ marginBottom: '0.5rem' }}>
                            {element.footerText || `© ${new Date().getFullYear()} NNAud.io All rights reserved.`}
                          </div>
                          {/* Footer Links */}
                          <div>
                            {element.unsubscribeText || 'Unsubscribe'}: {element.unsubscribeUrl || '#unsubscribe'} | 
                            {element.privacyText || 'Privacy Policy'}: {element.privacyUrl || '#privacy'} | 
                            {element.contactText || 'Contact Us'}: {element.contactUrl || '#contact'}
                          </div>
                        </div>
                      )}
                      {element.type === 'brand-header' && (
                      <div style={{ 
                          textAlign: 'center', 
                          marginBottom: '2rem', 
                          paddingBottom: '1rem', 
                          borderBottom: '2px solid #ddd',
                        fontSize: '1.5rem',
                          fontWeight: 'bold',
                          letterSpacing: '0.2em'
                      }}>
                          [LOGO] {element.content || 'CYMASPHERE'}
                      </div>
                      )}
                      </div>
                    );
                  })}
                </div>)
              ) : (
                // Visual view (desktop/mobile)
                (<>
                  <div className="email-content">
                    <EmailBody
                      onDragOver={(e) => {
                      e.preventDefault();
                      console.log('🔄 Drag over main container');
                      e.dataTransfer.dropEffect = 'copy';
                      if (emailElements.length === 0) {
                        setElementDragOverIndex(0);
                      }
                      // Don't stop propagation here - let drop zones handle it
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🎯 Main container drop triggered');
                      const elementType = e.dataTransfer.getData('text/element-type') || e.dataTransfer.getData('text/plain');
                      console.log('📦 Main container received drag data:', elementType);
                      if (elementType) {
                        // Add to end if dropping on main container
                        handleElementDrop(e, emailElements.length);
                      }
                    }}
                    onDragLeave={() => {
                      if (emailElements.length === 0) {
                        setElementDragOverIndex(null);
                      }
                    }}
                  >
                    {emailElements.map((element, index) => (
                      <React.Fragment key={element.id}>
                        {/* Element reordering drop zone at the beginning */}
                        {index === 0 && (
                          <div
                            onDragOver={(e) => handleElementDragOver(e, 0)}
                            onDrop={(e) => {
                              console.log('🎯 First drop zone drop at index: 0');
                              e.preventDefault();
                              e.stopPropagation();
                              handleElementDrop(e, 0);
                            }}
                            style={{
                              height: elementDragOverIndex === 0 ? '6px' : '0px',
                              background: elementDragOverIndex === 0 ? 'var(--primary)' : 'transparent',
                              transition: 'all 0.2s ease',
                              margin: '0',
                              borderRadius: '2px'
                            }}
                          />
                        )}
                        
                        {renderEmailElement(element, index)}
                        
                        {/* Element reordering drop zone after each element */}
                        <div
                          onDragOver={(e) => handleElementDragOver(e, index + 1)}
                          onDrop={(e) => {
                            console.log('🎯 Drop zone drop at index:', index + 1);
                            e.preventDefault();
                            e.stopPropagation();
                            handleElementDrop(e, index + 1);
                          }}
                          style={{
                            height: elementDragOverIndex === index + 1 ? '6px' : (index === emailElements.length - 1 ? '12px' : '0px'),
                            background: elementDragOverIndex === index + 1 ? 'var(--primary)' : (index === emailElements.length - 1 ? 'rgba(108, 99, 255, 0.05)' : 'transparent'),
                            transition: 'all 0.2s ease',
                            margin: '0',
                            borderRadius: '2px'
                          }}
                        />
                      </React.Fragment>
                    ))}
                    
                    {/* Empty state */}
                    {emailElements.length === 0 && (
                      <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: '#666666',
                        fontSize: '1.1rem',
                        border: elementDragOverIndex === 0 ? '2px dashed var(--primary)' : '2px dashed transparent',
                        borderRadius: '12px',
                        background: elementDragOverIndex === 0 ? 'rgba(108, 99, 255, 0.05)' : 'transparent',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                          {elementDragOverIndex === 0 ? 'Drop element here!' : 'Start Building Your Email'}
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                          {elementDragOverIndex === 0 ? 'Release to add the element' : 'Drag elements from above or click to add them'}
                        </div>
                      </div>
                    )}
                  </EmailBody>
                  </div>
                </>)
              )}
            </EmailContainer>
          </EmailCanvas>
        </div>

        {/* Settings Panels - Right */}
        <div style={{ 
          width: rightPanelState ? '320px' : '50px',
          flexShrink: 0,
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem', 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)',
          borderRadius: '16px',
          padding: rightPanelState ? '0.5rem' : '0.25rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          alignSelf: 'flex-start',
          transition: 'all 0.3s ease',
          overflow: 'visible'
        }}>
          
          {/* Toggle Button */}
          <div style={{ 
            display: 'flex', 
            justifyContent: rightPanelState ? 'flex-end' : 'center',
            marginBottom: rightPanelState ? '0' : '1rem'
          }}>
            <button
              onClick={() => setRightPanelState(!rightPanelState)}
              style={{ 
                padding: '0.75rem',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                border: 'none', 
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                minHeight: '40px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(108, 99, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
              }}
            >
              {rightPanelState ? '→' : '←'}
            </button>
          </div>

          {rightPanelState && (
            <>
              {/* Element Properties */}
              <SidebarPanel>
                <PanelHeader>
                  <PanelIcon><FaCog /></PanelIcon>
                  <PanelTitle>Element Properties</PanelTitle>
                </PanelHeader>
                {selectedElementId ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(108, 99, 255, 0.1)', borderRadius: '8px' }}>
                      <p style={{ margin: 0, color: 'var(--text)', fontWeight: '600' }}>
                        Selected: {emailElements.find(el => el.id === selectedElementId)?.type || 'Unknown'} Element
                      </p>
                    </div>
                    
                    {/* ✨ NEW: Padding Controls */}
                    <PaddingControl>
                      <div style={{ marginBottom: '1rem' }}>
                        <PaddingLabel>
                          Padding Top
                        </PaddingLabel>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <PaddingSlider
                            type="range"
                            min="0"
                            max="100"
                            value={emailElements.find(el => el.id === selectedElementId)?.paddingTop ?? 16}
                            onChange={(e) => updateElementPadding(selectedElementId, 'paddingTop', parseInt(e.target.value))}
                            style={{ flex: 1 }}
                          />
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={emailElements.find(el => el.id === selectedElementId)?.paddingTop ?? 16}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              updateElementPadding(selectedElementId, 'paddingTop', value);
                            }}
                            style={{
                              width: '60px',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'white',
                              textAlign: 'center',
                              fontSize: '0.9rem'
                            }}
                          />
                          <span style={{ color: 'white', fontSize: '0.8rem' }}>px</span>
                        </div>
                      </div>
                      
                      <div>
                        <PaddingLabel>
                          Padding Bottom
                        </PaddingLabel>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <PaddingSlider
                            type="range"
                            min="0"
                            max="100"
                            value={emailElements.find(el => el.id === selectedElementId)?.paddingBottom ?? 16}
                            onChange={(e) => updateElementPadding(selectedElementId, 'paddingBottom', parseInt(e.target.value))}
                            style={{ flex: 1 }}
                          />
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={emailElements.find(el => el.id === selectedElementId)?.paddingBottom ?? 16}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              updateElementPadding(selectedElementId, 'paddingBottom', value);
                            }}
                            style={{
                              width: '60px',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'white',
                              textAlign: 'center',
                              fontSize: '0.9rem'
                            }}
                          />
                          <span style={{ color: 'white', fontSize: '0.8rem' }}>px</span>
                        </div>
                      </div>
                    </PaddingControl>
                    
                    {/* Full Width Toggle */}
                    <ControlGroup>
                      <ControlLabel style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={emailElements.find(el => el.id === selectedElementId)?.fullWidth ?? false}
                          onChange={(e) => updateElement(selectedElementId, { fullWidth: e.target.checked })}
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: 'var(--primary)',
                            cursor: 'pointer'
                          }}
                        />
                        Full Width
                        {emailElements.find(el => el.id === selectedElementId)?.fullWidth && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            background: 'var(--primary)', 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            FULL
                          </span>
                        )}
                      </ControlLabel>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: 'var(--text-secondary)', 
                        opacity: 0.8,
                        marginTop: '0.25rem'
                      }}>
                        {emailElements.find(el => el.id === selectedElementId)?.fullWidth 
                          ? '✨ Element extends to email container edges' 
                          : 'Expand element to full email width'}
                      </div>
                    </ControlGroup>

                    {/* Image Specific Controls */}
                    {emailElements.find(el => el.id === selectedElementId)?.type === 'image' && (
                      <>
                        <ControlGroup>
                          <ControlLabel>Image URL</ControlLabel>
                          <input
                            type="text"
                            value={emailElements.find(el => el.id === selectedElementId)?.src || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateElement(selectedElementId, { src: e.target.value })}
                            placeholder="https://..."
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text)'
                            }}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Alt Text</ControlLabel>
                          <input
                            type="text"
                            value={emailElements.find(el => el.id === selectedElementId)?.alt || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateElement(selectedElementId, { alt: e.target.value })}
                            placeholder="Describe the image"
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text)'
                            }}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Corner Radius</ControlLabel>
                          <PaddingSlider
                            type="range"
                            min="0"
                            max="32"
                            value={parseInt((emailElements.find(el => el.id === selectedElementId)?.borderRadius || '8px').toString())}
                            onChange={(e) => updateElement(selectedElementId, { borderRadius: `${e.target.value}px` })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Shadow</ControlLabel>
                          <input
                            type="text"
                            value={emailElements.find(el => el.id === selectedElementId)?.boxShadow || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateElement(selectedElementId, { boxShadow: e.target.value })}
                            placeholder="e.g. 0 4px 15px rgba(0,0,0,0.1)"
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text)'
                            }}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Actions</ControlLabel>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleImageUpload(selectedElementId)} style={{
                              background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer'
                            }}>Upload</button>
                            <button onClick={openMediaLibrary} style={{
                              background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer'
                            }}>Select Media</button>
                          </div>
                        </ControlGroup>
                      </>
                    )}

                    {/* Header Specific Controls */}
                    {emailElements.find(el => el.id === selectedElementId)?.type === 'header' && (
                      <>
                        <ControlGroup>
                          <ControlLabel>Header Type</ControlLabel>
                          <ControlSelect
                            value={emailElements.find(el => el.id === selectedElementId)?.headerType || 'h1'}
                            onChange={(e) => updateElement(selectedElementId, { headerType: e.target.value })}
                          >
                            <option value="h1">H1 - Main Heading</option>
                            <option value="h2">H2 - Section Heading</option>
                            <option value="h3">H3 - Subsection Heading</option>
                            <option value="h4">H4 - Minor Heading</option>
                          </ControlSelect>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Text Color</ControlLabel>
                          <ColorInput
                            type="color"
                            value={emailElements.find(el => el.id === selectedElementId)?.textColor || '#333333'}
                            onChange={(e) => updateElement(selectedElementId, { textColor: e.target.value })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Background Color</ControlLabel>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <ColorInput
                              type="color"
                              value={emailElements.find(el => el.id === selectedElementId)?.backgroundColor === 'transparent' ? '#ffffff' : (emailElements.find(el => el.id === selectedElementId)?.backgroundColor || '#ffffff')}
                              onChange={(e) => updateElement(selectedElementId, { backgroundColor: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => updateElement(selectedElementId, { backgroundColor: 'transparent' })}
                              style={{
                                width: '48px',
                                height: '48px',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                backgroundSize: '8px 8px',
                                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                                backgroundColor: 'transparent'
                              }}
                              title="Transparent"
                            />
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Font Size</ControlLabel>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="range"
                              min="12"
                              max="72"
                              value={parseInt((emailElements.find(el => el.id === selectedElementId)?.fontSize || '24px').replace('px', ''))}
                              onChange={(e) => {
                                console.log('🎨 Header font size slider changed:', { 
                                  elementId: selectedElementId, 
                                  newSize: `${e.target.value}px`,
                                  currentElements: emailElements
                                });
                                updateElement(selectedElementId, { fontSize: `${e.target.value}px` });
                              }}
                              style={{ flex: 1 }}
                            />
                            <span style={{ minWidth: '3em', textAlign: 'right' }}>
                              {emailElements.find(el => el.id === selectedElementId)?.fontSize || '24px'}
                            </span>
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Font Family</ControlLabel>
                          <ControlSelect
                            value={emailElements.find(el => el.id === selectedElementId)?.fontFamily || 'Arial, sans-serif'}
                            onChange={(e) => updateElement(selectedElementId, { fontFamily: e.target.value })}
                          >
                            {/* Google Fonts - Modern & Professional */}
                            <optgroup label="Google Fonts">
                              <option value="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Inter (Modern)</option>
                              <option value="'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Open Sans (Clean)</option>
                              <option value="'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Roboto (Google)</option>
                              <option value="'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Lato (Friendly)</option>
                              <option value="'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Poppins (Geometric)</option>
                              <option value="'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Source Sans Pro (Adobe)</option>
                              <option value="'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Nunito (Rounded)</option>
                              <option value="'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Work Sans (Contemporary)</option>
                            </optgroup>
                            
                            {/* Brand Fonts */}
                            <optgroup label="Brand Fonts">
                              <option value="'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Montserrat (Brand)</option>
                            </optgroup>
                            
                            {/* System Fonts - Universal Compatibility */}
                            <optgroup label="System Fonts">
                              <option value="Arial, sans-serif">Arial (Universal)</option>
                              <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica Neue</option>
                              <option value="'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif">Segoe UI (Windows)</option>
                              <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System Default</option>
                            </optgroup>
                            
                            {/* Serif Fonts */}
                            <optgroup label="Serif Fonts">
                              <option value="'Times New Roman', serif">Times New Roman</option>
                              <option value="'Georgia', serif">Georgia</option>
                              <option value="'Merriweather', serif">Merriweather (Google)</option>
                              <option value="'Playfair Display', serif">Playfair Display (Elegant)</option>
                            </optgroup>
                          </ControlSelect>
                          
                          {/* Font Preview */}
                          <div style={{ 
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '0.85rem',
                            fontFamily: emailElements.find(el => el.id === selectedElementId)?.fontFamily || 'Arial, sans-serif'
                          }}>
                            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Preview:</div>
                            <div>The quick brown fox jumps over the lazy dog</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>1234567890</div>
                          </div>
                        </ControlGroup>
                      </>
                    )}

                    {/* Button Specific Controls */}
                    {emailElements.find(el => el.id === selectedElementId)?.type === 'button' && (
                      <>
                        <ControlGroup>
                          <ControlLabel style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaLink size={14} />
                            Button URL
                          </ControlLabel>
                          <UrlInput
                            type="url"
                            placeholder="https://example.com or #anchor"
                            value={emailElements.find(el => el.id === selectedElementId)?.url || '#'}
                            onChange={(e) => updateElement(selectedElementId, { url: e.target.value })}
                          />
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--text-secondary)', 
                            opacity: 0.8,
                            marginTop: '0.25rem'
                          }}>
                            🔗 Link destination when button is clicked
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Button Background</ControlLabel>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <ColorInput
                              type="color"
                              value={emailElements.find(el => el.id === selectedElementId)?.backgroundColor || '#6c63ff'}
                              onChange={(e) => updateElement(selectedElementId, { backgroundColor: e.target.value, gradient: '' })}
                              title="Solid color"
                            />
                            <input
                              type="text"
                              placeholder="CSS gradient, e.g. linear-gradient(135deg, #6c63ff, #a88beb)"
                              value={emailElements.find(el => el.id === selectedElementId)?.gradient || ''}
                              onChange={(e) => updateElement(selectedElementId, { gradient: e.target.value })}
                              style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: 'var(--text)'
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Enter a CSS gradient to override the solid color.
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Text Color</ControlLabel>
                          <ColorInput
                            type="color"
                            value={emailElements.find(el => el.id === selectedElementId)?.textColor || '#ffffff'}
                            onChange={(e) => updateElement(selectedElementId, { textColor: e.target.value })}
                          />
                        </ControlGroup>
                      </>
                    )}

                    {/* Text Element Specific Controls */}
                    {emailElements.find(el => el.id === selectedElementId)?.type === 'text' && (
                      <>
                        <ControlGroup>
                          <ControlLabel>Text Color</ControlLabel>
                          <ColorInput
                            type="color"
                            value={emailElements.find(el => el.id === selectedElementId)?.textColor || '#333333'}
                            onChange={(e) => updateElement(selectedElementId, { textColor: e.target.value })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Background Color</ControlLabel>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <ColorInput
                              type="color"
                              value={emailElements.find(el => el.id === selectedElementId)?.backgroundColor === 'transparent' ? '#ffffff' : (emailElements.find(el => el.id === selectedElementId)?.backgroundColor || '#ffffff')}
                              onChange={(e) => updateElement(selectedElementId, { backgroundColor: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => updateElement(selectedElementId, { backgroundColor: 'transparent' })}
                              style={{
                                width: '48px',
                                height: '48px',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                backgroundSize: '8px 8px',
                                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                                backgroundColor: 'transparent'
                              }}
                              title="Transparent"
                            />
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Font Size</ControlLabel>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="range"
                              min="12"
                              max="48"
                              value={parseInt((emailElements.find(el => el.id === selectedElementId)?.fontSize || '16px').replace('px', ''))}
                              onChange={(e) => {
                                console.log('🎨 Font size slider changed:', { 
                                  elementId: selectedElementId, 
                                  newSize: `${e.target.value}px`,
                                  currentElements: emailElements
                                });
                                updateElement(selectedElementId, { fontSize: `${e.target.value}px` });
                              }}
                              style={{ flex: 1 }}
                            />
                            <input
                              type="number"
                              min="12"
                              max="48"
                              value={parseInt((emailElements.find(el => el.id === selectedElementId)?.fontSize || '16px').replace('px', ''))}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 16;
                                updateElement(selectedElementId, { fontSize: `${value}px` });
                              }}
                              style={{
                                width: '60px',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: 'white',
                                textAlign: 'center',
                                fontSize: '0.9rem'
                              }}
                            />
                            <span style={{ color: 'white', fontSize: '0.8rem' }}>px</span>
                          </div>
                          
                          {/* Debug Info */}
                          <div style={{ 
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)'
                          }}>
                            <div>Current: {emailElements.find(el => el.id === selectedElementId)?.fontSize || '16px'}</div>
                            <div>Type: {emailElements.find(el => el.id === selectedElementId)?.type || 'unknown'}</div>
                            <div>ID: {selectedElementId}</div>
                            <div>All Elements: {JSON.stringify(emailElements.map(el => ({ id: el.id, type: el.type, fontSize: el.fontSize })))}</div>
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Font Family</ControlLabel>
                          <ControlSelect
                            value={emailElements.find(el => el.id === selectedElementId)?.fontFamily || 'Arial, sans-serif'}
                            onChange={(e) => updateElement(selectedElementId, { fontFamily: e.target.value })}
                          >
                            {/* Google Fonts - Modern & Professional */}
                            <optgroup label="Google Fonts">
                              <option value="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Inter (Modern)</option>
                              <option value="'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Open Sans (Clean)</option>
                              <option value="'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Roboto (Google)</option>
                              <option value="'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Lato (Friendly)</option>
                              <option value="'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Poppins (Geometric)</option>
                              <option value="'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Source Sans Pro (Adobe)</option>
                              <option value="'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Nunito (Rounded)</option>
                              <option value="'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Work Sans (Contemporary)</option>
                            </optgroup>
                            
                            {/* Brand Fonts */}
                            <optgroup label="Brand Fonts">
                              <option value="'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Montserrat (Brand)</option>
                            </optgroup>
                            
                            {/* System Fonts - Universal Compatibility */}
                            <optgroup label="System Fonts">
                              <option value="Arial, sans-serif">Arial (Universal)</option>
                              <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica Neue</option>
                              <option value="'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif">Segoe UI (Windows)</option>
                              <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System Default</option>
                            </optgroup>
                            
                            {/* Serif Fonts */}
                            <optgroup label="Serif Fonts">
                              <option value="'Times New Roman', serif">Times New Roman</option>
                              <option value="'Georgia', serif">Georgia</option>
                              <option value="'Merriweather', serif">Merriweather (Google)</option>
                              <option value="'Playfair Display', serif">Playfair Display (Elegant)</option>
                            </optgroup>
                          </ControlSelect>
                          
                          {/* Font Preview */}
                          <div style={{ 
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '0.85rem',
                            fontFamily: emailElements.find(el => el.id === selectedElementId)?.fontFamily || 'Arial, sans-serif'
                          }}>
                            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Preview:</div>
                            <div>The quick brown fox jumps over the lazy dog</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>1234567890</div>
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Font Weight</ControlLabel>
                          <ControlSelect
                            value={emailElements.find(el => el.id === selectedElementId)?.fontWeight || 'normal'}
                            onChange={(e) => updateElement(selectedElementId, { fontWeight: e.target.value })}
                          >
                            <option value="100">Thin (100)</option>
                            <option value="300">Light (300)</option>
                            <option value="400">Normal (400)</option>
                            <option value="500">Medium (500)</option>
                            <option value="600">Semi Bold (600)</option>
                            <option value="700">Bold (700)</option>
                            <option value="800">Extra Bold (800)</option>
                            <option value="900">Black (900)</option>
                          </ControlSelect>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Line Height</ControlLabel>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="range"
                              min="1"
                              max="3"
                              step="0.1"
                              value={parseFloat(emailElements.find(el => el.id === selectedElementId)?.lineHeight || '1.6')}
                              onChange={(e) => updateElement(selectedElementId, { lineHeight: parseFloat(e.target.value) })}
                              style={{ flex: 1 }}
                            />
                            <input
                              type="number"
                              min="1"
                              max="3"
                              step="0.1"
                              value={parseFloat(emailElements.find(el => el.id === selectedElementId)?.lineHeight || '1.6')}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 1.6;
                                updateElement(selectedElementId, { lineHeight: value });
                              }}
                              style={{
                                width: '60px',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(255, 255, 255, 0.06)',
                                fontSize: '0.9rem',
                                color: 'white',
                                textAlign: 'center'
                              }}
                            />
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Text Alignment</ControlLabel>
                          <ControlSelect
                            value={emailElements.find(el => el.id === selectedElementId)?.textAlign || 'left'}
                            onChange={(e) => updateElement(selectedElementId, { textAlign: e.target.value })}
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                            <option value="justify">Justify</option>
                          </ControlSelect>
                        </ControlGroup>
                      </>
                    )}

                    {/* Footer Specific Controls */}
                    {emailElements.find(el => el.id === selectedElementId)?.type === 'footer' && (
                      <>
                        <ControlGroup>
                          <ControlLabel>Background Color</ControlLabel>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <ColorInput
                              type="color"
                              value={emailElements.find(el => el.id === selectedElementId)?.backgroundColor === 'transparent' ? '#ffffff' : (emailElements.find(el => el.id === selectedElementId)?.backgroundColor || '#6c757d')}
                              onChange={(e) => updateElement(selectedElementId, { backgroundColor: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => updateElement(selectedElementId, { backgroundColor: 'transparent' })}
                              style={{
                                width: '48px',
                                height: '48px',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                backgroundSize: '8px 8px',
                                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                                backgroundColor: 'transparent'
                              }}
                              title="Transparent"
                            />
                          </div>
                        </ControlGroup>
                        
                        <ControlGroup>
                          <ControlLabel>Text Color</ControlLabel>
                          <ColorInput 
                            type="color" 
                            value={emailElements.find(el => el.id === selectedElementId)?.textColor || '#ffffff'}
                            onChange={(e) => updateElement(selectedElementId, { textColor: e.target.value })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaLink size={14} />
                            Unsubscribe URL
                          </ControlLabel>
                          <UrlInput
                            type="url"
                            placeholder="https://cymasphere.com/unsubscribe?email={{email}}"
                            value={emailElements.find(el => el.id === selectedElementId)?.unsubscribeUrl || ''}
                            onChange={(e) => updateElement(selectedElementId, { unsubscribeUrl: e.target.value })}
                          />
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--text-secondary)', 
                            opacity: 0.8,
                            marginTop: '0.25rem'
                          }}>
                            Use {'{{email}}'} placeholder for dynamic email
                          </div>
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Unsubscribe Text</ControlLabel>
                          <UrlInput
                            type="text"
                            placeholder="Unsubscribe"
                            value={emailElements.find(el => el.id === selectedElementId)?.unsubscribeText || ''}
                            onChange={(e) => updateElement(selectedElementId, { unsubscribeText: e.target.value })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaLink size={14} />
                            Privacy Policy URL
                          </ControlLabel>
                          <UrlInput
                            type="url"
                            placeholder="https://cymasphere.com/privacy-policy"
                            value={emailElements.find(el => el.id === selectedElementId)?.privacyUrl || ''}
                            onChange={(e) => updateElement(selectedElementId, { privacyUrl: e.target.value })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Privacy Policy Text</ControlLabel>
                          <UrlInput
                            type="text"
                            placeholder="Privacy Policy"
                            value={emailElements.find(el => el.id === selectedElementId)?.privacyText || ''}
                            onChange={(e) => updateElement(selectedElementId, { privacyText: e.target.value })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaLink size={14} />
                            Terms of Service URL
                          </ControlLabel>
                          <UrlInput
                            type="url"
                            placeholder="https://cymasphere.com/terms-of-service"
                            value={emailElements.find(el => el.id === selectedElementId)?.termsUrl || ''}
                            onChange={(e) => updateElement(selectedElementId, { termsUrl: e.target.value })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Terms of Service Text</ControlLabel>
                          <UrlInput
                            type="text"
                            placeholder="Terms of Service"
                            value={emailElements.find(el => el.id === selectedElementId)?.termsText || ''}
                            onChange={(e) => updateElement(selectedElementId, { termsText: e.target.value })}
                          />
                        </ControlGroup>
                      </>
                    )}

                    {/* Brand Header Specific Controls */}
                    {emailElements.find(el => el.id === selectedElementId)?.type === 'brand-header' && (
                      <>
                        <ControlGroup>
                          <ControlLabel>Background Color</ControlLabel>
                          <ColorInput 
                            type="color" 
                            value={emailElements.find(el => el.id === selectedElementId)?.backgroundColor || '#1a1a1a'}
                            onChange={(e) => updateElement(selectedElementId, { backgroundColor: e.target.value })}
                          />
                        </ControlGroup>
                        
                        <ControlGroup>
                          <ControlLabel>Text Color</ControlLabel>
                          <ColorInput 
                            type="color" 
                            value={emailElements.find(el => el.id === selectedElementId)?.textColor || '#ffffff'}
                            onChange={(e) => updateElement(selectedElementId, { textColor: e.target.value })}
                          />
                        </ControlGroup>

                        <ControlGroup>
                          <ControlLabel>Logo Style</ControlLabel>
                          <ControlSelect 
                            value={emailElements.find(el => el.id === selectedElementId)?.logoStyle || 'gradient'}
                            onChange={(e) => updateElement(selectedElementId, { logoStyle: e.target.value })}
                          >
                            <option value="gradient">Gradient</option>
                            <option value="solid">Solid</option>
                          </ControlSelect>
                        </ControlGroup>
                      </>
                    )}
                    
                    <ControlGroup>
                      <ControlLabel>Element ID</ControlLabel>
                      <div style={{ 
                        padding: '0.75rem', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)'
                      }}>
                        {selectedElementId}
                      </div>
                    </ControlGroup>
                  </div>
                ) : (
                  <EmptyState>
                    <span style={{ fontSize: '2rem', opacity: 0.5 }}>🔧</span>
                    <span style={{ fontWeight: '500' }}>Select an element to edit its properties</span>
                  </EmptyState>
                )}
              </SidebarPanel>

              {/* Design Settings removed */}

              {/* Variables */}
              <SidebarPanel>
                <PanelHeader>
                  <PanelIcon><FaTextHeight /></PanelIcon>
                  <PanelTitle>Variables</PanelTitle>
                </PanelHeader>
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(108, 99, 255, 0.1)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  💡 Select a text, header, or button element, then click a variable to insert it.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <VariableTag onClick={() => insertVariable('{{firstName}}')}>{'{{firstName}}'}</VariableTag>
                  <VariableTag onClick={() => insertVariable('{{lastName}}')}>{'{{lastName}}'}</VariableTag>
                  <VariableTag onClick={() => insertVariable('{{fullName}}')}>{'{{fullName}}'}</VariableTag>
                  <VariableTag onClick={() => insertVariable('{{email}}')}>{'{{email}}'}</VariableTag>
                  <VariableTag onClick={() => insertVariable('{{companyName}}')}>{'{{companyName}}'}</VariableTag>
                  <VariableTag onClick={() => insertVariable('{{subscription}}')}>{'{{subscription}}'}</VariableTag>
                  <VariableTag onClick={() => insertVariable('{{lifetimePurchase}}')}>{'{{lifetimePurchase}}'}</VariableTag>
                  <VariableTag onClick={() => insertVariable('{{unsubscribeUrl}}')}>{'{{unsubscribeUrl}}'}</VariableTag>
                  <VariableTag onClick={() => insertVariable('{{currentDate}}')}>{'{{currentDate}}'}</VariableTag>
                </div>
              </SidebarPanel>
            </>
          )}

        </div>
      </div>
      {/* Hidden drag preview */}
      <div ref={dragPreviewRef} style={{ position: 'absolute', top: '-1000px', left: '-1000px' }}>
        Dragging element...
      </div>
      {/* ✨ NEW: Hidden file input for image uploads */}
      <FileInput
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
      {/* ✨ ENHANCED: Updated keyboard shortcuts hint */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1) 0%, rgba(108, 99, 255, 0.05) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(108, 99, 255, 0.2)',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        textAlign: 'center'
      }}>
        <strong style={{ color: 'var(--primary)' }}>💡 Quick Shortcuts & Features:</strong>{' '}
        <span style={{ margin: '0 1rem' }}>
          <kbd style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>Delete</kbd> Remove selected
        </span>
        <span style={{ margin: '0 1rem' }}>
          <kbd style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>Ctrl+D</kbd> Duplicate
        </span>
        <span style={{ margin: '0 1rem' }}>
          <kbd style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>Esc</kbd> Deselect
        </span>
        <span style={{ margin: '0 1rem' }}>
          <kbd style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>Double-click</kbd> Edit text
        </span>
        <br />
        <span style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.5rem', display: 'inline-block' }}>
          🎯 <strong>Email Editor:</strong> Drag handles to reorder • Rich text formatting • Image upload • Padding controls
        </span>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <ModalOverlay onClick={closeLinkModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              {!editingElement && selectedElementId && emailElements.find(el => el.id === selectedElementId)?.type === 'button' 
                ? 'Edit Button URL' 
                : 'Add Link'}
            </ModalTitle>
            
            {/* Show text input only for inline links, not for button URLs */}
            {editingElement && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  color: 'var(--text)', 
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  Link Text (required)
                </label>
                <ModalInput
                  type="text"
                  placeholder="Enter the text to display (e.g., Click here)"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: 'var(--text)', 
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                URL (required)
              </label>
              <ModalInput
                type="url"
                placeholder="Enter URL (e.g., https://example.com)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                autoFocus={!editingElement}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // For buttons, only URL is required
                    if (!editingElement && selectedElementId && linkUrl.trim()) {
                      applyLink();
                    }
                    // For text links, both text and URL are required
                    else if (editingElement && linkText.trim() && linkUrl.trim()) {
                      applyLink();
                    }
                  } else if (e.key === 'Escape') {
                    closeLinkModal();
                  }
                }}
              />
            </div>
            
            <ModalButtons>
              <ModalButton $variant="secondary" onClick={closeLinkModal}>
                Cancel
              </ModalButton>
              <ModalButton 
                $variant="primary" 
                onClick={applyLink}
                style={{ 
                  opacity: (() => {
                    // For buttons, only URL is required
                    if (!editingElement && selectedElementId) {
                      return linkUrl.trim() ? 1 : 0.5;
                    }
                    // For text links, both text and URL are required
                    return (linkText.trim() && linkUrl.trim()) ? 1 : 0.5;
                  })(),
                  cursor: (() => {
                    // For buttons, only URL is required
                    if (!editingElement && selectedElementId) {
                      return linkUrl.trim() ? 'pointer' : 'not-allowed';
                    }
                    // For text links, both text and URL are required
                    return (linkText.trim() && linkUrl.trim()) ? 'pointer' : 'not-allowed';
                  })()
                }}
              >
                {!editingElement && selectedElementId && emailElements.find(el => el.id === selectedElementId)?.type === 'button' 
                  ? 'Update Button URL' 
                  : 'Add Link'}
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Color Picker Modal */}
      {showColorPicker && (
        <ModalOverlay onClick={closeColorPicker}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              Choose {colorPickerType === 'text' ? 'Text' : 'Background'} Color
            </ModalTitle>
            <ColorPickerContainer>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  color: 'var(--text)', 
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  Color Picker
                </label>
                <ColorInputModal
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                />
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: selectedColor,
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }} />
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: '600' }}>
                    Selected Color
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {selectedColor.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  color: 'var(--text)', 
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  Quick Colors
                </label>
                <ColorPresets>
                  {colorPresets.map((color) => (
                    <ColorPreset
                      key={color}
                      style={{ 
                        backgroundColor: color === 'transparent' ? 'transparent' : color,
                        backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                        backgroundSize: color === 'transparent' ? '8px 8px' : 'auto',
                        backgroundPosition: color === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto',
                        border: selectedColor === color ? '3px solid var(--primary)' : '2px solid rgba(255, 255, 255, 0.2)'
                      }}
                      onClick={() => setSelectedColor(color)}
                      title={color === 'transparent' ? 'Transparent' : color}
                    />
                  ))}
                </ColorPresets>
              </div>
            </ColorPickerContainer>
            <ModalButtons>
              <ModalButton $variant="secondary" onClick={closeColorPicker}>
                Cancel
              </ModalButton>
              <ModalButton $variant="primary" onClick={applyColor}>
                Apply {colorPickerType === 'text' ? 'Text' : 'Background'} Color
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Media Library Modal */}
      {showMediaLibrary && (
        <ModalOverlay onClick={closeMediaLibrary}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: mediaModalLeft, top: '8vh', width: mediaModalWidth, maxWidth: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <ModalTitle style={{ margin: 0 }}>Select Media</ModalTitle>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => { setMediaSearch(e.target.value); setMediaPage(1); }}
                  placeholder="Search by name..."
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)'
                  }}
                />
                <select
                  value={mediaTypeFilter}
                  onChange={(e) => { setMediaTypeFilter(e.target.value as any); setMediaPage(1); }}
                  style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
                >
                  <option value="all">All</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                </select>
                <select
                  value={mediaSort}
                  onChange={(e) => { setMediaSort(e.target.value as any); setMediaPage(1); }}
                  style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
                >
                  <option value="recent">Most recent</option>
                  <option value="name_asc">Name A→Z</option>
                  <option value="name_desc">Name Z→A</option>
                  <option value="size_desc">Size (desc)</option>
                </select>
              </div>
            </div>

            {isLoadingMedia ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading media…</div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '1rem',
                    maxHeight: '60vh',
                    overflow: 'auto',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0.75rem',
                    borderRadius: '8px'
                  }}
                >
                  {pagedMediaItems.length === 0 && (
                    <div style={{ opacity: 0.7 }}>No media found.</div>
                  )}

                  {pagedMediaItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        if (!selectedElementId) return;
                        const el = emailElements.find(e => e.id === selectedElementId);
                        if (!el) return;
                        if (item.type === 'image') {
                          updateElement(selectedElementId, { src: item.publicUrl, alt: item.name });
                        } else if (item.type === 'video') {
                          updateElement(selectedElementId, { url: item.publicUrl, thumbnail: el.thumbnail || '' });
                        }
                        closeMediaLibrary();
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        padding: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          paddingTop: '66%',
                          overflow: 'hidden',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.2)'
                        }}
                      >
                        {item.type === 'image' ? (
                          <img
                            src={item.publicUrl}
                            alt={item.name}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9rem', background: 'rgba(0,0,0,0.3)' }}>
                            <FaVideo style={{ marginRight: '0.25rem' }} /> Video
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.type}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Page {currentMediaPage} of {totalMediaPages} • {filteredMediaItems.length} items
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => setMediaPage(p => Math.max(1, p - 1))}
                      disabled={currentMediaPage <= 1}
                      style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: currentMediaPage <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setMediaPage(p => Math.min(totalMediaPages, p + 1))}
                      disabled={currentMediaPage >= totalMediaPages}
                      style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: currentMediaPage >= totalMediaPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                    <select
                      value={mediaPageSize}
                      onChange={(e) => { setMediaPageSize(parseInt(e.target.value)); setMediaPage(1); }}
                      style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
                    >
                      <option value={12}>12 / page</option>
                      <option value={24}>24 / page</option>
                      <option value={48}>48 / page</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <ModalButtons>
              <ModalButton $variant="secondary" onClick={closeMediaLibrary}>Close</ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}
    </div>
  );
} 