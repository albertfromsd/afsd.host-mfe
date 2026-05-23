import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from './api';

/**
 * Canonical QueryClient defaults for the AFSD MFE app.
 *
 * In embedded mode the remote inherits this client via React context (the
 * host wraps `<Routes>` in `<QueryClientProvider>`, so `useQuery` calls
 * inside the remote resolve to this client and share its cache).
 *
 * In standalone mode the remote creates its own client using the same
 * factory — see `afsd.remote-mfe/src/shared/lib/queryClient.ts`. When the
 * defaults below change, mirror them on the remote.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const status = (error as ApiError | null)?.status ?? null;
          if (status !== null && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();
