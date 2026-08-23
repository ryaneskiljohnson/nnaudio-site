"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import useLanguageHook from '@/hooks/useLanguage';
import i18next from 'i18next';

interface LanguageContextType {
  t: (key: string, options?: any) => string;
  translationsLoaded: boolean;
  isLoading: boolean;
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  languages: string[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentLanguage, isLoading, changeLanguage, languages } =
    useLanguageHook(pathname === "/");

  const t = (key: string, options?: any): string => {
    const result = i18next.t(key, options);
    return typeof result === 'string' ? result : String(result);
  };

  const translationsLoaded = !isLoading;

  return (
    <LanguageContext.Provider value={{
      t,
      translationsLoaded,
      isLoading,
      currentLanguage,
      changeLanguage,
      languages
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 