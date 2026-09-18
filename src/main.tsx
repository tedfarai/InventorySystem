import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with automatic update handling.
registerSW({
  immediate: true,
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
      // Proactively check for updates on each session launch
      r.update().catch(() => {});
    }
  },
  onRegisterError(error) {
    console.warn('[PWA] Service Worker registration failed (normal in development/sandboxes):', error);
  },
});

// Clear any stale caches from previous iterations so fresh UI updates apply immediately
if (typeof caches !== 'undefined') {
  caches.keys().then((keys) => {
    for (const key of keys) {
      if (key !== 'paramount-static-v15' && key !== 'paramount-media-v15') {
        caches.delete(key);
      }
    }
  });
}

// Ensure all service worker registrations update immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.update().catch(() => {});
    }
  });
}

// Browser install prompt lifecycle for native browser omnibox install and custom in-app button.
let deferredPrompt: any = null;
const installButton = document.getElementById('install-btn');

const showInstallButton = () => {
  if (!installButton) return;
  installButton.hidden = false;
  installButton.style.display = 'inline-flex';
};

const hideInstallButton = () => {
  if (!installButton) return;
  installButton.hidden = true;
  installButton.style.display = 'none';
};

const handleBeforeInstallPrompt = (event: Event) => {
  event.preventDefault();
  deferredPrompt = event;
  showInstallButton();
  console.log('[PWA] Native install prompt is available.');
};

const handleAppInstalled = () => {
  deferredPrompt = null;
  hideInstallButton();
  console.log('[PWA] App was installed successfully.');
};

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] No deferred install prompt available.');
      return;
    }

    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        console.log('[PWA] User accepted the installation prompt.');
      } else {
        console.log('[PWA] User dismissed the installation prompt.');
      }

      deferredPrompt = null;
      hideInstallButton();
    } catch (error) {
      console.error('[PWA] Failed to trigger the installation prompt:', error);
    }
  });
}

window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
window.addEventListener('appinstalled', handleAppInstalled);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
