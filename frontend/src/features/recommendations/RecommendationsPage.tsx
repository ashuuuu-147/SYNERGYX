import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingDown,
  ListOrdered,
  AlertTriangle,
  IndianRupee,
} from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  recommendationsApi,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationSummary,
} from './recommendationsApi';
import { queryKeys } from '../../lib/queryKeys';

export const RecommendationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const {
    data: recommendations,
    isLoading,
    isError,
    error,
  } = useQuery<RecommendationSummary[]>({
    queryKey: queryKeys.recommendations.list({ status: statusFilter, priority: priorityFilter }),
    queryFn: () =>
      recommendationsApi.listRecommendations({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      }),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => recommendationsApi.acceptRecommendation(id),
    onSuccess: (updated) => {
      setActionMessage(`Accepted "${updated.title}". Linked task created in Action Tracker.`);
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: Error) => {
      setActionMessage(`Error accepting recommendation: ${err.message}`);
      setTimeout(() => setActionMessage(null), 5000);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => recommendationsApi.dismissRecommendation(id),
    onSuccess: (updated) => {
      setActionMessage(`Dismissed "${updated.title}".`);
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: Error) => {
      setActionMessage(`Error dismissing recommendation: ${err.message}`);
      setTimeout(() => setActionMessage(null), 5000);
    },
  });

  const getPriorityBadgeVariant = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: RecommendationStatus) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'dismissed':
        return 'default';
      case 'completed':
        return 'success';
      case 'proposed':
      default:
        return 'warning';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Practical Recommendations</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Operational efficiency measures qualified with 'where applicable' and linked action tracking
          </p>
        </div>

        <Link to="/app/actions">
          <Button variant="outline" size="sm">
            <span>View Action Tracker</span>
            <ArrowRight size={14} />
          </Button>
        </Link>
      </div>

      {/* Action Message Feedback */}
      {actionMessage && (
        <div style={{ padding: '10px 16px', background: 'var(--brand-surface)', border: '1px solid var(--brand-secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="var(--brand-primary)" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-card-subtle)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            {(['all', 'proposed', 'accepted', 'dismissed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  backgroundColor: statusFilter === s ? 'var(--brand-primary)' : 'transparent',
                  color: statusFilter === s ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Priority Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="rec-priority-filter" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Priority:
            </label>
            <select
              id="rec-priority-filter"
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Priorities</option>
              <option value="high">High only</option>
              <option value="medium">Medium only</option>
              <option value="low">Low only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <LoadingSkeleton height="160px" />
          <LoadingSkeleton height="160px" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 12px' }} />
          <p>{error instanceof Error ? error.message : 'Could not load recommendations.'}</p>
        </Card>
      )}

      {/* Populated List or Empty State */}
      {!isLoading && !isError && (
        <>
          {(recommendations || []).length === 0 ? (
            <Card>
              <EmptyState
                icon={<Lightbulb size={28} />}
                title="No Recommendations"
                description={
                  statusFilter !== 'all' || priorityFilter !== 'all'
                    ? "No recommendations match the selected filters."
                    : "No recommendations have been generated yet. Navigate to Insights and run analysis on monthly data."
                }
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {(recommendations || []).map((rec) => (
                <Card key={rec.id} style={{ padding: 'var(--space-6)' }}>
                  {/* Badges Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant={getPriorityBadgeVariant(rec.priority)}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(rec.status)}>
                        {rec.status.toUpperCase()}
                      </Badge>
                    </div>

                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Created: {new Date(rec.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                    {rec.title}
                  </h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)', marginBottom: '14px' }}>
                    {rec.description}
                  </p>

                  {/* Implementation Steps */}
                  {rec.steps_json && rec.steps_json.length > 0 && (
                    <div style={{ marginBottom: '16px', background: 'var(--bg-card-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ListOrdered size={14} /> RECOMMENDED IMPLEMENTATION STEPS (WHERE APPLICABLE)
                      </div>
                      <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {rec.steps_json.map((step, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Estimated Savings (Only when calculable) */}
                  {(rec.estimated_saving_quantity != null || rec.estimated_saving_inr != null) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '10px 14px', background: 'var(--brand-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-secondary)', marginBottom: '16px', fontSize: '13px' }}>
                      {rec.estimated_saving_quantity != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <TrendingDown size={15} color="var(--brand-primary)" />
                          <span>Estimated Reduction: <strong>{Number(rec.estimated_saving_quantity).toLocaleString()} {rec.estimated_saving_unit || ''}</strong></span>
                        </div>
                      )}
                      {rec.estimated_saving_inr != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IndianRupee size={15} color="var(--brand-primary)" />
                          <span>Potential Monetary Saving: <strong>₹{Number(rec.estimated_saving_inr).toLocaleString()}</strong></span>
                        </div>
                      )}
                      {rec.assumptions && (
                        <div style={{ width: '100%', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          * {rec.assumptions}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
                    {rec.status === 'proposed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissMutation.mutate(rec.id)}
                          disabled={dismissMutation.isPending || acceptMutation.isPending}
                        >
                          <XCircle size={14} />
                          <span>Dismiss</span>
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => acceptMutation.mutate(rec.id)}
                          disabled={acceptMutation.isPending || dismissMutation.isPending}
                        >
                          <CheckCircle2 size={14} />
                          <span>{acceptMutation.isPending ? 'Accepting...' : 'Accept Recommendation'}</span>
                        </Button>
                      </>
                    )}

                    {rec.status === 'accepted' && (
                      <Link to="/app/actions">
                        <Button variant="outline" size="sm">
                          <CheckCircle2 size={14} color="var(--success)" />
                          <span>View in Action Tracker</span>
                          <ArrowRight size={14} />
                        </Button>
                      </Link>
                    )}

                    {rec.status === 'dismissed' && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Recommendation dismissed
                      </span>
                    )}
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
