import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  RotateCcw,
  Zap,
  Droplets,
  Flame,
  Layers,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Bot,
} from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { insightsApi, InsightResponse, InsightSeverity } from './insightsApi';
import { queryKeys } from '../../lib/queryKeys';

export const InsightsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const {
    data: insights,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<InsightResponse[]>({
    queryKey: queryKeys.insights.list(selectedMonth || undefined),
    queryFn: () => insightsApi.listInsights(selectedMonth || undefined),
  });

  const generateMutation = useMutation({
    mutationFn: (targetMonth: string) => insightsApi.generateInsights(targetMonth),
    onSuccess: (data) => {
      setActionMessage(`Generated ${data.insights_generated_count} insights for ${data.month}.`);
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: Error) => {
      setActionMessage(`Failed to generate insights: ${err.message}`);
      setTimeout(() => setActionMessage(null), 5000);
    },
  });

  const handleGenerate = () => {
    // Determine effective target month
    let target = selectedMonth;
    if (!target) {
      if (insights && insights.length > 0) {
        target = insights[0].period_month.substring(0, 7);
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        target = `${year}-${month}`;
      }
    }
    generateMutation.mutate(target);
  };

  const filteredInsights = (insights || []).filter((i) => {
    if (severityFilter !== 'all' && i.severity !== severityFilter) {
      return false;
    }
    return true;
  });

  const getSeverityBadgeVariant = (sev: InsightSeverity) => {
    switch (sev) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'default';
    }
  };

  const getResourceIcon = (resType: string | null) => {
    switch (resType) {
      case 'electricity':
        return <Zap size={16} color="#5b4cdb" />;
      case 'water':
        return <Droplets size={16} color="#0ea5e9" />;
      case 'fuel':
        return <Flame size={16} color="#f59e0b" />;
      default:
        return <Layers size={16} color="var(--text-secondary)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header and Generate Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Operational Insights</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Evidence-based findings evaluated by deterministic rules and non-identifying AI assistance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw size={14} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            <Sparkles size={16} />
            <span>{generateMutation.isPending ? 'Analyzing Data...' : 'Generate Insights'}</span>
          </Button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div style={{ padding: '10px 16px', background: 'var(--brand-surface)', border: '1px solid var(--brand-secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="var(--brand-primary)" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Month Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="insight-month-filter" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Billing Month:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <Calendar size={14} color="var(--text-secondary)" />
                <input
                  id="insight-month-filter"
                  aria-label="Filter insights by month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                />
              </div>
              {selectedMonth && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('')}
                  style={{ fontSize: '12px', color: 'var(--brand-primary)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="insight-severity-filter" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Severity:
              </label>
              <select
                id="insight-severity-filter"
                aria-label="Filter by severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                style={{
                  padding: '5px 12px',
                  fontSize: '13px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Severities</option>
                <option value="high">High only</option>
                <option value="medium">Medium only</option>
                <option value="low">Low only</option>
              </select>
            </div>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing {filteredInsights.length} of {insights?.length || 0} insights
          </span>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <LoadingSkeleton height="140px" />
          <LoadingSkeleton height="140px" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 12px' }} />
          <p>{error instanceof Error ? error.message : 'Could not load insights.'}</p>
        </Card>
      )}

      {/* Populated Insights List or Empty State */}
      {!isLoading && !isError && (
        <>
          {filteredInsights.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Sparkles size={28} />}
                title="No Insights Found"
                description={
                  selectedMonth
                    ? `No insights have been calculated for ${selectedMonth}. Click 'Generate Insights' above to run analysis.`
                    : "No insights have been generated yet. Enter monthly data in Records and click 'Generate Insights' to run deterministic anomaly checks."
                }
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {filteredInsights.map((insight) => (
                <Card key={insight.id} style={{ padding: 'var(--space-6)' }}>
                  {/* Top Badges Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
                        {getResourceIcon(insight.resource_type)}
                        <span style={{ textTransform: 'capitalize' }}>{insight.resource_type || 'General Operations'}</span>
                      </span>

                      <Badge variant={getSeverityBadgeVariant(insight.severity)}>
                        {insight.severity.toUpperCase()} PRIORITY
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {insight.source_type === 'ai_assisted' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--brand-surface)', color: 'var(--brand-primary)', fontSize: '11px', fontWeight: 600 }}>
                          <Bot size={13} /> AI-Assisted (Consented)
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-subtle)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                          <ShieldCheck size={13} /> Deterministic Rule
                        </span>
                      )}

                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Month: {insight.period_month.substring(0, 7)}
                      </span>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                    {insight.title}
                  </h3>

                  <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)', marginBottom: '14px' }}>
                    {insight.summary}
                  </p>

                  {/* Observed Facts Box */}
                  {(insight.observed_value != null || insight.change_percent != null) && (
                    <div style={{ display: 'flex', gap: '20px', padding: '10px 14px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', marginBottom: '14px', fontSize: '13px' }}>
                      {insight.observed_value != null && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Observed: </span>
                          <strong>{Number(insight.observed_value).toFixed(4)} {insight.unit || ''}</strong>
                        </div>
                      )}
                      {insight.comparison_value != null && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Prior Month: </span>
                          <strong>{Number(insight.comparison_value).toFixed(4)} {insight.unit || ''}</strong>
                        </div>
                      )}
                      {insight.change_percent != null && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Change: </span>
                          <strong style={{ color: Number(insight.change_percent) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {Number(insight.change_percent) > 0 ? `+${Number(insight.change_percent).toFixed(1)}%` : `${Number(insight.change_percent).toFixed(1)}%`}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Caveat and Recommendations Link Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '75%' }}>
                      <Info size={14} style={{ flexShrink: 0 }} />
                      <span>{insight.caveat || 'Rule heuristic evaluation.'}</span>
                    </div>

                    <Link
                      to="/app/recommendations"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--brand-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      <span>View Recommendations</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
