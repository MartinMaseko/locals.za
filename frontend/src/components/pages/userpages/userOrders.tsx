import React, { useEffect, useState, useContext } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient'; 
import axios from 'axios';
import './userstyle.css';
import ProductCard from '../storepages/productview/productsCard';
import LoadingContext from '../storepages/LoadingContext';
import LogoAnime from '../../../components/assets/logos/locals-svg.gif';
import { Link } from 'react-router-dom';

type OrderItem = {
  productId?: string;
  qty: number;
  product?: {
    id?: string;
    name?: string;
    price?: number | string;
    image_url?: string;
  };
};

type Order = {
  id: string;
  items: OrderItem[];
  subtotal?: number;
  serviceFee?: number;
  total?: number;
  status?: string;
  createdAt?: string;
  deliveryAddress?: Record<string, any>;
};

const UserOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const auth = getAuth(app);
  
  // Access the global loading context
  const { setLoading: setGlobalLoading } = useContext(LoadingContext);
  
  // Update global loading state whenever local loading changes
  useEffect(() => {
    setGlobalLoading(loading);
    return () => setGlobalLoading(false); // Clean up on unmount
  }, [loading, setGlobalLoading]);

  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setLoading(true);
      setError('');
      
      if (!user) {
        setOrders([]);
        setError('Please log in to view your orders.');
        setLoading(false);
        return;
      }

      try {
        
        // Get token for authentication
        const token = await user.getIdToken();
        
        // Use your API endpoint - note we're using axios now
        const response = await axios.get(`/api/orders/user/${user.uid}`, {
          headers: { 
            Authorization: `Bearer ${token}`
          }
        });
        
        // Your API returns orders directly as an array
        const payload: any[] = Array.isArray(response.data) ? response.data : [];
        
        // Continue with your existing normalization code
        const normalized = payload.map((o: any) => {
          // Handle createdAt field which might be a Firestore timestamp or ISO string
          const createdAtRaw = o.createdAt;
          let createdAtIso: string | undefined;
          
          if (createdAtRaw) {
            if (typeof createdAtRaw.toDate === 'function') {
              createdAtIso = createdAtRaw.toDate().toISOString();
            } else if (typeof createdAtRaw === 'object' && 'seconds' in createdAtRaw) {
              createdAtIso = new Date(createdAtRaw.seconds * 1000).toISOString();
            } else {
              createdAtIso = new Date(createdAtRaw).toISOString();
            }
          }
          
          return {
            id: o.id || '',
            items: Array.isArray(o.items) ? o.items : [],
            subtotal: typeof o.subtotal === 'number' ? o.subtotal : Number(o.subtotal || 0),
            serviceFee: typeof o.serviceFee === 'number' ? o.serviceFee : Number(o.serviceFee || 0),
            total: typeof o.total === 'number' ? o.total : Number(o.total || 0),
            status: o.status || 'unknown',
            createdAt: createdAtIso,
            deliveryAddress: o.deliveryAddress || {},
          };
        });
        
        if (mounted) setOrders(normalized);
      } catch (err: any) {
        console.error('Fetch orders error:', err?.response?.data || err);
        if (mounted) setError(err?.response?.data?.error || err?.message || 'Failed to load orders');
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [auth]);

  // Custom handler for when product card is clicked
  const handleProductClick = (product: any) => {
    // You can navigate to product detail or do nothing
    console.log('Product clicked:', product);
  };

  // Loading state and UI
  if (loading) return (
    <div className='loading-container'>
      <img src={LogoAnime} alt="Loading..." className="loading-gif" />
      Loading your orders...
    </div>
  );
  
  if (error) return <div className="user-orders-error">{error}</div>;

  return (
    <div className="user-orders-page">
      <h1>Your Orders</h1>
      {orders.length === 0 ? (
        <><div className='empty-orders-wrapper'>
            <img width="100" height="100" src="https://img.icons8.com/clouds/100/shopping-cart.png" alt="shopping-cart"/>
            <p>You have no orders yet.</p>
            <Link to="/" className="start-shopping-link">Start Shopping</Link>
          </div>
        </>
      ) : (
        <ul className="orders-list">
          {orders.map((o) => (
            <li key={o.id} className="order-card">
              <div className="order-header">
                <div className='order-no'>
                  Order: #{o.id}
                </div>
                <div className='order-date'>
                  Date: {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                </div>
                <div>
                  <span className={`order-status order-status-${(o.status || 'unknown').toLowerCase()}`}>
                    Status: {o.status || 'unknown'}
                  </span>
                </div>
              </div>

              <div className="order-items">
                <h3>Items</h3>
                <div className="order-items-grid">
                  {o.items.map((it, idx) => {
                    // Convert OrderItem to Product format for ProductCard
                    const product = {
                      id: it.productId || `product-${idx}`,
                      name: it.product?.name || `Product #${it.productId}`,
                      price: it.product?.price || 0,
                      image_url: it.product?.image_url || '',
                      // Add any other required fields
                    };
                    
                    return (
                      <div key={idx} className="order-item-wrapper">
                        <ProductCard 
                          product={product} 
                          onClick={handleProductClick}
                        />
                        <div className="order-item-quantity">Qty: {it.qty}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="order-summary">
                <div className="order-costs">
                  Subtotal: R {typeof o.subtotal === 'number' ? o.subtotal.toFixed(2) : Number(o.subtotal || 0).toFixed(2)}
                  <br />
                  Service fee: R {typeof o.serviceFee === 'number' ? o.serviceFee.toFixed(2) : Number(o.serviceFee || 0).toFixed(2)}
                </div>
                <div className="order-total">
                  Total: R {typeof o.total === 'number' ? o.total.toFixed(2) : Number(o.total || 0).toFixed(2)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserOrders;