import React, { useEffect, useState, useContext } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient'; 
import axios from 'axios';
import './userstyle.css';
import LoadingContext from '../storepages/LoadingContext';
import LogoAnime from '../../../components/assets/logos/locals-svg.gif';
import { Link } from 'react-router-dom';
import LocalsZAIcon from '../../assets/logos/LZA ICON.png';

const API_URL = import.meta.env.VITE_API_URL;

// Missing items
interface MissingItem {
  productId: string;
  productName?: string;
  originalQty?: number;
  availableQty?: number;
  missingQuantity: number;
  reason?: string;
}

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
  missingItems?: MissingItem[];
  refundAmount?: number;
  adjustedTotal?: number;
  refundStatus?: 'pending' | 'processed' | 'credited';
  driverNote?: string;
  eta?: string;
  etaArrivalTime?: string;
  etaUpdatedAt?: string;
};

const UserOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
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
        
        // Use API endpoint
        const response = await axios.get(`${API_URL}/api/orders/user/${user.uid}`, {
          headers: { 
            Authorization: `Bearer ${token}`
          }
        });
        
        // API returns orders directly as an array
        const payload: any[] = Array.isArray(response.data) ? response.data : [];
        
        // Continue with existing normalization code
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
            // Add these new properties
            missingItems: o.missingItems || [],
            refundAmount: typeof o.refundAmount === 'number' ? o.refundAmount : Number(o.refundAmount || 0),
            adjustedTotal: typeof o.adjustedTotal === 'number' ? o.adjustedTotal : Number(o.adjustedTotal || 0),
            refundStatus: o.refundStatus || 'pending',
            driverNote: o.driverNote || '',
            eta: o.eta || null,
            etaArrivalTime: o.etaArrivalTime || null,
            etaUpdatedAt: o.etaUpdatedAt || null,
          };
        });
        
        if (mounted) {
          setOrders(normalized);
        }
      } catch (err: any) {
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

  // Cancel a pending_payment order
  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await axios.put(`${API_URL}/api/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (err: any) {
      // Cancel order failed
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Loading state and UI
  if (loading) return (
    <div className='loading-container'>
      <img src={LogoAnime} alt="Loading..." className="loading-gif" />
      Loading your orders...
    </div>
  );
  
  if (error) return <div className="user-orders-error">
    <img src={LocalsZAIcon} alt="Locals ZA Logo" className="login-error-icon" />
    <p className='login-error-message'>{error}</p>
    <Link className='login-error-link' to="/login">Login</Link>
  </div>;

  // Add a helper function to check if ETA is recent (less than 30 minutes old)
  const isETARecent = (etaUpdatedAt?: string) => {
    if (!etaUpdatedAt) return false;
    
    const etaTime = new Date(etaUpdatedAt).getTime();
    const now = new Date().getTime();
    
    // ETA is considered recent if less than 30 minutes old
    return (now - etaTime) < 30 * 60 * 1000; // 30 minutes in milliseconds
  };

  return (
    <div className="user-orders-page">
      <h1>Your Orders</h1>
      
      {orders.length === 0 ? (
        <div className='empty-orders-wrapper'>
          <p>You have no orders yet.</p>
        </div>
      ) : (
        <div className="orders-section">
          <h2>Order History</h2>
          <ul className="orders-list">
            {orders.map((o) => (
              <li key={o.id} className="order-card">
                <div className="order-header">
                  <div className='order-no'>
                    Order: #<br />{o.id}
                    {/* Display badge for missing items */}
                    {o.missingItems && o.missingItems.length > 0 && (
                      <span className="missing-items-badge">
                        <br />{o.missingItems.length} item(s) unavailable
                      </span>
                    )}
                  </div>
                  <div className='order-date'>
                    Date: {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                  </div>
                  <div>
                    <span className={`order-status order-status-${(o.status || 'unknown').toLowerCase()}`}>
                      Status: {o.status || 'unknown'}
                    </span>
                    
                    {/* Add ETA display */}
                    {o.status === 'in transit' && o.eta && o.etaArrivalTime && isETARecent(o.etaUpdatedAt) && (
                      <div className="eta-display">
                        <span className="eta-arrival">
                          <img width="16" height="16" src="https://img.icons8.com/ios-filled/16/ffb803/time_2.png" alt="time"/>
                          Expected arrival at {o.etaArrivalTime} ({o.eta} away)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-items">
                  <h3>Items</h3>
                  <div className="order-items-grid">
                    {o.items.map((it, idx) => {
                      // Check if this item has missing quantities
                      const missingItem = o.missingItems?.find((mi: any) => mi.productId === it.productId);
                      
                      // Convert OrderItem to product display format
                      const product = {
                        id: it.productId || `product-${idx}`,
                        name: it.product?.name || `Product #${it.productId}`,
                        price: it.product?.price || 0,
                        image_url: it.product?.image_url || '',
                      };
                      
                      return (
                        <div key={idx} className={`order-item-wrapper ${missingItem ? 'has-missing' : ''}`}>
                          <div className="order-item-product">
                            {product.image_url && <img src={product.image_url} alt={product.name} width="60" height="60" />}
                            <span className="order-item-name">{product.name}</span>
                          </div>
                          <div className="order-item-quantity">
                            Qty: {it.qty}
                            {/* Show missing status if item is affected */}
                            {missingItem && (
                              <div className="item-availability">
                                {missingItem.missingQuantity === it.qty ? (
                                  <span className="unavailable-status">Unavailable</span>
                                ) : (
                                  <span className="partially-available-status">
                                    {it.qty - missingItem.missingQuantity} of {it.qty} available
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
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
                    
                    {/* Show refund information if there are missing items */}
                    {(o.refundAmount ?? 0) > 0 && (
                      <>
                        <br />
                        <span className="refund-line">
                          Refund for missing items: -R {Number(o.refundAmount).toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="user-order-total">
                    Total: R {
                      o.adjustedTotal 
                        ? Number(o.adjustedTotal).toFixed(2)
                        : typeof o.total === 'number' 
                          ? o.total.toFixed(2) 
                          : Number(o.total || 0).toFixed(2)
                    }
                    
                    {/* Show original price if adjusted */}
                    {o.adjustedTotal && o.adjustedTotal !== o.total && (
                      <span className="original-total">was R{Number(o.total || 0).toFixed(2)}</span>
                    )}
                  </div>
                  
                  {/* Show credit message if refund applied */}
                  {(o.refundAmount ?? 0) > 0 && (
                    <div className="refund-credit-note">
                      A credit of R{Number(o.refundAmount).toFixed(2)} has been added to your account for your next order.
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserOrders;