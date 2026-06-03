/**
 * Runtime configuration loader.
 *
 * Fetches `/config.json` (served next to the host bundle) BEFORE the React
 * tree mounts, validates with zod, and applies the values as env overrides.
 * Lets you swap remote URLs, API base, log level per environment without
 * rebuilding.
 *
 * Why over build-time env vars:
 *   - One artifact deploys to N environments — flip `/config.json` per env.
 *   - Hotfix a wrong URL by editing JSON, not rebuilding.
 *   - Vibe-coders / downstream consumers don't need a per-env build pipeline.
 *
 * Skipping is fine for local dev — if `/config.json` is missing or fails to
 * parse, we fall back to build-time env vars with a logged warning.
 *
 * Call once in bootstrap.tsx BEFORE rendering React:
 *
 *   ```ts
 *   await loadRuntimeConfig();
 *   ReactDOM.createRoot(...).render(...);
 *   ```
 *
 * After this resolves, `env.*` reads see the merged values.
 */
import { z } from 'zod';
import { setEnvOverrides } from '@/shared/config/env';
import { logger } from './logger';

const runtimeConfigSchema = z
  .object({
    hostTemplateUrl: z.string().url().optional(),
    remoteTemplateUrl: z.string().url().optional(),
    apiBaseUrl: z.string().url().optional(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  })
  .strict();

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

let loaded = false;

/**
 * Resolves once `/config.json` has been fetched + applied (or skipped on
 * failure). Idempotent — subsequent calls are no-ops.
 *
 * @param url Override the fetch URL. Defaults to `/config.json` relative to
 *   the host origin.
 */
export async function loadRuntimeConfig(url = '/config.json'): Promise<void> {
  if (loaded) return;
  loaded = true;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      // 404 is the common case in dev — config file just isn't there.
      // Quiet log, not an error, so dev consoles stay clean.
      logger.debug(`[runtimeConfig] ${url} → ${res.status}; using build-time env.`);
      return;
    }
    const json: unknown = await res.json();
    const parsed = runtimeConfigSchema.safeParse(json);
    if (!parsed.success) {
      logger.event({
        name: 'runtimeConfig.invalid',
        level: 'error',
        message: `Invalid /config.json — using build-time env`,
        context: { issues: parsed.error.issues },
      });
      return;
    }
    setEnvOverrides({
      ...(parsed.data.hostTemplateUrl && {
        PUBLIC_HOST_TEMPLATE_URL: parsed.data.hostTemplateUrl,
      }),
      ...(parsed.data.remoteTemplateUrl && {
        PUBLIC_REMOTE_TEMPLATE_URL: parsed.data.remoteTemplateUrl,
      }),
      ...(parsed.data.apiBaseUrl && { PUBLIC_API_BASE_URL: parsed.data.apiBaseUrl }),
      ...(parsed.data.logLevel && { PUBLIC_LOG_LEVEL: parsed.data.logLevel }),
    });
    logger.info('[runtimeConfig] applied', { keys: Object.keys(parsed.data) });
  } catch (error) {
    // Network failure, malformed JSON, CORS — all non-fatal.
    logger.event({
      name: 'runtimeConfig.fetchFailed',
      level: 'warn',
      message: 'Failed to fetch /config.json — using build-time env',
      error,
    });
  }
}

/**
 * Test-only: reset the one-shot guard so a test can re-load.
 */
export function resetRuntimeConfigForTest(): void {
  loaded = false;
}
