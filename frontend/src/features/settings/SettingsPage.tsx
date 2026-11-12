import React from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const SettingsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Organization Settings</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Manage your business profile, production unit, and AI preferences
        </p>
      </div>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Business Profile</h3>
        <Input label="Organization / Factory Name" defaultValue="Acme Manufacturing Ltd" />
        <Input label="Industry" defaultValue="Textile" disabled />
        <Input label="Location" defaultValue="Gujarat, India" />
        <Button variant="primary" style={{ alignSelf: 'flex-start' }}>
          Save Profile
        </Button>
      </Card>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>AI Privacy & Explanation Consent</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          External AI is strictly opt-in and disabled by default. If enabled, only aggregated non-identifying
          metrics are sent to generate plain-language explanations. Raw invoices, personal names, and locations
          are never transmitted.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input type="checkbox" id="ai-consent" disabled />
          <label htmlFor="ai-consent" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Allow external AI explanations (Requires active organization profile)
          </label>
        </div>
      </Card>
    </div>
  );
};

