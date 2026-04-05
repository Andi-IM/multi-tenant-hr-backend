import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({
      message: 'Email and password are required',
    })
    .email('Invalid email format'),
  password: z
    .string({
      message: 'Email and password are required',
    })
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
