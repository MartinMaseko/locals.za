import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import './userstyle.css';
import ProductCard from '../storepages/productview/productsCard';
import LoadingContext from '../storepages/LoadingContext';
import LogoAnime from '../../../components/assets/logos/locals-svg.gif';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import LocalsZAIcon from '../../assets/logos/LZA ICON.png';
const API_URL = import.meta.env.VITE_API_URL;
const UserOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [frequentProducts, setFrequentProducts] = useState([]);
    const auth = getAuth(app);
    const { addToCart } = useCart();
    const navigate = useNavigate();
    // Access the global loading context
    const { setLoading: setGlobalLoading } = useContext(LoadingContext);
    // Update global loading state whenever local loading changes
    useEffect(() => {
        setGlobalLoading(loading);
        return () => setGlobalLoading(false); // Clean up on unmount
    }, [loading, setGlobalLoading]);
    useEffect(() => {
        let mounted = true;
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!mounted)
                return;
            setLoading(true);
            setError('');
            if (!user) {
                setOrders([]);
                setError('Please log in to view your orders.');
                setLoading(false);
                return;
            }
            try {
                // Get token for authentication
                const token = await user.getIdToken();
                // Use API endpoint
                const response = await axios.get(`${API_URL}/api/api/orders/user/${user.uid}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                // API returns orders directly as an array
                const payload = Array.isArray(response.data) ? response.data : [];
                // Continue with existing normalization code
                const normalized = payload.map((o) => {
                    // Handle createdAt field which might be a Firestore timestamp or ISO string
                    const createdAtRaw = o.createdAt;
                    let createdAtIso;
                    if (createdAtRaw) {
                        if (typeof createdAtRaw.toDate === 'function') {
                            createdAtIso = createdAtRaw.toDate().toISOString();
                        }
                        else if (typeof createdAtRaw === 'object' && 'seconds' in createdAtRaw) {
                            createdAtIso = new Date(createdAtRaw.seconds * 1000).toISOString();
                        }
                        else {
                            createdAtIso = new Date(createdAtRaw).toISOString();
                        }
                    }
                    return {
                        id: o.id || '',
                        items: Array.isArray(o.items) ? o.items : [],
                        subtotal: typeof o.subtotal === 'number' ? o.subtotal : Number(o.subtotal || 0),
                        serviceFee: typeof o.serviceFee === 'number' ? o.serviceFee : Number(o.serviceFee || 0),
                        total: typeof o.total === 'number' ? o.total : Number(o.total || 0),
                        status: o.status || 'unknown',
                        createdAt: createdAtIso,
                        deliveryAddress: o.deliveryAddress || {},
                        // Add these new properties
                        missingItems: o.missingItems || [],
                        refundAmount: typeof o.refundAmount === 'number' ? o.refundAmount : Number(o.refundAmount || 0),
                        adjustedTotal: typeof o.adjustedTotal === 'number' ? o.adjustedTotal : Number(o.adjustedTotal || 0),
                        refundStatus: o.refundStatus || 'pending',
                        driverNote: o.driverNote || '',
                        eta: o.eta || null,
                        etaArrivalTime: o.etaArrivalTime || null,
                        etaUpdatedAt: o.etaUpdatedAt || null,
                    };
                });
                if (mounted) {
                    setOrders(normalized);
                    // Process orders to find frequently purchased products
                    if (normalized.length > 0) {
                        generateFrequentlyPurchasedProducts(normalized);
                    }
                }
            }
            catch (err) {
                console.error('Fetch orders error:', err?.response?.data || err);
                if (mounted)
                    setError(err?.response?.data?.error || err?.message || 'Failed to load orders');
            }
            finally {
                if (mounted)
                    setLoading(false);
            }
        });
        return () => {
            mounted = false;
            unsub();
        };
    }, [auth]);
    // Function to generate frequently purchased products from orders
    const generateFrequentlyPurchasedProducts = (orders) => {
        // Map to track product purchase frequency
        const productMap = {};
        // Process all orders to find product purchase patterns
        orders.forEach(order => {
            if (!order.items || !Array.isArray(order.items))
                return;
            const orderDate = order.createdAt || new Date().toISOString();
            order.items.forEach(item => {
                if (!item.productId || !item.product)
                    return;
                const productId = item.productId;
                if (!productMap[productId]) {
                    // First time seeing this product
                    productMap[productId] = {
                        id: productId,
                        name: item.product.name || 'Unknown Product',
                        price: typeof item.product.price === 'number' ? item.product.price :
                            Number(item.product.price || 0),
                        image_url: item.product.image_url || '',
                        purchaseCount: item.qty,
                        lastPurchased: orderDate
                    };
                }
                else {
                    // Update existing product data
                    productMap[productId].purchaseCount += item.qty;
                    // Update last purchased date if this order is more recent
                    if (orderDate > productMap[productId].lastPurchased) {
                        productMap[productId].lastPurchased = orderDate;
                    }
                }
            });
        });
        // Convert map to array and sort by purchase count (descending)
        const frequentItems = Object.values(productMap).sort((a, b) => b.purchaseCount - a.purchaseCount);
        setFrequentProducts(frequentItems);
    };
    // Custom handler for when product card is clicked
    const handleProductClick = (product) => {
        // You can navigate to product detail or do nothing
        navigate(`/product/${product.id}`, { state: { product } });
    };
    // Loading state and UI
    if (loading)
        return (_jsxs("div", { className: 'loading-container', children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), "Loading your orders..."] }));
    if (error)
        return _jsxs("div", { className: "user-orders-error", children: [_jsx("img", { src: LocalsZAIcon, alt: "Locals ZA Logo", className: "login-error-icon" }), _jsx("p", { className: 'login-error-message', children: error }), _jsx(Link, { className: 'login-error-link', to: "/login", children: "Login" })] });
    // Add a helper function to check if ETA is recent (less than 30 minutes old)
    const isETARecent = (etaUpdatedAt) => {
        if (!etaUpdatedAt)
            return false;
        const etaTime = new Date(etaUpdatedAt).getTime();
        const now = new Date().getTime();
        // ETA is considered recent if less than 30 minutes old
        return (now - etaTime) < 30 * 60 * 1000; // 30 minutes in milliseconds
    };
    return (_jsxs("div", { className: "user-orders-page", children: [_jsx("h1", { children: "Your Orders" }), frequentProducts.length > 0 && (_jsxs("div", { className: "frequent-products-section", children: [_jsx("h2", { children: "Frequently Purchased Items" }), _jsx("p", { className: "frequent-products-description", children: "These are items you've purchased before. Add them to your cart with just one click." }), _jsx("div", { className: "frequent-products-grid", children: frequentProducts.slice(0, 10).map(product => {
                            // Convert FrequentProduct to Product format for ProductCard
                            const productCardData = {
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                image_url: product.image_url
                            };
                            return (_jsxs("div", { className: "frequent-product-item", children: [_jsx(ProductCard, { product: productCardData, onClick: handleProductClick }), _jsxs("div", { className: "frequent-product-stats", children: [_jsxs("span", { className: "purchase-count", children: ["Purchased ", product.purchaseCount, " ", product.purchaseCount === 1 ? 'time' : 'times'] }), _jsx("button", { className: "reorder-add-to-cart", onClick: () => addToCart({
                                                    ...productCardData,
                                                    quantity: 1
                                                }), children: "Add to Cart" })] })] }, product.id));
                        }) })] })), orders.length === 0 ? (_jsx(_Fragment, { children: _jsxs("div", { className: 'empty-orders-wrapper', children: [_jsx("img", { width: "100", height: "100", src: "https://img.icons8.com/clouds/100/shopping-cart.png", alt: "shopping-cart" }), _jsx("p", { children: "You have no orders yet." }), _jsx(Link, { to: "/", className: "start-shopping-link", children: "Start Shopping" })] }) })) : (_jsxs("div", { className: "orders-section", children: [_jsx("h2", { children: "Order History" }), _jsx("ul", { className: "orders-list", children: orders.map((o) => (_jsxs("li", { className: "order-card", children: [_jsxs("div", { className: "order-header", children: [_jsxs("div", { className: 'order-no', children: ["Order: #", _jsx("br", {}), o.id, o.missingItems && o.missingItems.length > 0 && (_jsxs("span", { className: "missing-items-badge", children: [_jsx("br", {}), o.missingItems.length, " item(s) unavailable"] }))] }), _jsxs("div", { className: 'order-date', children: ["Date: ", o.createdAt ? new Date(o.createdAt).toLocaleString() : ''] }), _jsxs("div", { children: [_jsxs("span", { className: `order-status order-status-${(o.status || 'unknown').toLowerCase()}`, children: ["Status: ", o.status || 'unknown'] }), o.status === 'in transit' && o.eta && o.etaArrivalTime && isETARecent(o.etaUpdatedAt) && (_jsx("div", { className: "eta-display", children: _jsxs("span", { className: "eta-arrival", children: [_jsx("img", { width: "16", height: "16", src: "https://img.icons8.com/ios-filled/16/ffb803/time_2.png", alt: "time" }), "Expected arrival at ", o.etaArrivalTime, " (", o.eta, " away)"] }) }))] })] }), _jsxs("div", { className: "order-items", children: [_jsx("h3", { children: "Items" }), _jsx("div", { className: "order-items-grid", children: o.items.map((it, idx) => {
                                                // Check if this item has missing quantities
                                                const missingItem = o.missingItems?.find((mi) => mi.productId === it.productId);
                                                // Convert OrderItem to Product format for ProductCard
                                                const product = {
                                                    id: it.productId || `product-${idx}`,
                                                    name: it.product?.name || `Product #${it.productId}`,
                                                    price: it.product?.price || 0,
                                                    image_url: it.product?.image_url || '',
                                                };
                                                return (_jsxs("div", { className: `order-item-wrapper ${missingItem ? 'has-missing' : ''}`, children: [_jsx(ProductCard, { product: product, onClick: handleProductClick }), _jsxs("div", { className: "order-item-quantity", children: ["Qty: ", it.qty, missingItem && (_jsx("div", { className: "item-availability", children: missingItem.missingQuantity === it.qty ? (_jsx("span", { className: "unavailable-status", children: "Unavailable" })) : (_jsxs("span", { className: "partially-available-status", children: [it.qty - missingItem.missingQuantity, " of ", it.qty, " available"] })) }))] })] }, idx));
                                            }) })] }), _jsxs("div", { className: "order-summary", children: [_jsxs("div", { className: "order-costs", children: ["Subtotal: R ", typeof o.subtotal === 'number' ? o.subtotal.toFixed(2) : Number(o.subtotal || 0).toFixed(2), _jsx("br", {}), "Service fee: R ", typeof o.serviceFee === 'number' ? o.serviceFee.toFixed(2) : Number(o.serviceFee || 0).toFixed(2), (o.refundAmount ?? 0) > 0 && (_jsxs(_Fragment, { children: [_jsx("br", {}), _jsxs("span", { className: "refund-line", children: ["Refund for missing items: -R ", Number(o.refundAmount).toFixed(2)] })] }))] }), _jsxs("div", { className: "order-total", children: ["Total: R ", o.adjustedTotal
                                                    ? Number(o.adjustedTotal).toFixed(2)
                                                    : typeof o.total === 'number'
                                                        ? o.total.toFixed(2)
                                                        : Number(o.total || 0).toFixed(2), o.adjustedTotal && o.adjustedTotal !== o.total && (_jsxs("span", { className: "original-total", children: ["was R", Number(o.total || 0).toFixed(2)] }))] }), (o.refundAmount ?? 0) > 0 && (_jsxs("div", { className: "refund-credit-note", children: ["A credit of R", Number(o.refundAmount).toFixed(2), " has been added to your account for your next order."] }))] })] }, o.id))) })] }))] }));
};
export default UserOrders;
