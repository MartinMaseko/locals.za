import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SalesNav from './SalesNav';
import '../buyers/buyerLayout.css';

const SalesLayout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Direct check without function wrapper
    const salesRepId = localStorage.getItem('salesRepId');
    const salesRepUsername = localStorage.getItem('salesRepUsername');
    
    console.log('SalesLayout - Direct Auth Check:', {
      salesRepId,
      salesRepUsername,
      currentPath: location.pathname,
      bothPresent: !!(salesRepId && salesRepUsername)
    });
    
    // Simplified check
    setIsAuthenticated(!!(salesRepId && salesRepUsername));
    
  }, [location.pathname]);

  console.log('SalesLayout - Current auth state:', isAuthenticated);

  // Loading state
  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log('SalesLayout - Redirecting to login');
    return <Navigate to="/sales/login" replace />;
  }

  // Authenticated - show layout
  return (
    <div className="buyer-layout">
      <SalesNav />
      <main className="buyer-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default SalesLayout;
