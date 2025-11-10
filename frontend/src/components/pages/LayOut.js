import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './storepages/navbar/navbar';
import AppNav from './storepages/appnav/appnav';
import LoadingContext from './storepages/LoadingContext';
import LogoAnime from '../storepages/../assets/logos/locals-svg.gif';
const Layout = () => {
    const [loading, setLoading] = useState(false);
    return (_jsxs(LoadingContext.Provider, { value: { loading, setLoading }, children: [!loading && _jsx(Navbar, {}), _jsx("main", { className: "main-content", children: _jsx(Outlet, {}) }), !loading && _jsx(AppNav, {}), loading && (_jsxs("div", { className: "loading-container global", children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), "Loading..."] }))] }));
};
export default Layout;
