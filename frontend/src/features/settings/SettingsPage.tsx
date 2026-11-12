import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { organizationApi, OrganizationUpdatePayload } from './organizationApi';
import { queryKeys } from '../../lib/queryKeys';
import { ApiError } from '../../lib/apiClient';

interface SettingsFormValues {
  name: string;
  industry: string;
  location: string;
  countryCode: string;
  productionUnit: string;
}

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const {
    data: organization,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.organization.current,
    queryFn: organizationApi.getOrganization,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SettingsFormValues>();

  useEffect(() => {
    if (organization) {
      reset({
        name: organization.name,
        industry: organization.industry,
        location: organization.location,
        countryCode: organization.country_code,
        productionUnit: organization.production_unit,
      });
    }
  }, [organization, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: OrganizationUpdatePayload) => organizationApi.updateOrganization(payload),
    onSuccess: (updatedOrg) => {
      queryClient.setQueryData(queryKeys.organization.current, updatedOrg);
      setProfileSuccess(true);
      setProfileError(null);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      setProfileSuccess(false);
      if (err instanceof ApiError) {
        setProfileError(err.message);
      } else {
        setProfileError('Failed to update organization profile.');
      }
    },
  });

  const updateConsentMutation = useMutation({
    mutationFn: (allow_external_ai: boolean) => organizationApi.updateAiConsent(allow_external_ai),
    onSuccess: (updatedOrg) => {
      queryClient.setQueryData(queryKeys.organization.current, updatedOrg);
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    setProfileError(null);
    updateProfileMutation.mutate({
      name: values.name,
      location: values.location,
      country_code: values.countryCode,
      production_unit: values.productionUnit,
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px' }}>
        <LoadingSkeleton height="32px" width="300px" />
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <LoadingSkeleton height="44px" />
          <LoadingSkeleton height="44px" />
          <LoadingSkeleton height="44px" />
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
        <p>{error instanceof Error ? error.message : 'Could not load organization settings.'}</p>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Organization Settings</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Manage your manufacturing facility profile and external AI preferences
        </p>
      </div>

      {profileSuccess && (
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
          <span>Organization profile updated successfully.</span>
        </div>
      )}

      {profileError && (
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
          }}
        >
          <AlertCircle size={18} />
          <span>{profileError}</span>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Business Profile</h3>

          <Input
            label="Organization / Factory Name"
            disabled={isSubmitting || updateProfileMutation.isPending}
            {...register('name', { required: true })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Input label="Industry (Immutable)" value={organization?.industry || ''} disabled />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="productionUnit" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Production Unit
              </label>
              <select
                id="productionUnit"
                disabled={isSubmitting || updateProfileMutation.isPending}
                style={{
                  height: '44px',
                  padding: '0 12px',
                  fontSize: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
                {...register('productionUnit')}
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="tonne">Metric Tonne</option>
                <option value="piece">Piece / Unit</option>
                <option value="litre">Litre (L)</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
            <Input
              label="Location"
              disabled={isSubmitting || updateProfileMutation.isPending}
              {...register('location')}
            />
            <Input
              label="Country Code"
              disabled={isSubmitting || updateProfileMutation.isPending}
              {...register('countryCode')}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting || updateProfileMutation.isPending}
            style={{ alignSelf: 'flex-start', marginTop: 'var(--space-2)' }}
          >
            Save Profile
          </Button>
        </form>
      </Card>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>AI Privacy & Explanation Consent</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          External AI explanations are opt-in and disabled by default. When enabled, only aggregated, non-identifying
          metrics (such as percentage change and resource intensity) are sent to generate plain-language insights.
          Raw invoices, customer names, email addresses, and exact locations are never shared.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="checkbox"
            id="ai-consent-checkbox"
            checked={organization?.allow_external_ai || false}
            disabled={updateConsentMutation.isPending}
            onChange={(e) => updateConsentMutation.mutate(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="ai-consent-checkbox" style={{ fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            Allow external AI to generate plain-language explanations of calculated findings
          </label>
        </div>
      </Card>
    </div>
  );
};
