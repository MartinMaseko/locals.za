import React from 'react';
import { Navigate } from 'react-router-dom';

interface CommandProtectedRouteProps {
  children: React.ReactNode;
}

export const CommandProtectedRoute: React.FC<CommandProtectedRouteProps> = ({ children }) => {
  const isAuth  = localStorage.getItem('commandCentreAuth') === 'true';
  const hasToken = !!localStorage.getItem('authToken');

  if (!isAuth || !hasToken) {
    return <Navigate to="/commandlogin" replace />;
  }

  return <>{children}</>;
};
