import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './cartstyle.css';
import ProductCard from '../productview/productsCard';
import { useCart } from '../../../contexts/CartContext';
const API_URL = import.meta.env.VITE_API_URL;
const decodeBase64Unicode = (b64) => {
    try {
        return typeof window !== 'undefined' ? decodeURIComponent(escape(window.atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
    }
    catch (e) {
        return null;
    }
};
const SharedCartPage = () => {
    const navigate = useNavigate();
    const { addToCart: contextAddToCart, isInCart, increaseQty, getQty } = useCart();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const d = params.get('d');
        if (!d) {
            setError('Invalid shared link');
            setLoading(false);
            return;
        }
        const b64 = decodeURIComponent(d);
        const json = decodeBase64Unicode(b64);
        if (!json) {
            setError('Failed to decode link');
            setLoading(false);
            return;
        }
        try {
            const parsed = JSON.parse(json);
            const list = Array.isArray(parsed.items) ? parsed.items.map((it) => ({ id: String(it.id), qty: Number(it.qty) || 1 })) : [];
            setItems(list);
            // fetch product details
            Promise.all(list.map(async (it) => {
                try {
                    const res = await axios.get(`${API_URL}/api/api/products/${it.id}`);
                    return { ...it, product: res.data };
                }
                catch (e) {
                    return { ...it, product: null };
                }
            })).then(results => {
                setItems(results);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
        catch (err) {
            setError('Malformed link data');
            setLoading(false);
        }
    }, []);
    const addToCart = async () => {
        try {
            // Use CartContext methods to ensure the app state updates correctly
            for (const it of items) {
                if (!it.product)
                    continue;
                const prod = it.product;
                const desiredQty = Number(it.qty) || 1;
                // If not in cart, add once
                if (!isInCart(prod.id)) {
                    await contextAddToCart(prod);
                }
                // Increase until we reach desired quantity
                const currentQty = getQty(prod.id) || 0;
                const toAdd = Math.max(0, desiredQty - currentQty);
                for (let i = 0; i < toAdd; i++) {
                    increaseQty(prod.id);
                }
            }
            // Navigate to cart after updates
            navigate('/cart');
        }
        catch (err) {
            console.error('Failed to add to cart', err);
            setError('Failed to add items to cart');
        }
    };
    if (loading)
        return _jsx("div", { className: "loading-container", children: "Loading shared cart..." });
    if (error)
        return _jsx("div", { className: "error-container", children: error });
    return (_jsxs("div", { className: "shared-cart-page", children: [_jsx("h1", { children: "Shared Cart" }), items.length === 0 ? (_jsx("p", { children: "No items in this shared cart." })) : (_jsx("div", { className: "shared-items-list", children: items.map((it, idx) => (_jsx("div", { className: "shared-item", children: it.product ? (_jsxs("div", { className: "shared-item-card", children: [_jsx(ProductCard, { product: it.product, onClick: (p) => navigate(`/product/${p.id}`, { state: { product: p } }) }), _jsxs("div", { className: "shared-item-meta", children: ["Qty: ", it.qty, " \u2022 ", _jsxs("span", { children: ["Price: R", Number(it.product.price || 0).toFixed(2)] })] })] })) : (_jsxs("div", { className: "shared-item-left", children: [_jsxs("div", { className: "shared-item-title", children: ["Product ", it.id] }), _jsxs("div", { className: "shared-item-meta", children: ["Qty: ", it.qty, " \u2022 ", _jsxs("span", { children: ["Price: R", Number(it.product?.price || 0).toFixed(2)] })] })] })) }, it.id || idx))) })), _jsxs("div", { className: "shared-actions", children: [_jsx("button", { className: "place-order-button", disabled: items.length === 0, onClick: addToCart, children: "Add to cart" }), _jsx("button", { className: "cancel-button", onClick: () => navigate(-1), children: "Cancel" })] })] }));
};
export default SharedCartPage;
