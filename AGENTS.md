# AGENTS.md

You are an expert in Typescript, Rsbuild, and web application development.
You write maintainable, performant, and accessible code. This file collects
rules specific to this codebase. Where it disagrees with general convention,
follow this file.

## Commands

- `pnpm dev` — start the dev server (port 3000)
- `pnpm build` — production build to `dist/`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — vitest run
- `pnpm lint` / `pnpm format` — ESLint / Prettier
- `pnpm check:sync` — verify host ↔ remote contract files are in sync (CI-enforced)
- `pnpm gen` / `pnpm gen:component <Name>` / `pnpm gen:page <Name>` / `pnpm gen:slice <name>` — scaffold from `plop-templates/`. Use these instead of hand-rolling files; they produce code that already matches AGENTS.md/STYLING.md conventions.
- `pnpm e2e` — Playwright host↔remote smoke (requires `pnpm e2e:install` once)

## Companion docs (read first when relevant)

- **[STATE_CONTRACT.md](STATE_CONTRACT.md)** — the three files that define `AppState`. Touch one, touch all three.
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** — symptom-first index of common failure modes.
- **[docs/REMOTE_HOST_COMMS.md](docs/REMOTE_HOST_COMMS.md)** — the four ways host and remote talk to each other.
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — env vars, CORS, federation versioning, rollback.
- **[docs/adr/](docs/adr/)** — ADRs for load-bearing decisions (read before proposing structural changes).
- **[STYLING.md](STYLING.md)** — the full style ruleset.

## External docs

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
- TanStack Query: https://tanstack.com/query/latest/docs/react/overview
- Zustand: https://zustand.docs.pmnd.rs

## Folder structure

```
src/
├── App.tsx, App.scss, bootstrap.tsx, main.tsx, env.d.ts
├── components/    # leaf UI primitives (Button, Card, Spinner, …)
├── features/      # composed cross-cutting UI (Navbar, etc.)
├── pages/         # route-level components
├── router/        # AppRoutes + nav-links data
└── shared/        # anything imported by 2+ siblings above
    ├── config/    # *.constants.ts files
    ├── lib/       # external-world adapters: api, queryClient, mfRuntimePlugin
    ├── stores/    # zustand store + slices/
    ├── styles/    # tokens, themes, mixins
    ├── test/      # vitest setup, renderWithProviders
    ├── types/     # cross-cutting types, remotes.d.ts
    └── utils/     # pure helpers (no I/O, no side effects)
```

**The `shared/` rule:** code goes in `shared/` **iff** more than one sibling
imports it. Single-use code colocates with the feature that uses it.

**`lib/` vs `utils/`** — keep distinct, don't merge:

- `shared/lib/` = code that touches the outside world — HTTP clients, SDK
  adapters, browser APIs, the federation runtime plugin.
- `shared/utils/` = pure functions, no I/O, no side effects.

**Where things must stay:**

- `App.tsx`, `bootstrap.tsx`, `main.tsx`, `env.d.ts` at `src/` root — moving
  any of these breaks the async-import federation boundary or build config.
- Page components in `pages/`, never in `components/`.
- Single-feature code lives WITH that feature (`features/Foo/`), not in
  `shared/`.
- `*.module.scss` colocates with its component (`Button.module.scss` next to
  `Button.tsx`).

## Path aliases

[`config.alias.ts`](config.alias.ts) at the project root is the **single
source of truth** for `@/...` imports. [`tsconfig.json`](tsconfig.json)'s
`paths` block MUST mirror it. When you add a new alias, update BOTH or
TypeScript and Rsbuild disagree silently (TS resolves, build fails — or
vice versa).

Currently defined:

| Alias             | Maps to           |
| ----------------- | ----------------- |
| `@/...`           | `src/`            |
| `@components/...` | `src/components/` |
| `@features/...`   | `src/features/`   |
| `@pages/...`      | `src/pages/`      |
| `@shared/...`     | `src/shared/`     |

Use the most-specific alias when one exists. Both `@/shared/stores/store`
and `@shared/stores/store` resolve to the same file; prefer the latter.

**Don't add a single-file alias** (`@store`, `@queryClient`). Aliases are
for folders that have grown enough to warrant their own root. New ones only
when a folder has 3+ entry points being imported from across the app.

## Federation

The host **exposes** modules to remotes AND **self-federates** (consumes
its own exposed modules). Self-federation is what makes shared state work
— without it the host evaluates its store once directly AND once via the
federation runtime, getting two instances with independent subscriptions.

**The import rule:** if a module is federated, import it via the federated
path even from host source code.

| Federated module | Use                                | Never use in source            |
| ---------------- | ---------------------------------- | ------------------------------ |
| App store        | `from 'hostTemplate/stores/store'` | `from '@/shared/stores/store'` |
| Event bus        | `from 'hostTemplate/lib/eventBus'` | `from '@/shared/lib/eventBus'` |

Tests are the exception — they use `@/shared/stores/store` (and rely on
[vitest.config.ts](vitest.config.ts) aliasing the federation path to the
local file for component tests).

**Exposing a new module** (four files touch in lock-step):

1. Add to `FEDERATION.EXPOSES` in [src/shared/config/app.constants.ts](src/shared/config/app.constants.ts)
2. Add to the `exposes` block in [rsbuild.config.ts](rsbuild.config.ts)
   (reads the constant)
3. Declare in [src/shared/types/remotes.d.ts](src/shared/types/remotes.d.ts):
   `declare module 'hostTemplate/<path>' { export * from '@/<path>'; }`
4. Add a vitest alias in [vitest.config.ts](vitest.config.ts) so tests can
   import via the federated specifier
5. (Remote side) Mirror the shape in remote's `remotes.d.ts` and (if state)
   `localStore.ts` fallback

**Singletons that MUST stay in the `shared` block** (rsbuild.config.ts):
`react`, `react-dom`, `react-router-dom`, `zustand`, `@tanstack/react-query`.
All five hold module-level state (contexts, registries, listeners) — two
copies of any of them and the remote's hooks look at a different context
key than the host's provider supplies. Symptoms range from "useStore returns
undefined" to "useQuery throws No QueryClient set". When you add a library
with a Context-based provider or a module-level registry, add it here as a
non-eager singleton.

## Stores & slices

One composed zustand store. Lives at
[src/shared/stores/store.ts](src/shared/stores/store.ts), composes slices
from [src/shared/stores/slices/](src/shared/stores/slices/).

**Adding a new slice:**

1. Create `slices/newSlice.ts`:

   ```ts
   import type { StateCreator } from 'zustand';
   import type { AppState } from '../store';

   export type NewSlice = {
     /* state + actions */
   };

   export const createNewSlice: StateCreator<AppState, [], [], NewSlice> = (set) => ({
     // ...
   });
   ```

2. In `store.ts`: import the slice creator + type, spread the creator into
   the `persist` callback, and intersect the type into `AppState`.
3. Mirror the shape additions on the **remote side**:
   - `afsd.remote-mfe/src/shared/stores/localStore.ts` (standalone fallback)
   - `afsd.remote-mfe/src/shared/types/remotes.d.ts` (federated declaration)
4. Run `pnpm check:sync` to confirm the three files agree.
5. Bump `STORAGE.STORE_VERSION` in BOTH `app.constants.ts` files iff the change is persist-incompatible (renamed field, removed field, narrowed type). New optional fields don't need a bump.

These three files (host's slice + remote's localStore + remote's
`remotes.d.ts`) form a contract documented in
[STATE_CONTRACT.md](STATE_CONTRACT.md). Drift is a silent
standalone-vs-embedded behavior bug — the CI sync check catches it before merge.

**When to add a SECOND store** (default is one composed store):

1. **Different lifecycle.** Server state has a request/response lifecycle,
   not a session lifecycle — use TanStack Query, not a slice.
2. **Different persistence backend.** E.g., IndexedDB-backed drafts
   alongside sessionStorage-backed session.
3. **High-frequency isolated updates** (30+ writes/sec) causing measurable
   render fanout. Profile first — zustand's selector shallow-equality
   usually makes this a non-issue.

## Styling

See [STYLING.md](STYLING.md) for the full rules: rem-by-default, px-only-with-justification, no `!important` outside documented exceptions, token consumption, mixin usage, breakpoint helpers, and the reviewer's checklist.

**Use semantic CSS vars from [`shared/styles/_tokens.scss`](src/shared/styles/_tokens.scss).
Never write raw colors, sizes, radii, or shadows in component styles.**

The token system has two layers — components consume ONLY the second:

- **Palette** (`--palette-slate-500`, `--palette-indigo-600`, …) — raw
  scales. Never consumed by components.
- **Semantic** (`--color-bg-surface`, `--color-text-primary`,
  `--space-4`, `--radius-md`, `--shadow-sm`, `--z-modal`, …) —
  theme-bound aliases. Components consume these.

If you need a new semantic value, add it to both
`:root[data-theme='dark']` and `:root[data-theme='light']` blocks in
`_tokens.scss`. Don't reach into palette colors directly from a component.

**Styling primitives:**

- `*.module.scss` colocated with the component, imported as
  `import s from './Foo.module.scss'` → `className={s.root}`.
- `_*.scss` partials in `shared/styles/` are imported by other SCSS, never
  bundled directly.
- Tailwind v4 utilities work in JSX `className` for one-off layout
  (`flex`, `gap-4`, `items-center`). Don't use Tailwind for color,
  thematic spacing, or anything that should respond to theme — use the CSS
  vars there.

**Adding a theme:**

1. Add `:root[data-theme='<id>'] { /* semantic vars */ }` block in
   `_tokens.scss`.
2. Append entry to `THEMES` in
   [`shared/styles/theme.config.ts`](src/shared/styles/theme.config.ts).
3. Widen the `Theme` union in
   [`shared/stores/slices/uiSlice.ts`](src/shared/stores/slices/uiSlice.ts).

## Configuration constants

Values shared across `rsbuild.config.ts`, `vitest.config.ts`, and source code
live in [src/shared/config/app.constants.ts](src/shared/config/app.constants.ts).
**When a literal appears in more than one place, consolidate it here.**

**Naming convention:** all consolidated-value files in this codebase use the
`*.constants.ts` suffix. If you create a new one (e.g., `routes.constants.ts`,
`theme.constants.ts`), follow the same rules below.

**File rules** (break these and build configs stop loading):

1. **Self-contained — no `@/...` alias imports.** Build configs load the
   constants file BEFORE the bundler's alias resolver wires up. Use relative
   imports or stdlib only. Pure data + types — no side effects, no
   initialization.
2. **`as const` objects, NOT `enum`s.** Three reasons:
   - `const enum` doesn't work with `verbatimModuleSyntax: true` (which this
     repo uses) — strips at compile time, can't cross module boundaries.
   - Plain `enum` adds bundle weight + reverse-mappings nobody wants.
   - `as const` gives literal-type inference, runtime presence (for debugging
     and `Object.values`), and tree-shakes cleanly.
3. **Group by concern** — `FEDERATION`, `APP`, `STORAGE`, `ENV`. Don't dump
   everything in a flat list.

**When to add a value here:**

- It appears in 2+ config files (rsbuild, vitest, etc.).
- It appears in a config file AND source code.
- It's a contract (federation name, persist key, storage version) — bugs from
  drift are silent and painful.

**When NOT to add a value here:**

- Single-file constants (e.g., a const list inside one component).
- Env-driven values that change per deploy — those belong in env vars, with
  fallback defaults in `ENV.*`.
- UI-layer tokens — those go in `shared/styles/`.

**Cross-template invariants** (must match between host and remote):

- `STORAGE.STORE_KEY`, `STORAGE.STORE_VERSION`
- `ENV.PUBLIC_PREFIXES`, `ENV.DEFAULT_HOST_URL`, `ENV.DEFAULT_REMOTE_URL`

The remote's `app.constants.ts` has the same structure with its own
perspective (`FEDERATION.NAME='remoteTemplate'`, `APP.PORT=3001`, etc.).

## Tests

Colocate tests with the source they cover: `Foo/Foo.test.tsx` next to
`Foo/Foo.tsx`. Shared-helper tests live next to the helper in `shared/test/`.

**Use `renderWithProviders` for every component test.** It's the canonical
wrapper for router + TanStack Query + zustand. Don't reach for raw
`@testing-library/react`'s `render` unless the component consumes none of
those providers (rare).

```ts
import { renderWithProviders, resetStore } from '@/shared/test/renderWithProviders';

afterEach(resetStore);

it('does the thing', () => {
  renderWithProviders(<Foo />, {
    route: '/cart',                  // optional, default '/'
    seedStore: { theme: 'light' },   // optional, merged into AppState
  });
  // ...
});
```

- **Seed state via `seedStore`**, not by importing and calling actions
  manually before render. Keeps the setup declarative.
- **Reset the store in `afterEach`** via the exported `resetStore`. Zustand
  is module-level — state leaks across tests otherwise.
- **Federation paths in tests:** components that import from
  `hostTemplate/stores/store` work because `vitest.config.ts` aliases that
  specifier to the local file. When you expose a new federated module, add
  a matching alias.

Canonical examples:

- [src/components/ThemeToggle/ThemeToggle.test.tsx](src/components/ThemeToggle/ThemeToggle.test.tsx) — component + store
- [src/shared/test/renderWithProviders.test.tsx](src/shared/test/renderWithProviders.test.tsx) — query + router
- [src/shared/stores/store.test.ts](src/shared/stores/store.test.ts) — pure store unit tests

MSW is wired in at `src/shared/test/msw/`. Add handlers there as endpoints
appear; `setup.ts` starts the server in test runs. See its README for the
handler convention.

## Cross-template sync (CI-enforced)

A small set of files MUST be byte-identical between host and remote, and the
federated `AppState` shape MUST stay shape-compatible across three files.
`scripts/check-sync.ts` enforces both. CI runs `pnpm check:sync` on the host;
local repro is the same command.

When the check fails:

1. Decide which side has the correct content — the host is the canonical source.
2. Update the lagging side to match.
3. For `AppState` drift, follow the [STATE_CONTRACT.md](STATE_CONTRACT.md) checklist.

To add a new file pair to the sync list, edit `BYTE_IDENTICAL_FILES` or
`CONTRACT_CHECKS` in `scripts/check-sync.ts`.

See [docs/adr/0002-templates-stay-independent.md](docs/adr/0002-templates-stay-independent.md)
for why we use sync-by-copy rather than a workspace.

## Remote ↔ host communication

Four patterns: shared store, event bus, query cache, props. Picking the
wrong one is a common AI-agent failure. See
[docs/REMOTE_HOST_COMMS.md](docs/REMOTE_HOST_COMMS.md) for the
when-to-use-which decision table.

## Troubleshooting

For common failure modes (federation errors, theme desync, persisted state
empty, HMR breaking, sync-check failures) see
[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). It's symptom-indexed —
search by what you see, not what you think the cause is.
