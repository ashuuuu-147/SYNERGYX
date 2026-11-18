import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Zap, BarChart3, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Glass Navigation Header */}
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
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              fontSize: '19px',
              letterSpacing: '0.4px',
              color: 'var(--brand-deep)',
            }}
          >
            SYNERGYX
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" style={{ gap: '6px' }}>
              <span>Get Started</span>
              <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: 'var(--space-12) var(--space-6)',
          textAlign: 'center',
          maxWidth: '920px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-surface)',
            border: '1px solid var(--border-default)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Sparkles size={14} color="var(--brand-primary)" />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--brand-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            Industrial Resource Intelligence
          </span>
        </div>

        <h1
          className="gradient-text-hero"
          style={{
            fontSize: '52px',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 'var(--space-4)',
            letterSpacing: '-1px',
          }}
        >
          Intelligence That Drives Industry.
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-8)',
            lineHeight: 1.65,
            maxWidth: '780px',
            margin: '0 auto var(--space-8) auto',
          }}
        >
          Understand monthly electricity, water, fuel, and production data. Calculate production-normalized
          resource intensity, surface evidence-based insights, and track operational improvements transparently.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/register">
            <Button size="lg" variant="primary" style={{ gap: '8px' }}>
              <span>Start Free Trial</span>
              <ArrowRight size={16} />
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
        <Card glass>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--resource-electricity-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            <Zap size={24} color="var(--resource-electricity)" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--brand-deep)' }}>
            Resource Tracking
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Record monthly electricity (kWh), water (m³), and fuel (L) alongside production output with instant CSV import.
          </p>
        </Card>

        <Card glass>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--resource-water-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            <BarChart3 size={24} color="var(--resource-water)" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--brand-deep)' }}>
            Production Intensity
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Normalize resource consumption against units produced to evaluate real plant efficiency without distortion.
          </p>
        </Card>

        <Card glass>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--resource-production-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            <ShieldCheck size={24} color="var(--resource-production)" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--brand-deep)' }}>
            Evidence-Based Actions
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Turn observations into actionable operational improvements with tracked before-and-after baseline metrics.
          </p>
        </Card>
      </section>
    </div>
  );
};
