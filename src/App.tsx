import React, { useState, useEffect } from 'react';
import { ExcelSimulator } from './components/simulator/ExcelSimulator';
import { AuditLogAnalyticsView } from './components/audit/AuditLogAnalyticsView';
import { ElectronSuiteView } from './components/electron/ElectronSuiteView';
import { DesktopWindowFrame } from './components/electron/DesktopWindowFrame';
import { VbaCodeHub } from './components/vba/VbaCodeHub';
import { SetupGuide } from './components/guide/SetupGuide';
import { ExportCenter } from './components/export/ExportCenter';
import { StyleGuide } from './components/styleguide/StyleGuide';
import { DocumentViewerModal, DisplayableDocument } from './components/simulator/DocumentViewerModal';
import { MovementLogEntry, IssuedDocument, ReceivedDocument, AdjustmentDocument, AdminUser } from './types';
import { useSqliteProcurement } from './hooks/useSqliteProcurement';
import { Database, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { ToastProvider, useToast } from './context/ToastContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { usePwaInstall } from './hooks/usePwaInstall';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { CrossPlatformInstallModal } from './components/pwa/CrossPlatformInstallModal';
import { SharedDocumentVaultModal } from './components/collaboration/SharedDocumentVaultModal';
import { LandingLoginPage } from './components/layout/LandingLoginPage';
import { StickyTopHeader } from './components/layout/StickyTopHeader';
import { SidebarAccordionNav, SidebarAction } from './components/layout/SidebarAccordionNav';
import { AccountDetailsModal } from './components/auth/AccountDetailsModal';
import { ExecutiveDashboardView } from './components/dashboard/ExecutiveDashboardView';

export type AppTab = 'simulator' | 'audit' | 'electron' | 'vba' | 'guide' | 'export' | 'styleguide' | 'dashboard';

function AppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>('simulator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [externalSimulatorAction, setExternalSimulatorAction] = useState<SidebarAction | null>(null);
  const [activeSheetTitle, setActiveSheetTitle] = useState('Master Stock Sheet');
  const [activeSimulatorSheet, setActiveSimulatorSheet] = useState<'Master_Stock' | 'Movement_Log' | 'Adjustment_Hub' | 'Admin_Config'>('Master_Stock');
  const isMasterStockView = activeTab === 'simulator' && activeSimulatorSheet === 'Master_Stock';
  const [selectedAuditMovementDoc, setSelectedAuditMovementDoc] = useState<DisplayableDocument | null>(null);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const { showToast } = useToast();
  const { isInstallable, isInstalled, isOffline, isUpdateAvailable, triggerInstall, updateApp } = usePwaInstall();

  // URL Query Param Routing (for PWA shortcuts e.g. /?tab=audit or /?tab=simulator)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['simulator', 'audit', 'electron', 'vba', 'guide', 'export', 'styleguide'].includes(tabParam)) {
        setActiveTab(tabParam as AppTab);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }, []);

  // Theme state ('dark' or 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('xl_procurement_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  React.useEffect(() => {
    localStorage.setItem('xl_procurement_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    showToast(
      theme === 'dark' ? 'Switched to Light Office Theme' : 'Switched to Dark Slate Theme',
      'info'
    );
  };

  // SQLite Database Layer & Real-time Collaboration Engine
  const {
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
    pendingMutationsCount,
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
  } = useSqliteProcurement();

  // Low stock counter for indicators
  const safeStockItems = Array.isArray(stockItems) ? stockItems : [];
  const lowStockCount = safeStockItems.filter(
    (item) => item && (Number(item.Qty) || 0) <= (Number(item.ReorderLevel) || 10)
  ).length;

  const pendingAdjustmentRequestsCount = Array.isArray(adjustmentRequests)
    ? adjustmentRequests.filter((r) => r?.status === 'PENDING').length
    : 0;

  // Handle Sidebar Navigation Actions
  const handleSelectSidebarAction = (action: SidebarAction) => {
    setIsSidebarOpen(false);

    if (action.type === 'NAVIGATE_APP_TAB') {
      setActiveTab(action.appTab);
      if (action.appTab === 'dashboard') {
        setActiveSheetTitle('Executive Dashboard');
      } else if (action.appTab === 'simulator') {
        setActiveSheetTitle('Master Stock Sheet');
      } else if (action.appTab === 'audit') {
        setActiveSheetTitle('Audit Log Analytics');
      } else if (action.appTab === 'vba') {
        setActiveSheetTitle('Excel VBA Code Hub');
      } else if (action.appTab === 'guide') {
        setActiveSheetTitle('System Setup Guide');
      } else if (action.appTab === 'export') {
        setActiveSheetTitle('Export & Reporting Center');
      }
      return;
    }

    if (action.type === 'NAVIGATE_SHEET') {
      setActiveTab('simulator');
      if (action.sheet === 'Master_Stock') {
        setActiveSheetTitle('Master Stock Sheet');
        setActiveSimulatorSheet('Master_Stock');
      } else if (action.sheet === 'Movement_Log') {
        setActiveSheetTitle('Movement Log & Vouchers');
        setActiveSimulatorSheet('Movement_Log');
      } else if (action.sheet === 'Adjustment_Hub') {
        setActiveSheetTitle('Stock Adjustment Portal');
        setActiveSimulatorSheet('Adjustment_Hub');
      } else if (action.sheet === 'Admin_Config') {
        setActiveSheetTitle('Admin Configuration & Diagnostics');
        setActiveSimulatorSheet('Admin_Config');
      }
      setExternalSimulatorAction(action);
      return;
    }

    if (action.type === 'OPEN_TAB') {
      setActiveTab('simulator');
      setExternalSimulatorAction(action);
      return;
    }

    if (action.type === 'OPEN_MODAL') {
      if (action.modal === 'accountDetails') {
        setIsAccountModalOpen(true);
      } else if (action.modal === 'documentVault') {
        setIsVaultModalOpen(true);
      } else if (action.modal === 'vbaHub') {
        setActiveTab('vba');
      } else if (action.modal === 'setupGuide') {
        setActiveTab('guide');
      } else {
        setActiveTab('simulator');
        setExternalSimulatorAction(action);
      }
      return;
    }
  };

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    onSearchFocus: () => {
      setActiveTab('simulator');
      setTimeout(() => {
        const searchInput = document.getElementById('stock-inventory-search-input');
        if (searchInput) {
          searchInput.focus();
          (searchInput as HTMLInputElement).select();
        }
      }, 50);
    },
    onHelpModal: () => {
      setIsShortcutsModalOpen((prev) => !prev);
    },
    onEscape: () => {
      setIsShortcutsModalOpen(false);
      setIsInstallModalOpen(false);
      setIsVaultModalOpen(false);
      setIsSidebarOpen(false);
      setSelectedAuditMovementDoc(null);
    },
    onTabChange: (tab) => {
      setActiveTab(tab);
      showToast(`Navigated to ${tab.toUpperCase()} view`, 'info', undefined, 2000);
    },
  });

  const handleAddNewStockItemWithToast = async (item: Parameters<typeof handleAddNewStockItem>[0]) => {
    try {
      await handleAddNewStockItem(item);
      showToast(`Stock Item Created: ${item.ItemName}`, 'success', `Assigned code ${item.ItemID} to ${item.Category}`);
    } catch (e: any) {
      showToast('Item Creation Failed', 'error', e?.message || 'Database validation failed');
    }
  };

  const handleUpdateStockItemWithToast = async (updatedItem: Parameters<typeof handleUpdateStockItem>[0]) => {
    try {
      await handleUpdateStockItem(updatedItem);
      showToast('Stock Record Updated', 'success', `Saved changes for ${updatedItem.ItemName}`);
    } catch (e: any) {
      showToast('Update Failed', 'error', e?.message || 'Failed to update stock');
    }
  };

  const handleDeleteStockItemWithToast = async (id: string) => {
    try {
      await handleDeleteStockItem(id);
      showToast('Item Removed', 'info', `Item ${id} was deleted from database`);
    } catch (e: any) {
      showToast('Deletion Blocked', 'error', e?.message || 'Could not delete item');
    }
  };

  const handleCreateBackupWithToast = async (note: string) => {
    try {
      const bkp = await handleCreateBackup('MANUAL', note);
      if (bkp) {
        showToast('SQLite Backup Saved', 'success', `Snapshot ${bkp.id} archived with ${bkp.recordCounts.stock} stock items`);
      }
      return bkp;
    } catch (e: any) {
      showToast('Backup Error', 'error', e?.message || 'Failed to generate snapshot');
      return null;
    }
  };

  const handleRestoreBackupWithToast = async (snapshot: any) => {
    try {
      const restored = await handleRestoreBackup(snapshot.id || snapshot);
      if (restored) {
        showToast('Database Restored', 'warning', `Snapshot applied successfully`);
      }
      return restored;
    } catch (e: any) {
      showToast('Restore Failed', 'error', e?.message || 'Snapshot corrupted');
      return false;
    }
  };

  const handleOpenAuditMovementDocument = (log: MovementLogEntry) => {
    const docRef = log.DocumentRef || log.id;

    if (log.Type === 'DELIVERY' || docRef.startsWith('GRN-')) {
      const matchedReceivedDoc = receivedDocs.find((d) => d.voucherNumber === docRef);
      const deliveryDoc: ReceivedDocument = matchedReceivedDoc || {
        docType: 'DELIVERY',
        voucherNumber: docRef,
        timestamp: log.Timestamp,
        deliveryRef: docRef,
        issuerID: log.IssuerID,
        issuerName: log.IssuerName,
        issuerRole: 'Procurement Manager',
        items: [
          {
            ItemID: log.ItemID,
            ItemName: log.ItemName,
            Category: 'Stationery',
            Qty: log.Qty,
            Unit: 'Units',
          },
        ],
        pdfFileName: `GRN_${docRef}.pdf`,
        folderPath: `${masterFolderPath}\\Received_Items\\`,
        fullSavedPath: `${masterFolderPath}\\Received_Items\\GRN_${docRef}.pdf`,
      };
      setSelectedAuditMovementDoc({ type: 'DELIVERY', data: deliveryDoc });
      return;
    }

    if (log.Type === 'ADJUSTMENT' || docRef.startsWith('ADJ-')) {
      const matchedAdjDoc = adjustmentDocs.find((d) => d.voucherNumber === docRef);
      const adjDoc: AdjustmentDocument = matchedAdjDoc || {
        docType: 'ADJUSTMENT',
        voucherNumber: docRef,
        timestamp: log.Timestamp,
        countRef: log.CountRef || `COUNT-${docRef}`,
        reasonCode: 'COUNT_DISCREPANCY',
        reasonLabel: log.DiscrepancyReason || 'Physical Count Adjustment',
        notes: log.DiscrepancyNotes || `Audit log entry ${log.id}`,
        issuerID: log.IssuerID,
        issuerName: log.IssuerName,
        issuerRole: 'Procurement Manager',
        items: [
          {
            ItemID: log.ItemID,
            ItemName: log.ItemName,
            Category: 'Stationery',
            SystemQty: log.Qty,
            PhysicalQty: log.Qty,
            VarianceQty: 0,
            Unit: 'Units',
          },
        ],
        pdfFileName: `Adj_${docRef}.pdf`,
        folderPath: `${masterFolderPath}\\Adjustments\\`,
        fullSavedPath: `${masterFolderPath}\\Adjustments\\Adj_${docRef}.pdf`,
      };
      setSelectedAuditMovementDoc({ type: 'ADJUSTMENT', data: adjDoc });
      return;
    }

    // Default: Requisition Issue
    const matchedIssuedDoc = issuedDocs.find((d) => d.slipNumber === docRef);
    const issueDoc: IssuedDocument = matchedIssuedDoc || {
      docType: 'ISSUE',
      slipNumber: docRef,
      timestamp: log.Timestamp,
      deptID: log.DeptID,
      deptName: log.DeptName,
      deptHeadName: log.DeptHead,
      deptHeadEmail: log.DeptEmail,
      issuerID: log.IssuerID,
      issuerName: log.IssuerName,
      items: [
        {
          ItemID: log.ItemID,
          ItemName: log.ItemName,
          Category: 'Stationery',
          Qty: log.Qty,
        },
      ],
      pdfFileName: `IssueSlip_${docRef}.pdf`,
      folderPath: `${masterFolderPath}\\Issued_Items\\`,
      fullSavedPath: `${masterFolderPath}\\Issued_Items\\IssueSlip_${docRef}.pdf`,
    };
    setSelectedAuditMovementDoc({ type: 'ISSUE', data: issueDoc });
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <Database className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Initializing Paramount Inventory Engine</h2>
            <p className="text-sm text-slate-400">
              Mounting local SQLite storage and compiling WebAssembly binary...
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 text-emerald-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading database...</span>
          </div>
          {dbError && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs text-left">
              <strong>Notice:</strong> {dbError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 1: LANDING / LOG-IN PAGE
  // ==========================================
  if (!currentUser) {
    return (
      <DesktopWindowFrame
        title="Paramount Exports — Stationery & Cleaning Stock Inventory System"
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={null}
        onLogout={() => {}}
        onResetData={handleResetData}
        stockCount={safeStockItems.length}
        movementCount={movementLogs?.length || 0}
        masterFolderPath={masterFolderPath}
      >
        <LandingLoginPage
          admins={admins}
          onSuccess={(admin) => {
            setCurrentUser(admin);
            showToast(`Welcome, ${admin.IssuerName}`, 'success', `Authenticated as ${admin.IssuerRole}`);
          }}
          isOffline={isOffline}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          isInstallable={isInstallable}
        />

        {/* PWA Cross-Platform Install Modal */}
        <CrossPlatformInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          onDirectInstall={triggerInstall}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
        />
      </DesktopWindowFrame>
    );
  }

  // ==========================================
  // SCREEN 2: POST-LOGIN WORKSPACE
  // ==========================================
  return (
    <DesktopWindowFrame
      title="Paramount Exports — Stationery & Cleaning Stock Inventory System"
      theme={theme}
      onToggleTheme={handleToggleTheme}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser ? { id: currentUser.IssuerID, name: currentUser.IssuerName } : null}
      onLogout={() => {
        setCurrentUser(null);
        showToast('Session Ended', 'info', 'Logged out successfully');
      }}
      onResetData={handleResetData}
      stockCount={safeStockItems.length}
      movementCount={movementLogs?.length || 0}
      masterFolderPath={masterFolderPath}
      onOpenIssueModal={() => {
        setActiveTab('simulator');
        setExternalSimulatorAction({ type: 'OPEN_TAB', tab: 'issue' });
      }}
      onOpenDeliveryModal={() => {
        setActiveTab('simulator');
        setExternalSimulatorAction({ type: 'OPEN_TAB', tab: 'delivery' });
      }}
      onOpenAdjustmentModal={() => {
        setActiveTab('simulator');
        setExternalSimulatorAction({ type: 'OPEN_TAB', tab: 'adjustment' });
      }}
      onOpenMasterFolderModal={() => {
        setActiveTab('simulator');
        setExternalSimulatorAction({ type: 'OPEN_MODAL', modal: 'folderConfig' });
      }}
      onOpenBackupModal={() => {
        setActiveTab('simulator');
        setExternalSimulatorAction({ type: 'OPEN_MODAL', modal: 'backupRecovery' });
      }}
      hideStatusBar={isMasterStockView}
    >
      <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {/* PWA In-App Install Banner */}
        {isInstallable && !isInstalled && (
          <PWAInstallButton
            isInstallable={isInstallable}
            isInstalled={isInstalled}
            onInstall={() => setIsInstallModalOpen(true)}
            variant="banner"
          />
        )}

        {/* PWA Update Toast Pill */}
        {isUpdateAvailable && (
          <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between shadow-md text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>A newer version of Paramount Inventory is available.</span>
            </div>
            <button
              onClick={updateApp}
              className="flex items-center gap-1 bg-white text-emerald-900 px-2.5 py-1 rounded font-bold hover:bg-emerald-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update Now</span>
            </button>
          </div>
        )}

        {/* Sticky Top Header with Mobile Hamburger Menu */}
        <StickyTopHeader
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          currentUser={currentUser}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          isOffline={isOffline}
          onOpenDocumentVault={() => setIsVaultModalOpen(true)}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
          activeSheetTitle={activeSheetTitle}
          isInstallable={isInstallable}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
        />

        {/* Sidebar Accordion Navigation (Drawer) */}
        <SidebarAccordionNav
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentUser={currentUser}
          onLogout={() => {
            setCurrentUser(null);
            setIsSidebarOpen(false);
            showToast('Session Ended', 'info', 'Logged out successfully');
          }}
          onSelectAction={handleSelectSidebarAction}
          activeSheet={activeSheetTitle}
          activeAppTab={activeTab}
          belowThresholdCount={lowStockCount}
          pendingRequestsCount={pendingAdjustmentRequestsCount}
        />

        {/* Main Application Content Area */}
        <main className={`flex-1 w-full px-2 sm:px-4 lg:px-6 ${isMasterStockView ? 'py-1 pb-0' : 'py-2 sm:py-3'}`}>
          {activeTab === 'dashboard' && (
            <ExecutiveDashboardView
              stockItems={stockItems}
              movementLogs={movementLogs}
              departments={departments}
              adjustmentRequests={adjustmentRequests}
              currentUser={currentUser}
              backups={backups}
              onNavigateTab={(tab) => {
                setActiveTab('simulator');
                setExternalSimulatorAction({ type: 'OPEN_TAB', tab });
              }}
              onNavigateSheet={(sheet) => {
                setActiveTab('simulator');
                setExternalSimulatorAction({ type: 'NAVIGATE_SHEET', sheet });
              }}
              onOpenMovementDoc={handleOpenAuditMovementDocument}
              onSelectItemForReorder={(_item) => {
                setActiveTab('simulator');
                setExternalSimulatorAction({
                  type: 'NAVIGATE_SHEET',
                  sheet: 'Stock Re-Order & Safety Threshold Report',
                });
              }}
            />
          )}

          {activeTab === 'simulator' && (
            <ExcelSimulator
              masterFolderPath={masterFolderPath}
              onUpdateMasterFolderPath={handleUpdateMasterFolderPath}
              stockItems={stockItems}
              movementLogs={movementLogs}
              admins={admins}
              departments={departments}
              issuedDocs={issuedDocs}
              receivedDocs={receivedDocs}
              adjustmentDocs={adjustmentDocs}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              adjustmentRequests={adjustmentRequests}
              activeTimedWindow={activeTimedWindow}
              onCreateAdjustmentRequest={handleCreateAdjustmentRequest}
              onApproveAndExecuteRequest={handleApproveAndExecuteRequest}
              onGrantTimedAccess={handleGrantTimedAccess}
              onRevokeTimedAccess={handleRevokeTimedAccess}
              onRejectRequest={handleRejectRequest}
              onSaveDelivery={handleSaveDelivery}
              onSaveBulkDeliveries={handleSaveBulkDeliveries}
              onSaveAdjustment={handleSaveAdjustment}
              onExecuteIssue={handleExecuteIssue}
              onAddNewStockItem={handleAddNewStockItemWithToast}
              onUpdateStockItemName={handleUpdateStockItemName}
              onUpdateStockItem={handleUpdateStockItemWithToast}
              onDeleteStockItem={handleDeleteStockItemWithToast}
              onAddDepartment={handleAddDepartment}
              onUpdateDepartment={handleUpdateDepartment}
              onDeleteDepartment={handleDeleteDepartment}
              managers={managers}
              onAddManager={handleAddManager}
              onUpdateManager={handleUpdateManager}
              onDeleteManager={handleDeleteManager}
              onAddAdmin={handleAddAdmin}
              onUpdateAdmin={handleUpdateAdmin}
              onDeleteAdmin={handleDeleteAdmin}
              backups={backups}
              backupPolicy={backupPolicy}
              onCreateBackup={handleCreateBackupWithToast}
              onRestoreBackup={handleRestoreBackupWithToast}
              onImportBackup={handleImportBackup}
              onDeleteBackup={handleDeleteBackup}
              onPruneBackups={handlePruneBackups}
              externalAction={externalSimulatorAction}
              onClearExternalAction={() => setExternalSimulatorAction(null)}
              onActiveSheetChange={setActiveSimulatorSheet}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogAnalyticsView
              movementLogs={movementLogs}
              stockItems={stockItems}
              departments={departments}
              onOpenMovementDocument={handleOpenAuditMovementDocument}
            />
          )}

          {activeTab === 'electron' && (
            <ElectronSuiteView
              stockItems={stockItems}
              movementLogs={movementLogs}
              departments={departments}
            />
          )}

          {activeTab === 'vba' && <VbaCodeHub />}

          {activeTab === 'guide' && <SetupGuide />}

          {activeTab === 'styleguide' && (
            <StyleGuide theme={theme} onToggleTheme={handleToggleTheme} />
          )}

          {activeTab === 'export' && (
            <ExportCenter
              stockItems={stockItems}
              movementLogs={movementLogs}
              admins={admins}
              departments={departments}
            />
          )}

          {/* Audit Log Document Viewer Modal (Requisition/GRN/Adj Form with Print Preview & Official Logo) */}
          {selectedAuditMovementDoc && (
            <DocumentViewerModal
              document={selectedAuditMovementDoc}
              onClose={() => setSelectedAuditMovementDoc(null)}
            />
          )}

          {/* Global Keyboard Shortcuts Help Modal */}
          <KeyboardShortcutsModal
            isOpen={isShortcutsModalOpen}
            onClose={() => setIsShortcutsModalOpen(false)}
          />

          {/* Cross-Platform Windows / Mac / Linux PWA Installation Modal */}
          <CrossPlatformInstallModal
            isOpen={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
            onDirectInstall={triggerInstall}
            isInstallable={isInstallable}
            isInstalled={isInstalled}
          />

          {/* Centralized Cloud Document & File Vault Modal */}
          <SharedDocumentVaultModal
            isOpen={isVaultModalOpen}
            onClose={() => setIsVaultModalOpen(false)}
            issuedDocs={issuedDocs}
            receivedDocs={receivedDocs}
            adjustmentDocs={adjustmentDocs}
            backups={backups}
            stockItems={stockItems}
            masterFolderPath={masterFolderPath}
            onViewDoc={(doc) => setSelectedAuditMovementDoc(doc)}
          />

          {/* User Account Details & Password Change Modal */}
          <AccountDetailsModal
            isOpen={isAccountModalOpen}
            currentUser={currentUser}
            onClose={() => setIsAccountModalOpen(false)}
            onUpdateAdmin={handleUpdateAdmin}
          />
        </main>
      </div>
    </DesktopWindowFrame>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
