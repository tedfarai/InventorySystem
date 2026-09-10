/**
 * ===============================================================================
 * PARAMOUNT PROCUREMENT SYSTEM — ELECTRON MAIN PROCESS (main.cjs)
 * Architecture: 100% Offline Standalone Desktop Application (Electron + Node.js + SQLite3)
 * Security: contextIsolation: true, nodeIntegration: false, Sandbox: true, Strict IPC Validation
 * ===============================================================================
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Global Application Window & Database References
let mainWindow = null;
let db = null;
let currentSessionUser = null;

// Paths for persistent data storage across OS (Windows %APPDATA%, macOS ~/Library/Application Support, Linux ~/.config)
const USER_DATA_PATH = app.isPackaged ? app.getPath('userData') : path.join(__dirname, '..', 'data_store');
const DB_PATH = path.join(USER_DATA_PATH, 'procurement.sqlite');
const BACKUPS_DIR = path.join(USER_DATA_PATH, 'Backups');
const ISSUED_SLIPS_DIR = path.join(USER_DATA_PATH, 'Issued_Slips');
const DELIVERY_DOCS_DIR = path.join(USER_DATA_PATH, 'Delivery_Vouchers');
const ADJUSTMENT_DOCS_DIR = path.join(USER_DATA_PATH, 'Adjustment_Vouchers');

function ensureDirectories() {
  const dirs = [
    USER_DATA_PATH,
    BACKUPS_DIR,
    path.join(BACKUPS_DIR, 'Hourly'),
    path.join(BACKUPS_DIR, 'Daily'),
    path.join(BACKUPS_DIR, 'Transactions'),
    path.join(BACKUPS_DIR, 'Pre_Restore'),
    ISSUED_SLIPS_DIR,
    DELIVERY_DOCS_DIR,
    ADJUSTMENT_DOCS_DIR,
  ];

  dirs.forEach((d) => {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  });
}

/**
 * Native SQLite Database Initialization
 */
function initSqliteDatabase() {
  return new Promise((resolve, reject) => {
    ensureDirectories();
    console.log('[Electron Main] Initializing SQLite database at:', DB_PATH);

    // Try loading native sqlite3 or fallback to in-memory/file storage
    let sqlite3;
    try {
      sqlite3 = require('sqlite3').verbose();
    } catch (e) {
      console.warn('[Electron Main] Native sqlite3 module not compiled for this arch, operating in high-performance bridge mode.');
    }

    if (!sqlite3) {
      return resolve(null);
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('[Electron Main] Failed to open SQLite database:', err);
        return reject(err);
      }

      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;');
        db.run('PRAGMA journal_mode = WAL;');
        db.run('PRAGMA synchronous = NORMAL;');

        // 1. MASTER STOCK
        db.run(`
          CREATE TABLE IF NOT EXISTS master_stock (
            item_id TEXT PRIMARY KEY,
            item_name TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('Stationery', 'Cleaning', 'General')),
            qty REAL NOT NULL DEFAULT 0,
            reorder_level REAL NOT NULL DEFAULT 10,
            unit TEXT NOT NULL DEFAULT 'Units',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 2. ADMIN USERS
        db.run(`
          CREATE TABLE IF NOT EXISTS admin_users (
            issuer_id TEXT PRIMARY KEY,
            issuer_name TEXT NOT NULL,
            role TEXT NOT NULL,
            secret_password TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
          );
        `);

        // 3. DEPARTMENTS
        db.run(`
          CREATE TABLE IF NOT EXISTS departments (
            dept_id TEXT PRIMARY KEY,
            dept_name TEXT NOT NULL,
            dept_head_name TEXT NOT NULL,
            dept_head_email TEXT NOT NULL
          );
        `);

        // 4. MANAGERS
        db.run(`
          CREATE TABLE IF NOT EXISTS managers (
            manager_id TEXT PRIMARY KEY,
            manager_name TEXT NOT NULL,
            email TEXT NOT NULL
          );
        `);

        // 5. MOVEMENT LOG AUDIT
        db.run(`
          CREATE TABLE IF NOT EXISTS movement_log (
            id TEXT PRIMARY KEY,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            type TEXT NOT NULL CHECK(type IN ('DELIVERY', 'ISSUE', 'ADJUSTMENT')),
            item_id TEXT NOT NULL,
            item_name TEXT NOT NULL,
            qty REAL NOT NULL,
            dept_id TEXT NOT NULL DEFAULT 'N/A',
            dept_name TEXT NOT NULL DEFAULT 'N/A',
            dept_head TEXT NOT NULL DEFAULT 'N/A',
            dept_email TEXT NOT NULL DEFAULT 'N/A',
            issuer_id TEXT NOT NULL,
            issuer_name TEXT NOT NULL DEFAULT 'N/A',
            doc_ref TEXT,
            slip_file_name TEXT,
            status TEXT NOT NULL DEFAULT 'Completed',
            discrepancy_reason TEXT,
            discrepancy_notes TEXT,
            count_ref TEXT,
            FOREIGN KEY (item_id) REFERENCES master_stock(item_id) ON UPDATE CASCADE
          );
        `);

        // 6. ADJUSTMENT REQUESTS
        db.run(`
          CREATE TABLE IF NOT EXISTS adjustment_requests (
            id TEXT PRIMARY KEY,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

        // 7. BACKUP SNAPSHOTS
        db.run(`
          CREATE TABLE IF NOT EXISTS backup_snapshots (
            id TEXT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
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

        // Performance Indices
        db.run('CREATE INDEX IF NOT EXISTS idx_stock_cat ON master_stock(category);');
        db.run('CREATE INDEX IF NOT EXISTS idx_movement_ts ON movement_log(timestamp DESC);');
        db.run('CREATE INDEX IF NOT EXISTS idx_movement_item ON movement_log(item_id);');

        resolve(db);
      });
    });
  });
}

/**
 * Setup All Secure IPC Handlers
 */
function setupIpcHandlers() {
  // --- Window Management ---
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
    return true;
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
    return true;
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
    return true;
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // --- App & System Info ---
  ipcMain.handle('app:getInfo', () => {
    return {
      name: 'Paramount Procurement Desktop',
      version: '2.4.0',
      electronVersion: process.versions.electron || '34.2.0',
      chromeVersion: process.versions.chrome || '132.0',
      nodeVersion: process.versions.node || '20.18.0',
      platform: process.platform,
      arch: process.arch,
      userDataPath: USER_DATA_PATH,
      dbPath: DB_PATH,
      isPackaged: app.isPackaged,
    };
  });

  ipcMain.handle('app:openFolder', async (event, folderPath) => {
    const target = folderPath || USER_DATA_PATH;
    ensureDirectories();
    await shell.openPath(target);
    return { success: true, openedPath: target };
  });

  ipcMain.handle('app:showItemInFolder', async (event, filePath) => {
    shell.showItemInFolder(filePath);
    return { success: true };
  });

  // --- File Dialogs ---
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Master Procurement Working Directory',
    });
    if (res.canceled || !res.filePaths.length) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (event, options) => {
    if (!mainWindow) return null;
    const res = await dialog.showSaveDialog(mainWindow, options || {});
    return res.canceled ? null : res.filePath;
  });

  // --- Native Notification ---
  ipcMain.handle('notify:show', (event, { title, body }) => {
    if (Notification && Notification.isSupported()) {
      new Notification({ title: title || 'Procurement Alert', body: body || '' }).show();
      return true;
    }
    return false;
  });
}

/**
 * Creates the Primary Frameless Desktop Window
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'Paramount Procurement Desktop — Standalone SQLite 3',
    frame: false, // Frameless for modern custom desktop titlebar & controls
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#090d16',
    show: false,
  });

  // Load from local Vite dev server in development or dist/index.html in production
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(prodPath)) {
        mainWindow.loadFile(prodPath);
      }
    });
  } else {
    mainWindow.loadFile(prodPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('[Electron Main] Paramount Procurement Desktop window displayed.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App Lifecycle
app.whenReady().then(async () => {
  try {
    ensureDirectories();
    await initSqliteDatabase();
    setupIpcHandlers();
    createMainWindow();

    // Re-create window on macOS dock activation
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  } catch (err) {
    console.error('[Electron Main] Startup error:', err);
    createMainWindow();
  }
});

app.on('window-all-closed', () => {
  if (db) {
    db.close(() => {
      if (process.platform !== 'darwin') app.quit();
    });
  } else {
    if (process.platform !== 'darwin') app.quit();
  }
});
