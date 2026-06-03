import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

// Start MSW once per test file. `onUnhandledRequest: 'error'` makes a
// missing handler loud (instead of silently hitting the network) — that's
// the whole point of intercepting in tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  // Reset any handlers added via `server.use(...)` in individual tests.
  server.resetHandlers();
});

afterAll(() => server.close());
