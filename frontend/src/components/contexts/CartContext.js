import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useState } from 'react';
const CartContext = createContext(undefined);
export const CartProvider = ({ children }) => {
    // Normalize legacy cart shapes from localStorage into { product, qty } items
    const [cart, setCart] = useState(() => {
        try {
            const raw = localStorage.getItem('cart');
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed))
                return [];
            const normalized = parsed
                .map((item) => {
                if (!item || typeof item !== 'object')
                    return null;
                // Already correct shape
                if (item.product && typeof item.product === 'object') {
                    return { product: item.product, qty: Number(item.qty || 1) };
                }
                // Legacy shape: { id, name, qty, price, image_url, ... }
                if (item.id) {
                    const productObj = {
                        id: String(item.id),
                        name: item.name || item.product_name || '',
                        price: item.price != null ? item.price : 0,
                        image_url: item.image_url || item.image || ''
                    };
                    return { product: productObj, qty: Number(item.qty || item.quantity || 1) };
                }
                return null;
            })
                .filter(Boolean);
            return normalized;
        }
        catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem('cart', JSON.stringify(cart));
        }
        catch { }
    }, [cart]);
    const addToCart = (p) => setCart((prev) => {
        const idx = prev.findIndex((i) => i.product.id === p.id);
        if (idx > -1) {
            const copy = [...prev];
            copy[idx].qty += 1;
            return copy;
        }
        return [...prev, { product: p, qty: 1 }];
    });
    const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.product.id !== id));
    const increaseQty = (id) => setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, qty: i.qty + 1 } : i)));
    const decreaseQty = (id) => setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i)));
    const isInCart = (id) => cart.some((i) => Boolean(i && i.product && i.product.id === id));
    const getQty = (id) => {
        const it = cart.find((i) => Boolean(i && i.product && i.product.id === id));
        return it ? (it.qty || 0) : 0;
    };
    const clearCart = () => setCart([]);
    return (_jsx(CartContext.Provider, { value: { cart, addToCart, removeFromCart, increaseQty, decreaseQty, isInCart, getQty, clearCart }, children: children }));
};
export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx)
        throw new Error('useCart must be used within CartProvider');
    return ctx;
};
