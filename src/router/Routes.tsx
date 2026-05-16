import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

const RemoteApp = lazy(() => import('remoteTemplate/App'));

const Page = ({ title }: { title: string }) => (
  <section style={{ padding: '2rem' }}>
    <h1>{title}</h1>
  </section>
);

const RemoteFallback = ({ error }: FallbackProps) => (
  <section style={{ padding: '2rem' }}>
    <h2>Failed to load remote</h2>
    <pre>{error instanceof Error ? error.message : String(error)}</pre>
  </section>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Page title="Home" />} />
      <Route path="/about" element={<Page title="About" />} />
      <Route path="/pricing" element={<Page title="Pricing" />} />
      <Route path="/solutions/enterprise" element={<Page title="Enterprise" />} />
      <Route path="/solutions/startup" element={<Page title="Startup" />} />
      <Route
        path="/remote/*"
        element={
          <ErrorBoundary FallbackComponent={RemoteFallback}>
            <Suspense fallback={<Page title="Loading remote…" />}>
              <RemoteApp />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route path="*" element={<Page title="Not found" />} />
    </Routes>
  );
}
