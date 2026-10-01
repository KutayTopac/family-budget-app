import type { AuthGateway } from '@/features/auth/application/auth-gateway';
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from '@/features/auth/domain/auth';

export const createAuthService = (gateway: AuthGateway) => ({
  getSession: () => gateway.getSession(),
  signIn: (input: SignInInput) => gateway.signIn(signInSchema.parse(input)),
  signUp: (input: SignUpInput) => gateway.signUp(signUpSchema.parse(input)),
  signOut: () => gateway.signOut(),
});
