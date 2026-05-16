/**
 * Federation runtime plugin: surfaces remote-load failures with the *name* of
 * the remote that failed (raw federation errors are otherwise opaque).
 *
 * Hook here to wire an observability backend (Sentry/Datadog/PostHog/etc.)
 * — `errorLoadRemote` is the universal failure path for federated imports.
 *
 * NOTE: we inline a duck-typed shape rather than importing
 * `@module-federation/runtime` so this template doesn't need it as a direct
 * dependency. The runtime resolves plugins by shape, not by type identity.
 */
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
    console.error(`[mf] failed to load remote (${lifecycle}) — id=${id}`, error);
    // TODO: report to observability backend
    return null;
  },
});

export default mfRuntimePlugin;
