import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { loadRuntimeConfig } from '@/shared/lib/runtimeConfig';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

// Fetch /config.json BEFORE the React tree mounts so federation URLs and
// API base read from the merged env. Failure is non-fatal — we fall back to
// build-time env vars. See `src/shared/lib/runtimeConfig.ts`.
loadRuntimeConfig().finally(() => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
});
