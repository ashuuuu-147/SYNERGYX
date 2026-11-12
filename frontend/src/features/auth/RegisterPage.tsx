import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authApi } from './authApi';
import { authStorage } from '../../lib/authStorage';
import { ApiError } from '../../lib/apiClient';
import { registerSchema, type RegisterFormValues } from './authSchemas';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      organizationName: '',
      industry: 'textile',
      location: '',
      productionUnit: 'kg',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // confirmPassword is intentionally omitted from the API payload
      const response = await authApi.register({
        full_name: values.fullName,
        email: values.email,
        password: values.password,
        organization_name: values.organizationName,
        industry: values.industry,
        location: values.location,
        country_code: 'IN',
        production_unit: values.productionUnit,
      });

      authStorage.setToken(response.access_token);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Could not reach SYNERGYX. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--bg-main)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: '520px', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Create Your Account</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Set up your organization on SYNERGYX
          </p>
        </div>

        {errorMessage && (
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
              marginBottom: 'var(--space-4)',
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Full Name"
            type="text"
            placeholder="Aarav Sharma"
            disabled={isSubmitting}
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          <Input
            label="Work Email"
            type="email"
            placeholder="name@company.com"
            disabled={isSubmitting}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Organization / Factory Name"
            type="text"
            placeholder="Sharma Textiles Ltd"
            disabled={isSubmitting}
            error={errors.organizationName?.message}
            {...register('organizationName')}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="industry" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Industry
              </label>
              <select
                id="industry"
                disabled={isSubmitting}
                style={{
                  height: '44px',
                  padding: '0 12px',
                  fontSize: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
                {...register('industry')}
              >
                <option value="textile">Textile</option>
                <option value="food_processing">Food Processing</option>
                <option value="metal_fabrication">Metal Fabrication</option>
                <option value="packaging">Packaging</option>
                <option value="other">Other Manufacturing</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="productionUnit" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Production Unit
              </label>
              <select
                id="productionUnit"
                disabled={isSubmitting}
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

          <Input
            label="Location"
            type="text"
            placeholder="Surat, Gujarat"
            disabled={isSubmitting}
            error={errors.location?.message}
            {...register('location')}
          />

          <div style={{ position: 'relative' }}>
            <Input
              label="Password (min 10 characters)"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••"
              disabled={isSubmitting}
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '12px',
                top: '36px',
                color: 'var(--text-muted)',
                padding: '4px',
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••"
            disabled={isSubmitting}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" variant="primary" isLoading={isSubmitting} style={{ marginTop: '8px' }}>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};
