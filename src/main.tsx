import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.info('[PWA] Offline shell ready.');
  },
  onRegistered(r) {
    r?.update().catch(() => undefined);
  },
  onRegisterError(error) {
    console.warn('[PWA] Service worker registration failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
