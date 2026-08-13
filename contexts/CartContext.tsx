"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trackAddToCart } from '@/utils/analytics';

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number;
  quantity: number;
  featured_image_url?: string;
  logo_url?: string;
}

export interface AddItemOptions {
  /** If false, the side cart will not auto-open for this add (e.g. elite bundle lifetime → checkout). Default true. */
  openCart?: boolean;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, options?: AddItemOptions) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  isLoaded: boolean;
  /** When true, header should not auto-open side cart for the last add; clear after reading. */
  suppressCartOpen: boolean;
  clearSuppressCartOpen: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'nnaudio_cart';
const MAX_CART_QUANTITY = 99;

/**
 * @brief Parses localStorage cart JSON. Rejects non-arrays and malformed rows
 * so poisoned storage cannot crash checkout or inject bogus prices into the UI.
 */
export function parseStoredCartItems(raw: string): CartItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const items: CartItem[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    if (typeof rec.id !== "string" || !rec.id.trim()) continue;
    if (typeof rec.name !== "string" || !rec.name.trim()) continue;
    const price = Number(rec.price);
    if (!Number.isFinite(price) || price < 0) continue;
    const quantity = Math.max(
      1,
      Math.min(MAX_CART_QUANTITY, Math.floor(Number(rec.quantity) || 1))
    );
    const item: CartItem = {
      id: rec.id,
      name: rec.name,
      slug: typeof rec.slug === "string" ? rec.slug : "",
      price,
      quantity,
    };
    if (rec.sale_price != null) {
      const sale = Number(rec.sale_price);
      if (Number.isFinite(sale) && sale >= 0) item.sale_price = sale;
    }
    if (typeof rec.featured_image_url === "string") {
      item.featured_image_url = rec.featured_image_url;
    }
    if (typeof rec.logo_url === "string") {
      item.logo_url = rec.logo_url;
    }
    items.push(item);
  }
  return items;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [suppressCartOpen, setSuppressCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
          setItems(parseStoredCartItems(savedCart));
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }
  }, [items, isLoaded]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, options?: AddItemOptions) => {
    if (options?.openCart === false) {
      setSuppressCartOpen(true);
    }
    // Use sale_price when set (including 0 for free); coerce to number for robustness
    const price = (item.sale_price !== null && item.sale_price !== undefined) ? Number(item.sale_price) : Number(item.price);
    const quantity = 1;
    trackAddToCart({
      value: price * quantity,
      currency: 'USD',
      items: [{
        item_id: item.id,
        item_name: item.name,
        quantity,
        price,
      }],
    });
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(MAX_CART_QUANTITY, i.quantity + 1) }
            : i
        );
      } else {
        return [...prevItems, { ...item, quantity: 1 }];
      }
    });
  }, []);

  const clearSuppressCartOpen = useCallback(() => setSuppressCartOpen(false), []);

  const removeItem = useCallback((id: string) => {
    setItems((prevItems) => prevItems.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((i) =>
        i.id === id
          ? { ...i, quantity: Math.min(MAX_CART_QUANTITY, quantity) }
          : i
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => {
      // Use sale_price if it exists (including 0 for free); coerce to number
      const price = (item.sale_price !== null && item.sale_price !== undefined) ? Number(item.sale_price) : Number(item.price);
      return total + price * item.quantity;
    }, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    isLoaded,
    suppressCartOpen,
    clearSuppressCartOpen,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

