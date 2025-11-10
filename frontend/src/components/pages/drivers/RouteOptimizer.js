import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { convertAddressesToCoordinates } from '../../../utils/wazeHelper';
import './driverStyles.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
const API_URL = import.meta.env.VITE_API_URL;
const RouteOptimizer = () => {
    const [deliveries, setDeliveries] = useState([]);
    const [selectedDeliveries, setSelectedDeliveries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [token, setToken] = useState(null);
    // First, get the auth token
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const idToken = await user.getIdToken(true);
                    setToken(idToken);
                    localStorage.setItem('token', idToken); // Update localStorage token
                }
                catch (error) {
                    console.error("Error getting ID token:", error);
                    // Fall back to localStorage
                    const storedToken = localStorage.getItem('token');
                    if (storedToken) {
                        setToken(storedToken);
                    }
                }
            }
            else {
                // User is not logged in with Firebase
                // Try to get token from localStorage
                const storedToken = localStorage.getItem('token');
                if (storedToken) {
                    setToken(storedToken);
                }
                else {
                    setError('Authentication token not found. Please login again.');
                }
            }
        });
        return () => unsubscribe();
    }, []);
    // Fetch assigned deliveries when token is available
    useEffect(() => {
        if (!token)
            return;
        const fetchDeliveries = async () => {
            setIsLoading(true);
            try {
                // Try the basic deliveries endpoint first - more likely to work without special indexes
                const basicResponse = await fetch(`${API_URL}/api/api/drivers/me/deliveries`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (basicResponse.ok) {
                    const data = await basicResponse.json();
                    console.log('Fetched basic deliveries:', data);
                    // Filter out delivered/cancelled orders
                    const activeDeliveries = data.filter((delivery) => delivery.status !== 'delivered' && delivery.status !== 'cancelled');
                    setDeliveries(activeDeliveries);
                    setError(null);
                    // Even though we got basic deliveries, try to get the ones with coordinates
                    // but don't wait for it or block the UI
                    fetchDeliveriesWithCoordinates();
                    setIsLoading(false);
                    return;
                }
                // If basic endpoint fails, try the coordinates endpoint
                await fetchDeliveriesWithCoordinates();
            }
            catch (error) {
                console.error('Error fetching deliveries:', error);
                setError('Failed to fetch deliveries. Please try again later.');
                setIsLoading(false);
            }
        };
        const fetchDeliveriesWithCoordinates = async () => {
            try {
                const response = await fetch(`${API_URL}/api/api/drivers/me/deliveries/coordinates`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    if (response.status === 403) {
                        setError('You are not authorized to access this data. Please login again.');
                    }
                    else if (response.status === 400 || response.status === 500) {
                        console.error(`Coordinates endpoint failed: ${response.status}. This is likely due to a missing Firestore index.`);
                        // Don't set error here as we'll try the fallback
                    }
                    else {
                        setError(`Failed to fetch deliveries: ${response.status}`);
                    }
                    return;
                }
                const data = await response.json();
                console.log('Fetched deliveries with coordinates:', data);
                setDeliveries(data); // This endpoint already filters out delivered/cancelled
                setError(null);
            }
            catch (error) {
                // Check if the error is related to Firestore indexes
                if (error.message?.includes('FAILED_PRECONDITION') ||
                    error.message?.includes('requires an index') ||
                    error.message?.includes('index.html?create_composite')) {
                    console.error('Missing Firestore index. Please create the required index:', error);
                }
                else {
                    console.error('Error fetching deliveries with coordinates:', error);
                }
                // Don't set error state here as we've already tried the basic endpoint
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchDeliveries();
    }, [token]);
    const handleSelectDelivery = (orderId) => {
        if (selectedDeliveries.includes(orderId)) {
            setSelectedDeliveries(selectedDeliveries.filter(item => item !== orderId));
        }
        else {
            setSelectedDeliveries([...selectedDeliveries, orderId]);
        }
    };
    const startNavigation = async () => {
        setIsLoading(true);
        try {
            // Check if we have coordinates available first
            const selectedDeliveryObjects = deliveries.filter(d => selectedDeliveries.includes(d.orderId)); // Changed from d.id
            // If any selected delivery has coordinates, use those directly
            const hasCoordinates = selectedDeliveryObjects.some(d => d.coordinates && d.coordinates.lat && d.coordinates.lng);
            if (hasCoordinates) {
                // Use stored coordinates for deliveries that have them
                const stopsWithCoordinates = selectedDeliveryObjects.map(d => ({
                    name: d.customerName,
                    lat: d.coordinates?.lat || 0,
                    lng: d.coordinates?.lng || 0
                })).filter(stop => stop.lat !== 0 && stop.lng !== 0);
                if (stopsWithCoordinates.length > 0) {
                    // Build a Waze app deep link using the first coordinate and include others in the query when possible
                    const first = stopsWithCoordinates[0];
                    const coordsQuery = `${first.lat},${first.lng}`;
                    // Build a 'q' param containing all coordinates or names as a fallback
                    const qParam = stopsWithCoordinates.map(s => `${s.lat},${s.lng}`).join(',');
                    const wazeAppUrl = `waze://?navigate=yes&ll=${coordsQuery}&q=${encodeURIComponent(qParam)}`;
                    const wazeWebUrl = `https://www.waze.com/ul?navigate=yes&ll=${coordsQuery}&q=${encodeURIComponent(qParam)}`;
                    // Try to open the Waze app by assigning the deep link. On mobile this should prompt to open the app.
                    try {
                        window.location.href = wazeAppUrl;
                    }
                    catch (e) {
                        // If direct assignment fails, attempt opening via an anchor click
                        const a = document.createElement('a');
                        a.href = wazeAppUrl;
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                    // After a short timeout, open the web fallback if the app didn't handle the link
                    setTimeout(() => {
                        try {
                            window.open(wazeWebUrl, '_blank');
                        }
                        catch (err) { /* ignore */ }
                    }, 1200);
                    setIsLoading(false);
                    return;
                }
            }
            // Fall back to geocoding addresses if no coordinates are available
            const selectedAddresses = selectedDeliveryObjects.map(d => d.address); // Changed from d.delivery_address
            if (selectedAddresses.length === 0) {
                alert('Please select at least one delivery address');
                setIsLoading(false);
                return;
            }
            // Convert addresses to coordinates
            const stopsWithCoordinates = await convertAddressesToCoordinates(selectedAddresses);
            // Check if we got valid coordinates back
            if (!stopsWithCoordinates || stopsWithCoordinates.length === 0) {
                throw new Error("Failed to convert addresses to coordinates");
            }
            // Build Waze deep link using the first geocoded coordinate and include others in q
            const firstGeo = stopsWithCoordinates[0];
            const coordsQueryGeo = `${firstGeo.lat},${firstGeo.lng}`;
            const qParamGeo = stopsWithCoordinates.map(s => `${s.lat},${s.lng}`).join(',');
            const wazeAppUrlGeo = `waze://?navigate=yes&ll=${coordsQueryGeo}&q=${encodeURIComponent(qParamGeo)}`;
            const wazeWebUrlGeo = `https://www.waze.com/ul?navigate=yes&ll=${coordsQueryGeo}&q=${encodeURIComponent(qParamGeo)}`;
            try {
                window.location.href = wazeAppUrlGeo;
            }
            catch (e) {
                const a = document.createElement('a');
                a.href = wazeAppUrlGeo;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            setTimeout(() => {
                try {
                    window.open(wazeWebUrlGeo, '_blank');
                }
                catch (err) { /* ignore */ }
            }, 1200);
        }
        catch (error) {
            console.error('Failed to start navigation:', error);
            alert('Failed to start navigation. Please try again.');
        }
        setIsLoading(false);
    };
    return (_jsxs("div", { className: "route-optimizer", children: [_jsx("h2", { children: "Optimize Delivery Route" }), _jsx("p", { children: "Select deliveries to include in your route:" }), error && _jsx("div", { className: "error-message", children: error }), _jsx("div", { className: "delivery-list", children: isLoading ? (_jsx("div", { className: "loading-indicator", children: "Loading deliveries..." })) : deliveries.length === 0 ? (_jsx("p", { children: error ? 'Error loading deliveries' : 'No pending deliveries found' })) : (deliveries.map(delivery => (_jsxs("div", { className: `delivery-item ${selectedDeliveries.includes(delivery.orderId) ? 'selected' : ''}`, onClick: () => handleSelectDelivery(delivery.orderId), children: [_jsxs("div", { className: "delivery-info", children: [_jsx("h3", { children: delivery.customerName }) // Changed from customer_name
                                , " // Changed from customer_name", _jsx("p", { children: delivery.address }) // Changed from delivery_address
                                , " // Changed from delivery_address", _jsx("span", { className: `status ${delivery.status}`, children: delivery.status }), delivery.coordinates && (_jsx("small", { className: "coordinates-badge", children: "Has location data" }))] }), _jsx("input", { type: "checkbox", checked: selectedDeliveries.includes(delivery.orderId), onChange: () => { } })] }, delivery.orderId)))) }), _jsx("button", { className: "navigation-button", onClick: startNavigation, disabled: selectedDeliveries.length === 0 || isLoading, children: isLoading ? 'Loading...' : `Navigate with Waze (${selectedDeliveries.length})` }), _jsx("div", { className: "waze-note", children: _jsx("p", { children: "Note: This will open the Waze app if installed on your device." }) })] }));
};
export default RouteOptimizer;
