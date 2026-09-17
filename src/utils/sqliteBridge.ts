/**
 * ===============================================================================
 * PARAMOUNT PROCUREMENT SYSTEM — ASYNCHRONOUS SQLite 3 DATABASE LAYER
 * Architecture: True SQLite 3 Database running in-browser via sql.js (WebAssembly)
 * with robust local WASM resolution, CDN fallbacks, and transactional persistence
 * ===============================================================================
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
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
  AdjustmentReasonCode,
  ItemCategory,
} from '../types';
import { analyzeSearchQuery, stemWord } from './stemmer';
import {
  INITIAL_STOCK,
  INITIAL_ADMINS,
  INITIAL_DEPARTMENTS,
  INITIAL_MANAGERS,
  INITIAL_LOGS,
  INITIAL_BACKUPS,
  INITIAL_ADJUSTMENT_REQUESTS,
} from '../data/initialData';

const SQLITE_STORAGE_KEY = 'paramount_procurement_sqlite_db';
const FALLBACK_STORAGE_KEY = 'paramount_procurement_fallback_store';

interface FallbackStore {
  stock: StockItem[];
  movementLogs: MovementLogEntry[];
  admins: AdminUser[];
  departments: Department[];
  managers: Manager[];
  issuedDocs: IssuedDocument[];
  receivedDocs: ReceivedDocument[];
  adjustmentDocs: AdjustmentDocument[];
  adjustmentRequests: StockAdjustmentRequest[];
  backups: BackupSnapshot[];
}

class SqliteBridge {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private initPromise: Promise<Database | null> | null = null;
  private isWasmAvailable = false;
  private fallbackStore: FallbackStore | null = null;

  /**
   * Initializes the SQLite3 WebAssembly engine or fallback engine.
   */
  public async getDb(): Promise<Database | null> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // 1. Try initializing sql.js with pre-fetched ArrayBuffer to prevent wasm streaming compile abort errors
      const wasmCandidates = [
        sqlWasmUrl,
        'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/sql-wasm.wasm',
        'https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/sql-wasm.wasm',
        'https://unpkg.com/sql.js@1.14.2/dist/sql-wasm.wasm',
      ];

      for (const candidate of wasmCandidates) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const response = await fetch(candidate, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            const wasmBinary = await response.arrayBuffer();
            if (wasmBinary && wasmBinary.byteLength > 0) {
              const sqlInstance = await initSqlJs({
                wasmBinary,
              });
              if (sqlInstance) {
                this.SQL = sqlInstance;
                this.isWasmAvailable = true;
                break;
              }
            }
          }
        } catch {
          // Continue to next candidate cleanly
        }
      }

      // Fallback attempt if direct buffer fetch fails
      if (!this.SQL) {
        try {
          const sqlInstance = await initSqlJs({
            locateFile: () => sqlWasmUrl,
          });
          if (sqlInstance) {
            this.SQL = sqlInstance;
            this.isWasmAvailable = true;
          }
        } catch {
          // Resilient fallback will handle below
        }
      }

      if (this.SQL && this.isWasmAvailable) {
        try {
          const savedBinary = localStorage.getItem(SQLITE_STORAGE_KEY);
          if (savedBinary) {
            try {
              const u8 = this.base64ToUint8Array(savedBinary);
              this.db = new this.SQL.Database(u8);
            } catch (e) {
              console.warn('[SQLite Bridge] Creating fresh database:', e);
              this.db = new this.SQL.Database();
            }
          } else {
            this.db = new this.SQL.Database();
          }

          await this.createSchema();
          this.persistDb();
          return this.db;
        } catch (dbErr) {
          console.warn('[SQLite Bridge] Error creating SQLite instance, using resilient fallback store:', dbErr);
          this.db = null;
          this.isWasmAvailable = false;
        }
      }

      // 2. Resilient In-Memory Fallback Engine
      this.initFallbackStore();
      return null;
    })();

    return this.initPromise;
  }

  private initFallbackStore(): void {
    if (this.fallbackStore) return;
    try {
      const saved = localStorage.getItem(FALLBACK_STORAGE_KEY);
      if (saved) {
        this.fallbackStore = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[SQLite Bridge] Could not parse fallback storage:', e);
    }

    if (!this.fallbackStore) {
      this.fallbackStore = {
        stock: JSON.parse(JSON.stringify(INITIAL_STOCK)),
        movementLogs: JSON.parse(JSON.stringify(INITIAL_LOGS)),
        admins: JSON.parse(JSON.stringify(INITIAL_ADMINS)),
        departments: JSON.parse(JSON.stringify(INITIAL_DEPARTMENTS)),
        managers: JSON.parse(JSON.stringify(INITIAL_MANAGERS)),
        issuedDocs: [],
        receivedDocs: [],
        adjustmentDocs: [],
        adjustmentRequests: JSON.parse(JSON.stringify(INITIAL_ADJUSTMENT_REQUESTS)),
        backups: JSON.parse(JSON.stringify(INITIAL_BACKUPS)),
      };
      this.persistFallback();
    } else {
      // Ensure all arrays are populated even if older cached storage lacked new tables
      if (!Array.isArray(this.fallbackStore.stock)) this.fallbackStore.stock = JSON.parse(JSON.stringify(INITIAL_STOCK));
      if (!Array.isArray(this.fallbackStore.movementLogs)) this.fallbackStore.movementLogs = JSON.parse(JSON.stringify(INITIAL_LOGS));
      if (!Array.isArray(this.fallbackStore.admins)) this.fallbackStore.admins = JSON.parse(JSON.stringify(INITIAL_ADMINS));
      if (!Array.isArray(this.fallbackStore.departments)) this.fallbackStore.departments = JSON.parse(JSON.stringify(INITIAL_DEPARTMENTS));
      if (!Array.isArray(this.fallbackStore.managers)) this.fallbackStore.managers = JSON.parse(JSON.stringify(INITIAL_MANAGERS));
      if (!Array.isArray(this.fallbackStore.issuedDocs)) this.fallbackStore.issuedDocs = [];
      if (!Array.isArray(this.fallbackStore.receivedDocs)) this.fallbackStore.receivedDocs = [];
      if (!Array.isArray(this.fallbackStore.adjustmentDocs)) this.fallbackStore.adjustmentDocs = [];
      if (!Array.isArray(this.fallbackStore.adjustmentRequests)) this.fallbackStore.adjustmentRequests = JSON.parse(JSON.stringify(INITIAL_ADJUSTMENT_REQUESTS));
      if (!Array.isArray(this.fallbackStore.backups)) this.fallbackStore.backups = JSON.parse(JSON.stringify(INITIAL_BACKUPS));
      this.persistFallback();
    }
  }

  private persistFallback(): void {
    if (!this.fallbackStore) return;
    try {
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(this.fallbackStore));
    } catch (e) {
      console.warn('[SQLite Bridge] Error saving fallback storage:', e);
    }
  }

  /**
   * Schema Initialization with PRAGMAs, Constraints & Indices
   */
  private async createSchema(): Promise<void> {
    if (!this.db) return;

    this.db.run('PRAGMA foreign_keys = ON;');

    // 1. MASTER STOCK TABLE
    this.db.run(`
      CREATE TABLE IF NOT EXISTS master_stock (
        item_id TEXT PRIMARY KEY,
        item_name TEXT NOT NULL,
        category TEXT NOT NULL,
        qty REAL NOT NULL DEFAULT 0,
        reorder_level REAL NOT NULL DEFAULT 10,
        unit TEXT NOT NULL DEFAULT 'Units',
        SupplierName TEXT,
        last_supplier TEXT,
        last_received_date TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. ADMIN USERS TABLE
    this.db.run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        issuer_id TEXT PRIMARY KEY,
        issuer_name TEXT NOT NULL,
        role TEXT NOT NULL,
        secret_password TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      );
    `);

    // 3. DEPARTMENTS TABLE
    this.db.run(`
      CREATE TABLE IF NOT EXISTS departments (
        dept_id TEXT PRIMARY KEY,
        dept_name TEXT NOT NULL,
        dept_head_name TEXT NOT NULL,
        dept_head_email TEXT NOT NULL
      );
    `);

    // 4. MANAGERS TABLE
    this.db.run(`
      CREATE TABLE IF NOT EXISTS managers (
        manager_id TEXT PRIMARY KEY,
        manager_name TEXT NOT NULL,
        email TEXT NOT NULL
      );
    `);

    // 5. MOVEMENT LOG AUDIT TABLE
    this.db.run(`
      CREATE TABLE IF NOT EXISTS movement_log (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        qty REAL NOT NULL,
        dept_id TEXT NOT NULL DEFAULT 'N/A',
        dept_name TEXT NOT NULL DEFAULT 'N/A',
        dept_head TEXT NOT NULL DEFAULT 'N/A',
        dept_email TEXT NOT NULL DEFAULT 'N/A',
        issuer_id TEXT NOT NULL,
        issuer_name TEXT DEFAULT 'N/A',
        SupplierName TEXT,
        doc_ref TEXT,
        slip_file_name TEXT,
        status TEXT NOT NULL DEFAULT 'Completed',
        discrepancy_reason TEXT,
        discrepancy_notes TEXT,
        count_ref TEXT
      );
    `);

    // 6. DOCUMENTS TABLES
    this.db.run(`
      CREATE TABLE IF NOT EXISTS issued_documents (
        slip_number TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        dept_id TEXT NOT NULL,
        dept_name TEXT NOT NULL,
        dept_head_name TEXT NOT NULL,
        dept_head_email TEXT NOT NULL,
        issuer_id TEXT NOT NULL,
        issuer_name TEXT NOT NULL,
        items_json TEXT NOT NULL,
        pdf_file_name TEXT,
        folder_path TEXT,
        full_saved_path TEXT
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS received_documents (
        voucher_number TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        delivery_ref TEXT NOT NULL,
        SupplierName TEXT,
        supplier TEXT,
        issuer_id TEXT NOT NULL,
        issuer_name TEXT NOT NULL,
        issuer_role TEXT,
        items_json TEXT NOT NULL,
        pdf_file_name TEXT,
        folder_path TEXT,
        full_saved_path TEXT
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS adjustment_documents (
        voucher_number TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        count_ref TEXT NOT NULL,
        reason_code TEXT NOT NULL,
        reason_label TEXT NOT NULL,
        notes TEXT,
        issuer_id TEXT NOT NULL,
        issuer_name TEXT NOT NULL,
        issuer_role TEXT,
        items_json TEXT NOT NULL,
        pdf_file_name TEXT,
        folder_path TEXT,
        full_saved_path TEXT
      );
    `);

    // 7. STOCK ADJUSTMENT REQUESTS TABLE
    this.db.run(`
      CREATE TABLE IF NOT EXISTS adjustment_requests (
        id TEXT PRIMARY KEY,
        created_at DATETIME NOT NULL,
        requester_id TEXT NOT NULL,
        requester_name TEXT NOT NULL,
        requester_role TEXT NOT NULL,
        request_title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        items_json TEXT NOT NULL,
        superior_admin_notes TEXT,
        reviewed_by TEXT,
        reviewed_at DATETIME,
        timed_access_json TEXT
      );
    `);

    // 8. BACKUP SNAPSHOTS TABLE
    this.db.run(`
      CREATE TABLE IF NOT EXISTS backup_snapshots (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size_kb INTEGER NOT NULL,
        folder_path TEXT NOT NULL,
        checksum TEXT NOT NULL,
        item_count INTEGER NOT NULL,
        movement_count INTEGER NOT NULL,
        department_count INTEGER NOT NULL,
        manager_count INTEGER NOT NULL,
        admin_count INTEGER NOT NULL,
        description TEXT,
        issuer_id TEXT NOT NULL,
        issuer_name TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
    `);

    // Indices
    this.db.run('CREATE INDEX IF NOT EXISTS idx_stock_cat ON master_stock(category);');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_movement_ts ON movement_log(timestamp DESC);');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_movement_item ON movement_log(item_id);');

    // Safe Schema Migrations for existing databases
    try {
      this.db.run('ALTER TABLE master_stock ADD COLUMN last_supplier TEXT;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.run('ALTER TABLE master_stock ADD COLUMN SupplierName TEXT;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.run('ALTER TABLE master_stock ADD COLUMN last_received_date TEXT;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.run('ALTER TABLE master_stock ADD COLUMN description TEXT;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.run('ALTER TABLE received_documents ADD COLUMN supplier TEXT;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.run('ALTER TABLE received_documents ADD COLUMN SupplierName TEXT;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.run('ALTER TABLE movement_log ADD COLUMN SupplierName TEXT;');
    } catch {
      // Column may already exist
    }

    // Seed initial dataset if tables are empty
    await this.seedIfEmpty();
  }

  private async seedIfEmpty(): Promise<void> {
    if (!this.db) return;

    const countRes = this.db.exec('SELECT COUNT(*) as count FROM master_stock;');
    const count = countRes.length > 0 && countRes[0].values[0] ? (countRes[0].values[0][0] as number) : 0;

    if (count === 0) {
      // Seed Stock
      const stockStmt = this.db.prepare(
        'INSERT INTO master_stock (item_id, item_name, category, qty, reorder_level, unit, SupplierName, last_supplier, last_received_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);'
      );
      for (const item of INITIAL_STOCK) {
        const supp = item.SupplierName || item.LastSupplier || null;
        stockStmt.run([
          item.ItemID,
          item.ItemName,
          item.Category,
          item.Qty,
          item.ReorderLevel,
          item.Unit,
          supp,
          supp,
          item.LastReceivedDate || null,
          item.Description || null,
        ]);
      }
      stockStmt.free();

      // Seed Admins
      const adminStmt = this.db.prepare(
        'INSERT INTO admin_users (issuer_id, issuer_name, role, secret_password, active) VALUES (?, ?, ?, ?, ?);'
      );
      for (const adm of INITIAL_ADMINS) {
        adminStmt.run([adm.IssuerID, adm.IssuerName, adm.Role, adm.SecretPassword, adm.Active ? 1 : 0]);
      }
      adminStmt.free();

      // Seed Departments
      const deptStmt = this.db.prepare(
        'INSERT INTO departments (dept_id, dept_name, dept_head_name, dept_head_email) VALUES (?, ?, ?, ?);'
      );
      for (const d of INITIAL_DEPARTMENTS) {
        deptStmt.run([d.DeptID, d.DeptName, d.DeptHeadName, d.DeptHeadEmail]);
      }
      deptStmt.free();

      // Seed Managers
      const mgrStmt = this.db.prepare(
        'INSERT INTO managers (manager_id, manager_name, email) VALUES (?, ?, ?);'
      );
      for (const m of INITIAL_MANAGERS) {
        mgrStmt.run([m.ManagerID, m.ManagerName, m.Email]);
      }
      mgrStmt.free();

      // Seed Logs
      const logStmt = this.db.prepare(
        `INSERT INTO movement_log (
          id, timestamp, type, item_id, item_name, qty, dept_id, dept_name, dept_head, dept_email,
          issuer_id, issuer_name, doc_ref, slip_file_name, status, discrepancy_reason, discrepancy_notes, count_ref
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );
      for (const l of INITIAL_LOGS) {
        logStmt.run([
          l.id,
          l.Timestamp,
          l.Type,
          l.ItemID,
          l.ItemName,
          l.Qty,
          l.DeptID,
          l.DeptName,
          l.DeptHead,
          l.DeptEmail,
          l.IssuerID,
          l.IssuerName || 'System',
          l.DocumentRef || '',
          l.IssueSlipFileName || '',
          l.Status,
          l.DiscrepancyReason || null,
          l.DiscrepancyNotes || null,
          l.CountRef || null,
        ]);
      }
      logStmt.free();

      // Seed Adjustment Requests
      const reqStmt = this.db.prepare(
        `INSERT INTO adjustment_requests (
          id, created_at, requester_id, requester_name, requester_role, request_title, status, items_json, superior_admin_notes, reviewed_by, reviewed_at, timed_access_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );
      for (const req of INITIAL_ADJUSTMENT_REQUESTS) {
        reqStmt.run([
          req.id,
          req.createdAt,
          req.requesterId,
          req.requesterName,
          req.requesterRole,
          req.requestTitle,
          req.status,
          JSON.stringify(req.items),
          req.superiorAdminNotes || null,
          req.reviewedBy || null,
          req.reviewedAt || null,
          req.timedAccessWindow ? JSON.stringify(req.timedAccessWindow) : null,
        ]);
      }
      reqStmt.free();

      // Seed Backups
      const bkpStmt = this.db.prepare(
        `INSERT INTO backup_snapshots (
          id, timestamp, type, file_name, file_size_kb, folder_path, checksum,
          item_count, movement_count, department_count, manager_count, admin_count,
          description, issuer_id, issuer_name, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );
      for (const b of INITIAL_BACKUPS) {
        bkpStmt.run([
          b.id,
          b.timestamp,
          b.type,
          b.fileName,
          b.fileSizeKb,
          b.folderPath,
          b.checksum,
          b.itemCount,
          b.movementCount,
          b.departmentCount,
          b.managerCount,
          b.adminCount,
          b.description,
          b.issuerId,
          b.issuerName,
          JSON.stringify(b.payload),
        ]);
      }
      bkpStmt.free();
    }
  }

  private persistDb(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const base64 = this.uint8ArrayToBase64(data);
      localStorage.setItem(SQLITE_STORAGE_KEY, base64);
    } catch (err) {
      console.error('[SQLite Bridge] Error persisting database binary:', err);
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }

  // ===========================================================================
  // ASYNCHRONOUS CRUD & QUERY BRIDGE METHODS
  // ===========================================================================

  // 1. RAW SQL EXECUTION
  public async executeRawQuery(sql: string, params: any[] = []): Promise<{ columns: string[]; values: any[][] }> {
    const db = await this.getDb();
    if (db) {
      try {
        const res = db.exec(sql, params);
        this.persistDb();
        if (res.length > 0) {
          return { columns: res[0].columns, values: res[0].values };
        }
        return { columns: [], values: [] };
      } catch (err: any) {
        console.error('[SQLite Query Error]:', err);
        throw err;
      }
    }

    // Fallback SQL Query Executor for UI Query Studio
    this.initFallbackStore();
    const store = this.fallbackStore!;
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.includes('CATEGORY') && trimmed.includes('SUMIFS')) {
      const categories: Record<string, { skus: Set<string>; stock: number; issued: number }> = {};
      store.stock.forEach((s) => {
        if (!categories[s.Category]) categories[s.Category] = { skus: new Set(), stock: 0, issued: 0 };
        categories[s.Category].skus.add(s.ItemID);
        categories[s.Category].stock += s.Qty;
      });
      store.movementLogs.forEach((m) => {
        if (m.Type === 'ISSUE') {
          const item = store.stock.find((s) => s.ItemID === m.ItemID);
          const cat = item ? item.Category : 'General';
          if (categories[cat]) categories[cat].issued += m.Qty;
        }
      });
      const values = Object.entries(categories).map(([cat, data]) => [
        cat,
        data.skus.size,
        data.stock,
        data.issued,
      ]);
      return {
        columns: ['Category', 'Total_SKUs', 'Current_Stock_On_Hand', 'Total_Units_Issued'],
        values,
      };
    }

    if (trimmed.includes('REORDER') || trimmed.includes('LOW')) {
      const values = store.stock.map((s) => {
        const deficit = s.ReorderLevel - s.Qty;
        let status = 'HEALTHY';
        if (s.Qty <= 0) status = 'CRITICAL DEPLETION';
        else if (s.Qty <= s.ReorderLevel) status = 'REORDER REQUIRED';
        return [s.ItemID, s.ItemName, s.Category, s.Qty, s.ReorderLevel, deficit, status];
      });
      return {
        columns: ['SKU', 'Description', 'Category', 'Stock_On_Hand', 'Min_Threshold', 'Deficit_Units', 'Stock_Status'],
        values,
      };
    }

    if (trimmed.includes('DEPARTMENTS') || trimmed.includes('VLOOKUP')) {
      const values = store.movementLogs.slice(0, 15).map((m) => {
        const dept = store.departments.find((d) => d.DeptID === m.DeptID);
        return [
          m.id,
          m.Timestamp,
          m.Type,
          m.ItemID,
          m.ItemName,
          m.Qty,
          dept ? dept.DeptName : m.DeptName,
          dept ? dept.DeptHeadName : m.DeptHead,
          m.IssuerName,
        ];
      });
      return {
        columns: ['Log_ID', 'Event_Time', 'Movement_Type', 'SKU', 'Description', 'Quantity', 'Department_Name', 'Approver_Head', 'Logged_By'],
        values,
      };
    }

    if (trimmed.includes('PRAGMA') || trimmed.includes('SQLITE_MASTER')) {
      return {
        columns: ['Table_Name', 'Object_Type', 'SQL_Definition'],
        values: [
          ['master_stock', 'table', 'CREATE TABLE master_stock (item_id TEXT PRIMARY KEY, item_name TEXT, category TEXT, qty REAL, reorder_level REAL, unit TEXT);'],
          ['movement_log', 'table', 'CREATE TABLE movement_log (id TEXT PRIMARY KEY, timestamp DATETIME, type TEXT, item_id TEXT, qty REAL, dept_id TEXT, status TEXT);'],
          ['admin_users', 'table', 'CREATE TABLE admin_users (issuer_id TEXT PRIMARY KEY, issuer_name TEXT, role TEXT, active INTEGER);'],
          ['departments', 'table', 'CREATE TABLE departments (dept_id TEXT PRIMARY KEY, dept_name TEXT, dept_head_name TEXT);'],
        ],
      };
    }

    // Generic Stock Selection
    const values = store.stock.map((s) => [s.ItemID, s.ItemName, s.Category, s.Qty, s.ReorderLevel, s.Unit]);
    return {
      columns: ['SKU', 'Item_Name', 'Category', 'Stock_Qty', 'Reorder_Level', 'Unit'],
      values,
    };
  }

  // 2. MASTER STOCK CRUD
  public async getAllStock(): Promise<StockItem[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(
        'SELECT item_id, item_name, category, qty, reorder_level, unit, SupplierName, last_supplier, last_received_date, description FROM master_stock ORDER BY category ASC, item_id ASC;'
      );
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => {
        const supp = (row[6] as string) || (row[7] as string) || undefined;
        return {
          ItemID: row[0] as string,
          ItemName: row[1] as string,
          Category: row[2] as ItemCategory,
          Qty: Number(row[3]),
          ReorderLevel: Number(row[4]),
          Unit: row[5] as string,
          SupplierName: supp,
          LastSupplier: supp,
          LastReceivedDate: (row[8] as string) || undefined,
          Description: (row[9] as string) || undefined,
        };
      });
    }

    this.initFallbackStore();
    return this.fallbackStore!.stock;
  }

  public async addStockItem(item: StockItem): Promise<void> {
    const db = await this.getDb();
    const supp = item.SupplierName || item.LastSupplier || null;
    if (db) {
      db.run(
        'INSERT INTO master_stock (item_id, item_name, category, qty, reorder_level, unit, SupplierName, last_supplier, last_received_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [
          item.ItemID,
          item.ItemName,
          item.Category,
          item.Qty,
          item.ReorderLevel,
          item.Unit,
          supp,
          supp,
          item.LastReceivedDate || null,
          item.Description || null,
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    item.SupplierName = item.SupplierName || item.LastSupplier;
    item.LastSupplier = item.SupplierName || item.LastSupplier;
    this.fallbackStore!.stock.push(item);
    this.persistFallback();
  }

  public async updateStockItem(item: StockItem): Promise<void> {
    const db = await this.getDb();
    const supp = item.SupplierName || item.LastSupplier || null;
    if (db) {
      db.run(
        'UPDATE master_stock SET item_name = ?, category = ?, qty = ?, reorder_level = ?, unit = ?, SupplierName = ?, last_supplier = ?, last_received_date = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?;',
        [
          item.ItemName,
          item.Category,
          item.Qty,
          item.ReorderLevel,
          item.Unit,
          supp,
          supp,
          item.LastReceivedDate || null,
          item.Description || null,
          item.ItemID,
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    const idx = this.fallbackStore!.stock.findIndex((s) => s.ItemID === item.ItemID);
    if (idx !== -1) {
      item.SupplierName = supp || undefined;
      item.LastSupplier = supp || undefined;
      this.fallbackStore!.stock[idx] = item;
      this.persistFallback();
    }
  }

  public async updateStockSupplierAndDate(itemId: string, supplier: string, date: string): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        'UPDATE master_stock SET SupplierName = ?, last_supplier = ?, last_received_date = ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?;',
        [supplier, supplier, date, itemId]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    const match = this.fallbackStore!.stock.find((s) => s.ItemID === itemId);
    if (match) {
      match.SupplierName = supplier;
      match.LastSupplier = supplier;
      match.LastReceivedDate = date;
      this.persistFallback();
    }
  }

  /**
   * =========================================================================
   * UPGRADED WEIGHTED SEMANTIC SEARCH ENGINE (SQLite-Powered)
   * =========================================================================
   * Core Architecture & Benefits:
   * 1. Fast-Path Exact Identifier Prioritization (c):
   *    Immediately checks unique SKU identifiers (e.g., ST-001, CL-101, GN-202).
   *    Bypasses costly multi-token scoring for instant 0ms latency on barcodes/exact SKUs.
   * 2. Tokenization & Morphological Word Stemming (a):
   *    Deconstructs queries into distinct tokens and reduces words to grammatical roots
   *    (e.g., "bolts" -> "bolt", "cleaners" -> "cleaner", "papers" -> "paper").
   *    Dramatically increases recall for plurals and query variants.
   * 3. Tiered Field Weighting & Relevance Scoring (b):
   *    - Highest Priority: SKU / ItemID and Product Name (ItemName).
   *    - Medium Priority: Category.
   *    - Lower Priority: Product Description and Supplier.
   *    Ensures relevant product matches outrank generic matches in descriptive text.
   * 4. Edge Case Hardening: Handles empty inputs, mixed alphanumeric codes, and
   *    special punctuation safely.
   * =========================================================================
   */
  public async searchStockWeighted(
    query: string,
    categoryFilter: string = 'All',
    statusFilter: string = 'All'
  ): Promise<StockItem[]> {
    const rawTrimmed = (query || '').trim();

    // Edge Case: Empty input returns all filtered inventory
    if (!rawTrimmed) {
      const all = await this.getAllStock();
      return this.applyCategoryAndStatusFilters(all, categoryFilter, statusFilter);
    }

    const db = await this.getDb();

    // -----------------------------------------------------------------------
    // c. FAST-PATH: HIGH-SPEED PRE-QUERY CHECK FOR EXACT SKU MATCHES
    // Direct indexed candidate lookup prior to executing full-table scans
    // -----------------------------------------------------------------------
    const cleanRaw = rawTrimmed.toUpperCase();
    const cleanNorm = cleanRaw.replace(/[\s\-_]/g, '');

    if (db) {
      try {
        const exactStmt = db.prepare(
          `SELECT item_id, item_name, category, qty, reorder_level, unit, SupplierName, last_supplier, last_received_date, description
           FROM master_stock
           WHERE UPPER(TRIM(item_id)) = ?1
              OR REPLACE(REPLACE(REPLACE(UPPER(TRIM(item_id)), '-', ''), '_', ''), ' ', '') = ?2
           LIMIT 1;`
        );
        exactStmt.bind([cleanRaw, cleanNorm]);
        if (exactStmt.step()) {
          const row = exactStmt.get();
          exactStmt.free();
          const supp = (row[6] as string) || (row[7] as string) || undefined;
          const item: StockItem = {
            ItemID: row[0] as string,
            ItemName: row[1] as string,
            Category: row[2] as ItemCategory,
            Qty: Number(row[3]),
            ReorderLevel: Number(row[4]),
            Unit: row[5] as string,
            SupplierName: supp,
            LastSupplier: supp,
            LastReceivedDate: (row[8] as string) || undefined,
            Description: (row[9] as string) || undefined,
          };

          const [filteredExactItem] = this.applyCategoryAndStatusFilters([item], categoryFilter, statusFilter);
          if (filteredExactItem) {
            return [filteredExactItem];
          }
        } else {
          exactStmt.free();
        }
      } catch (err) {
        console.warn('SQLite exact SKU pre-query check error:', err);
      }
    } else {
      this.initFallbackStore();
      const exactMatch = this.fallbackStore!.stock.find((s) => {
        const sClean = s.ItemID.toUpperCase();
        const sNorm = sClean.replace(/[\s\-_]/g, '');
        return sClean === cleanRaw || sNorm === cleanNorm;
      });
      if (exactMatch) {
        const [filteredExactItem] = this.applyCategoryAndStatusFilters([exactMatch], categoryFilter, statusFilter);
        if (filteredExactItem) {
          return [filteredExactItem];
        }
      }
    }

    // -----------------------------------------------------------------------
    // a. TOKENIZATION AND WORD STEMMING
    // -----------------------------------------------------------------------
    const { tokens, stemmedTokens } = analyzeSearchQuery(rawTrimmed);
    if (tokens.length === 0) {
      const all = await this.getAllStock();
      return this.applyCategoryAndStatusFilters(all, categoryFilter, statusFilter);
    }

    // -----------------------------------------------------------------------
    // b. FIELD WEIGHTING & RELEVANCE SCORING
    // -----------------------------------------------------------------------
    if (db) {
      let sql = `SELECT item_id, item_name, category, qty, reorder_level, unit, SupplierName, last_supplier, last_received_date, description FROM master_stock`;
      const params: any[] = [];

      if (categoryFilter !== 'All') {
        sql += ` WHERE category = ?`;
        params.push(categoryFilter);
      }

      sql += ` ORDER BY category ASC, item_id ASC;`;

      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);

      const candidates: StockItem[] = [];
      while (stmt.step()) {
        const row = stmt.get();
        const supp = (row[6] as string) || (row[7] as string) || undefined;
        candidates.push({
          ItemID: row[0] as string,
          ItemName: row[1] as string,
          Category: row[2] as ItemCategory,
          Qty: Number(row[3]),
          ReorderLevel: Number(row[4]),
          Unit: row[5] as string,
          SupplierName: supp,
          LastSupplier: supp,
          LastReceivedDate: (row[8] as string) || undefined,
          Description: (row[9] as string) || undefined,
        });
      }
      stmt.free();

      return this.scoreAndRankItems(candidates, rawTrimmed, tokens, stemmedTokens, statusFilter);
    }

    // Fallback store evaluation
    this.initFallbackStore();
    let candidates = [...this.fallbackStore!.stock];
    if (categoryFilter !== 'All') {
      candidates = candidates.filter((c) => c.Category === categoryFilter);
    }
    return this.scoreAndRankItems(candidates, rawTrimmed, tokens, stemmedTokens, statusFilter);
  }

  private applyCategoryAndStatusFilters(
    items: StockItem[],
    categoryFilter: string = 'All',
    statusFilter: string = 'All'
  ): StockItem[] {
    let res = items;
    if (categoryFilter !== 'All') {
      res = res.filter((i) => i.Category === categoryFilter);
    }
    if (statusFilter !== 'All') {
      res = res.filter((i) => {
        const qty = Number(i.Qty) || 0;
        const reorder = Number(i.ReorderLevel) || 10;
        switch (statusFilter) {
          case 'out_of_stock':
            return qty <= 0;
          case 'critical':
            return qty > 0 && qty <= Math.ceil(reorder * 0.5);
          case 'low_stock':
            return qty <= reorder;
          case 'optimal':
            return qty > reorder;
          default:
            return true;
        }
      });
    }
    return res;
  }

  private scoreAndRankItems(
    candidates: StockItem[],
    rawQuery: string,
    tokens: string[],
    stemmedTokens: string[],
    statusFilter: string = 'All'
  ): StockItem[] {
    const queryLower = rawQuery.toLowerCase().trim();
    const queryNoSep = queryLower.replace(/[-_\s]/g, '');

    const scored: Array<{ item: StockItem; score: number }> = [];

    for (const item of candidates) {
      const idLower = item.ItemID.toLowerCase();
      const idNoSep = idLower.replace(/[-_\s]/g, '');
      const nameLower = item.ItemName.toLowerCase();
      const catLower = item.Category.toLowerCase();
      const descLower = (item.Description || '').toLowerCase();
      const suppLower = (item.LastSupplier || '').toLowerCase();

      let score = 0;
      let matchedAny = false;

      // Tier 1 Fast-Path checks (Highest priority)
      if (idLower === queryLower || idNoSep === queryNoSep) {
        score += 1200;
        matchedAny = true;
      } else if (idLower.startsWith(queryLower) || idNoSep.startsWith(queryNoSep)) {
        score += 600;
        matchedAny = true;
      } else if (nameLower === queryLower) {
        score += 500;
        matchedAny = true;
      } else if (nameLower.startsWith(queryLower)) {
        score += 300;
        matchedAny = true;
      }

      // Tiered Field Weighting: SKU / Name > Description
      let tokensMatchedCount = 0;

      for (const token of tokens) {
        const tokenNoSep = token.replace(/[-_\s]/g, '');
        const stem = stemWord(token);
        let tokenMatched = false;

        // Tier 1 (Highest Priority): SKU / Product Code
        if (idLower.includes(token) || (tokenNoSep.length >= 2 && idNoSep.includes(tokenNoSep))) {
          score += 350;
          tokenMatched = true;
        } else if (stem && stem !== token && idLower.includes(stem)) {
          score += 200;
          tokenMatched = true;
        }

        // Tier 1 (Highest Priority): Product Name
        if (nameLower.includes(token)) {
          score += 260;
          tokenMatched = true;
        } else if (stem && stem !== token && nameLower.includes(stem)) {
          score += 160;
          tokenMatched = true;
        }

        // Tier 2: Category
        if (catLower.includes(token)) {
          score += 50;
          tokenMatched = true;
        }

        // Tier 3 (Lower Priority): Product Description (Matches here strictly outranked by SKU & Name)
        if (descLower && descLower.includes(token)) {
          score += 20;
          tokenMatched = true;
        } else if (descLower && stem && stem !== token && descLower.includes(stem)) {
          score += 10;
          tokenMatched = true;
        }

        // Tier 3: Supplier
        if (suppLower && suppLower.includes(token)) {
          score += 25;
          tokenMatched = true;
        }

        if (tokenMatched) {
          tokensMatchedCount++;
          matchedAny = true;
        }
      }

      // Multi-word exact coverage bonus
      if (tokens.length > 1 && tokensMatchedCount === tokens.length) {
        score += 200;
      }

      if (matchedAny && score > 0) {
        scored.push({ item, score });
      }
    }

    // Filter by stock status if active
    let filtered = scored;
    if (statusFilter !== 'All') {
      filtered = filtered.filter(({ item }) => {
        const qty = Number(item.Qty) || 0;
        const reorder = Number(item.ReorderLevel) || 10;
        switch (statusFilter) {
          case 'out_of_stock':
            return qty <= 0;
          case 'critical':
            return qty > 0 && qty <= Math.ceil(reorder * 0.5);
          case 'low_stock':
            return qty <= reorder;
          case 'optimal':
            return qty > reorder;
          default:
            return true;
        }
      });
    }

    // Sort by relevance score descending
    filtered.sort((a, b) => b.score - a.score || a.item.ItemID.localeCompare(b.item.ItemID));

    return filtered.map((s) => s.item);
  }

  public async updateStockItemName(itemId: string, newName: string): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        'UPDATE master_stock SET item_name = ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?;',
        [newName, itemId]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    const match = this.fallbackStore!.stock.find((s) => s.ItemID === itemId);
    if (match) {
      match.ItemName = newName;
      this.persistFallback();
    }
  }

  public async deleteStockItem(itemId: string): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run('DELETE FROM master_stock WHERE item_id = ?;', [itemId]);
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.stock = this.fallbackStore!.stock.filter((s) => s.ItemID !== itemId);
    this.persistFallback();
  }

  public async updateStockQty(itemId: string, newQty: number, supplier?: string, receivedDate?: string): Promise<void> {
    const db = await this.getDb();
    if (db) {
      if (supplier || receivedDate) {
        db.run(
          `UPDATE master_stock 
           SET qty = ?, 
               SupplierName = COALESCE(?, SupplierName, last_supplier),
               last_supplier = COALESCE(?, last_supplier), 
               last_received_date = COALESCE(?, last_received_date),
               updated_at = CURRENT_TIMESTAMP 
           WHERE item_id = ?;`,
          [newQty, supplier || null, supplier || null, receivedDate || null, itemId]
        );
      } else {
        db.run(
          'UPDATE master_stock SET qty = ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?;',
          [newQty, itemId]
        );
      }
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    const match = this.fallbackStore!.stock.find((s) => s.ItemID === itemId);
    if (match) {
      match.Qty = newQty;
      if (supplier) {
        match.SupplierName = supplier;
        match.LastSupplier = supplier;
      }
      if (receivedDate) match.LastReceivedDate = receivedDate;
      this.persistFallback();
    }
  }

  // 3. MOVEMENT AUDIT LOGS CRUD
  public async getAllMovementLogs(): Promise<MovementLogEntry[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(`
        SELECT 
          id, timestamp, type, item_id, item_name, qty, dept_id, dept_name, dept_head, dept_email,
          issuer_id, issuer_name, SupplierName, doc_ref, slip_file_name, status, discrepancy_reason, discrepancy_notes, count_ref
        FROM movement_log 
        ORDER BY timestamp DESC, id DESC;
      `);
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => ({
        id: row[0] as string,
        Timestamp: row[1] as string,
        Type: row[2] as any,
        ItemID: row[3] as string,
        ItemName: row[4] as string,
        Qty: Number(row[5]),
        DeptID: row[6] as string,
        DeptName: row[7] as string,
        DeptHead: row[8] as string,
        DeptEmail: row[9] as string,
        IssuerID: row[10] as string,
        IssuerName: row[11] as string,
        SupplierName: (row[12] as string) || undefined,
        DocumentRef: row[13] as string,
        IssueSlipFileName: row[14] as string,
        Status: row[15] as any,
        DiscrepancyReason: row[16] as string | undefined,
        DiscrepancyNotes: row[17] as string | undefined,
        CountRef: row[18] as string | undefined,
      }));
    }

    this.initFallbackStore();
    return this.fallbackStore!.movementLogs;
  }

  public async addMovementLog(log: MovementLogEntry): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        `INSERT INTO movement_log (
          id, timestamp, type, item_id, item_name, qty, dept_id, dept_name, dept_head, dept_email,
          issuer_id, issuer_name, SupplierName, doc_ref, slip_file_name, status, discrepancy_reason, discrepancy_notes, count_ref
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          log.id,
          log.Timestamp,
          log.Type,
          log.ItemID,
          log.ItemName,
          log.Qty,
          log.DeptID,
          log.DeptName,
          log.DeptHead,
          log.DeptEmail,
          log.IssuerID,
          log.IssuerName || '',
          log.SupplierName || null,
          log.DocumentRef || '',
          log.IssueSlipFileName || '',
          log.Status,
          log.DiscrepancyReason || null,
          log.DiscrepancyNotes || null,
          log.CountRef || null,
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.movementLogs.unshift(log);
    this.persistFallback();
  }

  public async addBulkMovementLogs(logs: MovementLogEntry[]): Promise<void> {
    const db = await this.getDb();
    if (db) {
      const stmt = db.prepare(
        `INSERT INTO movement_log (
          id, timestamp, type, item_id, item_name, qty, dept_id, dept_name, dept_head, dept_email,
          issuer_id, issuer_name, SupplierName, doc_ref, slip_file_name, status, discrepancy_reason, discrepancy_notes, count_ref
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );
      for (const log of logs) {
        stmt.run([
          log.id,
          log.Timestamp,
          log.Type,
          log.ItemID,
          log.ItemName,
          log.Qty,
          log.DeptID,
          log.DeptName,
          log.DeptHead,
          log.DeptEmail,
          log.IssuerID,
          log.IssuerName || '',
          log.SupplierName || null,
          log.DocumentRef || '',
          log.IssueSlipFileName || '',
          log.Status,
          log.DiscrepancyReason || null,
          log.DiscrepancyNotes || null,
          log.CountRef || null,
        ]);
      }
      stmt.free();
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.movementLogs.unshift(...logs);
    this.persistFallback();
  }

  // 4. ADMIN USERS CRUD
  public async getAllAdmins(): Promise<AdminUser[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(
        'SELECT issuer_id, issuer_name, role, secret_password, active FROM admin_users ORDER BY issuer_id ASC;'
      );
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => ({
        IssuerID: row[0] as string,
        IssuerName: row[1] as string,
        Role: row[2] as string,
        SecretPassword: row[3] as string,
        Active: Boolean(row[4]),
      }));
    }

    this.initFallbackStore();
    return this.fallbackStore!.admins;
  }

  public async addAdmin(admin: AdminUser): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        'INSERT INTO admin_users (issuer_id, issuer_name, role, secret_password, active) VALUES (?, ?, ?, ?, ?);',
        [admin.IssuerID, admin.IssuerName, admin.Role, admin.SecretPassword, admin.Active ? 1 : 0]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.admins.push(admin);
    this.persistFallback();
  }

  public async updateAdmin(admin: AdminUser): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        'UPDATE admin_users SET issuer_name = ?, role = ?, secret_password = ?, active = ? WHERE issuer_id = ?;',
        [admin.IssuerName, admin.Role, admin.SecretPassword, admin.Active ? 1 : 0, admin.IssuerID]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    const idx = this.fallbackStore!.admins.findIndex((a) => a.IssuerID === admin.IssuerID);
    if (idx !== -1) {
      this.fallbackStore!.admins[idx] = admin;
      this.persistFallback();
    }
  }

  public async deleteAdmin(issuerId: string): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run('DELETE FROM admin_users WHERE issuer_id = ?;', [issuerId]);
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.admins = this.fallbackStore!.admins.filter((a) => a.IssuerID !== issuerId);
    this.persistFallback();
  }

  // 5. DEPARTMENTS CRUD
  public async getAllDepartments(): Promise<Department[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(
        'SELECT dept_id, dept_name, dept_head_name, dept_head_email FROM departments ORDER BY dept_id ASC;'
      );
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => ({
        DeptID: row[0] as string,
        DeptName: row[1] as string,
        DeptHeadName: row[2] as string,
        DeptHeadEmail: row[3] as string,
      }));
    }

    this.initFallbackStore();
    return this.fallbackStore!.departments;
  }

  public async addDepartment(dept: Department): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        'INSERT INTO departments (dept_id, dept_name, dept_head_name, dept_head_email) VALUES (?, ?, ?, ?);',
        [dept.DeptID, dept.DeptName, dept.DeptHeadName, dept.DeptHeadEmail]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.departments.push(dept);
    this.persistFallback();
  }

  public async updateDepartment(dept: Department): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        'UPDATE departments SET dept_name = ?, dept_head_name = ?, dept_head_email = ? WHERE dept_id = ?;',
        [dept.DeptName, dept.DeptHeadName, dept.DeptHeadEmail, dept.DeptID]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    const idx = this.fallbackStore!.departments.findIndex((d) => d.DeptID === dept.DeptID);
    if (idx !== -1) {
      this.fallbackStore!.departments[idx] = dept;
      this.persistFallback();
    }
  }

  public async deleteDepartment(deptId: string): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run('DELETE FROM departments WHERE dept_id = ?;', [deptId]);
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.departments = this.fallbackStore!.departments.filter((d) => d.DeptID !== deptId);
    this.persistFallback();
  }

  // 6. MANAGERS CRUD
  public async getAllManagers(): Promise<Manager[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec('SELECT manager_id, manager_name, email FROM managers ORDER BY manager_id ASC;');
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => ({
        ManagerID: row[0] as string,
        ManagerName: row[1] as string,
        Email: row[2] as string,
      }));
    }

    this.initFallbackStore();
    return this.fallbackStore!.managers;
  }

  public async addManager(mgr: Manager): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run('INSERT INTO managers (manager_id, manager_name, email) VALUES (?, ?, ?);', [
        mgr.ManagerID,
        mgr.ManagerName,
        mgr.Email,
      ]);
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.managers.push(mgr);
    this.persistFallback();
  }

  public async updateManager(mgr: Manager): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run('UPDATE managers SET manager_name = ?, email = ? WHERE manager_id = ?;', [
        mgr.ManagerName,
        mgr.Email,
        mgr.ManagerID,
      ]);
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    const idx = this.fallbackStore!.managers.findIndex((m) => m.ManagerID === mgr.ManagerID);
    if (idx !== -1) {
      this.fallbackStore!.managers[idx] = mgr;
      this.persistFallback();
    }
  }

  public async deleteManager(mgrId: string): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run('DELETE FROM managers WHERE manager_id = ?;', [mgrId]);
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.managers = this.fallbackStore!.managers.filter((m) => m.ManagerID !== mgrId);
    this.persistFallback();
  }

  // 7. ISSUED DOCUMENTS CRUD
  public async getAllIssuedDocs(): Promise<IssuedDocument[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(`
        SELECT slip_number, timestamp, dept_id, dept_name, dept_head_name, dept_head_email,
               issuer_id, issuer_name, items_json, pdf_file_name, folder_path, full_saved_path
        FROM issued_documents ORDER BY timestamp DESC;
      `);
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => {
        let items: any[] = [];
        try {
          const parsed = JSON.parse(row[8] as string);
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          items = [];
        }
        return {
          docType: 'ISSUE',
          slipNumber: row[0] as string,
          timestamp: row[1] as string,
          deptID: row[2] as string,
          deptName: row[3] as string,
          deptHeadName: row[4] as string,
          deptHeadEmail: row[5] as string,
          issuerID: row[6] as string,
          issuerName: row[7] as string,
          items,
          pdfFileName: (row[9] as string) || undefined,
          folderPath: (row[10] as string) || undefined,
          fullSavedPath: (row[11] as string) || undefined,
        };
      });
    }

    this.initFallbackStore();
    return this.fallbackStore?.issuedDocs || [];
  }

  public async addIssuedDoc(doc: IssuedDocument): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        `INSERT INTO issued_documents (
          slip_number, timestamp, dept_id, dept_name, dept_head_name, dept_head_email,
          issuer_id, issuer_name, items_json, pdf_file_name, folder_path, full_saved_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          doc.slipNumber,
          doc.timestamp,
          doc.deptID,
          doc.deptName,
          doc.deptHeadName,
          doc.deptHeadEmail,
          doc.issuerID,
          doc.issuerName,
          JSON.stringify(doc.items),
          doc.pdfFileName || null,
          doc.folderPath || null,
          doc.fullSavedPath || null,
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.issuedDocs.unshift(doc);
    this.persistFallback();
  }

  // 8. RECEIVED DOCUMENTS CRUD
  public async getAllReceivedDocs(): Promise<ReceivedDocument[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(`
        SELECT voucher_number, timestamp, delivery_ref, SupplierName, supplier, issuer_id, issuer_name, issuer_role,
               items_json, pdf_file_name, folder_path, full_saved_path
        FROM received_documents ORDER BY timestamp DESC;
      `);
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => {
        let items: any[] = [];
        try {
          const parsed = JSON.parse(row[8] as string);
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          items = [];
        }
        const supp = (row[3] as string) || (row[4] as string) || undefined;
        return {
          docType: 'DELIVERY',
          voucherNumber: row[0] as string,
          timestamp: row[1] as string,
          deliveryRef: row[2] as string,
          SupplierName: supp,
          supplier: supp,
          issuerID: row[5] as string,
          issuerName: row[6] as string,
          issuerRole: (row[7] as string) || undefined,
          items,
          pdfFileName: (row[9] as string) || undefined,
          folderPath: (row[10] as string) || undefined,
          fullSavedPath: (row[11] as string) || undefined,
        };
      });
    }

    this.initFallbackStore();
    return this.fallbackStore?.receivedDocs || [];
  }

  public async addReceivedDoc(doc: ReceivedDocument): Promise<void> {
    const db = await this.getDb();
    const supp = doc.SupplierName || doc.supplier || null;
    if (db) {
      db.run(
        `INSERT INTO received_documents (
          voucher_number, timestamp, delivery_ref, SupplierName, supplier, issuer_id, issuer_name, issuer_role,
          items_json, pdf_file_name, folder_path, full_saved_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          doc.voucherNumber,
          doc.timestamp,
          doc.deliveryRef,
          supp,
          supp,
          doc.issuerID,
          doc.issuerName,
          doc.issuerRole || null,
          JSON.stringify(doc.items),
          doc.pdfFileName || null,
          doc.folderPath || null,
          doc.fullSavedPath || null,
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    doc.SupplierName = supp || undefined;
    doc.supplier = supp || undefined;
    this.fallbackStore!.receivedDocs.unshift(doc);
    this.persistFallback();
  }

  // 9. ADJUSTMENT DOCUMENTS CRUD
  public async getAllAdjustmentDocs(): Promise<AdjustmentDocument[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(`
        SELECT voucher_number, timestamp, count_ref, reason_code, reason_label, notes,
               issuer_id, issuer_name, issuer_role, items_json, pdf_file_name, folder_path, full_saved_path
        FROM adjustment_documents ORDER BY timestamp DESC;
      `);
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => {
        let items: any[] = [];
        try {
          const parsed = JSON.parse(row[9] as string);
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          items = [];
        }
        return {
          docType: 'ADJUSTMENT',
          voucherNumber: row[0] as string,
          timestamp: row[1] as string,
          countRef: row[2] as string,
          reasonCode: row[3] as AdjustmentReasonCode,
          reasonLabel: row[4] as string,
          notes: (row[5] as string) || undefined,
          issuerID: row[6] as string,
          issuerName: row[7] as string,
          issuerRole: (row[8] as string) || undefined,
          items,
          pdfFileName: (row[10] as string) || undefined,
          folderPath: (row[11] as string) || undefined,
          fullSavedPath: (row[12] as string) || undefined,
        };
      });
    }

    this.initFallbackStore();
    return this.fallbackStore?.adjustmentDocs || [];
  }

  public async addAdjustmentDoc(doc: AdjustmentDocument): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        `INSERT INTO adjustment_documents (
          voucher_number, timestamp, count_ref, reason_code, reason_label, notes,
          issuer_id, issuer_name, issuer_role, items_json, pdf_file_name, folder_path, full_saved_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          doc.voucherNumber,
          doc.timestamp,
          doc.countRef,
          doc.reasonCode,
          doc.reasonLabel,
          doc.notes || null,
          doc.issuerID,
          doc.issuerName,
          doc.issuerRole || null,
          JSON.stringify(doc.items),
          doc.pdfFileName || null,
          doc.folderPath || null,
          doc.fullSavedPath || null,
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.adjustmentDocs.unshift(doc);
    this.persistFallback();
  }

  // 10. STOCK ADJUSTMENT REQUESTS CRUD
  public async getAllAdjustmentRequests(): Promise<StockAdjustmentRequest[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(`
        SELECT id, created_at, requester_id, requester_name, requester_role, request_title,
               status, items_json, superior_admin_notes, reviewed_by, reviewed_at, timed_access_json
        FROM adjustment_requests ORDER BY created_at DESC;
      `);
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => {
        let items: any[] = [];
        try {
          const parsed = JSON.parse(row[7] as string);
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          items = [];
        }
        let timedAccessWindow: any = undefined;
        if (row[11]) {
          try {
            timedAccessWindow = JSON.parse(row[11] as string);
          } catch {
            timedAccessWindow = undefined;
          }
        }
        return {
          id: row[0] as string,
          createdAt: row[1] as string,
          requesterId: row[2] as string,
          requesterName: row[3] as string,
          requesterRole: row[4] as string,
          requestTitle: row[5] as string,
          status: row[6] as any,
          items,
          superiorAdminNotes: (row[8] as string) || undefined,
          reviewedBy: (row[9] as string) || undefined,
          reviewedAt: (row[10] as string) || undefined,
          timedAccessWindow,
        };
      });
    }

    this.initFallbackStore();
    return this.fallbackStore!.adjustmentRequests;
  }

  public async addAdjustmentRequest(req: StockAdjustmentRequest): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        `INSERT INTO adjustment_requests (
          id, created_at, requester_id, requester_name, requester_role, request_title,
          status, items_json, superior_admin_notes, reviewed_by, reviewed_at, timed_access_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          req.id,
          req.createdAt,
          req.requesterId,
          req.requesterName,
          req.requesterRole,
          req.requestTitle,
          req.status,
          JSON.stringify(req.items),
          req.superiorAdminNotes || null,
          req.reviewedBy || null,
          req.reviewedAt || null,
          req.timedAccessWindow ? JSON.stringify(req.timedAccessWindow) : null,
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.adjustmentRequests.unshift(req);
    this.persistFallback();
  }

  public async updateAdjustmentRequest(req: StockAdjustmentRequest): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        `UPDATE adjustment_requests SET 
          status = ?, superior_admin_notes = ?, reviewed_by = ?, reviewed_at = ?, timed_access_json = ?
        WHERE id = ?;`,
        [
          req.status,
          req.superiorAdminNotes || null,
          req.reviewedBy || null,
          req.reviewedAt || null,
          req.timedAccessWindow ? JSON.stringify(req.timedAccessWindow) : null,
          req.id,
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    const idx = this.fallbackStore!.adjustmentRequests.findIndex((r) => r.id === req.id);
    if (idx !== -1) {
      this.fallbackStore!.adjustmentRequests[idx] = req;
      this.persistFallback();
    }
  }

  // 11. BACKUPS CRUD
  public async getAllBackups(): Promise<BackupSnapshot[]> {
    const db = await this.getDb();
    if (db) {
      const res = db.exec(`
        SELECT id, timestamp, type, file_name, file_size_kb, folder_path, checksum,
               item_count, movement_count, department_count, manager_count, admin_count,
               description, issuer_id, issuer_name, payload_json
        FROM backup_snapshots ORDER BY timestamp DESC;
      `);
      if (!res.length || !res[0].values) return [];
      return res[0].values.map((row) => ({
        id: row[0] as string,
        timestamp: row[1] as string,
        type: row[2] as any,
        fileName: row[3] as string,
        fileSizeKb: Number(row[4]),
        folderPath: row[5] as string,
        checksum: row[6] as string,
        itemCount: Number(row[7]),
        movementCount: Number(row[8]),
        departmentCount: Number(row[9]),
        managerCount: Number(row[10]),
        adminCount: Number(row[11]),
        description: (row[12] as string) || undefined,
        issuerId: row[13] as string,
        issuerName: row[14] as string,
        payload: JSON.parse(row[15] as string),
      }));
    }

    this.initFallbackStore();
    return this.fallbackStore!.backups;
  }

  public async addBackup(snap: BackupSnapshot): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run(
        `INSERT INTO backup_snapshots (
          id, timestamp, type, file_name, file_size_kb, folder_path, checksum,
          item_count, movement_count, department_count, manager_count, admin_count,
          description, issuer_id, issuer_name, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          snap.id,
          snap.timestamp,
          snap.type,
          snap.fileName,
          snap.fileSizeKb,
          snap.folderPath,
          snap.checksum,
          snap.itemCount,
          snap.movementCount,
          snap.departmentCount,
          snap.managerCount,
          snap.adminCount,
          snap.description || null,
          snap.issuerId,
          snap.issuerName,
          JSON.stringify(snap.payload),
        ]
      );
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.backups.unshift(snap);
    this.persistFallback();
  }

  public async deleteBackup(snapId: string): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run('DELETE FROM backup_snapshots WHERE id = ?;', [snapId]);
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.backups = this.fallbackStore!.backups.filter((b) => b.id !== snapId);
    this.persistFallback();
  }

  public async pruneBackups(retentionDays = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');

    const db = await this.getDb();
    if (db) {
      db.run("DELETE FROM backup_snapshots WHERE timestamp < ? AND type NOT IN ('SYSTEM_PRE_RESTORE', 'PRE_RESTORE');", [
        cutoffStr,
      ]);
      this.persistDb();
      return;
    }

    this.initFallbackStore();
    this.fallbackStore!.backups = this.fallbackStore!.backups.filter(
      (b) => new Date(b.timestamp).getTime() >= cutoffDate.getTime() || b.type.includes('PRE_RESTORE')
    );
    this.persistFallback();
  }

  // 12. RESTORE AND RESET
  public async restoreFromPayload(payload: any): Promise<void> {
    const db = await this.getDb();
    if (db) {
      db.run('BEGIN TRANSACTION;');
      try {
        if (payload.stockItems) {
          db.run('DELETE FROM master_stock;');
          const stmt = db.prepare(
            'INSERT INTO master_stock (item_id, item_name, category, qty, reorder_level, unit) VALUES (?, ?, ?, ?, ?, ?);'
          );
          for (const item of payload.stockItems) {
            stmt.run([item.ItemID, item.ItemName, item.Category, item.Qty, item.ReorderLevel, item.Unit]);
          }
          stmt.free();
        }

        if (payload.movementLogs) {
          db.run('DELETE FROM movement_log;');
          const stmt = db.prepare(
            `INSERT INTO movement_log (
              id, timestamp, type, item_id, item_name, qty, dept_id, dept_name, dept_head, dept_email,
              issuer_id, issuer_name, doc_ref, slip_file_name, status, discrepancy_reason, discrepancy_notes, count_ref
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
          );
          for (const l of payload.movementLogs) {
            stmt.run([
              l.id,
              l.Timestamp,
              l.Type,
              l.ItemID,
              l.ItemName,
              l.Qty,
              l.DeptID,
              l.DeptName,
              l.DeptHead,
              l.DeptEmail,
              l.IssuerID,
              l.IssuerName || '',
              l.DocumentRef || '',
              l.IssueSlipFileName || '',
              l.Status,
              l.DiscrepancyReason || null,
              l.DiscrepancyNotes || null,
              l.CountRef || null,
            ]);
          }
          stmt.free();
        }

        if (payload.admins) {
          db.run('DELETE FROM admin_users;');
          const stmt = db.prepare(
            'INSERT INTO admin_users (issuer_id, issuer_name, role, secret_password, active) VALUES (?, ?, ?, ?, ?);'
          );
          for (const adm of payload.admins) {
            stmt.run([adm.IssuerID, adm.IssuerName, adm.Role, adm.SecretPassword, adm.Active ? 1 : 0]);
          }
          stmt.free();
        }

        if (payload.departments) {
          db.run('DELETE FROM departments;');
          const stmt = db.prepare(
            'INSERT INTO departments (dept_id, dept_name, dept_head_name, dept_head_email) VALUES (?, ?, ?, ?);'
          );
          for (const d of payload.departments) {
            stmt.run([d.DeptID, d.DeptName, d.DeptHeadName, d.DeptHeadEmail]);
          }
          stmt.free();
        }

        if (payload.managers) {
          db.run('DELETE FROM managers;');
          const stmt = db.prepare(
            'INSERT INTO managers (manager_id, manager_name, email) VALUES (?, ?, ?);'
          );
          for (const m of payload.managers) {
            stmt.run([m.ManagerID, m.ManagerName, m.Email]);
          }
          stmt.free();
        }

        if (payload.issuedDocs) {
          db.run('DELETE FROM issued_documents;');
          for (const doc of payload.issuedDocs) {
            await this.addIssuedDoc(doc);
          }
        }

        if (payload.receivedDocs) {
          db.run('DELETE FROM received_documents;');
          for (const doc of payload.receivedDocs) {
            await this.addReceivedDoc(doc);
          }
        }

        if (payload.adjustmentDocs) {
          db.run('DELETE FROM adjustment_documents;');
          for (const doc of payload.adjustmentDocs) {
            await this.addAdjustmentDoc(doc);
          }
        }

        db.run('COMMIT;');
        this.persistDb();
        return;
      } catch (err) {
        db.run('ROLLBACK;');
        throw err;
      }
    }

    this.initFallbackStore();
    if (payload.stockItems) this.fallbackStore!.stock = JSON.parse(JSON.stringify(payload.stockItems));
    if (payload.movementLogs) this.fallbackStore!.movementLogs = JSON.parse(JSON.stringify(payload.movementLogs));
    if (payload.admins) this.fallbackStore!.admins = JSON.parse(JSON.stringify(payload.admins));
    if (payload.departments) this.fallbackStore!.departments = JSON.parse(JSON.stringify(payload.departments));
    if (payload.managers) this.fallbackStore!.managers = JSON.parse(JSON.stringify(payload.managers));
    if (payload.issuedDocs) this.fallbackStore!.issuedDocs = JSON.parse(JSON.stringify(payload.issuedDocs));
    if (payload.receivedDocs) this.fallbackStore!.receivedDocs = JSON.parse(JSON.stringify(payload.receivedDocs));
    if (payload.adjustmentDocs) this.fallbackStore!.adjustmentDocs = JSON.parse(JSON.stringify(payload.adjustmentDocs));
    this.persistFallback();
  }

  /**
   * Replays an offline mutation from the persistent sync-queue into the SQLite database
   * to guarantee zero data loss when the client or background sync reconnects.
   */
  public async replayMutation(mutation: {
    id: string;
    type: string;
    payload: any;
    timestamp?: number;
    clientId?: string;
  }): Promise<boolean> {
    try {
      const { type, payload } = mutation;
      if (!payload) return false;

      switch (type) {
        case 'STOCK_UPDATE': {
          if (payload.ItemID && typeof payload.Qty === 'number') {
            await this.updateStockQty(payload.ItemID, payload.Qty);
          }
          break;
        }

        case 'STOCK_BATCH': {
          if (Array.isArray(payload)) {
            for (const item of payload) {
              if (item.ItemID && typeof item.Qty === 'number') {
                await this.updateStockQty(item.ItemID, item.Qty);
              }
            }
          }
          break;
        }

        case 'ISSUE_TRANSACTION': {
          if (payload.stockUpdates && Array.isArray(payload.stockUpdates)) {
            for (const s of payload.stockUpdates) {
              if (s.ItemID && typeof s.Qty === 'number') {
                await this.updateStockQty(s.ItemID, s.Qty);
              }
            }
          }
          if (payload.movementLogs && Array.isArray(payload.movementLogs)) {
            await this.addBulkMovementLogs(payload.movementLogs);
          }
          if (payload.issueDoc) {
            await this.addIssuedDoc(payload.issueDoc);
          }
          break;
        }

        case 'DELIVERY_TRANSACTION': {
          if (payload.stockUpdates && Array.isArray(payload.stockUpdates)) {
            for (const s of payload.stockUpdates) {
              if (s.ItemID && typeof s.Qty === 'number') {
                await this.updateStockQty(s.ItemID, s.Qty);
              }
            }
          }
          if (payload.movementLogs && Array.isArray(payload.movementLogs)) {
            await this.addBulkMovementLogs(payload.movementLogs);
          }
          if (payload.recvDoc) {
            await this.addReceivedDoc(payload.recvDoc);
          }
          break;
        }

        case 'ADJUSTMENT_TRANSACTION': {
          if (payload.stockUpdates && Array.isArray(payload.stockUpdates)) {
            for (const s of payload.stockUpdates) {
              if (s.ItemID && typeof s.Qty === 'number') {
                await this.updateStockQty(s.ItemID, s.Qty);
              }
            }
          }
          if (payload.movementLogs && Array.isArray(payload.movementLogs)) {
            await this.addBulkMovementLogs(payload.movementLogs);
          }
          if (payload.adjDoc) {
            await this.addAdjustmentDoc(payload.adjDoc);
          }
          break;
        }

        case 'ADJUSTMENT_REQUEST': {
          const existing = await this.getAllAdjustmentRequests();
          const match = existing.find((r) => r.id === payload.id);
          if (match) {
            await this.updateAdjustmentRequest(payload);
          } else {
            await this.addAdjustmentRequest(payload);
          }
          break;
        }

        case 'DEPARTMENT_UPDATE': {
          const existing = await this.getAllDepartments();
          const match = existing.find((d) => d.DeptID === payload.DeptID);
          if (match) {
            await this.updateDepartment(payload);
          } else {
            await this.addDepartment(payload);
          }
          break;
        }

        case 'MANAGER_UPDATE': {
          const existing = await this.getAllManagers();
          const match = existing.find((m) => m.ManagerID === payload.ManagerID);
          if (match) {
            await this.updateManager(payload);
          } else {
            await this.addManager(payload);
          }
          break;
        }

        case 'ADMIN_UPDATE': {
          const existing = await this.getAllAdmins();
          const match = existing.find((a) => a.IssuerID === payload.IssuerID);
          if (match) {
            await this.updateAdmin(payload);
          } else {
            await this.addAdmin(payload);
          }
          break;
        }

        default:
          console.warn('[SQLite Bridge] Unknown mutation type to replay:', type);
          return false;
      }
      return true;
    } catch (err) {
      console.error('[SQLite Bridge] Failed to replay mutation into SQLite:', err);
      return false;
    }
  }

  public async resetAllData(): Promise<void> {
    localStorage.removeItem(SQLITE_STORAGE_KEY);
    localStorage.removeItem(FALLBACK_STORAGE_KEY);
    this.fallbackStore = null;

    if (this.db) {
      try {
        this.db.close();
      } catch (e) {
        // ignore
      }
      this.db = null;
    }
    this.initPromise = null;
    await this.getDb();
  }
}

export const sqliteBridge = new SqliteBridge();
