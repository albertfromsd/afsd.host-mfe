import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';

const initialState = useStore.getState();

beforeEach(() => {
  useStore.setState({ ...initialState, cart: [] }, true);
  sessionStorage.clear();
});

describe('app store: cart slice', () => {
  it('adds an item with quantity 1', () => {
    useStore.getState().addToCart({ id: 'apple', name: 'Apple', price: 1 });
    const cart = useStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ id: 'apple', quantity: 1 });
  });

  it('increments quantity when adding the same item again', () => {
    const { addToCart } = useStore.getState();
    addToCart({ id: 'apple', name: 'Apple', price: 1 });
    addToCart({ id: 'apple', name: 'Apple', price: 1 });
    expect(useStore.getState().cart[0].quantity).toBe(2);
  });

  it('decrement to zero removes the item', () => {
    const { addToCart, decrementCart } = useStore.getState();
    addToCart({ id: 'apple', name: 'Apple', price: 1 });
    decrementCart('apple');
    expect(useStore.getState().cart).toHaveLength(0);
  });

  it('clearCart empties the cart', () => {
    const { addToCart, clearCart } = useStore.getState();
    addToCart({ id: 'apple', name: 'Apple', price: 1 });
    addToCart({ id: 'banana', name: 'Banana', price: 0.5 });
    clearCart();
    expect(useStore.getState().cart).toHaveLength(0);
  });
});

describe('app store: auth slice', () => {
  it('setUser stores user data', () => {
    useStore.getState().setUser({ userId: '42', displayName: 'Alice' });
    expect(useStore.getState().userId).toBe('42');
    expect(useStore.getState().displayName).toBe('Alice');
  });

  it('clearUser nulls the user fields', () => {
    const { setUser, clearUser } = useStore.getState();
    setUser({ userId: '42', displayName: 'Alice' });
    clearUser();
    expect(useStore.getState().userId).toBeNull();
    expect(useStore.getState().displayName).toBeNull();
  });
});

describe('app store: ui slice', () => {
  it('setTheme updates the theme', () => {
    useStore.getState().setTheme('light');
    expect(useStore.getState().theme).toBe('light');
  });
});
