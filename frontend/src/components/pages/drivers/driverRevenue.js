import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './driverStyles.css';
const API_URL = import.meta.env.VITE_API_URL;
const DriverRevenue = () => {
    const [driver, setDriver] = useState(null);
    const [completedOrders, setCompletedOrders] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCashingOut, setIsCashingOut] = useState(false);
    const [cashoutSuccess, setCashoutSuccess] = useState(false);
    const [cashoutError, setCashoutError] = useState('');
    const [lastCashout, setLastCashout] = useState(null);
    const auth = getAuth(app);
    const navigate = useNavigate();
    useEffect(() => {
        const fetchDriverData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    navigate('/driver-login');
                    return;
                }
                const idTokenResult = await user.getIdTokenResult();
                // Initialize driver data with auth information
                let driverData = {
                    name: user.displayName || undefined,
                    email: user.email || undefined,
                    uid: user.uid,
                };
                // Get name from claims if available
                if (idTokenResult.claims &&
                    (idTokenResult.claims.full_name || idTokenResult.claims.name)) {
                    driverData.name = idTokenResult.claims.full_name ||
                        idTokenResult.claims.name;
                }
                setDriver(driverData);
                // Fetch driver-specific information including last cashout
                await fetchDriverInfo(user.uid);
                // Fetch orders
                await fetchDriverOrders(user.uid);
                if (typeof idTokenResult.claims.driver_id === 'string' &&
                    idTokenResult.claims.driver_id !== user.uid) {
                    await fetchDriverOrders(idTokenResult.claims.driver_id);
                }
            }
            catch (error) {
                console.error('Error fetching driver data:', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchDriverData();
    }, [auth, navigate]);
    // Update the fetchDriverInfo method to handle errors better
    const fetchDriverInfo = async (driverId) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                throw new Error('Authentication required');
            }
            const response = await axios.get(`${API_URL}/api/drivers/info`, {
                params: { driver_id: driverId },
                headers: { Authorization: `Bearer ${token}` }
            });
            // Type assertion for the response data
            const driverInfo = response.data;
            if (driverInfo) {
                if (driverInfo.lastCashoutDate) {
                    setLastCashout(driverInfo.lastCashoutDate);
                }
                setDriver(prevState => ({
                    ...prevState,
                    lastCashoutDate: driverInfo.lastCashoutDate,
                    name: prevState?.name || driverInfo.name
                }));
            }
        }
        catch (error) {
            console.error('Failed to load driver info:', error);
            // Continue with what we have - don't block the UI
        }
    };
    // Update the fetchDriverOrders method to use a fallback if needed
    const fetchDriverOrders = async (driverId) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                throw new Error('Authentication required');
            }
            const response = await axios.get(`${API_URL}/api/orders`, {
                params: { driver_id: driverId, include_cashout_status: true },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(response.data)) {
                // Filter completed orders
                const completed = response.data.filter(order => (order.status === 'completed' || order.status === 'delivered'));
                // Separate into cashed out and pending
                const cashedOut = completed.filter(order => order.cashedOut === true);
                const pending = completed.filter(order => order.cashedOut !== true);
                setCompletedOrders(cashedOut);
                setPendingOrders(pending);
            }
        }
        catch (error) {
            console.error('Failed to load orders:', error);
            // Show empty state but don't block UI
            setCompletedOrders([]);
            setPendingOrders([]);
        }
        finally {
            // Always set loading to false so UI can render
            setLoading(false);
        }
    };
    const handleCashout = async () => {
        if (pendingOrders.length === 0)
            return;
        setIsCashingOut(true);
        setCashoutError('');
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                throw new Error('Authentication required');
            }
            // Get order IDs for cashout
            const orderIds = pendingOrders.map(order => order.id);
            // Calculate total amount
            const amount = pendingOrders.length * 40;
            await axios.post(`${API_URL}/api/drivers/cashout`, {
                orderIds,
                amount,
                driverName: driver?.name || 'Driver',
                driverEmail: driver?.email || 'No email provided',
                driverId: driver?.uid
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update orders as cashed out
            setCompletedOrders([...completedOrders, ...pendingOrders]);
            setPendingOrders([]);
            // Set last cashout date
            setLastCashout(new Date().toISOString());
            // Show success message
            setCashoutSuccess(true);
            // Hide success message after 5 seconds
            setTimeout(() => {
                setCashoutSuccess(false);
            }, 5000);
        }
        catch (error) {
            console.error('Cashout failed:', error);
            setCashoutError('Failed to process cashout. Please try again.');
        }
        finally {
            setIsCashingOut(false);
        }
    };
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-ZA', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        catch (e) {
            return dateString;
        }
    };
    const totalPendingRevenue = pendingOrders.length * 40;
    const totalEarnedRevenue = completedOrders.length * 40;
    if (loading) {
        return (_jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "loading-spinner" }), _jsx("p", { children: "Loading revenue data..." })] }));
    }
    return (_jsxs("div", { className: "driver-revenue-page", children: [_jsxs("div", { className: "driver-revenue-header", children: [_jsx("h1", { children: "Driver Earnings" }), driver?.name && _jsxs("p", { className: "driver-name", children: ["Welcome back, ", driver.name] })] }), _jsxs("div", { className: "driver-revenue-cards", children: [_jsxs("div", { className: "revenue-card available-revenue", children: [_jsx("h2", { children: "Available for Cashout" }), _jsxs("p", { className: "revenue-amount", children: ["R", totalPendingRevenue.toFixed(2)] }), _jsxs("p", { className: "revenue-info", children: [pendingOrders.length, " completed ", pendingOrders.length === 1 ? 'delivery' : 'deliveries'] }), _jsx("button", { className: "cashout-btn", onClick: handleCashout, disabled: isCashingOut || pendingOrders.length === 0, children: isCashingOut ? 'Processing...' : 'Cash Out' }), lastCashout && (_jsxs("p", { className: "last-cashout-info", children: ["Last cashout: ", formatDate(lastCashout)] })), cashoutSuccess && (_jsxs("div", { className: "cashout-success", children: [_jsx("p", { children: "Cashout request submitted successfully!" }), _jsx("p", { children: "Your payment will be processed shortly." })] })), cashoutError && (_jsx("div", { className: "cashout-error", children: _jsx("p", { children: cashoutError }) }))] }), _jsxs("div", { className: "revenue-card total-revenue", children: [_jsx("h2", { children: "Total Earnings" }), _jsxs("p", { className: "revenue-amount", children: ["R", (totalEarnedRevenue + totalPendingRevenue).toFixed(2)] }), _jsxs("p", { className: "revenue-info", children: [completedOrders.length + pendingOrders.length, " total ", (completedOrders.length + pendingOrders.length) === 1 ? 'delivery' : 'deliveries'] })] }), _jsxs("div", { className: "revenue-card cashed-out", children: [_jsx("h2", { children: "Paid Out" }), _jsxs("p", { className: "revenue-amount", children: ["R", totalEarnedRevenue.toFixed(2)] }), _jsxs("p", { className: "revenue-info", children: [completedOrders.length, " paid ", completedOrders.length === 1 ? 'delivery' : 'deliveries'] })] })] }), _jsxs("div", { className: "driver-revenue-orders", children: [_jsx("h2", { children: "Pending Payment" }), pendingOrders.length === 0 ? (_jsx("div", { className: "no-pending-orders", children: _jsx("p", { children: "No pending payments" }) })) : (_jsx("div", { className: "pending-orders-list", children: pendingOrders.map(order => (_jsxs("div", { className: "revenue-order-card", children: [_jsxs("div", { className: "revenue-order-header", children: [_jsxs("div", { className: "revenue-order-id", children: ["Order #", order.id.slice(-6)] }), _jsx("div", { className: "revenue-order-date", children: formatDate(order.createdAt) })] }), _jsx("div", { className: "revenue-order-amount", children: "R40.00" })] }, order.id))) })), _jsx("h2", { children: "Payment History" }), completedOrders.length === 0 ? (_jsx("div", { className: "no-completed-orders", children: _jsx("p", { children: "No payment history" }) })) : (_jsx("div", { className: "completed-orders-list", children: completedOrders.map(order => (_jsxs("div", { className: "revenue-order-card paid", children: [_jsxs("div", { className: "revenue-order-header", children: [_jsxs("div", { className: "revenue-order-id", children: ["Order #", order.id.slice(-6)] }), _jsx("div", { className: "revenue-order-date", children: formatDate(order.createdAt) })] }), _jsx("div", { className: "revenue-order-amount", children: "R40.00" })] }, order.id))) }))] })] }));
};
export default DriverRevenue;
