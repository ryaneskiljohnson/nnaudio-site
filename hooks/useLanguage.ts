"use client";

/**
 * @fileoverview Language init and switcher. Remote catalog translations
 * can be skipped on the marketing homepage.
 * @module hooks/useLanguage
 */

import { useState, useEffect, useCallback } from 'react';
import i18next from 'i18next';
import { languages, defaultLanguage, loadTranslations } from '@/app/i18n/i18n-config';
import { logHeroDebug } from '@/utils/hero-reload-debug';

/** Shared across every `useLanguage()` mount so I18nProvider + LanguageProvider + pages don't each fetch. */
let languageInitPromise: Promise<string> | null = null;

function initLanguageOnce(): Promise<string> {
  if (languageInitPromise) return languageInitPromise;

  languageInitPromise = (async () => {
    let lang = defaultLanguage;

    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('i18nextLng');
      if (savedLang && languages.includes(savedLang)) {
        lang = savedLang;
      } else {
        const browserLang = navigator.language.split('-')[0];
        if (languages.includes(browserLang)) {
          lang = browserLang;
        }
        localStorage.setItem('i18nextLng', lang);
      }
    }

    try {
      const translations = await loadTranslations(lang);
      await i18next.changeLanguage(lang);
      if (!translations || Object.keys(translations).length === 0) {
        console.warn(`[useLanguage] Received empty translations for ${lang}, but continuing anyway`);
      }
      return lang;
    } catch (error) {
      console.error('[useLanguage] Failed to initialize language:', error);
      try {
        await i18next.changeLanguage(lang);
      } catch (changeError) {
        console.error('[useLanguage] Failed to change language:', changeError);
      }
      return lang;
    }
  })();

  return languageInitPromise;
}

/**
 * @brief Language hook. Homepage skips the translations API so `/` first
 * paint does not wait on `/api/translations`.
 * @param skipRemote When true, stay on bundled English fallbacks.
 * @returns Current language helpers.
 */
export default function useLanguage(skipRemote = false) {
  const [currentLanguage, setCurrentLanguage] = useState<string>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(!skipRemote);

  useEffect(() => {
    logHeroDebug('i18n-useLanguage', { skipRemote, currentLanguage });
    if (skipRemote) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    logHeroDebug('i18n-init-start', { currentLanguage });
    initLanguageOnce()
      .then((lang) => {
        if (cancelled) return;
        logHeroDebug('i18n-init-done', { lang });
        setCurrentLanguage(lang);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skipRemote]);
  
  const changeLanguage = useCallback(async (lang: string) => {
    if (!languages.includes(lang) || lang === currentLanguage) return;
    
    setIsLoading(true);
    try {
      console.log(`[useLanguage] Changing language to: ${lang}`);
      logHeroDebug('i18n-changeLanguage', { from: currentLanguage, to: lang });
      await loadTranslations(lang);
      await i18next.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
      setCurrentLanguage(lang);
      
      window.dispatchEvent(new Event('languageChange'));
    } catch (error) {
      console.error(`[useLanguage] Failed to change language to ${lang}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage]);
  
  return {
    currentLanguage,
    isLoading,
    changeLanguage,
    languages
  };
}
