import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './FloatingSupport.css';
const FloatingSupport = () => {
    const navigate = useNavigate();
    const handleSupportClick = () => {
        navigate('/support');
    };
    return (_jsx("div", { className: "floating-support-container", children: _jsxs("button", { className: "floating-support-button", onClick: handleSupportClick, "aria-label": "Get Support", children: [_jsx("div", { className: "support-icon-wrapper", children: _jsx("img", { width: "45", height: "45", src: "https://img.icons8.com/material-outlined/48/online-support.png", alt: "Support" }) }), _jsx("span", { className: "support-tooltip", children: "Need Help?" })] }) }));
};
export default FloatingSupport;
