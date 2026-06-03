# 0002. Templates stay independent (no monorepo workspace)

**Status:** Accepted
**Date:** 2026-05-25

## Context

Both templates share a non-trivial amount of code: design tokens, the api
client, the QueryClient factory, the MF runtime plugin, several config files.
The natural reflex is to extract these into a pnpm workspace with shared
`libs/` packages.

Two reasons we don't:

1. **Templates are seeds, not apps.** A vibe-coder clones one or both, then
   evolves them independently. A workspace forces every downstream project
   to either adopt the workspace structure or rip it out — both are friction.

2. **Windows path-length constraint** (see memory
   `project_afsd_windows_path_length`). pnpm's absolute paths through nested
   workspaces blow past Windows' 260-char limit and break Vite/Vitest with
   cryptic `#module-sync-enabled` errors. Independent templates dodge this.

## Decision

Templates stay independent. Each is a standalone, deployable React +
Rsbuild + Module Federation app. Sharing happens by **byte-identical copies**
plus a **CI-enforced drift check** (`scripts/check-sync.ts`).

## Consequences

**Easier:**

- Clone either template alone and it just works.
- No workspace tooling to learn, no nested `node_modules` to debug.
- Windows-safe paths.

**Harder:**

- Same file edited twice — once in host, once in remote.
- Manual sync discipline.

**Accepted:**

- The drift check is the only safety net. If a sync-protected file changes
  in only one template, CI fails. The fix is to copy the same change to the
  other side, not to disable the check.

## Alternatives considered

- **pnpm workspace with `libs/`** — Rejected for path-length + template-seed reasons above.
- **Git submodule for shared code** — Rejected; submodule UX is hostile, especially for AI agents that don't reliably handle submodule init/update.
- **Published npm package (e.g., `@afsd/design-tokens`)** — Rejected at this stage; introduces release tooling and version lag for what's still iterating fast. Reconsider once the templates stabilize.
