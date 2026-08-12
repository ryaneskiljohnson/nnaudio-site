"use client";

/**
 * @fileoverview Live on-site visitor count for admin chrome (sidebar and mobile header).
 * @module components/admin/LiveVisitorCount
 */

import styled, { keyframes } from "styled-components";
import type { LiveVisitorSnapshot } from "@/hooks/useLiveVisitorCount";

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(0, 201, 167, 0.55);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(0, 201, 167, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 201, 167, 0);
  }
`;

const SidebarWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0 1.5rem 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 8px;
  background: rgba(0, 201, 167, 0.08);
  border: 1px solid rgba(0, 201, 167, 0.18);
  flex-shrink: 0;
`;

const CompactWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: rgba(0, 201, 167, 0.1);
  border: 1px solid rgba(0, 201, 167, 0.2);
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00c9a7;
  flex-shrink: 0;
  animation: ${pulse} 2s ease-out infinite;
`;

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Count = styled.span`
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
`;

const Label = styled.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

function pagesTitle(pages: { path: string; count: number }[]): string {
  if (pages.length === 0) {
    return "People currently browsing the site";
  }

  return pages.map((page) => `${page.count} on ${page.path}`).join("\n");
}

type LiveVisitorCountProps = {
  variant: "sidebar" | "compact";
  snapshot: LiveVisitorSnapshot | null;
  loading: boolean;
};

/**
 * @brief Renders a live visitor count. Parent should poll once and pass the snapshot.
 */
export default function LiveVisitorCount({
  variant,
  snapshot,
  loading,
}: LiveVisitorCountProps) {
  const count = snapshot?.count ?? 0;
  const title = pagesTitle(snapshot?.pages ?? []);
  const display = loading && !snapshot ? "—" : String(count);

  if (variant === "compact") {
    return (
      <CompactWrap title={title} aria-live="polite">
        <Dot aria-hidden="true" />
        {display} on site
      </CompactWrap>
    );
  }

  return (
    <SidebarWrap title={title} aria-live="polite">
      <Dot aria-hidden="true" />
      <Copy>
        <Count>{display}</Count>
        <Label>On site now</Label>
      </Copy>
    </SidebarWrap>
  );
}
