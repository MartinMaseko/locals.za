import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './productstyle.css';
import { useCart } from '../../../contexts/CartContext';
import ProductCard from './productsCard';
import LogoAnime from '../../../assets/logos/locals-svg.gif';
import LoadingContext from '../LoadingContext';
import { Analytics } from '../../../../utils/analytics';
const API_URL = import.meta.env.VITE_API_URL;
const ProductDetailPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [product, setProduct] = useState(location.state?.product || null);
    const [suggestedProducts, setSuggestedProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [relatedFilter, setRelatedFilter] = useState({ type: null, value: null });
    const [loading, setLoading] = useState(!product);
    const [error, setError] = useState('');
    const { setLoading: setGlobalLoading } = useContext(LoadingContext);
    const { addToCart, removeFromCart, isInCart, getQty, increaseQty, decreaseQty } = useCart();
    useEffect(() => {
        setGlobalLoading(loading);
        return () => setGlobalLoading(false);
    }, [loading, setGlobalLoading]);
    // Ensure the page is scrolled to top when entering the product detail
    useEffect(() => {
        try {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
        catch (e) {
            // fallback
            window.scrollTo(0, 0);
        }
    }, [product]);
    useEffect(() => {
        const fetchProductAndSuggestions = async () => {
            setLoading(true);
            setError('');
            try {
                // Determine whether we need to fetch a new product for the current id.
                // If the existing `product` state is missing or doesn't match the route id,
                // try to use location.state first (fast) then fall back to the API.
                let currentProduct = product;
                if (!currentProduct || currentProduct.id !== id) {
                    if (location.state?.product && location.state.product.id === id) {
                        currentProduct = location.state.product;
                        setProduct(currentProduct);
                    }
                    else {
                        if (!id)
                            throw new Error('Missing product id');
                        const { data } = await axios.get(`${API_URL}/api/api/products/${id}`);
                        currentProduct = data;
                        setProduct(data);
                    }
                }
                if (currentProduct) {
                    // Fetch all products to apply our enhanced recommendation algorithm
                    const response = await axios.get(`${API_URL}/api/api/products`);
                    const data = response.data;
                    const allProducts = Array.isArray(data)
                        ? data
                        : (typeof data === 'object' && data !== null && 'products' in data && Array.isArray(data.products)
                            ? data.products
                            : []);
                    + + +setAllProducts(allProducts);
                    const recommendations = getEnhancedRecommendations(allProducts, currentProduct);
                    setSuggestedProducts(recommendations);
                }
            }
            catch (err) {
                console.error('Failed to load product or suggestions:', err);
                Analytics.trackApiError(`${API_URL}/api/api/products/${id}`, err.response?.status || 500, err.message || 'Failed to load product');
                setError(err.message || 'Failed to load product');
            }
            finally {
                setLoading(false);
            }
        };
        fetchProductAndSuggestions();
    }, [id, location.state]);
    /**
     * Enhanced recommendation algorithm that uses multiple factors:
     * 1. Exact category match (highest priority)
     * 2. Same brand (second priority)
     * 3. Similar price range (third priority)
     * 4. Product name keyword matching (additional relevance)
     */
    const getEnhancedRecommendations = (allProducts, currentProduct) => {
        // Remove the current product from consideration
        const otherProducts = allProducts.filter(p => p.id !== currentProduct.id);
        // Define price range (±25% of current product price)
        const currentPrice = parseFloat(String(currentProduct.price));
        const minPrice = currentPrice * 0.75;
        const maxPrice = currentPrice * 1.25;
        // Extract keywords from product name
        const nameKeywords = (currentProduct.name ?? '')
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3) // Only consider meaningful words (longer than 3 chars)
            .filter(word => !['with', 'and', 'for', 'the'].includes(word)); // Remove common words
        // Score and rank products
        const scoredProducts = otherProducts.map(product => {
            let score = 0;
            // Category match (highest weight: 10 points)
            if (product.category === currentProduct.category) {
                score += 10;
            }
            // Brand match (high weight: 8 points)
            if (product.brand && currentProduct.brand && product.brand === currentProduct.brand) {
                score += 8;
            }
            // Price range match (medium weight: 5 points)
            const productPrice = parseFloat(String(product.price));
            if (productPrice >= minPrice && productPrice <= maxPrice) {
                score += 5;
            }
            // Name keyword matches (1 point per matching keyword)
            if (product.name) {
                const productNameLower = product.name.toLowerCase();
                nameKeywords.forEach(keyword => {
                    if (productNameLower.includes(keyword)) {
                        score += 1;
                    }
                });
            }
            return { product, score };
        });
        // Sort by score (highest first)
        scoredProducts.sort((a, b) => b.score - a.score);
        // Return top 5 products
        return scoredProducts
            .slice(0, 5)
            .map(item => item.product);
    };
    // Updated back button handler with explicit scrollToTop state
    const handleBackNavigation = () => {
        Analytics.trackUserPath('product_detail', 'product_list', 'back_button');
        // Pass scrollToTop state to ensure scroll position is reset
        navigate("..", { state: { scrollToTop: true } });
    };
    // Ensure we have products available if handlers are called later
    const fetchAllProducts = async () => {
        if (allProducts && allProducts.length > 0)
            return allProducts;
        try {
            const resp = await axios.get(`${API_URL}/api/api/products`);
            const data = resp.data;
            const list = Array.isArray(data)
                ? data
                : (typeof data === 'object' && data !== null && 'products' in data && Array.isArray(data.products)
                    ? data.products
                    : []);
            setAllProducts(list);
            return list;
        }
        catch (e) {
            return [];
        }
    };
    const showProductsByBrand = async (brand) => {
        if (!brand)
            return;
        const list = await fetchAllProducts();
        const matches = list.filter(p => p.brand === brand && p.id !== product?.id);
        setRelatedFilter({ type: 'brand', value: brand });
        setRelatedProducts(matches);
        const el = document.getElementById('related-products');
        if (el)
            el.scrollIntoView({ behavior: 'smooth' });
    };
    const showProductsByCategory = async (category) => {
        if (!category)
            return;
        const list = await fetchAllProducts();
        const matches = list.filter(p => p.category === category && p.id !== product?.id);
        setRelatedFilter({ type: 'category', value: category });
        setRelatedProducts(matches);
        const el = document.getElementById('related-products');
        if (el)
            el.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => {
        if (product) {
            Analytics.trackProductView(product);
        }
    }, [product]);
    const handleAddToCart = () => {
        if (product) {
            Analytics.trackAddToCart(product, 1);
            addToCart(product);
        }
    };
    const handleSuggestedProductClick = (prod) => {
        Analytics.trackUserPath(`product_${product?.id}`, `product_${prod.id}`, 'suggestion_click');
        navigate(`/product/${prod.id}`, { state: { product: prod } });
        try {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
        catch (e) {
            window.scrollTo(0, 0);
        }
    };
    if (loading)
        return (_jsxs("div", { className: 'loading-container', children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), "Loading..."] }));
    if (error)
        return _jsx("div", { className: "product-detail-error", children: error });
    if (!product)
        return _jsx("div", { className: "product-detail-empty", children: "Product not found" });
    const inCart = isInCart(product.id);
    const qty = getQty(product.id);
    return (_jsxs("div", { className: "product-detail-page", children: [_jsxs("button", { className: "product-detail-back", onClick: handleBackNavigation, children: [_jsx("img", { width: "30", height: "30", src: "https://img.icons8.com/ios-filled/35/ffb803/back.png", alt: "back" }), "Back"] }), _jsxs("div", { className: "product-detail-grid", children: [product.image_url && _jsx("img", { src: product.image_url, alt: product.name, className: "product-detail-image" }), _jsxs("div", { className: "product-detail-info", children: [_jsx("h1", { className: "product-modal-title", children: product.name }), _jsxs("p", { className: "product-modal-price", children: ["R ", Number(product.price || 0).toFixed(2)] }), product.brand && (_jsxs("p", { className: 'product-modal-subtext', children: [_jsx("strong", { children: "Brand:" }), ' ', _jsx("button", { className: "link-button", onClick: () => showProductsByBrand(product.brand), children: product.brand })] })), product.category && (_jsxs("p", { className: 'product-modal-subtext', children: [_jsx("strong", { children: "Category:" }), ' ', _jsx("button", { className: "link-button", onClick: () => showProductsByCategory(product.category), children: product.category })] })), product.description && _jsx("p", { className: 'product-modal-description', children: product.description }), _jsx("div", { className: "product-detail-actions", children: !inCart ? (_jsx("button", { className: "add-to-cart", onClick: handleAddToCart, type: "button", children: "Add to cart" })) : (_jsxs("div", { className: "cart-controls", style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("button", { className: "decrease-qty", type: "button", onClick: () => decreaseQty(product.id), "aria-label": "Decrease quantity", children: "\u2212" }), _jsxs("span", { children: ["Qty: ", qty] }), _jsx("button", { className: "increase-qty", type: "button", onClick: () => increaseQty(product.id), "aria-label": "Increase quantity", children: "+" }), _jsx("button", { className: "remove-from-cart", onClick: () => removeFromCart(product.id), type: "button", children: "Remove" })] })) })] })] }), suggestedProducts.length > 0 && (_jsxs("div", { className: "suggested-products-section", children: [_jsx("h2", { children: "You might also like" }), _jsx("div", { className: "suggested-products-grid", children: suggestedProducts.map(p => (_jsx(ProductCard, { product: p, onClick: handleSuggestedProductClick }, p.id))) })] })), relatedProducts.length > 0 && (_jsxs("div", { id: "related-products", className: "related-products-section", children: [_jsx("h2", { children: relatedFilter.type === 'brand' ? `More from ${relatedFilter.value}` : `More in ${relatedFilter.value}` }), _jsx("div", { className: "related-products-grid", children: relatedProducts.map(p => (_jsx(ProductCard, { product: p, onClick: (prod) => {
                                navigate(`/product/${prod.id}`, { state: { product: prod } });
                                try {
                                    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                                }
                                catch (e) {
                                    window.scrollTo(0, 0);
                                }
                            } }, p.id))) })] }))] }));
};
export default ProductDetailPage;
