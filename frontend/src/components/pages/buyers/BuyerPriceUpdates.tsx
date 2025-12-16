import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import './buyerStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  brand?: string;
  category?: string;
  description?: string;
}

interface PriceUpdate {
  productId: string;
  newCostPrice: number;
  finalPrice: number;
}

const BuyerPriceUpdates = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceUpdates, setPriceUpdates] = useState<{ [key: string]: PriceUpdate }>({});
  const [updating, setUpdating] = useState<{ [key: string]: boolean }>({});
  const [categories, setCategories] = useState<string[]>([]);
  
  const auth = getAuth(app);
  const MARKUP_PERCENTAGE = 2.5; // 2.5% markup

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, categoryFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (Array.isArray(response.data)) {
        const sortedProducts = response.data.sort((a, b) => 
          a.name?.localeCompare(b.name) || 0
        );
        setProducts(sortedProducts);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(
          response.data
            .map((p: Product) => p.category)
            .filter(Boolean)
        )];
        setCategories(uniqueCategories);
      } else {
        setProducts([]);
      }
    } catch (error) {
      setError('Failed to load products');
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const handlePriceChange = (productId: string, newCostPrice: string) => {
    const costPrice = parseFloat(newCostPrice) || 0;
    const finalPrice = costPrice * (1 + MARKUP_PERCENTAGE / 100);
    
    setPriceUpdates(prev => ({
      ...prev,
      [productId]: {
        productId,
        newCostPrice: costPrice,
        finalPrice: Math.round(finalPrice * 100) / 100 // Round to 2 decimal places
      }
    }));
  };

  const updateProductPrice = async (productId: string) => {
    const update = priceUpdates[productId];
    if (!update || update.newCostPrice <= 0) {
      setError('Please enter a valid cost price');
      return;
    }

    try {
      setUpdating(prev => ({ ...prev, [productId]: true }));
      setError('');
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await axios.put(
        `${API_URL}/api/products/${productId}`,
        { price: update.finalPrice },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, price: update.finalPrice }
          : product
      ));

      // Clear the price update for this product
      setPriceUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[productId];
        return newUpdates;
      });

      setSuccess(`Price updated successfully for ${products.find(p => p.id === productId)?.name}`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      setError('Failed to update price');
      console.error('Error updating price:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="buyer-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard">
      <div className="buyer-stats-cards">
        <div className="buyer-section">
          <h2>Price Updates</h2>
          
          <div className="search-container">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="price-updates-container">
            {filteredProducts.length === 0 ? (
              <div className="no-orders-message">
                <p>No products found.</p>
              </div>
            ) : (
              <div className="price-updates-grid">
                {filteredProducts.map((product) => {
                  const update = priceUpdates[product.id];
                  const isUpdating = updating[product.id];
                  
                  return (
                    <div key={product.id} className="price-update-item">
                      <div className="product-price-info">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="product-price-image"
                          />
                        )}
                        <div className="product-price-details">
                          <div className="product-price-name">{product.name}</div>
                          <div className="current-price">
                            Current Price: R{product.price?.toFixed(2) || '0.00'}
                          </div>
                          {product.brand && (
                            <div className="current-price">
                              Brand: {product.brand}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="price-input-container">
                        <div className="price-input-group">
                          <label htmlFor={`price-${product.id}`}>
                            New Cost Price (R)
                          </label>
                          <input
                            id={`price-${product.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter cost price"
                            value={update?.newCostPrice || ''}
                            onChange={(e) => handlePriceChange(product.id, e.target.value)}
                            className="price-input"
                          />
                        </div>
                        
                        {update && update.newCostPrice > 0 && (
                          <div className="price-preview">
                            Final Price (with {MARKUP_PERCENTAGE}% markup): R{update.finalPrice.toFixed(2)}
                          </div>
                        )}
                        
                        <button
                          onClick={() => updateProductPrice(product.id)}
                          disabled={!update || update.newCostPrice <= 0 || isUpdating}
                          className="update-price-btn"
                        >
                          {isUpdating ? 'Updating...' : 'Update Price'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerPriceUpdates;