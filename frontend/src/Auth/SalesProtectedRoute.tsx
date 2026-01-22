import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface SalesProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

const SalesProtectedRoute = ({ children, redirectTo = "/sales/login" }: SalesProtectedRouteProps) => {
  const salesRepId = localStorage.getItem('salesRepId');
  const salesRepUsername = localStorage.getItem('salesRepUsername');
  
  if (!salesRepId || !salesRepUsername) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

export default SalesProtectedRoute;