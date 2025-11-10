import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import DriversNav from '../driverNav';
import './DriverLayout.css';
const DriverLayout = () => {
    const [isDriverAuthenticated, setIsDriverAuthenticated] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const auth = getAuth(app);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    await user.getIdToken();
                    const isDriver = true;
                    setIsDriverAuthenticated(isDriver);
                    if (!isDriver) {
                        navigate('/login');
                    }
                }
                catch (error) {
                    console.error('Error verifying driver status:', error);
                    setIsDriverAuthenticated(false);
                }
            }
            else {
                // No user logged in
                setIsDriverAuthenticated(false);
                navigate('/login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [auth, navigate]);
    if (loading) {
        return (_jsxs("div", { className: "driver-loading-container", children: [_jsx("div", { className: "driver-loading-spinner" }), _jsx("p", { children: "Loading..." })] }));
    }
    if (isDriverAuthenticated === false) {
        return (_jsxs("div", { className: "driver-auth-required", children: [_jsx("h2", { children: "Driver Access Required" }), _jsx("p", { children: "Please log in with a driver account to access this area." }), _jsx("button", { onClick: () => navigate('/login'), children: "Go to Login" })] }));
    }
    return (_jsxs("div", { className: "driver-layout", children: [_jsx(DriversNav, {}), _jsx("main", { className: "driver-layout-content", children: _jsx(Outlet, {}) })] }));
};
export default DriverLayout;
