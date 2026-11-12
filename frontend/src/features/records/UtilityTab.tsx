import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Filter, X, AlertCircle, CheckCircle2, Zap, Droplet, Flame } from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { utilityApi, UtilityRecordItem, CreateUtilityPayload } from './utilityApi';
import { documentApi, DocumentItem } from './documentApi';
import { queryKeys } from '../../lib/queryKeys';
import { ApiError } from '../../lib/apiClient';

interface UtilityFormValues {
  resource_type: 'electricity' | 'water' | 'fuel';
  period_month: string; // YYYY-MM
  quantity: string;
  input_unit: string;
  amount_inr?: string;
  document_id?: string;
  notes?: string;
}

export const UtilityTab: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UtilityRecordItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Queries
  const {
    data: records,
    isLoading,
    isError,
    error,
  } = useQuery<UtilityRecordItem[]>({
    queryKey: ['utility-records', 'list', { resource_type: selectedResource, month: selectedMonth }],
    queryFn: () =>
      utilityApi.getRecords({
        resource_type: selectedResource !== 'all' ? selectedResource : undefined,
        month: selectedMonth ? `${selectedMonth}-01` : undefined,
      }),
  });

  const { data: documents } = useQuery<DocumentItem[]>({
    queryKey: queryKeys.documents.list(),
    queryFn: documentApi.getDocuments,
    enabled: isFormOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<UtilityFormValues>({
    defaultValues: {
      resource_type: 'electricity',
      period_month: new Date().toISOString().substring(0, 7),
      quantity: '',
      input_unit: 'kWh',
      amount_inr: '',
      document_id: '',
      notes: '',
    },
  });

  const currentResource = watch('resource_type');

  // Sync unit options with resource
  React.useEffect(() => {
    if (currentResource === 'electricity') {
      setValue('input_unit', 'kWh');
    } else if (currentResource === 'water') {
      setValue('input_unit', 'litres');
    } else if (currentResource === 'fuel') {
      setValue('input_unit', 'litres');
    }
  }, [currentResource, setValue]);

  // Open Create
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormError(null);
    reset({
      resource_type: 'electricity',
      period_month: new Date().toISOString().substring(0, 7),
      quantity: '',
      input_unit: 'kWh',
      amount_inr: '',
      document_id: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (rec: UtilityRecordItem) => {
    setEditingRecord(rec);
    setFormError(null);
    reset({
      resource_type: rec.resource_type,
      period_month: rec.period_month.substring(0, 7),
      quantity: String(rec.quantity),
      input_unit: rec.unit,
      amount_inr: rec.amount_inr ? String(rec.amount_inr) : '',
      document_id: rec.document_id || '',
      notes: rec.notes || '',
    });
    setIsFormOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateUtilityPayload) => utilityApi.createRecord(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-records'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
      setIsFormOpen(false);
      setSuccessBanner('Utility record added successfully.');
      setTimeout(() => setSuccessBanner(null), 3000);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Failed to save utility record.');
      }
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateUtilityPayload }) =>
      utilityApi.updateRecord(id, {
        quantity: payload.quantity,
        input_unit: payload.input_unit,
        amount_inr: payload.amount_inr,
        document_id: payload.document_id || null,
        notes: payload.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-records'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
      setIsFormOpen(false);
      setSuccessBanner('Utility record updated successfully.');
      setTimeout(() => setSuccessBanner(null), 3000);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Failed to update utility record.');
      }
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => utilityApi.deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-records'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
      setSuccessBanner('Utility record deleted.');
      setTimeout(() => setSuccessBanner(null), 3000);
    },
    onError: (err: unknown) => {
      alert(err instanceof ApiError ? err.message : 'Failed to delete record.');
    },
  });

  const onSubmit = (values: UtilityFormValues) => {
    setFormError(null);
    const payload: CreateUtilityPayload = {
      resource_type: values.resource_type,
      period_month: `${values.period_month}-01`,
      quantity: values.quantity,
      input_unit: values.input_unit,
      amount_inr: values.amount_inr && values.amount_inr.trim() !== '' ? values.amount_inr : null,
      document_id: values.document_id && values.document_id.trim() !== '' ? values.document_id : null,
      notes: values.notes && values.notes.trim() !== '' ? values.notes : null,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (rec: UtilityRecordItem) => {
    if (window.confirm(`Delete ${rec.resource_type} record for ${rec.period_month.substring(0, 7)}?`)) {
      deleteMutation.mutate(rec.id);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'electricity':
        return <Zap size={16} color="#D39B48" />;
      case 'water':
        return <Droplet size={16} color="#718BC6" />;
      case 'fuel':
        return <Flame size={16} color="#D46F76" />;
      default:
        return null;
    }
  };

  const availableDocuments = documents?.filter(
    (d) => !d.is_linked || (editingRecord && editingRecord.document_id === d.id)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Action and Filter Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Monthly Utility Consumption</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            One combined entry per resource type per calendar month (canonical units: kWh, m³, L)
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>New Utility Record</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <Filter size={16} />
          <span style={{ fontWeight: 600 }}>Filter:</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'electricity', 'water', 'fuel'] as const).map((type) => (
            <Button
              key={type}
              variant={selectedResource === type ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedResource(type)}
              style={{ textTransform: 'capitalize' }}
            >
              {type}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <label htmlFor="filter-month" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Month:
          </label>
          <input
            id="filter-month"
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
        </div>
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

      {/* Modal / Create / Edit Form Drawer */}
      {isFormOpen && (
        <Card style={{ border: '2px solid var(--brand-secondary)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              {editingRecord ? 'Edit Utility Record' : 'Record Monthly Utility Entry'}
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
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Resource Type</label>
                <select
                  disabled={editingRecord !== null}
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                  }}
                  {...register('resource_type', { required: true })}
                >
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="fuel">Fuel (Diesel / LPG)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Billing Month</label>
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <Input
                label="Quantity Consumed"
                type="number"
                step="any"
                min="0.001"
                placeholder="e.g. 1500"
                required
                {...register('quantity', { required: true })}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Input Unit</label>
                <select
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                  }}
                  {...register('input_unit', { required: true })}
                >
                  {currentResource === 'electricity' && <option value="kWh">kWh (Kilowatt-hour)</option>}
                  {currentResource === 'water' && (
                    <>
                      <option value="litres">Litres (L)</option>
                      <option value="m3">Cubic Metres (m³)</option>
                    </>
                  )}
                  {currentResource === 'fuel' && <option value="litres">Litres (L)</option>}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input
                label="Bill Amount in INR (Optional)"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 12500"
                {...register('amount_inr')}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Attach Evidence Bill (Optional)
                </label>
                <select
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                  }}
                  {...register('document_id')}
                >
                  <option value="">None (Unattached)</option>
                  {availableDocuments?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.original_filename}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Operator Notes (Optional)"
              placeholder="e.g. Generator run during grid maintenance"
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
                {editingRecord ? 'Save Changes' : 'Save Record'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Records Table */}
      {isLoading ? (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <LoadingSkeleton height="40px" />
          <LoadingSkeleton height="40px" />
          <LoadingSkeleton height="40px" />
        </Card>
      ) : isError ? (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
          <p>{error instanceof Error ? error.message : 'Could not load utility records.'}</p>
        </Card>
      ) : !records || records.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Zap size={28} />}
            title="No utility records found"
            description="Record your monthly electricity, water, or fuel bills to start tracking sustainability metrics."
            action={
              <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                <Plus size={16} />
                <span>Create First Record</span>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-card-subtle)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Resource</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Billing Month</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Quantity (Canonical)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount (INR)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Evidence</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getResourceIcon(rec.resource_type)}
                      <span style={{ textTransform: 'capitalize' }}>{rec.resource_type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(rec.period_month).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {Number(rec.quantity).toLocaleString()} {rec.unit}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {rec.amount_inr != null ? `₹${Number(rec.amount_inr).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {rec.document_id ? (
                      <Badge variant="success">Attached</Badge>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(rec)}
                        title="Edit record"
                        aria-label={`Edit ${rec.resource_type} record`}
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
                        aria-label={`Delete ${rec.resource_type} record`}
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
