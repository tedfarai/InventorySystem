/**
 * System Design & Architecture Specification Generator
 * Generates and downloads the complete DESIGN.md file detailing all aspects of the application.
 */

export function getSystemDesignMarkdown(): string {
  return `# Comprehensive System Design & Architecture Specification
## Paramount Procurement & Inventory Control Management System

> **Document Version**: 2.5.0  
> **System Architecture**: 100% Client-Side Offline Progressive Web Application (PWA) + SQLite WASM Virtual Database Engine + Excel VBA Automated Macro Suite  
> **Standard Compliance**: ISO-9001 Safety Stock Protocol | Two-Man Rule Audit Verification | Dual-Layer Persistence Engine

---

## 1. Executive Summary & System Overview

The **Paramount Procurement & Inventory Control System** is an enterprise-grade procurement, warehouse inventory simulation, and macro automation suite. Built specifically to eliminate stockouts, streamline requisition workflows, enforce strict audit accountability, and bridge the gap between high-speed web interfaces and offline desktop Excel macro systems.

### Core Objectives
1. **Zero-Latency Offline Inventory Control**: Provide instant full-featured procurement operations directly in the browser with 100% offline persistence using IndexedDB and in-memory SQLite WebAssembly (\`sql.js\`).
2. **Exact Excel Spreadsheet Emulation**: Replicate native Microsoft Excel workbook behaviors, worksheet navigation tabs (\`Master_Stock\`, \`Movement_Log\`, \`Admin_Config\`, \`Adjustments_Archive\`), ribbon actions, UserForms, and formulas with high visual fidelity.
3. **Multi-Step Procurement Workflows**:
   - **Requisition Issuance**: Multi-item stock issuance with automatic stock deductions, department head signature routing, and formatted PDF receipt generation (\`IS-YYYY-XXXX\`).
   - **Goods Received Notes (GRN)**: Purchase order reconciliation, delivery voucher numbering, and stock incrementing.
   - **Two-Man Rule Stock Adjustments**: Discrepancy logging with required dual-authorization (Requester + Superior Admin approval).
   - **Reorder & Safety Threshold Engine**: Automatic detection of stock items at or below safety levels with 1-click printable PDF reorder reports for procurement managers.
4. **VBA Macro Automation Generator**: One-click generation and PowerShell auto-import of production-ready VBA modules (\`.bas\`), custom Ribbon XML, and UserForms directly into desktop Excel (\`.xlsm\`).
5. **Disaster Recovery & Snapshots**: Automated and manual point-in-time database snapshots with JSON and SQLite binary archive export/import.

---

## 2. System Architecture & Topology

\`\`\`
+---------------------------------------------------------------------------------------+
|                                    User Interface                                     |
|  +---------------------+  +--------------------+  +--------------------------------+  |
|  |  Excel Simulator    |  |  Export Center     |  |  Audit Vault & Log Explorer    |  |
|  |  (Worksheets & UI)  |  |  (XLSX, PDF, VBA)  |  |  (Movement & Voucher Records)  |  |
|  +----------+----------+  +---------+----------+  +---------------+----------------+  |
|             |                       |                             |                   |
|  +----------+-----------------------+-----------------------------+----------------+  |
|  |             Navigation Switchboard & Role-Based Access Control (RBAC)           |  |
|  +----------------------------------+----------------------------------------------+  |
+-------------------------------------|-------------------------------------------------+
                                      |
+-------------------------------------v-------------------------------------------------+
|                                 State & Hooks Layer                                   |
|  - useSqliteProcurement (Transaction Coordination & Reactive State)                   |
|  - useKeyboardShortcuts (Quick Switchboard, Search, Save, Reorder)                    |
|  - ToastContext (Real-time feedback & action notifications)                           |
+-------------------------------------+-------------------------------------------------+
                                      |
+-------------------------------------v-------------------------------------------------+
|                           Persistence & Virtual Database                              |
|  +-------------------------------------+  +----------------------------------------+  |
|  |    IndexedDB Storage Layer (idb)    |  |      SQLite WASM Engine (sql.js)       |  |
|  |  - master_stock                     |  |  - In-memory relational queries        |  |
|  |  - movement_logs                    |  |  - ACID Transaction Ledger             |  |
|  |  - issued_documents                 |  |  - Point-in-time Snapshot Binaries     |  |
|  |  - received_documents               |  |  - SQL Query Console                   |  |
|  |  - adjustment_documents             |  +----------------------------------------+  |
|  |  - adjustment_requests              |                                              |
|  |  - backups                          |                                              |
|  +-------------------------------------+                                              |
+-------------------------------------+-------------------------------------------------+
                                      |
+-------------------------------------v-------------------------------------------------+
|                            Service Worker & Offline PWA                               |
|  - Vite PWA Plugin + Workbox Cache Strategy (StaleWhileRevalidate & CacheFirst)       |
|  - Standalone Web App Manifest & App Icons                                            |
|  - Offline Network State Detection & Auto-Sync                                        |
+---------------------------------------------------------------------------------------+
\`\`\`

---

## 3. Visual Design System & UI Archetype

The system adopts a **Precision Slate & Emerald/Teal** design archetype reflecting professional financial and supply chain tools.

### 3.1 Color Palette

| Token | Hex Value | Application |
| :--- | :--- | :--- |
| **Slate 950** | \`#020617\` | Root canvas dark mode background, primary modals |
| **Slate 900** | \`#0f172a\` | Header bars, primary table headers, ribbon backgrounds |
| **Slate 800** | \`#1e293b\` | Secondary panels, worksheet grid borders, dialog headers |
| **Teal 600** | \`#0d9488\` | Primary branding, action buttons, active tab indicators |
| **Emerald 600** | \`#059669\` | Success notifications, optimal stock badges, additions |
| **Rose 600** | \`#e11d48\` | Reorder warnings, out of stock badges, stock deductions |
| **Amber 500** | \`#f59e0b\` | Critical threshold warnings, adjustment approval pending |
| **Blue 600** | \`#2563eb\` | Stationery category chips, delivery goods receipt actions |

### 3.2 Typography & Scale
- **Display / Headers**: Plus Jakarta Sans, bold tracking \`-0.02em\`.
- **Data / Codes / Numbers**: JetBrains Mono / Space Grotesk tabular figures for Item IDs, Vouchers, and Quantities.
- **Body / Documentation**: Inter / System Sans-Serif, line height 1.6, constrained paragraph widths.

---

## 4. Complete Data Models & Database Schemas

### 4.1 TypeScript Entity Specifications

\`\`\`typescript
// Master Stock Item Definition
export interface StockItem {
  ItemID: string;          // e.g. "ST-001", "CL-014"
  ItemName: string;        // e.g. "A4 White Copy Paper (80gsm)"
  Category: 'Stationery' | 'Cleaning' | 'General';
  Qty: number;             // Current on-hand quantity
  ReorderLevel: number;    // Minimum safety stock threshold (default: 10)
  Unit?: string;           // "Reams", "Boxes", "Bottles", "Units"
  LastUpdated?: string;    // ISO timestamp
}

// Movement & Transaction Audit Log
export interface MovementLogEntry {
  id: string;
  Timestamp: string;       // Formatted "YYYY-MM-DD HH:MM:SS"
  Type: 'ISSUE' | 'DELIVERY' | 'ADJUSTMENT';
  ItemID: string;
  ItemName: string;
  Qty: number;             // Positive or negative delta
  DeptID: string;          // e.g. "D01", "D04"
  DeptName: string;        // e.g. "Finance", "Human Resources"
  DeptHead: string;        // Department Head Approver
  DeptEmail: string;       // Department Head Contact
  IssuerID: string;        // e.g. "ADM001"
  IssuerName: string;      // e.g. "Rachel Pickard"
  DocumentRef?: string;    // e.g. "IS-2026-0042", "GRN-20260825-01"
  DiscrepancyReason?: string;
  DiscrepancyNotes?: string;
  CountRef?: string;
}

// Requisition Issuance Document
export interface IssuedDocument {
  docType: 'ISSUE';
  slipNumber: string;      // "IS-YYYY-XXXX"
  timestamp: string;
  deptID: string;
  deptName: string;
  deptHeadName: string;
  deptHeadEmail: string;
  issuerID: string;
  issuerName: string;
  items: Array<{
    ItemID: string;
    ItemName: string;
    Category: string;
    Qty: number;
    Unit?: string;
  }>;
  pdfFileName: string;
  folderPath: string;
  fullSavedPath: string;
}

// Goods Received Note (GRN) Document
export interface ReceivedDocument {
  docType: 'DELIVERY';
  voucherNumber: string;   // "GRN-YYYYMMDD-XXXX"
  timestamp: string;
  deliveryRef: string;
  supplierName?: string;
  poNumber?: string;
  deliveryNoteNumber?: string;
  issuerID: string;
  issuerName: string;
  issuerRole: string;
  items: Array<{
    ItemID: string;
    ItemName: string;
    Category: string;
    Qty: number;
    Unit?: string;
  }>;
  pdfFileName: string;
  folderPath: string;
  fullSavedPath: string;
}

// Stock Discrepancy Adjustment Document
export interface AdjustmentDocument {
  docType: 'ADJUSTMENT';
  voucherNumber: string;   // "ADJ-YYYYMMDD-XXXX"
  timestamp: string;
  countRef: string;
  reasonCode: 'COUNT_DISCREPANCY' | 'DAMAGED_EXPIRED' | 'AUDIT_CORRECTION' | 'THEFT_LOSS' | 'OTHER';
  reasonLabel: string;
  notes: string;
  issuerID: string;
  issuerName: string;
  issuerRole: string;
  approvedBy?: string;
  approvedAt?: string;
  items: Array<{
    ItemID: string;
    ItemName: string;
    Category: string;
    SystemQty: number;
    PhysicalQty: number;
    VarianceQty: number;
    Unit: string;
  }>;
  pdfFileName: string;
  folderPath: string;
  fullSavedPath: string;
}

// Role-Based User Credentials
export interface AdminUser {
  IssuerID: string;        // "ADM001", "ADM002", "ADM003"
  IssuerName: string;      // "Rachel Pickard", "Mark Harrison", "Sarah Jenkins"
  Role: 'Procurement Manager' | 'Procurement Officer' | 'Procurement Clerk' | 'Audit Viewer';
  SecretPassword: string;  // Plaintext/hash for authentication verification
}

// Department Master Record
export interface Department {
  DeptID: string;          // "D01", "D02", "D03", "D04", "D05"
  DeptName: string;
  DeptHeadName: string;
  DeptHeadEmail: string;
}
\`\`\`

### 4.2 Relational SQLite Schema (\`sql.js\`)

\`\`\`sql
CREATE TABLE IF NOT EXISTS master_stock (
  ItemID TEXT PRIMARY KEY,
  ItemName TEXT NOT NULL,
  Category TEXT NOT NULL,
  Qty INTEGER NOT NULL DEFAULT 0,
  ReorderLevel INTEGER NOT NULL DEFAULT 10,
  Unit TEXT DEFAULT 'Units',
  LastUpdated TEXT
);

CREATE TABLE IF NOT EXISTS movement_logs (
  id TEXT PRIMARY KEY,
  Timestamp TEXT NOT NULL,
  Type TEXT NOT NULL,
  ItemID TEXT NOT NULL,
  ItemName TEXT NOT NULL,
  Qty INTEGER NOT NULL,
  DeptID TEXT,
  DeptName TEXT,
  DeptHead TEXT,
  DeptEmail TEXT,
  IssuerID TEXT NOT NULL,
  IssuerName TEXT NOT NULL,
  DocumentRef TEXT,
  DiscrepancyReason TEXT,
  DiscrepancyNotes TEXT,
  CountRef TEXT
);

CREATE TABLE IF NOT EXISTS issued_documents (
  slipNumber TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  deptID TEXT NOT NULL,
  deptName TEXT NOT NULL,
  deptHeadName TEXT NOT NULL,
  deptHeadEmail TEXT,
  issuerID TEXT NOT NULL,
  issuerName TEXT NOT NULL,
  itemsJson TEXT NOT NULL,
  pdfFileName TEXT,
  folderPath TEXT,
  fullSavedPath TEXT
);

CREATE TABLE IF NOT EXISTS received_documents (
  voucherNumber TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  deliveryRef TEXT NOT NULL,
  supplierName TEXT,
  poNumber TEXT,
  deliveryNoteNumber TEXT,
  issuerID TEXT NOT NULL,
  issuerName TEXT NOT NULL,
  issuerRole TEXT,
  itemsJson TEXT NOT NULL,
  pdfFileName TEXT,
  folderPath TEXT,
  fullSavedPath TEXT
);

CREATE TABLE IF NOT EXISTS adjustment_documents (
  voucherNumber TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  countRef TEXT NOT NULL,
  reasonCode TEXT NOT NULL,
  reasonLabel TEXT NOT NULL,
  notes TEXT,
  issuerID TEXT NOT NULL,
  issuerName TEXT NOT NULL,
  issuerRole TEXT,
  approvedBy TEXT,
  approvedAt TEXT,
  itemsJson TEXT NOT NULL,
  pdfFileName TEXT,
  folderPath TEXT,
  fullSavedPath TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  IssuerID TEXT PRIMARY KEY,
  IssuerName TEXT NOT NULL,
  Role TEXT NOT NULL,
  SecretPassword TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  DeptID TEXT PRIMARY KEY,
  DeptName TEXT NOT NULL,
  DeptHeadName TEXT NOT NULL,
  DeptHeadEmail TEXT
);

CREATE TABLE IF NOT EXISTS database_backups (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  recordCountsJson TEXT NOT NULL,
  databaseBinary BLOB
);
\`\`\`

---

## 5. Procurement Modules & Key Workflows

### 5.1 Requisition Issuance Engine (\`frmIssueItem\`)
1. **User Authentication Check**: Verifies active session and valid Issuer ID.
2. **Department Selection**: Auto-populates Department Head Name and Email (\`DeptID -> DeptHeadName, DeptHeadEmail\`).
3. **Multi-Item Cart Building**:
   - Stock availability validation (\`Requested Qty <= Available Qty\`).
   - Prevents duplicate items in a single slip; aggregates quantities instead.
4. **Slip ID Generation**: Sequential format \`IS-YYYY-XXXX\` (e.g., \`IS-2026-0001\`).
5. **Atomic Commit**:
   - Deducts quantities from \`master_stock\`.
   - Inserts individual rows into \`movement_logs\` for each item.
   - Saves document payload into \`issued_documents\`.
6. **PDF Generation**: Automatically compiles signed PDF Requisition Voucher and routes to \`\${MasterFolder}\\Issued_Items\\\`.

### 5.2 Goods Received Notes Delivery Engine (\`frmStockDelivery\`)
1. **Supplier & PO Reference Validation**: Logs Supplier Name, Purchase Order Number, Delivery Note Ref.
2. **Item Stock Replenishment**: Supports single or multi-item bulk delivery receipt.
3. **GRN Voucher Generation**: Sequential format \`GRN-YYYYMMDD-XXXX\`.
4. **Inventory Increment**: Updates on-hand quantities and creates transaction audit trail with positive quantity deltas.

### 5.3 Stock Adjustment & Two-Man Rule Engine (\`frmStockAdjustment\`)
1. **Physical Count Discrepancy Recording**: Enters System Quantity vs. Counted Physical Quantity.
2. **Variance Calculation**: \`Variance = Physical Qty - System Qty\`.
3. **Dual-Authorization Protocol**:
   - Standard Clerk (\`ADM002\`, \`ADM003\`): Creates an **Adjustment Request** placed in a pending approval queue.
   - Superior Admin (\`ADM001\` - Rachel Pickard): Reviews pending adjustment requests and authorizes or rejects with one click.
4. **Audit Slip Archiving**: Compiles formal adjustment voucher (\`ADJ-YYYYMMDD-XXXX.pdf\`) to \`\${MasterFolder}\\Adjustments\\\`.

### 5.4 Stock Reorder & Safety Threshold Engine (\`ReorderReportModal\`)
1. **Real-time Inventory Audit**: Scans all catalog items comparing \`Qty\` against \`ReorderLevel\`.
2. **Urgency Classification**:
   - **Out of Stock**: \`Qty == 0\` (Immediate replenishment).
   - **Critical Shortage**: \`Qty <= (ReorderLevel * 0.5)\` (High priority reorder).
   - **Low Stock**: \`Qty <= ReorderLevel\` (Standard reorder).
3. **Replenishment Target Math**: Calculates recommended order volume (\`Target = max(ReorderLevel * 2, 20) - CurrentQty\`).
4. **Executive PDF Compilation**: Generates official A4 audit report with ISO-9001 compliance badges, deficit charts, itemized tables, and Procurement Manager PO authorization blocks.

---

## 6. Document Generation & PDF Engine

All documents are dynamically rendered client-side using \`jspdf\` and high-contrast vector formatting:

| Document Type | Naming Convention | Primary Purpose |
| :--- | :--- | :--- |
| **Requisition Issue Slip** | \`IssueSlip_IS-YYYY-XXXX.pdf\` | Departmental custody transfer proof |
| **Goods Received Note (GRN)** | \`GRN_YYYYMMDD_XXXX.pdf\` | Supplier delivery receiving receipt |
| **Stock Adjustment Slip** | \`Adj_ADJ-YYYYMMDD-XXXX.pdf\` | Stock variance sign-off certificate |
| **Reorder Audit Report** | \`Reorder_Report_ROR-*.pdf\` | Executive deficit & procurement PO summary |
| **System Setup Guide** | \`Paramount_Procurement_Setup_Guide.pdf\` | Complete Excel VBA deployment manual |
| **UI Design System Guide** | \`Paramount_Design_System_Guide.pdf\` | Brand tokens & styling specifications |

---

## 7. Security, Inactivity Timeout & RBAC

### 7.1 Access Control Matrix

| Capability | Superior Admin (\`ADM001\`) | Procurement Officer (\`ADM002\`) | Procurement Clerk (\`ADM003\`) |
| :--- | :---: | :---: | :---: |
| Issue Stock Items | Yes | Yes | Yes |
| Receive Stock (GRN) | Yes | Yes | Yes |
| Request Adjustment | Yes | Yes | Yes |
| **Directly Authorize Adjustment** | **Yes** | No (Pending Queue) | No (Pending Queue) |
| **Create & Restore Backups** | **Yes** | No | No |
| **Modify User Roles & PINs** | **Yes** | No | No |
| **Configure Master Folder** | **Yes** | No | No |
| View Audit Trail & Reports | Yes | Yes | Yes |

### 7.2 Inactivity Security Lockout
- **2-Minute Inactivity Window**: Listens for user interactions (keypress, pointer movement, clicks).
- **Graceful Warning**: 30-second warning countdown modal before session termination.
- **Auto-Lockout**: Clears in-memory authentication credentials and redirects to the Switchboard Login dialog (\`frmNavigation\`).

---

## 8. Excel VBA Macro Automation Architecture

For desktop deployment, the application generates a complete set of VBA modules (\`.bas\`) and custom Ribbon UI XML:

- **\`mod_01_Config\`**: Global constants, master folder paths, and worksheet name mappings.
- **\`mod_02_IssueEngine\`**: Form logic for \`frmIssueItem\`, sequential numbering, and PDF printing via \`ExportAsFixedFormat\`.
- **\`mod_03_DeliveryEngine\`**: GRN processing, supplier reference capture, and inventory increments.
- **\`mod_04_StockAdjustmentEngine\`**: Variance calculation, password verification, and adjustment archiving.
- **\`mod_05_EmailAutomation\`**: Outlook MAPI integration for automated dispatch of PDF issue slips to department heads.
- **\`mod_06_SecurityAudit\`**: Inactivity timer via \`Application.OnTime\`, worksheet protection, and change logging.
- **\`mod_07_UserInterface\`**: Navigation switchboard (\`frmNavigation\`) and dynamic ribbon callbacks.

---

## 9. Directory Structure & File Map

\`\`\`
/
├── DESIGN.md                          # Full system design & architecture documentation (this file)
├── BUILD_GUIDE.md                     # Build instructions and setup reference
├── PWA_SYSTEM_SPEC.md                 # Offline PWA specification & service worker manifest
├── metadata.json                      # Applet capabilities and metadata
├── vite.config.ts                     # Vite + PWA + Workbox + Chunking configuration
├── package.json                       # Dependencies and build scripts
├── index.html                         # Entry HTML with PWA meta tags
│
└── src/
    ├── App.tsx                        # Main application container & view coordinator
    ├── main.tsx                       # React DOM entry point
    ├── index.css                      # Global Tailwind CSS imports
    ├── types.ts                       # TypeScript interfaces and enum declarations
    │
    ├── components/
    │   ├── Navbar.tsx                 # Top navigation bar with theme and PWA status
    │   ├── simulator/                 # Primary Excel Inventory Simulation Suite
    │   │   ├── ExcelSimulator.tsx     # Full workbook view with ribbon and worksheets
    │   │   ├── StockSearchBar.tsx     # Fuzzy multi-token search & filter chips
    │   │   ├── BulkStockActionsBar.tsx# Multi-item batch updates and deliveries
    │   │   ├── ReorderReportModal.tsx # Safety threshold audit & reorder PDF modal
    │   │   ├── DocumentViewerModal.tsx# Formatted voucher document renderer
    │   │   ├── NavigationDialog.tsx   # Switchboard dialog (frmNavigation)
    │   │   ├── BackupRecoveryModal.tsx# SQLite snapshot & disaster recovery manager
    │   │   └── tabs/                  # Worksheet tabs (Master Stock, Logs, Config)
    │   │
    │   ├── export/                    # Export Center (Excel, VBA, JSON, PDF)
    │   │   └── ExportCenter.tsx
    │   ├── audit/                     # Movement Audit Trail & Ledger Vault
    │   ├── vba/                       # VBA Code Studio & PowerShell Script Hub
    │   ├── styleguide/                # Interactive Design System Explorer
    │   ├── electron/                  # Electron Desktop Packaging Wizard
    │   └── common/                    # Modals, buttons, toast notifications
    │
    ├── db/
    │   └── offlineStorage.ts          # IndexedDB schema, migrations, and JSON dump engine
    │
    ├── hooks/
    │   ├── useSqliteProcurement.ts    # Virtual SQLite WASM database hook
    │   └── useKeyboardShortcuts.ts    # Global hotkey listeners
    │
    └── utils/
        ├── reorderReportPdfGenerator.ts # Stock reorder analysis & PDF compiler
        ├── setupGuideGenerator.ts     # Setup guide PDF generator
        ├── styleGuideGenerator.ts     # Design system PDF generator
        ├── sqliteBridge.ts            # SQLite WASM initialization & memory sync
        ├── searchEngine.ts            # Fuzzy indexing algorithm
        └── pwaExport.ts               # File download helpers
\`\`\`

---

## 10. Re-creation & Build Instructions

To build and run the complete application locally:

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Compile for production
npm run build

# 4. Preview production build
npm run preview
\`\`\`

---
*Paramount Procurement & Inventory Control System — ISO-9001 Safety Stock & Automated Audit Control Standard.*
`;
}

export function downloadSystemDesignFile(format: 'md' | 'txt' | 'json' = 'md') {
  const content = getSystemDesignMarkdown();
  let mimeType = 'text/markdown;charset=utf-8';
  let extension = 'md';

  if (format === 'txt') {
    mimeType = 'text/plain;charset=utf-8';
    extension = 'txt';
  } else if (format === 'json') {
    mimeType = 'application/json;charset=utf-8';
    extension = 'json';
  }

  const fileData = format === 'json'
    ? JSON.stringify({ title: 'Paramount Procurement System Design Specification', version: '2.5.0', markdown: content }, null, 2)
    : content;

  const blob = new Blob([fileData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DESIGN.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
}
