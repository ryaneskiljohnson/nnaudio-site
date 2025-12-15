"use client";

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { FaShoppingCart, FaTrash, FaPlus, FaMinus, FaChevronRight, FaHome } from "react-icons/fa";

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 120px 20px 80px;
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const BreadcrumbContainer = styled.div`
  margin-bottom: 2rem;
`;

const BreadcrumbList = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const BreadcrumbLink = styled(Link)`
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 1);
  }
`;

const BreadcrumbSeparator = styled.span`
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
`;

const BreadcrumbCurrent = styled.span`
  color: rgba(255, 255, 255, 1);
  font-weight: 500;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const CartContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const CartItems = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2rem;
`;

const EmptyCart = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.7);
`;

const EmptyCartIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyCartText = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
`;

const ShopButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  padding: 14px 32px;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
  }
`;

const CartItemCard = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ItemImage = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 100%;
    height: 200px;
  }
`;

const ItemDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ItemName = styled(Link)`
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  text-decoration: none;
  transition: color 0.2s ease;
  
  &:hover {
    color: #8a2be2;
  }
`;

const ItemPrice = styled.div`
  font-size: 1.1rem;
  color: #4ecdc4;
  font-weight: 600;
`;

const ItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: auto;
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.5rem;
`;

const QuantityButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
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
  min-width: 30px;
  text-align: center;
  font-weight: 600;
`;

const RemoveButton = styled.button`
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #ff5e62;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 0, 0, 0.2);
    border-color: rgba(255, 0, 0, 0.5);
  }
`;

const SummaryCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2rem;
  height: fit-content;
  position: sticky;
  top: 140px;
  
  @media (max-width: 968px) {
    position: relative;
    top: 0;
  }
`;

const SummaryTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1.5rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.8);
`;

const SummaryTotal = styled.div`
  display: flex;
  justify-content: space-between;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
  font-size: 1.3rem;
  font-weight: 700;
  color: #4ecdc4;
`;

const CheckoutButton = styled(motion.button)`
  width: 100%;
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
  color: white;
  border: none;
  padding: 18px 32px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
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

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, getItemCount } = useCart();
  const total = getTotal();
  const itemCount = getItemCount();

  const handleCheckout = () => {
    // TODO: Implement checkout flow
    console.log('Checkout with items:', items);
    alert('Checkout functionality coming soon!');
  };

  return (
    <Container>
      <Content>
        <BreadcrumbContainer>
          <BreadcrumbList>
            <BreadcrumbLink href="/">
              <FaHome size={14} />
              <span>Home</span>
            </BreadcrumbLink>
            <BreadcrumbSeparator>
              <FaChevronRight size={10} />
            </BreadcrumbSeparator>
            <BreadcrumbCurrent>Cart</BreadcrumbCurrent>
          </BreadcrumbList>
        </BreadcrumbContainer>

        <Title>Shopping Cart</Title>

        {items.length === 0 ? (
          <CartItems>
            <EmptyCart>
              <EmptyCartIcon>
                <FaShoppingCart />
              </EmptyCartIcon>
              <EmptyCartText>Your cart is empty</EmptyCartText>
              <ShopButton href="/products">
                Continue Shopping
              </ShopButton>
            </EmptyCart>
          </CartItems>
        ) : (
          <CartContainer>
            <CartItems>
              {items.map((item, index) => {
                const displayPrice = item.sale_price || item.price;
                const hasDiscount = item.sale_price && item.sale_price < item.price;
                
                return (
                  <CartItemCard
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <ItemImage>
                      {(item.featured_image_url || item.logo_url) ? (
                        <Image
                          src={item.featured_image_url || item.logo_url}
                          alt={item.name}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          color: 'rgba(255, 255, 255, 0.3)'
                        }}>
                          {item.name[0]}
                        </div>
                      )}
                    </ItemImage>
                    
                    <ItemDetails>
                      <ItemName href={`/product/${item.slug}`}>
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
                                marginRight: '0.5rem'
                              }}>
                                ${item.price.toFixed(2)}
                              </span>
                            )}
                            <span>${displayPrice.toFixed(2)}</span>
                          </>
                        )}
                      </ItemPrice>
                      
                      <ItemActions>
                        <QuantityControl>
                          <QuantityButton
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <FaMinus size={12} />
                          </QuantityButton>
                          <Quantity>{item.quantity}</Quantity>
                          <QuantityButton
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <FaPlus size={12} />
                          </QuantityButton>
                        </QuantityControl>
                        
                        <RemoveButton onClick={() => removeItem(item.id)}>
                          <FaTrash size={14} />
                          Remove
                        </RemoveButton>
                      </ItemActions>
                    </ItemDetails>
                  </CartItemCard>
                );
              })}
            </CartItems>

            <SummaryCard>
              <SummaryTitle>Order Summary</SummaryTitle>
              
              <SummaryRow>
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span>${total.toFixed(2)}</span>
              </SummaryRow>
              
              <SummaryRow>
                <span>Shipping</span>
                <span>Free</span>
              </SummaryRow>
              
              <SummaryTotal>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </SummaryTotal>
              
              <CheckoutButton
                onClick={handleCheckout}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Proceed to Checkout
                <FaChevronRight />
              </CheckoutButton>
            </SummaryCard>
          </CartContainer>
        )}
      </Content>
    </Container>
  );
}

