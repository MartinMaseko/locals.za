import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import DriversNav from '../driverNav';
import './DriverLayout.css';

const DriverLayout: React.FC = () => {
  const [isDriverAuthenticated, setIsDriverAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await user.getIdToken();
          const isDriver = true; 
          setIsDriverAuthenticated(isDriver);
          if (!isDriver) {
            navigate('/login');
          }
        } catch (error) {
          console.error('Error verifying driver status:', error);
          setIsDriverAuthenticated(false);
        }
      } else {
        // No user logged in
        setIsDriverAuthenticated(false);
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  if (loading) {
    return (
      <div className="driver-loading-container">
        <div className="driver-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (isDriverAuthenticated === false) {
    return (
      <div className="driver-auth-required">
        <h2>Driver Access Required</h2>
        <p>Please log in with a driver account to access this area.</p>
        <button onClick={() => navigate('/login')}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="driver-layout">
      <DriversNav />
      <main className="driver-layout-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DriverLayout;