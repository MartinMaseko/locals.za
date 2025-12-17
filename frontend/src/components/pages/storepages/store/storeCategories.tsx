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
import HairColoring from '../../../assets/images/HairColour.webp';
import HairFoodOils from '../../../assets/images/HairFood.webp';
import HairStylingProducts from '../../../assets/images/HairStyling.webp';
import PersonalCare from '../../../assets/images/PersonalCare.webp';
import RelaxersPermKits from '../../../assets/images/Relaxers.webp';
import shampoosCleansers from '../../../assets/images/Shampoo.webp';
import SnacksConfectionery from '../../../assets/images/Snacks.webp';
import ConditionersTreatments from '../../../assets/images/ConditionerTreatments.webp';
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
  'Canned Foods',
  'Sugar',
  'Flour',
  'Cooking Oils & Fats',
  'Rice',
  'Maize Meal',
  'Snacks & Confectionery',
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
const categoryImages: {[key: string]: string} = {
  'Beverages': Beverages,
  'Canned Foods': CannedFoods,
  'Sugar': SugarImage,
  'Flour': FlourImage,
  'Cooking Oils & Fats': CookingOils,
  'Rice': RiceImage,
  'Maize Meal': MaizeMealImage,
  'Snacks & Confectionery': SnacksConfectionery,
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
const categoryDisplayNames: {[key: string]: string} = {
  'Beverages': 'Beverages',
  'Groceries & Pantry': 'Groceries',
  'Canned Foods': 'Canned Foods',
  'Sugar': 'Sugar',
  'Flour': 'Flour',
  'Cooking Oils & Fats': 'Cooking Oils',
  'Rice': 'Rice',
  'Maize Meal': 'Maize Meal',
  'Snacks & Confectionery': 'Snacks',
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

const StoreCategories: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const productsSectionRef = useRef<HTMLDivElement>(null);
  
  // New filter states
  type PriceRange = { label: string; min: number; max: number };
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRange>(priceRanges[0] as PriceRange);
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
        const { data } = await axios.get<any[]>(`${API_URL}/api/products`);
        const productsData = Array.isArray(data) ? data : [];
        setProducts(productsData);
        
        // Extract unique brands from products
        const brands = productsData
          .map(p => p.brand)
          .filter((brand): brand is string => !!brand)
          .filter((brand, index, self) => self.indexOf(brand) === index)
          .sort();
          
        setAvailableBrands(brands);
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Handle brand selection
  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand)
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
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
  const groupedProducts = filteredProducts.reduce((acc: Record<string, any[]>, prod) => {
    const cat = (prod.category && prod.category.trim()) || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(prod);
    return acc;
  }, {});

  // Handle category selection
  const handleCategorySelect = (category: string) => {
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
    return (
      <div className='loading-container'>
        <img src={LogoAnime} alt="Loading..." className="loading-gif" />
        Loading categories...
      </div>
    );
  }

  return (
    <div className="store-categories-container">
      <div className="categories-header">
        <h1>Browse by Category</h1>
        <p>Select a category to see products</p>
      </div>

      {/* Categories grid (image + name) */}
      <div className="categories-grid">
        {productCategories.map(cat => (
          <button key={cat} className="category-tile" onClick={() => handleCategorySelect(cat)}>
            {categoryImages[cat] ? (
              <img src={categoryImages[cat]} alt={categoryDisplayNames[cat] || cat} className="category-image" />
            ) : null}
            <div className="category-name">{categoryDisplayNames[cat] || cat}</div>
          </button>
        ))}
      </div>

      {/* Search and Filters Section */}
      <div className="search-filter-container">
        {/* Search bar */}
        <div className="store-search">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        {/* Filter Toggle Button */}
        <button 
          className="filter-toggle-button"
          onClick={toggleFilters}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'} 
          <img 
            width="20" 
            height="20" 
            src={`https://img.icons8.com/ios-filled/50/${showFilters ? 'ffffff' : 'FFB803'}/filter--v1.png`} 
            alt="filter"
          />
        </button>
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-header">
              <h3>Filter Products</h3>
              <button className="clear-filters-btn" onClick={clearFilters}>Clear All</button>
            </div>
            
            {/* Brand Filter */}
            <div className="filter-section">
              <h4>Brands</h4>
              <div className="brands-grid">
                {availableBrands.map(brand => (
                  <label key={brand} className="brand-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandToggle(brand)}
                    />
                    <span className="brand-name">{brand}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Price Range Filter */}
            <div className="filter-section">
              <h4>Price Range</h4>
              <div className="price-ranges">
                {priceRanges.map((range, index) => (
                  <label key={index} className="price-range-option">
                    <input
                      type="radio"
                      name="priceRange"
                      checked={priceRange.min === range.min && priceRange.max === range.max}
                      onChange={() => setPriceRange(range)}
                    />
                    <span>{range.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(selectedBrands.length > 0 || priceRange.max !== Infinity || priceRange.min > 0) && (
              <div className="active-filters">
                <h4>Active Filters:</h4>
                <div className="filter-tags">
                  {selectedBrands.map(brand => (
                    <span key={brand} className="filter-tag">
                      {brand}
                      <button onClick={() => handleBrandToggle(brand)}>×</button>
                    </span>
                  ))}
                  
                  {(priceRange.max !== Infinity || priceRange.min > 0) && 
                   priceRange !== priceRanges[0] && (
                    <span className="filter-tag">
                      {priceRange.label}
                      <button onClick={() => setPriceRange(priceRanges[0])}>×</button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Products Section */}
      <div className="category-products-section" ref={productsSectionRef}>
        <h2 className="category-products-section-title">
          {selectedCategory || (search ? `Search Results: "${search}"` : 'All Products')}
          <span className="product-count">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
          </span>
        </h2>

        {Object.keys(groupedProducts).length === 0 ? (
          <div className="no-products">
            <p>No products found matching your filters.</p>
            <button 
              className="view-all-button"
              onClick={() => {
                handleCategorySelect('');
                clearFilters();
                setSearch('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {Object.keys(groupedProducts).map(category => (
              <section key={category} className="category-products-category-group">
                <h3 className="category-products-category-title">{category}</h3>
                
                {/* Group products by brand within this category */}
                {(() => {
                  const productsInCategory = groupedProducts[category] || [];
                  const brandGroups: Record<string, any[]> = {};

                  productsInCategory.forEach((p: any) => {
                    const brand = (p.brand && p.brand.trim()) || 'Other';
                    if (!brandGroups[brand]) brandGroups[brand] = [];
                    brandGroups[brand].push(p);
                  });

                  const sortedBrands = Object.keys(brandGroups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

                  return (
                    <div className="category-brands">
                      {sortedBrands.map(brand => {
                        const productsForBrand = brandGroups[brand].slice().sort((x, y) => (x.name || '').toLowerCase().localeCompare((y.name || '').toLowerCase()));
                        return (
                          <div key={brand} className="brand-group">
                            <h4 className="brand-title">{brand}</h4>
                            <ul className="category-products-list">
                              {productsForBrand.map((product: any) => (
                                <li key={product.id} className="category-products-list-item">
                                  <ProductCard product={product} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default StoreCategories;
