import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authApi } from './authApi';
import { authStorage } from '../../lib/authStorage';
import { ApiError } from '../../lib/apiClient';
import { loginSchema, type LoginFormValues } from './authSchemas';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await authApi.login(values.email, values.password);
      authStorage.setToken(response.access_token);

      const redirectPath = searchParams.get('redirect') || '/app/dashboard';
      navigate(redirectPath, { replace: true });
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
      <Card style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Welcome to SYNERGYX</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Sign in to your manufacturing intelligence account
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
            label="Work Email"
            type="email"
            placeholder="name@company.com"
            disabled={isSubmitting}
            error={errors.email?.message}
            {...register('email')}
          />

          <div style={{ position: 'relative' }}>
            <Input
              label="Password"
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

          <Button type="submit" variant="primary" isLoading={isSubmitting} style={{ marginTop: '8px' }}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
          <Link to="/register" style={{ fontWeight: 600 }}>
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  );
};
