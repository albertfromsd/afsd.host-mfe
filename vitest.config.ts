import { defineConfig } from 'vitest/config';
import { aliases } from './config.alias';

export default defineConfig({
  resolve: {
    alias: aliases,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/shared/test/setup.ts',
  },
});
