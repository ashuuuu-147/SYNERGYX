import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ClipboardCheck,
  Plus,
  Play,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Trash2,
  AlertTriangle,
  Lightbulb,
  Clock,
} from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  actionsApi,
  ActionResponse,
  ActionStatus,
} from './actionsApi';
import { queryKeys } from '../../lib/queryKeys';

const actionSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(180),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  due_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type ActionFormData = z.infer<typeof actionSchema>;

export const ActionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<ActionResponse | null>(null);
  const [deletingAction, setDeletingAction] = useState<ActionResponse | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const {
    data: actions,
    isLoading,
    isError,
    error,
  } = useQuery<ActionResponse[]>({
    queryKey: queryKeys.actions.list({ status: statusFilter }),
    queryFn: () => actionsApi.listActions({ status: statusFilter }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActionFormData>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      due_date: '',
      notes: '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: ActionFormData) => {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        due_date: data.due_date || undefined,
        notes: data.notes || undefined,
      };

      if (editingAction) {
        return actionsApi.updateAction(editingAction.id, payload);
      }
      return actionsApi.createAction(payload);
    },
    onSuccess: (saved) => {
      setActionMessage(`Action "${saved.title}" saved successfully.`);
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsDrawerOpen(false);
      setEditingAction(null);
      reset();
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: Error) => {
      setActionMessage(`Error saving action: ${err.message}`);
      setTimeout(() => setActionMessage(null), 5000);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActionStatus }) =>
      actionsApi.updateAction(id, { status }),
    onSuccess: (updated) => {
      setActionMessage(`Action status updated to ${updated.status}.`);
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setActionMessage(null), 3000);
    },
    onError: (err: Error) => {
      setActionMessage(`Error updating status: ${err.message}`);
      setTimeout(() => setActionMessage(null), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => actionsApi.deleteAction(id),
    onSuccess: () => {
      setActionMessage('Action deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletingAction(null);
      setTimeout(() => setActionMessage(null), 3000);
    },
    onError: (err: Error) => {
      setActionMessage(`Error deleting action: ${err.message}`);
      setTimeout(() => setActionMessage(null), 5000);
    },
  });

  const handleOpenCreate = () => {
    setEditingAction(null);
    reset({
      title: '',
      description: '',
      status: 'pending',
      due_date: '',
      notes: '',
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (action: ActionResponse) => {
    setEditingAction(action);
    reset({
      title: action.title,
      description: action.description || '',
      status: action.status,
      due_date: action.due_date || '',
      notes: action.notes || '',
    });
    setIsDrawerOpen(true);
  };

  const onSubmit = (data: ActionFormData) => {
    saveMutation.mutate(data);
  };

  const getStatusBadgeVariant = (st: ActionStatus) => {
    switch (st) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'cancelled':
        return 'default';
      case 'pending':
      default:
        return 'default';
    }
  };

  const isOverdue = (dueDateStr: string | null, status: ActionStatus) => {
    if (!dueDateStr || status === 'completed' || status === 'cancelled') return false;
    const today = new Date().toISOString().substring(0, 10);
    return dueDateStr < today;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Action Tracker</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Log, assign, and track operational interventions and equipment maintenance tasks
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>New Action</span>
        </Button>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div style={{ padding: '10px 16px', background: 'var(--brand-surface)', border: '1px solid var(--brand-secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="var(--brand-primary)" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-card-subtle)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map((s) => (
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
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing {actions?.length || 0} actions
          </span>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <LoadingSkeleton height="150px" />
          <LoadingSkeleton height="150px" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 12px' }} />
          <p>{error instanceof Error ? error.message : 'Could not load actions.'}</p>
        </Card>
      )}

      {/* Populated List or Empty State */}
      {!isLoading && !isError && (
        <>
          {(actions || []).length === 0 ? (
            <Card>
              <EmptyState
                icon={<ClipboardCheck size={28} />}
                title="No Actions Found"
                description={
                  statusFilter !== 'all'
                    ? "No actions match the selected status filter."
                    : "No actions have been logged yet. Accept a recommendation or click 'New Action' above to start tracking operational tasks."
                }
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {(actions || []).map((action) => {
                const overdue = isOverdue(action.due_date, action.status);

                return (
                  <Card key={action.id} style={{ padding: 'var(--space-6)' }}>
                    {/* Top Status & Date Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge variant={getStatusBadgeVariant(action.status)}>
                          {action.status.replace('_', ' ').toUpperCase()}
                        </Badge>

                        {action.due_date && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: overdue ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: overdue ? 700 : 500 }}>
                            <Clock size={13} />
                            Due: {action.due_date} {overdue ? '(OVERDUE)' : ''}
                          </span>
                        )}

                        {action.completed_at && (
                          <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
                            ✓ Completed on {new Date(action.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Edit ${action.title}`}
                          onClick={() => handleOpenEdit(action)}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Delete ${action.title}`}
                          onClick={() => setDeletingAction(action)}
                        >
                          <Trash2 size={13} color="var(--danger)" />
                        </Button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                      {action.title}
                    </h3>

                    {action.description && (
                      <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)', marginBottom: '12px' }}>
                        {action.description}
                      </p>
                    )}

                    {/* Linked Recommendation Tag */}
                    {action.recommendation_title && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--brand-surface)', color: 'var(--brand-primary)', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
                        <Lightbulb size={14} />
                        <span>Origin: {action.recommendation_title}</span>
                      </div>
                    )}

                    {/* Notes Box */}
                    {action.notes && (
                      <div style={{ padding: '8px 12px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        <strong>Notes: </strong>{action.notes}
                      </div>
                    )}

                    {/* Quick Status Transition Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-default)' }}>
                      {action.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: action.id, status: 'in_progress' })}
                          disabled={statusMutation.isPending}
                        >
                          <Play size={13} />
                          <span>Start Action</span>
                        </Button>
                      )}

                      {(action.status === 'pending' || action.status === 'in_progress') && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: action.id, status: 'completed' })}
                          disabled={statusMutation.isPending}
                        >
                          <CheckCircle2 size={13} />
                          <span>Mark Completed</span>
                        </Button>
                      )}

                      {action.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: action.id, status: 'in_progress' })}
                          disabled={statusMutation.isPending}
                        >
                          <RotateCcw size={13} />
                          <span>Reopen Action</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Action Drawer */}
      {isDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-card)', height: '100%', overflowY: 'auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
              {editingAction ? 'Edit Action' : 'Create New Action'}
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Action Title *
                </label>
                <Input
                  {...register('title')}
                  placeholder="e.g. Clean boiler heat exchangers"
                />
                {errors.title && <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{errors.title.message}</span>}
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Specific maintenance tasks or procedural adjustments..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: '13px', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  {...register('status')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: '13px', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Due Date
                </label>
                <Input
                  type="date"
                  {...register('due_date')}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Operational Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Contractors, parts ordered, or initial observations..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: '13px', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <Button variant="outline" type="button" onClick={() => setIsDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Action'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <Card style={{ maxWidth: '420px', width: '100%', padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
              Delete Action?
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Are you sure you want to delete "<strong>{deletingAction.title}</strong>"? Any linked recommendation will remain intact.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" size="sm" onClick={() => setDeletingAction(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => deleteMutation.mutate(deletingAction.id)}
                disabled={deleteMutation.isPending}
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
