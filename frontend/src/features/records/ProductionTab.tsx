import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, X, AlertCircle, CheckCircle2, Factory, Filter } from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { productionApi, ProductionRecordItem, CreateProductionPayload } from './productionApi';
import { organizationApi } from '../settings/organizationApi';
import { queryKeys } from '../../lib/queryKeys';
import { ApiError } from '../../lib/apiClient';

interface ProductionFormValues {
  period_month: string; // YYYY-MM
  quantity: string;
  notes?: string;
}

export const ProductionTab: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProductionRecordItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Queries
  const { data: organization } = useQuery({
    queryKey: queryKeys.organization.current,
    queryFn: organizationApi.getOrganization,
  });

  const {
    data: records,
    isLoading,
    isError,
    error,
  } = useQuery<ProductionRecordItem[]>({
    queryKey: ['production-records', 'list', { month: selectedMonth }],
    queryFn: () =>
      productionApi.getRecords({
        month: selectedMonth ? `${selectedMonth}-01` : undefined,
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProductionFormValues>({
    defaultValues: {
      period_month: new Date().toISOString().substring(0, 7),
      quantity: '',
      notes: '',
    },
  });

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormError(null);
    reset({
      period_month: new Date().toISOString().substring(0, 7),
      quantity: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rec: ProductionRecordItem) => {
    setEditingRecord(rec);
    setFormError(null);
    reset({
      period_month: rec.period_month.substring(0, 7),
      quantity: String(rec.quantity),
      notes: rec.notes || '',
    });
    setIsFormOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductionPayload) => productionApi.createRecord(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-records'] });
      setIsFormOpen(false);
      setSuccessBanner('Production record saved successfully.');
      setTimeout(() => setSuccessBanner(null), 3000);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Failed to save production record.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateProductionPayload }) =>
      productionApi.updateRecord(id, {
        quantity: payload.quantity,
        notes: payload.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-records'] });
      setIsFormOpen(false);
      setSuccessBanner('Production record updated successfully.');
      setTimeout(() => setSuccessBanner(null), 3000);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Failed to update production record.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productionApi.deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-records'] });
      setSuccessBanner('Production record deleted.');
      setTimeout(() => setSuccessBanner(null), 3000);
    },
    onError: (err: unknown) => {
      alert(err instanceof ApiError ? err.message : 'Failed to delete record.');
    },
  });

  const onSubmit = (values: ProductionFormValues) => {
    setFormError(null);
    const payload: CreateProductionPayload = {
      period_month: `${values.period_month}-01`,
      quantity: values.quantity,
      notes: values.notes && values.notes.trim() !== '' ? values.notes : null,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (rec: ProductionRecordItem) => {
    const confirmed = window.confirm(
      `Delete production record for ${rec.period_month.substring(0, 7)}?\n\nWarning: Intensity metrics (energy/water/fuel per unit produced) for this month will become unavailable until production data is restored.`
    );
    if (confirmed) {
      deleteMutation.mutate(rec.id);
    }
  };

  const productionUnit = organization?.production_unit || 'units';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Monthly Production Output</h2>
            <Badge variant="default">Unit: {productionUnit}</Badge>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Used to calculate resource intensity per manufactured unit (e.g. kWh/tonne, L/kg)
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>New Production Record</span>
        </Button>
      </div>

      {/* Filter bar */}
      <Card style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <Filter size={16} />
          <span style={{ fontWeight: 600 }}>Filter Month:</span>
        </div>

        <input
          id="filter-prod-month"
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            fontSize: '13px',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
          }}
        />

        {selectedMonth && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedMonth('')}>
            <X size={14} />
            <span>Clear</span>
          </Button>
        )}
      </Card>

      {/* Success Notification */}
      {successBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Create / Edit Form Drawer */}
      {isFormOpen && (
        <Card style={{ border: '2px solid var(--brand-secondary)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              {editingRecord ? 'Edit Production Output' : 'Record Monthly Production Output'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>
              <X size={16} />
            </Button>
          </div>

          {formError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Production Month</label>
                <input
                  type="month"
                  disabled={editingRecord !== null}
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                  }}
                  {...register('period_month', { required: true })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Unit of Measurement
                </label>
                <input
                  value={productionUnit}
                  disabled
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <Input
              label={`Output Quantity (${productionUnit})`}
              type="number"
              step="any"
              min="0.001"
              placeholder="e.g. 25000"
              required
              {...register('quantity', { required: true })}
            />

            <Input
              label="Production Notes (Optional)"
              placeholder="e.g. Factory closed 1 week for annual maintenance overhaul"
              maxLength={500}
              {...register('notes')}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}
              >
                {editingRecord ? 'Save Changes' : 'Save Production'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Production Records Table */}
      {isLoading ? (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <LoadingSkeleton height="40px" />
          <LoadingSkeleton height="40px" />
        </Card>
      ) : isError ? (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
          <p>{error instanceof Error ? error.message : 'Could not load production records.'}</p>
        </Card>
      ) : !records || records.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Factory size={28} />}
            title="No production records found"
            description="Enter monthly factory output quantities to unlock production-normalised intensity benchmarks."
            action={
              <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                <Plus size={16} />
                <span>Record First Month</span>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-card-subtle)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Production Month</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Output Quantity</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Unit</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Notes</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    {new Date(rec.period_month).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {Number(rec.quantity).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{rec.unit}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                    {rec.notes || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(rec)}
                        title="Edit record"
                        aria-label={`Edit production record for ${rec.period_month}`}
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rec)}
                        disabled={deleteMutation.isPending}
                        title="Delete record"
                        style={{ color: 'var(--danger)' }}
                        aria-label={`Delete production record for ${rec.period_month}`}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
