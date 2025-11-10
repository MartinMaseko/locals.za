import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import './cartstyle.css';
import { useFavorites } from '../../../contexts/FavoritesContext';
import ProductCard from '../productview/productsCard';
import { useCart } from '../../../contexts/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { Analytics } from '../../../../utils/analytics';
const CartPage = () => {
    const navigate = useNavigate();
    const [shareLink, setShareLink] = useState('');
    const [generatingShare, setGeneratingShare] = useState(false);
    const [copied, setCopied] = useState(false);
    const shareInputRef = useRef(null);
    // favorites functionality
    const { favorites, removeFavorite } = useFavorites();
    // cart functionality
    const { cart, increaseQty, decreaseQty, removeFromCart, clearCart } = useCart();
    const total = cart.reduce((sum, it) => {
        const price = typeof it.product.price === 'number' ? it.product.price : parseFloat(String(it.product.price || 0));
        return sum + (isNaN(price) ? 0 : price * it.qty);
    }, 0);
    // Track cart abandonment
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (cart.length > 0) {
                Analytics.trackCartAbandonment(cart, total);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [cart, total]);
    const generateShareLink = () => {
        if (!cart || cart.length === 0)
            return;
        setGeneratingShare(true);
        try {
            const payload = cart.map(it => ({ id: it.product.id || it.product.product_id, qty: it.qty }));
            const json = JSON.stringify({ items: payload, createdAt: new Date().toISOString() });
            // safe base64 for unicode
            const b64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(json))) : Buffer.from(json).toString('base64');
            const link = `${window.location.origin}/shared-cart?d=${encodeURIComponent(b64)}`;
            setShareLink(link);
            setCopied(false);
        }
        catch (err) {
            console.error('Failed to generate share link', err);
        }
        finally {
            setGeneratingShare(false);
        }
    };
    const copyLink = async () => {
        if (!shareLink)
            return;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareLink);
            }
            else if (shareInputRef.current) {
                shareInputRef.current.select();
                document.execCommand('copy');
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch (err) {
            console.error('Copy failed', err);
        }
    };
    const shareViaWhatsApp = () => {
        if (!shareLink)
            return;
        const message = `Please complete this cart: ${shareLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };
    const handleCheckout = () => {
        Analytics.trackCheckoutStep(1, 'begin_checkout');
        Analytics.trackUserPath('cart', 'checkout', 'checkout_button');
        navigate('/checkout');
    };
    const handleShareCart = () => {
        generateShareLink();
        Analytics.trackUserPath('cart', 'share_cart', 'share_button');
    };
    return (_jsxs("div", { className: "cart-container", children: [_jsxs("section", { className: "cart-section", children: [_jsx("h2", { children: "Cart" }), cart.length === 0 ? (_jsx(_Fragment, { children: _jsxs("div", { className: 'empty-cart-wrapper', children: [_jsx("img", { width: "100", height: "100", src: "https://img.icons8.com/bubbles/100/shopping-cart.png", alt: "shopping-cart" }), _jsx("p", { children: "Your cart is empty." }), _jsx(Link, { to: "/", className: "shop-link", children: "Go to Store" })] }) })) : (_jsxs(_Fragment, { children: [_jsx("ul", { className: "cart-list", children: cart.map((item) => (_jsxs("li", { className: "cart-item", children: [_jsx(ProductCard, { product: item.product }), _jsxs("div", { className: 'cart-item-details', children: [_jsx("div", { className: 'cart-item-qty', children: _jsxs("div", { children: ["Quantity: ", item.qty] }) }), _jsxs("div", { className: 'cart-item-actions', children: [_jsx("button", { className: 'cart-item-action', onClick: () => decreaseQty(item.product.id), type: "button", "aria-label": "Decrease quantity", children: "\u2212" }), _jsx("button", { className: 'cart-item-action', onClick: () => increaseQty(item.product.id), type: "button", "aria-label": "Increase quantity", children: "+" }), _jsx("button", { className: 'cart-item-action', onClick: () => removeFromCart(item.product.id), type: "button", children: "Remove" })] })] })] }, item.product.id))) }), _jsxs("div", { className: 'cart-summary', children: [_jsxs("div", { className: 'cart-summary-total', children: [_jsx("strong", { children: "Total:" }), " R ", Number.isFinite(total) ? total.toFixed(2) : '0.00'] }), _jsx("button", { className: 'checkout-btn', onClick: handleCheckout, children: "Checkout" }), _jsx("button", { className: 'clearcart-btn', onClick: () => clearCart(), type: "button", children: "Clear cart" }), _jsx("button", { className: 'sharecart-btn', onClick: handleShareCart, disabled: cart.length === 0 || generatingShare, children: generatingShare ? 'Generating…' : 'Share Cart' }), shareLink && (_jsxs("div", { className: "share-link-block", children: [_jsx("input", { ref: shareInputRef, readOnly: true, value: shareLink, className: "share-link-input", onFocus: (e) => e.target.select() }), _jsxs("div", { className: "share-link-btns", children: [_jsx("button", { className: "share-button", onClick: copyLink, children: copied ? 'Copied' : 'Copy' }), _jsx("button", { className: "share-button", onClick: shareViaWhatsApp, children: "WhatsApp" })] })] }))] })] }))] }), _jsxs("section", { className: 'favorites-section', children: [_jsx("h2", { children: "Favorites" }), favorites.length === 0 ? (_jsx("p", { children: "No favorites yet. Tap the heart on a product to add it here." })) : (_jsx("ul", { className: "favorites-list", children: favorites.map((p) => (_jsxs("li", { className: "favorites-item", children: [_jsx(ProductCard, { product: p }), _jsx("button", { className: "favorites-remove", onClick: () => removeFavorite(p.id), "aria-label": `Remove ${p.name} from favorites`, type: "button", children: "Remove" })] }, p.id))) }))] })] }));
};
export default CartPage;
