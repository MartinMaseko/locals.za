import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './storeCategoriesStyling.css';
import ProductCard from '../productview/productsCard';
import LoadingContext from '../LoadingContext';
import { useContext } from 'react';
import LogoAnime from '../../../assets/logos/locals-svg.gif';
const API_URL = import.meta.env.VITE_API_URL;
// Category images
import Beverages from '../../../assets/images/Beverages.webp';
import GroceriesPantry from '../../../assets/images/Groceries.webp';
import HairColoring from '../../../assets/images/HairColour.webp';
import HairFoodOils from '../../../assets/images/HairFood.webp';
import HairStylingProducts from '../../../assets/images/HairStyling.webp';
import HouseholdCleaningGoods from '../../../assets/images/HouseholdCleaning.webp';
import PersonalCare from '../../../assets/images/PersonalCare.webp';
import RelaxersPermKits from '../../../assets/images/Relaxers.webp';
import shampoosCleansers from '../../../assets/images/Shampoo.webp';
import SnacksConfectionery from '../../../assets/images/Snacks.webp';
import ConditionersTreatments from '../../../assets/images/ConditionerTreatments.webp';
import SpicesSeasoning from '../../../assets/images/spices.webp';
import CannedFoods from '../../../assets/images/canned.webp';
import SugarImage from '../../../assets/images/sugar.webp';
import FlourImage from '../../../assets/images/flour.webp';
import CookingOils from '../../../assets/images/oil.webp';
import RiceImage from '../../../assets/images/rice.webp';
import MaizeMealImage from '../../../assets/images/maize.webp';
import LaundrySuppliesImage from '../../../assets/images/laundry.webp';
import FoodPackaging from '../../../assets/images/FoodPackaging.webp';
import Sauces from '../../../assets/images/sauces.webp';
// Category definitions
const productCategories = [
    // Fast-Moving Consumer Goods (FMCG) Categories
    'Beverages',
    'Groceries & Pantry',
    'Spices & Seasoning',
    'Canned Foods',
    'Sugar',
    'Flour',
    'Cooking Oils & Fats',
    'Rice',
    'Maize Meal',
    'Snacks & Confectionery',
    'Household Cleaning & Goods',
    'Laundry Supplies',
    'Personal Care',
    'Food Packaging',
    'Sauces',
    // Hair Care & Cosmetics Categories
    'Shampoos & Cleansers',
    'Conditioners & Treatments',
    'Relaxers & Perm Kits',
    'Hair Styling Products',
    'Hair Food & Oils',
    'Hair Coloring'
];
// Map for category images
const categoryImages = {
    'Beverages': Beverages,
    'Groceries & Pantry': GroceriesPantry,
    'Spices & Seasoning': SpicesSeasoning,
    'Canned Foods': CannedFoods,
    'Sugar': SugarImage,
    'Flour': FlourImage,
    'Cooking Oils & Fats': CookingOils,
    'Rice': RiceImage,
    'Maize Meal': MaizeMealImage,
    'Snacks & Confectionery': SnacksConfectionery,
    'Household Cleaning & Goods': HouseholdCleaningGoods,
    'Laundry Supplies': LaundrySuppliesImage,
    'Personal Care': PersonalCare,
    'Shampoos & Cleansers': shampoosCleansers,
    'Conditioners & Treatments': ConditionersTreatments,
    'Relaxers & Perm Kits': RelaxersPermKits,
    'Hair Styling Products': HairStylingProducts,
    'Hair Food & Oils': HairFoodOils,
    'Hair Coloring': HairColoring,
    'Food Packaging': FoodPackaging,
    'Sauces': Sauces
};
// Display names
const categoryDisplayNames = {
    'Beverages': 'Beverages',
    'Groceries & Pantry': 'Groceries',
    'Spices & Seasoning': 'Spices',
    'Canned Foods': 'Canned Foods',
    'Sugar': 'Sugar',
    'Flour': 'Flour',
    'Cooking Oils & Fats': 'Cooking Oils',
    'Rice': 'Rice',
    'Maize Meal': 'Maize Meal',
    'Snacks & Confectionery': 'Snacks',
    'Household Cleaning & Goods': 'Household',
    'Laundry Supplies': 'Laundry',
    'Personal Care': 'Personal Care',
    'Shampoos & Cleansers': 'Shampoos',
    'Conditioners & Treatments': 'Conditioners',
    'Relaxers & Perm Kits': 'Relaxers',
    'Hair Styling Products': 'Hair Styling',
    'Hair Food & Oils': 'Hair Food',
    'Hair Coloring': 'Hair Color',
    'Food Packaging': 'Food Packaging',
    'Sauces': 'Sauces'
};
// Price range options
const priceRanges = [
    { label: 'All Prices', min: 0, max: Infinity },
    { label: 'Under R50', min: 0, max: 50 },
    { label: 'R50 - R100', min: 50, max: 100 },
    { label: 'R100 - R200', min: 100, max: 200 },
    { label: 'R200 - R500', min: 200, max: 500 },
    { label: 'Over R500', min: 500, max: Infinity }
];
const StoreCategories = () => {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const productsSectionRef = useRef(null);
    const [availableBrands, setAvailableBrands] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [priceRange, setPriceRange] = useState(priceRanges[0]);
    const [showFilters, setShowFilters] = useState(false);
    // Get global loading state from context
    const { setLoading: setGlobalLoading } = useContext(LoadingContext);
    // Update loading state in context
    useEffect(() => {
        setGlobalLoading(loading);
        return () => setGlobalLoading(false);
    }, [loading, setGlobalLoading]);
    // Fetch products when component mounts
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/api/api/products`);
                const productsData = Array.isArray(data) ? data : [];
                setProducts(productsData);
                // Extract unique brands from products
                const brands = productsData
                    .map(p => p.brand)
                    .filter((brand) => !!brand)
                    .filter((brand, index, self) => self.indexOf(brand) === index)
                    .sort();
                setAvailableBrands(brands);
            }
            catch (error) {
                console.error('Error fetching products:', error);
                setProducts([]);
            }
            finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);
    // Handle brand selection
    const handleBrandToggle = (brand) => {
        setSelectedBrands(prev => prev.includes(brand)
            ? prev.filter(b => b !== brand)
            : [...prev, brand]);
    };
    // Clear all filters
    const clearFilters = () => {
        setSelectedBrands([]);
        setPriceRange(priceRanges[0]);
    };
    // Filter products by search, category, brand and price
    const filteredProducts = products.filter(p => {
        // Search filter
        const nameMatch = (p.name || '').toLowerCase().includes(search.toLowerCase());
        const categoryMatch = (p.category || '').toLowerCase().includes(search.toLowerCase());
        const searchMatch = search ? (nameMatch || categoryMatch) : true;
        // Category filter
        const categoryFilter = selectedCategory ?
            (p.category || '').toLowerCase() === selectedCategory.toLowerCase() : true;
        // Brand filter
        const brandFilter = selectedBrands.length > 0 ?
            selectedBrands.includes(p.brand) : true;
        // Price filter
        const price = typeof p.price === 'number' ? p.price :
            typeof p.price === 'string' ? parseFloat(p.price) : 0;
        const priceFilter = price >= priceRange.min && price <= priceRange.max;
        return searchMatch && categoryFilter && brandFilter && priceFilter;
    });
    // Group products by category for rendering
    const groupedProducts = filteredProducts.reduce((acc, prod) => {
        const cat = (prod.category && prod.category.trim()) || 'Uncategorized';
        if (!acc[cat])
            acc[cat] = [];
        acc[cat].push(prod);
        return acc;
    }, {});
    // Handle category selection
    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        // Scroll to products section
        setTimeout(() => {
            productsSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    };
    // Toggle filters visibility
    const toggleFilters = () => {
        setShowFilters(prev => !prev);
    };
    if (loading) {
        return (_jsxs("div", { className: 'loading-container', children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), "Loading categories..."] }));
    }
    return (_jsxs("div", { className: "store-categories-container", children: [_jsxs("div", { className: "categories-header", children: [_jsx("h1", { children: "Browse by Category" }), _jsx("p", { children: "Select a category to see products" })] }), _jsx("div", { className: "categories-grid", children: productCategories.map(cat => (_jsxs("button", { className: "category-tile", onClick: () => handleCategorySelect(cat), children: [categoryImages[cat] ? (_jsx("img", { src: categoryImages[cat], alt: categoryDisplayNames[cat] || cat, className: "category-image" })) : null, _jsx("div", { className: "category-name", children: categoryDisplayNames[cat] || cat })] }, cat))) }), _jsxs("div", { className: "search-filter-container", children: [_jsx("div", { className: "store-search", children: _jsx("input", { type: "text", placeholder: "Search products...", value: search, onChange: e => setSearch(e.target.value) }) }), _jsxs("button", { className: "filter-toggle-button", onClick: toggleFilters, children: [showFilters ? 'Hide Filters' : 'Show Filters', _jsx("img", { width: "20", height: "20", src: `https://img.icons8.com/ios-filled/50/${showFilters ? 'ffffff' : 'FFB803'}/filter--v1.png`, alt: "filter" })] }), showFilters && (_jsxs("div", { className: "filters-panel", children: [_jsxs("div", { className: "filters-header", children: [_jsx("h3", { children: "Filter Products" }), _jsx("button", { className: "clear-filters-btn", onClick: clearFilters, children: "Clear All" })] }), _jsxs("div", { className: "filter-section", children: [_jsx("h4", { children: "Brands" }), _jsx("div", { className: "brands-grid", children: availableBrands.map(brand => (_jsxs("label", { className: "brand-checkbox", children: [_jsx("input", { type: "checkbox", checked: selectedBrands.includes(brand), onChange: () => handleBrandToggle(brand) }), _jsx("span", { className: "brand-name", children: brand })] }, brand))) })] }), _jsxs("div", { className: "filter-section", children: [_jsx("h4", { children: "Price Range" }), _jsx("div", { className: "price-ranges", children: priceRanges.map((range, index) => (_jsxs("label", { className: "price-range-option", children: [_jsx("input", { type: "radio", name: "priceRange", checked: priceRange.min === range.min && priceRange.max === range.max, onChange: () => setPriceRange(range) }), _jsx("span", { children: range.label })] }, index))) })] }), (selectedBrands.length > 0 || priceRange.max !== Infinity || priceRange.min > 0) && (_jsxs("div", { className: "active-filters", children: [_jsx("h4", { children: "Active Filters:" }), _jsxs("div", { className: "filter-tags", children: [selectedBrands.map(brand => (_jsxs("span", { className: "filter-tag", children: [brand, _jsx("button", { onClick: () => handleBrandToggle(brand), children: "\u00D7" })] }, brand))), (priceRange.max !== Infinity || priceRange.min > 0) &&
                                                priceRange !== priceRanges[0] && (_jsxs("span", { className: "filter-tag", children: [priceRange.label, _jsx("button", { onClick: () => setPriceRange(priceRanges[0]), children: "\u00D7" })] }))] })] }))] }))] }), _jsxs("div", { className: "category-products-section", ref: productsSectionRef, children: [_jsxs("h2", { className: "category-products-section-title", children: [selectedCategory || (search ? `Search Results: "${search}"` : 'All Products'), _jsxs("span", { className: "product-count", children: [filteredProducts.length, " ", filteredProducts.length === 1 ? 'product' : 'products', " found"] })] }), Object.keys(groupedProducts).length === 0 ? (_jsxs("div", { className: "no-products", children: [_jsx("p", { children: "No products found matching your filters." }), _jsx("button", { className: "view-all-button", onClick: () => {
                                    handleCategorySelect('');
                                    clearFilters();
                                    setSearch('');
                                }, children: "Reset Filters" })] })) : (_jsx(_Fragment, { children: Object.keys(groupedProducts).map(category => (_jsxs("section", { className: "category-products-category-group", children: [_jsx("h3", { className: "category-products-category-title", children: category }), (() => {
                                    const productsInCategory = groupedProducts[category] || [];
                                    const brandGroups = {};
                                    productsInCategory.forEach((p) => {
                                        const brand = (p.brand && p.brand.trim()) || 'Other';
                                        if (!brandGroups[brand])
                                            brandGroups[brand] = [];
                                        brandGroups[brand].push(p);
                                    });
                                    const sortedBrands = Object.keys(brandGroups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                                    return (_jsx("div", { className: "category-brands", children: sortedBrands.map(brand => {
                                            const productsForBrand = brandGroups[brand].slice().sort((x, y) => (x.name || '').toLowerCase().localeCompare((y.name || '').toLowerCase()));
                                            return (_jsxs("div", { className: "brand-group", children: [_jsx("h4", { className: "brand-title", children: brand }), _jsx("ul", { className: "category-products-list", children: productsForBrand.map((product) => (_jsx("li", { className: "category-products-list-item", children: _jsx(ProductCard, { product: product }) }, product.id))) })] }, brand));
                                        }) }));
                                })()] }, category))) }))] })] }));
};
export default StoreCategories;
