/**
 * @fileoverview Admin notifications page: toggles for receiving order confirmation email copies.
 * @module app/(private)/(admin)/admin/notifications/page
 *
 * Allows the logged-in admin to opt in to receiving the same order confirmation email
 * as the customer for paid orders. Free orders never notify admins.
 */

"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaBell, FaEnvelope, FaShoppingCart, FaCheck, FaExclamationCircle } from "react-icons/fa";
import {
  getAdminNotificationPreferences,
  updateAdminNotificationPreferences,
  type AdminNotificationPreferences,
} from "@/app/actions/admin-notification-preferences";
import NNAudioLoadingSpinner from "@/components/common/NNAudioLoadingSpinner";

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 8px 0;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 1rem;

  svg {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const Card = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  color: var(--text);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--primary);
  }
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 1rem;

  &:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-of-type {
    padding-top: 0;
  }
`;

const ToggleLabel = styled.label`
  flex: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ToggleIcon = styled.span`
  color: var(--primary);
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const ToggleText = styled.div`
  color: var(--text);
  font-weight: 500;
`;

const ToggleDescription = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
`;

const Switch = styled.button<{ $on: boolean }>`
  width: 48px;
  height: 26px;
  border-radius: 13px;
  border: none;
  background: ${(p) => (p.$on ? "var(--primary)" : "rgba(255, 255, 255, 0.2)")};
  cursor: pointer;
  position: relative;
  transition: background 0.2s ease;
  flex-shrink: 0;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${(p) => (p.$on ? "24px" : "2px")};
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
`;

const SaveStatus = styled.div<{ $error?: boolean }>`
  font-size: 0.875rem;
  margin-top: 1rem;
  color: ${(p) => (p.$error ? "var(--error, #ef4444)" : "var(--primary)")};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RetryButton = styled.button`
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  &:hover {
    opacity: 0.9;
  }
`;

const ErrorBanner = styled.div`
  padding: 1rem 1.25rem;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--error, #ef4444);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;

  span {
    flex: 1;
    min-width: 0;
  }
`;

/**
 * @brief Admin notifications settings page for paid-order confirmation copies.
 * @returns Notification preference toggles for the logged-in admin.
 */
export default function AdminNotificationsPage() {
  const [preferences, setPreferences] = useState<AdminNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPreferences = React.useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    const res = await getAdminNotificationPreferences();
    if (res.success && res.preferences != null) {
      setPreferences(res.preferences);
      setLoadError(null);
    } else {
      setPreferences({ notify_on_paid_order: false });
      setLoadError(res.error ?? "Failed to load preferences");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = async (
    key: keyof AdminNotificationPreferences,
    value: boolean
  ) => {
    if (preferences == null || saving) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSaving(true);
    setMessage(null);
    const res = await updateAdminNotificationPreferences(next);
    setSaving(false);
    if (res.success) {
      setMessage("Saved");
      setTimeout(() => setMessage(null), 2500);
    } else {
      setMessage(res.error ?? "Failed to save");
    }
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>
            <FaBell />
            Notifications
          </Title>
          <Subtitle>Manage when you receive email copies of order confirmations.</Subtitle>
        </Header>
        <Card>
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <NNAudioLoadingSpinner size={32} />
          </div>
        </Card>
      </Container>
    );
  }

  const paidOn = preferences?.notify_on_paid_order ?? false;

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Header>
          <Title>
            <FaBell />
            Notifications
          </Title>
          <Subtitle>
            Choose whether to receive a copy of paid-order confirmation emails. Free orders are never copied to admins.
          </Subtitle>
        </Header>

        {loadError && (
          <ErrorBanner>
            <FaExclamationCircle />
            <span>{loadError}</span>
            <RetryButton type="button" onClick={() => fetchPreferences()}>
              Retry
            </RetryButton>
          </ErrorBanner>
        )}

        <Card>
          <SectionTitle>
            <FaEnvelope />
            Order confirmation email copies
          </SectionTitle>
          <ToggleRow>
            <ToggleLabel
              onClick={(e) => {
                e.preventDefault();
                if (!saving) handleToggle("notify_on_paid_order", !paidOn);
              }}
            >
              <ToggleIcon>
                <FaShoppingCart />
              </ToggleIcon>
              <div>
                <ToggleText>Paid orders</ToggleText>
                <ToggleDescription>
                  Email me a copy when a customer completes a purchase (order total &gt; 0).
                </ToggleDescription>
              </div>
            </ToggleLabel>
            <Switch
              $on={paidOn}
              type="button"
              onClick={() => !saving && handleToggle("notify_on_paid_order", !paidOn)}
              disabled={saving}
              aria-pressed={paidOn}
              aria-label="Toggle paid order emails"
            />
          </ToggleRow>
          {(message || saving) && (
            <SaveStatus $error={message !== "Saved" && message !== null}>
              {saving ? (
                <>
                  <NNAudioLoadingSpinner size={14} />
                  Saving…
                </>
              ) : message === "Saved" ? (
                <>
                  <FaCheck />
                  Saved
                </>
              ) : (
                <>
                  <FaExclamationCircle />
                  {message}
                </>
              )}
            </SaveStatus>
          )}
        </Card>
      </motion.div>
    </Container>
  );
}
