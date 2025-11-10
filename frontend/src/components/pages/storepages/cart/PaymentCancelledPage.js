import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import LoadingContext from '../LoadingContext';
import LogoAnime from '../../../assets/logos/locals-svg.gif';
import './cartstyle.css';
const API_URL = import.meta.env.VITE_API_URL;
const PaymentCancelledPage = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [authChecked, setAuthChecked] = useState(false);
    const location = useLocation();
    const { setLoading: setGlobalLoading } = useContext(LoadingContext);
    const statusUpdatedRef = useRef(false);
    useEffect(() => {
        setGlobalLoading(loading);
        return () => setGlobalLoading(false);
    }, [loading, setGlobalLoading]);
    // First, check authentication state before trying to fetch order
    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Auth state changed:", user ? "User logged in" : "No user");
            setAuthChecked(true);
        });
        return () => unsubscribe();
    }, []);
    // Handle the order fetch once auth is checked
    useEffect(() => {
        if (!authChecked)
            return; // Wait until auth state is checked
        const fetchOrder = async () => {
            if (!id) {
                setError('Order ID is missing');
                setLoading(false);
                return;
            }
            try {
                const auth = getAuth(app);
                const user = auth.currentUser;
                console.log("Fetching order:", id);
                console.log("Current user:", user ? "Logged in" : "Not logged in");
                // For orders coming from PayFast, we may need to fetch without auth first
                const isFromPayFast = location.search.includes('pf_') ||
                    location.pathname.includes('/payment-cancelled/');
                let orderData = null;
                try {
                    // First try with authentication if user is logged in
                    if (user) {
                        const token = await user.getIdToken();
                        console.log("Token obtained, trying authenticated request");
                        const response = await axios.get(`${API_URL}/api/api/orders/${id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        orderData = response.data;
                    }
                    else if (isFromPayFast) {
                        // If coming from PayFast and no user is logged in, try a special endpoint
                        console.log("No user logged in, but coming from PayFast. Trying public endpoint");
                        const response = await axios.get(`${API_URL}/api/api/orders/public/${id}`);
                        orderData = response.data;
                    }
                    else {
                        throw new Error('Authentication required');
                    }
                }
                catch (authError) {
                    console.error("Error with initial fetch:", authError);
                    // As a last resort for PayFast returns, try the public endpoint
                    if (isFromPayFast) {
                        console.log("Trying public endpoint as fallback");
                        const response = await axios.get(`${API_URL}/api/api/orders/public/${id}`);
                        orderData = response.data;
                    }
                    else {
                        throw authError;
                    }
                }
                console.log("Order data fetched:", orderData);
                if (!orderData) {
                    throw new Error('No order data received');
                }
                setOrder(orderData);
                // Update the order status to cancelled if it's pending_payment
                if (!statusUpdatedRef.current && user && orderData.status === 'pending_payment') {
                    try {
                        console.log("Updating order status to 'cancelled'");
                        statusUpdatedRef.current = true;
                        const token = await user.getIdToken();
                        await axios.put(`${API_URL}/api/api/orders/${id}/status`, { status: 'cancelled' }, { headers: { Authorization: `Bearer ${token}` } });
                        setOrder(prevOrder => prevOrder ? { ...prevOrder, status: 'cancelled' } : orderData);
                    }
                    catch (err) {
                        console.error('Error updating order status to cancelled:', err);
                        statusUpdatedRef.current = false;
                    }
                }
                // Even if the user isn't logged in but we fetched the order, mark it as cancelled
                // through a public endpoint if coming from PayFast
                else if (!statusUpdatedRef.current && !user && isFromPayFast &&
                    orderData.status === 'pending_payment') {
                    try {
                        console.log("Updating order status to 'cancelled' via public endpoint");
                        statusUpdatedRef.current = true;
                        await axios.put(`${API_URL}/api/api/orders/public/${id}/cancel`, {
                            cancelReason: 'payment_cancelled_by_user'
                        });
                        setOrder(prevOrder => prevOrder ? { ...prevOrder, status: 'cancelled' } : orderData);
                    }
                    catch (err) {
                        console.error('Error updating order status to cancelled:', err);
                        statusUpdatedRef.current = false;
                    }
                }
            }
            catch (err) {
                console.error('Error fetching order:', err);
                // Provide user-friendly error messages
                if (err.response?.status === 401) {
                    setError('Please log in to view your order details');
                }
                else if (err.response?.status === 404) {
                    setError('Order not found. It may have been deleted or you may not have permission to view it.');
                }
                else {
                    setError(err?.response?.data?.message || 'Failed to load order details');
                }
            }
            finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id, authChecked, location.search, location.pathname]);
    if (loading) {
        return (_jsxs("div", { className: "loading-container", children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), _jsx("div", { children: "Loading your order details..." })] }));
    }
    if (error) {
        return (_jsx("div", { className: "order-confirmation-wrapper", children: _jsxs("div", { className: 'error-wrapper', children: [_jsx("img", { width: "75", height: "75", src: "https://img.icons8.com/keek/75/error.png", alt: "error" }), _jsx("div", { className: "error-message", children: error }), _jsxs("div", { className: "error-actions", children: [_jsx(Link, { to: "/login", className: "login-button", children: "Login" }), _jsx(Link, { to: "/", className: "redirect-button", children: "Return to Home" })] })] }) }));
    }
    if (!order) {
        return (_jsx("div", { className: "order-confirmation-wrapper", children: _jsxs("div", { className: 'error-wrapper', children: [_jsx("img", { width: "75", height: "75", src: "https://img.icons8.com/keek/75/error.png", alt: "error" }), _jsx("div", { className: "error-message", children: "Order not found" }), _jsx(Link, { to: "/", className: "redirect-button", children: "Return to Home" })] }) }));
    }
    return (_jsx("div", { className: "order-confirmation-wrapper", children: _jsxs("div", { className: "order-confirmation-content", children: [_jsxs("div", { className: "order-confirmation-header", children: [_jsx("h1", { children: "Payment Cancelled" }), _jsx("div", { className: "order-status", children: _jsx("span", { className: "status-badge status-cancelled", children: "Status: Cancelled" }) }), _jsxs("p", { className: "order-confirmation-message", children: ["Your order #", order.id, " has been cancelled. No payment has been processed."] }), _jsxs("p", { className: "order-date", children: ["Placed on: ", order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'] })] }), _jsxs("div", { className: "order-details-section", children: [_jsx("h2", { children: "Order Items" }), _jsx("div", { className: "order-items-grid", children: order.items.map((item, index) => (_jsxs("div", { className: "order-item-card", children: [item.product && (_jsxs("div", { className: "product-card", children: [_jsx("div", { className: "product-image-container", children: _jsx("img", { src: item.product.image_url || "https://via.placeholder.com/150", alt: item.product.name || "Product", className: "product-image" }) }), _jsxs("div", { className: "product-details", children: [_jsx("h3", { className: "product-name", children: item.product.name }), _jsxs("p", { className: "product-price", children: ["R ", typeof item.product.price === 'number'
                                                                ? item.product.price.toFixed(2)
                                                                : parseFloat(String(item.product.price || 0)).toFixed(2)] })] })] })), _jsxs("div", { className: "item-quantity", children: ["QTY: ", item.qty] })] }, index))) }), _jsx("div", { className: "order-summary", children: _jsxs("div", { className: "order-costs", children: [_jsxs("div", { className: "cost-row", children: [_jsx("span", { children: "Subtotal:" }), _jsxs("span", { children: ["R ", typeof order.subtotal === 'number' ? order.subtotal.toFixed(2) : '0.00'] })] }), _jsxs("div", { className: "cost-row", children: [_jsx("span", { children: "Service Fee:" }), _jsxs("span", { children: ["R ", typeof order.serviceFee === 'number' ? order.serviceFee.toFixed(2) : '0.00'] })] }), _jsxs("div", { className: "cost-row total", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { children: ["R ", typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'] })] })] }) })] }), _jsxs("div", { className: "delivery-details-section", children: [_jsx("h2", { children: "Delivery Information" }), _jsxs("div", { className: "delivery-details", children: [_jsxs("p", { children: [_jsx("strong", { children: "Recipient:" }), " ", order.deliveryAddress?.name || 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "Phone:" }), " ", order.deliveryAddress?.phone || 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "Address:" }), " ", order.deliveryAddress?.addressLine || 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "City:" }), " ", order.deliveryAddress?.city || 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "Postal Code:" }), " ", order.deliveryAddress?.postal || 'N/A'] })] })] }), _jsx("div", { className: "order-actions", children: _jsx(Link, { to: "/", className: "view-orders-button", children: "Continue Shopping" }) })] }) }));
};
export default PaymentCancelledPage;
