import { lazy, Suspense, useEffect } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { QueryClientProvider } from '@tanstack/react-query';
import { useStore } from 'hostTemplate/stores/store';
import { queryClient } from '@/shared/lib/queryClient';
import { logger } from '@/shared/lib/logger';
import '@/shared/styles/global.scss';
import './App.scss';
import Navbar from './features/Navbar/Navbar';
import { navItems } from './router/nav-links';
import AppRoutes from './router/Routes';

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

const RouteTreeFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <section style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }} role="alert">
    <h2>Something went wrong</h2>
    <p>The navigation still works — pick another destination, or retry.</p>
    <pre
      style={{
        margin: '0 0 1rem',
        padding: '0.75rem 1rem',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
        fontSize: '0.85rem',
        whiteSpace: 'pre-wrap',
      }}
    >
      {error instanceof Error ? error.message : String(error)}
    </pre>
    <button
      type="button"
      onClick={resetErrorBoundary}
      style={{
        padding: '0.5rem 1rem',
        background: 'rgba(255,255,255,0.08)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      Retry
    </button>
  </section>
);

const App = () => {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-shell">
        <Navbar items={navItems} />
        <main className="app-main">
          <ErrorBoundary
            FallbackComponent={RouteTreeFallback}
            onError={(error, info) =>
              logger.event({
                name: 'route.error',
                level: 'error',
                message: 'Route tree crashed',
                context: { componentStack: info.componentStack },
                error,
              })
            }
          >
            <AppRoutes />
          </ErrorBoundary>
        </main>
      </div>
      {process.env.NODE_ENV !== 'production' && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
};

export default App;
