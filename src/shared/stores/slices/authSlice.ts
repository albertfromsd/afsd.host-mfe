import type { StateCreator } from 'zustand';
import type { AppState } from '../store';

export type AuthSlice = {
  userId: string | null;
  displayName: string | null;
  setUser: (user: { userId: string; displayName: string }) => void;
  clearUser: () => void;
};

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => ({
  userId: null,
  displayName: null,
  setUser: (user) => set({ userId: user.userId, displayName: user.displayName }),
  clearUser: () => set({ userId: null, displayName: null }),
});
