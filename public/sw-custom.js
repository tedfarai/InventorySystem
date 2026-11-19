/**
 * ===============================================================================
 * PARAMOUNT EXPORTS INVENTORY — PWA BACKGROUND & NOTIFICATION WORKER EXTENSION
 * Imported by Workbox Service Worker to provide Background Sync, Periodic Sync,
 * Push Notification handling, Notification Click navigation, and offline queue drain.
 * ===============================================================================
 */

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
  try {
    const db = await openIndexedDB();
    if (db.objectStoreNames.contains('sync_queue')) {
      const items = await new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const item of items) {
        try {
          const response = await fetch(item.endpoint || '/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (response.ok || response.status === 409) {
            const deleteTx = db.transaction('sync_queue', 'readwrite');
            deleteTx.objectStore('sync_queue').delete(item.sync_id);
          }
        } catch {
          // Keep failed entries queued for next attempt
        }
      }
    }
  } catch (err) {
    // Client-side SQLite & IndexedDB remain safe
  }
  await notifyAllClients({ type: 'SW_SYNC_TRIGGER', timestamp: Date.now(), tag: 'sync-documents' });
}

// Background Sync Event Listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-documents' || event.tag === 'sync-transactions') {
    event.waitUntil(replayPersistentSyncQueue());
  }
});

// Periodic Background Sync Event Listener
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-documents' || event.tag === 'check-stock-sync') {
    event.waitUntil(replayPersistentSyncQueue());
  }
});

// Push Notifications Listener
self.addEventListener('push', (event) => {
  let data = {
    title: 'Paramount Exports Alert',
    body: 'Inventory ledger update available.',
    url: '/?tab=simulator',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      url: data.url || '/?tab=simulator',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open_app', title: 'Open Stock Ledger' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler: Focus or open window and navigate to deep-link URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/?tab=simulator';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Custom message channel
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FORCE_SYNC_DRAIN') {
    event.waitUntil(replayPersistentSyncQueue());
  }
});
