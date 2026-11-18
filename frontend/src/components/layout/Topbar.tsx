import React from 'react';
import { Menu, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authStorage } from '../../lib/authStorage';

export interface TopbarProps {
  title: string;
  onMenuToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, onMenuToggle }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authStorage.clearToken();
    navigate('/login');
  };

  return (
    <header
      className="glass-topbar"
      style={{
        height: '72px',
        padding: '0 var(--space-8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            aria-label="Toggle mobile navigation menu"
            className="btn-animated btn-animated-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            <Menu size={22} />
          </button>
        )}
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 800,
            letterSpacing: '-0.2px',
            color: 'var(--brand-deep)',
          }}
        >
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          to="/app/settings"
          aria-label="Open settings"
          className="btn-animated btn-animated-ghost"
          style={{
            padding: '8px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-card)',
          }}
        >
          <SettingsIcon size={18} />
        </Link>
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="btn-animated btn-animated-outline"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <LogOut size={15} />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
};
