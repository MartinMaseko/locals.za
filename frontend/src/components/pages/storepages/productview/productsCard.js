import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './productstyle.css';
import { useFavorites } from '../../../contexts/FavoritesContext';
const ProductCard = ({ product, onClick }) => {
    const navigate = useNavigate();
    const { isFavorite, toggleFavorite } = useFavorites();
    const openDetail = () => {
        if (onClick)
            return onClick(product);
        navigate(`/product/${product.id}`, { state: { product } });
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetail();
        }
    };
    const handleFavClick = (e) => {
        e.stopPropagation();
        toggleFavorite(product);
    };
    const favorited = isFavorite(product.id);
    return (_jsxs("div", { className: "product-card", onClick: openDetail, onKeyDown: handleKeyDown, role: "button", tabIndex: 0, "aria-label": `View ${product.name}`, children: [_jsx("div", { className: "product-card-media", children: product.image_url && _jsx("img", { src: product.image_url, alt: product.name, className: "product-thumb" }) }), _jsxs("div", { className: "product-card-body", children: [_jsx("button", { className: `favorite-btn ${favorited ? 'favorited' : ''}`, onClick: handleFavClick, type: "button", "aria-pressed": favorited, title: favorited ? 'Remove from favorites' : 'Add to favorites', children: favorited ? (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "#FFB803", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true, children: _jsx("path", { d: "M12 21s-7.5-4.733-10.5-8.12C-0.5 8.84 3.5 4 8.5 6.09 10.3 7.01 12 8.61 12 8.61s1.7-1.6 3.5-2.52C20.5 4 24.5 8.84 22.5 12.88 19.5 16.27 12 21 12 21z" }) })) : (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "#FFB803", strokeWidth: "1.5", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true, children: _jsx("path", { d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.66l-1.06-1.05a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" }) })) }), _jsx("div", { className: "product-card-name", children: product.name }), _jsxs("div", { className: "product-card-price", children: ["R ", Number(product.price || 0).toFixed(2)] })] })] }));
};
export default ProductCard;
