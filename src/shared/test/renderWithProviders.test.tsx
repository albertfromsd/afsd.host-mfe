import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { Routes, Route, Link } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { useStore } from '@/shared/stores/store';
import { renderWithProviders, resetStore } from './renderWithProviders';

afterEach(resetStore);

describe('renderWithProviders', () => {
  it('provides a QueryClient so useQuery resolves', async () => {
    function Probe() {
      const { data, isPending } = useQuery({
        queryKey: ['probe'],
        queryFn: () => Promise.resolve('hello'),
      });
      return <div>{isPending ? 'loading' : data}</div>;
    }

    renderWithProviders(<Probe />);

    expect(await screen.findByText('hello')).toBeInTheDocument();
  });

  it('provides a router — Link navigation works', async () => {
    const user = userEvent.setup();
    function Tree() {
      return (
        <Routes>
          <Route
            path="/"
            element={
              <Link to="/next" data-testid="link">
                go
              </Link>
            }
          />
          <Route path="/next" element={<div>next page</div>} />
        </Routes>
      );
    }

    renderWithProviders(<Tree />);

    await user.click(screen.getByTestId('link'));
    expect(await screen.findByText('next page')).toBeInTheDocument();
  });

  it('seedStore writes into the canonical zustand store', () => {
    renderWithProviders(<div />, { seedStore: { theme: 'light' } });
    expect(useStore.getState().theme).toBe('light');
  });
});
