import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { aliases } from './config.alias';
import { FEDERATION } from './src/shared/config/app.constants';

export default defineConfig({
  resolve: {
    alias: {
      ...aliases,
      // Federation paths the host imports at runtime resolve locally in tests
      // (vitest doesn't run module federation). When you add a new exposed
      // module, mirror it here so component tests can import via the
      // federated specifier.
      [`${FEDERATION.NAME}${FEDERATION.EXPOSES.STORE.slice(1)}`]: path.resolve(
        __dirname,
        'src/shared/stores/store.ts',
      ),
      [`${FEDERATION.NAME}${FEDERATION.EXPOSES.EVENT_BUS.slice(1)}`]: path.resolve(
        __dirname,
        'src/shared/lib/eventBus.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/shared/test/setup.ts',
    // Playwright tests live in e2e/ and use their own runner — keep vitest
    // from picking them up.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
