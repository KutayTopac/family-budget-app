import { ZodError } from 'zod';

export function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message ?? 'Bilgileri kontrol edin.';
  if (error instanceof Error) return error.message;
  return 'Beklenmeyen bir hata oluştu.';
}
