import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStorage } from '../../lib/authStorage';

export const ProtectedRoute: React.FC = () => {
  const location = useLocation();

  if (!authStorage.isAuthenticated()) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />;
  }

  return <Outlet />;
};

