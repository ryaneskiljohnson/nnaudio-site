/**
 * @fileoverview Nested admin dialog listing a user's orders.
 * Clicking a row reports the order so the parent can show its products.
 * @module components/admin/AdminOrdersListDialog
 */
"use client";

import React from "react";
import { FaTimes } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import styled from "styled-components";
import {
  listedProductsFromOrder,
  productCountLabel,
} from "@/components/admin/AdminProductListDialog";
import type { AdminListedProduct } from "@/components/admin/AdminProductListDialog";

/**
 * @brief Order row shown in the admin orders dialog.
 */
export type AdminListedOrder = {
  id: string;
  type: "stripe" | "grant";
  amountCents: number;
  created: string | null;
  productName?: string | null;
  productNames?: string[];
  products?: AdminListedProduct[];
};

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10600;
  padding: 20px;
`;

const Dialog = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 520px;
  width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 0.75rem;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;

  &:hover {
    color: var(--text);
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
`;

const ItemButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  width: 100%;
  padding: 0.65rem 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: none;
  color: var(--text);
  text-align: left;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover:not(:disabled) {
    color: var(--primary);
  }

  &:disabled {
    cursor: default;
  }
`;

const ItemMeta = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const Empty = styled.div`
  padding: 1rem 0;
  color: var(--text-secondary);
  font-style: italic;
`;

interface AdminOrdersListDialogProps {
  title: string;
  orders: AdminListedOrder[];
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onSelectOrder: (order: AdminListedOrder) => void;
}

/**
 * @brief Renders a nested overlay listing orders; rows with products are clickable.
 * @param title Dialog heading.
 * @param orders Orders to list.
 * @param isOpen Whether the dialog is visible.
 * @param loading Shows a loading state while orders fetch.
 * @param onClose Closes only this dialog.
 * @param onSelectOrder Opens the products for that order.
 * @returns Dialog content, or null when closed.
 */
export default function AdminOrdersListDialog({
  title,
  orders,
  isOpen,
  loading,
  onClose,
  onSelectOrder,
}: AdminOrdersListDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Dialog
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <TitleRow>
              <Title>{title}</Title>
              <CloseButton type="button" onClick={onClose} aria-label="Close">
                <FaTimes />
              </CloseButton>
            </TitleRow>
            {loading ? (
              <Empty>Loading orders...</Empty>
            ) : orders.length === 0 ? (
              <Empty>No orders</Empty>
            ) : (
              <List>
                {orders.map((order) => {
                  const products = listedProductsFromOrder(order);
                  const amount = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(order.amountCents / 100);
                  const date = order.created
                    ? new Date(order.created).toLocaleDateString()
                    : "—";
                  const kind = order.type === "grant" ? "Grant" : "Payment";
                  return (
                    <li key={`${order.type}-${order.id}`}>
                      <ItemButton
                        type="button"
                        disabled={products.length === 0}
                        onClick={() => onSelectOrder(order)}
                      >
                        <span>
                          {date} · {kind} · {amount}
                        </span>
                        <ItemMeta>
                          {products.length > 0
                            ? productCountLabel(products.length)
                            : "No products"}
                        </ItemMeta>
                      </ItemButton>
                    </li>
                  );
                })}
              </List>
            )}
          </Dialog>
        </Overlay>
      )}
    </AnimatePresence>
  );
}
