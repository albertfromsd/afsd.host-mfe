import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

export type SessionState = {
  userId: string | null;
  displayName: string | null;
  theme: Theme;
  setUser: (user: { userId: string; displayName: string }) => void;
  clearUser: () => void;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = 'afsd.session.v1';

const creator = persist<SessionState>(
  set => ({
    userId: null,
    displayName: null,
    theme: 'dark',
    setUser: user => set({ userId: user.userId, displayName: user.displayName }),
    clearUser: () => set({ userId: null, displayName: null }),
    setTheme: theme => set({ theme }),
  }),
  {
    name: STORAGE_KEY,
    version: 1,
    storage: createJSONStorage(() => sessionStorage),
  },
);

export const useSessionStore =
  process.env.NODE_ENV === 'production'
    ? create<SessionState>()(creator)
    : create<SessionState>()(devtools(creator, { name: 'session' }));
