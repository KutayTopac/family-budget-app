import { create } from 'zustand';

type AppState = {
  activeHouseholdId: string | null;
  setActiveHouseholdId: (householdId: string | null) => void;
  reset: () => void;
};

const initialState: Pick<AppState, 'activeHouseholdId'> = { activeHouseholdId: null };

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setActiveHouseholdId: (activeHouseholdId) => set({ activeHouseholdId }),
  reset: () => set(initialState),
}));
