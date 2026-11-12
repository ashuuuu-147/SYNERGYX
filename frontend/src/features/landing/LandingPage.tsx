import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Zap, BarChart3, ShieldCheck } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Navigation Header */}
      <header
        style={{
          height: '72px',
          padding: '0 var(--space-8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            }}
          >
            SX
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px' }}>
            SYNERGYX
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: 'var(--space-12) var(--space-6)',
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--brand-primary)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Industrial Resource Intelligence
        </span>
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 800,
            marginTop: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            color: 'var(--brand-deep)',
          }}
        >
          Intelligence That Drives Industry.
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-8)',
            lineHeight: 1.6,
          }}
        >
          Understand monthly electricity, water, fuel, and production data. Calculate production-normalized
          resource intensity, surface evidence-based insights, and track operational improvements transparently.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link to="/register">
            <Button size="lg" variant="primary">
              Start Free Trial
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Sign In to Platform
            </Button>
          </Link>
        </div>
      </section>

      {/* Core Capabilities */}
      <section
        style={{
          padding: 'var(--space-10) var(--space-8)',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        <Card>
          <Zap size={28} color="var(--brand-primary)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Resource Tracking
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Record monthly electricity (kWh), water (m³), and fuel (L) alongside production output.
          </p>
        </Card>

        <Card>
          <BarChart3 size={28} color="var(--info)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Production Intensity
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Normalize resource consumption against units produced to evaluate real efficiency.
          </p>
        </Card>

        <Card>
          <ShieldCheck size={28} color="var(--success)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Evidence-Based Actions
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Turn observations into actionable operational improvements with tracked before-and-after baselines.
          </p>
        </Card>
      </section>
    </div>
  );
};
