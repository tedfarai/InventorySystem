const CACHE_VERSION = 'paramount-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const MEDIA_CACHE = `${CACHE_VERSION}-media`;
const OFFLINE_URL = '/index.html';
const APP_SHELL = ['/', OFFLINE_URL, '/manifest.webmanifest', '/favicon.svg', '/pwa-192x192.png', '/pwa-512x512.png', '/maskable-icon.png'];
const CACHE_NAMES = [STATIC_CACHE, MEDIA_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !CACHE_NAMES.includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE, OFFLINE_URL));
    return;
  }
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'manifest') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) void cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || network;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(fallbackUrl)) || Response.error();
  }
}

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
  for (const client of clientsList) client.postMessage(message);
}
async function replayPersistentSyncQueue() {
  try {
    const db = await openIndexedDB();
    if (db.objectStoreNames.contains('sync_queue')) {
      const items = await new Promise((resolve, reject) => {
        const request = db.transaction('sync_queue', 'readonly').objectStore('sync_queue').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      for (const item of items) {
        try {
          const response = await fetch(item.endpoint || '/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
          if (response.ok || response.status === 409) db.transaction('sync_queue', 'readwrite').objectStore('sync_queue').delete(item.sync_id);
        } catch { /* Keep failed entries queued. */ }
      }
    }
  } catch { /* Client database remains the source of truth. */ }
  await notifyAllClients({ type: 'SW_SYNC_TRIGGER', timestamp: Date.now(), tag: 'sync-documents' });
}
self.addEventListener('sync', (event) => { if (event.tag === 'sync-documents' || event.tag === 'sync-transactions') event.waitUntil(replayPersistentSyncQueue()); });
self.addEventListener('periodicsync', (event) => { if (event.tag === 'sync-documents' || event.tag === 'check-stock-sync') event.waitUntil(replayPersistentSyncQueue()); });
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'FORCE_SYNC_DRAIN') event.waitUntil(replayPersistentSyncQueue());
});
