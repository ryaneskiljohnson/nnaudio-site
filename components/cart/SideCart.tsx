"use client";

import React from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { FaTimes, FaTrash, FaPlus, FaMinus, FaShoppingCart, FaChevronRight } from "react-icons/fa";

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 9998;
  backdrop-filter: blur(4px);
`;

const SideCartContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 90vw;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (max-width: 480px) {
    width: 100vw;
  }
`;

const SideCartHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.03);
`;

const SideCartTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const CartItemsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

const EmptyCart = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
`;

const EmptyCartIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyCartText = styled.p`
  font-size: 1rem;
  margin-bottom: 1.5rem;
`;

const CartItemCard = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ItemImage = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
`;

const ItemDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
`;

const ItemName = styled(Link)`
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
  text-decoration: none;
  transition: color 0.2s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &:hover {
    color: #8a2be2;
  }
`;

const ItemPrice = styled.div`
  font-size: 0.9rem;
  color: #4ecdc4;
  font-weight: 600;
`;

const ItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.25rem;
`;

const QuantityButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Quantity = styled.span`
  min-width: 24px;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
`;

const RemoveButton = styled.button`
  background: transparent;
  border: none;
  color: #ff5e62;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 0, 0, 0.1);
  }
`;

const SideCartFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
`;

const SummaryTotal = styled.div`
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 0.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: #4ecdc4;
`;

const ViewCartButton = styled(Link)`
  display: block;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  text-align: center;
  font-weight: 600;
  margin-top: 1rem;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const CheckoutButton = styled(motion.button)`
  width: 100%;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

interface SideCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideCart({ isOpen, onClose }: SideCartProps) {
  const { items, removeItem, updateQuantity, getTotal, getItemCount } = useCart();
  const router = useRouter();
  const total = getTotal();
  const itemCount = getItemCount();

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <SideCartContainer
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <SideCartHeader>
              <SideCartTitle>
                <FaShoppingCart />
                Cart ({itemCount})
              </SideCartTitle>
              <CloseButton onClick={onClose}>
                <FaTimes size={18} />
              </CloseButton>
            </SideCartHeader>

            <CartItemsContainer>
              {items.length === 0 ? (
                <EmptyCart>
                  <EmptyCartIcon>
                    <FaShoppingCart />
                  </EmptyCartIcon>
                  <EmptyCartText>Your cart is empty</EmptyCartText>
                </EmptyCart>
              ) : (
                items.map((item) => {
                  // Determine display price:
                  // - If sale_price is 0, product is FREE
                  // - If sale_price exists and > 0, use sale_price
                  // - Otherwise use regular price
                  const displayPrice = (item.sale_price === 0) 
                    ? 0 
                    : (item.sale_price !== null && item.sale_price !== undefined && item.sale_price > 0) 
                      ? item.sale_price 
                      : item.price;
                  const hasDiscount = item.sale_price !== null && item.sale_price !== undefined && item.sale_price > 0 && item.sale_price < item.price;
                  
                  return (
                    <CartItemCard key={item.id}>
                      <ItemImage>
                          <Image
                          src={item.featured_image_url || item.logo_url || '/images/nnaud-io/NNPurp1.png'}
                            alt={item.name}
                            fill
                            style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== '/images/nnaud-io/NNPurp1.png') {
                              target.src = '/images/nnaud-io/NNPurp1.png';
                            }
                          }}
                        />
                      </ItemImage>
                      
                      <ItemDetails>
                        <ItemName href={`/product/${item.slug}`} onClick={onClose}>
                          {item.name}
                        </ItemName>
                        <ItemPrice>
                          {displayPrice === 0 || displayPrice === null ? (
                            <span>FREE</span>
                          ) : (
                            <>
                              {hasDiscount && (
                                <span style={{
                                  textDecoration: 'line-through',
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  marginRight: '0.5rem',
                                  fontSize: '0.85rem'
                                }}>
                                  ${item.price % 1 === 0 ? item.price.toFixed(0) : item.price.toFixed(2)}
                                </span>
                              )}
                              <span>${displayPrice % 1 === 0 ? displayPrice.toFixed(0) : displayPrice.toFixed(2)}</span>
                            </>
                          )}
                        </ItemPrice>
                        
                        <ItemActions>
                          <QuantityControl>
                            <QuantityButton
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <FaMinus size={10} />
                            </QuantityButton>
                            <Quantity>{item.quantity}</Quantity>
                            <QuantityButton
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <FaPlus size={10} />
                            </QuantityButton>
                          </QuantityControl>
                          
                          <RemoveButton onClick={() => removeItem(item.id)}>
                            <FaTrash size={12} />
                          </RemoveButton>
                        </ItemActions>
                      </ItemDetails>
                    </CartItemCard>
                  );
                })
              )}
            </CartItemsContainer>

            {items.length > 0 && (
              <SideCartFooter>
                <SummaryRow>
                  <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                  <span>${total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}</span>
                </SummaryRow>
                
                <SummaryTotal>
                  <span>Total</span>
                  <span>${total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}</span>
                </SummaryTotal>
                
                <ViewCartButton href="/cart" onClick={onClose}>
                  View Full Cart
                  <FaChevronRight size={12} />
                </ViewCartButton>
                
                <CheckoutButton
                  onClick={handleCheckout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Checkout
                  <FaChevronRight size={14} />
                </CheckoutButton>
              </SideCartFooter>
            )}
          </SideCartContainer>
        </>
      )}
    </AnimatePresence>
  );
}

