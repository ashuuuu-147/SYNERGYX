import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const routeTitles: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/records': 'Utility & Production Records',
  '/app/analytics': 'Resource Analytics',
  '/app/insights': 'Insights',
  '/app/recommendations': 'Recommendations',
  '/app/actions': 'Action Tracker',
  '/app/reports': 'Monthly Reports',
  '/app/settings': 'Settings',
};

export const AppShell: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const title = routeTitles[location.pathname] || 'SYNERGYX';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Desktop Sidebar (hidden on mobile via CSS) */}
      <div className="desktop-sidebar-container">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(41, 36, 59, 0.4)',
            display: 'flex',
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            style={{ width: '260px', height: '100%', backgroundColor: 'var(--bg-sidebar)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          title={title}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <main
          style={{
            flex: 1,
            padding: 'var(--space-8)',
            maxWidth: '1440px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
