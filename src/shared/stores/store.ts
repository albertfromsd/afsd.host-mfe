import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { APP, STORAGE } from '@/shared/config/app.constants';
import { createAuthSlice, type AuthSlice } from './slices/authSlice';
import { createCartSlice, type CartSlice } from './slices/cartSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';

export type AppState = AuthSlice & UiSlice & CartSlice;

export type { AuthSlice } from './slices/authSlice';
export type { UiSlice, Theme } from './slices/uiSlice';
export type { CartSlice, CartItem } from './slices/cartSlice';

const creator = persist<AppState>(
  (...a) => ({
    ...createAuthSlice(...a),
    ...createUiSlice(...a),
    ...createCartSlice(...a),
  }),
  {
    name: STORAGE.STORE_KEY,
    version: STORAGE.STORE_VERSION,
    storage: createJSONStorage(() => sessionStorage),
  },
);

export const useStore =
  process.env.NODE_ENV === 'production'
    ? create<AppState>()(creator)
    : create<AppState>()(devtools(creator, { name: APP.NAME }));
