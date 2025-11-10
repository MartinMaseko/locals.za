import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useCart } from '../../../contexts/CartContext';
import './appnavstyle.css';
const AppNav = () => {
    const { cart } = useCart();
    const itemCount = Array.isArray(cart) ? cart.reduce((acc, it) => acc + (it.qty || 0), 0) : 0;
    return (_jsxs("nav", { className: "appnav-bar", children: [_jsxs(Link, { to: "/", className: "appnav-icon", title: "Home", children: [_jsx("img", { className: 'appnav-icons', src: "https://img.icons8.com/material-rounded/40/ffb803/home.png", alt: "home" }), "Home"] }), _jsxs(Link, { to: "/shop", className: "appnav-icon", title: "Shop", children: [_jsx("img", { className: 'appnav-icons', src: "https://img.icons8.com/material-rounded/40/ffb803/shop.png", alt: "shop" }), _jsx("span", { children: "Shop" })] }), _jsxs(Link, { to: "/support", className: "appnav-icon", title: "Support", children: [_jsx("img", { className: 'appnav-icons', src: "https://img.icons8.com/material-sharp/40/ffb803/ask-question.png", alt: "support" }), _jsx("span", { children: "Support" })] }), _jsxs(Link, { to: "/cart", className: "appnav-icon", title: "Cart", children: [_jsx("img", { className: 'appnav-icons', src: "https://img.icons8.com/ios-glyphs/40/ffb803/lift-cart-here.png", alt: "cart" }), _jsxs("span", { children: ["Cart", _jsxs("span", { className: "cart-item-count", children: [" ", itemCount] })] })] })] }));
};
export default AppNav;
