/**
 * @fileoverview Shared mobile data-card primitives for admin list pages.
 * Cards replace wide tables at 768px and below.
 * @module components/admin/AdminDataCard
 */

"use client";

import React from "react";
import styled from "styled-components";

/**
 * @brief One compact metric shown in a card meta row.
 */
export interface AdminDataCardMetaItem {
  label: string;
  value: React.ReactNode;
}

/**
 * @brief Props for the tappable card shell.
 */
export interface AdminDataCardProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

/**
 * @brief Props for the card header (title, subtitle, status).
 */
export interface AdminDataCardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
}

/**
 * @brief Props for the compact metric chips row.
 */
export interface AdminDataCardMetaProps {
  items: AdminDataCardMetaItem[];
}

/**
 * @brief Props for a label/value secondary row.
 */
export interface AdminDataCardRowProps {
  label: string;
  value: React.ReactNode;
}

/**
 * @brief Props for the action footer.
 */
export interface AdminDataCardActionsProps {
  children: React.ReactNode;
}

const Card = styled.div<{ $clickable: boolean }>`
  background-color: var(--card-bg);
  border-radius: 14px;
  padding: 1.1rem 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: ${(props) => (props.$clickable ? "pointer" : "default")};
  transition: transform 0.18s ease, background-color 0.18s ease,
    border-color 0.18s ease;
  min-width: 0;
  width: 100%;
  position: relative;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);

  ${(props) =>
    props.$clickable
      ? `
    &:active {
      transform: scale(0.98);
      background-color: rgba(255, 255, 255, 0.02);
      border-color: rgba(108, 99, 255, 0.35);
    }
  `
      : ""}
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const TitleBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-size: 1.02rem;
  font-weight: 650;
  color: var(--text);
  line-height: 1.3;
  word-break: break-word;
`;

const Subtitle = styled.div`
  margin-top: 0.2rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
  word-break: break-word;
`;

const BadgeSlot = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const MetaGrid = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: repeat(${(props) => Math.min(props.$count, 2)}, 1fr);
  gap: 0.55rem;
  margin-bottom: 0.75rem;
`;

const MetaChip = styled.div`
  background: rgba(108, 99, 255, 0.1);
  border: 1px solid rgba(108, 99, 255, 0.18);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  min-width: 0;
`;

const MetaLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 0.15rem;
`;

const MetaValue = styled.div`
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--text);
  word-break: break-word;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.55rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const RowLabel = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
  padding-top: 0.15rem;
  flex-shrink: 0;
`;

const RowValue = styled.div`
  font-size: 0.9rem;
  color: var(--text);
  text-align: right;
  word-break: break-word;
  min-width: 0;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.95rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  > button,
  > a,
  > [role="button"] {
    flex: 1 1 7.5rem;
    min-height: 44px;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
  min-width: 0;
`;

/**
 * @brief Tappable mobile card shell for one admin list row.
 * @param props.children Card sections (header, meta, rows, actions).
 * @param props.onClick Optional tap handler for the whole card.
 * @param props.className Optional class.
 * @returns Styled card container.
 * @note Cards stay clickable when `onClick` is set, but they are not exposed as
 * buttons so nested View/Edit/Delete controls remain valid HTML.
 * @example
 * <AdminDataCard onClick={open}>
 *   <AdminDataCardHeader title="Jane" subtitle="jane@nnaudio.com" />
 * </AdminDataCard>
 */
export function AdminDataCard({
  children,
  onClick,
  className,
}: AdminDataCardProps): React.ReactElement {
  return (
    <Card
      className={className}
      $clickable={Boolean(onClick)}
      onClick={onClick}
    >
      {children}
    </Card>
  );
}

/**
 * @brief Title, optional subtitle, and status badge for a mobile card.
 * @param props.title Primary heading (name, subject, campaign).
 * @param props.subtitle Secondary line (email, order number, date).
 * @param props.badge Status pill or other badge node.
 * @returns Header row.
 */
export function AdminDataCardHeader({
  title,
  subtitle,
  badge,
}: AdminDataCardHeaderProps): React.ReactElement {
  return (
    <Header>
      <TitleBlock>
        <Title>{title}</Title>
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      </TitleBlock>
      {badge ? <BadgeSlot>{badge}</BadgeSlot> : null}
    </Header>
  );
}

/**
 * @brief Compact metric chips (orders, spend, CTR, etc.).
 * @param props.items Label/value pairs shown as chips.
 * @returns Two-column metric grid.
 */
export function AdminDataCardMeta({
  items,
}: AdminDataCardMetaProps): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <MetaGrid $count={items.length}>
      {items.map((item, index) => (
        <MetaChip key={`${item.label}-${index}`}>
          <MetaLabel>{item.label}</MetaLabel>
          <MetaValue>{item.value}</MetaValue>
        </MetaChip>
      ))}
    </MetaGrid>
  );
}

/**
 * @brief Secondary label/value row inside a mobile card.
 * @param props.label Uppercase field label.
 * @param props.value Field value.
 * @returns One aligned row.
 */
export function AdminDataCardRow({
  label,
  value,
}: AdminDataCardRowProps): React.ReactElement {
  return (
    <Row>
      <RowLabel>{label}</RowLabel>
      <RowValue>{value}</RowValue>
    </Row>
  );
}

/**
 * @brief Footer that stretches action buttons to 44px touch targets.
 * @param props.children Existing page action buttons.
 * @returns Action row.
 * @note Stops click bubbling so nested View/Edit/Delete controls do not fire
 * the card's optional `onClick`. Dropdown panels are not stretched.
 */
export function AdminDataCardActions({
  children,
}: AdminDataCardActionsProps): React.ReactElement {
  return (
    <Actions
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      {children}
    </Actions>
  );
}

/**
 * @brief Vertical stack of mobile admin cards.
 * @param props.children Card nodes.
 * @param props.className Optional class.
 * @returns Flex column list.
 */
export function AdminMobileCardList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <List className={className}>{children}</List>;
}

type AdminDataCardComponent = typeof AdminDataCard & {
  Header: typeof AdminDataCardHeader;
  Meta: typeof AdminDataCardMeta;
  Row: typeof AdminDataCardRow;
  Actions: typeof AdminDataCardActions;
};

(AdminDataCard as AdminDataCardComponent).Header = AdminDataCardHeader;
(AdminDataCard as AdminDataCardComponent).Meta = AdminDataCardMeta;
(AdminDataCard as AdminDataCardComponent).Row = AdminDataCardRow;
(AdminDataCard as AdminDataCardComponent).Actions = AdminDataCardActions;
