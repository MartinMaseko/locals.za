import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Product } from './FavoritesContext';

type CartItem = { product: Product; qty: number };

type CartContextType = {
  cart: CartItem[];
  addToCart: (p: Product) => void;
  removeFromCart: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  isInCart: (id: string) => boolean;
  getQty: (id: string) => number;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const addToCart = (p: Product) =>
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === p.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      }
      return [...prev, { product: p, qty: 1 }];
    });

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.product.id !== id));
  const increaseQty = (id: string) =>
    setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, qty: i.qty + 1 } : i)));
  const decreaseQty = (id: string) =>
    setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i)));

  const isInCart = (id: string) => cart.some((i) => i.product.id === id);
  const getQty = (id: string) => {
    const it = cart.find((i) => i.product.id === id);
    return it ? it.qty : 0;
  };
  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, increaseQty, decreaseQty, isInCart, getQty, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};