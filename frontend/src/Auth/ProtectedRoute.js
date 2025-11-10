import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import LogoAnime from '../components/assets/logos/locals-svg.gif';
export const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
    const { currentUser, userLoading } = useAuth();
    const location = useLocation();
    // If still loading, show loading spinner
    if (userLoading) {
        return (_jsxs("div", { className: 'loading-container', children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), "Loading..."] }));
    }
    // If not authenticated, redirect to login with return path
    if (!currentUser) {
        return _jsx(Navigate, { to: redirectTo, state: { from: location.pathname }, replace: true });
    }
    // If authenticated, render children
    return _jsx(_Fragment, { children: children });
};
