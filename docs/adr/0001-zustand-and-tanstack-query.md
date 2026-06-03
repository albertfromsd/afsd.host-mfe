# 0001. Zustand for client state, TanStack Query for server state

**Status:** Accepted
**Date:** 2026-05-25

## Context

A federated React app needs to share state across module-federation
boundaries. Several patterns are viable:

- Redux Toolkit — verbose, large bundle, opinionated about middleware.
- Context + reducers — re-renders on every state change, no selector model.
- Jotai/Recoil — atom model, harder to share via federation (per-atom state).
- Zustand — module-level store, selector-based, tiny bundle, trivial to share.

Server state is a separate problem. Mixing it with client state in a single
store (Redux-style) means every cache write triggers store-wide subscribers
and you reinvent request lifecycle, retry, invalidation, and dedup.

## Decision

- **Client state** (auth, theme, cart) lives in **one composed Zustand store**
  in the host. Slices isolate concerns. The store is exposed via Module
  Federation as `hostTemplate/stores/store`; the remote consumes it as a
  shared singleton.

- **Server state** lives in **TanStack Query**. A canonical `createQueryClient()`
  factory in `shared/lib/queryClient.ts` defines defaults (60s staleTime,
  5m gcTime, 4xx-no-retry). The host's `QueryClientProvider` wraps `<Routes>`
  so embedded remotes inherit the cache; standalone remote creates its own.

## Consequences

**Easier:**

- Selector-based subscriptions keep render fanout small.
- Server cache + client state stay decoupled.
- Embedded vs standalone modes work without bespoke wiring.

**Harder:**

- Two state systems, two mental models for new contributors.
- Standalone remote needs a `localStore.ts` mirror — see `STATE_CONTRACT.md`.

**Accepted:**

- No global mutation observability (Zustand devtools is dev-only).

## Alternatives considered

- **Redux Toolkit** — Rejected for bundle size, boilerplate, and the
  client/server conflation pattern it encourages.
- **Single zustand store with server state slices** — Rejected because it
  reinvents request lifecycle and breaks cache-key dedup.
