import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './session';

const initialState = useSessionStore.getState();

beforeEach(() => {
  useSessionStore.setState({ ...initialState, cart: [] }, true);
  sessionStorage.clear();
});

describe('session store: cart actions', () => {
  it('adds an item with quantity 1', () => {
    useSessionStore.getState().addToCart({ id: 'apple', name: 'Apple', price: 1 });
    const cart = useSessionStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ id: 'apple', quantity: 1 });
  });

  it('increments quantity when adding the same item again', () => {
    const { addToCart } = useSessionStore.getState();
    addToCart({ id: 'apple', name: 'Apple', price: 1 });
    addToCart({ id: 'apple', name: 'Apple', price: 1 });
    expect(useSessionStore.getState().cart[0].quantity).toBe(2);
  });

  it('decrement to zero removes the item', () => {
    const { addToCart, decrementCart } = useSessionStore.getState();
    addToCart({ id: 'apple', name: 'Apple', price: 1 });
    decrementCart('apple');
    expect(useSessionStore.getState().cart).toHaveLength(0);
  });

  it('clearCart empties the cart', () => {
    const { addToCart, clearCart } = useSessionStore.getState();
    addToCart({ id: 'apple', name: 'Apple', price: 1 });
    addToCart({ id: 'banana', name: 'Banana', price: 0.5 });
    clearCart();
    expect(useSessionStore.getState().cart).toHaveLength(0);
  });
});

describe('session store: user actions', () => {
  it('setUser stores user data', () => {
    useSessionStore.getState().setUser({ userId: '42', displayName: 'Alice' });
    expect(useSessionStore.getState().userId).toBe('42');
    expect(useSessionStore.getState().displayName).toBe('Alice');
  });

  it('clearUser nulls the user fields', () => {
    const { setUser, clearUser } = useSessionStore.getState();
    setUser({ userId: '42', displayName: 'Alice' });
    clearUser();
    expect(useSessionStore.getState().userId).toBeNull();
    expect(useSessionStore.getState().displayName).toBeNull();
  });
});
