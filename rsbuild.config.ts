import path from 'node:path';
import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { aliases } from './config.alias';
import { APP, ENV, FEDERATION } from './src/shared/config/app.constants';

const SRC_DIR = path.resolve(__dirname, 'src');

const analyze = process.env.ANALYZE === 'true';

const { publicVars, rawPublicVars } = loadEnv({
  prefixes: [...ENV.PUBLIC_PREFIXES],
});

const REMOTE_TEMPLATE_URL = rawPublicVars.PUBLIC_REMOTE_TEMPLATE_URL ?? ENV.DEFAULT_REMOTE_URL;
const HOST_TEMPLATE_URL = rawPublicVars.PUBLIC_HOST_TEMPLATE_URL ?? ENV.DEFAULT_HOST_URL;

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginSass({
      sassLoaderOptions: {
        // Adding `src` to the sass load paths lets every .scss file write
        // `@use 'shared/styles' as *;` regardless of where it lives in the
        // tree. Keeps imports stable across moves and avoids ../../.. chains.
        sassOptions: {
          loadPaths: [SRC_DIR],
        },
      },
    }),
  ],

  resolve: {
    alias: aliases,
  },

  source: {
    entry: {
      index: './src/main.tsx',
    },
    define: {
      ...publicVars,
      'process.env': JSON.stringify(rawPublicVars),
      __APP_NAME__: JSON.stringify(APP.NAME),
    },
  },

  server: {
    port: APP.PORT,
    open: true,
  },

  dev: {
    hmr: true,
    // Federation's split build pipeline produces two HMR sessions with separate
    // chunk-ID spaces; when the first HMR sync races against runtime init,
    // `webpackHotUpdate<name>` crashes at jsonp_chunk_loading with `.push()` on
    // undefined. Explicit `false` overrides @module-federation/enhanced's implicit
    // lazyCompilation and gives a stable single-pipeline HMR.
    lazyCompilation: false,
  },

  html: {
    title: 'MFE Host App',
  },

  performance: analyze
    ? {
        bundleAnalyze: {
          analyzerMode: 'static',
          openAnalyzer: true,
        },
      }
    : undefined,

  moduleFederation: {
    options: {
      name: FEDERATION.NAME,
      filename: FEDERATION.FILENAME,

      runtimePlugins: ['./src/shared/lib/mfRuntimePlugin.ts'],

      exposes: {
        [FEDERATION.EXPOSES.STORE]: './src/shared/stores/store.ts',
        [FEDERATION.EXPOSES.EVENT_BUS]: './src/shared/lib/eventBus.ts',
      },

      remotes: {
        [FEDERATION.REMOTES.REMOTE_TEMPLATE.name]:
          `${FEDERATION.REMOTES.REMOTE_TEMPLATE.name}@${REMOTE_TEMPLATE_URL}/${FEDERATION.REMOTES.REMOTE_TEMPLATE.entry}`,
        [FEDERATION.NAME]: `${FEDERATION.NAME}@${HOST_TEMPLATE_URL}/${FEDERATION.FILENAME}`,
      },

      // rsbuild's ModuleFederationConfig type wraps @rspack/core's
      // ModuleFederationPluginOptions, which lags the @module-federation/enhanced
      // plugin's runtime support for `dts`. The plugin DOES read this option at
      // runtime and emits @mf-types/ for consumes/exposes.
      // @ts-expect-error -- dts is supported by the runtime plugin but missing from the wrapper type
      dts: {
        generateTypes: true,
        consumeTypes: true,
      },

      shared: {
        react: {
          singleton: true,
          eager: false,
          requiredVersion: false,
        },
        'react-dom': {
          singleton: true,
          eager: false,
          requiredVersion: false,
        },
        'react-router-dom': {
          singleton: true,
          eager: false,
          requiredVersion: false,
        },
        zustand: {
          singleton: true,
          eager: false,
          requiredVersion: false,
        },
        '@tanstack/react-query': {
          singleton: true,
          eager: false,
          requiredVersion: false,
        },
      },
    },
  },
});
