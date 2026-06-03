/**
 * MSW server used in vitest. Started + cleaned up by `../setup.ts`.
 *
 * Why a Node server (not the browser worker):
 *   - vitest runs in jsdom; we don't need service workers.
 *   - `setupServer` intercepts via fetch/XHR shims — works with axios, fetch,
 *     and node:fetch out of the box.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
