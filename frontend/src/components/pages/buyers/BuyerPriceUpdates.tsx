import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import './buyerStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

// Profit markup percentage
const PROFIT_MARKUP = 0.025; // 2.5%

interface Product {
  id: string;
  product_id?: string;
  name: string;
  price: number | string;
  image_url?: string;
  brand?: string;
  category?: string;
}

const BuyerPriceUpdates = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [newPrices, setNewPrices] = useState<{ [key: string]: string }>({});
  const auth = getAuth(app);

  useEffect(() => {
    fetchProducts();
  }, []);

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required');
    return await user.getIdToken(true);
  };

  // Helper function to safely convert price to number
  const getPrice = (price: number | string | undefined): number => {
    if (price === undefined || price === null) return 0;
    const parsed = parseFloat(String(price));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calculate price with 2.5% markup
  const calculatePriceWithMarkup = (basePrice: number): number => {
    const markupAmount = basePrice * PROFIT_MARKUP;
    return basePrice + markupAmount;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const token = await getToken();
      const { data } = await axios.get(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (Array.isArray(data)) {
        // Normalize prices to numbers
        const normalizedProducts = data.map(p => ({
          ...p,
          price: getPrice(p.price)
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setProducts(normalizedProducts);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePriceChange = (productId: string, newPrice: string) => {
    setNewPrices(prev => ({ ...prev, [productId]: newPrice }));
  };

  const handleUpdatePrice = async (productId: string) => {
    try {
      setError('');
      setSuccess('');
      setUpdatingProductId(productId);

      // Find the product to get current values
      const productToUpdate = products.find(p => p.id === productId || p.product_id === productId);
      if (!productToUpdate) {
        setError('Product not found');
        setUpdatingProductId(null);
        return;
      }

      // Parse and validate new price
      let inputPrice = parseFloat(newPrices[productId]);
      if (isNaN(inputPrice) || inputPrice <= 0) {
        setError('Please enter a valid price greater than 0');
        setUpdatingProductId(null);
        return;
      }

      // Add 2.5% profit markup
      const newPrice = calculatePriceWithMarkup(inputPrice);

      const token = await getToken();
      const docId = productToUpdate.id || productToUpdate.product_id;

      if (!docId) {
        setError('Missing product ID');
        setUpdatingProductId(null);
        return;
      }

      // Create clean payload with all required fields (same as admin dashboard)
      const payload = {
        name: productToUpdate.name?.trim() || '',
        price: newPrice, // ← Price with 2.5% markup applied
        brand: productToUpdate.brand?.trim() || '',
        category: productToUpdate.category?.trim() || '',
        description: '', // Include description to match admin structure
        image_url: productToUpdate.image_url || ''
      };

      console.log('Input price:', inputPrice);
      console.log('Price with 2.5% markup:', newPrice);
      console.log('Sending payload:', payload);
      console.log('To endpoint:', `${API_URL}/api/products/${docId}`);

      // Send request with proper headers (same as admin dashboard)
      await axios.put(
        `${API_URL}/api/products/${docId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local state with the new price (including markup)
      setProducts(prev =>
        prev.map(p => 
          (p.id === productId || p.product_id === productId) 
            ? { ...p, price: newPrice } 
            : p
        )
      );

      setNewPrices(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });

      setSuccess(`Price updated successfully! (R${inputPrice.toFixed(2)} + 2.5% = R${newPrice.toFixed(2)})`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error('Error updating price:', err);
      console.error('Error response:', err?.response?.data);
      
      let errorMessage = 'Failed to update price';
      if (typeof err?.response?.data === 'string') {
        errorMessage = err.response.data;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setUpdatingProductId(null);
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
      <div className="buyer-section">
        <h2>Update Product Prices</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '16px' }}>
          💡 Note: A 2.5% profit markup will be automatically added to all prices
        </p>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search products by name or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {filteredProducts.length === 0 ? (
          <div className="no-orders-message">
            <p>{searchQuery ? `No products match "${searchQuery}"` : 'No products found.'}</p>
          </div>
        ) : (
          <div className="price-updates-grid">
            {filteredProducts.map((product) => {
              const productId = product.id || product.product_id;
              const currentPrice = getPrice(product.price);
              const inputValue = newPrices[productId] ? parseFloat(newPrices[productId]) : null;
              const previewPrice = inputValue ? calculatePriceWithMarkup(inputValue) : null;
              
              return (
                <div key={productId} className="price-update-card">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="product-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="product-info">
                    <h4>{product.name}</h4>
                    {product.brand && <p className="product-brand">{product.brand}</p>}
                    {product.category && <p className="product-category">{product.category}</p>}
                    <p className="current-price">Current: R{currentPrice.toFixed(2)}</p>
                  </div>

                  <div className="price-input-group">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="New price (base)"
                      value={newPrices[productId] || ''}
                      onChange={(e) => handlePriceChange(productId, e.target.value)}
                      className="price-input"
                    />
                    {previewPrice && (
                      <div style={{
                        padding: '8px',
                        backgroundColor: '#e8f5e9',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        color: '#2e7d32',
                        textAlign: 'center'
                      }}>
                        <strong>With 2.5% markup:</strong><br />
                        R{previewPrice.toFixed(2)}
                      </div>
                    )}
                    <button
                      onClick={() => handleUpdatePrice(productId)}
                      disabled={updatingProductId === productId || !newPrices[productId]}
                      className="update-btn"
                    >
                      {updatingProductId === productId ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerPriceUpdates;