import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  PackagePlus,
  Send,
  Lock,
  LogIn,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Check,
  FolderOpen,
  FileSpreadsheet,
  Shield,
  Layers,
  Sparkles,
  Building2,
  ArrowRightLeft,
  Edit3,
  Crown,
  FileText,
  FolderPlus,
  ExternalLink,
  SlidersHorizontal,
  LockKeyhole,
  Info,
  Database,
  Archive,
  History,
  RefreshCw,
  Package,
  Download,
  Save,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Calendar,
  Truck,
} from 'lucide-react';
import {
  StockItem,
  MovementLogEntry,
  AdminUser,
  Department,
  Manager,
  IssuedDocument,
  ReceivedDocument,
  AdjustmentDocument,
  IssueCartItem,
  AdjustmentReasonCode,
  BackupSnapshot,
  BackupType,
  BackupProtocolPolicy,
  StockAdjustmentRequest,
  TimedAccessWindow,
} from '../../types';
import { searchStockItems } from '../../utils/searchEngine';
import { LoginDialog } from './LoginDialog';
import { NavigationDialog } from './NavigationDialog';
import { ProcurementOperationsDialog, ProcurementTabType } from './ProcurementOperationsDialog';
import { PreviewConfirmationModal } from './PreviewConfirmationModal';
import { PdfPreviewModal } from './PdfPreviewModal';
import { ReceivedPdfPreviewModal } from './ReceivedPdfPreviewModal';
import { StockSearchBar } from './StockSearchBar';
import { UserManagementModal } from './UserManagementModal';
import { MasterFolderConfigModal } from './MasterFolderConfigModal';
import { DocumentViewerModal, DisplayableDocument } from './DocumentViewerModal';
import { IssuedDocumentsArchiveModal } from './IssuedDocumentsArchiveModal';
import { BackupRecoveryModal } from './BackupRecoveryModal';
import { StockAdjustmentRequestModal } from './StockAdjustmentRequestModal';
import { SuperiorAdminAdjustmentManagerModal } from './SuperiorAdminAdjustmentManagerModal';
import { AdminDashboardView } from './AdminDashboardView';
import { BulkStockActionsBar } from './BulkStockActionsBar';
import { BulkBatchUpdateModal } from './BulkBatchUpdateModal';
import { BulkDeleteConfirmationModal } from './BulkDeleteConfirmationModal';
import { BulkDeliveryConfirmationModal, BulkDeliveryReviewItem } from './BulkDeliveryConfirmationModal';
import { ReorderReportModal } from './ReorderReportModal';
import { StockItemContextMenuModal } from './StockItemContextMenuModal';
import { useToast } from '../../context/ToastContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useWriteGuard } from '../../hooks/useWriteGuard';
import { SearchHighlightText } from '../common/SearchHighlightText';

interface ExcelSimulatorProps {
  masterFolderPath: string;
  onUpdateMasterFolderPath: (path: string) => void;
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  admins: AdminUser[];
  departments: Department[];
  issuedDocs: IssuedDocument[];
  receivedDocs: ReceivedDocument[];
  adjustmentDocs?: AdjustmentDocument[];
  currentUser: AdminUser | null;
  setCurrentUser: (user: AdminUser | null) => void;
  adjustmentRequests?: StockAdjustmentRequest[];
  activeTimedWindow?: TimedAccessWindow | null;
  onCreateAdjustmentRequest?: (request: Omit<StockAdjustmentRequest, 'id' | 'createdAt' | 'status'>) => StockAdjustmentRequest | Promise<StockAdjustmentRequest>;
  onApproveAndExecuteRequest?: (requestId: string, adminNotes: string) => void;
  onGrantTimedAccess?: (requestId: string, durationMinutes: number, adminNotes: string) => void;
  onRevokeTimedAccess?: (requestId: string) => void;
  onRejectRequest?: (requestId: string, adminNotes: string) => void;
  onSaveDelivery: (itemId: string, addQty: number, deliveryNoteRef?: string, supplier?: string) => Promise<ReceivedDocument | void> | ReceivedDocument | void;
  onSaveBulkDeliveries?: (deliveries: { itemId: string; addQty: number; supplier?: string }[], deliveryNoteRef?: string, defaultSupplier?: string) => Promise<ReceivedDocument | void> | ReceivedDocument | void;
  onSaveAdjustment?: (adjData: {
    itemId: string;
    physicalQty: number;
    reasonCode: AdjustmentReasonCode;
    reasonLabel: string;
    countRef: string;
    notes: string;
    requestId?: string;
  }) => Promise<{ success: boolean; allAdjusted?: boolean; voucherNumber?: string; error?: string } | void> | void;
  onExecuteIssue: (dept: Department, cart: IssueCartItem[]) => Promise<IssuedDocument> | IssuedDocument;
  onAddNewStockItem: (item: StockItem) => void;
  onUpdateStockItemName: (itemId: string, newName: string) => void;
  onUpdateStockItem?: (updatedItem: StockItem) => void;
  onDeleteStockItem?: (itemId: string) => void;
  onAddDepartment: (dept: Department) => void;
  onUpdateDepartment: (dept: Department) => void;
  onDeleteDepartment: (deptId: string) => void;
  managers?: Manager[];
  onAddManager?: (mgr: Manager) => void;
  onUpdateManager?: (mgr: Manager) => void;
  onDeleteManager?: (mgrId: string) => void;
  onAddAdmin?: (admin: AdminUser) => void;
  onUpdateAdmin?: (admin: AdminUser) => void;
  onDeleteAdmin?: (issuerId: string) => void;
  backups?: BackupSnapshot[];
  backupPolicy?: BackupProtocolPolicy;
  onCreateBackup?: (type: BackupType, description: string) => BackupSnapshot | Promise<BackupSnapshot>;
  onRestoreBackup?: (snapshot: BackupSnapshot) => void;
  onImportBackup?: (importedData: any) => boolean | Promise<boolean>;
  onDeleteBackup?: (snapId: string) => void;
  onPruneBackups?: (retentionDays?: number) => void;
  externalAction?: {
    type: 'NAVIGATE_SHEET' | 'OPEN_TAB' | 'OPEN_MODAL' | 'NAVIGATE_APP_TAB';
    sheet?: 'Master_Stock' | 'Movement_Log' | 'Adjustment_Hub' | 'Admin_Config';
    tab?: ProcurementTabType;
    modal?: string;
  } | null;
  onClearExternalAction?: () => void;
  onActiveSheetChange?: (sheet: 'Master_Stock' | 'Movement_Log' | 'Adjustment_Hub' | 'Admin_Config') => void;
  onOpenLogin?: () => void;
}

export const ExcelSimulator: React.FC<ExcelSimulatorProps> = ({
  masterFolderPath = 'C:\\Stationery & Cleaning',
  onUpdateMasterFolderPath = () => {},
  stockItems = [],
  movementLogs = [],
  admins = [],
  departments = [],
  issuedDocs = [],
  receivedDocs = [],
  adjustmentDocs = [],
  currentUser,
  setCurrentUser,
  onOpenLogin,
  adjustmentRequests = [],
  activeTimedWindow = null,
  onCreateAdjustmentRequest = (_req: any) => ({} as any),
  onApproveAndExecuteRequest = (_reqId: string, _notes: string) => {},
  onGrantTimedAccess = (_reqId: string, _mins: number, _notes: string) => {},
  onRevokeTimedAccess = (_reqId: string) => {},
  onRejectRequest = (_reqId: string, _notes: string) => {},
  onSaveDelivery,
  onSaveBulkDeliveries,
  onSaveAdjustment,
  onExecuteIssue,
  onAddNewStockItem,
  onUpdateStockItemName,
  onUpdateStockItem,
  onDeleteStockItem,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  managers = [],
  onAddManager,
  onUpdateManager,
  onDeleteManager,
  onAddAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  backups = [],
  backupPolicy = {
    scheduleFrequency: 'Hourly Differential + Mon-Fri 16:30 COB + Automatic On-Transaction',
    retentionDays: 30,
    autoBackupOnTransaction: true,
    hourlyDifferential: true,
    dailyFullBackupTime: 'Mon - Fri at 16:30 (Close of Business Full Master Backup)',
    offsiteMirrorProtocol: 'Daily Synchronized Encrypted Archive (NAS / Cloud Mirror)',
    rpoMinutes: 0,
    rtoMinutes: 3,
    backupDirectory: 'C:\\Stationery & Cleaning\\Backups\\',
    encryptionMode: 'AES-256 Workbook Archive Packaging',
  },
  onCreateBackup = () => ({} as any),
  onRestoreBackup = () => {},
  onImportBackup = () => false,
  onDeleteBackup,
  onPruneBackups,
  externalAction,
  onClearExternalAction,
  onActiveSheetChange,
}) => {
  const safeStockItems = Array.isArray(stockItems) ? stockItems : [];
  const safeMovementLogs = Array.isArray(movementLogs) ? movementLogs : [];
  const safeAdmins = Array.isArray(admins) ? admins : [];
  const safeDepartments = Array.isArray(departments) ? departments : [];
  const safeManagers = Array.isArray(managers) ? managers : [];
  const safeBackups = Array.isArray(backups) ? backups : [];
  const safeAdjustmentRequests = Array.isArray(adjustmentRequests) ? adjustmentRequests : [];
  const safeIssuedDocs = Array.isArray(issuedDocs) ? issuedDocs : [];
  const safeReceivedDocs = Array.isArray(receivedDocs) ? receivedDocs : [];
  const safeAdjustmentDocs = Array.isArray(adjustmentDocs) ? adjustmentDocs : [];
  const { showToast } = useToast();
  const addToast = ({ title, message, type }: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info' }) => {
    showToast(title, type, message);
  };

  // Write-guard: intercepts write actions while logged out and opens login modal
  const openLoginFn = onOpenLogin ?? (() => setActiveModal('login'));
  const { guardWrite } = useWriteGuard(currentUser, openLoginFn);
  const pendingReplenishmentItemIds = Array.from(
    new Set(
      safeAdjustmentRequests
        .filter((r) => r.status === 'PENDING')
        .flatMap((r) => (Array.isArray(r.items) ? r.items.map((item) => item.ItemID) : []))
    )
  );
  const [activeSheet, setActiveSheet] = useState<'Master_Stock' | 'Movement_Log' | 'Adjustment_Hub' | 'Admin_Config'>('Master_Stock');
  const [activeModal, setActiveModal] = useState<
    | 'none'
    | 'login'
    | 'navigation'
    | 'procurement'
    | 'preview'
    | 'docPreview'
    | 'receivedDocPreview'
    | 'issuedArchive'
    | 'userManagement'
    | 'backupRecovery'
    | 'adjustmentRequests'
    | 'superiorAdjustmentManager'
    | 'reorderReport'
  >('none');
  const [procurementInitialTab, setProcurementInitialTab] = useState<ProcurementTabType>('departments');
  const [procurementInitialItemId, setProcurementInitialItemId] = useState<string | undefined>(undefined);
  const [procurementInitialItemIds, setProcurementInitialItemIds] = useState<string[] | undefined>(undefined);
  const [procurementInitialDeliveryMode, setProcurementInitialDeliveryMode] = useState<'single' | 'bulkQueue' | 'bulkGrid' | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Stationery' | 'Cleaning' | 'General'>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<import('../../utils/searchEngine').StockStatusFilter>('All');
  const [skuRangeFrom, setSkuRangeFrom] = useState('');
  const [skuRangeTo, setSkuRangeTo] = useState('');

  // Master Folder & Movement Log Document Viewer State
  const [showFolderConfigModal, setShowFolderConfigModal] = useState(false);
  const [selectedMovementDoc, setSelectedMovementDoc] = useState<DisplayableDocument | null>(null);
  const [movementSearchQuery, setMovementSearchQuery] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'ALL' | 'DELIVERY' | 'ISSUE' | 'ADJUSTMENT'>('ALL');
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  // Right-Click Context Menu State for Stock Items
  const [contextMenuItem, setContextMenuItem] = useState<StockItem | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [activeReceivingList, setActiveReceivingList] = useState<{ ItemID: string; ItemName: string }[]>([]);
  const [activeAdjustmentList, setActiveAdjustmentList] = useState<{ ItemID: string; ItemName: string }[]>([]);

  // Expandable Master Stock Rows State
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  const handleToggleExpandRow = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getLastSupplierForItem = (item: StockItem): string => {
    if (item.LastSupplier && item.LastSupplier.trim()) return item.LastSupplier;
    const docWithItem = safeReceivedDocs.find((d) => d.items?.some((i) => i.ItemID === item.ItemID));
    if (docWithItem?.supplier && docWithItem.supplier.trim()) return docWithItem.supplier;
    const matchedItem = docWithItem?.items?.find((i) => i.ItemID === item.ItemID);
    if (matchedItem?.Supplier && matchedItem.Supplier.trim()) return matchedItem.Supplier;
    if (item.Category === 'Stationery') return 'Paramount Paper & Stationery Co.';
    if (item.Category === 'Cleaning') return 'Hygiene Supplies Direct Ltd';
    return 'Prime Commercial Merchants';
  };

  const getLastReceivedDateForItem = (item: StockItem): string => {
    if (item.LastReceivedDate && item.LastReceivedDate.trim()) return item.LastReceivedDate;
    const deliveryLog = safeMovementLogs
      .filter((l) => l.ItemID === item.ItemID && l.Type === 'DELIVERY')
      .sort((a, b) => (b.Timestamp > a.Timestamp ? 1 : -1))[0];
    if (deliveryLog?.Timestamp) return deliveryLog.Timestamp;
    const doc = safeReceivedDocs.find((d) => d.items?.some((i) => i.ItemID === item.ItemID));
    if (doc?.timestamp) return doc.timestamp;
    return 'Initial Stock Setup';
  };

  const getItemHistoryLogs = (itemId: string): MovementLogEntry[] => {
    return safeMovementLogs
      .filter((l) => l.ItemID === itemId)
      .sort((a, b) => (b.Timestamp > a.Timestamp ? 1 : -1));
  };

  const handleRowContextMenu = (e: React.MouseEvent, item: StockItem) => {
    e.preventDefault();
    if (!selectedStockItemIds.includes(item.ItemID)) {
      setSelectedStockItemIds([item.ItemID]);
    }
    setContextMenuItem(item);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const handleAddToListFromContext = (
    targetProcess: 'receiving' | 'issue' | 'editing' | 'adjustment',
    items: StockItem[]
  ) => {
    if (targetProcess === 'receiving') {
      setActiveReceivingList((prev) => {
        const existingIds = new Set(prev.map((p) => p.ItemID));
        const newOnes = items.filter((i) => !existingIds.has(i.ItemID)).map((i) => ({ ItemID: i.ItemID, ItemName: i.ItemName }));
        return [...prev, ...newOnes];
      });
      setProcurementInitialItemIds((prev) => Array.from(new Set([...prev, ...items.map((i) => i.ItemID)])));
      addToast({
        title: 'Added to Receiving List',
        message: `Added ${items.length} item(s) to the active Receiving Manifest queue.`,
        type: 'success',
      });
    } else if (targetProcess === 'issue') {
      const newCartItems: IssueCartItem[] = items.map((i) => ({
        ItemID: i.ItemID,
        ItemName: i.ItemName,
        Category: i.Category,
        AvailableQty: i.Qty,
        RequestedQty: 1,
      }));
      setTempIssueCart((prev) => {
        const existingIds = new Set(prev.map((c) => c.ItemID));
        const filteredNew = newCartItems.filter((c) => !existingIds.has(c.ItemID));
        return [...prev, ...filteredNew];
      });
      addToast({
        title: 'Added to Issue Requisition Cart',
        message: `Added ${items.length} item(s) to the active Requisition Issue Cart.`,
        type: 'success',
      });
    } else if (targetProcess === 'editing') {
      setSelectedStockItemIds((prev) => Array.from(new Set([...prev, ...items.map((i) => i.ItemID)])));
      addToast({
        title: 'Added to Batch Edit Selection',
        message: `Added ${items.length} item(s) to the current batch editing selection.`,
        type: 'success',
      });
    } else if (targetProcess === 'adjustment') {
      setActiveAdjustmentList((prev) => {
        const existingIds = new Set(prev.map((p) => p.ItemID));
        const newOnes = items.filter((i) => !existingIds.has(i.ItemID)).map((i) => ({ ItemID: i.ItemID, ItemName: i.ItemName }));
        return [...prev, ...newOnes];
      });
      setProcurementInitialItemIds((prev) => Array.from(new Set([...prev, ...items.map((i) => i.ItemID)])));
      addToast({
        title: 'Added to Adjustment Draft',
        message: `Added ${items.length} item(s) to the active physical stock adjustment draft.`,
        type: 'success',
      });
    }
  };

  const handleBulkAdjustmentFromContext = (targetItems: StockItem[]) => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    const itemIds = targetItems.map((i) => i.ItemID);
    setSelectedStockItemIds(itemIds);
    setProcurementInitialTab('adjustment');
    if (targetItems.length > 0) {
      setProcurementInitialItemId(targetItems[0].ItemID);
      setProcurementInitialItemIds(itemIds);
    }
    setActiveModal('procurement');
  };

  const handleBulkStockEditFromContext = (targetItems: StockItem[]) => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    setSelectedStockItemIds(targetItems.map((i) => i.ItemID));
    setShowBatchUpdateModal(true);
  };

  const handleQuickReceiveFromContext = (targetItems: StockItem[], mode: 'single' | 'bulkGrid') => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    setProcurementInitialTab('delivery');
    setProcurementInitialDeliveryMode(mode);
    if (mode === 'bulkGrid') {
      const ids = targetItems.map((i) => i.ItemID);
      setProcurementInitialItemIds(ids);
      setProcurementInitialItemId(ids[0]);
    } else {
      setProcurementInitialItemId(targetItems[0]?.ItemID);
      setProcurementInitialItemIds([targetItems[0]?.ItemID]);
    }
    setActiveModal('procurement');
  };

  const handleQuickIssueFromContext = (targetItems: StockItem[]) => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    setProcurementInitialTab('issue');
    const ids = targetItems.map((i) => i.ItemID);
    setProcurementInitialItemId(ids[0]);
    setProcurementInitialItemIds(ids);
    setActiveModal('procurement');
  };

  const handleQuickEditFromContext = (item: StockItem) => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    setProcurementInitialTab('editStockItem');
    setProcurementInitialItemId(item.ItemID);
    setProcurementInitialItemIds([item.ItemID]);
    setActiveModal('procurement');
  };

  const handleExportItemFromContext = (targetItems: StockItem[]) => {
    if (!targetItems.length) return;
    const headers = ['ItemID', 'ItemName', 'Category', 'Qty', 'Unit', 'ReorderLevel', 'StockStatus'];
    const rows = targetItems.map((item) => {
      const isOos = (item.Qty || 0) <= 0;
      const isLow = (item.Qty || 0) <= (item.ReorderLevel || 10);
      const status = isOos ? 'Out of Stock' : isLow ? 'Low Stock' : 'Optimal Stock';
      return [
        item.ItemID,
        `"${(item.ItemName || '').replace(/"/g, '""')}"`,
        item.Category,
        item.Qty,
        item.Unit,
        item.ReorderLevel,
        status,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename =
      targetItems.length === 1
        ? `Stock_Export_${targetItems[0].ItemID}_${new Date().toISOString().slice(0, 10)}.csv`
        : `Stock_Export_Selected_${targetItems.length}_Items_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Export Completed', 'success', `Exported ${targetItems.length} item(s) to CSV`);
  };

  const handleQuickAdjustFromContext = (item: StockItem) => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    setProcurementInitialTab('adjustment');
    setProcurementInitialItemId(item.ItemID);
    setProcurementInitialItemIds([item.ItemID]);
    setActiveModal('procurement');
    setSelectedStockItemIds([item.ItemID]);
  };

  // Superior Admin check
  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';

  // Listen to external sidebar actions
  React.useEffect(() => {
    if (!externalAction) return;

    if (externalAction.type === 'NAVIGATE_SHEET' && externalAction.sheet) {
      setActiveSheet(externalAction.sheet);
    } else if (externalAction.type === 'OPEN_TAB' && externalAction.tab) {
      setProcurementInitialTab(externalAction.tab);
      setActiveModal('procurement');
    } else if (externalAction.type === 'OPEN_MODAL' && externalAction.modal) {
      if (externalAction.modal === 'folderConfig') {
        setShowFolderConfigModal(true);
      } else if (externalAction.modal === 'issuedArchive') {
        setActiveModal('issuedArchive');
      } else {
        setActiveModal(externalAction.modal as any);
      }
    }

    if (onClearExternalAction) {
      onClearExternalAction();
    }
  }, [externalAction, onClearExternalAction]);

  // Guard Admin_Config & Adjustment_Hub sheets: Rachel Pickard (ADM001) ONLY
  React.useEffect(() => {
    if ((activeSheet === 'Admin_Config' || activeSheet === 'Adjustment_Hub') && !isSuperiorAdmin) {
      setActiveSheet('Master_Stock');
    }
  }, [currentUser, isSuperiorAdmin, activeSheet]);

  // Sync active sheet changes with parent application
  React.useEffect(() => {
    onActiveSheetChange?.(activeSheet);
  }, [activeSheet, onActiveSheetChange]);

  const handleSheetTabClick = (sheet: 'Master_Stock' | 'Movement_Log' | 'Adjustment_Hub' | 'Admin_Config') => {
    if ((sheet === 'Admin_Config' || sheet === 'Adjustment_Hub') && !isSuperiorAdmin) {
      if (!currentUser) {
        if (onOpenLogin) onOpenLogin();
        else setActiveModal('login');
        return;
      }
      alert("Access Restricted: Only Rachel Pickard (Procurement Manager / Superior Admin) can access this workspace. Standard staff accounts must use the 'Request Adjustment' form to submit stock discrepancy lists.");
      return;
    }
    setActiveSheet(sheet);
  };

  // Determine available sheet tabs (Adjustment_Hub and Admin_Config are available when Rachel Pickard ADM001 is logged in)
  const availableSheets: ('Master_Stock' | 'Movement_Log' | 'Adjustment_Hub' | 'Admin_Config')[] = 
    isSuperiorAdmin
      ? ['Master_Stock', 'Movement_Log', 'Adjustment_Hub', 'Admin_Config']
      : ['Master_Stock', 'Movement_Log'];

  // Issue flow temporary state
  const [tempIssueDept, setTempIssueDept] = useState<Department | null>(null);
  const [tempIssueCart, setTempIssueCart] = useState<IssueCartItem[]>([]);
  const [activeDocForPreview, setActiveDocForPreview] = useState<IssuedDocument | null>(null);
  const [activeReceivedDocForPreview, setActiveReceivedDocForPreview] = useState<ReceivedDocument | null>(null);

  // Global Simulator Keyboard Shortcuts
  useKeyboardShortcuts({
    onSearchFocus: () => {
      const searchInput = document.getElementById('stock-inventory-search-input');
      if (searchInput) {
        searchInput.focus();
        (searchInput as HTMLInputElement).select();
      }
    },
    onNewStockItem: () => {
      handleOpenProcurementTab('createStock');
    },
    onIssueRequest: () => {
      handleOpenProcurementTab('issue');
    },
    onReceiveDelivery: () => {
      handleOpenProcurementTab('delivery');
    },
    onBackupManager: () => {
      handleOpenBackupRecovery();
    },
    onUserLogin: () => {
      handleOpenLogin();
    },
    onDepartmentManager: () => {
      handleOpenProcurementTab('departments');
    },
    onSuperiorManager: () => {
      if (!currentUser) {
        setActiveModal('login');
      } else {
        setActiveModal('superiorAdjustmentManager');
      }
    },
    onEscape: () => {
      setActiveModal(null);
      setShowBatchUpdateModal(false);
      setShowBulkDeleteModal(false);
      setShowBulkDeliveryConfirmModal(false);
      setShowFolderConfigModal(false);
      setSelectedStockItemIds([]);
    },
  });

  const handleOpenLogin = () => {
    if (onOpenLogin) onOpenLogin();
    else setActiveModal('login');
  };

  const handleOpenNavigation = () => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
    } else {
      setActiveModal('navigation');
    }
  };

  const handleOpenProcurementTab = (tab: ProcurementTabType) => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
    } else {
      setProcurementInitialTab(tab);
      setActiveModal('procurement');
    }
  };

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    setActiveSheet('Master_Stock');
    setActiveModal('navigation');
  };

  const handleSelectNavOption = (option: ProcurementTabType) => {
    setProcurementInitialTab(option);
    setActiveModal('procurement');
  };

  const handleTriggerIssuePreview = (dept: Department, cart: IssueCartItem[]) => {
    setTempIssueDept(dept);
    setTempIssueCart(cart);
    setActiveModal('preview');
  };

  const handleConfirmExecuteIssue = async (finalCart?: IssueCartItem[]) => {
    const cartToExecute = finalCart && finalCart.length > 0 ? finalCart : tempIssueCart;
    if (tempIssueDept && cartToExecute.length > 0) {
      let generatedDoc: IssuedDocument | undefined = undefined;
      try {
        generatedDoc = await onExecuteIssue(tempIssueDept, cartToExecute);
      } catch (err) {
        console.error('Error executing issue workflow:', err);
      }

      if (!generatedDoc) {
        const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        const timestampFile = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
        const pdfFileName = `IssueSlip_${tempIssueDept.DeptID.replace('-', '')}_${timestampFile}.pdf`;
        generatedDoc = {
          docType: 'ISSUE',
          slipNumber: `ISN-${Math.floor(100000 + Math.random() * 900000)}`,
          deptID: tempIssueDept.DeptID,
          deptName: tempIssueDept.DeptName,
          deptHeadName: (tempIssueDept as any).ManagerName || (tempIssueDept as any).DeptHeadName || 'Manager',
          deptHeadEmail: (tempIssueDept as any).DeptHeadEmail || '',
          timestamp: nowStr,
          issuerID: currentUser ? currentUser.IssuerID : 'ADM001',
          issuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
          items: cartToExecute.map((item) => ({
            ItemID: item.ItemID,
            ItemName: item.ItemName,
            Category: item.Category,
            Qty: item.Qty,
          })),
          pdfFileName,
          folderPath: `${masterFolderPath}\\Issued_Items\\`,
          fullSavedPath: `${masterFolderPath}\\Issued_Items\\${pdfFileName}`,
        };
      }

      setActiveDocForPreview(generatedDoc);
      setActiveModal('docPreview');
    }
  };

  // Stock Adjustment Handler with Auto-Close & Visual Toast on Batch Completion
  const handleSaveAdjustmentWithAutoClose = async (adjData: {
    itemId: string;
    physicalQty: number;
    reasonCode: AdjustmentReasonCode;
    reasonLabel: string;
    countRef: string;
    notes: string;
    requestId?: string;
  }) => {
    if (!onSaveAdjustment) return;
    try {
      const result = await onSaveAdjustment(adjData);
      if (result && typeof result === 'object') {
        if (!result.success && result.error) {
          showToast('Stock Adjustment Rejected', 'error', result.error, 6000);
          return result;
        }

        if (result.allAdjusted) {
          // Immediately close the adjustment modal or pane after the final adjustment is saved
          setActiveModal('none');

          // Visual 'Success' toast confirmation confirming the auto-close action
          showToast(
            'Adjustment Batch Completed & Closed',
            'success',
            `All requested discrepancies for Request [${adjData.requestId || 'SAR'}] have been successfully saved and reconciled on Master_Stock. The adjustment session has automatically closed.`,
            5000
          );
        }
      }
      return result;
    } catch (err: any) {
      console.error('[ExcelSimulator] Stock adjustment error:', err);
      showToast('Adjustment Failed', 'error', err?.message || 'Unable to save stock adjustment', 5000);
    }
  };

  // Folder Access Control Handler: Superior Admin Only
  const handleOpenFolderConfig = () => {
    if (!isSuperiorAdmin) {
      setSecurityAlert("Folder Access Restricted: Underlying file repository and folder paths can only be configured by the Superior Admin (Rachel Pickard / ADM001). Users can view and reprint generated documents by clicking on any row in the Movement Log.");
      setTimeout(() => setSecurityAlert(null), 5000);
      return;
    }
    setShowFolderConfigModal(true);
  };

  // Backup & Disaster Recovery Access Control Handler: Superior Admin Only
  const handleOpenBackupRecovery = () => {
    if (!currentUser) {
      setActiveModal('login');
      return;
    }
    if (!isSuperiorAdmin) {
      setSecurityAlert(
        "Access Denied: The Backup & Disaster Recovery Center is restricted strictly to Rachel Pickard (Procurement Manager / Superior Admin - ADM001). Standard staff accounts cannot access backup vault archives or trigger system restorations."
      );
      setTimeout(() => setSecurityAlert(null), 6000);
      return;
    }
    setActiveModal('backupRecovery');
  };

  // Dynamic Multi-token Fuzzy & Substring Indexing Search Engine with Multi-Facet Filtering
  const filteredStock = React.useMemo(() => {
    return searchStockItems(safeStockItems, searchQuery, {
      category: categoryFilter,
      stockStatus: stockStatusFilter,
      skuRangeFrom: skuRangeFrom.trim() || undefined,
      skuRangeTo: skuRangeTo.trim() || undefined,
    });
  }, [safeStockItems, searchQuery, categoryFilter, stockStatusFilter, skuRangeFrom, skuRangeTo]);

  // Real-time calculation of all items at or below safety threshold (Reorder Level)
  const belowSafetyThresholdCount = React.useMemo(() => {
    return safeStockItems.filter((i) => (Number(i.Qty) || 0) <= (Number(i.ReorderLevel) || 10)).length;
  }, [safeStockItems]);

  // Multi-Select & Bulk Operations State
  const [selectedStockItemIds, setSelectedStockItemIds] = useState<string[]>([]);
  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkDeliveryConfirmModal, setShowBulkDeliveryConfirmModal] = useState(false);
  const [bulkDeliveryReviewItems, setBulkDeliveryReviewItems] = useState<BulkDeliveryReviewItem[]>([]);

  // Selection Helper Calculations
  const selectedStockItems = safeStockItems.filter((i) => selectedStockItemIds.includes(i.ItemID));
  const isAllVisibleSelected =
    filteredStock.length > 0 &&
    filteredStock.every((item) => selectedStockItemIds.includes(item.ItemID));
  const isPartiallySelected =
    selectedStockItemIds.length > 0 && !isAllVisibleSelected;

  const handleToggleSelectRow = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedStockItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleIds = new Set(filteredStock.map((i) => i.ItemID));
      setSelectedStockItemIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = filteredStock.map((i) => i.ItemID);
      setSelectedStockItemIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectByStatus = (status: 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK') => {
    if (status === 'OUT_OF_STOCK') {
      const oosIds = safeStockItems.filter((i) => (i.Qty || 0) <= 0).map((i) => i.ItemID);
      setSelectedStockItemIds(oosIds);
    } else if (status === 'LOW_STOCK') {
      const lowIds = safeStockItems
        .filter((i) => (i.Qty || 0) > 0 && (i.Qty || 0) <= (i.ReorderLevel || 10))
        .map((i) => i.ItemID);
      setSelectedStockItemIds(lowIds);
    } else {
      setSelectedStockItemIds(safeStockItems.map((i) => i.ItemID));
    }
  };

  const handleClearSelection = () => {
    setSelectedStockItemIds([]);
  };

  // Bulk Action Execution Handlers
  const handleTriggerBulkRestock = (items: StockItem[]) => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    if (items.length === 0) return;
    const deliveryItems: BulkDeliveryReviewItem[] = items.map((i) => ({
      itemId: i.ItemID,
      itemName: i.ItemName,
      category: i.Category,
      currentQty: i.Qty,
      addQty: i.Qty <= i.ReorderLevel ? Math.max(10, (i.ReorderLevel * 2) - i.Qty) : 10,
      unit: i.Unit,
    }));
    setBulkDeliveryReviewItems(deliveryItems);
    setShowBulkDeliveryConfirmModal(true);
  };

  const handleConfirmBulkDeliveryModal = async (
    deliveryNoteRef?: string,
    updatedDeliveries?: BulkDeliveryReviewItem[],
    batchSupplier?: string
  ) => {
    const deliveriesToSave = updatedDeliveries || bulkDeliveryReviewItems;
    let resDoc: ReceivedDocument | undefined = undefined;
    if (onSaveBulkDeliveries) {
      try {
        const bulkDoc = await onSaveBulkDeliveries(
          deliveriesToSave.map((d) => ({ itemId: d.itemId, addQty: d.addQty, supplier: d.supplier || batchSupplier })),
          deliveryNoteRef,
          batchSupplier
        );
        if (bulkDoc) {
          resDoc = bulkDoc;
        }
      } catch (err) {
        console.error('Error in bulk delivery save:', err);
      }
    } else if (onSaveDelivery) {
      for (const d of deliveriesToSave) {
        try {
          const doc = await onSaveDelivery(d.itemId, d.addQty, deliveryNoteRef, d.supplier || batchSupplier);
          if (doc) resDoc = doc;
        } catch (err) {
          console.error('Error in delivery save:', err);
        }
      }
    }

    if (!resDoc && deliveriesToSave.length > 0) {
      const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      const timestampFile = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
      const voucherNumber = deliveryNoteRef || `GRN-${Math.floor(100000 + Math.random() * 900000)}`;
      const pdfFileName = `GRN_Voucher_${voucherNumber}_${timestampFile}.pdf`;
      resDoc = {
        docType: 'DELIVERY',
        voucherNumber,
        timestamp: nowStr,
        deliveryRef: voucherNumber,
        issuerID: currentUser ? currentUser.IssuerID : 'ADM001',
        issuerName: currentUser ? currentUser.IssuerName : 'Rachel Pickard',
        issuerRole: currentUser ? currentUser.Role : 'Procurement Manager',
        items: deliveriesToSave.map((d) => ({
          ItemID: d.itemId,
          ItemName: d.itemName,
          Category: d.category,
          Qty: d.addQty,
          Unit: d.unit,
        })),
        pdfFileName,
        folderPath: `${masterFolderPath}\\Received_Items\\`,
        fullSavedPath: `${masterFolderPath}\\Received_Items\\${pdfFileName}`,
      };
    }

    if (resDoc) {
      setActiveReceivedDocForPreview(resDoc);
      setActiveModal('receivedDocPreview');
    }
    setShowBulkDeliveryConfirmModal(false);
    handleClearSelection();
  };

  const handleTriggerBulkIssue = (items: StockItem[]) => {
    if (items.length === 0) return;
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    const defaultDept = departments[0] || {
      DeptID: 'DEP01',
      DeptName: 'Administration',
      DeptHeadName: 'Sarah Jenkins',
      DeptHeadEmail: 's.jenkins@company.local',
    };
    const cartItems: IssueCartItem[] = items
      .filter((i) => i.Qty > 0)
      .map((i) => ({
        ItemID: i.ItemID,
        ItemName: i.ItemName,
        Category: i.Category,
        AvailableQty: i.Qty,
        RequestedQty: 1,
      }));

    if (cartItems.length === 0) {
      alert('All selected items currently have 0 available quantity in stock. Please restock items before issuing.');
      return;
    }
    setTempIssueDept(defaultDept);
    setTempIssueCart(cartItems);
    setProcurementInitialTab('issue');
    setActiveModal('procurement');
  };

  const handleTriggerBulkAdjustment = (_items: StockItem[]) => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    setActiveModal('adjustmentRequests');
  };

  const handleApplyBatchUpdate = (updates: {
    category?: 'Stationery' | 'Cleaning' | 'General';
    reorderLevel?: number;
    reorderLevelDelta?: number;
  }) => {
    selectedStockItems.forEach((item) => {
      const updated = { ...item };
      if (updates.category) updated.Category = updates.category;
      if (updates.reorderLevel !== undefined) updated.ReorderLevel = updates.reorderLevel;
      if (updates.reorderLevelDelta !== undefined) {
        updated.ReorderLevel = Math.max(0, (updated.ReorderLevel || 10) + updates.reorderLevelDelta);
      }
      if (onUpdateStockItem) {
        onUpdateStockItem(updated);
      }
    });
    handleClearSelection();
  };

  const handleExportSelectedCsv = () => {
    if (selectedStockItems.length === 0) return;
    const headers = ['ItemID', 'ItemName', 'Category', 'AvailableQty', 'Unit', 'ReorderLevel', 'StockStatus'];
    const rows = selectedStockItems.map((i) => {
      const status =
        (i.Qty || 0) <= 0
          ? 'Out of Stock'
          : (i.Qty || 0) <= (i.ReorderLevel || 10)
          ? 'Low Stock'
          : 'Optimal';
      return [
        `"${i.ItemID}"`,
        `"${i.ItemName.replace(/"/g, '""')}"`,
        `"${i.Category}"`,
        i.Qty,
        `"${i.Unit}"`,
        i.ReorderLevel,
        `"${status}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Stock_Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySelectedClipboard = () => {
    if (selectedStockItems.length === 0) return;
    const header = 'ItemID\tItemName\tCategory\tAvailableQty\tUnit\tReorderLevel\tStockStatus';
    const lines = selectedStockItems.map((i) => {
      const status =
        (i.Qty || 0) <= 0
          ? 'Out of Stock'
          : (i.Qty || 0) <= (i.ReorderLevel || 10)
          ? 'Low Stock'
          : 'Optimal';
      return `${i.ItemID}\t${i.ItemName}\t${i.Category}\t${i.Qty}\t${i.Unit}\t${i.ReorderLevel}\t${status}`;
    });
    const text = [header, ...lines].join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleBulkDelete = () => {
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal('login');
      return;
    }
    if (!isSuperiorAdmin) {
      alert('Access Denied: Only Administrator Rachel Pickard (ADM001) can permanently delete stock items.');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = () => {
    if (onDeleteStockItem) {
      selectedStockItems.forEach((i) => onDeleteStockItem(i.ItemID));
    }
    handleClearSelection();
  };

  const handleMovementLogRowClick = (log: MovementLogEntry) => {
    if (log.Type === 'DELIVERY') {
      const matched = receivedDocs.find(
        (d) =>
          d.voucherNumber === log.DocumentRef ||
          (log.IssueSlipFileName && d.fullSavedPath === log.IssueSlipFileName)
      );

      const relatedLogs = movementLogs.filter(
        (m) =>
          m.Type === 'DELIVERY' &&
          ((log.DocumentRef && m.DocumentRef === log.DocumentRef) ||
            (log.IssueSlipFileName && m.IssueSlipFileName === log.IssueSlipFileName) ||
            (m.Timestamp === log.Timestamp && m.IssuerID === log.IssuerID))
      );

      const itemsList =
        matched?.items ||
        (relatedLogs.length > 0
          ? relatedLogs.map((rl) => ({
              ItemID: rl.ItemID,
              ItemName: rl.ItemName,
              Category: stockItems.find((s) => s.ItemID === rl.ItemID)?.Category || 'Stationery',
              Qty: rl.Qty,
              Unit: stockItems.find((s) => s.ItemID === rl.ItemID)?.Unit || 'Units',
            }))
          : [
              {
                ItemID: log.ItemID,
                ItemName: log.ItemName,
                Category: stockItems.find((s) => s.ItemID === log.ItemID)?.Category || 'Stationery',
                Qty: log.Qty,
                Unit: stockItems.find((s) => s.ItemID === log.ItemID)?.Unit || 'Units',
              },
            ]);

      const docData: ReceivedDocument = matched || {
        docType: 'DELIVERY',
        voucherNumber: log.DocumentRef || `GRN-${log.id.substring(4, 12)}`,
        timestamp: log.Timestamp,
        deliveryRef: log.DocumentRef || 'GRN-Delivery-Voucher',
        issuerID: log.IssuerID,
        issuerName: log.IssuerName || admins.find((a) => a.IssuerID === log.IssuerID)?.IssuerName || 'Rachel Pickard',
        issuerRole: admins.find((a) => a.IssuerID === log.IssuerID)?.Role || 'Procurement Manager',
        items: itemsList,
        pdfFileName: `GRN_Voucher_${log.id}.pdf`,
        folderPath: `${masterFolderPath}\\Received_Items\\`,
        fullSavedPath: log.IssueSlipFileName || `${masterFolderPath}\\Received_Items\\GRN_Voucher_${log.id}.pdf`,
      };

      setSelectedMovementDoc({ type: 'DELIVERY', data: docData });
    } else if (log.Type === 'ADJUSTMENT') {
      const matched = adjustmentDocs.find(
        (d) =>
          d.voucherNumber === log.DocumentRef ||
          (log.IssueSlipFileName && d.fullSavedPath === log.IssueSlipFileName)
      );

      const itemObj = stockItems.find((s) => s.ItemID === log.ItemID);
      const docData: AdjustmentDocument = matched || {
        docType: 'ADJUSTMENT',
        voucherNumber: log.DocumentRef || `ADJ-${log.id.substring(4, 10)}`,
        timestamp: log.Timestamp,
        countRef: log.CountRef || 'PHYSICAL-AUDIT',
        reasonCode: (log.DiscrepancyReason?.includes('DAMAGED')
          ? 'DAMAGED_STOCK'
          : log.DiscrepancyReason?.includes('EXPIRED')
          ? 'EXPIRED_OBSOLETE'
          : log.DiscrepancyReason?.includes('FOUND')
          ? 'FOUND_STOCK'
          : log.DiscrepancyReason?.includes('AUDIT')
          ? 'AUDIT_CORRECTION'
          : 'COUNT_DISCREPANCY') as AdjustmentReasonCode,
        reasonLabel: log.DiscrepancyReason || 'Physical Count Discrepancy',
        notes: log.DiscrepancyNotes || 'Reconciled physical stock count with Master_Stock records.',
        issuerID: log.IssuerID,
        issuerName: log.IssuerName || admins.find((a) => a.IssuerID === log.IssuerID)?.IssuerName || 'Rachel Pickard',
        issuerRole: admins.find((a) => a.IssuerID === log.IssuerID)?.Role || 'Procurement Manager',
        items: [
          {
            ItemID: log.ItemID,
            ItemName: log.ItemName,
            Category: itemObj?.Category || 'Stationery',
            SystemQty: (itemObj?.Qty || 0) - log.Qty,
            PhysicalQty: itemObj?.Qty || 0,
            VarianceQty: log.Qty,
            Unit: itemObj?.Unit || 'Units',
          },
        ],
        pdfFileName: `Stock_Adjustment_${log.DocumentRef || log.id}.pdf`,
        folderPath: `${masterFolderPath}\\Adjustments\\`,
        fullSavedPath: log.IssueSlipFileName || `${masterFolderPath}\\Adjustments\\Stock_Adjustment_${log.DocumentRef || log.id}.pdf`,
      };

      setSelectedMovementDoc({ type: 'ADJUSTMENT', data: docData });
    } else {
      const safeIssuedDocs = Array.isArray(issuedDocs) ? issuedDocs : [];
      const matched = safeIssuedDocs.find(
        (d) =>
          d &&
          (d.slipNumber === log.DocumentRef ||
            (log.IssueSlipFileName && d.fullSavedPath === log.IssueSlipFileName) ||
            (log.IssueSlipFileName && d.pdfFileName && log.IssueSlipFileName.includes(d.pdfFileName)))
      );

      const relatedLogs = movementLogs.filter(
        (m) =>
          m.Type === 'ISSUE' &&
          ((log.DocumentRef && m.DocumentRef === log.DocumentRef) ||
            (log.IssueSlipFileName && m.IssueSlipFileName === log.IssueSlipFileName) ||
            (m.Timestamp === log.Timestamp && m.DeptID === log.DeptID))
      );

      const itemsList =
        matched?.items ||
        (relatedLogs.length > 0
          ? relatedLogs.map((rl) => ({
              ItemID: rl.ItemID,
              ItemName: rl.ItemName,
              Category: stockItems.find((s) => s.ItemID === rl.ItemID)?.Category || 'Stationery',
              Qty: rl.Qty,
            }))
          : [
              {
                ItemID: log.ItemID,
                ItemName: log.ItemName,
                Category: stockItems.find((s) => s.ItemID === log.ItemID)?.Category || 'Stationery',
                Qty: log.Qty,
              },
            ]);

      const docData: IssuedDocument = matched || {
        docType: 'ISSUE',
        slipNumber: log.DocumentRef || `SLIP-${log.id.substring(4, 8)}`,
        timestamp: log.Timestamp,
        deptID: log.DeptID,
        deptName: log.DeptName,
        deptHeadName: log.DeptHead,
        deptHeadEmail: log.DeptEmail,
        issuerID: log.IssuerID,
        issuerName: log.IssuerName || admins.find((a) => a.IssuerID === log.IssuerID)?.IssuerName || 'Sarah Jenkins',
        items: itemsList,
        pdfFileName: `IssueSlip_${log.DeptID.replace('-', '')}_${log.id}.pdf`,
        folderPath: `${masterFolderPath}\\Issued_Items\\`,
        fullSavedPath: log.IssueSlipFileName || `${masterFolderPath}\\Issued_Items\\IssueSlip_${log.DeptID.replace('-', '')}_${log.id}.pdf`,
      };

      setSelectedMovementDoc({ type: 'ISSUE', data: docData });
    }
  };

  const filteredMovementLogs = safeMovementLogs.filter((log) => {
    if (!log) return false;
    const matchesType =
      movementTypeFilter === 'ALL' || log.Type === movementTypeFilter;
    const query = movementSearchQuery.toLowerCase();
    const matchesQuery =
      !query ||
      (log.ItemName && log.ItemName.toLowerCase().includes(query)) ||
      (log.ItemID && log.ItemID.toLowerCase().includes(query)) ||
      (log.DeptName && log.DeptName.toLowerCase().includes(query)) ||
      (log.DeptID && log.DeptID.toLowerCase().includes(query)) ||
      (log.IssuerID && log.IssuerID.toLowerCase().includes(query)) ||
      (log.DocumentRef && log.DocumentRef.toLowerCase().includes(query)) ||
      (log.DiscrepancyReason && log.DiscrepancyReason.toLowerCase().includes(query));
    return matchesType && matchesQuery;
  });

  // Count pending stock adjustment requests
  const pendingRequestsCount = safeAdjustmentRequests.filter((r) => r?.status === 'PENDING').length;

  return (
    <div className={activeSheet === 'Master_Stock' ? 'w-full' : 'space-y-4'}>
      {/* Security Toast / Alert Banner */}
      {securityAlert && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-xl flex items-start space-x-3 text-xs shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <LockKeyhole className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-amber-800 dark:text-amber-300">Access Restricted by Security Policy</div>
            <div>{securityAlert}</div>
          </div>
        </div>
      )}

      {/* 1. DIRECT MASTER STOCK WORKSPACE VIEW (TAKES UP 96% OF HEIGHT FROM TOP TO BOTTOM, NO DEAD BOTTOM BAR) */}
      {activeSheet === 'Master_Stock' ? (
        <div className="w-full flex flex-col font-sans space-y-2 pb-0 min-h-0">
          {/* Search & Multi-Facet Filter Container */}
          <div className="shrink-0 bg-[#f8fafc] dark:bg-slate-950 pt-0.5 pb-2 -mx-1 px-1 border-b border-slate-300 dark:border-slate-800 transition-colors shadow-2xs">
            <StockSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              stockStatusFilter={stockStatusFilter}
              onStockStatusChange={setStockStatusFilter}
              skuRangeFrom={skuRangeFrom}
              onSkuRangeFromChange={setSkuRangeFrom}
              skuRangeTo={skuRangeTo}
              onSkuRangeToChange={setSkuRangeTo}
              onResetAllFilters={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setStockStatusFilter('All');
                setSkuRangeFrom('');
                setSkuRangeTo('');
              }}
              totalCount={stockItems.length}
              filteredCount={filteredStock.length}
              belowThresholdCount={belowSafetyThresholdCount}
              onNewStockItem={() => guardWrite(() => handleOpenProcurementTab('createStock'))}
              isReadOnly={!currentUser}
            />
          </div>

          {/* Bulk Operations Toolbar & Selection Actions Menu */}
          {selectedStockItemIds.length > 0 && (
            <div className="shrink-0">
              <BulkStockActionsBar
                selectedCount={selectedStockItemIds.length}
                totalFilteredCount={filteredStock.length}
                totalStockCount={stockItems.length}
                isAllSelected={isAllVisibleSelected}
                isPartiallySelected={isPartiallySelected}
                selectedItems={selectedStockItems}
                onToggleSelectAll={handleToggleSelectAllVisible}
                onSelectByStatus={handleSelectByStatus}
                onClearSelection={handleClearSelection}
                onBulkRestock={handleTriggerBulkRestock}
                onBulkIssue={handleTriggerBulkIssue}
                onBulkAdjustment={handleTriggerBulkAdjustment}
                onOpenBatchUpdateModal={() => setShowBatchUpdateModal(true)}
                onExportSelectedCsv={handleExportSelectedCsv}
                onCopySelectedClipboard={handleCopySelectedClipboard}
                onBulkDelete={onDeleteStockItem ? handleBulkDelete : undefined}
                isSuperiorAdmin={isSuperiorAdmin}
              />
            </div>
          )}

          {/* Read-Only Mode Indicator Banner for Unauthenticated Guest Session */}
          {!currentUser && (
            <div
              id="master-stock-readonly-banner"
              className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 shadow-2xs"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                    <span>Read-Only Mode</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold">Unauthenticated</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/90 truncate">
                    Viewing live stock sheet & executive dashboard as Guest. Log in to create, edit, receive, issue, or adjust stock items.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-stock-sheet-login"
                onClick={() => (onOpenLogin ? onOpenLogin() : setActiveModal('login'))}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0 ml-3 min-h-[34px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In to Edit</span>
              </button>
            </div>
          )}

          {/* Stock Management Inventory Table with Fixed Table Header and Visible High-Contrast Borders (Fills 100% of remaining 96vh space) */}
          <div className="inventory-table-shell flex-1 min-h-0 border-2 border-slate-300 dark:border-slate-700 rounded-2xl overflow-x-auto bg-white dark:bg-slate-900 shadow-sm transition-colors relative">
            <table id="stock-management-table" className="w-full text-[11px] text-left border-collapse font-sans">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] uppercase border-b-2 border-slate-300 dark:border-slate-700 shadow-xs select-none">
                <tr>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 w-10 border-r border-slate-300 dark:border-slate-700 text-center shadow-xs">
                    <input
                      id="stock-table-master-checkbox"
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isPartiallySelected;
                      }}
                      onChange={handleToggleSelectAllVisible}
                      className="w-3.5 h-3.5 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                      title={isAllVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                    />
                  </th>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 border-r border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold shadow-xs">Row</th>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 border-r border-slate-300 dark:border-slate-700 font-bold shadow-xs">ItemID (Col A)</th>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 border-r border-slate-300 dark:border-slate-700 font-bold shadow-xs">ItemName (Col B)</th>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 border-r border-slate-300 dark:border-slate-700 font-bold shadow-xs">Category (Col C)</th>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 border-r border-slate-300 dark:border-slate-700 text-right font-bold shadow-xs">
                    Available Qty (Col D)
                  </th>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 border-r border-slate-300 dark:border-slate-700 text-right font-bold shadow-xs">Reorder Level (Col E)</th>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 text-center font-bold shadow-xs">Stock Status</th>
                  <th className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 p-2 border-l border-slate-300 dark:border-slate-700 text-center font-bold shadow-xs whitespace-nowrap">
                    Actions {!currentUser && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-normal font-sans">(Read-Only)</span>}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex flex-col items-center justify-center space-y-2 text-slate-500 dark:text-slate-400">
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-semibold">
                          No inventory items matched &ldquo;{searchQuery}&rdquo;
                          {categoryFilter !== 'All' ? ` in ${categoryFilter} category` : ''}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setCategoryFilter('All');
                            setStockStatusFilter('All');
                            setSkuRangeFrom('');
                            setSkuRangeTo('');
                          }}
                          className="text-teal-600 dark:text-teal-400 text-xs font-bold hover:underline cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item, idx) => {
                    const isSelected = selectedStockItemIds.includes(item.ItemID);
                    const isExpanded = expandedRowIds.has(item.ItemID);
                    const isOutOfStock = item.Qty === 0;
                    const isCritical = item.Qty > 0 && item.Qty <= item.ReorderLevel * 0.5;
                    const isLow = item.Qty > 0 && item.Qty <= item.ReorderLevel && !isCritical;
                    const hasPendingReplenishment = pendingReplenishmentItemIds.includes(item.ItemID);

                      return (
                        <React.Fragment key={item.ItemID}>
                          <motion.tr
                            key={item.ItemID}
                            layout
                            whileHover={{ scale: 1.006 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                            onClick={() => handleToggleExpandRow(item.ItemID)}
                            onContextMenu={(e) => handleRowContextMenu(e, item)}
                            title="Click row to expand/collapse secondary details. Right-click for Quick Actions."
                            className={`stock-table-row cursor-pointer transition-all duration-150 group border-b border-slate-300 dark:border-slate-700 hover:shadow-md hover:shadow-slate-300/60 dark:hover:shadow-black/70 hover:z-20 relative origin-center ${
                              isSelected
                                ? 'bg-purple-50/95 dark:bg-purple-950/50 border-l-4 border-l-purple-600 dark:border-l-purple-400 font-medium'
                                : isExpanded
                                ? 'bg-slate-50 dark:bg-slate-800/70 border-l-4 border-l-teal-600 dark:border-l-teal-400'
                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-800/90'
                            }`}
                          >
                            <td
                              className="py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 align-middle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelectRow(item.ItemID);
                              }}
                            >
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectRow(item.ItemID)}
                                  onClick={(e) => e.stopPropagation()}
                                  id={`stock-checkbox-${item.ItemID}`}
                                  aria-label={`Select ${item.ItemID}`}
                                  className="w-3.5 h-3.5 rounded text-purple-600 accent-purple-600 border-slate-300 dark:border-slate-600 focus:ring-purple-500 cursor-pointer"
                                />
                              </div>
                            </td>
                            <td className="py-1.5 px-2 font-mono text-slate-500 dark:text-slate-400 text-[10px] border-r border-slate-300 dark:border-slate-700 text-center whitespace-nowrap select-none">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleExpandRow(item.ItemID, e)}
                                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                  title={isExpanded ? 'Collapse details' : 'Expand details'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span>{idx + 2}</span>
                              </div>
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-[10.5px] text-purple-700 dark:text-purple-300 border-r border-slate-300 dark:border-slate-700 group-hover:text-purple-900 dark:group-hover:text-purple-200 transition-colors whitespace-nowrap">
                              <SearchHighlightText text={item.ItemID} query={searchQuery} />
                            </td>
                            <td className="py-1.5 px-2.5 font-semibold text-[11px] text-slate-800 dark:text-slate-100 group-hover:text-slate-950 dark:group-hover:text-white border-r border-slate-300 dark:border-slate-700 truncate max-w-[260px]">
                              <SearchHighlightText text={item.ItemName} query={searchQuery} />
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                              <span
                                className={`text-[10.5px] font-semibold ${
                                  item.Category === 'Cleaning'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : item.Category === 'Stationery'
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-amber-700 dark:text-amber-400'
                                }`}
                              >
                                <SearchHighlightText text={item.Category} query={searchQuery} />
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                              <span
                                className={`font-bold text-[11px] ${
                                  isOutOfStock
                                    ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                    : isCritical || isLow
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {item.Qty}
                              </span>{' '}
                              <span
                                className={`text-[10px] font-medium ml-1 ${
                                  isOutOfStock
                                    ? 'text-rose-500 dark:text-rose-400/90'
                                    : isCritical || isLow
                                    ? 'text-amber-600/90 dark:text-amber-400/90'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <SearchHighlightText text={item.Unit} query={searchQuery} />
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                              <span className="text-slate-800 dark:text-slate-200 font-semibold text-[10.5px]">{item.ReorderLevel}</span>{' '}
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal ml-1">
                                <SearchHighlightText text={item.Unit} query={searchQuery} />
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center whitespace-nowrap">
                              {hasPendingReplenishment ? (
                                <span
                                  id={`status-text-replenish-${item.ItemID.toLowerCase()}`}
                                  className="font-bold text-[10.5px] text-purple-600 dark:text-purple-400"
                                  title="Replenishment or stock adjustment authorization is pending"
                                >
                                  <SearchHighlightText text="Replenishment Pending" query={searchQuery} />
                                </span>
                              ) : isOutOfStock ? (
                                <span
                                  id={`status-text-oos-${item.ItemID.toLowerCase()}`}
                                  className="font-extrabold text-[10.5px] text-rose-600 dark:text-rose-400"
                                  title="Zero inventory available — immediate replenishment needed"
                                >
                                  <SearchHighlightText text="Out of Stock" query={searchQuery} />
                                </span>
                              ) : isCritical ? (
                                <span
                                  id={`status-text-critical-${item.ItemID.toLowerCase()}`}
                                  className="font-bold text-[10.5px] text-amber-600 dark:text-amber-400"
                                  title={`Critical Low Stock: Available quantity is ≤ 50% of reorder threshold (${item.ReorderLevel} ${item.Unit})`}
                                >
                                  <SearchHighlightText text="Critical Low" query={searchQuery} />
                                </span>
                              ) : isLow ? (
                                <span
                                  id={`status-text-low-${item.ItemID.toLowerCase()}`}
                                  className="font-semibold text-[10.5px] text-amber-500 dark:text-amber-400"
                                  title={`Low Stock: Below reorder threshold of ${item.ReorderLevel} ${item.Unit}`}
                                >
                                  <SearchHighlightText text="Low Stock" query={searchQuery} />
                                </span>
                              ) : (
                                <span
                                  id={`status-text-healthy-${item.ItemID.toLowerCase()}`}
                                  className="font-semibold text-[10.5px] text-emerald-600 dark:text-emerald-400"
                                >
                                  <SearchHighlightText text="Optimal" query={searchQuery} />
                                </span>
                              )}
                            </td>
                            <td
                              className="py-1.5 px-2 border-l border-slate-300 dark:border-slate-700 text-center whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleQuickEditFromContext(item)}
                                  title={!currentUser ? 'Log in to edit stock item' : 'Edit Stock Item'}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[10px] font-semibold border border-slate-300 dark:border-slate-600 transition cursor-pointer"
                                >
                                  {!currentUser ? (
                                    <Lock className="w-3 h-3 text-amber-500" />
                                  ) : (
                                    <Edit3 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                  )}
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleQuickIssueFromContext([item])}
                                  disabled={item.Qty <= 0}
                                  title={!currentUser ? 'Log in to issue stock' : item.Qty <= 0 ? 'Cannot issue: Stock is 0' : 'Issue Stock Requisition'}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-semibold border border-emerald-300 dark:border-emerald-700 transition cursor-pointer"
                                >
                                  {!currentUser ? (
                                    <Lock className="w-3 h-3 text-amber-500" />
                                  ) : (
                                    <Send className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                  <span>Issue</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustFromContext(item)}
                                  title={!currentUser ? 'Log in to adjust stock count' : 'Stock Count Adjustment & Reconcile'}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-md text-[10px] font-semibold border border-purple-300 dark:border-purple-700 transition cursor-pointer"
                                >
                                  {!currentUser ? (
                                    <Lock className="w-3 h-3 text-amber-500" />
                                  ) : (
                                    <SlidersHorizontal className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                  )}
                                  <span>Adjustment</span>
                                </button>
                              </div>
                            </td>
                          </motion.tr>

                          {/* Expandable Secondary Details Row */}
                          {isExpanded && (
                            <tr className="bg-slate-50/95 dark:bg-slate-950/90 border-b-2 border-slate-300 dark:border-slate-700">
                              <td colSpan={9} className="p-4 pl-12 pr-6">
                                <div className="space-y-3.5 text-xs">
                                  {/* Secondary Details 3-Card Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                                      <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-1">
                                        <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className="font-semibold text-[10.5px] uppercase tracking-wider">Last Supplier</span>
                                      </div>
                                      <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                        <SearchHighlightText text={getLastSupplierForItem(item)} query={searchQuery} />
                                      </p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        Verified procurement vendor
                                      </p>
                                    </div>

                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                                      <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-1">
                                        <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                        <span className="font-semibold text-[10.5px] uppercase tracking-wider">Last Received Date</span>
                                      </div>
                                      <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm font-mono">
                                        <SearchHighlightText text={getLastReceivedDateForItem(item)} query={searchQuery} />
                                      </p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        Most recent delivery batch logged
                                      </p>
                                    </div>

                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                                      <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-1">
                                        <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        <span className="font-semibold text-[10.5px] uppercase tracking-wider">Stock Health & Threshold</span>
                                      </div>
                                      <div className="flex items-baseline space-x-2">
                                        <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                                          {item.Qty} {item.Unit}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                          (Safety: {item.ReorderLevel})
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        {item.Qty <= 0
                                          ? 'Out of Stock - Urgent replenishment required'
                                          : item.Qty <= item.ReorderLevel
                                          ? 'Below minimum safety reorder threshold'
                                          : 'Inventory levels optimal'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Item History (Movement Logs for this SKU) */}
                                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs overflow-hidden">
                                    <div className="px-3.5 py-2.5 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                          Item History & Audit Trail: [{item.ItemID}] {item.ItemName}
                                        </h5>
                                      </div>
                                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                        {getItemHistoryLogs(item.ItemID).length} recorded transaction{getItemHistoryLogs(item.ItemID).length === 1 ? '' : 's'}
                                      </span>
                                    </div>

                                    <div className="max-h-52 overflow-y-auto">
                                      {getItemHistoryLogs(item.ItemID).length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400 italic">
                                          {item.Description ? (
                                            <SearchHighlightText text={item.Description} query={searchQuery} />
                                          ) : (
                                            'No previous movement records logged for this item yet.'
                                          )}
                                        </div>
                                      ) : (
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-800 sticky top-0">
                                            <tr>
                                              <th className="py-2 px-3">Date / Time</th>
                                              <th className="py-2 px-3">Type</th>
                                              <th className="py-2 px-3 text-right">Qty</th>
                                              <th className="py-2 px-3">Reference / Voucher</th>
                                              <th className="py-2 px-3">Recipient / Dept / Supplier</th>
                                              <th className="py-2 px-3">Issuer</th>
                                              <th className="py-2 px-3">Details / Reason</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {getItemHistoryLogs(item.ItemID).map((log) => {
                                              const isDelivery = log.Type === 'DELIVERY';
                                              const isIssue = log.Type === 'ISSUE';

                                              return (
                                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                    <SearchHighlightText text={log.Timestamp} query={searchQuery} />
                                                  </td>
                                                  <td className="py-2 px-3 whitespace-nowrap">
                                                    <span
                                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                                        isDelivery
                                                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                                          : isIssue
                                                          ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                                                          : 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                                                      }`}
                                                    >
                                                      <SearchHighlightText text={log.Type} query={searchQuery} />
                                                    </span>
                                                  </td>
                                                  <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                                                    <span
                                                      className={
                                                        isDelivery
                                                          ? 'text-emerald-600 dark:text-emerald-400'
                                                          : isIssue
                                                          ? 'text-blue-600 dark:text-blue-400'
                                                          : 'text-purple-600 dark:text-purple-400'
                                                      }
                                                    >
                                                      {isDelivery ? `+${log.Qty}` : isIssue ? `-${log.Qty}` : `${log.Qty >= 0 ? '+' : ''}${log.Qty}`}
                                                    </span>
                                                  </td>
                                                  <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    <SearchHighlightText text={log.DocumentRef || log.id} query={searchQuery} />
                                                  </td>
                                                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                                    <SearchHighlightText text={log.DeptName || (isDelivery ? 'Stock Receiving' : 'General')} query={searchQuery} />
                                                  </td>
                                                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[130px]">
                                                    <SearchHighlightText text={log.IssuerName || log.IssuerID} query={searchQuery} />
                                                  </td>
                                                  <td className="py-2 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                                                    <SearchHighlightText text={log.DiscrepancyNotes || log.DiscrepancyReason || log.AdjustmentReason || 'Standard Movement'} query={searchQuery} />
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 2. EXCEL APPLICATION WINDOW CONTAINER (FOR OTHER SHEETS: MOVEMENT LOG, ADMIN CONFIG, ADJUSTMENT HUB) */
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden font-sans transition-colors">
          {/* 1. EXCEL WORKBOOK HEADER */}
          <div className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 px-4 py-2.5 flex items-center justify-between border-b-2 border-slate-300 dark:border-slate-800 text-xs select-none">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 font-bold text-teal-700 dark:text-teal-400">
                <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Stationery_&_Cleaning_System.xlsm [32-Bit VBA]</span>
              </div>
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-medium">
                AutoSave ON
              </span>
            </div>

            <div className="flex items-center space-x-4 text-[11px]">
              {currentUser ? (
                <span className="text-teal-700 dark:text-teal-400 font-mono font-semibold flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-md border border-teal-200 dark:border-teal-800/60">
                  <Shield className="w-3.5 h-3.5" /> Active Session: {currentUser.IssuerName} ({currentUser.IssuerID})
                  {isSuperiorAdmin && (
                    <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-bold border border-amber-500/30">
                      SUPERIOR ADMIN
                    </span>
                  )}
                </span>
              ) : (
                <button
                  onClick={handleOpenLogin}
                  className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold underline flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" /> Trigger Workbook_Open Login
                </button>
              )}
            </div>
          </div>

          {/* 2. WORKSHEET CANVAS TOOLBAR */}
          <div className="bg-slate-50 dark:bg-slate-900/90 px-4 py-3 border-b-2 border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Active Sheet Name Header */}
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">ACTIVE WORKSHEET:</span>
              <span className="text-sm font-bold text-teal-700 dark:text-teal-400 font-mono bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-teal-300 dark:border-teal-500/30 shadow-xs">
                Sheet: {activeSheet}
              </span>
            </div>

            {/* Search & Filter Controls for Movement_Log */}
            {activeSheet === 'Movement_Log' && (
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* Type Filter Buttons */}
                <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setMovementTypeFilter('ALL')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      movementTypeFilter === 'ALL'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All ({safeMovementLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementTypeFilter('DELIVERY')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      movementTypeFilter === 'DELIVERY'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Deliveries ({safeMovementLogs.filter((m) => m?.Type === 'DELIVERY').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementTypeFilter('ISSUE')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      movementTypeFilter === 'ISSUE'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Issues ({safeMovementLogs.filter((m) => m?.Type === 'ISSUE').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementTypeFilter('ADJUSTMENT')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      movementTypeFilter === 'ADJUSTMENT'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Adjustments ({safeMovementLogs.filter((m) => m?.Type === 'ADJUSTMENT').length})
                  </button>
                </div>

                {/* Movement Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search log ref, item, reason..."
                    value={movementSearchQuery}
                    onChange={(e) => setMovementSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-teal-500 w-48 sm:w-64"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. WORKSHEET GRID AREA */}
          <div className="bg-slate-100/60 dark:bg-slate-950 p-4 min-h-[420px] max-h-[560px] overflow-auto">
          {/* Master_Stock rendered in dedicated view above */}
          {false && (
            <div className="space-y-3.5">
              {/* Search & Category Filter Header above Stock Management Table */}
              <StockSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                stockStatusFilter={stockStatusFilter}
                onStockStatusChange={setStockStatusFilter}
                skuRangeFrom={skuRangeFrom}
                onSkuRangeFromChange={setSkuRangeFrom}
                skuRangeTo={skuRangeTo}
                onSkuRangeToChange={setSkuRangeTo}
                onResetAllFilters={() => {
                  setSearchQuery('');
                  setCategoryFilter('All');
                  setStockStatusFilter('All');
                  setSkuRangeFrom('');
                  setSkuRangeTo('');
                }}
                totalCount={stockItems.length}
                filteredCount={filteredStock.length}
                belowThresholdCount={belowSafetyThresholdCount}
                onOpenReorderReport={() => setActiveModal('reorderReport')}
              />

              {/* Bulk Operations Toolbar & Selection Actions Menu */}
              {selectedStockItemIds.length > 0 && (
                <BulkStockActionsBar
                  selectedCount={selectedStockItemIds.length}
                  totalFilteredCount={filteredStock.length}
                  totalStockCount={stockItems.length}
                  isAllSelected={isAllVisibleSelected}
                  isPartiallySelected={isPartiallySelected}
                  selectedItems={selectedStockItems}
                  onToggleSelectAll={handleToggleSelectAllVisible}
                  onSelectByStatus={handleSelectByStatus}
                  onClearSelection={handleClearSelection}
                  onBulkRestock={handleTriggerBulkRestock}
                  onBulkIssue={handleTriggerBulkIssue}
                  onBulkAdjustment={handleTriggerBulkAdjustment}
                  onOpenBatchUpdateModal={() => setShowBatchUpdateModal(true)}
                  onExportSelectedCsv={handleExportSelectedCsv}
                  onCopySelectedClipboard={handleCopySelectedClipboard}
                  onBulkDelete={onDeleteStockItem ? handleBulkDelete : undefined}
                  isSuperiorAdmin={isSuperiorAdmin}
                />
              )}

              {/* Stock Management Inventory Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <table id="stock-management-table" className="w-full text-xs text-left border-collapse font-sans">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-10 border-r border-slate-200 dark:border-slate-700 text-center">
                        <input
                          id="stock-table-master-checkbox"
                          type="checkbox"
                          checked={isAllVisibleSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isPartiallySelected;
                          }}
                          onChange={handleToggleSelectAllVisible}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                          title={isAllVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                        />
                      </th>
                      <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">Row</th>
                      <th className="p-3 border-r border-slate-200 dark:border-slate-700">ItemID (Col A)</th>
                      <th className="p-3 border-r border-slate-200 dark:border-slate-700">ItemName (Col B)</th>
                      <th className="p-3 border-r border-slate-200 dark:border-slate-700">Category (Col C)</th>
                      <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">
                        Available Qty (Col D)
                      </th>
                      <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Reorder Level (Col E)</th>
                      <th className="p-3 text-center">Stock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredStock.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="flex flex-col items-center justify-center space-y-2 text-slate-500 dark:text-slate-400">
                            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            <p className="text-xs font-semibold">
                              No inventory items matched &ldquo;{searchQuery}&rdquo;
                              {categoryFilter !== 'All' ? ` in ${categoryFilter} category` : ''}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setCategoryFilter('All');
                              }}
                              className="px-3 py-1 bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 hover:bg-teal-100 rounded-lg text-xs font-semibold border border-teal-200 dark:border-teal-800 transition"
                            >
                              Clear Search & Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <AnimatePresence mode="popLayout" initial={false}>
                        {filteredStock.map((item, idx) => {
                          const isSelected = selectedStockItemIds.includes(item.ItemID);
                          const isOutOfStock = (item.Qty || 0) <= 0;
                          const hasPendingReplenishment =
                            (Array.isArray(adjustmentRequests) &&
                              adjustmentRequests.some(
                                (r) =>
                                  (r?.status === 'PENDING' || r?.status === 'TIMED_ACCESS_GRANTED' || (r?.status as string) === 'IN_TIMED_WINDOW') &&
                                  Array.isArray(r?.items) &&
                                  r.items.some((i) => i?.ItemID === item.ItemID || (i as any)?.itemId === item.ItemID)
                              )) ||
                            (Array.isArray(movementLogs) &&
                              movementLogs.some((l) => l?.ItemID === item.ItemID && l?.Status === 'Pending'));
                          const isCritical = (item.Qty || 0) > 0 && (item.Qty || 0) <= Math.ceil((item.ReorderLevel || 10) * 0.5);
                          const isLow = (item.Qty || 0) > 0 && (item.Qty || 0) <= (item.ReorderLevel || 10);
                          const isOptimal = (item.Qty || 0) >= (item.ReorderLevel || 10) * 2;

                          return (
                            <motion.tr
                              key={item.ItemID}
                              layout
                              initial={{ opacity: 0, y: 8, scale: 0.99 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                transition: {
                                  type: 'spring',
                                  stiffness: 400,
                                  damping: 30,
                                  mass: 0.8,
                                  delay: Math.min(idx * 0.01, 0.12),
                                },
                              }}
                              exit={{
                                opacity: 0,
                                scale: 0.96,
                                y: -4,
                                transition: { duration: 0.15, ease: 'easeOut' },
                              }}
                              onClick={() => handleToggleSelectRow(item.ItemID)}
                              onContextMenu={(e) => handleRowContextMenu(e, item)}
                              title="Right-click for Quick Actions (Receive, Issue, Edit, Adjust, Export)"
                              className={`stock-table-row cursor-pointer transition-colors duration-150 group border-b border-slate-200/70 dark:border-slate-800/70 ${
                                isSelected
                                  ? 'bg-purple-50/90 dark:bg-purple-950/40 border-l-4 border-l-purple-600 dark:border-l-purple-400 font-medium'
                                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <td
                                className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800/60 align-middle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelectRow(item.ItemID);
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectRow(item.ItemID)}
                                    onClick={(e) => e.stopPropagation()}
                                    id={`stock-checkbox-${item.ItemID}`}
                                    aria-label={`Select ${item.ItemID}`}
                                    className="w-4 h-4 rounded text-purple-600 accent-purple-600 border-slate-300 dark:border-slate-600 focus:ring-purple-500 cursor-pointer"
                                  />
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-400 dark:text-slate-500 text-[11px] border-r border-slate-200/60 dark:border-slate-800/60 text-center whitespace-nowrap select-none">{idx + 2}</td>
                              <td className="py-3 px-3.5 font-mono font-bold text-xs text-purple-700 dark:text-purple-300 border-r border-slate-200/60 dark:border-slate-800/60 group-hover:text-purple-900 dark:group-hover:text-purple-200 transition-colors whitespace-nowrap">{item.ItemID}</td>
                              <td className="py-3 px-3.5 font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-slate-950 dark:group-hover:text-white border-r border-slate-200/60 dark:border-slate-800/60 truncate max-w-[280px]">{item.ItemName}</td>
                              <td className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800/60 whitespace-nowrap">
                                <span
                                  className={`text-xs font-semibold ${
                                    item.Category === 'Cleaning'
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : item.Category === 'Stationery'
                                      ? 'text-blue-700 dark:text-blue-400'
                                      : 'text-amber-700 dark:text-amber-400'
                                  }`}
                                >
                                  {item.Category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-mono border-r border-slate-200/60 dark:border-slate-800/60 whitespace-nowrap">
                                <span
                                  className={`font-bold text-xs sm:text-sm ${
                                    isOutOfStock
                                      ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                      : isCritical || isLow
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {item.Qty}
                                </span>{' '}
                                <span
                                  className={`text-xs font-medium ml-1 ${
                                    isOutOfStock
                                      ? 'text-rose-500 dark:text-rose-400/90'
                                      : isCritical || isLow
                                      ? 'text-amber-600/90 dark:text-amber-400/90'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {item.Unit}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200/60 dark:border-slate-800/60 whitespace-nowrap">
                                <span className="text-slate-800 dark:text-slate-200 font-semibold text-xs">{item.ReorderLevel}</span>{' '}
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal ml-1">{item.Unit}</span>
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {hasPendingReplenishment ? (
                                  <span
                                    id={`status-text-replenish-${item.ItemID.toLowerCase()}`}
                                    className="font-bold text-xs text-purple-600 dark:text-purple-400"
                                    title="Replenishment or stock adjustment authorization is pending"
                                  >
                                    Replenishment Pending
                                  </span>
                                ) : isOutOfStock ? (
                                  <span
                                    id={`status-text-oos-${item.ItemID.toLowerCase()}`}
                                    className="font-extrabold text-xs text-rose-600 dark:text-rose-400"
                                    title="Zero inventory available — immediate replenishment needed"
                                  >
                                    Out of Stock
                                  </span>
                                ) : isCritical ? (
                                  <span
                                    id={`status-text-critical-${item.ItemID.toLowerCase()}`}
                                    className="font-bold text-xs text-amber-600 dark:text-amber-400"
                                    title={`Critical Low Stock: Available quantity is ≤ 50% of reorder threshold (${item.ReorderLevel} ${item.Unit})`}
                                  >
                                    Critical Low
                                  </span>
                                ) : isLow ? (
                                  <span
                                    id={`status-text-low-${item.ItemID.toLowerCase()}`}
                                    className="font-semibold text-xs text-amber-500 dark:text-amber-400"
                                    title={`Low Stock: Below reorder threshold of ${item.ReorderLevel} ${item.Unit}`}
                                  >
                                    Low Stock
                                  </span>
                                ) : isOptimal ? (
                                  <span
                                    id={`status-text-optimal-${item.ItemID.toLowerCase()}`}
                                    className="font-semibold text-xs text-emerald-600 dark:text-emerald-400"
                                    title="Healthy optimal inventory level"
                                  >
                                    Optimal Stock
                                  </span>
                                ) : (
                                  <span
                                    id={`status-text-adequate-${item.ItemID.toLowerCase()}`}
                                    className="font-medium text-xs text-teal-600 dark:text-teal-400"
                                    title="Adequate inventory above reorder threshold"
                                  >
                                    Adequate
                                  </span>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SHEET 2: Movement_Log (READ-ONLY AUDIT TRAIL — INTERACTIVE TO OPEN GENERATED DOCUMENTS) */}
          {activeSheet === 'Movement_Log' && (
            <div className="space-y-3">
              {/* Movement Log Banner */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Read-Only Audit Trail:</strong> Immutable movement history. <span className="text-amber-700 dark:text-amber-300 font-bold">Click any row</span> to open and reprint the generated voucher PDF.
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700 font-mono">
                    Direct Edit: Disabled (Read-Only)
                  </span>
                  <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800 font-mono font-bold">
                    Reprint Allowed
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Timestamp</th>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Type</th>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Doc Reference / Location</th>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Item Description</th>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-right">Delta Qty</th>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Dept / Reason</th>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Issuer / Auditor</th>
                      <th className="p-2.5 text-center">Open & Reprint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                    {filteredMovementLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          No movement log entries match search filter.
                        </td>
                      </tr>
                    ) : (
                      <AnimatePresence mode="popLayout" initial={false}>
                        {filteredMovementLogs.map((log) => {
                          const isDelivery = log.Type === 'DELIVERY';
                          const isAdjustment = log.Type === 'ADJUSTMENT';
                          return (
                            <motion.tr
                              key={log.id}
                              layout
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => handleMovementLogRowClick(log)}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/90 active:bg-slate-100 dark:active:bg-slate-700 transition cursor-pointer group"
                              title="Click row to open generated voucher PDF for reprinting"
                            >
                              <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                {log.Timestamp}
                              </td>
                              <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isDelivery
                                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                      : isAdjustment
                                      ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  }`}
                                >
                                  {log.Type}
                                </span>
                              </td>
                              <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">
                                <div className="flex items-center space-x-1.5">
                                  <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition">
                                    {log.DocumentRef || (isDelivery ? 'GRN-Voucher' : isAdjustment ? 'ADJ-Voucher' : 'Issue-Slip')}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 font-sans font-medium text-slate-900 dark:text-slate-100">
                                {log.ItemName}
                              </td>
                              <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                                {isDelivery ? (
                                  <span className="text-blue-600 dark:text-blue-400">+{log.Qty}</span>
                                ) : isAdjustment ? (
                                  log.Qty > 0 ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">+{log.Qty}</span>
                                  ) : (
                                    <span className="text-red-600 dark:text-red-400">{log.Qty}</span>
                                  )
                                ) : (
                                  <span className="text-slate-800 dark:text-slate-200">-{log.Qty}</span>
                                )}
                              </td>
                              <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-teal-700 dark:text-teal-400 font-bold font-sans">
                                {isAdjustment ? (
                                  <span className="text-amber-700 dark:text-amber-300">
                                    {log.DiscrepancyReason || log.DeptName}
                                  </span>
                                ) : log.DeptID !== 'N/A' ? (
                                  `${log.DeptID} (${log.DeptName})`
                                ) : (
                                  log.DeptName
                                )}
                              </td>
                              <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-amber-800 dark:text-amber-400 font-bold font-sans">
                                {log.IssuerName || log.IssuerID} ({log.IssuerID})
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMovementLogRowClick(log);
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center justify-center space-x-1 mx-auto transition ${
                                    isDelivery
                                      ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-800'
                                      : isAdjustment
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-800'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700 dark:hover:bg-emerald-800'
                                  }`}
                                >
                                  <span>{isDelivery ? 'View GRN' : isAdjustment ? 'View ADJ' : 'View Slip'}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SHEET 3: Admin_Config */}
          {activeSheet === 'Admin_Config' && (
            <div className="space-y-6">
              {/* Admins Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono uppercase flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Admin_Config Table 1: Authorized Issuers
                  </h4>
                  <button
                    onClick={() => setActiveModal('userManagement')}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-xs transition"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>User Management CRUD (Rachel Pickard Only)</span>
                  </button>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Issuer Work ID</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Issuer Name</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Role</th>
                        <th className="p-2.5">Masked Secret Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {safeAdmins.map((adm) => (
                          <motion.tr
                            key={adm.IssuerID}
                            layout
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <td className="p-2.5 font-mono font-bold text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800">{adm.IssuerID}</td>
                            <td className="p-2.5 font-bold border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">{adm.IssuerName}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">{adm.Role}</td>
                            <td className="p-2.5 font-mono text-teal-700 dark:text-teal-400 font-bold">
                              •••••••• ({adm.SecretPassword})
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Departments Reference Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 font-mono uppercase flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Admin_Config Table 2: Department Master Lookup
                  </h4>
                  <button
                    onClick={() => handleOpenProcurementTab('departments')}
                    className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Building2 className="w-3.5 h-3.5" /> Manage / Edit Departments
                  </button>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Dept ID</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Dept Name</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Dept Head Name</th>
                        <th className="p-2.5">Dept Head Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {safeDepartments.map((dept) => (
                          <motion.tr
                            key={dept.DeptID}
                            layout
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <td className="p-2.5 font-mono font-bold text-teal-700 dark:text-teal-400 border-r border-slate-200 dark:border-slate-800">{dept.DeptID}</td>
                            <td className="p-2.5 font-bold border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">{dept.DeptName}</td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{dept.DeptHeadName}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{dept.DeptHeadEmail}</td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Managers Master Directory Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-purple-700 dark:text-purple-400 font-mono uppercase flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Admin_Config Table 3: Managers Master Directory (Direct Requisitions)
                  </h4>
                  <button
                    onClick={() => handleOpenProcurementTab('departments')}
                    className="text-xs text-blue-700 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Building2 className="w-3.5 h-3.5" /> Manage / Create Managers
                  </button>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Manager ID</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Manager Full Name</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Email Address</th>
                        <th className="p-2.5">Requisition Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {safeManagers.map((mgr) => (
                          <motion.tr
                            key={mgr.ManagerID}
                            layout
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <td className="p-2.5 font-mono font-bold text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800">{mgr.ManagerID}</td>
                            <td className="p-2.5 font-bold border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">{mgr.ManagerName}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">{mgr.Email}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                                Direct Stock Requisition
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {safeManagers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 italic text-xs">
                            No managers registered. Click "Manage / Create Managers" to add one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 4: Workbook Data Storage, Automated Backups & Disaster Recovery Registry */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-purple-700 dark:text-purple-400 font-mono uppercase flex items-center gap-1.5">
                    <Database className="w-4 h-4" /> Admin_Config Table 4: Workbook Data Storage & Disaster Recovery Registry
                  </h4>
                  <button
                    onClick={handleOpenBackupRecovery}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow-xs transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Launch Backup & Disaster Recovery Center</span>
                  </button>
                </div>

                {/* Storage & Frequency Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">Backup Frequency</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">Every 60m + On Transaction</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1">RPO = 0 Min (Zero Loss)</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">Recovery Target (RTO)</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">&lt; 3 Minutes</div>
                    <div className="text-[10px] text-blue-600 font-semibold mt-1">1-Click Point-in-Time Restore</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">Archive Retention</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">30-Day Rolling Vault</div>
                    <div className="text-[10px] text-purple-600 font-semibold mt-1">Auto Prune &gt; 30 Days</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">Active Snapshots</div>
                    <div className="text-xs font-bold text-purple-700 dark:text-purple-400 font-mono mt-0.5">{safeBackups.length} Available</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-1">Dir: \Backups\</div>
                  </div>
                </div>

                {/* Table of Snapshots */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Snapshot ID</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Timestamp</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Type</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">File Name</th>
                        <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Payload Scope</th>
                        <th className="p-2.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {safeBackups.slice(0, 4).map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="p-2.5 font-mono font-bold text-purple-700 dark:text-purple-400 border-r border-slate-200 dark:border-slate-800">{b.id}</td>
                          <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">{b.timestamp}</td>
                          <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {b.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">{b.fileName}</td>
                          <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                            {b.itemCount} Items | {b.movementCount} Logs | {b.departmentCount} Depts
                          </td>
                          <td className="p-2.5">
                            <button
                              onClick={handleOpenBackupRecovery}
                              className="text-purple-600 hover:text-purple-700 font-bold hover:underline text-xs"
                            >
                              Restore / View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4D. ADJUSTMENT_HUB / ADMIN DASHBOARD SHEET (Superior Admin Rachel Pickard ONLY) */}
          {activeSheet === 'Adjustment_Hub' && isSuperiorAdmin && (
            <div className="space-y-4">
              <AdminDashboardView
                currentUser={currentUser}
                adjustmentRequests={adjustmentRequests}
                activeTimedWindow={activeTimedWindow}
                onApproveAndExecuteRequest={onApproveAndExecuteRequest}
                onGrantTimedAccess={onGrantTimedAccess}
                onRevokeTimedAccess={onRevokeTimedAccess}
                onRejectRequest={onRejectRequest}
                onOpenModalHub={() => setActiveModal('superiorAdjustmentManager')}
              />
            </div>
          )}
        </div>

        {/* 5. EXCEL SHEET TABS (BOTTOM) - Master_Stock and Movement_Log removed to eliminate redundancy with sidebar navigation */}
        <div className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs select-none">
          <div className="flex items-center space-x-1">
            {isSuperiorAdmin && (
              <>
                <button
                  key="Adjustment_Hub"
                  onClick={() => handleSheetTabClick('Adjustment_Hub')}
                  className={`px-4 py-1.5 rounded-t-lg font-mono text-xs font-semibold transition border-t-2 flex items-center gap-1.5 ${
                    activeSheet === 'Adjustment_Hub'
                      ? 'bg-white dark:bg-slate-950 text-teal-700 dark:text-teal-400 border-teal-600 dark:border-teal-400 shadow-xs'
                      : 'bg-slate-200/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                  }`}
                  title="Adjustment_Hub"
                >
                  <SlidersHorizontal className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Adjustment_Hub</span>
                  {pendingRequestsCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-400 text-rose-950 rounded-full text-[9px] font-black animate-pulse font-mono">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  key="Admin_Config"
                  onClick={() => handleSheetTabClick('Admin_Config')}
                  className={`px-4 py-1.5 rounded-t-lg font-mono text-xs font-semibold transition border-t-2 flex items-center gap-1.5 ${
                    activeSheet === 'Admin_Config'
                      ? 'bg-white dark:bg-slate-950 text-teal-700 dark:text-teal-400 border-teal-600 dark:border-teal-400 shadow-xs'
                      : 'bg-slate-200/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                  }`}
                  title="Admin_Config"
                >
                  <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Admin_Config</span>
                </button>
              </>
            )}
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-1">
              <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Active View: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{activeSheet}</strong></span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
            Excel 32-bit Win32 VBA | Macro Enabled (.xlsm)
          </div>
        </div>
      </div>
      )}

      {/* RENDER MODAL DIALOGUES OVERLAY */}
      {activeModal === 'login' && (
        <LoginDialog
          admins={admins}
          onSuccess={handleLoginSuccess}
          onCancel={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'navigation' && currentUser && (
        <NavigationDialog
          issuerName={currentUser.IssuerName}
          issuerId={currentUser.IssuerID}
          onSelectOption={handleSelectNavOption}
          onOpenBackupRecovery={isSuperiorAdmin ? handleOpenBackupRecovery : undefined}
          onOpenReorderReport={() => setActiveModal('reorderReport')}
          belowThresholdCount={belowSafetyThresholdCount}
          onClose={() => {
            setActiveSheet('Master_Stock');
            setActiveModal('none');
          }}
          onLogout={() => {
            setCurrentUser(null);
            setActiveSheet('Master_Stock');
            setActiveModal('none');
          }}
        />
      )}

      {activeModal === 'procurement' && (
        <ProcurementOperationsDialog
          initialTab={procurementInitialTab}
          initialItemId={procurementInitialItemId}
          initialItemIds={procurementInitialItemIds}
          initialDeliveryMode={procurementInitialDeliveryMode}
          stockItems={stockItems}
          departments={departments}
          issuerName={currentUser ? currentUser.IssuerName : 'Sarah Jenkins'}
          issuerId={currentUser ? currentUser.IssuerID : 'ADM001'}
          currentUser={currentUser}
          activeTimedWindow={activeTimedWindow}
          adjustmentRequests={adjustmentRequests}
          onOpenRequestsModal={() => setActiveModal('adjustmentRequests')}
          onOpenSuperiorManagerModal={() => setActiveModal('superiorAdjustmentManager')}
          pendingRequestsCount={pendingRequestsCount}
          onSaveDelivery={onSaveDelivery}
          onSaveBulkDeliveries={onSaveBulkDeliveries}
          onTriggerReceivedDocPreview={(doc) => {
            setActiveReceivedDocForPreview(doc);
            setActiveModal('receivedDocPreview');
          }}
          onSaveAdjustment={handleSaveAdjustmentWithAutoClose}
          onAddNewStockItem={onAddNewStockItem}
          onUpdateStockItemName={onUpdateStockItemName}
          onUpdateStockItem={onUpdateStockItem}
          onDeleteStockItem={onDeleteStockItem}
          onAddDepartment={onAddDepartment}
          onUpdateDepartment={onUpdateDepartment}
          onDeleteDepartment={onDeleteDepartment}
          managers={managers}
          onAddManager={onAddManager}
          onUpdateManager={onUpdateManager}
          onDeleteManager={onDeleteManager}
          onTriggerIssuePreview={handleTriggerIssuePreview}
          onClose={() => {
            setActiveModal('none');
            setProcurementInitialItemId(undefined);
            setProcurementInitialItemIds(undefined);
            setProcurementInitialDeliveryMode(undefined);
          }}
        />
      )}

      {/* Stock Adjustment Request Modal (Standard Staff & Non-Admins) */}
      {activeModal === 'adjustmentRequests' && (
        <StockAdjustmentRequestModal
          isOpen={true}
          currentUser={currentUser}
          stockItems={stockItems}
          userRequests={adjustmentRequests}
          activeTimedWindow={activeTimedWindow}
          onSubmitRequest={(req) => {
            return onCreateAdjustmentRequest(req);
          }}
          onOpenDirectAdjustmentTab={() => {
            setProcurementInitialTab('adjustment');
            setActiveModal('procurement');
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Superior Admin Stock Adjustment Requests Hub & Timed Access Manager Modal (ADM001 Only) */}
      {activeModal === 'superiorAdjustmentManager' && (
        <SuperiorAdminAdjustmentManagerModal
          isOpen={true}
          currentUser={currentUser}
          stockItems={stockItems}
          requests={adjustmentRequests}
          activeTimedWindow={activeTimedWindow}
          onApproveAndExecuteRequest={onApproveAndExecuteRequest}
          onGrantTimedAccess={onGrantTimedAccess}
          onRevokeTimedAccess={onRevokeTimedAccess}
          onRejectRequest={onRejectRequest}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'preview' && tempIssueDept && (
        <PreviewConfirmationModal
          dept={tempIssueDept}
          cart={tempIssueCart}
          issuerId={currentUser ? currentUser.IssuerID : 'ADM001'}
          issuerName={currentUser ? currentUser.IssuerName : 'Sarah Jenkins'}
          onConfirmExecute={handleConfirmExecuteIssue}
          onCancel={() => {
            setProcurementInitialTab('issue');
            setActiveModal('procurement');
          }}
        />
      )}

      {activeModal === 'docPreview' && activeDocForPreview && (
        <PdfPreviewModal
          doc={activeDocForPreview}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'issuedArchive' && (
        <IssuedDocumentsArchiveModal
          issuedDocs={issuedDocs}
          onOpenPreview={(doc) => {
            setActiveDocForPreview(doc);
            setActiveModal('docPreview');
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'receivedDocPreview' && activeReceivedDocForPreview && (
        <ReceivedPdfPreviewModal
          doc={activeReceivedDocForPreview}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'userManagement' && (
        <UserManagementModal
          currentUser={currentUser}
          admins={admins}
          onAddAdmin={onAddAdmin}
          onUpdateAdmin={onUpdateAdmin}
          onDeleteAdmin={onDeleteAdmin}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Stock Reorder & Safety Threshold Report Modal */}
      {activeModal === 'reorderReport' && (
        <ReorderReportModal
          stockItems={stockItems}
          currentUser={currentUser}
          masterFolderPath={masterFolderPath}
          onClose={() => setActiveModal('none')}
          onBulkRestock={(items) => {
            handleTriggerBulkRestock(items);
          }}
        />
      )}

      {/* Backup & Disaster Recovery Center Modal (Strictly Superior Admin ADM001 Only) */}
      {activeModal === 'backupRecovery' && isSuperiorAdmin && (
        <BackupRecoveryModal
          isOpen={true}
          backups={backups}
          backupPolicy={backupPolicy}
          currentUser={currentUser}
          masterFolderPath={masterFolderPath}
          currentStock={stockItems}
          currentLogs={movementLogs}
          currentAdmins={admins}
          currentDepartments={departments}
          currentManagers={managers}
          currentIssuedDocs={issuedDocs}
          currentReceivedDocs={receivedDocs}
          currentAdjustmentDocs={adjustmentDocs}
          onCreateBackup={onCreateBackup}
          onRestoreBackup={onRestoreBackup}
          onImportBackup={onImportBackup}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Master Folder Path Configuration Modal (Superior Admin only) */}
      {showFolderConfigModal && (
        <MasterFolderConfigModal
          currentPath={masterFolderPath}
          onSavePath={onUpdateMasterFolderPath}
          onClose={() => setShowFolderConfigModal(false)}
        />
      )}

      {/* Bulk Batch Property Update Modal */}
      {showBatchUpdateModal && (
        <BulkBatchUpdateModal
          isOpen={showBatchUpdateModal}
          selectedItems={selectedStockItems}
          onApplyBatchUpdate={handleApplyBatchUpdate}
          onApplyUpdates={handleApplyBatchUpdate}
          onClose={() => setShowBatchUpdateModal(false)}
        />
      )}

      {/* Bulk Delete Gated Confirmation Modal (Superior Admin Rachel Pickard only) */}
      {showBulkDeleteModal && (
        <BulkDeleteConfirmationModal
          isOpen={showBulkDeleteModal}
          selectedItems={selectedStockItems}
          issuerName={currentUser?.IssuerName || 'Rachel Pickard'}
          issuerId={currentUser?.IssuerID || 'ADM001'}
          onConfirm={handleConfirmBulkDelete}
          onClose={() => setShowBulkDeleteModal(false)}
        />
      )}

      {/* Bulk Restock Delivery Review & Confirmation Modal */}
      {showBulkDeliveryConfirmModal && (
        <BulkDeliveryConfirmationModal
          deliveries={bulkDeliveryReviewItems}
          items={bulkDeliveryReviewItems}
          isSuperiorAdmin={isSuperiorAdmin}
          issuerId={currentUser ? currentUser.IssuerID : 'ADM001'}
          issuerName={currentUser ? currentUser.IssuerName : 'Rachel Pickard'}
          onConfirm={handleConfirmBulkDeliveryModal}
          onCancel={() => setShowBulkDeliveryConfirmModal(false)}
          onClose={() => setShowBulkDeliveryConfirmModal(false)}
        />
      )}

      {/* Interactive Movement Log Document Viewer Modal (Reprint & PDF Voucher View) */}
      {selectedMovementDoc && (
        <DocumentViewerModal
          document={selectedMovementDoc}
          onClose={() => setSelectedMovementDoc(null)}
        />
      )}

      {/* Right-Click Stock Item Quick Actions Context Menu Modal */}
      <AnimatePresence>
        {isContextMenuOpen && (
          <StockItemContextMenuModal
            isOpen={isContextMenuOpen}
            item={contextMenuItem}
            selectedItems={selectedStockItems}
            position={contextMenuPos}
            onClose={() => {
              setIsContextMenuOpen(false);
              setContextMenuItem(null);
              setContextMenuPos(null);
            }}
            onQuickReceive={handleQuickReceiveFromContext}
            onQuickIssue={handleQuickIssueFromContext}
            onQuickEdit={handleQuickEditFromContext}
            onExportItem={handleExportItemFromContext}
            onQuickAdjust={handleQuickAdjustFromContext}
            onBulkAdjustment={handleBulkAdjustmentFromContext}
            onBulkStockEdit={handleBulkStockEditFromContext}
            existingReceivingList={activeReceivingList}
            existingIssueList={tempIssueCart}
            existingEditList={selectedStockItems}
            existingAdjustmentList={activeAdjustmentList}
            onAddToList={handleAddToListFromContext}
            adjustmentRequests={adjustmentRequests}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
