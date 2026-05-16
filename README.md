# afsd.host-mfe

Host shell for an rsbuild + React 19 micro-frontend architecture. Owns the
top-level layout (sticky navbar, mobile drawer, route tree), the shared
session/cart store, and the contract that remote MFEs plug into.

Paired with [albertfromsd/afsd.remote-mfe](https://github.com/albertfromsd/afsd.remote-mfe).

## Stack

| Layer                | Choice                                                        |
| -------------------- | ------------------------------------------------------------- |
| Bundler / dev server | [rsbuild](https://rsbuild.rs)                                 |
| Module Federation    | [`@module-federation/enhanced`](https://module-federation.io) |
| UI                   | React 19 + react-router-dom v7                                |
| State                | zustand (federated, sessionStorage-persisted)                 |
| Styles               | SCSS Modules + Tailwind v4                                    |
| Tests                | Vitest + Testing Library + jsdom                              |
| Lint / format        | ESLint flat config + Prettier                                 |
| Pre-commit           | husky + lint-staged                                           |
| Component docs       | Storybook                                                     |
| HTTP                 | axios (base client with interceptors)                         |

## Quick start

```bash
pnpm install
cp .env.example .env  # adjust if hosting elsewhere
pnpm dev               # → http://localhost:3000
```

The host expects the remote to be running at `PUBLIC_REMOTE_TEMPLATE_URL`
(defaults to `http://localhost:3001`) — start the remote in a second terminal
before navigating to `/remote/*`. Standalone the host still loads; remote routes
will show the `RemoteApp` error fallback with a retry button.

## Scripts

| Command                | What it does                                |
| ---------------------- | ------------------------------------------- |
| `pnpm dev`             | Dev server with HMR on port 3000            |
| `pnpm build`           | Production build to `dist/`                 |
| `pnpm preview`         | Serve the production build locally          |
| `pnpm analyze`         | Build with bundle analyzer (`ANALYZE=true`) |
| `pnpm typecheck`       | `tsc --noEmit`                              |
| `pnpm test`            | Vitest run (CI mode)                        |
| `pnpm test:watch`      | Vitest watch mode                           |
| `pnpm lint`            | ESLint over the project                     |
| `pnpm format`          | Prettier `--write` over everything          |
| `pnpm storybook`       | Storybook dev on port 6006                  |
| `pnpm build-storybook` | Static Storybook to `storybook-static/`     |

## Architecture

### Module Federation topology (bidirectional)

```
host (3000)  ─── consumes ───►  remote (3001) ./App
   │                                  ▲
   ├── exposes ./stores/session ──────┘
   │                                  │
   └── consumes its own ./stores/session ──┘   (self-federation —
                                                see "Why self-federation"
                                                below)
```

Both apps share `react`, `react-dom`, `react-router-dom`, and `zustand` as
non-eager singletons. Non-eager is paired with the
`main.tsx → import('./bootstrap')` async-import pattern so federation can
fully wire up the share scope before any component runs.

### Why self-federation (host loads its own exposed module)

Without it, the host evaluates `src/stores/session.ts` directly (one store
instance) **and** the remote loads `hostTemplate/stores/session` via federation
(a separate evaluation → second store instance). Both persist to the same
sessionStorage key but their in-memory subscriptions are independent. Symptom:
remote writes don't trigger host re-renders.

Fix: the host imports the store through the same federated path the remote
uses, so both go through one runtime container. The host therefore registers
**itself** as a remote in [rsbuild.config.ts](rsbuild.config.ts) — circular at
config-level, single-instance at runtime.

### Bootstrap pattern

```
main.tsx           — entry, the only file that's actually statically eager
   │   (provides the async boundary MF needs)
   ▼
bootstrap.tsx      — BrowserRouter + ReactDOM.createRoot
   │
   ▼
App.tsx            — layout shell (Navbar above, Routes inside an
                     ErrorBoundary)
```

### Route tree

| Path                                 | Component                                     | Notes                                          |
| ------------------------------------ | --------------------------------------------- | ---------------------------------------------- |
| `/`                                  | inline placeholder                            |                                                |
| `/about`, `/pricing`, `/solutions/*` | inline placeholders                           |                                                |
| `/cart`                              | `pages/Cart.tsx`                              | reads + mutates federated cart                 |
| `/remote/*`                          | `<RemoteApp />` wrapping `remoteTemplate/App` | child remote owns everything under this prefix |
| `*`                                  | not-found                                     |                                                |

### `RemoteApp` wrapper

`src/components/RemoteApp/RemoteApp.tsx` is the reusable surface every
federated remote gets mounted through. Props:

```ts
type RemoteAppProps = {
  Component: ComponentType; // typically a `lazy(() => import('foo/App'))`
  name: string; // displayed in the loading/error UI
  loadingMessage?: string;
  errorMessage?: string;
  fallbackComponent?: ReactNode; // override the default Spinner UI
};
```

Internally: `<ErrorBoundary><Suspense>…</Suspense></ErrorBoundary>`. The
error boundary catches _this remote's_ failures only — the host's navbar,
routes, and other remotes are unaffected.

### Error boundary layering

```
<Navbar />                          ← never inside any boundary
<main>
  <ErrorBoundary>                   ← outer safety net for all routes
    <Routes>
      <Route path="/remote/*" element={
        <RemoteApp>                 ← inner per-remote boundary with named UX
          <Suspense>
            <RemoteTemplateApp />
          </Suspense>
        </RemoteApp>
      } />
    </Routes>
  </ErrorBoundary>
</main>
```

This means: if _any_ route throws, the outer boundary catches it and the
navbar stays interactive. If _only the remote_ throws, the inner boundary
catches it with a remote-named fallback and a retry button; the rest of the
routed tree is unaffected.

### Federated state

The session store ([src/stores/session.ts](src/stores/session.ts)) is the
canonical instance. It uses zustand's `persist` middleware to write to
sessionStorage under `afsd.session.v1` with `version`-keyed migrations,
plus `devtools` in non-production. Shape:

```ts
type SessionState = {
  userId: string | null;
  displayName: string | null;
  theme: 'light' | 'dark';
  cart: CartItem[];
  setUser / clearUser / setTheme;
  addToCart / incrementCart / decrementCart / removeFromCart / clearCart;
};
```

**Host code** imports it through the federated path (NOT `@/stores/session`):

```ts
import { useSessionStore } from 'hostTemplate/stores/session';
```

**Remote code** imports through its accessor (which dynamically loads the
federated module, with a local fallback for standalone mode):

```ts
import { useSessionStore } from '@/stores/sessionAccessor'; // remote-side
```

### Type sharing across the federation boundary

The `dts` option on the module federation plugin (configured in
[rsbuild.config.ts](rsbuild.config.ts)) is intended to auto-generate `.d.ts`
declarations for exposed modules and pull remote types into `@mf-types/`
(gitignored, referenced from `tsconfig.json` via `"*": ["./@mf-types/*"]`).

**Current status**: the option is wired but the rsbuild wrapper isn't
emitting `@mf-types/` reliably (the wrapper imports
`ModuleFederationPluginOptions` from `@rspack/core`, which lags behind
`@module-federation/enhanced`'s runtime support — hence the
`@ts-expect-error`). The wiring stays in place because it costs nothing and
may start working as the wrapper catches up.

**Source of truth today**: hand-written declarations under
[src/shared/types/remotes.d.ts](src/shared/types/remotes.d.ts) for the host,
and `src/hostRemotes.d.ts` on the remote side. When you change the shape of
an exposed module, update both sides.

## Adding a new remote

1. **In this host's [rsbuild.config.ts](rsbuild.config.ts):**

   ```ts
   remotes: {
     // ...existing
     newRemote: `newRemote@${process.env.PUBLIC_NEW_REMOTE_URL ?? 'http://localhost:3002'}/remoteEntry.js`,
   }
   ```

2. **Type declaration** in [src/shared/types/remotes.d.ts](src/shared/types/remotes.d.ts):

   ```ts
   declare module 'newRemote/App' {
     const App: React.ComponentType;
     export default App;
   }
   ```

3. **Route entry** in [src/router/Routes.tsx](src/router/Routes.tsx):

   ```tsx
   const NewRemoteApp = lazy(() => import('newRemote/App'));

   <Route
     path="/new-remote/*"
     element={<RemoteApp Component={NewRemoteApp} name="New Remote" />}
   />;
   ```

4. **Nav entry** in [src/router/nav-links.ts](src/router/nav-links.ts).

5. **Env var** in `.env.example`.

## Environment variables

Vars prefixed with `PUBLIC_` or `APP_` are inlined at build time via
`loadEnv`. See [.env.example](.env.example) for the canonical list.

| Var                          | Default                 | Purpose                                                                                             |
| ---------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `PUBLIC_HOST_TEMPLATE_URL`   | `http://localhost:3000` | Origin where this host serves its own `hostRemoteEntry.js` (used by self-federation and by remotes) |
| `PUBLIC_REMOTE_TEMPLATE_URL` | `http://localhost:3001` | Origin where the remote serves `remoteEntry.js`                                                     |
| `PUBLIC_API_BASE_URL`        | _(unset)_               | Base URL for the axios `api` client in [src/lib/api.ts](src/lib/api.ts)                             |
| `ANALYZE`                    | `false`                 | Set to `true` (via `pnpm analyze`) to emit a bundle report                                          |

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs lint → typecheck →
test → build on PRs and pushes to `master`/`main`. Uses pnpm cache + Node
version from `.nvmrc`.

## Known gotchas

- **HMR can't reconcile MF config changes.** After editing `rsbuild.config.ts`
  exposes/remotes/shared, restart `pnpm dev` and hard-refresh browsers.
- **Browser cache invalidation across federation.** When you change the
  shape of an exposed module, every consuming remote sees the new shape on
  next page load — _not_ immediately on the running page.
- **Standalone vs embedded for remotes.** Remotes are responsible for
  providing `BrowserRouter` only in their standalone bootstrap; the exposed
  `App` must _not_ re-wrap, or the host's router is shadowed. See the
  remote repo for the pattern.

## Repo layout

```
src/
├── App.{tsx,css}                 # shell: Navbar + ErrorBoundary + Routes
├── main.tsx → bootstrap.tsx      # MF async-import entry
├── components/
│   ├── RemoteApp/                # reusable wrapper for federated remotes
│   ├── Skeleton/
│   ├── Spinner/
│   └── NavNode/
├── config/                       # build-time config types
├── features/
│   └── Navbar/                   # top bar w/ mobile drawer + cart badge
├── lib/
│   ├── api.ts                    # axios client + interceptors
│   └── mfRuntimePlugin.ts        # federation runtime error hook
├── pages/                        # host-owned route components
├── router/                       # AppRoutes + nav-links data
├── shared/types/remotes.d.ts     # federated module declarations
├── stores/session.ts             # canonical zustand store (federated)
└── test/setup.ts                 # vitest setup (testing-library cleanup)
```
