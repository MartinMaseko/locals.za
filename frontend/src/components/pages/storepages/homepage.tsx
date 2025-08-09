import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';

const HomePage = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h1>
        Welcome{ name ? `, ${name}` : '' }!
      </h1>
      <p>This is your home page.</p>

      {/* New: Display products */}
      <div style={{ marginTop: '2rem' }}>
        <h2>All Products</h2>
        {productsLoading ? (
          <div>Loading products...</div>
        ) : products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {products.map(product => (
              <li key={product.id} style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <p><strong>Brand:</strong> {product.brand}</p>
                <p><strong>Category:</strong> {product.category}</p>
                <p><strong>Price:</strong> {product.price}</p>
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} style={{ maxWidth: 200, marginTop: 10 }} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HomePage;