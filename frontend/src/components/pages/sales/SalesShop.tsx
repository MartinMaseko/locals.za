import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './salesStyles.css';
import '../storepages/store/storeCategoriesStyling.css';

const API_URL = import.meta.env.VITE_API_URL;

// Define all possible categories to ensure they all appear in dropdown
const ALL_CATEGORIES = [
  'Beverages',
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
  'Shampoos & Cleansers',
  'Conditioners & Treatments',
  'Relaxers & Perm Kits',
  'Hair Styling Products',
  'Hair Food & Oils',
  'Hair Coloring',
  'Spices & Seasoning'
];

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  image?: string;
  category: string;
  stock?: number;   
  description?: string;
  brand?: string;   
}

const SalesShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<any[]>([]);
  const [salesRepInfo, setSalesRepInfo] = useState<{ id: string; username: string } | null>(null);
  // Add state for dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Load sales rep info from localStorage
    const salesRepId = localStorage.getItem('salesRepId');
    const salesRepUsername = localStorage.getItem('salesRepUsername');
    
    if (salesRepId && salesRepUsername) {
      setSalesRepInfo({ id: salesRepId, username: salesRepUsername });
    }

    fetchProducts();
    loadCart();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('salesRepCart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart: any[]) => {
    // Add sales rep info to cart for tracking
    const cartWithSalesRep = {
      items: newCart,
      salesRepId: salesRepInfo?.id,
      salesRepUsername: salesRepInfo?.username,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('salesRepCart', JSON.stringify(cartWithSalesRep.items));
    localStorage.setItem('salesRepCartInfo', JSON.stringify(cartWithSalesRep));
    setCart(newCart);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<Product[]>(`${API_URL}/api/products`);
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Add error state handling
      setProducts([]);
      setFilteredProducts([]);
    }
    setLoading(false);
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const handleAddToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id
          ? { ...item, qty: item.qty + 1 }
          : item
      );
    } else {
      newCart = [
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image_url || product.image, // Handle both field names
          qty: 1
        }
      ];
    }
    
    saveCart(newCart);
  };

  const categories = ['All', ...Array.from(new Set([
    ...products.map(p => p.category).filter(Boolean),
    ...ALL_CATEGORIES
  ])).sort()];
  
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${(numAmount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="buyer-dashboard">
        <div className="buyer-section">
          <p className="loading-message">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-dashboard">
      <div className="sales-section">
        <div className="sales-shop-header">
          <div className="sales-shop-info">
            <h2>Shop for Customers</h2>
            <p className="sales-shop-subtitle">
              Browse products and create shared carts for your customers
            </p>
            {salesRepInfo && (
              <p className="sales-rep-info">
                Shopping as: <strong>{salesRepInfo.username}</strong>
              </p>
            )}
          </div>
          
          {cart.length > 0 && (
            <button
              onClick={() => navigate('/sales/cart')}
              className="cart-button"
            >
              🛒 View Cart ({cart.length})
            </button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="search-filter-section">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-shop"
          />
          <div className="sales-category-select-container" ref={dropdownRef}>
            <button
              type="button"
              className="sales-category-toggle"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>Category {selectedCategory !== 'All' ? `: ${selectedCategory}` : ''}</span>
              <span className={`sales-category-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
            </button>
            
            <div className={`sales-category-dropdown${isDropdownOpen ? ' open' : ''}`}>
              <ul>
                {categories.map(cat => (
                  <li
                    key={cat}
                    className={`sales-category-item ${cat === selectedCategory ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <p className="no-products-message">
            No products found
          </p>
        ) : (
          <div className="sales-products-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="sales-product-card"
              >
                <div className="sales-product-image-container">
                  <img
                    src={product.image_url || product.image} // Handle both field names
                    alt={product.name}
                    className="sales-product-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/250x200?text=No+Image';
                    }}
                  />
                </div>
                
                <div className="sales-product-details">
                  <h3 className="sales-product-name">
                    {product.name}
                  </h3>
                  
                  <p className="sales-product-category">
                    {product.category}
                  </p>
                  
                  <div className="sales-product-footer">
                    <span className="sales-product-price">
                      {formatCurrency(product.price)}
                    </span>
                    
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="sales-add-to-cart-btn"
                    >
                      Add to Cart
                    </button>
                  </div>
                  
                  <p className="sales-product-stock">
                    {product.stock !== undefined ? `${product.stock} in stock` : 'Stock info unavailable'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesShop;