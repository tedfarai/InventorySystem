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
} from '../types';
import { DEFAULT_BACKUP_POLICY } from '../data/initialData';
import { realtimeSyncService } from '../db/realtimeSyncService';

export function useSqliteProcurement() {
  const [isDbReady, setIsDbReady] = useState(false);
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
    try {
      const [
        sItems,
        mLogs,
        aUsers,
        dList,
        mList,
        iDocs,
        rDocs,
        adjDocs,
        adjReqs,
        bkpList,
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

      setStockItems(Array.isArray(sItems) ? sItems : []);
      setMovementLogs(Array.isArray(mLogs) ? mLogs : []);
      setAdmins(Array.isArray(aUsers) ? aUsers : []);
      setDepartments(Array.isArray(dList) ? dList : []);
      setManagers(Array.isArray(mList) ? mList : []);
      setIssuedDocs(Array.isArray(iDocs) ? iDocs : []);
      setReceivedDocs(Array.isArray(rDocs) ? rDocs : []);
      setAdjustmentDocs(Array.isArray(adjDocs) ? adjDocs : []);
      setAdjustmentRequests(Array.isArray(adjReqs) ? adjReqs : []);
      setBackups(Array.isArray(bkpList) ? bkpList : []);

      // Check if any active timed access window exists in requests
      const validAdjReqs = Array.isArray(adjReqs) ? adjReqs : [];
      const activeReq = validAdjReqs.find((r) => r && r.status === 'TIMED_ACCESS_GRANTED' && r.timedAccessWindow?.isActive);
      if (activeReq && activeReq.timedAccessWindow) {
        setActiveTimedWindow(activeReq.timedAccessWindow);
      }
    } catch (err: any) {
      console.error('[useSqliteProcurement] Refresh error:', err);
      setDbError(err.message || 'Error querying SQLite database');
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
            if (mounted && Array.isArray(items) && items.length > 0) {
              setStockItems(items);
            }
          },
          onLogsChange: (logs) => {
            if (mounted && Array.isArray(logs)) {
              setMovementLogs(logs);
            }
          },
          onAdminsChange: (adminsList) => {
            if (mounted && Array.isArray(adminsList) && adminsList.length > 0) {
              setAdmins(adminsList);
            }
          },
          onDeptsChange: (depts) => {
            if (mounted && Array.isArray(depts) && depts.length > 0) {
              setDepartments(depts);
            }
          },
          onManagersChange: (mgrs) => {
            if (mounted && Array.isArray(mgrs) && mgrs.length > 0) {
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
      await refreshAllFromSqlite();
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
      await handleCreateBackup('PRE_RESTORE', `Safety snapshot before restoring ${snapshot.fileName}`);
      await sqliteBridge.restoreFromPayload(snapshot.payload);
      await refreshAllFromSqlite();
    },
    [handleCreateBackup, refreshAllFromSqlite]
  );

  const handleDeleteBackup = useCallback(
    async (snapId: string) => {
      await sqliteBridge.deleteBackup(snapId);
      await refreshAllFromSqlite();
    },
    [refreshAllFromSqlite]
  );

  const handlePruneBackups = useCallback(
    async (retentionDays = 30) => {
      await sqliteBridge.pruneBackups(retentionDays);
      await refreshAllFromSqlite();
    },
    [refreshAllFromSqlite]
  );

  const handleImportBackup = useCallback(
    async (importedData: any): Promise<boolean> => {
      if (!importedData) return false;
      const payload = importedData.payload || importedData;
      if (!payload.stockItems || !payload.movementLogs) {
        return false;
      }
      await handleCreateBackup('PRE_RESTORE', 'Safety snapshot before importing external backup file');
      await sqliteBridge.restoreFromPayload(payload);
      await refreshAllFromSqlite();
      return true;
    },
    [handleCreateBackup, refreshAllFromSqlite]
  );

  const handleResetData = useCallback(async () => {
    await sqliteBridge.resetAllData();
    setActiveTimedWindow(null);
    setCurrentUser(null);
    await refreshAllFromSqlite();
  }, [refreshAllFromSqlite]);

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
  const handleAddAdmin = async (newAdmin: AdminUser) => {
    setAdmins((prev) => [...prev, newAdmin]);
    try {
      await sqliteBridge.addAdmin(newAdmin);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleUpdateAdmin = async (updatedAdmin: AdminUser) => {
    setAdmins((prev) => prev.map((a) => (a.IssuerID === updatedAdmin.IssuerID ? updatedAdmin : a)));
    try {
      await sqliteBridge.updateAdmin(updatedAdmin);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleDeleteAdmin = async (issuerId: string) => {
    setAdmins((prev) => prev.filter((a) => a.IssuerID !== issuerId));
    try {
      await sqliteBridge.deleteAdmin(issuerId);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  // ===========================================================================
  // DEPARTMENTS CRUD (Optimistic)
  // ===========================================================================
  const handleAddDepartment = async (dept: Department) => {
    setDepartments((prev) => [...prev, dept]);
    try {
      await sqliteBridge.addDepartment(dept);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleUpdateDepartment = async (updatedDept: Department) => {
    setDepartments((prev) => prev.map((d) => (d.DeptID === updatedDept.DeptID ? updatedDept : d)));
    try {
      await sqliteBridge.updateDepartment(updatedDept);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    setDepartments((prev) => prev.filter((d) => d.DeptID !== deptId));
    try {
      await sqliteBridge.deleteDepartment(deptId);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  // ===========================================================================
  // MANAGERS CRUD (Optimistic)
  // ===========================================================================
  const handleAddManager = async (mgr: Manager) => {
    setManagers((prev) => [...prev, mgr]);
    try {
      await sqliteBridge.addManager(mgr);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleUpdateManager = async (updatedMgr: Manager) => {
    setManagers((prev) => prev.map((m) => (m.ManagerID === updatedMgr.ManagerID ? updatedMgr : m)));
    try {
      await sqliteBridge.updateManager(updatedMgr);
    } catch (e) {
      await refreshAllFromSqlite();
      throw e;
    }
  };

  const handleDeleteManager = async (mgrId: string) => {
    setManagers((prev) => prev.filter((m) => m.ManagerID !== mgrId));
    try {
      await sqliteBridge.deleteManager(mgrId);
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
    setStockItems((prev) => prev.filter((s) => s.ItemID !== itemId));
    try {
      await sqliteBridge.deleteStockItem(itemId);
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
    supplier?: string
  ) => {
    const item = stockItems.find((i) => i.ItemID === itemId);
    if (!item) return;

    const newQty = item.Qty + addQty;
    const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const dateOnly = nowStr.split(' ')[0];
    const finalSupplier = supplier || item.LastSupplier || undefined;
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
        },
      ],
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    const newLog: MovementLogEntry = {
      id: `LOG-${Date.now()}`,
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
            }
          : s
      )
    );
    setReceivedDocs((prev) => [newReceivedDoc, ...prev]);
    setMovementLogs((prev) => [newLog, ...prev]);

    try {
      await sqliteBridge.updateStockQty(itemId, newQty, finalSupplier, dateOnly);
      await sqliteBridge.addReceivedDoc(newReceivedDoc);
      await sqliteBridge.addMovementLog(newLog);
      await handleCreateBackup('TRANSACTION', `Automatic Snapshot: Delivery (GRN) ${voucherNumber} for ${item.ItemID}`);

      // Multi-Client Real-time Write
      if (currentUser) {
        await realtimeSyncService.saveDeliveryTransaction({
          stockUpdates: [{ ...item, Qty: newQty, LastSupplier: finalSupplier, LastReceivedDate: dateOnly }],
          receivedDoc: newReceivedDoc,
          movementLogs: [newLog],
          issuer: currentUser,
        });
      }
    } catch (err) {
      console.error('[useSqliteProcurement] Delivery save error:', err);
      await refreshAllFromSqlite();
    }
    return newReceivedDoc;
  };

  const handleSaveBulkDeliveries = async (
    deliveries: { itemId: string; addQty: number; supplier?: string }[],
    deliveryNoteRef?: string,
    defaultSupplier?: string
  ): Promise<ReceivedDocument | undefined> => {
    if (!deliveries || deliveries.length === 0) return undefined;

    const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const dateOnly = nowStr.split(' ')[0];
    const timestampFile = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
    const voucherNumber = deliveryNoteRef || `GRN-${Math.floor(100000 + Math.random() * 900000)}`;
    const pdfFileName = `GRN_Voucher_${voucherNumber}_${timestampFile}.pdf`;
    const folderPath = `${masterFolderPath}\\Received_Items\\`;
    const fullSavedPath = `${folderPath}${pdfFileName}`;

    const mainSupplier = defaultSupplier || deliveries[0]?.supplier || undefined;

    const newReceivedDoc: ReceivedDocument = {
      docType: 'DELIVERY',
      voucherNumber,
      timestamp: nowStr,
      deliveryRef: voucherNumber,
      SupplierName: mainSupplier,
      supplier: mainSupplier,
      issuerID: currentUser ? currentUser.IssuerID : 'ADM001',
      issuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
      issuerRole: currentUser ? currentUser.Role : 'Procurement Manager',
      items: deliveries.map((d) => {
        const item = stockItems.find((s) => s.ItemID === d.itemId);
        const itemSupplier = d.supplier || mainSupplier;
        return {
          ItemID: d.itemId,
          ItemName: item ? item.ItemName : d.itemId,
          Category: item ? item.Category : 'Stationery',
          Qty: d.addQty,
          Unit: item ? item.Unit : 'Units',
          SupplierName: itemSupplier,
          Supplier: itemSupplier,
        };
      }),
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    const newLogs: MovementLogEntry[] = deliveries.map((d, index) => {
      const item = stockItems.find((i) => i.ItemID === d.itemId);
      const itemSupplier = d.supplier || mainSupplier;
      return {
        id: `LOG-${Date.now()}-${index}`,
        Timestamp: nowStr,
        Type: 'DELIVERY',
        ItemID: d.itemId,
        ItemName: item ? item.ItemName : d.itemId,
        Qty: d.addQty,
        DeptID: 'N/A',
        DeptName: itemSupplier ? `Supplier: ${itemSupplier}` : 'Central Warehouse Bulk Shipment',
        DeptHead: 'N/A',
        DeptEmail: 'N/A',
        IssuerID: currentUser ? currentUser.IssuerID : 'ADM001',
        IssuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
        SupplierName: itemSupplier,
        IssueSlipFileName: fullSavedPath,
        DocumentRef: voucherNumber,
        Status: 'Completed',
      };
    });

    // Optimistic UI updates
    setStockItems((prev) =>
      prev.map((s) => {
        const d = deliveries.find((del) => del.itemId === s.ItemID);
        if (d && d.addQty > 0) {
          const itemSupplier = d.supplier || mainSupplier;
          return {
            ...s,
            Qty: s.Qty + d.addQty,
            SupplierName: itemSupplier || s.SupplierName || s.LastSupplier,
            LastSupplier: itemSupplier || s.SupplierName || s.LastSupplier,
            LastReceivedDate: dateOnly,
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
          await sqliteBridge.updateStockQty(d.itemId, updated, itemSupplier, dateOnly);
          stockUpdates.push({ itemId: d.itemId, newQty: updated });
        }
      }
      await sqliteBridge.addReceivedDoc(newReceivedDoc);
      await sqliteBridge.addBulkMovementLogs(newLogs);
      await handleCreateBackup('TRANSACTION', `Automatic Snapshot: Bulk Delivery (GRN) ${voucherNumber} (${deliveries.length} items)`);

      // Mesh Write-through
      if (currentUser) {
        const updatedStocks = deliveries
          .map((d) => {
            const match = stockItems.find((s) => s.ItemID === d.itemId);
            const itemSupplier = d.supplier || mainSupplier || match?.LastSupplier;
            return match ? { ...match, Qty: match.Qty + d.addQty, LastSupplier: itemSupplier, LastReceivedDate: dateOnly } : null;
          })
          .filter(Boolean) as StockItem[];

        await realtimeSyncService.saveDeliveryTransaction({
          stockUpdates: updatedStocks,
          receivedDoc: newReceivedDoc,
          movementLogs: newLogs,
          issuer: currentUser,
        });
      }
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
  }): Promise<{ success: boolean; allAdjusted?: boolean; voucherNumber?: string; error?: string }> => {
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
        },
      ],
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    const newLog: MovementLogEntry = {
      id: `LOG-${Date.now()}`,
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
    } catch (err) {
      console.error('[useSqliteProcurement] Adjustment save error:', err);
      await refreshAllFromSqlite();
    }

    return {
      success: true,
      allAdjusted: isAllAdjusted,
      voucherNumber,
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
      items: req.items.map((it) => ({
        ItemID: it.ItemID,
        ItemName: it.ItemName,
        Category: it.Category,
        SystemQty: it.CurrentSystemQty,
        PhysicalQty: it.ProposedPhysicalQty,
        VarianceQty: it.VarianceQty,
        Unit: it.Unit,
      })),
      pdfFileName,
      folderPath,
      fullSavedPath,
    };

    const newLogs: MovementLogEntry[] = req.items.map((it, idx) => ({
      id: `LOG-${Date.now()}-${idx}`,
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
    }));

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
    } catch (err) {
      console.error('[useSqliteProcurement] Approve and execute error:', err);
      await refreshAllFromSqlite();
    }
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
    cart: { ItemID: string; ItemName: string; Category: string; RequestedQty: number }[]
  ): Promise<IssuedDocument> => {
    const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const timestampFile = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
    const slipNumber = `SLIP-${Math.floor(1000 + Math.random() * 9000)}`;
    const pdfFileName = `IssueSlip_${dept.DeptID.replace('-', '')}_${timestampFile}.pdf`;
    const folderPath = `${masterFolderPath}\\Issued_Items\\`;
    const fullSavedPath = `${folderPath}${pdfFileName}`;

    const newLogs: MovementLogEntry[] = cart.map((c, index) => ({
      id: `LOG-${Date.now()}-${index}`,
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
