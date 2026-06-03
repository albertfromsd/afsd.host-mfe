/**
 * App-wide configuration constants for the AFSD host template.
 *
 * Single source of truth for values shared across `rsbuild.config.ts`,
 * `vitest.config.ts`, and source code. When a literal appears in more than
 * one of those places, consolidate it here.
 *
 * RULES (must follow — break these and build configs stop loading):
 *   - This file MUST be self-contained. No `@/...` alias imports — build
 *     configs load this file BEFORE the bundler's alias resolver wires up.
 *     Only relative imports or stdlib are allowed inside this file.
 *   - Pure data + types only. No side effects, no runtime initialization.
 *   - Use `as const` for value blocks (not `enum` — see AGENTS.md for why).
 *
 * The remote template has its own `app.constants.ts` with its own perspective
 * (federation name, exposed modules, port). When changing a cross-template
 * invariant (STORAGE.STORE_KEY, ENV defaults), mirror it on both sides.
 */

// ─────────────────────────────────────────────────────────────────────────
// Federation
// ─────────────────────────────────────────────────────────────────────────

export const FEDERATION = {
  /** This app's federation name. Remotes consume us as `hostTemplate/...`. */
  NAME: 'hostTemplate',
  /** Filename rsbuild emits for this app's federation entry. */
  FILENAME: 'hostRemoteEntry.js',
  /** Modules this app exposes. Keys are the public federation paths. */
  EXPOSES: {
    STORE: './stores/store',
    EVENT_BUS: './lib/eventBus',
  },
  /**
   * Federated remotes this app consumes. Each entry pairs the remote's
   * federation `name` with the `entry` filename it serves. Both are needed
   * to build the consumer URL: `${name}@${url}/${entry}`.
   *
   * These mirror the OTHER template's `FEDERATION.NAME` + `FEDERATION.FILENAME`.
   * When the remote renames itself, update here.
   */
  REMOTES: {
    REMOTE_TEMPLATE: { name: 'remoteTemplate', entry: 'remoteEntry.js' },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────
// App identity
// ─────────────────────────────────────────────────────────────────────────

export const APP = {
  /** Inlined into the bundle via `__APP_NAME__`; also used for devtools labels. */
  NAME: 'host-app',
  /** Default dev-server port. */
  PORT: 3000,
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────

export const STORAGE = {
  /** sessionStorage key for the persisted zustand store. */
  STORE_KEY: 'afsd.store.v1',
  /** Bumped via zustand's `version` option when the persisted shape changes. */
  STORE_VERSION: 1,
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Env vars
// ─────────────────────────────────────────────────────────────────────────

export const ENV = {
  /** Prefixes that `loadEnv` inlines into the bundle. Others stay server-only. */
  PUBLIC_PREFIXES: ['PUBLIC_', 'APP_'] as readonly string[],
  /** Fallback URLs when matching env vars are unset. */
  DEFAULT_HOST_URL: 'http://localhost:3000',
  DEFAULT_REMOTE_URL: 'http://localhost:3001',
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Environment-shape types (expand as deploy targets evolve)
// ─────────────────────────────────────────────────────────────────────────

export type Environment = 'development' | 'eng' | 'test' | 'prod';

export interface EnvironmentConfig {
  publicPath: string;
  port?: number;
  host?: string;
}

export type EnvConfig = {
  [key in Environment]: EnvironmentConfig;
};
