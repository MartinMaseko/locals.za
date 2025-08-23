import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import ProductCard from '../productview/productsCard';
import LoadingContext from '../LoadingContext';
import LogoAnime from '../../../assets/logos/locals-svg.gif';
import './cartstyle.css';

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

const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { setLoading: setGlobalLoading } = useContext(LoadingContext);
  
  useEffect(() => {
    setGlobalLoading(loading);
    return () => setGlobalLoading(false);
  }, [loading, setGlobalLoading]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        setError('Order ID is missing');
        setLoading(false);
        return;
      }

      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : null;

        const response = await axios.get(`/api/orders/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        setOrder(response.data as Order);
      } catch (err: any) {
        console.error('Error fetching order:', err);
        setError(err?.response?.data?.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

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
          <Link to="/" className="redirect-button">Return to Home</Link>
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