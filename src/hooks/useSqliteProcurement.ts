/**
 * ===============================================================================
 * REACT HOOK: USE SQLITE PROCUREMENT ENGINE
 * Provides asynchronous CRUD operations and reactive states backed by the SQLite 3 Bridge
 * ===============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { sqliteBridge } from '../utils/sqliteBridge';
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
  TimedAccessWindow,
  BackupType,
  BackupProtocolPolicy,
  AdjustmentReasonCode,
  UserPresence,
  CollaborativeEvent,
  CloudSyncStatus,
  OfflineMutation,
  CurrencyCode,
} from '../types';
import {
  DEFAULT_BACKUP_POLICY,
  INITIAL_ADJUSTMENT_REQUESTS,
  INITIAL_DEPARTMENTS,
  INITIAL_LOGS,
  INITIAL_MANAGERS,
  INITIAL_STOCK,
} from '../data/initialData';
import { realtimeSyncService } from '../db/realtimeSyncService';
import { getExchangeRate, normalizePriceAndValue } from '../utils/currencyUtils';
import { authApi, InventoryApiError, inventoryApi } from '../api/inventoryApi';
import { loadInitialFromIndexedDB } from '../db/offlineStorage';

export function useSqliteProcurement() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Core Data States
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movementLogs, setMovementLogs] = useState<MovementLogEntry[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [issuedDocs, setIssuedDocs] = useState<IssuedDocument[]>([]);
  const [receivedDocs, setReceivedDocs] = useState<ReceivedDocument[]>([]);
  const [adjustmentDocs, setAdjustmentDocs] = useState<AdjustmentDocument[]>([]);
  const [adjustmentRequests, setAdjustmentRequests] = useState<StockAdjustmentRequest[]>([]);
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [backupPolicy] = useState<BackupProtocolPolicy>(DEFAULT_BACKUP_POLICY);

  // Multi-User Collaboration & Presence States
  const [activePresences, setActivePresences] = useState<UserPresence[]>([]);
  const [liveCollabEvents, setLiveCollabEvents] = useState<CollaborativeEvent[]>([]);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('SYNCING');
  const [pendingMutations, setPendingMutations] = useState<OfflineMutation[]>([]);

  // Active Session & Timed Access Window
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [activeTimedWindow, setActiveTimedWindow] = useState<TimedAccessWindow | null>(null);

  // Master Folder Path
  const [masterFolderPath, setMasterFolderPath] = useState<string>(() => {
    return localStorage.getItem('master_folder_path') || 'C:\\Stationery & Cleaning';
  });

  const handleUpdateMasterFolderPath = (newPath: string) => {
    setMasterFolderPath(newPath);
    localStorage.setItem('master_folder_path', newPath);
  };

  /**
   * Refetches all tables asynchronously from the SQLite database
   */
  const refreshAllFromSqlite = useCallback(async () => {
    setIsDataLoading(true);
    try {
      let state: Awaited<ReturnType<typeof inventoryApi.getState>>['state'];
      try {
        state = (await inventoryApi.getState()).state;
      } catch (error) {
        if (!(error instanceof InventoryApiError && error.status === 0)) throw error;
        const cached = await loadInitialFromIndexedDB();
        const hasCachedData = Object.values(cached).some((value) => Array.isArray(value) && value.length > 0);
        if (hasCachedData) {
          state = {
            stockItems: cached.stockItems || [],
            movementLogs: cached.movementLogs || [],
            admins: cached.admins || [],
            departments: cached.departments || [],
            managers: cached.managers || [],
            issuedDocs: cached.issuedDocs || [],
            receivedDocs: cached.receivedDocs || [],
            adjustmentDocs: cached.adjustmentDocs || [],
            adjustmentRequests: cached.adjustmentRequests || [],
            backups: cached.backups || [],
          };
        } else {
          const [
            stockItemsLocal, movementLogsLocal, adminsLocal, departmentsLocal, managersLocal,
            issuedDocsLocal, receivedDocsLocal, adjustmentDocsLocal, adjustmentRequestsLocal, backupsLocal,
          ] = await Promise.all([
            sqliteBridge.getAllStock(),
            sqliteBridge.getAllMovementLogs(),
            sqliteBridge.getAllAdmins(),
            sqliteBridge.getAllDepartments(),
            sqliteBridge.getAllManagers(),
            sqliteBridge.getAllIssuedDocs(),
            sqliteBridge.getAllReceivedDocs(),
            sqliteBridge.getAllAdjustmentDocs(),
            sqliteBridge.getAllAdjustmentRequests(),
            sqliteBridge.getAllBackups(),
          ]);
          state = {
            stockItems: stockItemsLocal,
            movementLogs: movementLogsLocal,
            admins: adminsLocal,
            departments: departmentsLocal,
            managers: managersLocal,
            issuedDocs: issuedDocsLocal,
            receivedDocs: receivedDocsLocal,
            adjustmentDocs: adjustmentDocsLocal,
            adjustmentRequests: adjustmentRequestsLocal,
            backups: backupsLocal,
          };
        }
      }

      setStockItems(state.stockItems);
      setMovementLogs(state.movementLogs);
      setAdmins(state.admins);
      setDepartments(state.departments);
      setManagers(state.managers);
      setIssuedDocs(state.issuedDocs);
      setReceivedDocs(state.receivedDocs);
      setAdjustmentDocs(state.adjustmentDocs);
      setAdjustmentRequests(state.adjustmentRequests);
      setBackups(state.backups);
      const activeReq = state.adjustmentRequests.find((request) =>
        request.status === 'TIMED_ACCESS_GRANTED' && request.timedAccessWindow?.isActive
      );
      setActiveTimedWindow(activeReq?.timedAccessWindow || null);
      setDbError(null);
    } catch (err: any) {
      console.error('[useSqliteProcurement] Refresh error:', err);
      setDbError(err.message || 'Error querying SQLite database');
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  // Initial Boot from SQLite + Real-time Mesh & LWW Listeners
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await sqliteBridge.getDb();
        if (mounted) {
          await refreshAllFromSqlite();
          setIsDbReady(true);
        }
      } catch (err: any) {
        console.warn('[useSqliteProcurement] Non-fatal local init fallback:', err);
        if (mounted) {
          await refreshAllFromSqlite();
          setIsDbReady(true);
        }
      }

      // Initialize Real-time Offline-First & Multi-Client Synchronization
      try {
        await realtimeSyncService.initialize({
          onStockChange: (items) => {
            if (mounted && Array.isArray(items)) {
              setStockItems(items);
            }
          },
          onLogsChange: (logs) => {
            if (mounted && Array.isArray(logs)) {
              setMovementLogs(logs);
            }
          },
          onAdminsChange: (adminsList) => {
            if (mounted && Array.isArray(adminsList)) {
              setAdmins(adminsList);
            }
          },
          onDeptsChange: (depts) => {
            if (mounted && Array.isArray(depts)) {
              setDepartments(depts);
            }
          },
          onManagersChange: (mgrs) => {
            if (mounted && Array.isArray(mgrs)) {
              setManagers(mgrs);
            }
          },
          onIssuedDocsChange: (docs) => {
            if (mounted && Array.isArray(docs)) {
              setIssuedDocs(docs);
            }
          },
          onReceivedDocsChange: (docs) => {
            if (mounted && Array.isArray(docs)) {
              setReceivedDocs(docs);
            }
          },
          onAdjDocsChange: (docs) => {
            if (mounted && Array.isArray(docs)) {
              setAdjustmentDocs(docs);
            }
          },
          onAdjReqsChange: (reqs) => {
            if (mounted && Array.isArray(reqs)) {
              setAdjustmentRequests(reqs);
              const activeReq = reqs.find(
                (r) => r && r.status === 'TIMED_ACCESS_GRANTED' && r.timedAccessWindow?.isActive
              );
              if (activeReq && activeReq.timedAccessWindow) {
                setActiveTimedWindow(activeReq.timedAccessWindow);
              }
            }
          },
          onBackupsChange: (bks) => {
            if (mounted && Array.isArray(bks)) {
              setBackups(bks);
            }
          },
          onPresenceChange: (presences) => {
            if (mounted && Array.isArray(presences)) {
              setActivePresences(presences);
            }
          },
          onEventBroadcast: (event) => {
            if (mounted && event) {
              setLiveCollabEvents((prev) => [event, ...prev.slice(0, 24)]);
            }
          },
          onSyncStatus: (status) => {
            if (mounted) {
              setSyncStatus(status);
            }
          },
          onPendingMutationsChange: (mutations) => {
            if (mounted) {
              setPendingMutations(mutations);
            }
          },
        });
      } catch (err) {
        console.warn('[useSqliteProcurement] Realtime sync initialization fallback to local:', err);
      }
    })();

    // Listen for Service Worker background sync triggers
    const handleServiceWorkerMessage = async (event: MessageEvent) => {
      if (event.data && (event.data.type === 'SW_SYNC_TRIGGER' || event.data.type === 'SW_SYNC_COMPLETE')) {
        console.log('[useSqliteProcurement] Service Worker sync event received:', event.data.type);
        if (mounted) {
          await realtimeSyncService.drainPendingMutations();
          await refreshAllFromSqlite();
        }
      }
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      mounted = false;
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      realtimeSyncService.cleanup();
    };
  }, [refreshAllFromSqlite]);

  // Presence heartbeat when currentUser changes
  useEffect(() => {
    if (currentUser) {
      realtimeSyncService.startPresenceHeartbeat(currentUser, 'inventory', 'Master_Stock');
    } else {
      realtimeSyncService.stopPresenceHeartbeat();
    }
  }, [currentUser]);

  const drainPendingMutations = useCallback(async () => {
    return await realtimeSyncService.drainPendingMutations();
  }, []);

  // ===========================================================================
  // BACKUP & DISASTER RECOVERY
  // ===========================================================================
  const runBoundedSecondary = useCallback(
    async (task: () => Promise<unknown>, label: string, timeoutMs = 2500): Promise<void> => {
      let timerId: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          task().catch((err) => {
            console.warn(`[useSqliteProcurement] Secondary task (${label}) failed non-fatally:`, err);
          }),
          new Promise<void>((resolve) => {
            timerId = setTimeout(() => {
              console.warn(`[useSqliteProcurement] Secondary task (${label}) timed out after ${timeoutMs}ms; continuing.`);
              resolve();
            }, timeoutMs);
          }),
        ]);
      } finally {
        if (timerId !== undefined) clearTimeout(timerId);
      }
    },
    []
  );

  const handleCreateBackup = useCallback(
    async (type: BackupType, description: string): Promise<BackupSnapshot> => {
      const now = new Date();
      const timeStr = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
      const compactStamp = now.toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
      const snapId = `BKP-${compactStamp}`;
      const fileName = `Paramount_Snap_${type}_${compactStamp}.sqlite.bak`;
      const randomHash = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const checksum = `SHA256: ${randomHash}`;

      const newSnapshot: BackupSnapshot = {
        id: snapId,
        timestamp: timeStr,
        type,
        fileName,
        fileSizeKb: Math.floor(1350 + Math.random() * 150),
        folderPath: `${masterFolderPath}\\Backups\\${type === 'HOURLY' ? 'Hourly' : type === 'DAILY' ? 'Daily' : 'Transactions'}\\`,
        checksum,
        itemCount: stockItems.length,
        movementCount: movementLogs.length,
        departmentCount: departments.length,
        managerCount: managers.length,
        adminCount: admins.length,
        description,
        issuerId: currentUser ? currentUser.IssuerID : 'SYSTEM',
        issuerName: currentUser ? currentUser.IssuerName : 'SQLite Automated Engine',
        payload: {
          stockItems: JSON.parse(JSON.stringify(stockItems)),
          movementLogs: JSON.parse(JSON.stringify(movementLogs)),
          admins: JSON.parse(JSON.stringify(admins)),
          departments: JSON.parse(JSON.stringify(departments)),
          managers: JSON.parse(JSON.stringify(managers)),
          issuedDocs: JSON.parse(JSON.stringify(issuedDocs)),
          receivedDocs: JSON.parse(JSON.stringify(receivedDocs)),
          adjustmentDocs: JSON.parse(JSON.stringify(adjustmentDocs)),
        },
      };

      await sqliteBridge.addBackup(newSnapshot);
      await realtimeSyncService.saveBackupSnapshot(newSnapshot, currentUser || undefined);
      setBackups((prev) => [newSnapshot, ...prev.filter((b) => b.id !== newSnapshot.id)]);
      if (type !== 'TRANSACTION') {
        await refreshAllFromSqlite();
      }
      return newSnapshot;
    },
    [
      masterFolderPath,
      stockItems,
      movementLogs,
      departments,
      managers,
      admins,
      currentUser,
      issuedDocs,
      receivedDocs,
      adjustmentDocs,
      refreshAllFromSqlite,
    ]
  );

  const handleRestoreBackup = useCallback(
    async (snapshot: BackupSnapshot) => {
      if (!snapshot || !snapshot.payload) {
        throw new Error('Invalid snapshot payload format.');
      }
      if (!currentUser) throw new Error('Sign in before restoring a server backup.');
      await handleCreateBackup('PRE_RESTORE', `Safety snapshot before restoring ${snapshot.fileName}`);
      await realtimeSyncService.restoreFullBackup(snapshot.payload, currentUser);
      await refreshAllFromSqlite();
    },
    [currentUser, handleCreateBackup, refreshAllFromSqlite]
  );

  const handleDeleteBackup = useCallback(
    async (snapId: string) => {
      await sqliteBridge.deleteBackup(snapId);
      await realtimeSyncService.deleteBackupSnapshot(snapId, currentUser || undefined);
      await refreshAllFromSqlite();
    },
    [currentUser, refreshAllFromSqlite]
  );

  const handlePruneBackups = useCallback(
    async (retentionDays = 30) => {
      await sqliteBridge.pruneBackups(retentionDays);
      await realtimeSyncService.pruneBackupSnapshots(retentionDays, currentUser || undefined);
      await refreshAllFromSqlite();
    },
    [currentUser, refreshAllFromSqlite]
  );

  const handleImportBackup = useCallback(
    async (importedData: any): Promise<boolean> => {
      if (!importedData) return false;
      const payload = importedData.payload || importedData;
      if (!payload.stockItems || !payload.movementLogs) {
        return false;
      }
      if (!currentUser) throw new Error('Sign in before importing inventory data.');
      await handleCreateBackup('PRE_RESTORE', 'Safety snapshot before importing external backup file');
      await realtimeSyncService.restoreFullBackup(payload, currentUser);
      await refreshAllFromSqlite();
      return true;
    },
    [currentUser, handleCreateBackup, refreshAllFromSqlite]
  );

  const handleResetData = useCallback(async () => {
    if (currentUser?.IssuerID !== 'ADM001') {
      throw new Error('Only the superior administrator may reset server inventory data.');
    }
    await realtimeSyncService.importInventoryState({
      stockItems: INITIAL_STOCK,
      movementLogs: INITIAL_LOGS,
      departments: INITIAL_DEPARTMENTS,
      managers: INITIAL_MANAGERS,
      issuedDocs: [],
      receivedDocs: [],
      adjustmentDocs: [],
      adjustmentRequests: INITIAL_ADJUSTMENT_REQUESTS,
      backups: [],
    });
    await sqliteBridge.resetAllData();
    await authApi.logout();
    setActiveTimedWindow(null);
    setCurrentUser(null);
    await refreshAllFromSqlite();
  }, [currentUser, refreshAllFromSqlite]);

  // ===========================================================================
  // BACKGROUND BACKUP & TIMED EXPIRATION HEARTBEAT
  // ===========================================================================
  const lastHourlyRef = useRef<number>(Date.now());
  const lastCobDateRef = useRef<string>('');

  useEffect(() => {
    const backgroundInterval = setInterval(async () => {
      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const todayDateStr = now.toISOString().split('T')[0];

      const isWeekday = currentDayOfWeek >= 1 && currentDayOfWeek <= 5;
      const isPastOrAt1630 = currentHour > 16 || (currentHour === 16 && currentMinute >= 30);

      if (isWeekday && isPastOrAt1630 && lastCobDateRef.current !== todayDateStr) {
        lastCobDateRef.current = todayDateStr;
        await handleCreateBackup(
          'DAILY',
          `Automated Mon-Fri Close-of-Business (16:30) Full Master Archive [${todayDateStr}]`
        );
      }

      const elapsedMs = Date.now() - lastHourlyRef.current;
      if (elapsedMs >= 60 * 60 * 1000) {
        lastHourlyRef.current = Date.now();
        await handleCreateBackup(
          'HOURLY',
          `Automated Hourly Differential Snapshot — SQLite Sync [${now.toTimeString().split(' ')[0]}]`
        );
      }
    }, 30000);

    return () => clearInterval(backgroundInterval);
  }, [handleCreateBackup]);

  // Timed Access Expiration Engine (Heartbeat every 1s)
  useEffect(() => {
    const timerInterval = setInterval(async () => {
      const nowMs = Date.now();
      if (activeTimedWindow && activeTimedWindow.isActive) {
        const endMs = new Date(activeTimedWindow.endTime).getTime();
        if (!isNaN(endMs) && nowMs >= endMs) {
          setActiveTimedWindow(null);
          // Transition pending requests in SQLite
          for (const req of adjustmentRequests) {
            if (
              req.status === 'TIMED_ACCESS_GRANTED' &&
              req.timedAccessWindow &&
              new Date(req.timedAccessWindow.endTime).getTime() <= nowMs
            ) {
              const updated = {
                ...req,
                status: 'EXPIRED' as const,
                superiorAdminNotes: req.superiorAdminNotes
                  ? `${req.superiorAdminNotes} — [Timed Access Session Expired at ${new Date().toLocaleTimeString()}]`
                  : `[Timed Access Session Expired at ${new Date().toLocaleTimeString()}]`,
              };
              await sqliteBridge.updateAdjustmentRequest(updated);
              await realtimeSyncService.updateAdjustmentRequest(updated, currentUser || undefined);
            }
          }
          await refreshAllFromSqlite();
        }
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [activeTimedWindow, adjustmentRequests, refreshAllFromSqlite]);

  // ===========================================================================
  // ADMIN USERS CRUD (Optimistic)
  // ===========================================================================
  const handleAddAdmin = async (newAdmin: AdminUser, password: string) => {
    try {
      const created = await authApi.createUser(newAdmin, password);
      await sqliteBridge.addAdmin(created);
      setAdmins((prev) => [...prev.filter((admin) => admin.IssuerID !== created.IssuerID), created]);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleUpdateAdmin = async (updatedAdmin: AdminUser) => {
    try {
      const updated = await authApi.updateUser(updatedAdmin);
      await sqliteBridge.updateAdmin(updated);
      setAdmins((prev) => prev.map((admin) => (admin.IssuerID === updated.IssuerID ? updated : admin)));
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleDeleteAdmin = async (issuerId: string) => {
    try {
      await authApi.deleteUser(issuerId);
      await sqliteBridge.deleteAdmin(issuerId);
      setAdmins((prev) => prev.filter((admin) => admin.IssuerID !== issuerId));
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleResetAdminPassword = async (issuerId: string, password: string) => {
    await authApi.resetPassword(issuerId, password);
  };

  // ===========================================================================
  // DEPARTMENTS CRUD (Optimistic)
  // ===========================================================================
  const handleAddDepartment = async (dept: Department) => {
    try {
      await sqliteBridge.addDepartment(dept);
      await realtimeSyncService.saveDepartment(dept);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleUpdateDepartment = async (updatedDept: Department) => {
    try {
      await sqliteBridge.updateDepartment(updatedDept);
      await realtimeSyncService.saveDepartment(updatedDept);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    try {
      await sqliteBridge.deleteDepartment(deptId);
      await realtimeSyncService.deleteDepartment(deptId);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  // ===========================================================================
  // MANAGERS CRUD (Optimistic)
  // ===========================================================================
  const handleAddManager = async (mgr: Manager) => {
    try {
      await sqliteBridge.addManager(mgr);
      await realtimeSyncService.saveManager(mgr);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleUpdateManager = async (updatedMgr: Manager) => {
    try {
      await sqliteBridge.updateManager(updatedMgr);
      await realtimeSyncService.saveManager(updatedMgr);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleDeleteManager = async (mgrId: string) => {
    try {
      await sqliteBridge.deleteManager(mgrId);
      await realtimeSyncService.deleteManager(mgrId);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  // ===========================================================================
  // STOCK ITEMS CRUD (Optimistic + Mesh Sync)
  // ===========================================================================
  const handleAddNewStockItem = async (item: StockItem) => {
    setStockItems((prev) => [...prev, item]);
    try {
      await sqliteBridge.addStockItem(item);
      await realtimeSyncService.saveStockItem(item, currentUser || undefined);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleUpdateStockItemName = async (itemId: string, newName: string) => {
    const item = stockItems.find((s) => s.ItemID === itemId);
    const updated = item ? { ...item, ItemName: newName } : undefined;
    setStockItems((prev) => prev.map((s) => (s.ItemID === itemId ? { ...s, ItemName: newName } : s)));
    try {
      await sqliteBridge.updateStockItemName(itemId, newName);
      if (updated) {
        await realtimeSyncService.saveStockItem(updated, currentUser || undefined);
      }
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleUpdateStockItem = async (updatedItem: StockItem) => {
    setStockItems((prev) => prev.map((s) => (s.ItemID === updatedItem.ItemID ? updatedItem : s)));
    try {
      await sqliteBridge.updateStockItem(updatedItem);
      await realtimeSyncService.saveStockItem(updatedItem, currentUser || undefined);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleDeleteStockItem = async (itemId: string) => {
    try {
      await sqliteBridge.deleteStockItem(itemId);
      await realtimeSyncService.deleteStockItem(itemId, currentUser || undefined);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  // ===========================================================================
  // STOCK DELIVERY HANDLER (GRN) - Optimistic
  // ===========================================================================
  const handleSaveDelivery = async (
    itemId: string,
    addQty: number,
    deliveryNoteRef?: string,
    supplier?: string,
    unitPrice?: number,
    currency?: CurrencyCode
  ) => {
    const item = stockItems.find((i) => i.ItemID === itemId);
    if (!item) return;

    const newQty = item.Qty + addQty;
    const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const dateOnly = nowStr.split(' ')[0];
    const finalSupplier = supplier || item.LastSupplier || undefined;
    const finalUnitPrice = unitPrice && unitPrice > 0 ? unitPrice : item.UnitPrice;
    const finalCurrency = currency || item.Currency || 'USD';
    const timestampFile = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
    const voucherNumber = deliveryNoteRef || `GRN-${Math.floor(100000 + Math.random() * 900000)}`;
    const pdfFileName = `GRN_Voucher_${voucherNumber}_${timestampFile}.pdf`;
    const folderPath = `${masterFolderPath}\\Received_Items\\`;
    const fullSavedPath = `${folderPath}${pdfFileName}`;

    const newReceivedDoc: ReceivedDocument = {
      docType: 'DELIVERY',
      voucherNumber,
      timestamp: nowStr,
      deliveryRef: voucherNumber,
      SupplierName: finalSupplier,
      supplier: finalSupplier,
      issuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      issuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
      issuerRole: currentUser ? currentUser.Role : 'Procurement Manager',
      items: [
        {
          ItemID: item.ItemID,
          ItemName: item.ItemName,
          Category: item.Category,
          Qty: addQty,
          Unit: item.Unit,
          SupplierName: finalSupplier,
          Supplier: finalSupplier,
          UnitPrice: finalUnitPrice,
          Currency: finalCurrency,
        },
      ],
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    const newLog: MovementLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      Timestamp: nowStr,
      Type: 'DELIVERY',
      ItemID: item.ItemID,
      ItemName: item.ItemName,
      Qty: addQty,
      DeptID: 'N/A',
      DeptName: finalSupplier ? `Supplier: ${finalSupplier}` : 'Central Warehouse Supply',
      DeptHead: 'N/A',
      DeptEmail: 'N/A',
      IssuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      IssuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
      SupplierName: finalSupplier,
      IssueSlipFileName: fullSavedPath,
      DocumentRef: voucherNumber,
      Status: 'Completed',
      UnitPrice: finalUnitPrice,
      Currency: finalCurrency,
    };

    // Optimistic UI updates
    setStockItems((prev) =>
      prev.map((s) =>
        s.ItemID === itemId
          ? {
              ...s,
              Qty: newQty,
              SupplierName: finalSupplier || s.SupplierName || s.LastSupplier,
              LastSupplier: finalSupplier || s.SupplierName || s.LastSupplier,
              LastReceivedDate: dateOnly,
              UnitPrice: finalUnitPrice ?? s.UnitPrice,
              Currency: finalCurrency,
            }
          : s
      )
    );
    setReceivedDocs((prev) => [newReceivedDoc, ...prev]);
    setMovementLogs((prev) => [newLog, ...prev]);

    try {
      await sqliteBridge.updateStockQty(itemId, newQty, finalSupplier, dateOnly);
      // Persist updated unit price and currency if provided
      if (finalUnitPrice && finalUnitPrice > 0) {
        const updatedItem = {
          ...item,
          Qty: newQty,
          LastSupplier: finalSupplier,
          LastReceivedDate: dateOnly,
          UnitPrice: finalUnitPrice,
          Currency: finalCurrency,
        };
        await sqliteBridge.updateStockItem(updatedItem);
      }
      await sqliteBridge.addReceivedDoc(newReceivedDoc);
      await sqliteBridge.addMovementLog(newLog);

      await runBoundedSecondary(
        async () => {
          await handleCreateBackup('TRANSACTION', `Automatic Snapshot: Delivery (GRN) ${voucherNumber} for ${item.ItemID}`);
          if (currentUser) {
            await realtimeSyncService.saveDeliveryTransaction({
              stockUpdates: [{ ...item, Qty: newQty, LastSupplier: finalSupplier, LastReceivedDate: dateOnly, UnitPrice: finalUnitPrice, Currency: finalCurrency }],
              receivedDoc: newReceivedDoc,
              movementLogs: [newLog],
              issuer: currentUser,
            });
          }
        },
        `GRN-${voucherNumber}`
      );
    } catch (err) {
      console.error('[useSqliteProcurement] Delivery save error:', err);
      await refreshAllFromSqlite();
    }
    return newReceivedDoc;
  };

  const handleSaveBulkDeliveries = async (
    deliveries: { itemId: string; addQty: number; supplier?: string; unitPrice?: number; currency?: CurrencyCode }[],
    deliveryNoteRef?: string,
    defaultSupplier?: string,
    targetDept?: Department
  ): Promise<ReceivedDocument | undefined> => {
    if (!deliveries || deliveries.length === 0) return undefined;

    const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const dateOnly = nowStr.split(' ')[0];
    const timestampFile = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
    const isBrv = Boolean(targetDept) || String(deliveryNoteRef || '').toUpperCase().startsWith('BRV-');
    const voucherNumber =
      deliveryNoteRef ||
      `${isBrv ? 'BRV' : 'GRN'}-${Math.floor(100000 + Math.random() * 900000)}`;
    const pdfFileName = `${isBrv ? 'BRV_Voucher' : 'GRN_Voucher'}_${voucherNumber}_${timestampFile}.pdf`;
    const folderPath = `${masterFolderPath}\\Received_Items\\`;
    const fullSavedPath = `${folderPath}${pdfFileName}`;

    const mainSupplier = defaultSupplier || deliveries[0]?.supplier || undefined;

    const newReceivedDoc: ReceivedDocument = {
      docType: 'DELIVERY',
      voucherTitle: isBrv ? 'BULK RECEIVE VOUCHER (BRV)' : undefined,
      voucherNumber,
      timestamp: nowStr,
      deliveryRef: voucherNumber,
      SupplierName: mainSupplier,
      supplier: mainSupplier,
      deptID: targetDept?.DeptID,
      deptName: targetDept?.DeptName,
      deptHeadName: targetDept?.DeptHeadName,
      deptHeadEmail: targetDept?.DeptHeadEmail,
      issuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      issuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
      issuerRole: currentUser ? currentUser.Role : 'Procurement Manager',
      items: deliveries.map((d) => {
        const item = stockItems.find((s) => s.ItemID === d.itemId);
        const itemSupplier = d.supplier || mainSupplier;
        const itemPrice = d.unitPrice && d.unitPrice > 0 ? d.unitPrice : item?.UnitPrice;
        const itemCurrency = d.currency || item?.Currency || 'USD';
        return {
          ItemID: d.itemId,
          ItemName: item ? item.ItemName : d.itemId,
          Category: item ? item.Category : 'Stationery',
          Qty: d.addQty,
          Unit: item ? item.Unit : 'Units',
          SupplierName: itemSupplier,
          Supplier: itemSupplier,
          UnitPrice: itemPrice,
          Currency: itemCurrency,
        };
      }),
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    const newLogs: MovementLogEntry[] = deliveries.map((d, index) => {
      const item = stockItems.find((i) => i.ItemID === d.itemId);
      const itemSupplier = d.supplier || mainSupplier;
      const itemPrice = d.unitPrice && d.unitPrice > 0 ? d.unitPrice : item?.UnitPrice;
      const itemCurrency = d.currency || item?.Currency || 'USD';
      return {
        id: `LOG-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        Timestamp: nowStr,
        Type: 'DELIVERY',
        ItemID: d.itemId,
        ItemName: item ? item.ItemName : d.itemId,
        Qty: d.addQty,
        DeptID: targetDept?.DeptID || 'N/A',
        DeptName: targetDept
          ? `${targetDept.DeptName}${itemSupplier ? ` (Supplier: ${itemSupplier})` : ''}`
          : itemSupplier
          ? `Supplier: ${itemSupplier}`
          : 'Central Warehouse Bulk Shipment',
        DeptHead: targetDept?.DeptHeadName || 'N/A',
        DeptEmail: targetDept?.DeptHeadEmail || 'N/A',
        IssuerID: currentUser ? currentUser.IssuerID : 'ADM001',
        IssuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
        SupplierName: itemSupplier,
        IssueSlipFileName: fullSavedPath,
        DocumentRef: voucherNumber,
        Status: 'Completed',
        UnitPrice: itemPrice,
        Currency: itemCurrency,
      };
    });

    // Optimistic UI updates
    setStockItems((prev) =>
      prev.map((s) => {
        const d = deliveries.find((del) => del.itemId === s.ItemID);
        if (d && d.addQty > 0) {
          const itemSupplier = d.supplier || mainSupplier;
          const itemPrice = d.unitPrice && d.unitPrice > 0 ? d.unitPrice : s.UnitPrice;
          const itemCurrency = d.currency || s.Currency || 'USD';
          return {
            ...s,
            Qty: s.Qty + d.addQty,
            SupplierName: itemSupplier || s.SupplierName || s.LastSupplier,
            LastSupplier: itemSupplier || s.SupplierName || s.LastSupplier,
            LastReceivedDate: dateOnly,
            UnitPrice: itemPrice,
            Currency: itemCurrency,
          };
        }
        return s;
      })
    );
    setReceivedDocs((prev) => [newReceivedDoc, ...prev]);
    setMovementLogs((prev) => [...newLogs, ...prev]);

    try {
      const stockUpdates: { itemId: string; newQty: number }[] = [];
      for (const d of deliveries) {
        const match = stockItems.find((s) => s.ItemID === d.itemId);
        if (match && d.addQty > 0) {
          const updated = match.Qty + d.addQty;
          const itemSupplier = d.supplier || mainSupplier || match.LastSupplier;
          const itemPrice = d.unitPrice && d.unitPrice > 0 ? d.unitPrice : match.UnitPrice;
          const itemCurrency = d.currency || match.Currency || 'USD';
          await sqliteBridge.updateStockQty(d.itemId, updated, itemSupplier, dateOnly);
          if (itemPrice && itemPrice > 0) {
            await sqliteBridge.updateStockItem({
              ...match,
              Qty: updated,
              LastSupplier: itemSupplier,
              LastReceivedDate: dateOnly,
              UnitPrice: itemPrice,
              Currency: itemCurrency,
            });
          }
          stockUpdates.push({ itemId: d.itemId, newQty: updated });
        }
      }
      await sqliteBridge.addReceivedDoc(newReceivedDoc);
      await sqliteBridge.addBulkMovementLogs(newLogs);

      await runBoundedSecondary(
        async () => {
          await handleCreateBackup('TRANSACTION', `Automatic Snapshot: Bulk Delivery (GRN) ${voucherNumber} (${deliveries.length} items)`);

          // Mesh Write-through
          if (currentUser) {
            const updatedStocks = deliveries
              .map((d) => {
                const match = stockItems.find((s) => s.ItemID === d.itemId);
                const itemSupplier = d.supplier || mainSupplier || match?.LastSupplier;
                const itemPrice = d.unitPrice && d.unitPrice > 0 ? d.unitPrice : match?.UnitPrice;
                return match
                  ? {
                      ...match,
                      Qty: match.Qty + d.addQty,
                      LastSupplier: itemSupplier,
                      LastReceivedDate: dateOnly,
                      UnitPrice: itemPrice,
                    }
                  : null;
              })
              .filter(Boolean) as StockItem[];

            await realtimeSyncService.saveDeliveryTransaction({
              stockUpdates: updatedStocks,
              receivedDoc: newReceivedDoc,
              movementLogs: newLogs,
              issuer: currentUser,
            });
          }
        },
        `BULK-GRN-${voucherNumber}`
      );
    } catch (err) {
      console.error('[useSqliteProcurement] Bulk delivery save error:', err);
      await refreshAllFromSqlite();
    }
    return newReceivedDoc;
  };

  // ===========================================================================
  // STOCK ADJUSTMENT HANDLER - Optimistic & Strict Request Variant Enforcing
  // ===========================================================================
  const handleSaveAdjustment = async (adjData: {
    itemId: string;
    physicalQty: number;
    reasonCode: AdjustmentReasonCode;
    reasonLabel: string;
    countRef: string;
    notes: string;
    requestId?: string;
    unitPrice?: number;
    currency?: CurrencyCode;
  }): Promise<{ success: boolean; allAdjusted?: boolean; voucherNumber?: string; error?: string; doc?: AdjustmentDocument }> => {
    const isSuperAdmin = currentUser?.IssuerID === 'ADM001';

    // Find if this adjustment is associated with an active request or active timed access window
    let targetReq = adjData.requestId
      ? adjustmentRequests.find((r) => r.id === adjData.requestId)
      : adjustmentRequests.find(
          (r) =>
            r.status === 'TIMED_ACCESS_GRANTED' &&
            r.timedAccessWindow?.isActive &&
            (r.requesterId === (currentUser?.IssuerID || 'ADM001') ||
              r.timedAccessWindow?.grantedToIssuerId === (currentUser?.IssuerID || 'ADM001') ||
              r.items.some((it) => it.ItemID === adjData.itemId))
        );

    // =========================================================================
    // STRICT VALIDATION CHECK: Enforce authorized scope, items, and variants
    // =========================================================================
    if (!isSuperAdmin) {
      // 1. Must have an active timed window or active request
      const isWindowValid =
        activeTimedWindow &&
        activeTimedWindow.isActive &&
        new Date(activeTimedWindow.endTime).getTime() > Date.now();

      if (!isWindowValid && !targetReq) {
        console.error('[useSqliteProcurement] Adjustment rejected: Missing active timed access clearance.');
        return {
          success: false,
          error: 'Clearance required: Only Superior Admin or staff with an active authorized timed access window can adjust stock.',
        };
      }

      // 2. Validate authorized items list
      const authorizedItemIds =
        activeTimedWindow?.allowedItemIds || targetReq?.items?.map((it) => it.ItemID) || [];

      if (!authorizedItemIds.includes(adjData.itemId)) {
        console.error(
          `[useSqliteProcurement] Adjustment scope violation: Item [${adjData.itemId}] is not included in the active adjustment request payload.`
        );
        return {
          success: false,
          error: `Scope violation: Item [${adjData.itemId}] is not included in the authorized adjustment request payload.`,
        };
      }

      // 3. Validate item has not already been adjusted in this session
      const completedIds = activeTimedWindow?.completedItemIds || [];
      const matchedReqItem = targetReq?.items?.find((it) => it.ItemID === adjData.itemId);
      if (completedIds.includes(adjData.itemId) || matchedReqItem?.isAdjusted) {
        console.error(
          `[useSqliteProcurement] Duplicate adjustment rejected: Item [${adjData.itemId}] has already been adjusted and finalized.`
        );
        return {
          success: false,
          error: `Item [${adjData.itemId}] has already been adjusted and finalized for this request.`,
        };
      }

      // 4. Validate exact requested variants (ProposedPhysicalQty, ReasonCode)
      if (matchedReqItem) {
        if (adjData.physicalQty !== matchedReqItem.ProposedPhysicalQty) {
          console.error(
            `[useSqliteProcurement] Variant mismatch: Physical quantity (${adjData.physicalQty}) deviates from authorized request payload (${matchedReqItem.ProposedPhysicalQty}).`
          );
          return {
            success: false,
            error: `Variant deviation detected: Quantity must be exactly ${matchedReqItem.ProposedPhysicalQty} as authorized in request #${targetReq?.id}.`,
          };
        }

        if (adjData.reasonCode && adjData.reasonCode !== matchedReqItem.ReasonCode) {
          console.error(
            `[useSqliteProcurement] Variant mismatch: Discrepancy reason (${adjData.reasonCode}) deviates from authorized request reason (${matchedReqItem.ReasonCode}).`
          );
          return {
            success: false,
            error: `Variant deviation detected: Reason code must be '${matchedReqItem.ReasonCode}' as authorized in request #${targetReq?.id}.`,
          };
        }
      }
    }

    const item = stockItems.find((i) => i.ItemID === adjData.itemId);
    if (!item) {
      return { success: false, error: `Stock item [${adjData.itemId}] does not exist in inventory.` };
    }

    const systemQty = item.Qty;
    const varianceQty = adjData.physicalQty - systemQty;
    const now = new Date();
    const nowStr = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const timestampFile = now.toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
    const voucherNumber = `ADJ-${Math.floor(100000 + Math.random() * 900000)}`;
    const pdfFileName = `Stock_Adjustment_${voucherNumber}_${timestampFile}.pdf`;
    const folderPath = `${masterFolderPath}\\Adjustments\\`;
    const fullSavedPath = `${folderPath}${pdfFileName}`;

    const rate = getExchangeRate();
    const itemPrice = adjData.unitPrice !== undefined && Number(adjData.unitPrice) > 0
      ? Number(adjData.unitPrice)
      : (Number(item.UnitPrice) > 0 ? Number(item.UnitPrice) : 0);
    const itemCurrency: CurrencyCode = adjData.currency || item.Currency || 'USD';
    const pricing = normalizePriceAndValue(itemPrice, Math.abs(varianceQty), itemCurrency, 'USD', rate);

    const newAdjustmentDoc: AdjustmentDocument = {
      docType: 'ADJUSTMENT',
      voucherNumber,
      timestamp: nowStr,
      countRef: adjData.countRef,
      reasonCode: adjData.reasonCode,
      reasonLabel: adjData.reasonLabel,
      notes: adjData.notes,
      issuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      issuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
      issuerRole: currentUser ? currentUser.Role : 'Procurement Manager',
      items: [
        {
          ItemID: item.ItemID,
          ItemName: item.ItemName,
          Category: item.Category,
          SystemQty: systemQty,
          PhysicalQty: adjData.physicalQty,
          VarianceQty: varianceQty,
          Unit: item.Unit,
          UnitPrice: itemPrice > 0 ? itemPrice : undefined,
          Currency: itemCurrency,
          BaseCurrency: 'USD',
          NormalizedUnitPrice: pricing.normalizedUnitPrice,
          VarianceCost: pricing.totalValue,
          NormalizedVarianceCost: pricing.normalizedTotalValue,
        },
      ],
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    const newLog: MovementLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      Timestamp: nowStr,
      Type: 'ADJUSTMENT',
      ItemID: item.ItemID,
      ItemName: item.ItemName,
      Qty: varianceQty,
      DeptID: 'N/A',
      DeptName: `Stock Count Discrepancy (${adjData.reasonLabel})`,
      DeptHead: 'N/A',
      DeptEmail: 'N/A',
      IssuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      IssuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
      IssueSlipFileName: fullSavedPath,
      DocumentRef: voucherNumber,
      Status: 'Adjusted',
      DiscrepancyReason: adjData.reasonLabel,
      DiscrepancyNotes: adjData.notes,
      CountRef: adjData.countRef,
      UnitPrice: itemPrice > 0 ? itemPrice : undefined,
      Currency: itemCurrency,
      BaseCurrency: 'USD',
      NormalizedUnitPrice: pricing.normalizedUnitPrice,
      TotalValue: pricing.totalValue,
      NormalizedTotalValue: pricing.normalizedTotalValue,
    };

    let isAllAdjusted = false;
    let updatedReq: StockAdjustmentRequest | null = null;

    if (targetReq) {
      const updatedItems = targetReq.items.map((it) => {
        if (it.ItemID === adjData.itemId) {
          return {
            ...it,
            isAdjusted: true,
            adjustedAt: nowStr,
            voucherNumber,
          };
        }
        return it;
      });

      const allItemsAdjusted = updatedItems.every((it) => it.isAdjusted);
      isAllAdjusted = allItemsAdjusted;

      const completedIds = Array.from(
        new Set([
          ...(targetReq.timedAccessWindow?.completedItemIds || []),
          adjData.itemId,
        ])
      );

      updatedReq = {
        ...targetReq,
        items: updatedItems,
        status: allItemsAdjusted ? 'APPROVED_AND_EXECUTED' : targetReq.status,
        reviewedAt: nowStr,
        timedAccessWindow: targetReq.timedAccessWindow
          ? {
              ...targetReq.timedAccessWindow,
              completedItemIds: completedIds,
              isActive: !allItemsAdjusted,
            }
          : undefined,
      };

      if (allItemsAdjusted) {
        setActiveTimedWindow(null);
      } else if (targetReq.timedAccessWindow) {
        setActiveTimedWindow({
          ...targetReq.timedAccessWindow,
          completedItemIds: completedIds,
          isActive: true,
        });
      }

      setAdjustmentRequests((prev) =>
        prev.map((r) => (r.id === targetReq!.id ? updatedReq! : r))
      );
    }

    // Optimistic UI updates
    setStockItems((prev) =>
      prev.map((s) => (s.ItemID === adjData.itemId ? { ...s, Qty: adjData.physicalQty } : s))
    );
    setAdjustmentDocs((prev) => [newAdjustmentDoc, ...prev]);
    setMovementLogs((prev) => [newLog, ...prev]);

    try {
      await sqliteBridge.updateStockQty(adjData.itemId, adjData.physicalQty);
      await sqliteBridge.addAdjustmentDoc(newAdjustmentDoc);
      await sqliteBridge.addMovementLog(newLog);
      if (updatedReq) {
        await sqliteBridge.updateAdjustmentRequest(updatedReq);
      }

      await runBoundedSecondary(
        async () => {
          await handleCreateBackup(
            'TRANSACTION',
            `Automatic Snapshot: Stock Adjustment ${voucherNumber} for ${item.ItemID} (${adjData.reasonLabel})`
          );

          // Mesh Multi-Client Write-through
          if (currentUser) {
            await realtimeSyncService.saveAdjustmentTransaction({
              stockUpdates: [{ ...item, Qty: adjData.physicalQty }],
              adjDoc: newAdjustmentDoc,
              movementLogs: [newLog],
              issuer: currentUser,
            });
            if (updatedReq) {
              await realtimeSyncService.updateAdjustmentRequest(updatedReq, currentUser);
            }
          }
        },
        `ADJ-${voucherNumber}`
      );
    } catch (err) {
      console.error('[useSqliteProcurement] Adjustment save error:', err);
      await refreshAllFromSqlite();
    }

    return {
      success: true,
      allAdjusted: isAllAdjusted,
      voucherNumber,
      doc: newAdjustmentDoc,
    };
  };

  // ===========================================================================
  // STOCK ADJUSTMENT REQUEST LIFECYCLE - Optimistic
  // ===========================================================================
  const handleCreateAdjustmentRequest = async (
    reqData: Omit<StockAdjustmentRequest, 'id' | 'createdAt' | 'status'>
  ): Promise<StockAdjustmentRequest> => {
    const now = new Date();
    const compactDate = now.toISOString().replace(/[-:]/g, '').substring(0, 8);
    const countToday = adjustmentRequests.length + 1;
    const reqId = `SAR-${compactDate}-${countToday < 10 ? '0' + countToday : countToday}`;
    const nowStr = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');

    const newRequest: StockAdjustmentRequest = {
      ...reqData,
      id: reqId,
      createdAt: nowStr,
      status: 'PENDING',
    };

    setAdjustmentRequests((prev) => [newRequest, ...prev]);
    try {
      await sqliteBridge.addAdjustmentRequest(newRequest);
      await realtimeSyncService.saveAdjustmentRequest(newRequest, currentUser || undefined);
    } catch (err) {
      console.error('[useSqliteProcurement] Create request error:', err);
      await refreshAllFromSqlite();
    }
    return newRequest;
  };

  const handleApproveAndExecuteRequest = async (requestId: string, adminNotes: string) => {
    const req = adjustmentRequests.find((r) => r.id === requestId);
    if (!req) return;

    const now = new Date();
    const nowStr = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const timestampFile = now.toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
    const voucherNumber = `ADJ-AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
    const pdfFileName = `Stock_Adjustment_${voucherNumber}_${timestampFile}.pdf`;
    const folderPath = `${masterFolderPath}\\Adjustments\\`;
    const fullSavedPath = `${folderPath}${pdfFileName}`;

    const rate = getExchangeRate();

    const newAdjustmentDoc: AdjustmentDocument = {
      docType: 'ADJUSTMENT',
      voucherNumber,
      timestamp: nowStr,
      countRef: req.items[0]?.CountRef || `BATCH-${req.id}`,
      reasonCode: req.items[0]?.ReasonCode || 'COUNT_DISCREPANCY',
      reasonLabel: req.requestTitle,
      notes: `${adminNotes ? adminNotes + ' — ' : ''}Authorized batch request [${req.id}] submitted by ${req.requesterName} (${req.requesterId})`,
      issuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      issuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
      issuerRole: 'Procurement Manager (Superior Admin Direct Sign-Off)',
      items: req.items.map((it) => {
        const stockItem = stockItems.find((s) => s.ItemID === it.ItemID);
        const itemPrice = it.UnitPrice !== undefined ? it.UnitPrice : (stockItem?.UnitPrice || 0);
        const itemCurrency: CurrencyCode = it.Currency || stockItem?.Currency || 'USD';
        const pricing = normalizePriceAndValue(itemPrice, Math.abs(it.VarianceQty), itemCurrency, 'USD', rate);
        return {
          ItemID: it.ItemID,
          ItemName: it.ItemName,
          Category: it.Category,
          SystemQty: it.CurrentSystemQty,
          PhysicalQty: it.ProposedPhysicalQty,
          VarianceQty: it.VarianceQty,
          Unit: it.Unit,
          UnitPrice: itemPrice > 0 ? itemPrice : undefined,
          Currency: itemCurrency,
          BaseCurrency: 'USD' as CurrencyCode,
          NormalizedUnitPrice: pricing.normalizedUnitPrice,
          VarianceCost: pricing.totalValue,
          NormalizedVarianceCost: pricing.normalizedTotalValue,
        };
      }),
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    const newLogs: MovementLogEntry[] = req.items.map((it, idx) => {
      const stockItem = stockItems.find((s) => s.ItemID === it.ItemID);
      const itemPrice = it.UnitPrice !== undefined ? it.UnitPrice : (stockItem?.UnitPrice || 0);
      const itemCurrency: CurrencyCode = it.Currency || stockItem?.Currency || 'USD';
      const pricing = normalizePriceAndValue(itemPrice, Math.abs(it.VarianceQty), itemCurrency, 'USD', rate);
      return {
        id: `LOG-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        Timestamp: nowStr,
        Type: 'ADJUSTMENT',
        ItemID: it.ItemID,
        ItemName: it.ItemName,
        Qty: it.VarianceQty,
        DeptID: 'N/A',
        DeptName: `Batch Adjustment [${req.id}] (${it.ReasonCode})`,
        DeptHead: 'N/A',
        DeptEmail: 'N/A',
        IssuerID: currentUser ? currentUser.IssuerID : 'ADM001',
        IssuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
        IssueSlipFileName: fullSavedPath,
        DocumentRef: voucherNumber,
        Status: 'Adjusted',
        DiscrepancyReason: it.ReasonCode,
        DiscrepancyNotes: it.Notes || adminNotes,
        CountRef: it.CountRef || req.id,
        UnitPrice: itemPrice > 0 ? itemPrice : undefined,
        Currency: itemCurrency,
        BaseCurrency: 'USD' as CurrencyCode,
        NormalizedUnitPrice: pricing.normalizedUnitPrice,
        TotalValue: pricing.totalValue,
        NormalizedTotalValue: pricing.normalizedTotalValue,
      };
    });

    const updatedReq: StockAdjustmentRequest = {
      ...req,
      status: 'APPROVED_AND_EXECUTED',
      reviewedBy: currentUser?.IssuerName || 'Rachel Pickard (ADM001)',
      reviewedAt: nowStr,
      superiorAdminNotes: adminNotes,
      items: req.items.map((it) => ({
        ...it,
        isAdjusted: true,
        adjustedAt: nowStr,
        voucherNumber,
      })),
    };

    // Optimistic UI updates
    setStockItems((prev) =>
      prev.map((s) => {
        const matchingReqItem = req.items.find((it) => it.ItemID === s.ItemID);
        return matchingReqItem ? { ...s, Qty: matchingReqItem.ProposedPhysicalQty } : s;
      })
    );
    setAdjustmentDocs((prev) => [newAdjustmentDoc, ...prev]);
    setMovementLogs((prev) => [...newLogs, ...prev]);
    setAdjustmentRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));

    try {
      const stockUpdates: { itemId: string; newQty: number }[] = [];
      for (const it of req.items) {
        await sqliteBridge.updateStockQty(it.ItemID, it.ProposedPhysicalQty);
        stockUpdates.push({ itemId: it.ItemID, newQty: it.ProposedPhysicalQty });
      }
      await sqliteBridge.addAdjustmentDoc(newAdjustmentDoc);
      await sqliteBridge.addBulkMovementLogs(newLogs);
      await sqliteBridge.updateAdjustmentRequest(updatedReq);

      await runBoundedSecondary(
        async () => {
          await handleCreateBackup(
            'TRANSACTION',
            `Automatic Snapshot: Batch Adjustment ${voucherNumber} (${req.items.length} items authorized by Superior Admin)`
          );

          // Multi-Client Mesh Write-through
          if (currentUser) {
            const updatedStocks = req.items
              .map((it) => {
                const match = stockItems.find((s) => s.ItemID === it.ItemID);
                return match ? { ...match, Qty: it.ProposedPhysicalQty } : null;
              })
              .filter(Boolean) as StockItem[];

            await realtimeSyncService.saveAdjustmentTransaction({
              stockUpdates: updatedStocks,
              adjDoc: newAdjustmentDoc,
              movementLogs: newLogs,
              issuer: currentUser,
            });
            await realtimeSyncService.updateAdjustmentRequest(updatedReq, currentUser);
          }
        },
        `ADJ-AUTH-${voucherNumber}`
      );
    } catch (err) {
      console.error('[useSqliteProcurement] Approve and execute error:', err);
      await refreshAllFromSqlite();
    }
    return newAdjustmentDoc;
  };

  const handleGrantTimedAccess = async (requestId: string, durationMinutes: number, adminNotes: string) => {
    const req = adjustmentRequests.find((r) => r.id === requestId);
    if (!req) return;

    const now = new Date();
    const nowStr = now.toISOString();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
    const allowedItemIds = req.items.map((i) => i.ItemID);

    const timedWindow: TimedAccessWindow = {
      grantedToIssuerId: req.requesterId,
      grantedToIssuerName: req.requesterName,
      durationMinutes,
      startTime: nowStr,
      endTime,
      allowedItemIds,
      isActive: true,
      grantedBy: currentUser?.IssuerName || 'Rachel Pickard (ADM001)',
    };

    const updatedReq: StockAdjustmentRequest = {
      ...req,
      status: 'TIMED_ACCESS_GRANTED',
      reviewedBy: currentUser?.IssuerName || 'Rachel Pickard (ADM001)',
      reviewedAt: now.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      superiorAdminNotes: adminNotes,
      timedAccessWindow: timedWindow,
    };

    // Optimistic UI updates
    setActiveTimedWindow(timedWindow);
    setAdjustmentRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));

    try {
      await sqliteBridge.updateAdjustmentRequest(updatedReq);
      if (currentUser) {
        await realtimeSyncService.updateAdjustmentRequest(updatedReq, currentUser);
      }
    } catch (err) {
      console.error('[useSqliteProcurement] Grant timed access error:', err);
      await refreshAllFromSqlite();
    }
  };

  const handleRevokeTimedAccess = async (requestId: string) => {
    setActiveTimedWindow(null);
    setAdjustmentRequests((prev) =>
      prev.map((r) => (r.id === requestId && r.status === 'TIMED_ACCESS_GRANTED' ? { ...r, status: 'EXPIRED' } : r))
    );

    try {
      const req = adjustmentRequests.find((r) => r.id === requestId);
      if (req && req.status === 'TIMED_ACCESS_GRANTED') {
        const updatedReq: StockAdjustmentRequest = { ...req, status: 'EXPIRED' };
        await sqliteBridge.updateAdjustmentRequest(updatedReq);
        if (currentUser) {
          await realtimeSyncService.updateAdjustmentRequest(updatedReq, currentUser);
        }
      }
    } catch (err) {
      console.error('[useSqliteProcurement] Revoke timed access error:', err);
      await refreshAllFromSqlite();
    }
  };

  const handleRejectRequest = async (requestId: string, adminNotes: string) => {
    const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const req = adjustmentRequests.find((r) => r.id === requestId);
    if (!req) return;

    const updatedReq: StockAdjustmentRequest = {
      ...req,
      status: 'REJECTED',
      reviewedBy: currentUser?.IssuerName || 'Rachel Pickard (ADM001)',
      reviewedAt: nowStr,
      superiorAdminNotes: adminNotes,
    };

    setAdjustmentRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));

    try {
      await sqliteBridge.updateAdjustmentRequest(updatedReq);
      if (currentUser) {
        await realtimeSyncService.updateAdjustmentRequest(updatedReq, currentUser);
      }
    } catch (err) {
      console.error('[useSqliteProcurement] Reject request error:', err);
      await refreshAllFromSqlite();
    }
  };

  // ===========================================================================
  // ISSUE OUT REQUISITION EXECUTION - Optimistic
  // ===========================================================================
  const handleExecuteIssue = async (
    dept: Department,
    cart: { ItemID: string; ItemName: string; Category: string; RequestedQty: number }[],
    options?: { slipPrefix?: 'SLIP' | 'SIV'; customRef?: string; voucherTitle?: string }
  ): Promise<IssuedDocument> => {
    const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const timestampFile = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
    const prefix = options?.slipPrefix || (cart.length > 1 ? 'SIV' : 'SLIP');
    const slipNumber =
      options?.customRef?.trim() ||
      `${prefix}-${Math.floor(prefix === 'SIV' ? 100000 + Math.random() * 900000 : 1000 + Math.random() * 9000)}`;
    const isSiv = prefix === 'SIV' || slipNumber.toUpperCase().startsWith('SIV-');
    const pdfFileName = `${isSiv ? 'SIV_Voucher' : 'IssueSlip'}_${dept.DeptID.replace('-', '')}_${timestampFile}.pdf`;
    const folderPath = `${masterFolderPath}\\Issued_Items\\`;
    const fullSavedPath = `${folderPath}${pdfFileName}`;

    const newLogs: MovementLogEntry[] = cart.map((c, index) => ({
      id: `LOG-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      Timestamp: nowStr,
      Type: 'ISSUE',
      ItemID: c.ItemID,
      ItemName: c.ItemName,
      Qty: c.RequestedQty,
      DeptID: dept.DeptID,
      DeptName: dept.DeptName,
      DeptHead: dept.DeptHeadName,
      DeptEmail: dept.DeptHeadEmail,
      IssuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      IssuerName: currentUser ? currentUser.IssuerName : 'Sarah Jenkins',
      IssueSlipFileName: fullSavedPath,
      DocumentRef: slipNumber,
      Status: 'Emailed',
    }));

    const newDoc: IssuedDocument = {
      docType: 'ISSUE',
      voucherTitle: options?.voucherTitle || (isSiv ? 'STOCK ISSUE VOUCHER (SIV)' : undefined),
      slipNumber,
      timestamp: nowStr,
      deptID: dept.DeptID,
      deptName: dept.DeptName,
      deptHeadName: dept.DeptHeadName,
      deptHeadEmail: dept.DeptHeadEmail,
      issuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      issuerName: currentUser ? currentUser.IssuerName : 'Sarah Jenkins',
      items: cart.map((c) => ({
        ItemID: c.ItemID,
        ItemName: c.ItemName,
        Category: c.Category,
        Qty: c.RequestedQty,
      })),
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    // Optimistic UI updates
    setStockItems((prev) =>
      prev.map((s) => {
        const inCart = cart.find((c) => c.ItemID === s.ItemID);
        return inCart ? { ...s, Qty: Math.max(0, s.Qty - inCart.RequestedQty) } : s;
      })
    );
    setIssuedDocs((prev) => [newDoc, ...prev]);
    setMovementLogs((prev) => [...newLogs, ...prev]);

    try {
      const stockUpdates: { itemId: string; newQty: number }[] = [];
      for (const c of cart) {
        const stock = stockItems.find((s) => s.ItemID === c.ItemID);
        if (stock) {
          const newQty = Math.max(0, stock.Qty - c.RequestedQty);
          await sqliteBridge.updateStockQty(c.ItemID, newQty);
          stockUpdates.push({ itemId: c.ItemID, newQty });
        }
      }
      await sqliteBridge.addBulkMovementLogs(newLogs);
      await sqliteBridge.addIssuedDoc(newDoc);

      await runBoundedSecondary(
        async () => {
          await handleCreateBackup('TRANSACTION', `Automatic Snapshot: Requisition Issue ${slipNumber} to ${dept.DeptName}`);

          // Multi-Client Mesh Write-through
          if (currentUser) {
            const updatedStocks = cart
              .map((c) => {
                const match = stockItems.find((s) => s.ItemID === c.ItemID);
                return match ? { ...match, Qty: Math.max(0, match.Qty - c.RequestedQty) } : null;
              })
              .filter(Boolean) as StockItem[];

            await realtimeSyncService.saveIssueSlipTransaction({
              stockUpdates: updatedStocks,
              issueDoc: newDoc,
              movementLogs: newLogs,
              issuer: currentUser,
            });
          }
        },
        `ISSUE-${slipNumber}`
      );
    } catch (err) {
      console.error('[useSqliteProcurement] Issue execution error:', err);
      await refreshAllFromSqlite();
    }
    return newDoc;
  };

  const broadcastCollabEvent = useCallback(
    async (type: CollaborativeEvent['type'], summary: string, meta?: any) => {
      if (currentUser) {
        await realtimeSyncService.broadcastEvent({
          type,
          summary,
          userId: currentUser.IssuerID,
          userName: currentUser.IssuerName,
          userRole: currentUser.Role,
          details: meta,
        });
      }
    },
    [currentUser]
  );

  /**
   * Asynchronous weighted search in SQLite using tokenization, stemming,
   * high-speed pre-query exact SKU check, and tiered field weighting.
   */
  const searchStockWeighted = useCallback(
    async (query: string, categoryFilter: string = 'All', statusFilter: string = 'All'): Promise<StockItem[]> => {
      return await sqliteBridge.searchStockWeighted(query, categoryFilter, statusFilter);
    },
    []
  );

  return {
    isDbReady,
    isDataLoading,
    dbError,
    masterFolderPath,
    handleUpdateMasterFolderPath,
    stockItems,
    movementLogs,
    admins,
    departments,
    managers,
    issuedDocs,
    receivedDocs,
    adjustmentDocs,
    adjustmentRequests,
    activeTimedWindow,
    backups,
    backupPolicy,
    currentUser,
    setCurrentUser,
    activePresences,
    liveCollabEvents,
    syncStatus,
    pendingMutations,
    pendingMutationsCount: pendingMutations.length,
    drainPendingMutations,
    broadcastCollabEvent,
    handleResetData,
    handleCreateBackup,
    handleRestoreBackup,
    handleDeleteBackup,
    handlePruneBackups,
    handleImportBackup,
    handleAddAdmin,
    handleUpdateAdmin,
    handleDeleteAdmin,
    handleResetAdminPassword,
    handleAddDepartment,
    handleUpdateDepartment,
    handleDeleteDepartment,
    handleAddManager,
    handleUpdateManager,
    handleDeleteManager,
    handleAddNewStockItem,
    handleUpdateStockItemName,
    handleUpdateStockItem,
    handleDeleteStockItem,
    handleSaveDelivery,
    handleSaveBulkDeliveries,
    handleSaveAdjustment,
    handleCreateAdjustmentRequest,
    handleApproveAndExecuteRequest,
    handleGrantTimedAccess,
    handleRevokeTimedAccess,
    handleRejectRequest,
    handleExecuteIssue,
    refreshAllFromSqlite,
    searchStockWeighted,
  };
}
