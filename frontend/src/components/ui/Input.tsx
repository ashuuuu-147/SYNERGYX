import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, style, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          disabled={disabled}
          style={{
            height: '44px',
            padding: '0 14px',
            fontSize: '14px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border-default)'}`,
            background: disabled ? 'var(--bg-secondary)' : 'var(--bg-input)',
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'border-color var(--duration-fast) var(--ease-standard)',
            ...style,
          }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 500 }} role="alert">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
