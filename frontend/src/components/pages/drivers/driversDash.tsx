import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './driverStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const auth = getAuth(app);
  const navigate = useNavigate();

  const STATUS_PRIORITY: Record<string, number> = {
    processing: 0,
    'in_transit': 1,
    completed: 2,
    delivered: 2,
  };

  const sortedAndFilteredOrders = assignedOrders
    .filter(order => {
      const matchesSearch = searchQuery === '' ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.status] ?? 1;
      const priorityB = STATUS_PRIORITY[b.status] ?? 1;
      return priorityA - priorityB;
    });

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
      
      const response = await axios.get(`${API_URL}/api/orders`, {
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
    const street = address.addressLine || address.street || address.address_line1;
    const suburb = address.suburb || address.address_line2;
    const city = address.city || address.town;
    const province = address.province || address.state;
    const postalCode = address.postal || address.postalCode || address.postal_code || address.zip;
    
    if (street) parts.push(street);
    if (suburb) parts.push(suburb);
    if (city) parts.push(city);
    if (province) parts.push(province);
    if (postalCode) parts.push(postalCode);
    
    return parts.length ? parts.join(', ') : 'No address details';
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
      <div className="driver-stats-cards">
        <div className="driver-section">
          <h2>Assigned Orders</h2>

          <div className="driver-orders-toolbar">
            <input
              type="text"
              className="driver-order-search"
              placeholder="Search by order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="driver-status-filters">
              {['all', 'processing', 'in transit', 'completed'].map(status => (
                <button
                  key={status}
                  className={`driver-status-filter-btn ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All' : status === 'in transit' ? 'In Transit' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

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
          ) : sortedAndFilteredOrders.length === 0 ? (
            <div className="no-orders-message">
              <img 
                src="https://img.icons8.com/ios-filled/100/999999/delivery.png" 
                alt="No orders"
                className="no-orders-icon"
              />
              <p>{assignedOrders.length === 0 ? 'No orders assigned yet' : 'No orders match your filters'}</p>
              <p className="no-orders-subtext">{assignedOrders.length === 0 ? 'New deliveries will appear here' : 'Try a different search or status filter'}</p>
            </div>
          ) : (
            <div className="driver-orders-list">
              {sortedAndFilteredOrders.map(order => (
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
  );
};

export default DriversDash;