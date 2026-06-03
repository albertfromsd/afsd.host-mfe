import { Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import Spinner from '@/components/Spinner/Spinner';
import { eventBus } from 'hostTemplate/lib/eventBus';
import s from './RemoteApp.module.scss';

type RemoteAppProps = {
  Component: ComponentType;
  name: string;
  loadingMessage?: string;
  errorMessage?: string;
  fallbackComponent?: ReactNode;
  /** Max auto-retry attempts on initial mount failure. Default 2. */
  maxRetries?: number;
  /** Base backoff in ms (doubles each attempt). Default 500. */
  retryBackoffMs?: number;
};

/**
 * Renders a federated remote component with:
 *   - Suspense boundary for the lazy module fetch
 *   - Error boundary with manual retry button
 *   - Automatic retry with exponential backoff (transient failure recovery)
 *   - eventBus emits for `remote:ready` and `remote:error` (observability)
 *
 * Retry policy: a federation failure is *usually* a transient network blip
 * or a deploy in progress. We retry `maxRetries` times with exponential
 * backoff before surfacing the error UI. Beyond that, manual retry is the
 * user's call.
 */
export default function RemoteApp({
  Component,
  name,
  loadingMessage = '',
  errorMessage = '',
  fallbackComponent,
  maxRetries = 2,
  retryBackoffMs = 500,
}: RemoteAppProps) {
  // The error boundary's `key` forces a fresh tree on reset. Bumping it
  // re-mounts Suspense + the lazy component, which re-triggers the import.
  const [resetKey, setResetKey] = useState(0);

  return (
    <ErrorBoundary
      key={resetKey}
      onError={(error) => {
        eventBus.emit('remote:error', {
          name,
          error: error instanceof Error ? error.message : String(error),
        });
      }}
      FallbackComponent={(props) => (
        <RemoteErrorFallback
          {...props}
          name={name}
          message={errorMessage}
          maxRetries={maxRetries}
          retryBackoffMs={retryBackoffMs}
          onManualReset={() => setResetKey((k) => k + 1)}
        />
      )}
    >
      <Suspense
        fallback={fallbackComponent ?? <RemoteLoading name={name} message={loadingMessage} />}
      >
        <ReadySignal name={name} />
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Fires `remote:ready` exactly once on mount. Sibling to <Component /> so
 * it only mounts AFTER Suspense resolves — i.e. after the federated module
 * actually loaded. Splitting this out (vs putting useEffect on the parent)
 * keeps the parent's lifecycle simple for testability.
 */
function ReadySignal({ name }: { name: string }) {
  useEffect(() => {
    eventBus.emit('remote:ready', { name });
  }, [name]);
  return null;
}

type LoadingProps = {
  name: string;
  message?: string;
};

function RemoteLoading({ name, message }: LoadingProps) {
  return (
    <section className={s.state} aria-busy="true" aria-live="polite">
      <Spinner label={`Loading ${name}…`} size="lg" />
      {message && <p className={s.message}>{message}</p>}
    </section>
  );
}

type ErrorProps = FallbackProps & {
  name: string;
  message?: string;
  maxRetries: number;
  retryBackoffMs: number;
  onManualReset: () => void;
};

function RemoteErrorFallback({
  error,
  resetErrorBoundary,
  name,
  message,
  maxRetries,
  retryBackoffMs,
  onManualReset,
}: ErrorProps) {
  const attemptsRef = useRef(0);
  const [retrying, setRetrying] = useState(false);

  // Auto-retry with exponential backoff. Runs once per fallback mount;
  // dependencies are intentionally empty so a re-render doesn't restart it.
  useEffect(() => {
    if (attemptsRef.current >= maxRetries) return;
    const delay = retryBackoffMs * 2 ** attemptsRef.current;
    setRetrying(true);
    const timer = setTimeout(() => {
      attemptsRef.current += 1;
      setRetrying(false);
      resetErrorBoundary();
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (retrying) {
    return (
      <section className={s.state} aria-busy="true" aria-live="polite">
        <Spinner
          label={`Retrying ${name} (attempt ${attemptsRef.current + 1} of ${maxRetries})…`}
          size="lg"
        />
      </section>
    );
  }

  return (
    <section className={s.state} role="alert">
      <h2 className={s.title}>{name} failed to load</h2>
      <p className={s.message}>
        {message ?? 'The remote module could not be reached. The rest of the app is unaffected.'}
      </p>
      <pre className={s.detail}>{error instanceof Error ? error.message : String(error)}</pre>
      <button
        type="button"
        className={s.retry}
        onClick={() => {
          attemptsRef.current = 0;
          onManualReset();
        }}
      >
        Retry
      </button>
    </section>
  );
}
