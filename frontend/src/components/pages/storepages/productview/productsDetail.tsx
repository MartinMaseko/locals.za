import React, { useEffect, useState, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './productstyle.css';
import { useCart } from '../../../contexts/CartContext';
import type { Product } from '../../../contexts/FavoritesContext';
import ProductCard from './productsCard';
import LogoAnime from '../../../assets/logos/locals-svg.gif';
import LoadingContext from '../LoadingContext';

const API_URL = import.meta.env.VITE_API_URL;

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(location.state?.product || null);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
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
    } catch (e) {
      // fallback
      window.scrollTo(0, 0);
    }
  }, [product]);
  
  useEffect(() => {
    const fetchProductAndSuggestions = async () => {
      setLoading(true);
      setError('');
      
      try {
        // If we don't have the product from navigation state, fetch it
        let currentProduct = product;
        
        if (!currentProduct) {
          if (!id) {
            throw new Error('Missing product id');
          }

          const { data } = await axios.get<Product>(`${API_URL}/api/api/products/${id}`);
          currentProduct = data;
          setProduct(data);
        }
        
        if (currentProduct) {
          // Fetch all products to apply our enhanced recommendation algorithm
          const response = await axios.get(`${API_URL}/api/api/products`);
          const data = response.data;
          // Ensure data is an array (handle object with products property)
          const allProducts = Array.isArray(data) 
            ? data as Product[] 
            : (typeof data === 'object' && data !== null && 'products' in data && Array.isArray(data.products) 
               ? data.products as Product[] 
               : []);
          // Apply multi-factor recommendation algorithm
          const recommendations = getEnhancedRecommendations(allProducts, currentProduct);
          setSuggestedProducts(recommendations);
        }
      } catch (err: any) {
        console.error('Failed to load product or suggestions:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProductAndSuggestions();
  }, [id, product]);
  
  /**
   * Enhanced recommendation algorithm that uses multiple factors:
   * 1. Exact category match (highest priority)
   * 2. Same brand (second priority)
   * 3. Similar price range (third priority)
   * 4. Product name keyword matching (additional relevance)
   */
  const getEnhancedRecommendations = (allProducts: Product[], currentProduct: Product): Product[] => {
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
    // Pass scrollToTop state to ensure scroll position is reset
    navigate("..", { state: { scrollToTop: true } });
  };

  if (loading) return (
    <div className='loading-container'>
      <img src={LogoAnime} alt="Loading..." className="loading-gif" />
      Loading...
    </div>
  );
  
  if (error) return <div className="product-detail-error">{error}</div>;
  if (!product) return <div className="product-detail-empty">Product not found</div>;

  const inCart = isInCart(product.id);
  const qty = getQty(product.id);

  return (
    <div className="product-detail-page">
      <button className="product-detail-back" onClick={handleBackNavigation}>
        <img width="30" height="30" src="https://img.icons8.com/ios-filled/35/ffb803/back.png" alt="back" />
        Back
      </button>

      <div className="product-detail-grid">
        {product.image_url && <img src={product.image_url} alt={product.name} className="product-detail-image" />}
        <div className="product-detail-info">
          <h1 className="product-modal-title">{product.name}</h1>
          <p className="product-modal-price">R {product.price}</p>
          {product.brand && <p><strong>Brand:</strong> {product.brand}</p>}
          {product.category && <p><strong>Category:</strong> {product.category}</p>}
          {product.description && <p className="product-modal-desc">{product.description}</p>}

          {/* Add / Remove cart controls */}
          <div className="product-detail-actions">
            {!inCart ? (
              <button
                className="add-to-cart"
                onClick={() => {
                  addToCart(product);
                }}
                type="button"
              >
                Add to cart
              </button>
            ) : (
              <div className="cart-controls" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="decrease-qty"
                  type="button"
                  onClick={() => decreaseQty(product.id)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>Qty: {qty}</span>
                <button
                  className="increase-qty"
                  type="button"
                  onClick={() => increaseQty(product.id)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
                <button
                  className="remove-from-cart"
                  onClick={() => removeFromCart(product.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Suggested Products Section */}
      {suggestedProducts.length > 0 && (
        <div className="suggested-products-section">
          <h2>You might also like</h2>
          <div className="suggested-products-grid">
            {suggestedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;