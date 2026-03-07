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
          setItems(JSON.parse(savedCart));
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
    const price = (item.sale_price !== null && item.sale_price !== undefined) ? item.sale_price : item.price;
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
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
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
      prevItems.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => {
      // Use sale_price if it exists (including 0), otherwise use regular price
      const price = (item.sale_price !== null && item.sale_price !== undefined) ? item.sale_price : item.price;
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

