/**
 * @fileoverview Badges for NNAudio Access installer downloads (macOS / Windows) on admin surfaces.
 * @module components/admin/NnaudioAccessInstallerBadges
 */

"use client";

import React from "react";
import { FaApple, FaWindows } from "react-icons/fa";
import styled from "styled-components";

const BadgeRow = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
`;

const Pill = styled.span<{ $variant: "mac" | "win" | "muted" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${(p) => (p.$variant === "muted" ? "0.75rem" : "0.78rem")};
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  line-height: 1.2;
  ${(p) =>
    p.$variant === "mac"
      ? `
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
    border: 1px solid rgba(129, 140, 248, 0.35);
  `
      : p.$variant === "win"
        ? `
    background: rgba(14, 165, 233, 0.15);
    color: #7dd3fc;
    border: 1px solid rgba(56, 189, 248, 0.35);
  `
        : `
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.08);
  `}
  svg {
    font-size: 0.85em;
    flex-shrink: 0;
  }
`;

export interface NnaudioAccessInstallerBadgesProps {
  /** First dashboard macOS installer click (ISO). */
  macosAt?: string | null;
  /** First dashboard Windows installer click (ISO). */
  windowsAt?: string | null;
  /** Smaller pills for dense tables. */
  compact?: boolean;
}

/**
 * @brief Renders Mac / Win / none badges with tooltips showing first-download time.
 */
export function NnaudioAccessInstallerBadges({
  macosAt,
  windowsAt,
  compact = false,
}: NnaudioAccessInstallerBadgesProps) {
  const hasMac = Boolean(macosAt);
  const hasWin = Boolean(windowsAt);
  const fmt = (s: string) =>
    new Date(s).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });

  if (!hasMac && !hasWin) {
    return (
      <BadgeRow>
        <Pill
          $variant="muted"
          title="No NNAudio Access installer download from dashboard (logged-in click)"
          style={compact ? { fontSize: "0.7rem", padding: "0.15rem 0.4rem" } : undefined}
        >
          Access —
        </Pill>
      </BadgeRow>
    );
  }

  return (
    <BadgeRow>
      {hasMac && (
        <Pill
          $variant="mac"
          title={`macOS installer: ${fmt(macosAt!)}`}
          style={compact ? { fontSize: "0.7rem", padding: "0.15rem 0.4rem" } : undefined}
        >
          <FaApple aria-hidden />
          Mac
        </Pill>
      )}
      {hasWin && (
        <Pill
          $variant="win"
          title={`Windows installer: ${fmt(windowsAt!)}`}
          style={compact ? { fontSize: "0.7rem", padding: "0.15rem 0.4rem" } : undefined}
        >
          <FaWindows aria-hidden />
          Win
        </Pill>
      )}
    </BadgeRow>
  );
}
