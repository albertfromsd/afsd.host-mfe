import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { aliases } from './config.alias';

const analyze = process.env.ANALYZE === 'true';

const { publicVars, rawPublicVars } = loadEnv({
  prefixes: ['PUBLIC_', 'APP_'],
});

const REMOTE_TEMPLATE_URL = rawPublicVars.PUBLIC_REMOTE_TEMPLATE_URL ?? 'http://localhost:3001';
const HOST_TEMPLATE_URL = rawPublicVars.PUBLIC_HOST_TEMPLATE_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [pluginReact(), pluginSass()],

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
      __APP_NAME__: JSON.stringify('host-app'),
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  dev: {
    hmr: true,
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
      name: 'hostTemplate',
      filename: 'hostRemoteEntry.js',

      runtimePlugins: ['./src/shared/lib/mfRuntimePlugin.ts'],

      exposes: {
        './stores/store': './src/shared/stores/store.ts',
      },

      remotes: {
        remoteTemplate: `remoteTemplate@${REMOTE_TEMPLATE_URL}/remoteEntry.js`,
        hostTemplate: `hostTemplate@${HOST_TEMPLATE_URL}/hostRemoteEntry.js`,
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
