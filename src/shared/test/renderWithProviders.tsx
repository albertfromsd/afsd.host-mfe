import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { useStore, type AppState } from '@/shared/stores/store';

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** Initial URL the MemoryRouter sits on. Default `/`. */
  route?: string;
  /** Partial AppState to seed before render. Merged into the canonical store. */
  seedStore?: Partial<AppState>;
  /** Override the test QueryClient (e.g. to assert on cache state after). */
  queryClient?: QueryClient;
};

/**
 * Canonical render helper for component/integration tests.
 *
 * Wires the three providers production code expects:
 *   - MemoryRouter (replaces BrowserRouter for tests)
 *   - QueryClientProvider with a retry-disabled client
 *   - The app's zustand store (singleton — seed via the `seedStore` option)
 *
 * Use this in EVERY component test. Don't reach for raw `@testing-library/react`'s
 * `render` unless you're testing a primitive that consumes no providers.
 */
export function renderWithProviders(
  ui: ReactNode,
  { route = '/', seedStore, queryClient, ...renderOptions }: Options = {},
): RenderResult & { queryClient: QueryClient } {
  if (seedStore) {
    useStore.setState(seedStore, false);
  }

  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

  const result = render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
    ...renderOptions,
  });

  return { ...result, queryClient: client };
}

/** Reset the zustand store between tests. Call from afterEach in component tests. */
export function resetStore(): void {
  useStore.setState(useStore.getInitialState(), true);
  sessionStorage.clear();
}
