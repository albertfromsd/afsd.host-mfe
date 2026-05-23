import type { StateCreator } from 'zustand';
import type { AppState } from '../store';

export type Theme = 'light' | 'dark';

export type UiSlice = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
});
