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
| Server state         | TanStack Query (host-provided, context-inherited by remotes)  |
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
   ├── exposes ./stores/store ────────┘
   │                                  │
   └── consumes its own ./stores/store ──┘   (self-federation —
                                              see "Why self-federation"
                                              below)
```

Both apps share `react`, `react-dom`, `react-router-dom`, `zustand`, and
`@tanstack/react-query` as non-eager singletons. Non-eager is paired with the
`main.tsx → import('./bootstrap')` async-import pattern so federation can
fully wire up the share scope before any component runs.

> **Why `@tanstack/react-query` must be a singleton:** it stores the active
> `QueryClient` in a React context object created at module-load time. Two
> module copies → two different context objects → the remote's `useQuery`
> never finds the host's provider. The same trap as duplicated `react`.

### Why self-federation (host loads its own exposed module)

Without it, the host evaluates `src/shared/stores/store.ts` directly (one
store instance) **and** the remote loads `hostTemplate/stores/store` via
federation (a separate evaluation → second store instance). Both persist to
the same sessionStorage key but their in-memory subscriptions are independent.
Symptom: remote writes don't trigger host re-renders.

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

The canonical store lives at
[src/shared/stores/store.ts](src/shared/stores/store.ts). It composes three
slices from [src/shared/stores/slices/](src/shared/stores/slices/) and applies
zustand's `persist` middleware (sessionStorage, key `afsd.store.v1`, version-
keyed migrations) plus `devtools` in non-production:

```
shared/stores/
├── store.ts                # main store: AppState = AuthSlice & UiSlice & CartSlice
└── slices/
    ├── authSlice.ts        # userId, displayName, setUser, clearUser
    ├── uiSlice.ts          # theme, setTheme
    └── cartSlice.ts        # cart, addToCart, incrementCart, decrementCart, …
```

Each slice file exports `createXSlice: StateCreator<AppState, [], [], XSlice>`
and its own `XSlice` type. `store.ts` aggregates them: `AppState = AuthSlice &
UiSlice & CartSlice`. Adding a slice is two files (`slices/newSlice.ts` +
spread it in `store.ts`).

**Host code** imports the hook through the federated path (NOT
`@/shared/stores/store` — that would evaluate a second instance; see
"Why self-federation"):

```ts
import { useStore } from 'hostTemplate/stores/store';
```

**Remote code** imports through its accessor (which dynamically loads the
federated module, with a local fallback for standalone mode):

```ts
import { useStore } from '@/shared/stores/storeAccessor'; // remote-side
```

**When a second store is appropriate** (the default for this template is one
composed store):

1. Lifecycle differs — e.g., server-state cache (TanStack Query) has a
   request/response lifecycle, not a session lifecycle.
2. Different persistence backend — e.g., IndexedDB-backed drafts alongside
   sessionStorage-backed session.
3. High-frequency isolated updates — e.g., 30+ writes/sec presence/cursor
   data. Only break out if profiling shows render fanout.

### Server state — TanStack Query

Server state (HTTP cache, in-flight requests, refetch behavior) lives in a
TanStack Query `QueryClient`, **not** the zustand store. The two have
different lifecycles and shouldn't share a store (see above).

The host creates the canonical `QueryClient` at
[src/shared/lib/queryClient.ts](src/shared/lib/queryClient.ts) and wraps the
entire route tree in `<QueryClientProvider client={queryClient}>` inside
[App.tsx](src/App.tsx). Because the federated remote `<App />` renders as a
child of those routes, **the remote inherits the host's `QueryClient` via
React context automatically** — no module federation needed for server state.
One client, one cache, one set of in-flight requests for the whole MFE app.

```ts
// host or remote (when embedded)
import { useQuery } from '@tanstack/react-query';

function ProfileCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get('/me').then((r) => r.data),
  });
  // ...
}
```

**Defaults** are set centrally in `createQueryClient()` — adjust there once
to change behavior everywhere. Current shape:

| Option                         | Value  | Why                                           |
| ------------------------------ | ------ | --------------------------------------------- |
| `queries.staleTime`            | 60s    | Fresh-enough window; refetches on focus       |
| `queries.gcTime`               | 5min   | Cache retained while components are unmounted |
| `queries.refetchOnWindowFocus` | `true` | Keep UI in sync after tab focus               |
| `queries.retry`                | smart  | Retry up to 2x; never retry 4xx               |
| `mutations.retry`              | `0`    | Mutations are destructive; don't retry blind  |

**React Query Devtools** are rendered only in non-production (`bottom-left`).
Because there's one provider for the whole app, the host's devtools sees
queries fired from both host and remote.

**Standalone remote** creates its own `QueryClient` from the same factory in
its `bootstrap.tsx` (mirrors the BrowserRouter pattern: provider only when
running standalone). See the remote repo for details.

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
[src/shared/types/remotes.d.ts](src/shared/types/remotes.d.ts) on each side.
When you change the shape of an exposed module, update both files.

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
| `PUBLIC_API_BASE_URL`        | _(unset)_               | Base URL for the axios `api` client in [src/shared/lib/api.ts](src/shared/lib/api.ts)               |
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
├── App.{tsx,scss}                # shell: Navbar + ErrorBoundary + Routes
├── main.tsx → bootstrap.tsx      # MF async-import entry
├── components/                   # leaf UI primitives (colocated .stories.ts)
│   ├── Button/  Card/  Link/  NavNode/  Page/
│   ├── RemoteApp/                # reusable wrapper for federated remotes
│   ├── Skeleton/  Spinner/  ThemeToggle/
├── features/                     # composed cross-cutting UI
│   └── Navbar/                   # top bar w/ mobile drawer + cart badge
├── pages/                        # host-owned route components
├── router/                       # AppRoutes + nav-links data
└── shared/                       # anything imported by 2+ siblings above
    ├── config/                   # app.config.ts (build/env-derived settings)
    ├── lib/                      # external-world adapters
    │   ├── api.ts                # axios client + interceptors
    │   ├── queryClient.ts        # TanStack Query client (host-provided via context)
    │   └── mfRuntimePlugin.ts    # federation runtime error hook
    ├── stores/                   # zustand store (federated)
    │   ├── store.ts              # canonical instance — composes slices
    │   └── slices/               # authSlice, uiSlice, cartSlice
    ├── styles/                   # tokens, themes, mixins
    ├── test/setup.ts             # vitest setup (testing-library cleanup)
    ├── types/                    # cross-cutting types + remotes.d.ts
    └── utils/                    # pure helpers
```
