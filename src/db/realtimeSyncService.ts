/**
 * ===============================================================================
 * PARAMOUNT PROCUREMENT SYSTEM — REAL-TIME SYNCHRONIZATION & OFFLINE-FIRST LWW ENGINE
 * Replaces external cloud services with strict offline-first replication,
 * persistent multi-tab/client Broadcast mesh, WebSocket/SSE bridge,
 * PWA Background Sync mutation drainer, and deterministic LWW conflict resolution.
 * ===============================================================================
 */

import {
  StockItem,
  MovementLogEntry,
  AdminUser,
  Department,
  Manager,
  IssuedDocument,
  ReceivedDocument,
  AdjustmentDocument,
  StockAdjustmentRequest,
  BackupSnapshot,
  UserPresence,
  CollaborativeEvent,
  CloudSyncStatus,
  OfflineMutation,
} from '../types';
import {
  loadInitialFromIndexedDB,
  syncAllToIndexedDB,
  enqueueOfflineMutation,
  getPendingMutations,
  removeMutationFromQueue,
  clearAllMutations,
  getOfflineDB,
} from './offlineStorage';
import {
  getLocalClientId,
  generateMonotonicTimestamp,
  resolveStockItemLWW,
  mergeStockCatalogsLWW,
  mergeMovementLogs,
  mergeDocuments,
  mergeAdjustmentRequests,
} from './crdtLwwEngine';
import { detectPlatform } from '../utils/platformDetector';
import { sqliteBridge } from '../utils/sqliteBridge';

export type SyncMessage =
  | { type: 'STOCK_CHANGED'; payload: StockItem[]; issuer?: AdminUser; mutationId?: string }
  | { type: 'STOCK_ITEM_UPDATED'; payload: StockItem; issuer?: AdminUser; mutationId?: string }
  | {
      type: 'ISSUE_TRANSACTION';
      payload: {
        stockUpdates: StockItem[];
        issueDoc: IssuedDocument;
        movementLogs: MovementLogEntry[];
        issuer: AdminUser;
      };
      mutationId?: string;
    }
  | {
      type: 'DELIVERY_TRANSACTION';
      payload: {
        stockUpdates: StockItem[];
        receivedDoc: ReceivedDocument;
        movementLogs: MovementLogEntry[];
        issuer: AdminUser;
      };
      mutationId?: string;
    }
  | {
      type: 'ADJUSTMENT_TRANSACTION';
      payload: {
        stockUpdates: StockItem[];
        adjDoc: AdjustmentDocument;
        movementLogs: MovementLogEntry[];
        issuer: AdminUser;
      };
      mutationId?: string;
    }
  | { type: 'ADJUSTMENT_REQUEST'; payload: StockAdjustmentRequest; issuer?: AdminUser; mutationId?: string }
  | { type: 'DEPARTMENT_CHANGED'; payload: Department; mutationId?: string }
  | { type: 'MANAGER_CHANGED'; payload: Manager; mutationId?: string }
  | { type: 'ADMIN_CHANGED'; payload: AdminUser; mutationId?: string }
  | { type: 'BACKUP_CREATED'; payload: BackupSnapshot; mutationId?: string }
  | { type: 'BACKUP_RESTORED'; payload: BackupSnapshot['payload']; restorer: AdminUser; mutationId?: string }
  | { type: 'HEARTBEAT'; payload: UserPresence }
  | { type: 'HEARTBEAT_LEAVE'; payload: { id: string } }
  | { type: 'COLLABORATIVE_EVENT'; payload: CollaborativeEvent }
  | { type: 'FORCE_RESYNC_REQUEST'; clientId: string };

class RealtimeSyncService {
  private channel: BroadcastChannel | null = null;
  private presenceTimer: any = null;
  private queueDrainTimer: any = null;
  private currentPresenceId: string | null = null;
  private isInitialized = false;
  private clientId = getLocalClientId();

  // In-Memory Synchronized Caches
  private cachedStock: StockItem[] = [];
  private cachedLogs: MovementLogEntry[] = [];
  private cachedAdmins: AdminUser[] = [];
  private cachedDepts: Department[] = [];
  private cachedManagers: Manager[] = [];
  private cachedIssuedDocs: IssuedDocument[] = [];
  private cachedReceivedDocs: ReceivedDocument[] = [];
  private cachedAdjDocs: AdjustmentDocument[] = [];
  private cachedAdjReqs: StockAdjustmentRequest[] = [];
  private cachedBackups: BackupSnapshot[] = [];
  private cachedPresences: Map<string, UserPresence> = new Map();
  private cachedPendingMutations: OfflineMutation[] = [];

  // Active Callbacks
  private onStockChangeCb?: (items: StockItem[]) => void;
  private onLogsChangeCb?: (logs: MovementLogEntry[]) => void;
  private onAdminsChangeCb?: (admins: AdminUser[]) => void;
  private onDeptsChangeCb?: (depts: Department[]) => void;
  private onManagersChangeCb?: (managers: Manager[]) => void;
  private onIssuedDocsChangeCb?: (docs: IssuedDocument[]) => void;
  private onReceivedDocsChangeCb?: (docs: ReceivedDocument[]) => void;
  private onAdjDocsChangeCb?: (docs: AdjustmentDocument[]) => void;
  private onAdjReqsChangeCb?: (reqs: StockAdjustmentRequest[]) => void;
  private onBackupsChangeCb?: (backups: BackupSnapshot[]) => void;
  private onPresenceChangeCb?: (presences: UserPresence[]) => void;
  private onEventBroadcastCb?: (event: CollaborativeEvent) => void;
  private onSyncStatusCb?: (status: CloudSyncStatus) => void;
  private onPendingMutationsChangeCb?: (mutations: OfflineMutation[]) => void;

  /**
   * Initializes offline persistence, real-time broadcast channel, and mutation drainer
   */
  async initialize(callbacks: {
    onStockChange?: (items: StockItem[]) => void;
    onLogsChange?: (logs: MovementLogEntry[]) => void;
    onAdminsChange?: (admins: AdminUser[]) => void;
    onDeptsChange?: (depts: Department[]) => void;
    onManagersChange?: (managers: Manager[]) => void;
    onIssuedDocsChange?: (docs: IssuedDocument[]) => void;
    onReceivedDocsChange?: (docs: ReceivedDocument[]) => void;
    onAdjDocsChange?: (docs: AdjustmentDocument[]) => void;
    onAdjReqsChange?: (reqs: StockAdjustmentRequest[]) => void;
    onBackupsChange?: (backups: BackupSnapshot[]) => void;
    onPresenceChange?: (presences: UserPresence[]) => void;
    onEventBroadcast?: (event: CollaborativeEvent) => void;
    onSyncStatus?: (status: CloudSyncStatus) => void;
    onPendingMutationsChange?: (mutations: OfflineMutation[]) => void;
  }) {
    if (this.isInitialized) {
      this.cleanup();
    }

    this.onStockChangeCb = callbacks.onStockChange;
    this.onLogsChangeCb = callbacks.onLogsChange;
    this.onAdminsChangeCb = callbacks.onAdminsChange;
    this.onDeptsChangeCb = callbacks.onDeptsChange;
    this.onManagersChangeCb = callbacks.onManagersChange;
    this.onIssuedDocsChangeCb = callbacks.onIssuedDocsChange;
    this.onReceivedDocsChangeCb = callbacks.onReceivedDocsChange;
    this.onAdjDocsChangeCb = callbacks.onAdjDocsChange;
    this.onAdjReqsChangeCb = callbacks.onAdjReqsChange;
    this.onBackupsChangeCb = callbacks.onBackupsChange;
    this.onPresenceChangeCb = callbacks.onPresenceChange;
    this.onEventBroadcastCb = callbacks.onEventBroadcast;
    this.onSyncStatusCb = callbacks.onSyncStatus;
    this.onPendingMutationsChangeCb = callbacks.onPendingMutationsChange;

    this.updateSyncStatus('SYNCING');

    try {
      // 1. Load local state from IndexedDB
      const localState = await loadInitialFromIndexedDB();
      this.cachedStock = localState.stockItems || [];
      this.cachedLogs = localState.movementLogs || [];
      this.cachedAdmins = localState.admins || [];
      this.cachedDepts = localState.departments || [];
      this.cachedManagers = localState.managers || [];
      this.cachedIssuedDocs = localState.issuedDocs || [];
      this.cachedReceivedDocs = localState.receivedDocs || [];
      this.cachedAdjDocs = localState.adjustmentDocs || [];
      this.cachedAdjReqs = localState.adjustmentRequests || [];
      this.cachedBackups = localState.backups || [];
      this.cachedPendingMutations = localState.pendingMutations || [];

      // Initial notifications
      if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
      if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
      if (this.onAdminsChangeCb) this.onAdminsChangeCb(this.cachedAdmins);
      if (this.onDeptsChangeCb) this.onDeptsChangeCb(this.cachedDepts);
      if (this.onManagersChangeCb) this.onManagersChangeCb(this.cachedManagers);
      if (this.onIssuedDocsChangeCb) this.onIssuedDocsChangeCb(this.cachedIssuedDocs);
      if (this.onReceivedDocsChangeCb) this.onReceivedDocsChangeCb(this.cachedReceivedDocs);
      if (this.onAdjDocsChangeCb) this.onAdjDocsChangeCb(this.cachedAdjDocs);
      if (this.onAdjReqsChangeCb) this.onAdjReqsChangeCb(this.cachedAdjReqs);
      if (this.onBackupsChangeCb) this.onBackupsChangeCb(this.cachedBackups);
      if (this.onPendingMutationsChangeCb) this.onPendingMutationsChangeCb(this.cachedPendingMutations);

      // 2. Setup Persistent Real-Time BroadcastChannel Mesh
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('paramount_realtime_mesh');
        this.channel.onmessage = (ev: MessageEvent<SyncMessage>) => {
          this.handleIncomingBroadcast(ev.data);
        };
      }

      // 3. Fallback Storage Event Listener (for multi-window synchronization)
      window.addEventListener('storage', this.handleStorageEvent);

      // 4. Online / Offline Network Listeners for Auto-Drain
      window.addEventListener('online', this.handleOnlineEvent);
      window.addEventListener('offline', this.handleOfflineEvent);

      // 5. Periodic Queue Drain Loop (every 10s if online)
      this.queueDrainTimer = setInterval(() => {
        if (navigator.onLine && this.cachedPendingMutations.length > 0) {
          this.drainPendingMutations();
        }
      }, 10000);

      this.isInitialized = true;
      this.updateSyncStatus(navigator.onLine ? 'CONNECTED' : 'OFFLINE');

      // 6. Request initial state mesh from peers
      this.broadcastMessage({ type: 'FORCE_RESYNC_REQUEST', clientId: this.clientId });

      // 7. Drain any existing pending mutations immediately
      if (navigator.onLine && this.cachedPendingMutations.length > 0) {
        this.drainPendingMutations();
      }
    } catch (err) {
      console.error('[RealtimeSyncService] Initialization error:', err);
      this.updateSyncStatus('OFFLINE');
    }
  }

  private updateSyncStatus(status: CloudSyncStatus) {
    if (this.onSyncStatusCb) {
      this.onSyncStatusCb(status);
    }
  }

  private handleOnlineEvent = () => {
    this.updateSyncStatus('CONNECTED');
    this.drainPendingMutations();
  };

  private handleOfflineEvent = () => {
    this.updateSyncStatus('OFFLINE');
  };

  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'paramount_sync_storage_packet' && e.newValue) {
      try {
        const msg = JSON.parse(e.newValue) as SyncMessage;
        this.handleIncomingBroadcast(msg);
      } catch (err) {
        // Ignore JSON parse errors
      }
    }
  };

  /**
   * Broadcasts a message across BroadcastChannel & LocalStorage fallback
   */
  private broadcastMessage(msg: SyncMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {
        // Fallback
      }
    }
    // Also dispatch to localStorage to notify external windows
    try {
      localStorage.setItem('paramount_sync_storage_packet', JSON.stringify(msg));
    } catch (e) {
      // Ignore quota errors
    }
  }

  /**
   * Handles incoming broadcast messages from other tabs/clients with deterministic LWW resolution
   */
  private async handleIncomingBroadcast(msg: SyncMessage) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'STOCK_CHANGED': {
        const mergeResult = mergeStockCatalogsLWW(this.cachedStock, msg.payload);
        this.cachedStock = mergeResult.merged;
        if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
        await this.persistCurrentState();
        break;
      }

      case 'STOCK_ITEM_UPDATED': {
        const existing = this.cachedStock.find((s) => s.ItemID === msg.payload.ItemID);
        if (!existing) {
          this.cachedStock = [...this.cachedStock, msg.payload].sort((a, b) =>
            a.ItemID.localeCompare(b.ItemID)
          );
        } else {
          const res = resolveStockItemLWW(existing, msg.payload);
          if (res.winner === 'incoming') {
            this.cachedStock = this.cachedStock.map((s) =>
              s.ItemID === msg.payload.ItemID ? res.resolved : s
            );
          }
        }
        if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
        await this.persistCurrentState();
        break;
      }

      case 'ISSUE_TRANSACTION': {
        const { stockUpdates, issueDoc, movementLogs, issuer } = msg.payload;
        // Merge stock with LWW
        const mergeResult = mergeStockCatalogsLWW(this.cachedStock, stockUpdates);
        this.cachedStock = mergeResult.merged;
        // Merge logs
        this.cachedLogs = mergeMovementLogs(this.cachedLogs, movementLogs);
        // Merge issued document
        this.cachedIssuedDocs = mergeDocuments(this.cachedIssuedDocs, [issueDoc], 'slipNumber');

        if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
        if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
        if (this.onIssuedDocsChangeCb) this.onIssuedDocsChangeCb(this.cachedIssuedDocs);

        await this.persistCurrentState();
        break;
      }

      case 'DELIVERY_TRANSACTION': {
        const { stockUpdates, receivedDoc, movementLogs } = msg.payload;
        const mergeResult = mergeStockCatalogsLWW(this.cachedStock, stockUpdates);
        this.cachedStock = mergeResult.merged;
        this.cachedLogs = mergeMovementLogs(this.cachedLogs, movementLogs);
        this.cachedReceivedDocs = mergeDocuments(this.cachedReceivedDocs, [receivedDoc], 'voucherNumber');

        if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
        if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
        if (this.onReceivedDocsChangeCb) this.onReceivedDocsChangeCb(this.cachedReceivedDocs);

        await this.persistCurrentState();
        break;
      }

      case 'ADJUSTMENT_TRANSACTION': {
        const { stockUpdates, adjDoc, movementLogs } = msg.payload;
        const mergeResult = mergeStockCatalogsLWW(this.cachedStock, stockUpdates);
        this.cachedStock = mergeResult.merged;
        this.cachedLogs = mergeMovementLogs(this.cachedLogs, movementLogs);
        this.cachedAdjDocs = mergeDocuments(this.cachedAdjDocs, [adjDoc], 'voucherNumber');

        if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
        if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
        if (this.onAdjDocsChangeCb) this.onAdjDocsChangeCb(this.cachedAdjDocs);

        await this.persistCurrentState();
        break;
      }

      case 'ADJUSTMENT_REQUEST': {
        this.cachedAdjReqs = mergeAdjustmentRequests(this.cachedAdjReqs, [msg.payload]);
        if (this.onAdjReqsChangeCb) this.onAdjReqsChangeCb(this.cachedAdjReqs);
        await this.persistCurrentState();
        break;
      }

      case 'DEPARTMENT_CHANGED': {
        this.cachedDepts = [
          ...this.cachedDepts.filter((d) => d.DeptID !== msg.payload.DeptID),
          msg.payload,
        ].sort((a, b) => a.DeptID.localeCompare(b.DeptID));
        if (this.onDeptsChangeCb) this.onDeptsChangeCb(this.cachedDepts);
        await this.persistCurrentState();
        break;
      }

      case 'MANAGER_CHANGED': {
        this.cachedManagers = [
          ...this.cachedManagers.filter((m) => m.ManagerID !== msg.payload.ManagerID),
          msg.payload,
        ].sort((a, b) => a.ManagerID.localeCompare(b.ManagerID));
        if (this.onManagersChangeCb) this.onManagersChangeCb(this.cachedManagers);
        await this.persistCurrentState();
        break;
      }

      case 'ADMIN_CHANGED': {
        this.cachedAdmins = [
          ...this.cachedAdmins.filter((a) => a.IssuerID !== msg.payload.IssuerID),
          msg.payload,
        ].sort((a, b) => a.IssuerID.localeCompare(b.IssuerID));
        if (this.onAdminsChangeCb) this.onAdminsChangeCb(this.cachedAdmins);
        await this.persistCurrentState();
        break;
      }

      case 'BACKUP_CREATED': {
        this.cachedBackups = [msg.payload, ...this.cachedBackups.filter((b) => b.id !== msg.payload.id)];
        if (this.onBackupsChangeCb) this.onBackupsChangeCb(this.cachedBackups);
        await this.persistCurrentState();
        break;
      }

      case 'BACKUP_RESTORED': {
        const p = msg.payload;
        this.cachedStock = p.stockItems || [];
        this.cachedLogs = p.movementLogs || [];
        this.cachedDepts = p.departments || [];
        this.cachedManagers = p.managers || [];
        this.cachedAdmins = p.admins || [];
        if (p.issuedDocs) this.cachedIssuedDocs = p.issuedDocs;
        if (p.receivedDocs) this.cachedReceivedDocs = p.receivedDocs;
        if (p.adjustmentDocs) this.cachedAdjDocs = p.adjustmentDocs;

        if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
        if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
        if (this.onDeptsChangeCb) this.onDeptsChangeCb(this.cachedDepts);
        if (this.onManagersChangeCb) this.onManagersChangeCb(this.cachedManagers);
        if (this.onAdminsChangeCb) this.onAdminsChangeCb(this.cachedAdmins);
        if (this.onIssuedDocsChangeCb) this.onIssuedDocsChangeCb(this.cachedIssuedDocs);
        if (this.onReceivedDocsChangeCb) this.onReceivedDocsChangeCb(this.cachedReceivedDocs);
        if (this.onAdjDocsChangeCb) this.onAdjDocsChangeCb(this.cachedAdjDocs);

        await this.persistCurrentState();
        break;
      }

      case 'HEARTBEAT': {
        if (msg.payload.id !== this.currentPresenceId) {
          this.cachedPresences.set(msg.payload.id, msg.payload);
          this.notifyPresences();
        }
        break;
      }

      case 'HEARTBEAT_LEAVE': {
        this.cachedPresences.delete(msg.payload.id);
        this.notifyPresences();
        break;
      }

      case 'COLLABORATIVE_EVENT': {
        if (this.onEventBroadcastCb) {
          this.onEventBroadcastCb(msg.payload);
        }
        break;
      }

      case 'FORCE_RESYNC_REQUEST': {
        if (msg.clientId !== this.clientId && this.cachedStock.length > 0) {
          // Send current catalog to the newly joined peer
          this.broadcastMessage({ type: 'STOCK_CHANGED', payload: this.cachedStock });
        }
        break;
      }
    }
  }

  private notifyPresences() {
    const now = Date.now();
    const active: UserPresence[] = [];
    this.cachedPresences.forEach((p) => {
      if (now - (p.lastActive || 0) < 45000) {
        active.push(p);
      }
    });
    active.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
    if (this.onPresenceChangeCb) this.onPresenceChangeCb(active);
  }

  private async persistCurrentState() {
    try {
      await syncAllToIndexedDB({
        stockItems: this.cachedStock,
        movementLogs: this.cachedLogs,
        admins: this.cachedAdmins,
        departments: this.cachedDepts,
        managers: this.cachedManagers,
        issuedDocs: this.cachedIssuedDocs,
        receivedDocs: this.cachedReceivedDocs,
        adjustmentDocs: this.cachedAdjDocs,
        adjustmentRequests: this.cachedAdjReqs,
        backups: this.cachedBackups,
      });
    } catch (err) {
      console.warn('[RealtimeSyncService] IndexedDB persist error:', err);
    }
  }

  // ===========================================================================
  // REAL-TIME PRESENCE & HEARTBEAT
  // ===========================================================================

  startPresenceHeartbeat(user: AdminUser, currentTab: string, currentSheet: string = 'Master_Stock') {
    if (!this.currentPresenceId) {
      this.currentPresenceId = `pres_${user.IssuerID}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const platformInfo = detectPlatform();
    const avatarColors = [
      'bg-indigo-600',
      'bg-teal-600',
      'bg-emerald-600',
      'bg-blue-600',
      'bg-violet-600',
      'bg-amber-600',
      'bg-rose-600',
    ];
    const issuerId = user?.IssuerID || 'ADM001';
    const charCode = issuerId.length > 0 ? issuerId.charCodeAt(issuerId.length - 1) : 0;
    const avatarColor = avatarColors[charCode % avatarColors.length];

    const sendHeartbeat = () => {
      if (!this.currentPresenceId) return;
      const presenceDoc: UserPresence = {
        id: this.currentPresenceId,
        userId: user.IssuerID,
        userName: user.IssuerName,
        role: user.Role,
        currentTab,
        currentSheet,
        lastActive: Date.now(),
        platform: platformInfo.platform,
        isOnline: navigator.onLine,
        avatarColor,
      };
      this.cachedPresences.set(this.currentPresenceId, presenceDoc);
      this.broadcastMessage({ type: 'HEARTBEAT', payload: presenceDoc });
      this.notifyPresences();
    };

    sendHeartbeat();

    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = setInterval(sendHeartbeat, 15000);
  }

  stopPresenceHeartbeat() {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
    if (this.currentPresenceId) {
      this.broadcastMessage({ type: 'HEARTBEAT_LEAVE', payload: { id: this.currentPresenceId } });
      this.cachedPresences.delete(this.currentPresenceId);
      this.notifyPresences();
      this.currentPresenceId = null;
    }
  }

  // ===========================================================================
  // COLLABORATIVE EVENT BROADCASTING
  // ===========================================================================

  async broadcastEvent(event: Omit<CollaborativeEvent, 'id' | 'timestamp'>) {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload: CollaborativeEvent = {
      ...event,
      id: eventId,
      timestamp: new Date().toISOString(),
    };
    if (this.onEventBroadcastCb) {
      this.onEventBroadcastCb(payload);
    }
    this.broadcastMessage({ type: 'COLLABORATIVE_EVENT', payload });
  }

  // ===========================================================================
  // OPTIMISTIC LOCAL MUTATIONS & PWA OFFLINE QUEUE
  // ===========================================================================

  async saveStockItem(item: StockItem, issuer?: AdminUser) {
    const { iso, timestampMs } = generateMonotonicTimestamp();
    const updated: StockItem = {
      ...item,
      UpdatedAt: iso,
      Version: (item.Version || 0) + 1,
      LastUpdatedBy: issuer?.IssuerName || 'System',
      ClientId: this.clientId,
    };

    // 1. Optimistic local memory update
    const existingIndex = this.cachedStock.findIndex((s) => s.ItemID === item.ItemID);
    if (existingIndex >= 0) {
      this.cachedStock[existingIndex] = updated;
    } else {
      this.cachedStock.push(updated);
      this.cachedStock.sort((a, b) => a.ItemID.localeCompare(b.ItemID));
    }
    if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);

    // 2. Persist to local IndexedDB
    await this.persistCurrentState();

    // 3. Enqueue mutation
    const mutationId = `mut_${timestampMs}_${Math.random().toString(36).substring(2, 6)}`;
    const mutation: OfflineMutation = {
      id: mutationId,
      type: 'STOCK_UPDATE',
      timestamp: timestampMs,
      isoTimestamp: iso,
      clientId: this.clientId,
      issuerId: issuer?.IssuerID || 'local',
      issuerName: issuer?.IssuerName || 'Admin',
      version: updated.Version || 1,
      payload: updated,
      status: 'PENDING',
      retryCount: 0,
    };
    await enqueueOfflineMutation(mutation);
    this.cachedPendingMutations.push(mutation);
    if (this.onPendingMutationsChangeCb) this.onPendingMutationsChangeCb(this.cachedPendingMutations);

    // 4. Broadcast live update to peers
    this.broadcastMessage({ type: 'STOCK_ITEM_UPDATED', payload: updated, issuer, mutationId });

    // 5. Broadcast Collaborative Event
    if (issuer) {
      this.broadcastEvent({
        type: 'STOCK_UPDATED',
        summary: `${issuer.IssuerName} updated inventory item ${item.ItemID} (${item.ItemName}) to ${item.Qty} ${item.Unit || 'units'}`,
        userId: issuer.IssuerID,
        userName: issuer.IssuerName,
        userRole: issuer.Role,
        details: { itemId: item.ItemID, qty: item.Qty },
      });
    }

    return updated;
  }

  async saveStockBatch(items: StockItem[], issuer?: AdminUser) {
    const { iso, timestampMs } = generateMonotonicTimestamp();
    const updatedBatch: StockItem[] = items.map((item) => ({
      ...item,
      UpdatedAt: iso,
      Version: (item.Version || 0) + 1,
      LastUpdatedBy: issuer?.IssuerName || 'System',
      ClientId: this.clientId,
    }));

    // Optimistic merge
    const mergeRes = mergeStockCatalogsLWW(this.cachedStock, updatedBatch);
    this.cachedStock = mergeRes.merged;
    if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
    await this.persistCurrentState();

    const mutationId = `mut_${timestampMs}_batch`;
    const mutation: OfflineMutation = {
      id: mutationId,
      type: 'STOCK_BATCH',
      timestamp: timestampMs,
      isoTimestamp: iso,
      clientId: this.clientId,
      issuerId: issuer?.IssuerID || 'local',
      issuerName: issuer?.IssuerName || 'Admin',
      version: 1,
      payload: updatedBatch,
      status: 'PENDING',
      retryCount: 0,
    };
    await enqueueOfflineMutation(mutation);
    this.cachedPendingMutations.push(mutation);
    if (this.onPendingMutationsChangeCb) this.onPendingMutationsChangeCb(this.cachedPendingMutations);

    this.broadcastMessage({ type: 'STOCK_CHANGED', payload: updatedBatch, issuer, mutationId });

    if (issuer) {
      this.broadcastEvent({
        type: 'BATCH_UPDATED',
        summary: `${issuer.IssuerName} performed batch update on ${items.length} inventory items`,
        userId: issuer.IssuerID,
        userName: issuer.IssuerName,
        userRole: issuer.Role,
      });
    }
  }

  async saveIssueSlipTransaction(params: {
    stockUpdates: StockItem[];
    issueDoc: IssuedDocument;
    movementLogs: MovementLogEntry[];
    issuer: AdminUser;
  }) {
    const { iso, timestampMs } = generateMonotonicTimestamp();

    const stampedStocks = params.stockUpdates.map((s) => ({
      ...s,
      UpdatedAt: iso,
      Version: (s.Version || 0) + 1,
      LastUpdatedBy: params.issuer.IssuerName,
      ClientId: this.clientId,
    }));

    const stampedLogs = params.movementLogs.map((l) => ({
      ...l,
      UpdatedAt: iso,
      ClientId: this.clientId,
    }));

    const stampedDoc: IssuedDocument = {
      ...params.issueDoc,
      updatedAt: iso,
      clientId: this.clientId,
    };

    // 1. Optimistic local updates
    const mergeRes = mergeStockCatalogsLWW(this.cachedStock, stampedStocks);
    this.cachedStock = mergeRes.merged;
    this.cachedLogs = mergeMovementLogs(this.cachedLogs, stampedLogs);
    this.cachedIssuedDocs = mergeDocuments(this.cachedIssuedDocs, [stampedDoc], 'slipNumber');

    if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
    if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
    if (this.onIssuedDocsChangeCb) this.onIssuedDocsChangeCb(this.cachedIssuedDocs);

    // 2. Persist
    await this.persistCurrentState();

    // 3. Queue mutation
    const mutationId = `mut_iss_${timestampMs}`;
    const mutation: OfflineMutation = {
      id: mutationId,
      type: 'ISSUE_TRANSACTION',
      timestamp: timestampMs,
      isoTimestamp: iso,
      clientId: this.clientId,
      issuerId: params.issuer.IssuerID,
      issuerName: params.issuer.IssuerName,
      userRole: params.issuer.Role,
      version: 1,
      payload: {
        stockUpdates: stampedStocks,
        issueDoc: stampedDoc,
        movementLogs: stampedLogs,
        issuer: params.issuer,
      },
      status: 'PENDING',
      retryCount: 0,
    };
    await enqueueOfflineMutation(mutation);
    this.cachedPendingMutations.push(mutation);
    if (this.onPendingMutationsChangeCb) this.onPendingMutationsChangeCb(this.cachedPendingMutations);

    // 4. Broadcast live
    this.broadcastMessage({
      type: 'ISSUE_TRANSACTION',
      payload: {
        stockUpdates: stampedStocks,
        issueDoc: stampedDoc,
        movementLogs: stampedLogs,
        issuer: params.issuer,
      },
      mutationId,
    });

    // 5. Broadcast event
    const itemNames = stampedDoc.items.map((i) => `${i.Qty}x ${i.ItemName}`).join(', ');
    this.broadcastEvent({
      type: 'STOCK_ISSUED',
      summary: `${params.issuer.IssuerName} issued [${itemNames}] to ${stampedDoc.deptName} (${stampedDoc.slipNumber})`,
      userId: params.issuer.IssuerID,
      userName: params.issuer.IssuerName,
      userRole: params.issuer.Role,
      details: { slipNumber: stampedDoc.slipNumber, dept: stampedDoc.deptName },
    });
  }

  async saveDeliveryTransaction(params: {
    stockUpdates: StockItem[];
    receivedDoc: ReceivedDocument;
    movementLogs: MovementLogEntry[];
    issuer: AdminUser;
  }) {
    const { iso, timestampMs } = generateMonotonicTimestamp();

    const stampedStocks = params.stockUpdates.map((s) => ({
      ...s,
      UpdatedAt: iso,
      Version: (s.Version || 0) + 1,
      LastUpdatedBy: params.issuer.IssuerName,
      ClientId: this.clientId,
    }));

    const stampedLogs = params.movementLogs.map((l) => ({
      ...l,
      UpdatedAt: iso,
      ClientId: this.clientId,
    }));

    const stampedDoc: ReceivedDocument = {
      ...params.receivedDoc,
      updatedAt: iso,
      clientId: this.clientId,
    };

    const mergeRes = mergeStockCatalogsLWW(this.cachedStock, stampedStocks);
    this.cachedStock = mergeRes.merged;
    this.cachedLogs = mergeMovementLogs(this.cachedLogs, stampedLogs);
    this.cachedReceivedDocs = mergeDocuments(this.cachedReceivedDocs, [stampedDoc], 'voucherNumber');

    if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
    if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
    if (this.onReceivedDocsChangeCb) this.onReceivedDocsChangeCb(this.cachedReceivedDocs);

    await this.persistCurrentState();

    const mutationId = `mut_grn_${timestampMs}`;
    const mutation: OfflineMutation = {
      id: mutationId,
      type: 'DELIVERY_TRANSACTION',
      timestamp: timestampMs,
      isoTimestamp: iso,
      clientId: this.clientId,
      issuerId: params.issuer.IssuerID,
      issuerName: params.issuer.IssuerName,
      version: 1,
      payload: {
        stockUpdates: stampedStocks,
        receivedDoc: stampedDoc,
        movementLogs: stampedLogs,
        issuer: params.issuer,
      },
      status: 'PENDING',
      retryCount: 0,
    };
    await enqueueOfflineMutation(mutation);
    this.cachedPendingMutations.push(mutation);
    if (this.onPendingMutationsChangeCb) this.onPendingMutationsChangeCb(this.cachedPendingMutations);

    this.broadcastMessage({
      type: 'DELIVERY_TRANSACTION',
      payload: {
        stockUpdates: stampedStocks,
        receivedDoc: stampedDoc,
        movementLogs: stampedLogs,
        issuer: params.issuer,
      },
      mutationId,
    });

    this.broadcastEvent({
      type: 'STOCK_RECEIVED',
      summary: `${params.issuer.IssuerName} received delivery ${stampedDoc.voucherNumber} (${stampedDoc.deliveryRef})`,
      userId: params.issuer.IssuerID,
      userName: params.issuer.IssuerName,
      userRole: params.issuer.Role,
      details: { voucherNumber: stampedDoc.voucherNumber },
    });
  }

  async saveAdjustmentTransaction(params: {
    stockUpdates: StockItem[];
    adjDoc: AdjustmentDocument;
    movementLogs: MovementLogEntry[];
    issuer: AdminUser;
  }) {
    const { iso, timestampMs } = generateMonotonicTimestamp();

    const stampedStocks = params.stockUpdates.map((s) => ({
      ...s,
      UpdatedAt: iso,
      Version: (s.Version || 0) + 1,
      LastUpdatedBy: params.issuer.IssuerName,
      ClientId: this.clientId,
    }));

    const stampedLogs = params.movementLogs.map((l) => ({
      ...l,
      UpdatedAt: iso,
      ClientId: this.clientId,
    }));

    const stampedDoc: AdjustmentDocument = {
      ...params.adjDoc,
      updatedAt: iso,
      clientId: this.clientId,
    };

    const mergeRes = mergeStockCatalogsLWW(this.cachedStock, stampedStocks);
    this.cachedStock = mergeRes.merged;
    this.cachedLogs = mergeMovementLogs(this.cachedLogs, stampedLogs);
    this.cachedAdjDocs = mergeDocuments(this.cachedAdjDocs, [stampedDoc], 'voucherNumber');

    if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
    if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
    if (this.onAdjDocsChangeCb) this.onAdjDocsChangeCb(this.cachedAdjDocs);

    await this.persistCurrentState();

    const mutationId = `mut_adj_${timestampMs}`;
    const mutation: OfflineMutation = {
      id: mutationId,
      type: 'ADJUSTMENT_TRANSACTION',
      timestamp: timestampMs,
      isoTimestamp: iso,
      clientId: this.clientId,
      issuerId: params.issuer.IssuerID,
      issuerName: params.issuer.IssuerName,
      version: 1,
      payload: {
        stockUpdates: stampedStocks,
        adjDoc: stampedDoc,
        movementLogs: stampedLogs,
        issuer: params.issuer,
      },
      status: 'PENDING',
      retryCount: 0,
    };
    await enqueueOfflineMutation(mutation);
    this.cachedPendingMutations.push(mutation);
    if (this.onPendingMutationsChangeCb) this.onPendingMutationsChangeCb(this.cachedPendingMutations);

    this.broadcastMessage({
      type: 'ADJUSTMENT_TRANSACTION',
      payload: {
        stockUpdates: stampedStocks,
        adjDoc: stampedDoc,
        movementLogs: stampedLogs,
        issuer: params.issuer,
      },
      mutationId,
    });

    this.broadcastEvent({
      type: 'ADJUSTMENT_APPROVED',
      summary: `${params.issuer.IssuerName} performed verified stock adjustment ${stampedDoc.voucherNumber} (${stampedDoc.reasonLabel})`,
      userId: params.issuer.IssuerID,
      userName: params.issuer.IssuerName,
      userRole: params.issuer.Role,
      details: { voucherNumber: stampedDoc.voucherNumber },
    });
  }

  async saveAdjustmentRequest(req: StockAdjustmentRequest, issuer: AdminUser) {
    this.cachedAdjReqs = mergeAdjustmentRequests(this.cachedAdjReqs, [req]);
    if (this.onAdjReqsChangeCb) this.onAdjReqsChangeCb(this.cachedAdjReqs);
    await this.persistCurrentState();

    this.broadcastMessage({ type: 'ADJUSTMENT_REQUEST', payload: req, issuer });

    this.broadcastEvent({
      type: 'ADJUSTMENT_REQUESTED',
      summary: `${issuer.IssuerName} submitted stock adjustment request ${req.id} for ${req.items.length} items`,
      userId: issuer.IssuerID,
      userName: issuer.IssuerName,
      userRole: issuer.Role,
      details: { requestId: req.id },
    });
  }

  async updateAdjustmentRequest(req: StockAdjustmentRequest, reviewer?: AdminUser) {
    this.cachedAdjReqs = mergeAdjustmentRequests(this.cachedAdjReqs, [req]);
    if (this.onAdjReqsChangeCb) this.onAdjReqsChangeCb(this.cachedAdjReqs);
    await this.persistCurrentState();

    this.broadcastMessage({ type: 'ADJUSTMENT_REQUEST', payload: req, issuer: reviewer });

    if (reviewer) {
      const isApproved = req.status === 'APPROVED_AND_EXECUTED' || req.status === 'TIMED_ACCESS_GRANTED';
      this.broadcastEvent({
        type: isApproved ? 'ADJUSTMENT_APPROVED' : 'ADJUSTMENT_REJECTED',
        summary: `${reviewer.IssuerName} ${isApproved ? 'approved' : 'rejected'} stock adjustment request ${req.id}`,
        userId: reviewer.IssuerID,
        userName: reviewer.IssuerName,
        userRole: reviewer.Role,
        details: { requestId: req.id, status: req.status },
      });
    }
  }

  async saveDepartment(dept: Department) {
    this.cachedDepts = [
      ...this.cachedDepts.filter((d) => d.DeptID !== dept.DeptID),
      dept,
    ].sort((a, b) => a.DeptID.localeCompare(b.DeptID));
    if (this.onDeptsChangeCb) this.onDeptsChangeCb(this.cachedDepts);
    await this.persistCurrentState();
    this.broadcastMessage({ type: 'DEPARTMENT_CHANGED', payload: dept });
  }

  async saveManager(mgr: Manager) {
    this.cachedManagers = [
      ...this.cachedManagers.filter((m) => m.ManagerID !== mgr.ManagerID),
      mgr,
    ].sort((a, b) => a.ManagerID.localeCompare(b.ManagerID));
    if (this.onManagersChangeCb) this.onManagersChangeCb(this.cachedManagers);
    await this.persistCurrentState();
    this.broadcastMessage({ type: 'MANAGER_CHANGED', payload: mgr });
  }

  async saveAdminUser(admin: AdminUser) {
    this.cachedAdmins = [
      ...this.cachedAdmins.filter((a) => a.IssuerID !== admin.IssuerID),
      admin,
    ].sort((a, b) => a.IssuerID.localeCompare(b.IssuerID));
    if (this.onAdminsChangeCb) this.onAdminsChangeCb(this.cachedAdmins);
    await this.persistCurrentState();
    this.broadcastMessage({ type: 'ADMIN_CHANGED', payload: admin });
  }

  async saveBackupSnapshot(backup: BackupSnapshot) {
    this.cachedBackups = [backup, ...this.cachedBackups.filter((b) => b.id !== backup.id)];
    if (this.onBackupsChangeCb) this.onBackupsChangeCb(this.cachedBackups);
    await this.persistCurrentState();
    this.broadcastMessage({ type: 'BACKUP_CREATED', payload: backup });

    this.broadcastEvent({
      type: 'BACKUP_CREATED',
      summary: `${backup.issuerName} created local database snapshot (${backup.id} - ${backup.type})`,
      userId: backup.issuerId,
      userName: backup.issuerName,
    });
  }

  async restoreFullBackup(payload: BackupSnapshot['payload'], restorer: AdminUser) {
    this.cachedStock = payload.stockItems || [];
    this.cachedLogs = payload.movementLogs || [];
    this.cachedDepts = payload.departments || [];
    this.cachedManagers = payload.managers || [];
    this.cachedAdmins = payload.admins || [];
    if (payload.issuedDocs) this.cachedIssuedDocs = payload.issuedDocs;
    if (payload.receivedDocs) this.cachedReceivedDocs = payload.receivedDocs;
    if (payload.adjustmentDocs) this.cachedAdjDocs = payload.adjustmentDocs;

    if (this.onStockChangeCb) this.onStockChangeCb(this.cachedStock);
    if (this.onLogsChangeCb) this.onLogsChangeCb(this.cachedLogs);
    if (this.onDeptsChangeCb) this.onDeptsChangeCb(this.cachedDepts);
    if (this.onManagersChangeCb) this.onManagersChangeCb(this.cachedManagers);
    if (this.onAdminsChangeCb) this.onAdminsChangeCb(this.cachedAdmins);
    if (this.onIssuedDocsChangeCb) this.onIssuedDocsChangeCb(this.cachedIssuedDocs);
    if (this.onReceivedDocsChangeCb) this.onReceivedDocsChangeCb(this.cachedReceivedDocs);
    if (this.onAdjDocsChangeCb) this.onAdjDocsChangeCb(this.cachedAdjDocs);

    await this.persistCurrentState();
    this.broadcastMessage({ type: 'BACKUP_RESTORED', payload, restorer });

    this.broadcastEvent({
      type: 'BACKUP_RESTORED',
      summary: `${restorer.IssuerName} restored full database snapshot across all active user sessions`,
      userId: restorer.IssuerID,
      userName: restorer.IssuerName,
      userRole: restorer.Role,
    });
  }

  // ===========================================================================
  // PWA BACKGROUND SYNC & MUTATION QUEUE DRAINER
  // ===========================================================================

  async drainPendingMutations(): Promise<number> {
    const mutations = await getPendingMutations();
    if (mutations.length === 0) return 0;

    this.updateSyncStatus('DRAINING');
    let drainedCount = 0;

    for (const mut of mutations) {
      try {
        // 1. Replay into SQLite database to ensure physical counts & document tables are guaranteed consistent
        await sqliteBridge.replayMutation(mut);

        // 2. Replay mutation across mesh to connected peers
        if (mut.type === 'STOCK_UPDATE') {
          this.broadcastMessage({ type: 'STOCK_ITEM_UPDATED', payload: mut.payload });
        } else if (mut.type === 'STOCK_BATCH') {
          this.broadcastMessage({ type: 'STOCK_CHANGED', payload: mut.payload });
        } else if (mut.type === 'ISSUE_TRANSACTION') {
          this.broadcastMessage({ type: 'ISSUE_TRANSACTION', payload: mut.payload });
        } else if (mut.type === 'DELIVERY_TRANSACTION') {
          this.broadcastMessage({ type: 'DELIVERY_TRANSACTION', payload: mut.payload });
        } else if (mut.type === 'ADJUSTMENT_TRANSACTION') {
          this.broadcastMessage({ type: 'ADJUSTMENT_TRANSACTION', payload: mut.payload });
        } else if (mut.type === 'ADJUSTMENT_REQUEST') {
          this.broadcastMessage({ type: 'ADJUSTMENT_REQUEST', payload: mut.payload });
        } else if (mut.type === 'DEPARTMENT_UPDATE') {
          this.broadcastMessage({ type: 'DEPARTMENT_CHANGED', payload: mut.payload });
        } else if (mut.type === 'MANAGER_UPDATE') {
          this.broadcastMessage({ type: 'MANAGER_CHANGED', payload: mut.payload });
        } else if (mut.type === 'ADMIN_UPDATE') {
          this.broadcastMessage({ type: 'ADMIN_CHANGED', payload: mut.payload });
        }

        // 3. Mark processed and remove from persistent sync-queue
        await removeMutationFromQueue(mut.id);
        drainedCount++;
      } catch (e) {
        console.warn('[RealtimeSyncService] Mutation drain failed:', e);
      }
    }

    this.cachedPendingMutations = await getPendingMutations();
    if (this.onPendingMutationsChangeCb) {
      this.onPendingMutationsChangeCb(this.cachedPendingMutations);
    }

    this.updateSyncStatus('CONNECTED');

    if (drainedCount > 0) {
      this.broadcastEvent({
        type: 'QUEUE_DRAINED',
        summary: `PWA Background Sync drained and reconciled ${drainedCount} offline mutations seamlessly`,
        userId: 'system',
        userName: 'PWA Sync Engine',
      });
    }

    return drainedCount;
  }

  /**
   * Cleanup on teardown
   */
  cleanup() {
    this.stopPresenceHeartbeat();
    if (this.queueDrainTimer) clearInterval(this.queueDrainTimer);
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    window.removeEventListener('storage', this.handleStorageEvent);
    window.removeEventListener('online', this.handleOnlineEvent);
    window.removeEventListener('offline', this.handleOfflineEvent);
    this.isInitialized = false;
  }
}

export const realtimeSyncService = new RealtimeSyncService();
