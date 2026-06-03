# 0005. Cross-MFE event bus on top of EventTarget

**Status:** Accepted
**Date:** 2026-05-25

## Context

The shared Zustand store covers durable cross-MFE state. It doesn't cover
ephemeral events: "show this toast," "remote finished mounting," "session
expired, kick to login." Modeling these as state has three problems:

1. **Noise.** Every store change is observed by every selector across both
   apps. A toast queue as state means every component re-evaluates when
   any toast fires.
2. **Persistence.** The store persists to sessionStorage. A "toast just
   fired" event re-firing on refresh is wrong.
3. **Shape fit.** Events carry rich payloads (`focus target`, `navigation
intent`, `error message`). Modeling these as state requires reducer-style
   "last event" buffers that are clumsy.

We need a separate channel.

## Decision

A typed event bus on top of native `EventTarget`, federated as
`hostTemplate/lib/eventBus`. The host owns the canonical instance; the
remote consumes via federation in embedded mode and falls back to a local
instance via `eventBusAccessor.ts` in standalone mode.

The bus type surface is one file (`src/shared/lib/eventBus.ts`) kept
byte-identical between templates via `scripts/check-sync.ts`. New event
types are added by extending the `EventMap` type — both sides see them
after type-generation.

Built-in events:

- `toast:show` — transient notifications
- `nav:request` — remote asks host to navigate
- `auth:expired` — token invalid / session ended
- `remote:ready` — federation mount succeeded
- `remote:error` — federation mount failed

## Consequences

**Easier:**

- Toasts, focus moves, navigation requests don't pollute the store.
- `EventTarget` is built-in, zero dependencies, browser-native semantics.
- Standalone mode works (local fallback bus) without bespoke code paths.
- The bus is fully typed — IDE autocomplete on emit/on payloads.

**Harder:**

- A second comms channel to teach contributors. We mitigate via
  [REMOTE_HOST_COMMS.md](../REMOTE_HOST_COMMS.md)'s decision table.
- The accessor uses a `Proxy` to defer to the resolved bus, so emits
  before federation resolves go to the local bus. Acceptable: users don't
  emit before the app mounts.

**Accepted:**

- Listeners must be attached after mount (in `useEffect`), not at module
  scope. The `useEventBus` hook makes this ergonomic.
- Event ordering across MFE boundaries is single-threaded but not
  guaranteed to match emit order under React concurrent rendering. Treat
  as a fire-and-forget channel, not an ordered queue.

## Alternatives considered

- **Just use the store** — Rejected for the noise/persistence/shape reasons above.
- **Postmessage / BroadcastChannel** — Rejected. PostMessage is for cross-window/iframe, not in-document federation. BroadcastChannel works but adds serialization overhead and loses TypeScript safety across the wire.
- **Custom `globalThis` registry** — Rejected. Works but loses the federation singleton guarantees and breaks tree-shaking; relies on global state in a way that's hostile to testing.
- **RxJS Subject / mitt / nanoevents** — Rejected. Adding a dependency for `addEventListener` + `dispatchEvent` is unjustified weight; `EventTarget` matches the semantics we want and is free.
