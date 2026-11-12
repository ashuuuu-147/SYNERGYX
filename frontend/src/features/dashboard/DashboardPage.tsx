import React from 'react';
import { KpiCard } from '../../components/ui/KpiCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Zap, Droplets, Flame, IndianRupee, Layers, TrendingUp, Plus } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Manufacturing Overview</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Real-time consumption and intensity metrics for your facility
          </p>
        </div>
        <Link to="/app/records">
          <Button variant="primary">
            <Plus size={16} />
            <span>Add Utility Record</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards — All values are null until API data is wired in T16/T17 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <KpiCard
          title="Electricity Used"
          value={null}
          unit="kWh"
          subtitle="Add utility record"
          icon={<Zap size={20} />}
        />
        <KpiCard
          title="Water Used"
          value={null}
          unit="m³"
          subtitle="Add utility record"
          icon={<Droplets size={20} />}
        />
        <KpiCard
          title="Fuel Used"
          value={null}
          unit="L"
          subtitle="Add utility record"
          icon={<Flame size={20} />}
        />
        <KpiCard
          title="Utility Spend"
          value={null}
          unit="₹"
          subtitle="No cost records"
          icon={<IndianRupee size={20} />}
        />
        <KpiCard
          title="Production"
          value={null}
          subtitle="Add production output"
          icon={<Layers size={20} />}
        />
        <KpiCard
          title="Electricity Intensity"
          value={null}
          subtitle="Requires production"
          icon={<TrendingUp size={20} />}
        />
      </div>

      {/* Guided Setup Empty State */}
      <EmptyState
        icon={<Zap size={32} />}
        title="No Utility or Production Records"
        description="To calculate resource intensity, month-over-month trends, and evidence-based insights, start by adding your monthly utility records."
        action={
          <Link to="/app/records">
            <Button variant="primary">Enter First Record</Button>
          </Link>
        }
      />
    </div>
  );
};
