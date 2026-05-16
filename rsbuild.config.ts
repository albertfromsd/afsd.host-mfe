import path from 'node:path';
import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { aliases } from './config.alias';
import { Environment } from './src/config/app.config';

const appDirectory = __dirname;
const resolveApp = (...segments: string[]) => path.resolve(appDirectory, ...segments);

const isDev = process.env.NODE_ENV === 'development';
const env = (process.env.SYS_LEVEL || 'development') as Environment;

const { publicVars, rawPublicVars } = loadEnv({
  prefixes: ['PUBLIC_', 'APP_'],
});

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

  moduleFederation: {
    options: {
      name: 'hostTemplate',
      filename: 'hostRemoteEntry.js',

      exposes: {},

      remotes: {
        remoteTemplate: 'remoteTemplate@http://localhost:3001/remoteEntry.js',
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
      },
    },
  },
});