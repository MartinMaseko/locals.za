import React, { useEffect, useState, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './productstyle.css';
import { useCart } from '../../../contexts/CartContext';
import type { Product } from '../../../contexts/FavoritesContext';
import ProductCard from './productsCard';
import LogoAnime from '../../../assets/logos/locals-svg.gif';
import LoadingContext from '../LoadingContext';
import { Analytics } from '../../../../utils/analytics';

const API_URL = import.meta.env.VITE_API_URL;

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(location.state?.product || null);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedFilter, setRelatedFilter] = useState<{type: 'brand'|'category'|null; value: string | null}>({ type: null, value: null });
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
        // Determine whether we need to fetch a new product for the current id.
        // If the existing `product` state is missing or doesn't match the route id,
        // try to use location.state first (fast) then fall back to the API.
        let currentProduct = product;

        if (!currentProduct || currentProduct.id !== id) {
          if (location.state?.product && location.state.product.id === id) {
            currentProduct = location.state.product as Product;
            setProduct(currentProduct);
          } else {
            if (!id) throw new Error('Missing product id');
            const { data } = await axios.get<Product>(`${API_URL}/api/api/products/${id}`);
            currentProduct = data;
            setProduct(data);
          }
        }

        if (currentProduct) {
          // Fetch all products to apply our enhanced recommendation algorithm
          const response = await axios.get(`${API_URL}/api/api/products`);
          const data = response.data;
          const allProducts = Array.isArray(data)
            ? data as Product[]
            : (typeof data === 'object' && data !== null && 'products' in data && Array.isArray(data.products)
               ? data.products as Product[]
               : []);
+
+          // store all products to use for related/filters
+          setAllProducts(allProducts);

           const recommendations = getEnhancedRecommendations(allProducts, currentProduct);
           setSuggestedProducts(recommendations);
         }
       } catch (err: any) {
         console.error('Failed to load product or suggestions:', err);
         Analytics.trackApiError(
           `${API_URL}/api/api/products/${id}`,
           err.response?.status || 500,
           err.message || 'Failed to load product'
         );
         setError(err.message || 'Failed to load product');
       } finally {
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
     Analytics.trackUserPath('product_detail', 'product_list', 'back_button');
     // Pass scrollToTop state to ensure scroll position is reset
     navigate("..", { state: { scrollToTop: true } });
   };

   // Ensure we have products available if handlers are called later
   const fetchAllProducts = async (): Promise<Product[]> => {
     if (allProducts && allProducts.length > 0) return allProducts;
     try {
       const resp = await axios.get(`${API_URL}/api/api/products`);
       const data = resp.data;
       const list = Array.isArray(data)
         ? (data as Product[])
         : (typeof data === 'object' && data !== null && 'products' in data && Array.isArray((data as any).products)
            ? (data as any).products as Product[]
            : []);
       setAllProducts(list);
       return list;
     } catch (e) {
       return [];
     }
   };

   const showProductsByBrand = async (brand: string) => {
     if (!brand) return;
     const list = await fetchAllProducts();
     const matches = list.filter(p => p.brand === brand && p.id !== product?.id);
     setRelatedFilter({ type: 'brand', value: brand });
     setRelatedProducts(matches);
     const el = document.getElementById('related-products'); if (el) el.scrollIntoView({ behavior: 'smooth' });
   };

   const showProductsByCategory = async (category: string) => {
     if (!category) return;
     const list = await fetchAllProducts();
     const matches = list.filter(p => p.category === category && p.id !== product?.id);
     setRelatedFilter({ type: 'category', value: category });
     setRelatedProducts(matches);
     const el = document.getElementById('related-products'); if (el) el.scrollIntoView({ behavior: 'smooth' });
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

   const handleSuggestedProductClick = (prod: Product) => {
     Analytics.trackUserPath(`product_${product?.id}`, `product_${prod.id}`, 'suggestion_click');
     navigate(`/product/${prod.id}`, { state: { product: prod } });
     try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } 
     catch (e) { window.scrollTo(0,0); }
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
          <p className="product-modal-price">R {Number(product.price || 0).toFixed(2)}</p>
          {product.brand && (
            <p className='product-modal-subtext'>
              <strong>Brand:</strong>{' '}
              <button className="link-button" onClick={() => showProductsByBrand(product.brand)}>{product.brand}</button>
            </p>
          )}
          {product.category && (
            <p className='product-modal-subtext'>
              <strong>Category:</strong>{' '}
              <button className="link-button" onClick={() => showProductsByCategory(product.category)}>{product.category}</button>
            </p>
          )}
          {product.description && <p className='product-modal-description'>{product.description}</p>}

          {/* Add / Remove cart controls */}
          <div className="product-detail-actions">
            {!inCart ? (
              <button
                className="add-to-cart"
                onClick={handleAddToCart}
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
            {suggestedProducts.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={handleSuggestedProductClick}
              />
            ))}
           </div>
         </div>
       )}

       {/* Related products section (brand/category) */}
       {relatedProducts.length > 0 && (
         <div id="related-products" className="related-products-section">
           <h2>
             {relatedFilter.type === 'brand' ? `More from ${relatedFilter.value}` : `More in ${relatedFilter.value}`}
           </h2>
           <div className="related-products-grid">
             {relatedProducts.map(p => (
               <ProductCard
                 key={p.id}
                 product={p}
                 onClick={(prod) => {
                   navigate(`/product/${prod.id}`, { state: { product: prod } });
                   try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0,0); }
                 }}
               />
             ))}
           </div>
         </div>
       )}
     </div>
   );
 };

 export default ProductDetailPage;