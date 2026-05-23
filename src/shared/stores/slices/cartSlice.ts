import type { StateCreator } from 'zustand';
import type { AppState } from '../store';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type CartSlice = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  incrementCart: (id: string) => void;
  decrementCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
};

export const createCartSlice: StateCreator<AppState, [], [], CartSlice> = (set) => ({
  cart: [],
  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find((c) => c.id === item.id);
      if (existing) {
        return {
          cart: state.cart.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)),
        };
      }
      return { cart: [...state.cart, { ...item, quantity: 1 }] };
    }),
  incrementCart: (id) =>
    set((state) => ({
      cart: state.cart.map((c) => (c.id === id ? { ...c, quantity: c.quantity + 1 } : c)),
    })),
  decrementCart: (id) =>
    set((state) => ({
      cart: state.cart
        .map((c) => (c.id === id ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0),
    })),
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((c) => c.id !== id) })),
  clearCart: () => set({ cart: [] }),
});
