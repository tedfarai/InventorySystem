# Comprehensive System Design & Architecture Specification
## Paramount Procurement & Inventory Control Management System
### Universal Cross-Platform PWA • Single-Source Cloud Database • Multi-User Real-Time Collaboration • Local SQLite WASM Engine

> **Document Version**: 3.0.0  
> **System Architecture**: Universal Progressive Web App (Windows / macOS / Linux) + Single-Source Cloud Database (Firestore) + Dual-Persistence SQLite WASM / IndexedDB + Excel VBA Automated Macro Suite  
> **Standard Compliance**: ISO-9001 Safety Stock Protocol | Two-Man Rule Audit Verification | Cross-Platform Multi-User Concurrency

---

## 1. Executive Summary & System Overview

The **Paramount Procurement & Inventory Control System** is an enterprise-grade procurement, warehouse inventory simulation, and macro automation platform. It is engineered to:
1. **Eliminate stockouts and ordering delays** through automated reorder threshold calculations and instant requisition processing.
2. **Support Single-Source Centralized Collaboration**: Multiple users across an organization (Procurement Managers, Storekeepers, Superior Admins, and Auditors) work simultaneously against a unified, single-source cloud repository while retaining 100% offline resilience.
3. **Deploy as a Native Desktop App Across All Platforms**: Installable as a standalone Progressive Web Application (PWA) with native window frames on Windows 11/10, macOS Sonoma/Ventura, and Linux distributions (Ubuntu, Fedora, Debian, Arch), as well as Electron desktop builds.
4. **Deliver Sub-Millisecond Offline Persistence**: Combines in-memory SQLite WebAssembly (`sql.js`) with IndexedDB local caching and real-time Firestore synchronization.
5. **Bridge Web & Native Microsoft Excel**: Features full spreadsheet emulation with custom ribbons, UserForms, and a complete downloadable Excel VBA Macro Suite (`.bas`, `.frm`, Ribbon XML).

---

## 2. System Architecture & Dual-Persistence Topology

```
+---------------------------------------------------------------------------------------------------+
|                                     CROSS-PLATFORM CLIENT LAYERS                                  |
|   Windows (PWA / Electron)   |   macOS (PWA / Electron)   |   Linux (PWA / Flatpak / Web App)    |
|---------------------------------------------------------------------------------------------------|
|  +------------------------+  +------------------------+  +------------------------------------+  |
|  |  Excel Simulator       |  |  Central Document Vault|  |  Audit Log & Movement Analytics    |  |
|  |  (Worksheets & Forms)  |  |  (Single-Source Files) |  |  (Voucher History & Verification)  |  |
|  +-----------+------------+  +-----------+------------+  +-----------------+------------------+  |
|              |                           |                                 |                      |
|  +-----------v---------------------------v---------------------------------v-------------------+  |
|  |                Real-time Presence Bar, Conflict Prevention & Toast Notification             |  |
|  +---------------------------------------+-----------------------------------------------------+  |
+------------------------------------------|--------------------------------------------------------+
                                           |
+------------------------------------------v--------------------------------------------------------+
|                                    REACT STATE & HOOKS LAYER                                      |
|  - useSqliteProcurement (Optimistic State, ACID coordination, Cloud Write-through)                |
|  - usePwaInstall (PWA Installation prompts, BeforeInstallPrompt event, Standalone detection)      |
|  - useKeyboardShortcuts (Quick hotkeys: ?, Alt+S, Alt+I, Alt+D, Alt+R, Ctrl+K, Escape)            |
|  - platformDetector (OS & Browser capability sensing for Windows, Mac, Linux)                    |
+--------------------+-----------------------------------------------------+------------------------+
                     |                                                     |
+--------------------v--------------------+         +----------------------v------------------------+
|       LOCAL OFFLINE STORAGE ENGINE      |         |          SINGLE-SOURCE CLOUD DATABASE         |
|  - SQLite WebAssembly Engine (sql.js)   |         |  - Google Cloud Firestore                     |
|  - IndexedDB Persistence Layer (idb)    | <=====> |  - Real-time Listeners (onSnapshot)           |
|  - Offline-first cache & fast queries   |         |  - User Presence & Heartbeats (15s TTL)       |
|  - Automatic local snapshot backups     |         |  - Atomic Multi-Document Batch Writes         |
|  - 100% functional without internet     |         |  - Collaborative Real-Time Activity Feed      |
+-----------------------------------------+         +-----------------------------------------------+
```

---

## 3. Cross-Platform PWA Installation & Multi-OS Architecture

The application is engineered as a universal PWA compliant with W3C Web App Manifest standards and Chromium/WebKit/Gecko installation specifications.

### 3.1 Supported Operating Systems & Installation Workflows

| Platform | Recommended Engine / Browser | Installation Method | Key Features |
| :--- | :--- | :--- | :--- |
| **Windows 11 / 10** | Microsoft Edge / Google Chrome | Web App Manifest / Edge App Installer | Native Title Bar, Windows Start Menu integration, Taskbar Pinning, Jumplist Shortcuts (`/?tab=simulator`, `/?tab=audit`) |
| **macOS (Sonoma / Ventura / Monterey)** | Safari 17+ or Chrome / Brave | "Add to Dock" / Chrome App Install | macOS Dock Icon, Native macOS Menu Bar integration, Window Dragging, Fullscreen Mode |
| **Linux (Ubuntu, Fedora, Arch, Debian)** | Google Chrome, Chromium, Edge | Browser Install Prompt / `.desktop` file | X11 / Wayland window decorations, Application Launcher integration, Offline local sandbox |

### 3.2 Web App Manifest (`manifest.json`)
- **Display**: `standalone` with customized `background_color` (`#020617`) and `theme_color` (`#0d9488`).
- **Icons**: Scalable vector SVG and high-resolution PNG masks (`192x192`, `512x512`, `maskable`).
- **Shortcuts**: Direct deep-links to **Simulator View**, **Audit Logs**, **VBA Code Hub**, and **Central Document Vault**.

---

## 4. Multi-User Collaboration & Single-Source Cloud Engine

To allow multiple users to work at the same time from any computer, the application implements a centralized real-time sync service backed by Firestore with optimistic local UI updating.

### 4.1 Cloud Synchronization Protocol (`cloudSyncService.ts`)
1. **Real-time Subscriptions (`onSnapshot`)**:
   - `procurement_master_stock`: Automatically synchronizes quantities, safety stock levels, and pricing.
   - `procurement_movement_logs`: Streams movement ledger entries created by any user in real-time.
   - `procurement_issued_documents`: Centralized repository of all Issued Requisition Slips.
   - `procurement_received_documents`: Centralized repository of Goods Received Notes (GRN).
   - `procurement_adjustment_documents`: Centralized repository of Stock Adjustment vouchers.
   - `procurement_adjustment_requests`: Real-time queue for two-man rule adjustment authorization.
   - `procurement_user_presence`: Dynamic 15-second heartbeat registry showing active online team members.
   - `procurement_collaborative_events`: Instant broadcast notification stream.

2. **Atomic Multi-Document Batch Writes (`writeBatch`)**:
   - When an issue slip, GRN delivery, or stock adjustment occurs, the system writes the document voucher, updates stock quantities, appends movement logs, and dispatches a broadcast event in a single atomic transaction.

3. **Presence & Heartbeat Engine**:
   - Every active user broadcasts a heartbeat containing user ID, name, avatar initials, role, and current active tab/action every 15 seconds.
   - Presences older than 45 seconds are pruned automatically.
   - Displayed in the top navigation `MultiUserPresenceBar`.

4. **Central Shared Document Vault (`SharedDocumentVaultModal.tsx`)**:
   - Single-source search and access for all requisition slips, delivery vouchers, physical count adjustment sheets, and system backup snapshots across all connected team members.
   - Instant PDF print preview, raw JSON inspection, and download.

---

## 5. User Interface Modules & Component Hierarchy

### 5.1 Interactive Views (`AppTab`)
1. **Simulator (`ExcelSimulator.tsx`)**:
   - **Worksheet Tabs**: `Master_Stock`, `Movement_Log`, `Admin_Config`, `Adjustments_Archive`.
   - **Ribbon Actions**:
     - *Issue Items (`frmIssueItem`)*: Multi-item cart requisition issuance with live stock deductions and PDF generation.
     - *Receive Stock (`frmDelivery`)*: Purchase order reconciliation and GRN receipt logging.
     - *Stock Adjustments (`frmStockAdjustment`)*: Discrepancy reporting with strict Two-Man Rule enforcement.
     - *Reorder Report*: Automated ISO-9001 safety stock calculation with printable PDF manager summaries.
     - *Manage Master Folder*: Configures file storage targets (`C:\Procurement_System\`).
     - *Backup & Disaster Recovery*: SQLite snapshot management.
   - **Search & Filter Bar**: Multi-token fuzzy query engine with Category, Threshold, and Status quick chips.
   - **Bulk Stock Actions Bar**: Multi-selection actions for batch deliveries and category reassignment.

2. **Audit Log & Analytics (`AuditLogAnalyticsView.tsx`)**:
   - Transaction volume timelines, category distribution charts, issuer breakdown, and full ledger tables.
   - Clickable voucher documents opening formatted verification modals.

3. **Electron Desktop Packaging Suite (`ElectronSuiteView.tsx`)**:
   - Native desktop wrapper files (`main.js`, `preload.js`, `package.json`).
   - 1-click download of ready-to-package Electron applications for Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage` / `.deb`).

4. **VBA Code Hub (`VbaCodeHub.tsx`)**:
   - 7 production-ready modular VBA `.bas` files.
   - Complete Custom Ribbon XML definition (`customUI14.xml`).
   - Automated PowerShell import script for Excel `.xlsm` workbooks.

5. **Setup & Deployment Guide (`SetupGuide.tsx`)**:
   - Step-by-step enterprise rollout instructions for shared network folders, Windows file permissions, and macro security.

6. **UI Style Guide (`StyleGuide.tsx`)**:
   - Interactive typography, color tokens, button states, badge indicators, and form elements.

7. **Export Center (`ExportCenter.tsx`)**:
   - Full data export in Excel (`.xlsx`), JSON, SQLite binary, and PDF formats.

---

## 6. Complete Data Models & Database Schemas

### 6.1 TypeScript Core Types (`src/types.ts`)

```typescript
// 1. Inventory Item
export interface StockItem {
  ItemID: string;             // e.g. "ITM-001"
  ItemName: string;           // e.g. "Standard A4 Copy Paper"
  Category: string;           // e.g. "Stationery" | "Cleaning" | "Safety"
  Qty: number;                // Current on-hand quantity
  SafetyStock: number;        // Threshold triggering reorder
  Unit: string;               // "Reams", "Boxes", "Pcs"
  UnitPrice?: number;         // Unit cost in USD/local currency
  ReorderQty?: number;        // Recommended procurement batch size
  Location?: string;          // Warehouse aisle/shelf
  LastUpdated?: string;       // ISO timestamp
}

// 2. Transaction Audit Log Entry
export interface MovementLogEntry {
  id: string;                 // "LOG-170929283-0"
  Timestamp: string;          // ISO timestamp
  Type: 'ISSUE' | 'DELIVERY' | 'ADJUSTMENT' | 'INITIAL_SETUP';
  ItemID: string;
  ItemName: string;
  Qty: number;                // Signed integer or movement delta
  DeptID: string;             // Department code or "N/A"
  DeptName: string;           // Destination or source
  DeptHead: string;           // Approving manager
  DeptEmail: string;          // Email receipt destination
  IssuerID: string;           // Admin user ID
  IssuerName: string;         // Admin full name
  IssueSlipFileName: string;  // Generated PDF path
  DocumentRef?: string;       // "IS-2026-0001", "GRN-2026-0001", "ADJ-2026-0001"
  Status: string;             // "Emailed", "Delivered", "Adjusted"
  DiscrepancyReason?: string; // Reason code for stock adjustment
  DiscrepancyNotes?: string;  // Detailed discrepancy explanation
  CountRef?: string;          // Physical count sheet reference
}

// 3. User Presence (Collaborative)
export interface UserPresence {
  id: string;
  userId: string;
  userName: string;
  userRole: 'Storekeeper' | 'Procurement Manager' | 'Superior Admin' | 'Auditor';
  avatarColor: string;
  lastActive: string;
  currentAction?: string;
  activeTab?: string;
  platform?: 'Windows' | 'macOS' | 'Linux' | 'Web';
}

// 4. Collaborative Event
export interface CollaborativeEvent {
  id: string;
  type: 'STOCK_UPDATED' | 'STOCK_ISSUED' | 'STOCK_RECEIVED' | 'ADJUSTMENT_REQUESTED' | 'ADJUSTMENT_APPROVED' | 'ADJUSTMENT_REJECTED' | 'BATCH_UPDATED' | 'BACKUP_CREATED';
  summary: string;
  userId: string;
  userName: string;
  userRole?: string;
  timestamp: string;
  details?: Record<string, any>;
}

// 5. Two-Man Rule Stock Adjustment Request
export interface StockAdjustmentRequest {
  id: string;
  createdAt: string;
  requestedBy: string;
  requesterRole: string;
  items: {
    ItemID: string;
    ItemName: string;
    CurrentSystemQty: number;
    ProposedPhysicalQty: number;
    VarianceQty: number;
    ReasonCode: string;
    ReasonLabel: string;
    Notes: string;
    CountRef: string;
    Unit: string;
    isAdjusted?: boolean;
    adjustedAt?: string;
    voucherNumber?: string;
  }[];
  reasonSummary: string;
  status: 'PENDING_APPROVAL' | 'APPROVED_AND_EXECUTED' | 'REJECTED' | 'TIMED_ACCESS_GRANTED';
  reviewedBy?: string;
  reviewedAt?: string;
  superiorAdminNotes?: string;
  timedAccessWindow?: {
    start: string;
    end: string;
    grantedBy: string;
    durationMinutes: number;
  };
}
```

---

## 7. Role-Based Access Control & Two-Man Rule Security

### 7.1 Role Hierarchy

| Capability | Storekeeper | Procurement Manager | Superior Admin | Auditor |
| :--- | :---: | :---: | :---: | :---: |
| Issue Stock (`frmIssueItem`) | Yes | Yes | Yes | Read-Only |
| Receive Deliveries (`frmDelivery`) | Yes | Yes | Yes | Read-Only |
| Request Stock Adjustment | Yes | Yes | Yes | Read-Only |
| **Approve Stock Adjustment** | **No** | **No** | **Yes** | **No** |
| Grant Timed Editing Window | **No** | **No** | **Yes** | **No** |
| Manage User Accounts & RBAC | No | No | Yes | Read-Only |
| View Shared Document Vault | Yes | Yes | Yes | Yes |
| Create & Restore Backups | No | Yes | Yes | Read-Only |

---

## 8. Excel VBA Automation & File Generation

The system outputs a comprehensive automated VBA macro suite for Microsoft Excel:
- **`mod_01_Config`**: Global constants, directory paths, and sheet bindings.
- **`mod_02_IssueEngine`**: Form logic for multi-item cart requisitions and automatic PDF rendering.
- **`mod_03_DeliveryEngine`**: GRN processing, purchase order reconciliation, and inventory additions.
- **`mod_04_StockAdjustmentEngine`**: Variance computation, password hashing, and two-man rule enforcement.
- **`mod_05_EmailAutomation`**: Automated Outlook MAPI dispatch of PDF vouchers to department heads.
- **`mod_06_SecurityAudit`**: Inactivity timer via `Application.OnTime`, worksheet locking, and change logging.
- **`mod_07_UserInterface`**: Navigation switchboard (`frmNavigation`) and dynamic custom ribbon controls.

---

## 9. Re-creation & Build Instructions

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Compile for production
npm run build

# 4. Preview production build
npm run preview
```

---
*Paramount Procurement & Inventory Control System — ISO-9001 Safety Stock & Automated Audit Control Standard.*
