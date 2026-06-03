# Troubleshooting

Symptom-first index of the failure modes you'll hit most often. Each entry
has a one-sentence root cause and the file(s) to inspect.

## Federation

### `Uncaught Error: remoteTemplate is not defined`

**Cause:** the remote's federation entry didn't load (network error, wrong
URL, remote not running).

Check:

1. Open DevTools → Network. Is `remoteEntry.js` requested? Status?
2. Does `PUBLIC_REMOTE_TEMPLATE_URL` (or the `ENV.DEFAULT_REMOTE_URL`
   fallback in `src/shared/config/app.constants.ts`) point at a server that's
   actually running?
3. Is the remote dev server up? `cd ../afsd.remote-mfe && pnpm dev`.
4. CORS — does the remote's dev server allow the host's origin? Rsbuild
   dev-server allows `*` by default; check `rsbuild.config.ts` if you've
   customized.

### `Shared module is not available for eager consumption`

**Cause:** an entry file imports something that the shared singleton plugin
expects to be lazy-loadable, but it's being pulled synchronously.

Fix: ensure `main.tsx` is a thin shim that does `import('./bootstrap')` and
nothing else. All real code lives in `bootstrap.tsx`. This is why the
template ships with that two-file split — don't collapse them.

### `Loading chunk N failed`

**Cause:** the remote was redeployed and chunk hashes changed while a user's
tab was still open.

Mitigation: the runtime plugin in `src/shared/lib/mfRuntimePlugin.ts`
catches `errorLoadRemote` and surfaces it to the error boundary. For
production, pair with a Service Worker that prompts to reload, or use
content-hash-stable chunk naming.

### Two store instances (state doesn't propagate across host↔remote)

**Cause:** the host is importing its own store via `@/...` instead of via
the federated specifier. See `docs/adr/0003-self-federation.md`.

Fix: every host import of the store must be
`from 'hostTemplate/stores/store'`, not `from '@/shared/stores/store'`. The
exception is tests (vitest config aliases the federated specifier back to
the local file).

## State

### Theme changed in host, remote didn't update (or vice versa)

**Cause:** the `data-theme` attribute lives on `<html>` in the host's
document. The remote, when embedded, paints into the same document and
reads the same attribute. If the remote is iframed or in a separate
document, it won't see the change.

Check: are host and remote sharing the same `useStore` instance? Run this
in DevTools console on the host:

```js
window.__ZUSTAND_STORES__?.['host-app']?.getState().theme;
```

Then on a remote component:

```js
window.__ZUSTAND_STORES__?.['host-app']?.getState().theme;
```

Both should print the same value. If they differ, you have two store
instances — see "Two store instances" above.

### Persisted state empty after refresh

**Causes (most→least common):**

1. `STORAGE.STORE_VERSION` was bumped — by design, this drops the persisted
   state. Intentional after schema changes (see `docs/adr/0004`).
2. `STORAGE.STORE_KEY` differs between host and remote — would split
   sessionStorage. `pnpm check:sync` catches this.
3. Browser blocked sessionStorage (private window in some browsers, storage
   quota, third-party context). Check `window.sessionStorage` access.

### Standalone remote works, embedded remote breaks (or vice versa)

**Cause:** drift between host slices, remote `localStore.ts`, and remote
`remotes.d.ts`. See `STATE_CONTRACT.md`.

Fix: `cd afsd.host-mfe && pnpm check:sync`.

## Build / Dev server

### HMR stops working after editing a federated module

**Cause:** rsbuild's HMR doesn't always update across federation boundaries
cleanly for changes to _exposed_ modules.

Workaround: hard-refresh the host page. If it persists across refreshes,
restart both dev servers — `pnpm dev` host, `pnpm dev` remote.

### `Cannot find module '@mf-types/...'`

**Cause:** `@module-federation/enhanced`'s `dts` plugin hasn't emitted
types yet (first run, or after a clean).

Fix: start one dev server first (host or remote, either works) — types
generate on first build. Then start the other. If types are still missing,
delete `@mf-types/` and `dist/` and re-run `pnpm dev`.

### `Module Federation: federation lifecycle error...` (cryptic, no detail)

**Cause:** the runtime plugin's `errorLoadRemote` hook surfaces these.
Look at the browser console — the message logged by
`src/shared/lib/mfRuntimePlugin.ts` includes the federated `id` and the
underlying error.

### Vite/Vitest fails with `#module-sync-enabled` on Windows

**Cause:** Windows path-length limit (260 chars). pnpm's absolute paths
exceed it. Documented in `MEMORY.md`.

Fix: move the project closer to the drive root (e.g., `C:\projects\` not
`C:\Users\you\Documents\.projects\...`). Don't nest templates in deep folder
hierarchies.

## Tests

### Test passes but the component breaks in browser

**Cause:** vitest doesn't load SCSS. CSS-var-based theming, layout, and
`!important` issues are invisible to tests.

Fix: add a Playwright smoke test for the path. Visual regressions need
Storybook + Chromatic (or similar) — not in this template by default.

### `useStore is not a function` in tests

**Cause:** `vitest.config.ts` doesn't alias `hostTemplate/stores/store` to
the local file, OR the test imports the federated specifier but ran before
the alias loaded.

Fix: ensure `vitest.config.ts` has the alias entry for every federated
module the test touches.

## Sync check

### `pnpm check:sync` fails locally but I didn't touch those files

**Cause:** the remote is at a stale checkout, or the sibling-template path
isn't where the script expects (`../afsd.remote-mfe`).

Fix: set `SYNC_REMOTE_PATH` env var to point at your local remote, e.g.
`SYNC_REMOTE_PATH=../foo-remote pnpm check:sync`.

### Sync check passes locally, fails in CI

**Cause:** CI checked out only one template. The drift check needs both.

Fix: CI either checks out both as siblings, or skips the check. See
`.github/workflows/ci.yml` for the matrix pattern used here.
