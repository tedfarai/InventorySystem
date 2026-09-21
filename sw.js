/**
 * sw.js — Paramount Exports PWA Service Worker
 *
 * Strategy:
 *  • HTML / JS / CSS  → Network-first (2 s timeout), fallback to cache
 *  • Images / Fonts   → Cache-first, update in background
 *  • API / unknown    → Network-only (no caching)
 *
 * This file is intentionally dependency-free (no Workbox CDN import) so it
 * works offline from first load and satisfies the PWA installability criteria
 * on Chrome, Edge, Safari, and Firefox.
 */

const STATIC_CACHE  = 'paramount-static-v16';
const MEDIA_CACHE   = 'paramount-media-v16';
const ALL_CACHES    = [STATIC_CACHE, MEDIA_CACHE];

/* Assets to pre-cache on install */
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon.png',
];

/* ── Install: pre-cache shell assets ──────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: purge stale caches ─────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALL_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: routing strategies ────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const dest = request.destination;

  if (dest === 'image' || dest === 'font') {
    // Cache-first for static media
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
  } else if (dest === 'document' || dest === 'script' || dest === 'style' || dest === '') {
    // Network-first (2 s) for app shell — ensures code updates apply immediately
    event.respondWith(networkFirst(request, STATIC_CACHE, 2000));
  }
  // All other destinations (XHR, fetch API calls, etc.) fall through to the
  // browser's default network handling — no caching.
});

/* ── Strategy helpers ─────────────────────────────────────────────────── */

/** Cache-first: serve from cache; fetch & update cache on miss. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first with timeout: try network for `timeoutMs`; on timeout or
 * failure fall back to cache so the app stays usable offline.
 */
async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);

  try {
    const networkPromise = fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });

    // Race the network against a timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
    );

    return await Promise.race([networkPromise, timeoutPromise]);
  } catch {
    // Network failed or timed out — serve from cache
    const cached = await cache.match(request);
    if (cached) return cached;

    // Last resort: return a minimal offline page for document navigations
    if (request.destination === 'document') {
      return new Response(
        '<!doctype html><html><head><meta charset="UTF-8"><title>Offline</title></head>' +
          '<body style="font-family:sans-serif;text-align:center;padding:4rem">' +
          '<h1>You are offline</h1><p>Please reconnect to use Paramount Inventory.</p>' +
          '</body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/* ── Background Sync (document vault) ────────────────────────────────── */
const DB_NAME    = 'ProcureSim_Offline_DB_v3';
const DB_VERSION = 3;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('large_documents'))
        db.createObjectStore('large_documents', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sync_queue'))
        db.createObjectStore('sync_queue', { keyPath: 'sync_id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

function getAllQueued(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('sync_queue').objectStore('sync_queue').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

function deleteQueued(db, syncId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    tx.objectStore('sync_queue').delete(syncId);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag !== 'sync-documents') return;
  event.waitUntil(
    (async () => {
      const db = await openDatabase();
      for (const queued of await getAllQueued(db)) {
        const res = await fetch(queued.endpoint || '/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queued),
        });
        if (res.ok || res.status === 409) {
          await deleteQueued(db, queued.sync_id);
        } else {
          throw new Error(`Sync failed: HTTP ${res.status}`);
        }
      }
    })()
  );
});

/* ── Skip-waiting message (triggered by usePwaInstall.updateApp) ──────── */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
