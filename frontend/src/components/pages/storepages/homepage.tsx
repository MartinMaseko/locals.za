import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import LogoAnime from '../../assets/logos/locals-svg.gif';
import './storefront.css';
import NavBar from './navbar/navbar';

const HomePage = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New: Products state
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

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
    <NavBar />
    {/* Search Bar */}
    <div className="homepage-searchbar">
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="homepage-search-input"
      />
    </div>
    {/*Homepage Page*/}
    <div className='homepage-container'>
      <h1>
        Welcome{ name ? `, ${name}` : '' }!
      </h1>
      <p>This is your home page.</p>

      {/* New: Display products */}
      <div className='products-section'>
        <h2>All Products</h2>
        {productsLoading ? (
          <div>Loading products...</div>
        ) : products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <ul className='products-list'>
            {products.map(product => (
              <li key={product.id} className='products-list-item'>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <p><strong>Brand:</strong> {product.brand}</p>
                <p><strong>Category:</strong> {product.category}</p>
                <p><strong>Price: R</strong>{product.price}</p>
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} style={{ maxWidth: 200, marginTop: 10 }} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    </>
  );
};

export default HomePage;