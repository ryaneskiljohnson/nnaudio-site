"use client";

import { useState, useEffect } from 'react';
import i18next from 'i18next';
import { languages, defaultLanguage, loadTranslations } from '@/app/i18n/i18n-config';

export default function useLanguage() {
  const [currentLanguage, setCurrentLanguage] = useState<string>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language on first render
  useEffect(() => {
    const initLanguage = async () => {
      setIsLoading(true);
      
      // Get language from localStorage or browser preference
      let lang = defaultLanguage;
      
      if (typeof window !== 'undefined') {
        // First check localStorage
        const savedLang = localStorage.getItem('i18nextLng');
        if (savedLang && languages.includes(savedLang)) {
          lang = savedLang;
        } else {
          // Then check browser language
          const browserLang = navigator.language.split('-')[0];
          if (languages.includes(browserLang)) {
            lang = browserLang;
          }
          // Save preference
          localStorage.setItem('i18nextLng', lang);
        }
      }
      
      // Load translations
      try {
        const translations = await loadTranslations(lang);
        // Force language change
        await i18next.changeLanguage(lang);
        setCurrentLanguage(lang);
        console.log(`[useLanguage] Initialized with language: ${lang}`);
        
        // If translations are empty, log a warning but don't fail
        if (!translations || Object.keys(translations).length === 0) {
          console.warn(`[useLanguage] Received empty translations for ${lang}, but continuing anyway`);
        }
      } catch (error: any) {
        console.error('[useLanguage] Failed to initialize language:', error);
        // Still set the language even if translations failed to load
        // This prevents the app from being stuck in loading state
        try {
          await i18next.changeLanguage(lang);
          setCurrentLanguage(lang);
        } catch (changeError) {
          console.error('[useLanguage] Failed to change language:', changeError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initLanguage();
  }, []);
  
  // Function to change language
  const changeLanguage = async (lang: string) => {
    if (!languages.includes(lang) || lang === currentLanguage) return;
    
    setIsLoading(true);
    try {
      console.log(`[useLanguage] Changing language to: ${lang}`);
      await loadTranslations(lang);
      await i18next.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
      setCurrentLanguage(lang);
      
      // Manually emit the event to force components to update
      window.dispatchEvent(new Event('languageChange'));
    } catch (error) {
      console.error(`[useLanguage] Failed to change language to ${lang}:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    currentLanguage,
    isLoading,
    changeLanguage,
    languages
  };
} 