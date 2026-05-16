import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type SessionState = {
  userId: string | null;
  displayName: string | null;
  theme: Theme;
  cart: CartItem[];
  setUser: (user: { userId: string; displayName: string }) => void;
  clearUser: () => void;
  setTheme: (theme: Theme) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  incrementCart: (id: string) => void;
  decrementCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = 'afsd.session.v1';

const creator = persist<SessionState>(
  set => ({
    userId: null,
    displayName: null,
    theme: 'dark',
    cart: [],
    setUser: user => set({ userId: user.userId, displayName: user.displayName }),
    clearUser: () => set({ userId: null, displayName: null }),
    setTheme: theme => set({ theme }),
    addToCart: item =>
      set(state => {
        const existing = state.cart.find(c => c.id === item.id);
        if (existing) {
          return {
            cart: state.cart.map(c =>
              c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
            ),
          };
        }
        return { cart: [...state.cart, { ...item, quantity: 1 }] };
      }),
    incrementCart: id =>
      set(state => ({
        cart: state.cart.map(c =>
          c.id === id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      })),
    decrementCart: id =>
      set(state => ({
        cart: state.cart
          .map(c => (c.id === id ? { ...c, quantity: c.quantity - 1 } : c))
          .filter(c => c.quantity > 0),
      })),
    removeFromCart: id =>
      set(state => ({ cart: state.cart.filter(c => c.id !== id) })),
    clearCart: () => set({ cart: [] }),
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
