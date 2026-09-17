const CACHE_NAME = 'paramount-baseline-v1';
const OFFLINE_URL = '/index.html';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }

          return caches.match('/favicon.svg');
        });
    })
  );
});

// =============================================================================
// BACKGROUND SYNC & PERSISTENT SYNC-QUEUE DRAIN ENGINE
// Automatically replays pending transactions and mutations stored locally
// in IndexedDB when connectivity is restored.
// =============================================================================

const DB_NAME = 'ProcureSim_Offline_DB_v3';

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function notifyAllClients(message) {
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage(message);
  }
}

async function replayPersistentSyncQueue() {
  console.log('[Service Worker] Executing persistent sync-queue background drain...');
  try {
    const db = await openIndexedDB();

    // 1. Check sync_queue if present
    if (db.objectStoreNames.contains('sync_queue')) {
      const syncItems = await new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const req = tx.objectStore('sync_queue').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const item of syncItems) {
        try {
          const endpoint = item.endpoint || '/api/sync';
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (res.ok) {
            await new Promise((resolve, reject) => {
              const tx = db.transaction('sync_queue', 'readwrite');
              const req = tx.objectStore('sync_queue').delete(item.sync_id);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
          }
        } catch (postErr) {
          console.warn('[Service Worker] Sync queue endpoint replay failed:', postErr);
        }
      }
    }

    // 2. Notify active client tabs to drain SQLite & mutation_queue with multi-client mesh
    await notifyAllClients({
      type: 'SW_SYNC_TRIGGER',
      timestamp: Date.now(),
      tag: 'sync-documents',
    });

    console.log('[Service Worker] Background sync completed successfully.');
  } catch (err) {
    console.warn('[Service Worker] Background sync could not access IndexedDB:', err);
    // Fallback notification to clients anyway
    await notifyAllClients({
      type: 'SW_SYNC_TRIGGER',
      timestamp: Date.now(),
      tag: 'sync-documents',
    });
  }
}

// Background Sync Event Listener (SyncManager)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-documents' || event.tag === 'sync-transactions') {
    console.log(`[Service Worker] Background sync event triggered for tag: ${event.tag}`);
    event.waitUntil(replayPersistentSyncQueue());
  }
});

// Periodic Sync Event Listener (for supported browsers)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-documents' || event.tag === 'check-stock-sync') {
    console.log(`[Service Worker] Periodic background sync triggered for tag: ${event.tag}`);
    event.waitUntil(replayPersistentSyncQueue());
  }
});

// Message Listener from Main Thread (e.g. manual drain or force sync command)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FORCE_SYNC_DRAIN') {
    event.waitUntil(replayPersistentSyncQueue());
  }
});
