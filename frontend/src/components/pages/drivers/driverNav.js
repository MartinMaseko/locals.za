import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logos/LZA ICON.png';
import '../storepages/navbar/navstyle.css';
import './driverStyles.css';
const DriversNav = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const auth = getAuth(app);
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            console.log('Driver Signed Out');
            setDropdownOpen(false);
            navigate('/driver-login');
        }
        catch (error) {
            console.error('Error signing out:', error);
        }
    };
    return (_jsx("div", { className: "driver-nav-container", children: _jsxs("nav", { className: "navbar drivers-navbar", children: [_jsxs("div", { className: "driver-navbar-content", children: [_jsx("div", { className: "driver-navbar-logo", children: _jsx(Link, { to: "/driversdashboard", children: _jsx("img", { src: Logo, alt: "Logo", className: 'driver-logo' }) }) }), _jsx("div", { className: "navbar-menu", children: _jsx("button", { className: "navbar-icon", onClick: () => setDropdownOpen(!dropdownOpen), "aria-label": "Menu", style: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' }, children: _jsx("img", { src: "https://img.icons8.com/forma-thin-filled/40/FFB803/menu.png", alt: "Driver Menu", style: { width: '40px', height: '40px' } }) }) })] }), _jsxs("div", { className: `navbar-fullscreen-dropdown${dropdownOpen ? ' open' : ''}`, children: [_jsx("button", { className: "navbar-close", onClick: () => setDropdownOpen(false), "aria-label": "Close Menu", children: "\u00D7" }), _jsxs("div", { className: "navbar-fullscreen-items driver-menu-items", children: [_jsxs(Link, { to: "/driversdashboard", className: "navbar-dropdown-item", onClick: () => setDropdownOpen(false), children: [_jsx("img", { width: "35", height: "35", src: "https://img.icons8.com/material/35/ffb803/dashboard-layout.png", alt: "dashboard-layout" }), "Dashboard"] }), _jsxs(Link, { to: "/driver/revenue", className: "navbar-dropdown-item", onClick: () => setDropdownOpen(false), children: [_jsx("img", { className: 'navbar-dropdown-icon', src: "https://img.icons8.com/ios-glyphs/35/ffb803/money-bag.png", alt: "revenue" }), "Revenue"] }), _jsxs("button", { className: "navbar-logout", onClick: handleSignOut, children: [_jsx("img", { className: 'navbar-dropdown-icon', src: "https://img.icons8.com/ios-glyphs/35/ffb803/logout-rounded-left.png", alt: "logout-rounded-left" }), "Sign Out"] })] })] })] }) }));
};
export default DriversNav;
