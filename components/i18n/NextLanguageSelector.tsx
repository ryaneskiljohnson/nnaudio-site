"use client";

import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { loadTranslations, getCurrentLanguage } from "@/app/i18n/i18n-config";

// Define language code type
type LanguageCode = "en" | "es" | "fr" | "it" | "de" | "pt" | "tr" | "zh" | "ja";

// Flag icons for each language
const FLAGS: Record<LanguageCode, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  it: "🇮🇹",
  de: "🇩🇪",
  pt: "🇵🇹",
  tr: "🇹🇷",
  zh: "🇨🇳",
  ja: "🇯🇵",
};

// Language names mapping
const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
  pt: "Português",
  tr: "Türkçe",
  zh: "中文",
  ja: "日本語",
};

// Styled components
const Container = styled.div`
  position: relative;
  z-index: 100;
`;

const SelectedLanguage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;

  &:hover {
    background-color: rgba(0, 0, 0, 0.4);
  }
`;

const FlagIcon = styled.span`
  font-size: 1.1rem;
`;

const LangName = styled.span`
  font-size: 0.9rem;
  color: var(--text);
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const DropdownArrow = styled.span<{ $isOpen: boolean }>`
  font-size: 0.7rem;
  transition: transform 0.2s ease;
  color: var(--text-secondary);
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0)'};
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  margin-top: 8px;
  background-color: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  width: 160px;
  z-index: 100;

  /* Position dropdown based on screen size */
  top: 100%;

  @media (max-width: 768px) {
    top: auto;
    bottom: 100%;
    margin-top: 0;
    margin-bottom: 8px;
  }
`;

const LangOption = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  background-color: ${props => props.$isActive ? 'rgba(108, 99, 255, 0.1)' : 'transparent'};
  color: ${props => props.$isActive ? 'var(--primary)' : 'var(--text)'};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

// Set to false to show the language selector again
const HIDE_LANGUAGE_SELECTOR = true;

const NextLanguageSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  
  // State to store the current language
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  
  // Initialize current language from localStorage on component mount
  useEffect(() => {
    const lang = getCurrentLanguage() as LanguageCode;
    setCurrentLanguage(lang);
  }, []);
  
  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Function to change the language
  const changeLanguage = async (langCode: LanguageCode) => {
    try {
      console.log(`Changing language to ${langCode}`);
      
      // Load translations for the new language
      await loadTranslations(langCode);
      console.log(`Translations loaded for ${langCode}`);
      
      // Update the component state
      setCurrentLanguage(langCode);
      setIsOpen(false);
    } catch (error) {
      console.error("Error changing language:", error);
    }
  };

  if (HIDE_LANGUAGE_SELECTOR) return null;

  return (
    <Container ref={dropdownRef}>
      <SelectedLanguage onClick={() => setIsOpen(!isOpen)}>
        <FlagIcon>{FLAGS[currentLanguage]}</FlagIcon>
        <LangName>{LANGUAGE_NAMES[currentLanguage]}</LangName>
        <DropdownArrow $isOpen={isOpen}>▼</DropdownArrow>
      </SelectedLanguage>

      {isOpen && (
        <Dropdown>
          {(Object.keys(FLAGS) as LanguageCode[]).map((langCode) => (
            <LangOption
              key={langCode}
              $isActive={langCode === currentLanguage}
              onClick={() => changeLanguage(langCode)}
            >
              <FlagIcon>{FLAGS[langCode]}</FlagIcon>
              <span>{LANGUAGE_NAMES[langCode]}</span>
            </LangOption>
          ))}
        </Dropdown>
      )}
    </Container>
  );
};

export default NextLanguageSelector; 