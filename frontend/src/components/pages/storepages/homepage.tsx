import { useEffect, useState, useContext, useRef, useLayoutEffect } from 'react';
import LoadingContext from './LoadingContext';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import './storefront.css';
import ProductCard from './productview/productsCard';
import LogoAnime from '../../assets/logos/locals-svg.gif';

/* Beverage logos */
import Cappy from '../../assets/images/cappylogo.png';
import CocaCola from '../../assets/images/cokelogo.png';
import Fruto from '../../assets/images/frutologo.png';
import kingsley from '../../assets/images/kingsleylogo.png';
import Mofaya from '../../assets/images/mofaya.png';
import monster from '../../assets/images/monster.png';
import Pepsi from '../../assets/images/pepsi.png';
import powerade from '../../assets/images/poweradelogo.png';
import Redbull from '../../assets/images/redbulllogo.png';
import Refreshh from '../../assets/images/refreshhlogo.png';
import Score from '../../assets/images/scorelogo.png';
import Twizza from '../../assets/images/twizzalogo.png';

import AppBanner from '../../assets/images/appbanner.webp';
import { Link, useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

const productCategories = [
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
  'Hair Coloring'
];

interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  price: number;
  description?: string;
  image_url?: string;
}

interface UserProfile {
  full_name?: string;
  email?: string;
}

const HomePage = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true); 
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New states for category UI
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Beverages'); // Default to Beverages

  // Products state - now category-specific
  const [products, setProducts] = useState<Product[]>([]);
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set(['Beverages']));

  // Product request states
  const [productRequest, setProductRequest] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{success?: boolean; message: string} | null>(null);
  
  const { setLoading: setGlobalLoading } = useContext(LoadingContext);
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Scroll restoration
  useLayoutEffect(() => {
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
          const { data } = await axios.get<UserProfile>(`${API_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setName(data.full_name || data.email || '');
        } catch {
          setName(user.email || '');
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Fetch products for specific category
  const fetchProductsByCategory = async (category: string) => {
    if (loadedCategories.has(category) && category !== 'Beverages') return;
    
    setProductsLoading(true);
    try {
      const response = await axios.get<Product[]>(`${API_URL}/api/products`, {
        params: category ? { category } : undefined
      });
      const categoryProducts = response.data.filter((p: Product) => 
        p.category && p.category.toLowerCase() === category.toLowerCase()
      );
      
      // Add new products to existing ones, avoiding duplicates
      setProducts(prev => {
        const existing = prev.filter(p => p.category !== category);
        return [...existing, ...categoryProducts];
      });
      
      setLoadedCategories(prev => new Set([...prev, category]));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Load default Beverages category on mount
  useEffect(() => {
    fetchProductsByCategory('Beverages');
  }, []);

  // Filter products by search and selectedCategory
  const filteredProducts = products.filter((p: Product) => {
    const nameMatch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    const categoryMatch = (p.category || '').toLowerCase().includes(search.toLowerCase());
    const searchMatch = search ? (nameMatch || categoryMatch) : true;
    const categoryFilter = selectedCategory ? (p.category || '').toLowerCase() === selectedCategory.toLowerCase() : true;
    return searchMatch && categoryFilter;
  });

  // Group products by category for rendering
  const groupedProducts = filteredProducts.reduce((acc: Record<string, Product[]>, prod) => {
    const cat = (prod.category && prod.category.trim()) || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(prod);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedProducts).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  // Handle category selection with lazy loading
  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    setShowCategories(false);
    
    // Load category products if not already loaded
    if (category && !loadedCategories.has(category)) {
      await fetchProductsByCategory(category);
    }
    
    // Scroll to products section
    setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const handleBrandSelect = (brandName: string) => {
    setSearch('');
    setSelectedCategory('Beverages');
    setSearch(brandName);
    
    setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

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
      await axios.post<{ success: boolean; message: string }>(`${API_URL}/api/product-requests`, {
        productName: productRequest,
        email: name.includes('@') ? name : undefined,
        timestamp: new Date().toISOString(),
        emailTo: 'admin@locals-za.co.za'
      });
      
      setRequestStatus({
        success: true,
        message: 'Thank you! We\'ve received your product request.'
      });
      setProductRequest('');
      
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

  if (loading) {
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
          <img 
            src={AppBanner} 
            alt="Locals ZA App Banner" 
            className="homepage-appbanner" 
            fetchPriority="high"
            width="800"
            height="320"
          />
          <p className='headertext'>Beverage Brands</p>

          {/* Beverage brand logos section */}
          <div className='brands-section'>
              <div className="brand-item" onClick={() => handleBrandSelect('Coca')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={CocaCola} alt="Coca-Cola" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Pepsi')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={Pepsi} alt="Pepsi" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Kingsley')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={kingsley} alt="Kingsley" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Refreshh')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={Refreshh} alt="Refreshh" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Twizza')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={Twizza} alt="Twizza" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Cappy')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={Cappy} alt="Cappy" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Fruto')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={Fruto} alt="Fruto" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Powerade')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={powerade} alt="Powerade" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Red Bull')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={Redbull} alt="Red Bull" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Mofaya')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={Mofaya} alt="Mofaya" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Monster')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={monster} alt="Monster" loading="lazy" width="75" height="75" />
                </div>
              </div>
              <div className="brand-item" onClick={() => handleBrandSelect('Score')}>
                <div className="brand-icon">
                  <img className="brand-logo" src={Score} alt="Score" loading="lazy" width="75" height="75" />
                </div>
              </div>
          </div>
        </div>
        <div className='ExploreLinkContainer'>
          <img  className='appnav-icons' src="https://img.icons8.com/material-rounded/40/ffb803/shop.png" alt="shop"/>
          <Link className='ExploreText' to="/shop">Browse Categories</Link>
        </div>
        
        <div className='products-section' ref={productsSectionRef}>
          {productsLoading ? (
            <div>Loading products...</div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            selectedCategory ? (
              <p>No products found in {selectedCategory}.</p>
            ) : (
              <p>No products found.</p>
            )
          ) : (
            <>
              {sortedCategories.map(category => (
                <section key={category} className="products-category-group">
                  <h4 className="products-category-title">{category}</h4>

                  {(() => {
                    const productsInCategory = groupedProducts[category] || [];
                    const brandGroups: Record<string, any[]> = {};

                    productsInCategory.forEach((p: Product) => {
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
                              <h5 className="brand-title">{brand}</h5>
                              <ul className='products-list'>
                                {productsForBrand.map((product: Product) => (
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