import { createBrowserRouter, Navigate } from 'react-router-dom';

// Simple placeholder shells for T03, styled and implemented fully in T04
const LandingPage = () => <div data-testid="landing-page">SYNERGYX — Industrial Resource Intelligence</div>;
const LoginPage = () => <div data-testid="login-page">Sign In</div>;
const RegisterPage = () => <div data-testid="register-page">Register</div>;

const DashboardPage = () => <div data-testid="dashboard-page">Dashboard</div>;
const RecordsPage = () => <div data-testid="records-page">Utility & Production Records</div>;
const AnalyticsPage = () => <div data-testid="analytics-page">Resource Analytics</div>;
const InsightsPage = () => <div data-testid="insights-page">Insights</div>;
const RecommendationsPage = () => <div data-testid="recommendations-page">Recommendations</div>;
const ActionsPage = () => <div data-testid="actions-page">Action Tracker</div>;
const ReportsPage = () => <div data-testid="reports-page">Reports</div>;
const SettingsPage = () => <div data-testid="settings-page">Settings</div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/app',
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    path: '/app/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/app/records',
    element: <RecordsPage />,
  },
  {
    path: '/app/analytics',
    element: <AnalyticsPage />,
  },
  {
    path: '/app/insights',
    element: <InsightsPage />,
  },
  {
    path: '/app/recommendations',
    element: <RecommendationsPage />,
  },
  {
    path: '/app/actions',
    element: <ActionsPage />,
  },
  {
    path: '/app/reports',
    element: <ReportsPage />,
  },
  {
    path: '/app/settings',
    element: <SettingsPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
