import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './driverStyles.css';
const API_URL = import.meta.env.VITE_API_URL;
const DriversDash = () => {
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [error, setError] = useState('');
    const auth = getAuth(app);
    const navigate = useNavigate();
    useEffect(() => {
        const fetchDriverData = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    // Get the ID token result to check custom claims
                    const idTokenResult = await user.getIdTokenResult();
                    // Initialize driver data with auth information
                    let driverData = {
                        name: user.displayName || undefined,
                        email: user.email || undefined,
                        uid: user.uid,
                    };
                    // Method 1: Check if driver name is stored in custom claims
                    if (idTokenResult.claims &&
                        (idTokenResult.claims.full_name || idTokenResult.claims.name)) {
                        driverData.name = idTokenResult.claims.full_name || idTokenResult.claims.name;
                    }
                    // Method 2: Try Firebase Auth user.displayName
                    if (!driverData.name && user.displayName) {
                        driverData.name = user.displayName;
                    }
                    // Method 4: Extract name from driver_id as last resort
                    if (!driverData.name && idTokenResult.claims.driver_id) {
                        const driverId = String(idTokenResult.claims.driver_id);
                        if (driverId.startsWith('DRIVER-')) {
                            driverData.name = `Driver ${driverId.substring(7)}`;
                        }
                    }
                    // Final name determination
                    if (!driverData.name) {
                        driverData.name = 'Driver';
                    }
                    setDriver(driverData);
                    // Fetch orders
                    await fetchDriverOrders(user.uid);
                    if (typeof idTokenResult.claims.driver_id === 'string' &&
                        idTokenResult.claims.driver_id !== user.uid) {
                        await fetchDriverOrders(idTokenResult.claims.driver_id);
                    }
                }
                else {
                    navigate('/driver-login'); // Redirect to login if not signed in
                }
            }
            catch (error) {
                setError('Failed to load driver information');
            }
            finally {
                setLoading(false);
            }
        };
        fetchDriverData();
    }, [auth, navigate]);
    const fetchDriverOrders = async (driverId) => {
        setLoadingOrders(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                throw new Error('Authentication required');
            }
            const response = await axios.get(`${API_URL}/api/api/orders`, {
                params: { driver_id: driverId },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(response.data)) {
                setAssignedOrders(response.data);
            }
            else {
                setAssignedOrders([]);
            }
        }
        catch (error) {
            setError('Failed to load your assigned orders');
        }
        finally {
            setLoadingOrders(false);
        }
    };
    const getFormattedAddress = (address) => {
        if (!address)
            return 'No address provided';
        const parts = [];
        if (address.street)
            parts.push(address.street);
        if (address.city)
            parts.push(address.city);
        if (address.postalCode)
            parts.push(address.postalCode);
        return parts.length ? parts.join(', ') : 'No address details';
    };
    const getFormattedDate = (dateString) => {
        if (!dateString)
            return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-ZA', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        catch (e) {
            return dateString;
        }
    };
    const handleViewOrder = (orderId) => {
        // Navigate to the driver deliveries page with the order ID
        navigate(`/driver/deliveries/${orderId}`);
    };
    if (loading) {
        return (_jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "loading-spinner" }), _jsx("p", { children: "Loading dashboard..." })] }));
    }
    return (_jsx("div", { className: "driver-dashboard", children: _jsxs("div", { className: "driver-stats-cards", children: [_jsxs("div", { className: "driver-section", children: [_jsx("h2", { children: "Assigned Orders" }), loadingOrders ? (_jsxs("div", { className: "loading-orders", children: [_jsx("div", { className: "loading-spinner" }), _jsx("p", { children: "Loading orders..." })] })) : error ? (_jsxs("div", { className: "error-message", children: [_jsx("p", { children: error }), _jsx("button", { onClick: () => driver?.uid ? fetchDriverOrders(driver.uid) : auth.currentUser?.uid ? fetchDriverOrders(auth.currentUser.uid) : null, className: "retry-button", children: "Try Again" })] })) : assignedOrders.length === 0 ? (_jsxs("div", { className: "no-orders-message", children: [_jsx("img", { src: "https://img.icons8.com/ios-filled/100/999999/delivery.png", alt: "No orders", className: "no-orders-icon" }), _jsx("p", { children: "No orders assigned yet" }), _jsx("p", { className: "no-orders-subtext", children: "New deliveries will appear here" })] })) : (_jsx("div", { className: "driver-orders-list", children: assignedOrders.map(order => (_jsxs("div", { className: `driver-order-card status-${order.status}`, children: [_jsxs("div", { className: "driver-order-header", children: [_jsxs("div", { className: "driver-order-id", children: ["Order #", order.id.slice(-6)] }), _jsx("div", { className: 'driver-order-status', children: order.status.charAt(0).toUpperCase() + order.status.slice(1) })] }), _jsxs("div", { className: "driver-order-details", children: [_jsxs("div", { className: "driver-order-address", children: [_jsx("strong", { children: "Delivery Address:" }), _jsx("p", { children: getFormattedAddress(order.deliveryAddress) })] }), _jsxs("div", { className: "driver-order-time", children: [_jsx("strong", { children: "Order Time:" }), _jsx("p", { children: getFormattedDate(order.createdAt) })] })] }), _jsx("div", { className: "driver-order-actions", children: _jsx("button", { className: "driver-view-order-btn", onClick: () => handleViewOrder(order.id), children: "View Order" }) })] }, order.id))) }))] }), _jsxs("div", { className: "driver-stat-card", children: [_jsx("h3", { children: "Completed" }), _jsx("p", { className: "stat-number", children: assignedOrders.filter(order => order.status === 'completed' || order.status === 'delivered').length })] }), _jsxs("div", { className: "driver-stat-card", children: [_jsx("h3", { children: "Revenue" }), _jsxs("p", { className: "stat-number", children: ["R", (assignedOrders
                                    .filter(order => order.status === 'completed' || order.status === 'delivered')
                                    .length * 40).toFixed(2)] })] })] }) }));
};
export default DriversDash;
