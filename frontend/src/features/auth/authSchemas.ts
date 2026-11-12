import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid work email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(80),
    email: z.string().email('Please enter a valid work email address'),
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(120),
    industry: z.enum(['textile', 'food_processing', 'metal_fabrication', 'packaging', 'other'], {
      required_error: 'Please select an industry category',
    }),
    location: z.string().min(2, 'Location is required').max(100),
    productionUnit: z.enum(['kg', 'tonne', 'piece', 'litre', 'unit', 'other'], {
      required_error: 'Please select a primary production unit',
    }),
    password: z.string().min(10, 'Password must be at least 10 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

