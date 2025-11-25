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
import FoodPackaging from '../../assets/images/FoodPackaging.webp';
import Sugar from '../../assets/images/sugar.webp';
import RelaxersPermKits from '../../assets/images/Relaxers.webp';
import Shampoos from '../../assets/images/Shampoo.webp';
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
  const [products, setProducts] = useState<any[]>([]);

  // Add this import at the top with your other imports
  const [productRequest, setProductRequest] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{success?: boolean; message: string} | null>(null);
  
  // access global loading setter from context
  const { setLoading: setGlobalLoading } = useContext(LoadingContext);

  // Create a ref for the products section
  const productsSectionRef = useRef<HTMLDivElement>(null);

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
          const userData = data as { full_name?: string; email?: string };
          setName(userData.full_name || userData.email || '');
        } catch {
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
        setProducts(data as any[]);
      } catch {
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
  const groupedProducts = filteredProducts.reduce((acc: Record<string, any[]>, prod) => {
    const cat = (prod.category && prod.category.trim()) || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
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
  const handleCategorySelect = (category: string) => {
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
  const handleProductRequest = async (e: React.FormEvent) => {
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
      
    } catch (error) {
      setRequestStatus({
        success: false,
        message: 'Failed to submit request. Please try again later.'
      });
    } finally {
      setRequestSubmitting(false);
    }
  };
  
  // Conditional rendering for the products loading state
  if (loading || productsLoading) {
    return (
      <div className='loading-container'>
        <img src={LogoAnime} alt="Loading..." className="loading-gif" />
        Loading...
      </div>
    );
  }

  return (
    <>
      <div className='homepage-container'>
        {/* SearchBar container*/}
        <div className="homepage-searchbar">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="homepage-search-input"
          />

          {/* clickable "Category" word under the input */}
          <div className="homepage-category-toggle-wrapper">
            <button
              type="button"
              className="homepage-category-toggle"
              onClick={() => setShowCategories(prev => !prev)}
              aria-expanded={showCategories}
            >
              <img className='category-icon-home' src="https://img.icons8.com/ios/40/ffb803/sorting-answers.png" alt="categories"/>
              Category {selectedCategory ? `: ${selectedCategory}` : ''}
            </button>
          </div>
          
          {/* Updated dropdown to use handleCategorySelect */}
          <div className={`homepage-category-dropdown${showCategories ? ' open' : ''}`} aria-hidden={!showCategories}>
            <ul>
              <li
                className="homepage-category-item"
                onClick={() => handleCategorySelect('')}
              >
                All Categories
              </li>
              {productCategories.map(cat => (
                <li
                  key={cat}
                  className="homepage-category-item"
                  onClick={() => handleCategorySelect(cat)}
                >
                  {cat}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="homepage-welcome">
          <img src={AppBanner} alt="App banner" className="homepage-appbanner" />
          
          {/* Updated category suggestions to use handleCategorySelect */}
          <div className='categories-suggestions'>
            {/* Category Card for Beverages */}
            <div className="category-item" onClick={() => handleCategorySelect('Beverages')}>
              <div className="suggestion-icon">
                <img className="category-image" src={Beverages} alt="Beverages" />
              </div>
              <span className="category-label">Beverages</span>
            </div>

            {/* Category Card for Maize Meal */}
            <div className="category-item" onClick={() => handleCategorySelect('Maize Meal')}>
              <div className="suggestion-icon">
                <img className="category-image" src={Maize} alt="Maize Meal" />
              </div>
              <span className="category-label">Maize Meal</span>
            </div>

            <div className="category-item" onClick={() => handleCategorySelect('Sugar')}>
              <div className="suggestion-icon">
                <img className="category-image" src={Sugar} alt="Sugar" />
              </div>
              <span className="category-label">Sugar</span>
            </div>

            <div className="category-item" onClick={() => handleCategorySelect('Food Packaging')}>
              <div className="suggestion-icon">
                <img className="category-image" src={FoodPackaging} alt="Food Packaging" />
              </div>
              <span className="category-label">Packaging</span>
            </div>

            <div className="category-item" onClick={() => handleCategorySelect('Shampoos & Cleansers')}>
              <div className="suggestion-icon">
                <img className="category-image" src={Shampoos} alt="Shampoos & Cleansers" />
              </div>
              <span className="category-label">Shampoos</span>
            </div>

            <div className="category-item" onClick={() => handleCategorySelect('Relaxers & Perm Kits')}>
              <div className="suggestion-icon">
                <img className="category-image" src={RelaxersPermKits} alt="Relaxers & Perm Kits" />
              </div>
              <span className="category-label">Relaxers</span>
            </div>
          </div>
        </div>

        {/* Add ref to the products section */}
        <div className='products-section' ref={productsSectionRef}>
          {/* Rest of your products section remains unchanged */}
          {productsLoading ? (
            <div>Loading products...</div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <p>No products found.</p>
          ) : (
            <>
              {Object.keys(groupedProducts).map(category => (
                <section key={category} className="products-category-group">
                  <h4 className="products-category-title">{category}</h4>

                  {/* Group products by brand within this category */}
                  {(() => {
                    const productsInCategory = groupedProducts[category] || [];
                    const brandGroups: Record<string, any[]> = {};

                    productsInCategory.forEach((p: any) => {
                      const brand = (p.brand && p.brand.trim()) || 'Other';
                      if (!brandGroups[brand]) brandGroups[brand] = [];
                      brandGroups[brand].push(p);
                    });

                    // Sort brand names alphabetically (case-insensitive)
                    const sortedBrands = Object.keys(brandGroups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

                    return (
                      <div className="category-brands">
                        {sortedBrands.map(brand => {
                          const productsForBrand = brandGroups[brand].slice().sort((x, y) => (x.name || '').toLowerCase().localeCompare((y.name || '').toLowerCase()));
                          return (
                            <div key={brand} className="brand-group">
                              <h5 className="brand-title">{brand}</h5>
                              <ul className='products-list'>
                                {productsForBrand.map((product: any) => (
                                  <li key={product.id} className='products-list-item'>
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
        
        {/* Product Request Section */}
        <div className="product-request-section">
          <h3 className="request-title">Can't find what you're looking for?</h3>
          <p className="request-subtitle">Let us know and we'll try to add it to our inventory</p>
          
          <form onSubmit={handleProductRequest} className="request-form">
            <div className="request-input-group">
              <input
                type="text"
                value={productRequest}
                onChange={(e) => setProductRequest(e.target.value)}
                placeholder="Tell us what product you need..."
                disabled={requestSubmitting}
                className="request-input"
              />
              <button 
                type="submit" 
                className="request-button"
                disabled={requestSubmitting}
              >
                {requestSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
            
            {requestStatus && (
              <div className={`request-status ${requestStatus.success ? 'success' : 'error'}`}>
                {requestStatus.message}
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default HomePage;