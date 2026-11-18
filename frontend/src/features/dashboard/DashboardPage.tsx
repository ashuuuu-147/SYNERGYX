import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Zap,
  Droplets,
  Flame,
  IndianRupee,
  Layers,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle2,
  ListTodo,
  AlertCircle,
  Calendar,
} from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { dashboardApi, DashboardSummary } from './dashboardApi';
import { authApi } from '../auth/authApi';
import { queryKeys } from '../../lib/queryKeys';

export const DashboardPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 1. User profile query for personalized greeting
  const { data: userProfile } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.getMe,
  });

  // 2. Dashboard summary query
  const {
    data: summary,
    isLoading,
    isError,
    error,
  } = useQuery<DashboardSummary>({
    queryKey: queryKeys.dashboard.summary(selectedMonth || undefined),
    queryFn: () => dashboardApi.getSummary(selectedMonth || undefined),
    placeholderData: (previousData) => previousData,
  });

  const displayedMonth = selectedMonth || (summary?.selected_month ? summary.selected_month.substring(0, 7) : '');
  const firstName = userProfile?.user?.full_name ? userProfile.user.full_name.split(' ')[0] : 'there';


  if (isLoading && !summary) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <LoadingSkeleton height="36px" width="300px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <LoadingSkeleton height="130px" />
          <LoadingSkeleton height="130px" />
          <LoadingSkeleton height="130px" />
          <LoadingSkeleton height="130px" />
          <LoadingSkeleton height="130px" />
          <LoadingSkeleton height="130px" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
        <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
        <p>{error instanceof Error ? error.message : 'Could not load dashboard metrics.'}</p>
      </Card>
    );
  }

  const isCompletelyEmpty =
    summary && summary.utility_recorded_count === 0 && summary.production_quantity == null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>
            {`Welcome back, ${firstName}`}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Facility sustainability metrics and resource performance overview
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <Calendar size={15} color="var(--text-secondary)" />
            <input
              id="dashboard-month-selector"
              aria-label="Select dashboard month"
              type="month"
              value={displayedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <Link to="/app/records">
            <Button variant="primary" size="sm">
              <Plus size={16} />
              <span>Add Data</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Coverage Notice */}
      {summary && !isCompletelyEmpty && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-default)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant={summary.utility_recorded_count === 3 ? 'success' : 'default'}>
              {summary.utility_data_coverage}
            </Badge>
            {summary.is_partial_spend && (
              <Badge variant="warning">Partial Spend: {summary.cost_data_coverage}</Badge>
            )}
          </div>
          <Link to="/app/analytics" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600 }}>
            <span>View Full Analytics</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* KPI Cards — Pure API backed */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <KpiCard
          title="Electricity Used"
          value={summary?.electricity.quantity != null ? Number(summary.electricity.quantity).toLocaleString() : null}
          unit={summary?.electricity.unit || 'kWh'}
          changePercent={summary?.electricity.change_percent != null ? Number(summary.electricity.change_percent) : null}
          subtitle={summary?.electricity.quantity == null ? 'No record for this month' : undefined}
          icon={<Zap size={20} color="var(--resource-electricity)" />}
        />
        <KpiCard
          title="Water Used"
          value={summary?.water.quantity != null ? Number(summary.water.quantity).toLocaleString() : null}
          unit={summary?.water.unit || 'm³'}
          changePercent={summary?.water.change_percent != null ? Number(summary.water.change_percent) : null}
          subtitle={summary?.water.quantity == null ? 'No record for this month' : undefined}
          icon={<Droplets size={20} color="var(--resource-water)" />}
        />
        <KpiCard
          title="Fuel Used"
          value={summary?.fuel.quantity != null ? Number(summary.fuel.quantity).toLocaleString() : null}
          unit={summary?.fuel.unit || 'L'}
          changePercent={summary?.fuel.change_percent != null ? Number(summary.fuel.change_percent) : null}
          subtitle={summary?.fuel.quantity == null ? 'No record for this month' : undefined}
          icon={<Flame size={20} color="var(--resource-fuel)" />}
        />
        <KpiCard
          title="Utility Spend"
          value={summary?.total_spend_inr != null ? Number(summary.total_spend_inr).toLocaleString('en-IN') : null}
          unit="₹"
          subtitle={
            summary?.total_spend_inr == null
              ? 'No cost records'
              : summary.is_partial_spend
              ? `Partial (${summary.cost_data_coverage})`
              : 'Complete cost coverage'
          }
          icon={<IndianRupee size={20} color="var(--brand-primary)" />}
        />
        <KpiCard
          title="Production Output"
          value={summary?.production_quantity != null ? Number(summary.production_quantity).toLocaleString() : null}
          unit={summary?.production_unit}
          subtitle={summary?.production_quantity == null ? 'No production entered' : undefined}
          icon={<Layers size={20} color="var(--resource-production)" />}
        />
        <KpiCard
          title="Electricity Intensity"
          value={summary?.electricity.intensity != null ? Number(summary.electricity.intensity).toFixed(2) : null}
          unit={summary?.electricity.intensity_unit || `${summary?.electricity.unit || 'kWh'}/${summary?.production_unit || 'unit'}`}
          changePercent={summary?.electricity.change_percent != null ? Number(summary.electricity.change_percent) : null}
          subtitle={
            summary?.electricity.intensity == null
              ? summary?.production_quantity == null
                ? 'Requires production data'
                : 'No electricity record'
              : undefined
          }
          icon={<TrendingUp size={20} color="var(--brand-primary)" />}
        />
      </div>

      {/* Guided Empty State if completely unpopulated */}
      {isCompletelyEmpty ? (
        <Card>
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
        </Card>
      ) : (
        /* Action and Performance Panels */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
          {/* Observed Reduction Panel */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Performance Highlights</h3>
              <Badge variant="default">Observed Reduction</Badge>
            </div>

            {summary?.electricity.observed_resource_reduction != null && Number(summary.electricity.observed_resource_reduction) > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>
                      {Number(summary.electricity.observed_resource_reduction).toLocaleString()} kWh reduced
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Observed reduction vs previous month at current production level
                    </div>
                  </div>
                </div>

                {summary.electricity.potential_saving_inr != null && (
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                    <strong>Potential monetary saving:</strong> ₹{Number(summary.electricity.potential_saving_inr).toLocaleString('en-IN')}{' '}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(based on prior month average tariff)</span>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {summary?.electricity.change_percent != null && Number(summary.electricity.change_percent) >= 0
                  ? 'Electricity consumption intensity increased or remained steady vs previous month. Check Analytics for detailed breakdowns.'
                  : 'Add consecutive monthly records to evaluate observed efficiency improvements and trend comparisons.'}
              </p>
            )}

            <Link to="/app/analytics" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
              <Button variant="ghost" size="sm">
                <span>Explore Full Charts</span>
                <ArrowRight size={14} />
              </Button>
            </Link>
          </Card>

          {/* Action Activity Panel */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Action Tracker Status</h3>
              <ListTodo size={18} color="var(--brand-primary)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {summary?.open_actions_count || 0}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Open Action Items
                </div>
              </div>

              <div style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>
                  {summary?.completed_actions_count || 0}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Completed Actions
                </div>
              </div>
            </div>

            <Link to="/app/actions" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
              <Button variant="outline" size="sm">
                <span>Manage Action Items</span>
                <ArrowRight size={14} />
              </Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
};
