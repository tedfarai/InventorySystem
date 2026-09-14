importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js');

const CACHE_NAME = 'paramount-static-v4';
const DB_NAME = 'ProcureSim_Offline_DB_v3';
const DB_VERSION = 3;

if (self.workbox) {
  self.workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);
  self.workbox.routing.registerRoute(
    ({ request }) => ['document', 'script', 'style', 'image', 'font'].includes(request.destination),
    new self.workbox.strategies.CacheFirst({ cacheName: CACHE_NAME })
  );
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('large_documents')) {
        db.createObjectStore('large_documents', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'sync_id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function allQueued(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('sync_queue').objectStore('sync_queue').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function mergeValue(server, local, at) {
  if (typeof server === 'string' && typeof local === 'string' && server !== local) {
    return `${server}\n\n=== CONFLICT RESOLUTION [${at}] ===\n[Server Version]\n============\n${local}\n[Local Version]\n=== END ===`;
  }
  if (server && local && typeof server === 'object' && typeof local === 'object' &&
      !Array.isArray(server) && !Array.isArray(local)) {
    const output = { ...local };
    for (const key of new Set([...Object.keys(local), ...Object.keys(server)])) {
      output[key] = key in server ? mergeValue(server[key], local[key], at) : local[key];
    }
    return output;
  }
  return server;
}

function resolveConflict(local, server) {
  const at = new Date().toISOString();
  return {
    ...server,
    content: mergeValue(server.content, local.content, at),
    version: Math.max(local.version || 0, server.version || 0) + 1,
    updatedAt: at,
    client_id: local.client_id,
  };
}

function writeResolved(db, queued, resolved) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['large_documents', 'sync_queue'], 'readwrite');
    tx.objectStore('large_documents').put(resolved);
    tx.objectStore('sync_queue').delete(queued.sync_id);
    tx.objectStore('sync_queue').put({ ...resolved, sync_id: crypto.randomUUID() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag !== 'sync-documents') return;
  event.waitUntil((async () => {
    const db = await openDatabase();
    for (const queued of await allQueued(db)) {
      const response = await fetch(queued.endpoint || '/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queued),
      });
      if (response.status === 409) {
        const body = await response.json();
        const server = body.document || body.data;
        if (!server) throw new Error('Conflict response missing server document');
        await writeResolved(db, queued, resolveConflict(queued, server));
      } else if (response.ok) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction('sync_queue', 'readwrite');
          tx.objectStore('sync_queue').delete(queued.sync_id);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } else {
        throw new Error(`Sync failed with HTTP ${response.status}`);
      }
    }
  })());
});
