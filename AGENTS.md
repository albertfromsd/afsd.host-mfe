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

## External docs

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
- TanStack Query: https://tanstack.com/query/latest/docs/react/overview
- Zustand: https://zustand.docs.pmnd.rs

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

Don't add MSW yet — defer until we have a real API surface to mock.
