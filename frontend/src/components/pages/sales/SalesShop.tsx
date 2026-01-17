import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../storepages/productview/productstyle.css';
import '../storepages/store/storeCategoriesStyling.css';

const API_URL = import.meta.env.VITE_API_URL;

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string; 
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
  const navigate = useNavigate();

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
      
      console.log('Products received:', data.length);
      console.log('First few products:', data.slice(0, 3));
      
      // Use all products like homepage - don't filter by stock
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

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${(numAmount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="buyer-dashboard">
        <div className="buyer-section">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard">
      <div className="buyer-section" style={{ maxWidth: '1400px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{ margin: 0 }}>Shop for Customers</h2>
            <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
              Browse products and create shared carts for your customers
            </p>
            {salesRepInfo && (
              <p style={{ color: '#4caf50', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Shopping as: <strong>{salesRepInfo.username}</strong>
              </p>
            )}
          </div>
          <div className='salesRep-Cart'>

          </div>
          
          {cart.length > 0 && (
            <button
              onClick={() => navigate('/sales/cart')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🛒 View Cart ({cart.length})
            </button>
          )}
        </div>

        {/* Search and Filter */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
              minWidth: '150px',
              cursor: 'pointer'
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No products found
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="product-card"
                style={{
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{ 
                  width: '100%', 
                  height: '200px', 
                  overflow: 'hidden',
                  background: '#f5f5f5'
                }}>
                  <img
                    src={product.image_url || product.image} // Handle both field names
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/250x200?text=No+Image';
                    }}
                  />
                </div>
                
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontSize: '1.1rem',
                    color: '#212121'
                  }}>
                    {product.name}
                  </h3>
                  
                  <p style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    {product.category}
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1rem'
                  }}>
                    <span style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#4caf50'
                    }}>
                      {formatCurrency(product.price)}
                    </span>
                    
                    <button
                      onClick={() => handleAddToCart(product)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'background 0.3s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#1565c0'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#1976d2'}
                    >
                      Add to Cart
                    </button>
                  </div>
                  
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    fontSize: '0.85rem',
                    color: (product.stock !== undefined && product.stock < 10) ? '#f44336' : '#666'
                  }}>
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