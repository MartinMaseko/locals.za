import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useState } from 'react';
const FavoritesContext = createContext(undefined);
export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState(() => {
        try {
            const raw = localStorage.getItem('favorites');
            return raw ? JSON.parse(raw) : [];
        }
        catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
        catch { }
    }, [favorites]);
    const isFavorite = (id) => favorites.some(f => f.id === id);
    const toggleFavorite = (product) => {
        setFavorites(prev => {
            if (prev.some(p => p.id === product.id)) {
                return prev.filter(p => p.id !== product.id);
            }
            return [...prev, product];
        });
    };
    const removeFavorite = (id) => {
        setFavorites(prev => prev.filter(p => p.id !== id));
    };
    return (_jsx(FavoritesContext.Provider, { value: { favorites, isFavorite, toggleFavorite, removeFavorite }, children: children }));
};
export const useFavorites = () => {
    const ctx = useContext(FavoritesContext);
    if (!ctx)
        throw new Error('useFavorites must be used within FavoritesProvider');
    return ctx;
};
