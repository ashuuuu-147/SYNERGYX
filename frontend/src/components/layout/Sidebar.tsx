import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  LineChart,
  Sparkles,
  Lightbulb,
  ClipboardCheck,
  FileBarChart,
  Settings,
} from 'lucide-react';

export interface SidebarProps {
  onItemClick?: () => void;
}

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/records', label: 'Records', icon: Database },
  { to: '/app/analytics', label: 'Analytics', icon: LineChart },
  { to: '/app/insights', label: 'Insights', icon: Sparkles },
  { to: '/app/recommendations', label: 'Recommendations', icon: Lightbulb },
  { to: '/app/actions', label: 'Action Tracker', icon: ClipboardCheck },
  { to: '/app/reports', label: 'Reports', icon: FileBarChart },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  return (
    <aside
      style={{
        width: '248px',
        height: '100vh',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Logo & Brand */}
      <div
        style={{
          height: '72px',
          padding: '0 var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <Link
          to="/app/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-inverse)',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            SX
          </div>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '0.5px',
              color: 'var(--brand-deep)',
            }}
          >
            SYNERGYX
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav
        style={{
          padding: 'var(--space-4) var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--brand-deep)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--brand-soft)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--brand-primary)' : '3px solid transparent',
                transition: 'all var(--duration-fast) var(--ease-standard)',
                textDecoration: 'none',
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--border-default)',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        <span>SYNERGYX MVP v1.0</span>
      </div>
    </aside>
  );
};
