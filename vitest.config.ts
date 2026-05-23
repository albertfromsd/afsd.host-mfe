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
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/shared/test/setup.ts',
  },
});
