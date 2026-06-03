/**
 * MSW request handlers used by the test server (`server.ts`).
 *
 * Add a handler per endpoint your code calls. Group by feature with a
 * leading comment block. Tests that need ad-hoc behavior should override
 * via `server.use(...)` in `beforeEach` and let `afterEach`'s
 * `resetHandlers` clear the override.
 *
 * Convention: handlers return *minimal* fixtures. If a test needs a
 * specific shape, supply it via `server.use(http.get(url, () => ...))` in
 * that test, not by inflating the global handler.
 */
import { http, HttpResponse } from 'msw';

export const handlers = [
  // ── Example: health probe ─────────────────────────────────────────────
  // Remove or replace when you wire a real API. Kept as a non-zero example
  // so the pattern compiles and self-documents.
  http.get('*/api/health', () => HttpResponse.json({ ok: true, ts: Date.now() })),
];
