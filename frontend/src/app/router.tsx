import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

// Lazy-loaded routes for code splitting and fast page reloads
const LandingPage = React.lazy(() => import('../features/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = React.lazy(() => import('../features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('../features/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = React.lazy(() => import('../features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const RecordsPage = React.lazy(() => import('../features/records/RecordsPage').then(m => ({ default: m.RecordsPage })));
const AnalyticsPage = React.lazy(() => import('../features/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const InsightsPage = React.lazy(() => import('../features/insights/InsightsPage').then(m => ({ default: m.InsightsPage })));
const RecommendationsPage = React.lazy(() => import('../features/recommendations/RecommendationsPage').then(m => ({ default: m.RecommendationsPage })));
const ActionsPage = React.lazy(() => import('../features/actions/ActionsPage').then(m => ({ default: m.ActionsPage })));
const ReportsPage = React.lazy(() => import('../features/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = React.lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

const Suspended: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '260px',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
      >
        Loading...
      </div>
    }
  >
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspended><LandingPage /></Suspended>,
  },
  {
    path: '/login',
    element: <Suspended><LoginPage /></Suspended>,
  },
  {
    path: '/register',
    element: <Suspended><RegisterPage /></Suspended>,
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Navigate to="/app/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <Suspended><DashboardPage /></Suspended>,
          },
          {
            path: 'records',
            element: <Suspended><RecordsPage /></Suspended>,
          },
          {
            path: 'analytics',
            element: <Suspended><AnalyticsPage /></Suspended>,
          },
          {
            path: 'insights',
            element: <Suspended><InsightsPage /></Suspended>,
          },
          {
            path: 'recommendations',
            element: <Suspended><RecommendationsPage /></Suspended>,
          },
          {
            path: 'actions',
            element: <Suspended><ActionsPage /></Suspended>,
          },
          {
            path: 'reports',
            element: <Suspended><ReportsPage /></Suspended>,
          },
          {
            path: 'settings',
            element: <Suspended><SettingsPage /></Suspended>,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
