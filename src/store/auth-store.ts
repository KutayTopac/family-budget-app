import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/core/supabase/client';
import { createAuthService } from '@/features/auth/application/auth-service';
import { supabaseAuthGateway } from '@/features/auth/infrastructure/supabase-auth-gateway';
import { useAppStore } from '@/store/app-store';

type AuthState = {
  session: Session | null;
  isReady: boolean;
  setSession: (session: Session | null) => void;
  setReady: () => void;
};

export const authService = createAuthService(supabaseAuthGateway);

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isReady: false,
  setSession: (session) => set({ session }),
  setReady: () => set({ isReady: true }),
}));

export async function initializeAuth() {
  try {
    useAuthStore.getState().setSession(await authService.getSession());
  } finally {
    useAuthStore.getState().setReady();
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
    if (!session) useAppStore.getState().reset();
  });
  return () => data.subscription.unsubscribe();
}
