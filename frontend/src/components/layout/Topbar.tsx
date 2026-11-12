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
      style={{
        height: '72px',
        padding: '0 var(--space-8)',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-default)',
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
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link
          to="/app/settings"
          aria-label="Open settings"
          style={{
            padding: '8px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <SettingsIcon size={20} />
        </Link>
        <button
          onClick={handleLogout}
          aria-label="Log out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-main)',
          }}
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
};

