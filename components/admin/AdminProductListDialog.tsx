/**
 * @fileoverview Nested admin dialog that lists catalog or order products.
 * Used by user profile modals for owned-product counts and per-order product views.
 * @module components/admin/AdminProductListDialog
 */
"use client";

import React from "react";
import { FaTimes } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import styled from "styled-components";

/**
 * @brief Product row shown in the admin product list dialog.
 */
export type AdminListedProduct = {
  id?: string | null;
  name: string;
  slug?: string | null;
  featured_image_url?: string | null;
};

const Overlay = styled(motion.div)<{ $zIndex?: number }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${(props) => props.$zIndex ?? 10600};
  padding: 20px;
`;

const Dialog = styled(motion.div)`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 440px;
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

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 0.95rem;

  &:last-child {
    border-bottom: none;
  }
`;

const Thumb = styled.img`
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

const ProductLink = styled.a`
  color: var(--text);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;

  &:hover {
    color: var(--primary);
    text-decoration: underline;
  }
`;

const Footer = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const StripeLink = styled.a`
  color: var(--primary);
  text-decoration: none;
  font-size: 0.85rem;

  &:hover {
    text-decoration: underline;
  }
`;

const Empty = styled.div`
  padding: 1rem 0;
  color: var(--text-secondary);
  font-style: italic;
`;

/**
 * @brief Clickable count used in the user-info grid and order rows.
 */
export const AdminCountLinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: var(--primary);
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover:not(:disabled) {
    color: var(--accent, #9d97ff);
  }

  &:disabled {
    color: var(--text);
    cursor: default;
    text-decoration: none;
    font-weight: 500;
  }
`;

/**
 * @brief Builds a "N product(s)" label for a clickable count.
 * @param count Number of products.
 * @returns Label such as `3 products`.
 * @example
 * ```ts
 * productCountLabel(1); // "1 product"
 * ```
 */
export function productCountLabel(count: number): string {
  return `${count} product${count === 1 ? "" : "s"}`;
}

/**
 * @brief Resolves display products from an order row (structured list or name fallbacks).
 * @param row Order with optional `products`, `productNames`, or `productName`.
 * @returns Products to render in the dialog.
 */
export function listedProductsFromOrder(row: {
  products?: AdminListedProduct[];
  productNames?: string[];
  productName?: string | null;
}): AdminListedProduct[] {
  if (row.products && row.products.length > 0) {
    return row.products;
  }
  const names =
    row.productNames && row.productNames.length > 0
      ? row.productNames
      : row.productName?.trim()
        ? [row.productName.trim()]
        : [];
  return names.map((name) => ({ name }));
}

interface AdminProductListDialogProps {
  title: string;
  products: AdminListedProduct[];
  isOpen: boolean;
  onClose: () => void;
  stripePaymentId?: string | null;
  zIndex?: number;
  loading?: boolean;
}

/**
 * @brief Renders a nested overlay listing products with optional catalog links.
 * @param title Dialog heading.
 * @param products Products to list.
 * @param isOpen Whether the dialog is visible.
 * @param onClose Closes only this dialog (parent modal stays open).
 * @param stripePaymentId Optional PaymentIntent id for a Stripe footer link.
 * @returns Dialog portal content, or null when closed.
 * @example
 * ```tsx
 * <AdminProductListDialog
 *   title="Products they own"
 *   products={owned}
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 * />
 * ```
 */
export default function AdminProductListDialog({
  title,
  products,
  isOpen,
  onClose,
  stripePaymentId,
  zIndex,
  loading,
}: AdminProductListDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          $zIndex={zIndex}
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
              <Empty>Loading products...</Empty>
            ) : products.length === 0 ? (
              <Empty>No products</Empty>
            ) : (
              <List>
                {products.map((product, index) => {
                  const key = product.id || `${product.name}-${index}`;
                  const href = product.slug
                    ? `/product/${product.slug}`
                    : null;
                  const thumb = product.featured_image_url ? (
                    <Thumb src={product.featured_image_url} alt="" />
                  ) : (
                    <Thumb as="div" aria-hidden />
                  );
                  return (
                    <Item key={key}>
                      {href ? (
                        <ProductLink
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {thumb}
                          <span>{product.name}</span>
                        </ProductLink>
                      ) : (
                        <>
                          {thumb}
                          <span>{product.name}</span>
                        </>
                      )}
                    </Item>
                  );
                })}
              </List>
            )}
            {stripePaymentId ? (
              <Footer>
                <StripeLink
                  href={`https://dashboard.stripe.com/payments/${stripePaymentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View in Stripe
                </StripeLink>
              </Footer>
            ) : null}
          </Dialog>
        </Overlay>
      )}
    </AnimatePresence>
  );
}
