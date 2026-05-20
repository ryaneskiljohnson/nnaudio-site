/**
 * @fileoverview Translate control for admin support ticket messages (auto-detect → English).
 * @module components/admin/SupportMessageTranslate
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { FaGlobe, FaTimes } from "react-icons/fa";

/** Cached translation for one message or field. */
type TranslationState = {
  detectedLanguage: string;
  detectedLanguageName: string;
  isEnglish: boolean;
  translatedText: string;
};

const TranslateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
  flex-wrap: wrap;
`;

const TranslateButton = styled.button<{ $isAdmin?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 500;
  border-radius: 4px;
  border: 1px solid
    ${(props) =>
      props.$isAdmin ? "rgba(255, 255, 255, 0.35)" : "rgba(108, 99, 255, 0.4)"};
  background: ${(props) =>
    props.$isAdmin ? "rgba(255, 255, 255, 0.12)" : "rgba(108, 99, 255, 0.12)"};
  color: ${(props) => (props.$isAdmin ? "rgba(255,255,255,0.95)" : "var(--primary)")};
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 0.65rem;
  }
`;

const TranslationPanel = styled.div<{ $isAdmin?: boolean }>`
  margin-top: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  background: ${(props) =>
    props.$isAdmin ? "rgba(0, 0, 0, 0.2)" : "rgba(108, 99, 255, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.$isAdmin ? "rgba(255, 255, 255, 0.15)" : "rgba(108, 99, 255, 0.25)"};
`;

const TranslationMeta = styled.div<{ $isAdmin?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${(props) =>
    props.$isAdmin ? "rgba(255,255,255,0.75)" : "var(--text-secondary)"};
`;

const LanguageBadge = styled.span<{ $isAdmin?: boolean }>`
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: ${(props) =>
    props.$isAdmin ? "rgba(255, 255, 255, 0.2)" : "rgba(108, 99, 255, 0.2)"};
  color: ${(props) => (props.$isAdmin ? "rgba(255,255,255,0.95)" : "var(--primary)")};
  font-size: 0.65rem;
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  display: flex;
  align-items: center;

  &:hover {
    opacity: 1;
  }
`;

const InlineNotice = styled.span<{ $isAdmin?: boolean }>`
  font-size: 0.7rem;
  color: ${(props) =>
    props.$isAdmin ? "rgba(255,255,255,0.8)" : "var(--text-secondary)"};
`;

export type SupportMessageTranslateProps = {
  /** Source text to translate (message body, subject, etc.). */
  text: string;
  /** Stable id for React keys (message id, `subject`, etc.). */
  cacheKey: string;
  /** Bubble styling when shown inside admin vs customer message. */
  isAdmin?: boolean;
};

/**
 * @brief Renders a translate-to-English control with optional translation panel.
 * @param props - Text and display options.
 * @returns Translate button and expandable English panel.
 */
export function SupportMessageTranslate({
  text,
  cacheKey,
  isAdmin = false,
}: SupportMessageTranslateProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState<TranslationState | null>(
    null,
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setTranslation(null);
    setExpanded(false);
    setError(null);
  }, [text, cacheKey]);

  const handleTranslate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (translation && expanded) {
      setExpanded(false);
      return;
    }

    if (translation && !expanded) {
      setExpanded(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/support-tickets/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            t(
              "admin.supportTickets.translate.error",
              "Translation failed. Please try again.",
            ),
        );
        return;
      }

      const next: TranslationState = {
        detectedLanguage: data.detectedLanguage,
        detectedLanguageName: data.detectedLanguageName,
        isEnglish: data.isEnglish,
        translatedText: data.translatedText,
      };
      setTranslation(next);
      setExpanded(true);
    } catch {
      setError(
        t(
          "admin.supportTickets.translate.error",
          "Translation failed. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [text, translation, expanded, t]);

  if (!text.trim()) {
    return null;
  }

  return (
    <div key={cacheKey}>
      <TranslateRow>
        <TranslateButton
          type="button"
          $isAdmin={isAdmin}
          onClick={handleTranslate}
          disabled={loading}
          title={t(
            "admin.supportTickets.translate.tooltip",
            "Detect language and translate to English",
          )}
        >
          <FaGlobe />
          {loading
            ? t("admin.supportTickets.translate.loading", "Translating…")
            : expanded && translation
              ? t("admin.supportTickets.translate.hide", "Hide translation")
              : translation
                ? t("admin.supportTickets.translate.show", "Show translation")
                : t("admin.supportTickets.translate.button", "Translate")}
        </TranslateButton>
        {error && <InlineNotice $isAdmin={isAdmin}>{error}</InlineNotice>}
      </TranslateRow>

      {expanded && translation && (
        <TranslationPanel $isAdmin={isAdmin}>
          <TranslationMeta $isAdmin={isAdmin}>
            <span>
              {translation.isEnglish
                ? t(
                    "admin.supportTickets.translate.alreadyEnglish",
                    "Already in English",
                  )
                : t("admin.supportTickets.translate.english", "English")}
              {!translation.isEnglish && (
                <>
                  {" "}
                  <LanguageBadge $isAdmin={isAdmin}>
                    {translation.detectedLanguageName} (
                    {translation.detectedLanguage})
                  </LanguageBadge>
                </>
              )}
            </span>
            <DismissButton
              type="button"
              onClick={() => setExpanded(false)}
              aria-label={t("admin.supportTickets.translate.hide", "Hide translation")}
            >
              <FaTimes />
            </DismissButton>
          </TranslationMeta>
          {!translation.isEnglish && (
            <div>{translation.translatedText}</div>
          )}
        </TranslationPanel>
      )}
    </div>
  );
}
