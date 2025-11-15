import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../../assets/logos/LZAWHTTRP.webp';
import './navstyle.css';
const Navbar = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const auth = getAuth(app);
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            console.log('Signed Out');
            setDropdownOpen(false);
            navigate('/login');
        }
        catch (error) {
            console.error('Error signing out:', error);
        }
    };
    const handleLogoClick = (e) => {
        e.preventDefault();
        // Force a full page reload to check for PWA updates
        window.location.href = '/';
    };
    return (_jsxs("nav", { className: "navbar", children: [_jsxs("div", { className: "navbar-content", children: [_jsx("div", { className: "navbar-logo", children: _jsx("a", { href: "/", onClick: handleLogoClick, className: "appnav-icon", title: "Refresh App", children: _jsx("img", { src: Logo, alt: "Logo", className: 'navbar-logo' }) }) }), _jsx("div", { className: "navbar-menu", children: _jsx("button", { className: "navbar-icon", onClick: () => setDropdownOpen(!dropdownOpen), "aria-label": "Menu", style: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' }, children: _jsx("img", { src: "https://img.icons8.com/forma-thin-filled/40/FFB803/menu.png", alt: "User Menu", style: { width: '40px', height: '40px' } }) }) })] }), _jsxs("div", { className: `navbar-fullscreen-dropdown${dropdownOpen ? ' open' : ''}`, children: [_jsx("button", { className: "navbar-close", onClick: () => setDropdownOpen(false), "aria-label": "Close Menu", children: "\u00D7" }), _jsxs("div", { className: "navbar-fullscreen-items", children: [_jsxs(Link, { to: "/login", className: "navbar-dropdown-item", onClick: () => setDropdownOpen(false), children: [_jsx("img", { className: 'navbar-dropdown-icon', src: "https://img.icons8.com/ios/35/ffb803/login-rounded-right--v1.png", alt: "login-rounded-right--v1" }), "Login"] }), _jsxs(Link, { to: "/useraccount", className: "navbar-dropdown-item", onClick: () => setDropdownOpen(false), children: [_jsx("img", { className: 'navbar-dropdown-icon', src: "https://img.icons8.com/pulsar-line/35/ffb803/guest-male.png", alt: "guest-male" }), "Account"] }), _jsxs(Link, { to: "/userorders", className: "navbar-dropdown-item", onClick: () => setDropdownOpen(false), children: [_jsx("img", { width: "35", height: "35", src: "https://img.icons8.com/external-kmg-design-glyph-kmg-design/35/ffb803/external-logistics-shipping-delivery-kmg-design-glyph-kmg-design-2.png", alt: "orders-box" }), "Orders"] }), _jsxs(Link, { to: "/messages", className: "navbar-dropdown-item", onClick: () => setDropdownOpen(false), children: [_jsx("img", { width: "35", height: "35", src: "https://img.icons8.com/ios-filled/35/ffb803/message-group.png", alt: "message-group" }), "Messages"] }), _jsxs(Link, { to: "/cart", className: "navbar-dropdown-item", onClick: () => setDropdownOpen(false), children: [_jsx("img", { className: 'navbar-dropdown-icon', src: "https://img.icons8.com/ios-glyphs/35/ffb803/lift-cart-here.png", alt: "lift-cart-here" }), "Cart"] }), _jsxs("button", { className: "navbar-logout", onClick: handleSignOut, children: [_jsx("img", { className: 'navbar-dropdown-icon', src: "https://img.icons8.com/ios-glyphs/35/ffb803/logout-rounded-left.png", alt: "logout-rounded-left" }), "Sign Out"] })] })] })] }));
};
export default Navbar;
