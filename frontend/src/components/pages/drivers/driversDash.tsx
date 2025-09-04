import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './driverStyles.css';

interface Order {
  id: string;
  status: string;
  deliveryAddress: {
    street?: string;
    city?: string;
    postalCode?: string;
    [key: string]: any;
  };
  total: number;
  createdAt: string;
  [key: string]: any;
}

interface DriverData {
  name?: string;
  email?: string;
  uid: string;
  phone?: string;
  [key: string]: any;
}

const DriversDash = () => {
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState('');
  const auth = getAuth(app);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // Get the ID token result to check custom claims
          const idTokenResult = await user.getIdTokenResult();
          
          // Initialize driver data with auth information
          let driverData: DriverData = {
            name: user.displayName || undefined,
            email: user.email || undefined,
            uid: user.uid,
          };
          
          // Method 1: Check if driver name is stored in custom claims
          if (idTokenResult.claims && 
              (idTokenResult.claims.full_name || idTokenResult.claims.name)) {
            driverData.name = (idTokenResult.claims.full_name as string | undefined) || (idTokenResult.claims.name as string | undefined);
          }
          
          // Method 2: Try Firebase Auth user.displayName
          if (!driverData.name && user.displayName) {
            driverData.name = user.displayName;
          }
          
          // Method 4: Extract name from driver_id as last resort
          if (!driverData.name && idTokenResult.claims.driver_id) {
            const driverId = String(idTokenResult.claims.driver_id);
            if (driverId.startsWith('DRIVER-')) {
              driverData.name = `Driver ${driverId.substring(7)}`;
            }
          }
          
          // Final name determination
          if (!driverData.name) {
            driverData.name = 'Driver';
          }
          
          setDriver(driverData);
        
          // Fetch orders
          await fetchDriverOrders(user.uid);
          
          if (
            typeof idTokenResult.claims.driver_id === 'string' &&
            idTokenResult.claims.driver_id !== user.uid
          ) {
            await fetchDriverOrders(idTokenResult.claims.driver_id);
          }
        } else {
          navigate('/driver-login'); // Redirect to login if not signed in
        }
      } catch (error) {
        setError('Failed to load driver information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDriverData();
  }, [auth, navigate]);
  
  const fetchDriverOrders = async (driverId: string) => {
    setLoadingOrders(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get('/api/orders', {
        params: { driver_id: driverId },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (Array.isArray(response.data)) {
        setAssignedOrders(response.data);
      } else {
        setAssignedOrders([]);
      }
      
    } catch (error) {
      setError('Failed to load your assigned orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const getFormattedAddress = (address: any) => {
    if (!address) return 'No address provided';
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.postalCode) parts.push(address.postalCode);
    
    return parts.length ? parts.join(', ') : 'No address details';
  };
  
  const getFormattedDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-ZA', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleViewOrder = (orderId: string) => {
    // Navigate to the driver deliveries page with the order ID
    navigate(`/driver/deliveries/${orderId}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      <div className="driver-stats-cards">
        <div className="driver-section">
          <h2>Assigned Orders</h2>
          
          {loadingOrders ? (
            <div className="loading-orders">
              <div className="loading-spinner"></div>
              <p>Loading orders...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button 
                onClick={() => driver?.uid ? fetchDriverOrders(driver.uid) : auth.currentUser?.uid ? fetchDriverOrders(auth.currentUser.uid) : null} 
                className="retry-button"
              >
                Try Again
              </button>
            </div>
          ) : assignedOrders.length === 0 ? (
            <div className="no-orders-message">
              <img 
                src="https://img.icons8.com/ios-filled/100/999999/delivery.png" 
                alt="No orders"
                className="no-orders-icon"
              />
              <p>No orders assigned yet</p>
              <p className="no-orders-subtext">New deliveries will appear here</p>
            </div>
          ) : (
            <div className="driver-orders-list">
              {assignedOrders.map(order => (
                <div key={order.id} className={`driver-order-card status-${order.status}`}>
                  <div className="driver-order-header">
                    <div className="driver-order-id">Order #{order.id.slice(-6)}</div>
                    <div className='driver-order-status'>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                  </div>
                  
                  <div className="driver-order-details">
                    <div className="driver-order-address">
                      <strong>Delivery Address:</strong>
                      <p>{getFormattedAddress(order.deliveryAddress)}</p>
                    </div>
                    
                    <div className="driver-order-time">
                      <strong>Order Time:</strong>
                      <p>{getFormattedDate(order.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="driver-order-actions">
                    <button 
                      className="driver-view-order-btn"
                      onClick={() => handleViewOrder(order.id)}
                    >
                      View Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="driver-stat-card">
          <h3>Completed</h3>
          <p className="stat-number">
            {assignedOrders.filter(order => order.status === 'completed' || order.status === 'delivered').length}
          </p>
        </div>
        
        <div className="driver-stat-card">
          <h3>Revenue</h3>
          <p className="stat-number">
            R{(assignedOrders
              .filter(order => order.status === 'completed' || order.status === 'delivered')
              .length * 40).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriversDash;