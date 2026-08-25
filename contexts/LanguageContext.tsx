"use client";

/**
 * @fileoverview App-wide language context. Homepage skips the remote
 * translations fetch so `/` first paint stays on bundled English.
 * @module contexts/LanguageContext
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import useLanguageHook from '@/hooks/useLanguage';
import i18next from 'i18next';
import { logHeroDebug } from '@/utils/hero-reload-debug';

interface LanguageContextType {
  t: (key: string, options?: any) => string;
  translationsLoaded: boolean;
  isLoading: boolean;
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  languages: string[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * @brief Supplies language helpers. Skips `/api/translations` on `/`.
 * @param children App tree.
 * @returns Language context provider.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const skipRemote = !pathname || pathname === "/";
  const { currentLanguage, isLoading, changeLanguage, languages } =
    useLanguageHook(skipRemote);

  const t = useCallback((key: string, options?: any): string => {
    const result = i18next.t(key, options);
    return typeof result === 'string' ? result : String(result);
  }, []);

  const translationsLoaded = !isLoading;
  const value = useMemo(
    () => ({
      t,
      translationsLoaded,
      isLoading,
      currentLanguage,
      changeLanguage,
      languages,
    }),
    [t, translationsLoaded, isLoading, currentLanguage, changeLanguage, languages]
  );

  useEffect(() => {
    logHeroDebug("i18n-language-provider", {
      pathname,
      skipRemote,
      currentLanguage,
      isLoading,
    });
  }, [pathname, skipRemote, currentLanguage, isLoading]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * @brief Reads the language context.
 * @returns Translation helpers from LanguageProvider.
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 