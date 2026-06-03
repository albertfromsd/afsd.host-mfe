import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { isApiError } from './api';
import { logger } from './logger';

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
    queryCache: new QueryCache({
      onError: (error, query) => {
        logger.event({
          name: 'query.error',
          level: 'error',
          message: `Query failed: ${query.queryKey.join('.')}`,
          context: { queryKey: query.queryKey },
          error,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        logger.event({
          name: 'mutation.error',
          level: 'error',
          message: `Mutation failed: ${mutation.options.mutationKey?.join('.') ?? '<unkeyed>'}`,
          context: { mutationKey: mutation.options.mutationKey },
          error,
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const status = isApiError(error) ? error.status : null;
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
