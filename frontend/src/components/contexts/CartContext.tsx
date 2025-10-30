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
  // Normalize legacy cart shapes from localStorage into { product, qty } items
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('cart');
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      const normalized: CartItem[] = parsed
        .map((item: any) => {
          if (!item || typeof item !== 'object') return null;

          // Already correct shape
          if (item.product && typeof item.product === 'object') {
            return { product: item.product as Product, qty: Number(item.qty || 1) };
          }

          // Legacy shape: { id, name, qty, price, image_url, ... }
          if (item.id) {
            const productObj: any = {
              id: String(item.id),
              name: item.name || item.product_name || '',
              price: item.price != null ? item.price : 0,
              image_url: item.image_url || item.image || ''
            };
            return { product: productObj as Product, qty: Number(item.qty || item.quantity || 1) };
          }

          return null;
        })
        .filter(Boolean) as CartItem[];

      return normalized;
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

  const isInCart = (id: string) => cart.some((i) => Boolean(i && i.product && i.product.id === id));
  const getQty = (id: string) => {
    const it = cart.find((i) => Boolean(i && i.product && i.product.id === id));
    return it ? (it.qty || 0) : 0;
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

// No API calls found in this context file.