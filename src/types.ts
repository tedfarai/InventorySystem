export type ItemCategory = 'Stationery' | 'Cleaning' | 'General';

export interface StockItem {
  ItemID: string;
  ItemName: string;
  Category: ItemCategory;
  Qty: number;
  ReorderLevel: number;
  Unit: string;
  UnitPrice?: number;
  Location?: string;
  UpdatedAt?: string;
  Version?: number;
  LastUpdatedBy?: string;
  ClientId?: string;
  SupplierName?: string;
  LastSupplier?: string;
  LastReceivedDate?: string;
  Description?: string;
}

export type MovementType = 'DELIVERY' | 'ISSUE' | 'ADJUSTMENT';

export type AdjustmentReasonCode =
  | 'COUNT_DISCREPANCY'
  | 'DAMAGED_STOCK'
  | 'EXPIRED_OBSOLETE'
  | 'AUDIT_CORRECTION'
  | 'FOUND_STOCK';

export type MovementStatus = 'Completed' | 'Pending' | 'Emailed' | 'Adjusted';

export interface MovementLogEntry {
  id: string;
  Timestamp: string;
  Type: MovementType;
  ItemID: string;
  ItemName: string;
  Qty: number;
  DeptID: string;
  DeptName: string;
  DeptHead: string;
  DeptEmail: string;
  IssuerID: string;
  IssuerName?: string;
  SupplierName?: string;
  IssueSlipFileName?: string;
  DocumentRef?: string;
  Status: MovementStatus;
  AdjustmentReason?: string;
  DiscrepancyReason?: string;
  DiscrepancyNotes?: string;
  CountRef?: string;
  PreviousQty?: number;
  NewQty?: number;
  UpdatedAt?: string;
  ClientId?: string;
}

export interface AdminUser {
  IssuerID: string;
  IssuerName: string;
  Role: string;
  SecretPassword: string;
  Active: boolean;
}

export interface Department {
  DeptID: string;
  DeptName: string;
  DeptHeadName: string;
  DeptHeadEmail: string;
  /** Optional monthly unit allowance for budget enforcement */
  monthlyBudgetUnits?: number;
}

export interface Manager {
  ManagerID: string;
  ManagerName: string;
  Email: string;
}

export interface IssueCartItem {
  ItemID: string;
  ItemName: string;
  Category: ItemCategory;
  AvailableQty: number;
  RequestedQty: number;
  Qty?: number;
}

export interface IssuedDocument {
  docType?: 'ISSUE';
  slipNumber: string;
  timestamp: string;
  deptID: string;
  deptName: string;
  deptHeadName: string;
  deptHeadEmail: string;
  issuerID: string;
  issuerName: string;
  items: {
    ItemID: string;
    ItemName: string;
    Category: string;
    Qty: number;
  }[];
  pdfFileName: string;
  folderPath: string;
  fullSavedPath: string;
  updatedAt?: string;
  clientId?: string;
}

export interface ReceivedDocument {
  docType: 'DELIVERY';
  voucherNumber: string;
  timestamp: string;
  deliveryRef: string;
  SupplierName?: string;
  supplier?: string;
  issuerID: string;
  issuerName: string;
  issuerRole?: string;
  items: {
    ItemID: string;
    ItemName: string;
    Category: string;
    Qty: number;
    Unit?: string;
    SupplierName?: string;
    Supplier?: string;
  }[];
  pdfFileName: string;
  folderPath: string;
  fullSavedPath: string;
  updatedAt?: string;
  clientId?: string;
}

export interface AdjustmentDocument {
  docType: 'ADJUSTMENT';
  voucherNumber: string;
  timestamp: string;
  countRef: string;
  reasonCode: AdjustmentReasonCode;
  reasonLabel: string;
  notes?: string;
  issuerID: string;
  issuerName: string;
  issuerRole?: string;
  items: {
    ItemID: string;
    ItemName: string;
    Category: string;
    SystemQty: number;
    PhysicalQty: number;
    VarianceQty: number;
    Unit?: string;
  }[];
  pdfFileName: string;
  folderPath: string;
  fullSavedPath: string;
  updatedAt?: string;
  clientId?: string;
}

export interface VbaModule {
  id: string;
  name: string;
  type: 'Class' | 'Module' | 'UserForm' | 'Setup';
  description: string;
  code: string;
}

export type BackupType = 'TRANSACTION' | 'HOURLY' | 'DAILY' | 'MANUAL' | 'PRE_RESTORE';

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  type: BackupType;
  fileName: string;
  fileSizeKb: number;
  folderPath: string;
  checksum: string;
  itemCount: number;
  movementCount: number;
  departmentCount: number;
  managerCount: number;
  adminCount: number;
  description: string;
  issuerId: string;
  issuerName: string;
  payload: {
    stockItems: StockItem[];
    movementLogs: MovementLogEntry[];
    admins: AdminUser[];
    departments: Department[];
    managers: Manager[];
    issuedDocs?: IssuedDocument[];
    receivedDocs?: ReceivedDocument[];
    adjustmentDocs?: AdjustmentDocument[];
  };
}

export interface BackupProtocolPolicy {
  scheduleFrequency: string;
  retentionDays: number;
  autoBackupOnTransaction: boolean;
  hourlyDifferential: boolean;
  dailyFullBackupTime: string;
  offsiteMirrorProtocol: string;
  rpoMinutes: number;
  rtoMinutes: number;
  backupDirectory: string;
  encryptionMode: string;
}

export interface StockAdjustmentRequestItem {
  ItemID: string;
  ItemName: string;
  Category: ItemCategory;
  CurrentSystemQty: number;
  ProposedPhysicalQty: number;
  VarianceQty: number;
  Unit: string;
  ReasonCode: AdjustmentReasonCode;
  ReasonLabel: string;
  CountRef: string;
  Notes: string;
  isAdjusted?: boolean;
  adjustedAt?: string;
  voucherNumber?: string;
}

export type AdjustmentRequestStatus =
  | 'PENDING'
  | 'APPROVED_AND_EXECUTED'
  | 'TIMED_ACCESS_GRANTED'
  | 'REJECTED'
  | 'EXPIRED';

export interface TimedAccessWindow {
  requestId?: string;
  grantedToIssuerId: string;
  grantedToIssuerName: string;
  durationMinutes: number;
  startTime: string; // ISO string or timestamp
  endTime: string; // ISO string or timestamp
  allowedItemIds: string[]; // restricted strictly to requested items on the list
  completedItemIds?: string[]; // ItemIDs that have already been adjusted
  isActive: boolean;
  grantedBy: string;
}

export interface StockAdjustmentRequest {
  id: string; // e.g. "SAR-20260819-01"
  createdAt: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  requestTitle: string;
  status: AdjustmentRequestStatus;
  items: StockAdjustmentRequestItem[];
  superiorAdminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  timedAccessWindow?: TimedAccessWindow;
}

export type PlatformType = 'Windows' | 'macOS' | 'Linux' | 'ChromeOS' | 'Android' | 'iOS' | 'Web';

export interface UserPresence {
  id: string;
  userId: string;
  userName: string;
  role: string;
  currentTab: string;
  currentSheet?: string;
  lastActive: number;
  platform: PlatformType;
  isOnline: boolean;
  avatarColor: string;
  sessionStartedAt?: string;
}

export type CollaborativeEventType =
  | 'STOCK_ISSUED'
  | 'STOCK_RECEIVED'
  | 'ADJUSTMENT_REQUESTED'
  | 'ADJUSTMENT_APPROVED'
  | 'ADJUSTMENT_REJECTED'
  | 'STOCK_UPDATED'
  | 'BATCH_UPDATED'
  | 'BACKUP_CREATED'
  | 'BACKUP_RESTORED'
  | 'CONFLICT_RESOLVED'
  | 'QUEUE_DRAINED';

export interface CollaborativeEvent {
  id: string;
  timestamp: string;
  type: CollaborativeEventType;
  summary: string;
  userId: string;
  userName: string;
  userRole?: string;
  details?: Record<string, any>;
}

export type CloudSyncStatus = 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'DRAINING' | 'ERROR';

/**
 * PWA Offline Mutation Queue Entry
 * Guarantees zero data loss with Last-Write-Wins (LWW) resolution
 */
export interface OfflineMutation {
  id: string;
  type:
    | 'STOCK_UPDATE'
    | 'STOCK_BATCH'
    | 'ISSUE_TRANSACTION'
    | 'DELIVERY_TRANSACTION'
    | 'ADJUSTMENT_TRANSACTION'
    | 'ADJUSTMENT_REQUEST'
    | 'DEPARTMENT_UPDATE'
    | 'MANAGER_UPDATE'
    | 'ADMIN_UPDATE';
  timestamp: number;
  isoTimestamp: string;
  clientId: string;
  issuerId: string;
  issuerName: string;
  issuerRole?: string;
  userRole?: string;
  version: number;
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'RESOLVED' | 'FAILED';
  retryCount: number;
  errorMessage?: string;
}

export interface LwwConflictResolutionResult<T> {
  resolved: T;
  wasConflict: boolean;
  winner: 'local' | 'incoming';
  reason: string;
}


