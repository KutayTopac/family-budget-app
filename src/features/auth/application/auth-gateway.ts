import type { Session } from '@supabase/supabase-js';

import type { SignInInput, SignUpInput } from '@/features/auth/domain/auth';

export type SignUpResult = { session: Session | null; confirmationRequired: boolean };

export interface AuthGateway {
  getSession(): Promise<Session | null>;
  signIn(input: SignInInput): Promise<Session>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
}
