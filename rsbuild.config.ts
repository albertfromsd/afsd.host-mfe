import path from 'node:path';
import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { aliases } from './config.alias';

const appDirectory = __dirname;
const resolveApp = (...segments: string[]) => path.resolve(appDirectory, ...segments);

const { publicVars, rawPublicVars } = loadEnv({
  prefixes: ['PUBLIC_', 'APP_'],
});

export default defineConfig({
  plugins: [pluginReact(), pluginSass()],
  resolve: {
    alias: aliases
  },
  source: {
    define: {
      ...publicVars,

      // Optional compatibility if you still want process.env-style access.
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

  moduleFederation: {
    options: {
      name: 'host',
      filename: "host-remoteEntry.js",
      exposes: {},
      remotes: {
        // Example:
        // products: 'products@http://localhost:3001/mf-manifest.json',
      },
      shared: {
        react: {
          singleton: true,
          eager: true,
          requiredVersion: false,
        },
        'react-dom': {
          singleton: true,
          eager: true,
          requiredVersion: false,
        },
        'react-router-dom': {
          singleton: true,
          eager: true,
          requiredVersion: false,
        },
        zustand: {
          singleton: true,
          eager: true,
          requiredVersion: false,
        },
      },
    },
  },
});