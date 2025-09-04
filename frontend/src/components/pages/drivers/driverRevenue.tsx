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
  cashedOut?: boolean;
  [key: string]: any;
}

interface DriverData {
  name?: string;
  email?: string;
  uid: string;
  phone?: string;
  lastCashoutDate?: string;
  [key: string]: any;
}

const DriverRevenue = () => {
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [cashoutSuccess, setCashoutSuccess] = useState(false);
  const [cashoutError, setCashoutError] = useState('');
  const [lastCashout, setLastCashout] = useState<string | null>(null);
  const auth = getAuth(app);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/driver-login');
          return;
        }

        const idTokenResult = await user.getIdTokenResult();
        
        // Initialize driver data with auth information
        let driverData: DriverData = {
          name: user.displayName || undefined,
          email: user.email || undefined,
          uid: user.uid,
        };
        
        // Get name from claims if available
        if (idTokenResult.claims && 
            (idTokenResult.claims.full_name || idTokenResult.claims.name)) {
          driverData.name = (idTokenResult.claims.full_name as string | undefined) || 
                           (idTokenResult.claims.name as string | undefined);
        }
        
        setDriver(driverData);
        
        // Fetch driver-specific information including last cashout
        await fetchDriverInfo(user.uid);
        
        // Fetch orders
        await fetchDriverOrders(user.uid);
        
        if (
          typeof idTokenResult.claims.driver_id === 'string' &&
          idTokenResult.claims.driver_id !== user.uid
        ) {
          await fetchDriverOrders(idTokenResult.claims.driver_id);
        }
        
      } catch (error) {
        console.error('Error fetching driver data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDriverData();
  }, [auth, navigate]);
  
  // Update the fetchDriverInfo method to handle errors better
  const fetchDriverInfo = async (driverId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get('/api/drivers/info', {
        params: { driver_id: driverId },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Type assertion for the response data
      const driverInfo = response.data as { 
        lastCashoutDate?: string;
        name?: string;
        lastCashoutAmount?: number;
      };
      
      if (driverInfo) {
        if (driverInfo.lastCashoutDate) {
          setLastCashout(driverInfo.lastCashoutDate);
        }
        
        setDriver(prevState => ({
          ...prevState!,
          lastCashoutDate: driverInfo.lastCashoutDate,
          name: prevState?.name || driverInfo.name
        }));
      }
      
    } catch (error) {
      console.error('Failed to load driver info:', error);
      // Continue with what we have - don't block the UI
    }
  };
  
  // Update the fetchDriverOrders method to use a fallback if needed
  const fetchDriverOrders = async (driverId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get('/api/orders', {
        params: { driver_id: driverId, include_cashout_status: true },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (Array.isArray(response.data)) {
        // Filter completed orders
        const completed = response.data.filter(order => 
          (order.status === 'completed' || order.status === 'delivered')
        );
        
        // Separate into cashed out and pending
        const cashedOut = completed.filter(order => order.cashedOut === true);
        const pending = completed.filter(order => order.cashedOut !== true);
        
        setCompletedOrders(cashedOut);
        setPendingOrders(pending);
      }
      
    } catch (error) {
      console.error('Failed to load orders:', error);
      // Show empty state but don't block UI
      setCompletedOrders([]);
      setPendingOrders([]);
    } finally {
      // Always set loading to false so UI can render
      setLoading(false);
    }
  };
  
  const handleCashout = async () => {
    if (pendingOrders.length === 0) return;
    
    setIsCashingOut(true);
    setCashoutError('');
    
    try {
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Get order IDs for cashout
      const orderIds = pendingOrders.map(order => order.id);
      
      // Calculate total amount
      const amount = pendingOrders.length * 40;
      
      await axios.post('/api/drivers/cashout', {
        orderIds,
        amount,
        driverName: driver?.name || 'Driver',
        driverEmail: driver?.email || 'No email provided',
        driverId: driver?.uid
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update orders as cashed out
      setCompletedOrders([...completedOrders, ...pendingOrders]);
      setPendingOrders([]);
      
      // Set last cashout date
      setLastCashout(new Date().toISOString());
      
      // Show success message
      setCashoutSuccess(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setCashoutSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('Cashout failed:', error);
      setCashoutError('Failed to process cashout. Please try again.');
    } finally {
      setIsCashingOut(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-ZA', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  const totalPendingRevenue = pendingOrders.length * 40;
  const totalEarnedRevenue = completedOrders.length * 40;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading revenue data...</p>
      </div>
    );
  }

  return (
    <div className="driver-revenue-page">
      <div className="driver-revenue-header">
        <h1>Driver Earnings</h1>
        {driver?.name && <p className="driver-name">Welcome back, {driver.name}</p>}
      </div>
      
      <div className="driver-revenue-cards">
        <div className="revenue-card available-revenue">
          <h2>Available for Cashout</h2>
          <p className="revenue-amount">R{totalPendingRevenue.toFixed(2)}</p>
          <p className="revenue-info">{pendingOrders.length} completed {pendingOrders.length === 1 ? 'delivery' : 'deliveries'}</p>
          
          <button 
            className="cashout-btn"
            onClick={handleCashout}
            disabled={isCashingOut || pendingOrders.length === 0}
          >
            {isCashingOut ? 'Processing...' : 'Cash Out'}
          </button>
          
          {lastCashout && (
            <p className="last-cashout-info">Last cashout: {formatDate(lastCashout)}</p>
          )}
          
          {cashoutSuccess && (
            <div className="cashout-success">
              <p>Cashout request submitted successfully!</p>
              <p>Your payment will be processed shortly.</p>
            </div>
          )}
          
          {cashoutError && (
            <div className="cashout-error">
              <p>{cashoutError}</p>
            </div>
          )}
        </div>
        
        <div className="revenue-card total-revenue">
          <h2>Total Earnings</h2>
          <p className="revenue-amount">R{(totalEarnedRevenue + totalPendingRevenue).toFixed(2)}</p>
          <p className="revenue-info">{completedOrders.length + pendingOrders.length} total {(completedOrders.length + pendingOrders.length) === 1 ? 'delivery' : 'deliveries'}</p>
        </div>
        
        <div className="revenue-card cashed-out">
          <h2>Paid Out</h2>
          <p className="revenue-amount">R{totalEarnedRevenue.toFixed(2)}</p>
          <p className="revenue-info">{completedOrders.length} paid {completedOrders.length === 1 ? 'delivery' : 'deliveries'}</p>
        </div>
      </div>
      
      <div className="driver-revenue-orders">
        <h2>Pending Payment</h2>
        {pendingOrders.length === 0 ? (
          <div className="no-pending-orders">
            <p>No pending payments</p>
          </div>
        ) : (
          <div className="pending-orders-list">
            {pendingOrders.map(order => (
              <div key={order.id} className="revenue-order-card">
                <div className="revenue-order-header">
                  <div className="revenue-order-id">Order #{order.id.slice(-6)}</div>
                  <div className="revenue-order-date">{formatDate(order.createdAt)}</div>
                </div>
                <div className="revenue-order-amount">R40.00</div>
              </div>
            ))}
          </div>
        )}
        
        <h2>Payment History</h2>
        {completedOrders.length === 0 ? (
          <div className="no-completed-orders">
            <p>No payment history</p>
          </div>
        ) : (
          <div className="completed-orders-list">
            {completedOrders.map(order => (
              <div key={order.id} className="revenue-order-card paid">
                <div className="revenue-order-header">
                  <div className="revenue-order-id">Order #{order.id.slice(-6)}</div>
                  <div className="revenue-order-date">{formatDate(order.createdAt)}</div>
                </div>
                <div className="revenue-order-amount">R40.00</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverRevenue;