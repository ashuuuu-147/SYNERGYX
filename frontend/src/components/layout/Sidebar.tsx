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
      className="glass-sidebar"
      style={{
        width: '248px',
        height: '100vh',
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
          borderBottom: '1px solid var(--border-glass)',
        }}
      >
        <Link
          to="/app/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-inverse)',
              fontWeight: 800,
              fontSize: '15px',
              boxShadow: 'var(--glow-sm)',
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
                background: isActive
                  ? 'linear-gradient(135deg, rgba(124, 92, 252, 0.12) 0%, rgba(180, 165, 223, 0.08) 100%)'
                  : 'transparent',
                borderLeft: isActive ? '3px solid var(--brand-primary)' : '3px solid transparent',
                transition: 'all var(--duration-fast) var(--ease-standard)',
                textDecoration: 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    style={{
                      color: isActive ? 'var(--brand-primary)' : 'inherit',
                      transition: 'color var(--duration-fast) var(--ease-standard)',
                    }}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--border-glass)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>SYNERGYX Platform</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-soft)',
            color: 'var(--brand-primary)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--success)',
            }}
          />
          Live
        </span>
      </div>
    </aside>
  );
};
