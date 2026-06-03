/**
 * Runtime env validation for the host template.
 *
 * Build-time env vars are inlined into the bundle by rsbuild (`loadEnv` in
 * `rsbuild.config.ts`). This module reads them via `process.env` at runtime,
 * validates with zod, and exposes a typed `env` object. Failure throws at
 * import — fail-fast over silent miswiring.
 *
 * Why validate at runtime when rsbuild already inlines:
 *   - Inlining substitutes the *string*; nothing checks the string is a
 *     valid URL or matches an expected enum.
 *   - Missing vars become `undefined`, which propagates silently until
 *     deep in API code. zod gives one loud failure at boot instead.
 *
 * Add a var: define the zod schema below AND ensure its prefix is in
 * `ENV.PUBLIC_PREFIXES` (app.constants.ts) so rsbuild inlines it.
 *
 * Run-time overrides (e.g., /config.json) should be merged into this
 * object via `setEnvOverrides()` — see `runtimeConfig.ts`.
 */
import { z } from 'zod';
import { ENV } from './app.constants';

const envSchema = z.object({
  PUBLIC_HOST_TEMPLATE_URL: z.string().url().default(ENV.DEFAULT_HOST_URL),
  PUBLIC_REMOTE_TEMPLATE_URL: z.string().url().default(ENV.DEFAULT_REMOTE_URL),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  /** 'debug' | 'info' | 'warn' | 'error'. Defaults to 'info' in prod, 'debug' in dev. */
  PUBLIC_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;
let overrides: Partial<Env> = {};

function parseEnv(): Env {
  const raw = {
    PUBLIC_HOST_TEMPLATE_URL: process.env.PUBLIC_HOST_TEMPLATE_URL,
    PUBLIC_REMOTE_TEMPLATE_URL: process.env.PUBLIC_REMOTE_TEMPLATE_URL,
    PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL,
    PUBLIC_LOG_LEVEL: process.env.PUBLIC_LOG_LEVEL,
  };
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    // One loud failure at boot beats a hundred quiet ones in feature code.
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return { ...result.data, ...overrides };
}

/**
 * The validated, typed env object. Lazy — first access parses + caches.
 * Throws at first access if validation fails.
 */
export const env = new Proxy({} as Env, {
  get(_t, key: keyof Env) {
    cached ??= parseEnv();
    return cached[key];
  },
});

/**
 * Apply runtime overrides (e.g., from /config.json). Called by
 * `runtimeConfig.ts` before app mount. Subsequent `env.*` reads pick up the
 * merged values.
 */
export function setEnvOverrides(partial: Partial<Env>): void {
  overrides = { ...overrides, ...partial };
  // Re-validate the merged object now so a bad runtime config fails loud.
  cached = parseEnv();
}

/**
 * Force re-parse. Useful in tests after stubbing process.env.
 */
export function resetEnvCache(): void {
  cached = null;
  overrides = {};
}
