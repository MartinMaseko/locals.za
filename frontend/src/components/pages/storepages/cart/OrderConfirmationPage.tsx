import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import ProductCard from '../productview/productsCard';
import LoadingContext from '../LoadingContext';
import LogoAnime from '../../../assets/logos/locals-svg.gif';
import './cartstyle.css';

const API_URL = import.meta.env.VITE_API_URL;

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
  confirmationSent?: boolean;
  deliveryAddress?: Record<string, any>;
};

const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const { setLoading: setGlobalLoading } = useContext(LoadingContext);
  
  // Use refs to track one-time operations
  const statusUpdatedRef = useRef(false);
  const confirmationSentRef = useRef(false);
  
  useEffect(() => {
    setGlobalLoading(loading);
    return () => setGlobalLoading(false);
  }, [loading, setGlobalLoading]);

  // First, check authentication state before trying to fetch order
  useEffect(() => {
    const auth = getAuth(app);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      setAuthChecked(true);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Handle the order fetch once auth is checked
  useEffect(() => {
    if (!authChecked) return; // Wait until auth state is checked
    
    const fetchOrder = async () => {
      if (!id) {
        setError('Order ID is missing');
        setLoading(false);
        return;
      }

      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        
        console.log("Fetching order:", id);
        console.log("Current user:", user ? "Logged in" : "Not logged in");
        
        // For orders coming from PayFast, we may need to fetch without auth first
        const isFromPayFast = location.search.includes('pf_') || 
                             location.pathname.includes('/order-confirmation/');
        
        let orderData: Order | null = null;
        
        try {
          // First try with authentication if user is logged in
          if (user) {
            const token = await user.getIdToken();
            console.log("Token obtained, trying authenticated request");

            const response = await axios.get<Order>(`${API_URL}/api/api/orders/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            orderData = response.data;
          } else if (isFromPayFast) {
            // If coming from PayFast and no user is logged in, try a special endpoint
            console.log("No user logged in, but coming from PayFast. Trying public endpoint");
            const response = await axios.get<Order>(`${API_URL}/api/api/orders/public/${id}`);
            orderData = response.data;
          } else {
            throw new Error('Authentication required');
          }
        } catch (authError) {
          console.error("Error with initial fetch:", authError);
          
          // As a last resort for PayFast returns, try the public endpoint
          if (isFromPayFast) {
            console.log("Trying public endpoint as fallback");
            const response = await axios.get<Order>(`${API_URL}/api/api/orders/public/${id}`);
            orderData = response.data;
          } else {
            throw authError;
          }
        }
        
        console.log("Order data fetched:", orderData);
        
        if (!orderData) {
          throw new Error('No order data received');
        }
        
        setOrder(orderData);
        
        // Only try to update status if user is logged in
        if (user && orderData) {
          // Process status updates if needed
          if (!statusUpdatedRef.current && orderData.status === 'pending_payment') {
            try {
              console.log("Updating order status to 'pending'");
              statusUpdatedRef.current = true;
              
              const token = await user.getIdToken();
              await axios.put(`${API_URL}/api/api/orders/${id}/status`, 
                { 
                  status: 'pending',
                  sendConfirmation: true
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              setOrder(prevOrder => prevOrder ? { ...prevOrder, status: 'pending' } : orderData);
            } catch (err) {
              console.error('Error updating order status:', err);
              statusUpdatedRef.current = false;
            }
          }
          // If the order is already in pending status but confirmation hasn't been sent
          else if (!confirmationSentRef.current && !orderData.confirmationSent && orderData.status !== 'pending_payment') {
            try {
              console.log("Sending order confirmation");
              confirmationSentRef.current = true;
              
              const token = await user.getIdToken();
              await axios.post(`${API_URL}/api/api/orders/${id}/send-confirmation`, {}, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (err) {
              console.error('Error sending order confirmation:', err);
              confirmationSentRef.current = false;
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching order:', err);
        
        // Provide user-friendly error messages
        if (err.response?.status === 401) {
          setError('Please log in to view your order details');
        } else if (err.response?.status === 404) {
          setError('Order not found. It may have been deleted or you may not have permission to view it.');
        } else {
          setError(err?.response?.data?.message || 'Failed to load order details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, authChecked, location.search, location.pathname]);

  if (loading) {
    return (
      <div className="loading-container">
        <img src={LogoAnime} alt="Loading..." className="loading-gif" />
        <div>Loading your order details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-confirmation-wrapper">
        <div className='error-wrapper'>
          <img width="75" height="75" src="https://img.icons8.com/keek/75/error.png" alt="error"/>
          <div className="error-message">{error}</div>
          <div className="error-actions">
            <Link to="/login" className="login-button">Login</Link>
            <Link to="/" className="redirect-button">Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-confirmation-wrapper">
        <div className='error-wrapper'>
          <img width="75" height="75" src="https://img.icons8.com/keek/75/error.png" alt="error"/>
          <div className="error-message">Order not found</div>
          <Link to="/" className="redirect-button">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="order-confirmation-wrapper">
      <div className="order-confirmation-content">
        <div className="order-confirmation-header">
          <h1>Order Confirmed</h1>
          <div className="order-status">
            <span className={`status-badge status-${order.status?.toLowerCase() || 'pending'}`}>
              Status: {order.status || 'Pending'}
            </span>
          </div>
          <p className="order-confirmation-message">
            Thank you for your order! Your order #{order.id} has been received and is being processed.
          </p>
          <p className="order-date">
            Placed on: {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div className="order-details-section">
          <h2>Order Items</h2>
          <div className="order-items-grid">
            {order.items.map((item, index) => (
              <div key={index} className="order-item-card">
                <ProductCard
                  product={{
                    id: item.product?.id ?? '',
                    name: item.product?.name ?? '',
                    price: item.product?.price ?? 0,
                    image_url: item.product?.image_url ?? '',
                  }}
                />
                <div className="item-quantity">QTY: {item.qty}</div>
              </div>
            ))}
          </div>

          <div className="order-summary">
            <div className="order-costs">
              <div className="cost-row">
                <span>Subtotal:</span>
                <span>R {typeof order.subtotal === 'number' ? order.subtotal.toFixed(2) : '0.00'}</span>
              </div>
              <div className="cost-row">
                <span>Service Fee:</span>
                <span>R {typeof order.serviceFee === 'number' ? order.serviceFee.toFixed(2) : '0.00'}</span>
              </div>
              <div className="cost-row total">
                <span>Total:</span>
                <span>R {typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="delivery-details-section">
          <h2>Delivery Information</h2>
          <div className="delivery-details">
            <p><strong>Recipient:</strong> {order.deliveryAddress?.name || 'N/A'}</p>
            <p><strong>Phone:</strong> {order.deliveryAddress?.phone || 'N/A'}</p>
            <p><strong>Address:</strong> {order.deliveryAddress?.addressLine || 'N/A'}</p>
            <p><strong>City:</strong> {order.deliveryAddress?.city || 'N/A'}</p>
            <p><strong>Postal Code:</strong> {order.deliveryAddress?.postal || 'N/A'}</p>
          </div>
        </div>

        <div className="order-actions">
          <Link to="/" className="continue-shopping-btn">Continue Shopping</Link>
          <Link to="/userorders" className="view-orders-button">View All Orders</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;