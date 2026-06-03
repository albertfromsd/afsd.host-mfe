# 0004. Session storage for the persisted store + versioning policy

**Status:** Accepted
**Date:** 2026-05-25

## Context

Zustand's `persist` middleware can write to `localStorage`, `sessionStorage`,
`IndexedDB`, or a custom storage adapter. We need to pick one default for
the template.

- **localStorage** survives browser restart. Good for "remember me" UX, bad
  for shared computers, larger attack surface for XSS-based session theft.
- **sessionStorage** is per-tab, cleared on tab close. Safer default, less
  surprising behavior in dev.
- **IndexedDB** is async — `persist` can use it, but blocks initial render
  on hydration; overkill for ~kB of state.

We also need a versioning policy so persisted state doesn't poison new
shapes after a slice refactor.

## Decision

Default storage: **`sessionStorage`** via `createJSONStorage(() => sessionStorage)`.

Versioning: zustand's `version` option (from `STORAGE.STORE_VERSION` in
`app.constants.ts`). Bump the version when the persisted shape changes
**incompatibly**:

- ✅ Bump for: renaming a field, removing a field, narrowing a field's type,
  changing an enum's allowed values.
- ❌ No bump for: adding an optional field with a sensible default.

When `STORE_VERSION` changes, zustand drops the persisted state on read; the
user's session resets but the app loads cleanly. The alternative — running
a migration callback — is documented in zustand but rarely worth the
complexity at this scale.

## Consequences

**Easier:**

- Per-tab isolation prevents cross-tab session bleed in dev.
- Schema changes are safe — no manual migrations to write.
- `STORE_VERSION` is in `app.constants.ts`, so the bump is visible in code review.

**Harder:**

- "Remember me" UX requires opting into `localStorage` for the auth slice only (mixed storage). Not implemented; revisit when needed.

**Accepted:**

- Users lose session on accidental tab close. Tradeoff for safer defaults.
- A `STORE_VERSION` bump is destructive (wipes existing sessions). This is intentional.

## Alternatives considered

- **localStorage default** — Rejected: too easy to leak across users on shared computers, and the "remember me" use case isn't load-bearing for the template.
- **IndexedDB** — Rejected: async hydration adds render-blocking complexity for a few kB.
- **Migration callbacks instead of drop-on-version-bump** — Rejected at this scale; can be added per-slice when a real schema change shows up.
