import { Suspense, type ComponentType, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import Spinner from '@/components/Spinner/Spinner';
import s from './RemoteApp.module.scss';

type RemoteAppProps = {
  Component: ComponentType;
  name: string;
  loadingMessage?: string;
  errorMessage?: string;
  fallbackComponent?: ReactNode;
};

export default function RemoteApp({
  Component,
  name,
  loadingMessage = '',
  errorMessage = '',
  fallbackComponent,
}: RemoteAppProps) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <RemoteErrorFallback {...props} name={name} message={errorMessage} />
      )}
    >
      <Suspense
        fallback={fallbackComponent ?? <RemoteLoading name={name} message={loadingMessage} />}
      >
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
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
};

function RemoteErrorFallback({ error, resetErrorBoundary, name, message }: ErrorProps) {
  return (
    <section className={s.state} role="alert">
      <h2 className={s.title}>{name} failed to load</h2>
      <p className={s.message}>
        {message ?? 'The remote module could not be reached. The rest of the app is unaffected.'}
      </p>
      <pre className={s.detail}>{error instanceof Error ? error.message : String(error)}</pre>
      <button type="button" className={s.retry} onClick={resetErrorBoundary}>
        Retry
      </button>
    </section>
  );
}
