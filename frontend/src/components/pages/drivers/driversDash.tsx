import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import './driverStyles.css';

const DriversDash = () => {
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          setDriver({
            name: user.displayName || 'Driver',
            email: user.email,
          });
        }
      } catch (error) {
        console.error('Error fetching driver data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDriverData();
  }, [auth]);

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
      <div className="driver-welcome">
        <h1>Welcome, {driver?.name}</h1>
      </div>
      
      <div className="driver-stats-cards">
        <div className="driver-stat-card">
          <h3>Today's Orders</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="driver-stat-card">
          <h3>Completed</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="driver-stat-card">
          <h3>Revenue</h3>
          <p className="stat-number">R0.00</p>
        </div>
      </div>

      <div className="driver-section">
        <h2>Assigned Orders</h2>
        <div className="no-orders-message">
          <img 
            src="https://img.icons8.com/ios-filled/100/999999/delivery.png" 
            alt="No orders"
            className="no-orders-icon"
          />
          <p>No orders assigned yet</p>
          <p className="no-orders-subtext">New deliveries will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default DriversDash;