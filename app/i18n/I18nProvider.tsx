"use client";

import React, { useEffect } from 'react';
import i18next from 'i18next';
import useLanguage from '@/hooks/useLanguage';
// Ensure i18n-config loads early so sync init runs before LegalModal/useTranslation
import '@/app/i18n/i18n-config';

interface I18nProviderProps {
  children: React.ReactNode;
}

export default function I18nProvider({ children }: I18nProviderProps) {
  const { currentLanguage } = useLanguage();
  
  // Listen for global language change events
  useEffect(() => {
    // Listen for the global language change event
    const handleGlobalLanguageChange = () => {
      console.log('[I18nProvider] Detected global language change event');
      
      // Force a refresh of all components that use translations
      if (i18next.isInitialized) {
        i18next.emit('languageChanged', currentLanguage);
      }
    };
    
    window.addEventListener('languageChange', handleGlobalLanguageChange);
    
    return () => {
      window.removeEventListener('languageChange', handleGlobalLanguageChange);
    };
  }, [currentLanguage]);
  
  // Always render children - do NOT block the entire app on translation loading.
  // Blocking caused a black screen on first load until translations finished.
  // Components that need translations can check translationsLoaded/isLoading and show fallbacks.
  return <>{children}</>;
} 