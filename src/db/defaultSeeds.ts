import {
  StockItem,
  AdminUser,
  Department,
  Manager,
  MovementLogEntry,
  StockAdjustmentRequest,
  BackupSnapshot,
  BackupProtocolPolicy,
} from '../types';
import {
  INITIAL_STOCK,
  INITIAL_ADMINS,
  INITIAL_DEPARTMENTS,
  INITIAL_MANAGERS,
  INITIAL_LOGS,
  INITIAL_ADJUSTMENT_REQUESTS,
  INITIAL_BACKUPS,
  DEFAULT_BACKUP_POLICY,
} from '../data/initialData';

export const DEFAULT_MASTER_STOCK: StockItem[] = INITIAL_STOCK;
export const DEFAULT_ADMINS: AdminUser[] = INITIAL_ADMINS;
export const DEFAULT_DEPARTMENTS: Department[] = INITIAL_DEPARTMENTS;
export const DEFAULT_MANAGERS: Manager[] = INITIAL_MANAGERS;
export const DEFAULT_LOGS: MovementLogEntry[] = INITIAL_LOGS;
export const DEFAULT_ADJUSTMENT_REQUESTS: StockAdjustmentRequest[] = INITIAL_ADJUSTMENT_REQUESTS;
export const DEFAULT_BACKUPS_SEEDS: BackupSnapshot[] = INITIAL_BACKUPS;
export const DEFAULT_POLICY: BackupProtocolPolicy = DEFAULT_BACKUP_POLICY;
