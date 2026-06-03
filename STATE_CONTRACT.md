# State Contract

The federated `AppState` shape is the most drift-prone surface in this
template pair. It lives in **three files** that the build/runtime treat as
independent — nothing forces them into sync. This document is the single
source of truth; `scripts/check-sync.ts` enforces it in CI.

## The three files

| File                                                       | Role                                            | Authority           |
| ---------------------------------------------------------- | ----------------------------------------------- | ------------------- |
| `afsd.host-mfe/src/shared/stores/store.ts` + `slices/*.ts` | Canonical implementation. Composed from slices. | **Source of truth** |
| `afsd.remote-mfe/src/shared/stores/localStore.ts`          | Standalone-mode fallback when host isn't there. | Must mirror.        |
| `afsd.remote-mfe/src/shared/types/remotes.d.ts`            | TypeScript declaration for embedded mode.       | Must mirror.        |

In **embedded mode** (remote loaded by host), the remote consumes the host's
store via Module Federation — `localStore.ts` is unused at runtime but its
type signature still appears in tests and ambient resolution.

In **standalone mode** (remote dev-served or rendered alone), the federation
import fails and `storeAccessor.ts` falls back to `localStore.ts`. If
`localStore.ts` lacks a field the host has, the remote's UI silently breaks
in standalone mode only.

## Checklist — adding a slice field

When you add `foo: string` to the host's auth slice:

1. **Host** — Add `foo: string` to `AuthSlice` in `src/shared/stores/slices/authSlice.ts` and initialize it in `createAuthSlice`.
2. **Remote `localStore.ts`** — Add `foo: string;` to `AppState` and initialize in `createLocalStore`.
3. **Remote `remotes.d.ts`** — Add `foo: string;` to the `AppState` declaration inside `declare module 'hostTemplate/stores/store'`.
4. **Run `pnpm check:sync`** in the host directory to confirm parity.
5. **Bump `STORAGE.STORE_VERSION`** in BOTH `app.constants.ts` files **iff** the persisted shape changed in an incompatible way (renamed field, removed field, type narrowed). New optional fields don't require a bump.

If step 5 is needed, persisted user sessions are wiped on next load — this is intentional and documented in [docs/adr/0004-session-storage-and-versioning.md](docs/adr/0004-session-storage-and-versioning.md).

## Checklist — adding a slice action

Actions are typed the same way — add to all three files. The host's
`StateCreator` infers the action signature from the slice type, so a
mismatch shows up as a TS error on the host. The remote's `localStore.ts`
needs the action implementation; the remote's `remotes.d.ts` needs the
action signature.

## What the drift check catches

`scripts/check-sync.ts` extracts the field list from each file via regex and
compares them. It catches:

- A field present in host slices but missing from `localStore.ts`.
- A field present in `localStore.ts` but missing from `remotes.d.ts`.
- A type signature divergence on any shared field.

It does **not** catch:

- Implementation drift (host's `addToCart` increments by 2, remote's by 1).
- Type narrowing in one place that's still assignable in the other.

For implementation drift, write a parity test that exercises the same
action on both stores and asserts the same end state. See
`src/shared/stores/store.test.ts` and `afsd.remote-mfe/src/shared/stores/localStore.test.ts`.

## When the contract is broken

CI fails on the host with a diff. Local repro:

```bash
cd afsd.host-mfe
pnpm check:sync
```

Resolve by aligning the lagging file to the canonical one. Default: host is
canonical. The drift check doesn't know which side is "right" — that's
always a human/AI judgment call based on what the change was meant to do.
