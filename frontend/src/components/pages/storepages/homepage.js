import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useContext, useRef, useLayoutEffect } from 'react';
import LoadingContext from './LoadingContext';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import './storefront.css';
import ProductCard from './productview/productsCard';
import LogoAnime from '../../assets/logos/locals-svg.gif';
import AppBanner from '../../assets/images/appbanner.webp';
import Beverages from '../../assets/images/Beverages.webp';
import Maize from '../../assets/images/maize.webp';
import rice from '../../assets/images/rice.webp';
import CannedFood from '../../assets/images/canned.webp';
import Sugar from '../../assets/images/sugar.webp';
import Oil from '../../assets/images/oil.webp';
import RelaxersPermKits from '../../assets/images/Relaxers.webp';
import shampoosCleansers from '../../assets/images/Shampoo.webp';
import ConditionersTreatments from '../../assets/images/ConditionerTreatments.webp';
import { useLocation } from 'react-router-dom';
const API_URL = import.meta.env.VITE_API_URL;
const productCategories = [
    // Fast-Moving Consumer Goods (FMCG) Categories
    'Beverages', // Van Vehicle
    'Spices & Seasoning', //light Vehicle
    'Canned Foods', // Van Vehicle
    'Sugar', // Van Vehicle
    'Flour', // Van Vehicle
    'Cooking Oils & Fats', // Van Vehicle
    'Rice', // Van Vehicle
    'Maize Meal', // Van Vehicle
    'Snacks & Confectionery', //light Vehicle
    'Household Cleaning & Goods', //light Vehicle
    'Laundry Supplies', //light Vehicle
    'Personal Care', //light Vehicle
    'Food Packaging', //Van Vehicle
    'Sauces', //Van Vehicle
    // Hair Care & Cosmetics Categories
    'Shampoos & Cleansers', //light Vehicle
    'Conditioners & Treatments', //light Vehicle
    'Relaxers & Perm Kits', //light Vehicle
    'Hair Styling Products', //light Vehicle
    'Hair Food & Oils', //light Vehicle
    'Hair Coloring' //light Vehicle
];
const HomePage = () => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(true);
    const [search, setSearch] = useState('');
    // New states for category UI
    const [showCategories, setShowCategories] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    // New: Products state (keep your existing fetch logic)
    const [products, setProducts] = useState([]);
    // Add this import at the top with your other imports
    const [productRequest, setProductRequest] = useState('');
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null);
    // access global loading setter from context
    const { setLoading: setGlobalLoading } = useContext(LoadingContext);
    // Create a ref for the products section
    const productsSectionRef = useRef(null);
    // Get location from router
    const location = useLocation();
    // Scroll restoration
    useLayoutEffect(() => {
        // Scroll to top when component mounts or location changes
        window.scrollTo(0, 0);
    }, [location.pathname]);
    useEffect(() => {
        setGlobalLoading(loading || productsLoading);
    }, [loading, productsLoading, setGlobalLoading]);
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const auth = getAuth(app);
            const user = auth.currentUser;
            if (user) {
                const token = await user.getIdToken();
                try {
                    const { data } = await axios.get(`${API_URL}/api/users/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const userData = data;
                    setName(userData.full_name || userData.email || '');
                }
                catch {
                    setName(user.email || '');
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);
    // New: Fetch products from backend
    useEffect(() => {
        const fetchProducts = async () => {
            setProductsLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/api/products`);
                setProducts(data);
            }
            catch {
                setProducts([]);
            }
            setProductsLoading(false);
        };
        fetchProducts();
    }, []);
    // filter products by search and selectedCategory
    const filteredProducts = (Array.isArray(products) ? products : []).filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(search.toLowerCase());
        const categoryMatch = (p.category || '').toLowerCase().includes(search.toLowerCase());
        const searchMatch = search ? (nameMatch || categoryMatch) : true;
        const categoryFilter = selectedCategory ? (p.category || '').toLowerCase() === selectedCategory.toLowerCase() : true;
        return searchMatch && categoryFilter;
    });
    // group products by category for rendering
    const groupedProducts = filteredProducts.reduce((acc, prod) => {
        const cat = (prod.category && prod.category.trim()) || 'Uncategorized';
        if (!acc[cat])
            acc[cat] = [];
        acc[cat].push(prod);
        return acc;
    }, {});
    // listen for appnav toggle event
    useEffect(() => {
        const handleToggle = () => setShowCategories(prev => !prev);
        window.addEventListener('toggleCategories', handleToggle);
        return () => window.removeEventListener('toggleCategories', handleToggle);
    }, []);
    // Create a function to handle category selection and scrolling
    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setShowCategories(false);
        // Scroll to products section with a small delay to allow filtering to complete
        setTimeout(() => {
            productsSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    };
    // Add this function to handle product requests
    const handleProductRequest = async (e) => {
        e.preventDefault();
        if (!productRequest.trim()) {
            setRequestStatus({
                success: false,
                message: 'Please enter a product name or description'
            });
            return;
        }
        setRequestSubmitting(true);
        setRequestStatus(null);
        try {
            await axios.post(`${API_URL}/api/product-requests`, {
                productName: productRequest,
                email: name.includes('@') ? name : undefined, // Use email if available
                timestamp: new Date().toISOString(),
                emailTo: 'admin@locals-za.co.za'
            });
            setRequestStatus({
                success: true,
                message: 'Thank you! We\'ve received your product request.'
            });
            setProductRequest(''); // Clear the input
            // Reset status message after 5 seconds
            setTimeout(() => {
                setRequestStatus(null);
            }, 5000);
        }
        catch (error) {
            setRequestStatus({
                success: false,
                message: 'Failed to submit request. Please try again later.'
            });
        }
        finally {
            setRequestSubmitting(false);
        }
    };
    // Conditional rendering for the products loading state
    if (loading || productsLoading) {
        return (_jsxs("div", { className: 'loading-container', children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), "Loading..."] }));
    }
    return (_jsx(_Fragment, { children: _jsxs("div", { className: 'homepage-container', children: [_jsxs("div", { className: "homepage-searchbar", children: [_jsx("input", { type: "text", placeholder: "Search products...", value: search, onChange: e => setSearch(e.target.value), className: "homepage-search-input" }), _jsx("div", { className: "homepage-category-toggle-wrapper", children: _jsxs("button", { type: "button", className: "homepage-category-toggle", onClick: () => setShowCategories(prev => !prev), "aria-expanded": showCategories, children: [_jsx("img", { className: 'category-icon-home', src: "https://img.icons8.com/ios/40/ffb803/sorting-answers.png", alt: "categories" }), "Category ", selectedCategory ? `: ${selectedCategory}` : ''] }) }), _jsx("div", { className: `homepage-category-dropdown${showCategories ? ' open' : ''}`, "aria-hidden": !showCategories, children: _jsxs("ul", { children: [_jsx("li", { className: "homepage-category-item", onClick: () => handleCategorySelect(''), children: "All Categories" }), productCategories.map(cat => (_jsx("li", { className: "homepage-category-item", onClick: () => handleCategorySelect(cat), children: cat }, cat)))] }) })] }), _jsxs("div", { className: "homepage-welcome", children: [_jsx("img", { src: AppBanner, alt: "App banner", className: "homepage-appbanner" }), _jsxs("h2", { className: 'user-welcome-text', children: ["Welcome", name ? `, ${name}` : '', "!"] }), _jsxs("div", { className: 'categories-suggestions', children: [_jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Beverages'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: Beverages, alt: "Beverages" }) }), _jsx("span", { className: "category-label", children: "Beverages" })] }), _jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Maize Meal'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: Maize, alt: "Maize Meal" }) }), _jsx("span", { className: "category-label", children: "Maize Meal" })] }), _jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Rice'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: rice, alt: "Rice" }) }), _jsx("span", { className: "category-label", children: "Rice" })] }), _jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Canned Foods'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: CannedFood, alt: "Canned Foods" }) }), _jsx("span", { className: "category-label", children: "Canned Foods" })] }), _jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Sugar'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: Sugar, alt: "Sugar" }) }), _jsx("span", { className: "category-label", children: "Sugar" })] }), _jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Cooking Oils & Fats'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: Oil, alt: "Cooking Oils & Fats" }) }), _jsx("span", { className: "category-label", children: "Cooking Oils & Fats" })] }), _jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Shampoos & Cleansers'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: shampoosCleansers, alt: "Shampoos & Cleansers" }) }), _jsx("span", { className: "category-label", children: "Shampoos" })] }), _jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Conditioners & Treatments'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: ConditionersTreatments, alt: "Conditioners & Treatments" }) }), _jsx("span", { className: "category-label", children: "Conditioners" })] }), _jsxs("div", { className: "category-item", onClick: () => handleCategorySelect('Relaxers & Perm Kits'), children: [_jsx("div", { className: "suggestion-icon", children: _jsx("img", { className: "category-image", src: RelaxersPermKits, alt: "Relaxers & Perm Kits" }) }), _jsx("span", { className: "category-label", children: "Relaxers" })] })] })] }), _jsx("div", { className: 'products-section', ref: productsSectionRef, children: productsLoading ? (_jsx("div", { children: "Loading products..." })) : Object.keys(groupedProducts).length === 0 ? (_jsx("p", { children: "No products found." })) : (_jsx(_Fragment, { children: Object.keys(groupedProducts).map(category => (_jsxs("section", { className: "products-category-group", children: [_jsx("h4", { className: "products-category-title", children: category }), (() => {
                                    const productsInCategory = groupedProducts[category] || [];
                                    const brandGroups = {};
                                    productsInCategory.forEach((p) => {
                                        const brand = (p.brand && p.brand.trim()) || 'Other';
                                        if (!brandGroups[brand])
                                            brandGroups[brand] = [];
                                        brandGroups[brand].push(p);
                                    });
                                    // Sort brand names alphabetically (case-insensitive)
                                    const sortedBrands = Object.keys(brandGroups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                                    return (_jsx("div", { className: "category-brands", children: sortedBrands.map(brand => {
                                            const productsForBrand = brandGroups[brand].slice().sort((x, y) => (x.name || '').toLowerCase().localeCompare((y.name || '').toLowerCase()));
                                            return (_jsxs("div", { className: "brand-group", children: [_jsx("h5", { className: "brand-title", children: brand }), _jsx("ul", { className: 'products-list', children: productsForBrand.map((product) => (_jsx("li", { className: 'products-list-item', children: _jsx(ProductCard, { product: product }) }, product.id))) })] }, brand));
                                        }) }));
                                })()] }, category))) })) }), _jsxs("div", { className: "product-request-section", children: [_jsx("h3", { className: "request-title", children: "Can't find what you're looking for?" }), _jsx("p", { className: "request-subtitle", children: "Let us know and we'll try to add it to our inventory" }), _jsxs("form", { onSubmit: handleProductRequest, className: "request-form", children: [_jsxs("div", { className: "request-input-group", children: [_jsx("input", { type: "text", value: productRequest, onChange: (e) => setProductRequest(e.target.value), placeholder: "Tell us what product you need...", disabled: requestSubmitting, className: "request-input" }), _jsx("button", { type: "submit", className: "request-button", disabled: requestSubmitting, children: requestSubmitting ? 'Sending...' : 'Send' })] }), requestStatus && (_jsx("div", { className: `request-status ${requestStatus.success ? 'success' : 'error'}`, children: requestStatus.message }))] })] })] }) }));
};
export default HomePage;
