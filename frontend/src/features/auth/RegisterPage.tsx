import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const RegisterPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--bg-main)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: '480px', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Create Your Account</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Set up your organization on SYNERGYX
          </p>
        </div>

        <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input label="Full Name" type="text" placeholder="Ashutosh Singh" required />
          <Input label="Work Email" type="email" placeholder="name@company.com" required />
          <Input label="Organization / Factory Name" type="text" placeholder="Acme Textiles Ltd" required />
          <Input label="Password" type="password" placeholder="Minimum 10 characters" required />

          <Button type="submit" variant="primary" style={{ marginTop: '8px' }}>
            Create Account
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};
