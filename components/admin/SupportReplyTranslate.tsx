/**
 * @fileoverview Translates an admin draft reply into the customer’s detected language.
 * @module components/admin/SupportReplyTranslate
 */

"use client";

import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { FaGlobeAmericas } from "react-icons/fa";

/** Customer language inferred from the ticket thread. */
export type CustomerLanguage = {
  detectedLanguage: string;
  detectedLanguageName: string;
  isEnglish: boolean;
};

const ReplyTranslateBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
`;

const ReplyTranslateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid rgba(108, 99, 255, 0.45);
  background: rgba(108, 99, 255, 0.12);
  color: var(--primary);
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.85;
    background: rgba(108, 99, 255, 0.18);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  svg {
    font-size: 0.75rem;
  }
`;

const Hint = styled.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
`;

const ErrorText = styled.span`
  font-size: 0.7rem;
  color: #f87171;
`;

export type SupportReplyTranslateProps = {
  /** Current draft in the reply textarea. */
  draftText: string;
  /** Language detected from customer messages. */
  customerLanguage: CustomerLanguage | null;
  /** Whether customer language is still being detected. */
  detectingLanguage?: boolean;
  /** Called with translated text to replace the draft. */
  onApplyTranslation: (translatedText: string) => void;
};

/**
 * @brief Button to translate the admin’s draft reply into the customer’s language.
 * @param props - Draft text, detected language, and apply callback.
 * @returns Translate control or null when not applicable.
 */
export function SupportReplyTranslate({
  draftText,
  customerLanguage,
  detectingLanguage = false,
  onApplyTranslation,
}: SupportReplyTranslateProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslateReply = useCallback(async () => {
    const trimmed = draftText.trim();
    if (!trimmed || !customerLanguage || customerLanguage.isEnglish) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/support-tickets/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          targetLanguage: customerLanguage.detectedLanguage,
          targetLanguageName: customerLanguage.detectedLanguageName,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            t(
              "admin.supportTickets.translate.replyError",
              "Could not translate reply. Please try again.",
            ),
        );
        return;
      }

      if (typeof data.translatedText === "string" && data.translatedText.trim()) {
        onApplyTranslation(data.translatedText.trim());
      }
    } catch {
      setError(
        t(
          "admin.supportTickets.translate.replyError",
          "Could not translate reply. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [draftText, customerLanguage, onApplyTranslation, t]);

  if (detectingLanguage || !customerLanguage || customerLanguage.isEnglish) {
    return null;
  }

  const langLabel = customerLanguage.detectedLanguageName;

  return (
    <ReplyTranslateBar>
      <ReplyTranslateButton
        type="button"
        onClick={handleTranslateReply}
        disabled={loading || !draftText.trim()}
        title={t(
          "admin.supportTickets.translate.replyTooltip",
          "Translate your draft reply into the customer's language",
        )}
      >
        <FaGlobeAmericas />
        {loading
          ? t("admin.supportTickets.translate.loading", "Translating…")
          : t("admin.supportTickets.translate.replyButton", "Translate to {{language}}", {
              language: langLabel,
            })}
      </ReplyTranslateButton>
      <Hint>
        {t(
          "admin.supportTickets.translate.replyHint",
          "Replaces your draft with a {{language}} version before you send.",
          { language: langLabel },
        )}
      </Hint>
      {error && <ErrorText>{error}</ErrorText>}
    </ReplyTranslateBar>
  );
}
