# 0003. Host self-federates its own store

**Status:** Accepted
**Date:** 2026-05-25

## Context

The host exposes its Zustand store as a federated module
(`hostTemplate/stores/store`). Without self-federation, the host imports the
store _directly_ (`@/shared/stores/store`) while the remote imports it
_through the federation runtime_ — and module federation evaluates the
module **twice**, producing two store instances with independent
subscriptions. Selector updates in one fail to notify subscribers in the
other; the bug manifests as "the cart count changes on click but the navbar
doesn't update."

## Decision

The host imports its own store via the federated specifier:

```ts
// In host source code:
import { useStore } from 'hostTemplate/stores/store';
```

This is implemented by listing the host itself in its own `remotes` block in
`rsbuild.config.ts`:

```ts
remotes: {
  remoteTemplate: '...',
  hostTemplate: `hostTemplate@${HOST_TEMPLATE_URL}/hostRemoteEntry.js`,
},
```

The MF runtime deduplicates the module via the `shared` singleton mechanism
(zustand is `singleton: true`), so host and remote both observe the same
store instance.

## Consequences

**Easier:**

- One store instance, one subscription set — embedded and standalone both work.
- Tests still import via `@/shared/stores/store` thanks to `vitest.config.ts`
  aliasing the federation specifier to the local file.

**Harder:**

- Source-code imports must use the federated specifier (an unintuitive rule
  for newcomers — AGENTS.md calls this out).
- IDE jump-to-definition sometimes goes to the federation types file rather
  than the source. Workaround: use the `@/` alias in jump-targets only.

**Accepted:**

- The federated specifier is foreign syntax in source code. We trade
  ergonomics for correctness.

## Alternatives considered

- **Don't self-federate, import store directly in host** — Rejected: produces two store instances. Documented failure mode.
- **Make zustand not a singleton** — Rejected: defeats the purpose; we explicitly want one instance.
- **Use Context to inject the store** — Rejected: works but requires every consumer to take a context dep; selector ergonomics suffer.
