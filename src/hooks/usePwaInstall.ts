import { useState, useEffect, useCallback } from 'react';
import { drainSyncQueue, registerBackgroundSync } from '../db/backgroundSync';

export interface PwaInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isUpdateAvailable: boolean;
  triggerInstall: () => Promise<boolean>;
  updateApp: () => void;
}

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check initial standalone / window-controls-overlay mode across desktop and mobile
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    const handleOnline = () => {
      setIsOffline(false);
      registerBackgroundSync();
      void drainSyncQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for display-mode media query change (standalone or window-controls-overlay)
    const mediaQueryStandalone = window.matchMedia('(display-mode: standalone)');
    const mediaQueryWco = window.matchMedia('(display-mode: window-controls-overlay)');

    const handleDisplayModeChange = (evt: MediaQueryListEvent) => {
      if (evt.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };

    if (mediaQueryStandalone.addEventListener) {
      mediaQueryStandalone.addEventListener('change', handleDisplayModeChange);
      mediaQueryWco.addEventListener('change', handleDisplayModeChange);
    }

    // Custom event listener for service worker updates
    const handleSwUpdate = () => {
      setIsUpdateAvailable(true);
    };
    window.addEventListener('pwa-update-available', handleSwUpdate);
    registerBackgroundSync();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (mediaQueryStandalone.removeEventListener) {
        mediaQueryStandalone.removeEventListener('change', handleDisplayModeChange);
        mediaQueryWco.removeEventListener('change', handleDisplayModeChange);
      }
      window.removeEventListener('pwa-update-available', handleSwUpdate);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      return outcome === 'accepted';
    } catch (err) {
      console.warn('[usePwaInstall] Install prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(() => {
    if ('serviceWorker' in navigator) {
      // Reload as soon as the new service worker activates and claims the client
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          window.location.reload();
        },
        { once: true }
      );

      navigator.serviceWorker.getRegistrations().then((registrations) => {
        let hasWaitingWorker = false;
        for (const registration of registrations) {
          registration.update().catch(() => undefined);
          if (registration.waiting) {
            hasWaitingWorker = true;
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
        // Fallback reload if no worker was waiting
        if (!hasWaitingWorker) {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOffline,
    isUpdateAvailable,
    triggerInstall,
    updateApp,
  };
}
