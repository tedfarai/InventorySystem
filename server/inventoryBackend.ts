import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import {
  INITIAL_ADJUSTMENT_REQUESTS,
  INITIAL_DEPARTMENTS,
  INITIAL_LOGS,
  INITIAL_MANAGERS,
  INITIAL_STOCK,
} from '../src/data/initialData';
import type {
  AdjustmentDocument,
  AdminUser,
  BackupSnapshot,
  Department,
  IssuedDocument,
  Manager,
  MovementLogEntry,
  ReceivedDocument,
  StockAdjustmentRequest,
  StockItem,
} from '../src/types';

const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 12;

export interface InventoryState {
  stockItems: StockItem[];
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

export interface AuthenticatedUser extends AdminUser {}

type StateKey = Exclude<keyof InventoryState, 'admins'>;
type StateRow = { name: StateKey; key: string };

const STATE_ROWS: StateRow[] = [
  { name: 'stockItems', key: 'ItemID' },
  { name: 'movementLogs', key: 'id' },
  { name: 'departments', key: 'DeptID' },
  { name: 'managers', key: 'ManagerID' },
  { name: 'issuedDocs', key: 'slipNumber' },
  { name: 'receivedDocs', key: 'voucherNumber' },
  { name: 'adjustmentDocs', key: 'voucherNumber' },
  { name: 'adjustmentRequests', key: 'id' },
  { name: 'backups', key: 'id' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeUser(row: Record<string, unknown>): AdminUser {
  return {
    IssuerID: String(row.issuer_id),
    IssuerName: String(row.issuer_name),
    Role: String(row.role),
    Active: Number(row.active) === 1,
  };
}

function keyed(items: unknown, key: string, label: string): Map<string, Record<string, unknown>> {
  if (!Array.isArray(items) || items.length > 100_000) {
    throw new Error(`${label} must be an array with no more than 100,000 entries.`);
  }
  const result = new Map<string, Record<string, unknown>>();
  for (const item of items) {
    if (!isRecord(item) || typeof item[key] !== 'string' || !item[key]) {
      throw new Error(`${label} contains an invalid entry.`);
    }
    const id = item[key] as string;
    if (result.has(id)) throw new Error(`${label} contains duplicate identifier ${id}.`);
    result.set(id, item);
  }
  return result;
}

function equalJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasChanges(oldItems: unknown[], newItems: unknown[], key: string): { added: Record<string, unknown>[]; changed: Record<string, unknown>[]; removed: string[] } {
  const oldMap = keyed(oldItems, key, key);
  const newMap = keyed(newItems, key, key);
  const added: Record<string, unknown>[] = [];
  const changed: Record<string, unknown>[] = [];
  const removed: string[] = [];

  for (const [id, item] of newMap) {
    const previous = oldMap.get(id);
    if (!previous) added.push(item);
    else if (!equalJson(previous, item)) changed.push(item);
  }
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) removed.push(id);
  }
  return { added, changed, removed };
}

export class InventoryBackend {
  private readonly databasePath: string;
  private db!: Database;
  private sql!: SqlJsStatic;
  private readonly loginAttempts = new Map<string, { count: number; resetAt: number }>();
  private writeQueue: Promise<void> = Promise.resolve();

  private constructor(databasePath: string) {
    this.databasePath = databasePath;
  }

  static async open(databasePath = process.env.INVENTORY_DB_PATH || path.resolve('data', 'inventory.sqlite')): Promise<InventoryBackend> {
    const backend = new InventoryBackend(path.resolve(databasePath));
    await backend.initialize();
    return backend;
  }

  private async initialize(): Promise<void> {
    this.sql = await initSqlJs({
      locateFile: (file) => path.resolve('node_modules', 'sql.js', 'dist', file),
      useOldExtensionFunctions: false,
    });
    await mkdir(path.dirname(this.databasePath), { recursive: true });

    try {
      const bytes = await readFile(this.databasePath);
      this.db = new this.sql.Database(new Uint8Array(bytes));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      this.db = new this.sql.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        issuer_id TEXT PRIMARY KEY,
        issuer_name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        issuer_id TEXT NOT NULL REFERENCES accounts(issuer_id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS inventory_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        revision INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS inventory_audit (
        revision INTEGER PRIMARY KEY,
        issuer_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        change_summary TEXT NOT NULL
      );
    `);

    if (!this.queryOne('SELECT id FROM inventory_state WHERE id = 1')) {
      const initialState: InventoryState = {
        stockItems: INITIAL_STOCK,
        movementLogs: INITIAL_LOGS,
        admins: [],
        departments: INITIAL_DEPARTMENTS,
        managers: INITIAL_MANAGERS,
        issuedDocs: [],
        receivedDocs: [],
        adjustmentDocs: [],
        adjustmentRequests: INITIAL_ADJUSTMENT_REQUESTS,
        backups: [],
      };
      this.db.run('INSERT INTO inventory_state (id, revision, payload) VALUES (1, 1, ?)', [JSON.stringify(initialState)]);
    }

    if (!this.queryOne('SELECT issuer_id FROM accounts LIMIT 1')) {
      const password = process.env.INITIAL_ADMIN_PASSWORD || '';
      if (password.length < PASSWORD_MIN_LENGTH) {
        throw new Error(`No admin account exists. Set INITIAL_ADMIN_PASSWORD to at least ${PASSWORD_MIN_LENGTH} characters before starting the server.`);
      }
      const issuerId = (process.env.INITIAL_ADMIN_ID || 'ADM001').trim().toUpperCase();
      const issuerName = (process.env.INITIAL_ADMIN_NAME || 'Rachel Pickard').trim();
      const role = (process.env.INITIAL_ADMIN_ROLE || 'Procurement Manager').trim();
      const passwordHash = await this.hashPassword(password);
      this.insertAccount({ IssuerID: issuerId, IssuerName: issuerName, Role: role, Active: true }, passwordHash);
    }

    await this.persist();
  }

  private queryOne(sql: string, params: unknown[] = []): Record<string, unknown> | null {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(params as (string | number | null | Uint8Array)[]);
      return statement.step() ? statement.getAsObject() as Record<string, unknown> : null;
    } finally {
      statement.free();
    }
  }

  private queryAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(params as (string | number | null | Uint8Array)[]);
      const rows: Record<string, unknown>[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as Record<string, unknown>);
      return rows;
    } finally {
      statement.free();
    }
  }

  private async persist(): Promise<void> {
    const temporaryPath = `${this.databasePath}.tmp`;
    await writeFile(temporaryPath, this.db.export());
    await rename(temporaryPath, this.databasePath);
  }

  private async write<T>(operation: () => Promise<T> | T): Promise<T> {
    const previous = this.writeQueue;
    let release!: () => void;
    this.writeQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const before = this.db.export();
      this.db.run('BEGIN IMMEDIATE');
      try {
        const result = await operation();
        this.db.run('COMMIT');
        await this.persist();
        return result;
      } catch (error) {
        try {
          this.db.run('ROLLBACK');
        } catch {
          this.db.close();
          this.db = new this.sql.Database(before);
        }
        throw error;
      }
    } finally {
      release();
    }
  }

  private async hashPassword(password: string): Promise<{ salt: string; hash: string }> {
    if (password.length < PASSWORD_MIN_LENGTH) throw new Error(`Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    const salt = randomBytes(16);
    const passwordHash = await scrypt(password, salt, 64) as Buffer;
    return { salt: salt.toString('hex'), hash: passwordHash.toString('hex') };
  }

  private insertAccount(user: AdminUser, passwordHash: { salt: string; hash: string }): void {
    this.db.run(
      'INSERT INTO accounts (issuer_id, issuer_name, role, password_salt, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)',
      [user.IssuerID, user.IssuerName, user.Role, passwordHash.salt, passwordHash.hash, user.Active ? 1 : 0]
    );
  }

  listUsers(): AdminUser[] {
    return this.queryAll('SELECT issuer_id, issuer_name, role, active FROM accounts ORDER BY issuer_id').map(safeUser);
  }

  getUser(issuerId: string): AdminUser | null {
    const row = this.queryOne('SELECT issuer_id, issuer_name, role, active FROM accounts WHERE issuer_id = ?', [issuerId]);
    return row ? safeUser(row) : null;
  }

  async login(issuerId: string, password: string, address: string): Promise<{ user: AdminUser; token: string; expiresAt: number }> {
    const now = Date.now();
    const attempt = this.loginAttempts.get(address);
    if (attempt && attempt.resetAt > now && attempt.count >= 5) throw new Error('Too many sign-in attempts. Try again in 15 minutes.');
    if (!attempt || attempt.resetAt <= now) this.loginAttempts.set(address, { count: 0, resetAt: now + 15 * 60 * 1000 });

    const row = this.queryOne('SELECT issuer_id, issuer_name, role, password_salt, password_hash, active FROM accounts WHERE issuer_id = ?', [issuerId.trim().toUpperCase()]);
    let valid = false;
    if (row && Number(row.active) === 1) {
      const derived = await scrypt(password, Buffer.from(String(row.password_salt), 'hex'), 64) as Buffer;
      const expected = Buffer.from(String(row.password_hash), 'hex');
      valid = expected.length === derived.length && timingSafeEqual(expected, derived);
    }
    if (!valid || !row) {
      const updated = this.loginAttempts.get(address)!;
      updated.count += 1;
      throw new Error('Invalid user ID or password.');
    }

    this.loginAttempts.delete(address);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = now + SESSION_TTL_MS;
    await this.write(() => {
      this.db.run('INSERT INTO sessions (token_hash, issuer_id, expires_at) VALUES (?, ?, ?)', [hashToken(token), String(row.issuer_id), expiresAt]);
    });
    return { user: safeUser(row), token, expiresAt };
  }

  getSession(token: string | null): AdminUser | null {
    if (!token) return null;
    const row = this.queryOne(
      'SELECT a.issuer_id, a.issuer_name, a.role, a.active FROM sessions s JOIN accounts a ON a.issuer_id = s.issuer_id WHERE s.token_hash = ? AND s.expires_at > ?',
      [hashToken(token), Date.now()]
    );
    return row && Number(row.active) === 1 ? safeUser(row) : null;
  }

  async logout(token: string | null): Promise<void> {
    if (!token) return;
    await this.write(() => this.db.run('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]));
  }

  async changePassword(user: AdminUser, currentPassword: string, newPassword: string): Promise<void> {
    if (newPassword.length < PASSWORD_MIN_LENGTH) throw new Error(`Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    const row = this.queryOne('SELECT password_salt, password_hash FROM accounts WHERE issuer_id = ?', [user.IssuerID]);
    if (!row) throw new Error('Account not found.');
    const actual = await scrypt(currentPassword, Buffer.from(String(row.password_salt), 'hex'), 64) as Buffer;
    const expected = Buffer.from(String(row.password_hash), 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Current password is incorrect.');
    await this.replacePassword(user.IssuerID, newPassword);
  }

  async replacePassword(issuerId: string, password: string): Promise<void> {
    if (password.length < PASSWORD_MIN_LENGTH) throw new Error(`Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    const salt = randomBytes(16);
    const digest = await scrypt(password, salt, 64) as Buffer;
    await this.write(() => {
      this.db.run('UPDATE accounts SET password_salt = ?, password_hash = ? WHERE issuer_id = ?', [salt.toString('hex'), digest.toString('hex'), issuerId]);
      this.db.run('DELETE FROM sessions WHERE issuer_id = ?', [issuerId]);
    });
  }

  async addUser(user: AdminUser, password: string): Promise<void> {
    const passwordHash = await this.hashPassword(password);
    await this.write(() => this.insertAccount(user, passwordHash));
  }

  async updateUser(user: AdminUser): Promise<void> {
    if (user.IssuerID === 'ADM001' && !user.Active) throw new Error('The superior administrator cannot be disabled.');
    await this.write(() => {
      this.db.run('UPDATE accounts SET issuer_name = ?, role = ?, active = ? WHERE issuer_id = ?', [
        user.IssuerName, user.Role, user.Active ? 1 : 0, user.IssuerID,
      ]);
      if (!user.Active) this.db.run('DELETE FROM sessions WHERE issuer_id = ?', [user.IssuerID]);
    });
  }

  async deleteUser(issuerId: string): Promise<void> {
    if (issuerId === 'ADM001') throw new Error('The superior administrator cannot be deleted.');
    await this.write(() => {
      this.db.run('DELETE FROM sessions WHERE issuer_id = ?', [issuerId]);
      this.db.run('DELETE FROM accounts WHERE issuer_id = ?', [issuerId]);
    });
  }

  getState(): { revision: number; state: InventoryState } {
    const row = this.queryOne('SELECT revision, payload FROM inventory_state WHERE id = 1');
    if (!row) throw new Error('Inventory state has not been initialized.');
    const state = JSON.parse(String(row.payload)) as InventoryState;
    state.admins = this.listUsers();
    return { revision: Number(row.revision), state };
  }

  async commitState(user: AdminUser, expectedRevision: number, incoming: unknown): Promise<{ revision: number; state: InventoryState }> {
    if (!Number.isInteger(expectedRevision) || !isRecord(incoming)) throw new Error('A valid expected revision and inventory state are required.');
    const { revision, state: current } = this.getState();
    if (revision !== expectedRevision) throw new Error(`Inventory changed on the server (revision ${revision}); refresh and retry.`);

    const next = { ...current, ...incoming, admins: current.admins } as InventoryState;
    const changed: string[] = [];
    for (const row of STATE_ROWS) {
      const changes = hasChanges(current[row.name] as unknown[], next[row.name] as unknown[], row.key);
      if (!changes.added.length && !changes.changed.length && !changes.removed.length) continue;
      changed.push(row.name);
      if (row.name === 'stockItems') {
        if (!canManageStock(user)) throw new Error('Your role cannot modify stock.');
        if (changes.removed.length && user.IssuerID !== 'ADM001') throw new Error('Only the superior administrator may delete stock items.');
        for (const item of [...changes.added, ...changes.changed]) {
          if (typeof item.Qty !== 'number' || !Number.isFinite(item.Qty) || item.Qty < 0) throw new Error('Stock quantities must be finite and non-negative.');
        }
      } else if (row.name === 'movementLogs' || row.name === 'issuedDocs' || row.name === 'receivedDocs' || row.name === 'adjustmentDocs') {
        if (!canManageStock(user)) throw new Error('Your role cannot post inventory transactions.');
        if (changes.changed.length || changes.removed.length) throw new Error(`${row.name} is append-only.`);
        assertActor(user, changes.added, ['IssuerID', 'issuerID']);
      } else if (row.name === 'adjustmentRequests') {
        if (changes.changed.length || changes.removed.length) {
          if (user.IssuerID !== 'ADM001') throw new Error('Only the superior administrator may review adjustment requests.');
        }
        assertActor(user, changes.added, ['requesterId', 'issuerId']);
      } else if (row.name === 'departments' || row.name === 'managers') {
        if (user.IssuerID !== 'ADM001') throw new Error('Only the superior administrator may manage organization settings.');
      } else if (row.name === 'backups') {
        if (user.IssuerID !== 'ADM001') throw new Error('Only the superior administrator may manage backups.');
      }
    }

    await this.write(() => {
      const nextRevision = revision + 1;
      this.db.run('UPDATE inventory_state SET revision = ?, payload = ? WHERE id = 1', [nextRevision, JSON.stringify(next)]);
      this.db.run('INSERT INTO inventory_audit (revision, issuer_id, created_at, change_summary) VALUES (?, ?, ?, ?)', [
        nextRevision, user.IssuerID, new Date().toISOString(), changed.join(','),
      ]);
    });
    return this.getState();
  }

  async importState(user: AdminUser, incoming: unknown): Promise<{ revision: number; state: InventoryState }> {
    if (user.IssuerID !== 'ADM001') throw new Error('Only the superior administrator may import inventory data.');
    if (!isRecord(incoming)) throw new Error('Import payload must be an object.');
    const current = this.getState();
    const next = { ...current.state, ...incoming, admins: current.state.admins } as InventoryState;
    for (const row of STATE_ROWS) keyed(next[row.name], row.key, row.name);
    for (const item of next.stockItems) {
      if (typeof item.Qty !== 'number' || !Number.isFinite(item.Qty) || item.Qty < 0) {
        throw new Error('Imported stock quantities must be finite and non-negative.');
      }
    }
    await this.write(() => {
      const revision = current.revision + 1;
      this.db.run('UPDATE inventory_state SET revision = ?, payload = ? WHERE id = 1', [revision, JSON.stringify(next)]);
      this.db.run('INSERT INTO inventory_audit (revision, issuer_id, created_at, change_summary) VALUES (?, ?, ?, ?)', [
        revision, user.IssuerID, new Date().toISOString(), 'admin import',
      ]);
    });
    return this.getState();
  }
}

function canManageStock(user: AdminUser): boolean {
  const role = user.Role.toLowerCase();
  return user.IssuerID === 'ADM001' || ['manager', 'supervisor', 'administrator', 'controller'].some((part) => role.includes(part));
}

function assertActor(user: AdminUser, records: Record<string, unknown>[], actorKeys: string[]): void {
  for (const record of records) {
    const actor = actorKeys.map((key) => record[key]).find((value) => typeof value === 'string');
    if (actor !== user.IssuerID) throw new Error('Transaction issuer does not match the authenticated session.');
  }
}

export function verifyUser(user: AdminUser | null): user is AdminUser {
  return Boolean(user?.Active);
}

export function constantTimeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
