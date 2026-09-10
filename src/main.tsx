import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with automatic update handling
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] New content available, dispatching update event...');
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline with full local storage caching.');
  },
  onRegistered(r) {
    if (r) {
      console.log('[PWA] Service Worker registered successfully:', r.scope);
    }
  },
  onRegisterError(error) {
    console.warn('[PWA] Service Worker registration failed (normal in development/sandboxes):', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
