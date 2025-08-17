import { useEffect, useState, useContext } from 'react';
import LoadingContext from './LoadingContext';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import './storefront.css';
import ProductCard from './productview/productsCard';
import ProductDetailModal from './productview/productsDetail';
import LogoAnime from '../../assets/logos/locals-svg.gif';
import AppBanner from '../../assets/images/appbanner.webp';

const productCategories = [
  'Hair Extensions','Wigs','Conditioners','Shampoos','Hair Tools',
  'Hair Care','Hair Coloring','Hair Food','Hair Loss Treatments',
  'Hair Styling Products','Moisturizers','Relaxers','Hair Accessories','Hair Growth Products'
];

const HomePage = () => {
  // local page loading states (rename if desired)
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true); // profile loading
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // New states for category UI
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  // New: Products state (keep your existing fetch logic)
  const [products, setProducts] = useState<any[]>([]);

  // access global loading setter from context
  const { setLoading: setGlobalLoading } = useContext(LoadingContext);

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
          const { data } = await axios.get('/api/users/me', {
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
        const { data } = await axios.get('/api/products');
        setProducts(data as any[]);
      } catch {
        setProducts([]);
      }
      setProductsLoading(false);
    };
    fetchProducts();
  }, []);

  // filter products by search and selectedCategory
  const filteredProducts = products.filter(p => {
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

  // Conditional rendering for the products loading state.c
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
              <img className='category-icon' src="https://img.icons8.com/ios/40/ffb803/sorting-answers.png" alt="categories"/>
              Category {selectedCategory ? `: ${selectedCategory}` : ''}
            </button>
          </div>
          {/* sliding dropdown - shown only when showCategories is true */}
          <div className={`homepage-category-dropdown${showCategories ? ' open' : ''}`} aria-hidden={!showCategories}>
            <ul>
              <li
                className="homepage-category-item"
                onClick={() => { setSelectedCategory(''); setShowCategories(false); }}
              >
                All Categories
              </li>
              {productCategories.map(cat => (
                <li
                  key={cat}
                  className="homepage-category-item"
                  onClick={() => { setSelectedCategory(cat); setShowCategories(false); }}
                >
                  {cat}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="homepage-welcome">
          <img src={AppBanner} alt="App banner" className="homepage-appbanner" />
          <h1>Welcome{ name ? `, ${name}` : '' }!</h1>
        </div>
        {/* products section uses filteredProducts */}
        <div className='products-section'>
          <h2 className="products-section-title">{ selectedCategory ? '' : 'Browse Products' }</h2>

          {productsLoading ? (
            <div>Loading products...</div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <p>No products found.</p>
          ) : (
            <>
              {Object.keys(groupedProducts).map(category => (
                <section key={category} className="products-category-group">
                  <h4 className="products-category-title">{category}</h4>
                  <ul className='products-list'>
                    {groupedProducts[category].map(product => (
                      <li key={product.id} className='products-list-item'>
                        <ProductCard product={product} onClick={(p) => setSelectedProduct(p)} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
        {/* product detail modal */}
        {selectedProduct && (
          <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
      </div>
    </>
  );
};

export default HomePage;