import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Geçerli bir e-posta girin.');
export const passwordSchema = z.string().min(8, 'Şifre en az 8 karakter olmalıdır.');
export const displayNameSchema = z.string().trim().min(2, 'Ad en az 2 karakter olmalıdır.').max(80);

export const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
export const signUpSchema = signInSchema.extend({ displayName: displayNameSchema });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
