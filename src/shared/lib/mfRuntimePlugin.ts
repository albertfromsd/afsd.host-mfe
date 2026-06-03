/**
 * Federation runtime plugin: surfaces remote-load failures with the *name* of
 * the remote that failed (raw federation errors are otherwise opaque).
 *
 * Errors flow through the `logger` interface — swap in an observability
 * backend (Sentry/Datadog/PostHog/etc.) via `setLogger(...)` in your
 * bootstrap to get production reporting. `errorLoadRemote` is the universal
 * failure path for federated imports.
 *
 * NOTE: we inline a duck-typed shape rather than importing
 * `@module-federation/runtime` so this template doesn't need it as a direct
 * dependency. The runtime resolves plugins by shape, not by type identity.
 */
import { logger } from './logger';

type ErrorLoadRemoteArgs = {
  id: string;
  error: unknown;
  lifecycle: string;
};

type FederationRuntimePlugin = {
  name: string;
  errorLoadRemote?: (args: ErrorLoadRemoteArgs) => unknown;
};

const mfRuntimePlugin = (): FederationRuntimePlugin => ({
  name: 'afsd-mf-runtime-plugin',
  errorLoadRemote({ id, error, lifecycle }) {
    logger.event({
      name: 'remote.load.failed',
      level: 'error',
      message: `[mf] failed to load remote (${lifecycle}) — id=${id}`,
      context: { id, lifecycle },
      error,
    });
    return null;
  },
});

export default mfRuntimePlugin;
