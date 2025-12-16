import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient.ts';
import BuyerNav from './buyerNav';
import './BuyerLayout.css';

const BuyerLayout: React.FC = () => {
  const [isBuyerAuthenticated, setIsBuyerAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await user.getIdToken();
          const isBuyer = true;
          setIsBuyerAuthenticated(isBuyer);
          if (!isBuyer) {
            navigate('/login');
          }
        } catch (error) {
          console.error('Error verifying buyer status:', error);
          setIsBuyerAuthenticated(false);
        }
      } else {
        setIsBuyerAuthenticated(false);
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  if (loading) {
    return (
      <div className="buyer-loading-container">
        <div className="buyer-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (isBuyerAuthenticated === false) {
    return (
      <div className="buyer-auth-required">
        <h2>Buyer Access Required</h2>
        <p>Please log in with a buyer account to access this area.</p>
        <button onClick={() => navigate('/login')}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="buyer-layout">
      <BuyerNav />
      <main className="buyer-layout-content">
        <Outlet />
      </main>
    </div>
  );
};

export default BuyerLayout;