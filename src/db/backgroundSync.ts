import { getOfflineDB, getPendingSyncDocuments, putSyncDocument, removeSyncDocument } from './offlineStorage';
import { resolveConflict, ConflictDocument } from './serverConflictEngine';

export type SyncState = 'connected' | 'syncing' | 'offline' | 'conflict';

export interface SyncDocument extends ConflictDocument {
  endpoint?: string;
}

export async function drainSyncQueue(
  onState?: (state: SyncState) => void
): Promise<void> {
  if (!navigator.onLine) {
    onState?.('offline');
    return;
  }

  onState?.('syncing');
  for (const queued of await getPendingSyncDocuments()) {
    try {
      const response = await fetch(queued.endpoint || '/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queued),
      });

      if (response.status === 409) {
        const body = (await response.json()) as { document?: SyncDocument; data?: SyncDocument };
        const serverDoc = body.document || body.data;
        if (!serverDoc) throw new Error('Conflict response did not include a server document');
        const resolved = resolveConflict(queued, serverDoc);
        const db = await getOfflineDB();
        const tx = db.transaction(['large_documents', 'sync_queue'], 'readwrite');
        await tx.objectStore('large_documents').put(resolved);
        await tx.objectStore('sync_queue').delete(queued.sync_id);
        await tx.objectStore('sync_queue').put({
          ...resolved,
          sync_id: crypto.randomUUID(),
          endpoint: queued.endpoint,
        });
        await tx.done;
        onState?.('conflict');
        continue;
      }

      if (!response.ok) throw new Error(`Sync failed with HTTP ${response.status}`);
      await removeSyncDocument(queued.sync_id);
    } catch (error) {
      await putSyncDocument(queued);
      console.warn('[BackgroundSync] Queue drain paused:', error);
      return;
    }
  }
  onState?.('connected');
}

export function registerBackgroundSync(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then(async (registration) => {
      if ('sync' in registration) {
        await (registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        }).sync.register('sync-documents');
      }
    })
    .catch((error) => console.warn('[BackgroundSync] Registration failed:', error));
}
