import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
// Tauri sets TAURI_ENV_PLATFORM at build time so this import is dropped from desktop bundles.
if (!import.meta.env.TAURI_ENV_PLATFORM) {
  void import('./pwa').then(({ registerPwa }) => registerPwa());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
