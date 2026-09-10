# PWA System Specification: Procurement & Inventory Management Simulator

## 1. Core Architectural Specifications

### A. 100% Offline Resilience & Caching Strategy
- **Service Worker Lifecycle**: Built with `vite-plugin-pwa` and Workbox.
- **Cache-First Asset Serving**: HTML, JS bundles, CSS, fonts, and inline icons (`lucide-react`) are cached in CacheStorage on first install/launch so the app opens instantly with zero network connectivity.
- **Auto-Update & Versioning**: Register an auto-update Service Worker flow with `registerType: 'autoUpdate'` with custom prompt toasts when a new version is deployed.

### B. Full Embedded Database & Persistence Layer
- **Local Embedded Database**:
  - Browser-native **IndexedDB (via idb)** and **SQLite in the browser (via sql.js WebAssembly / IndexedDB)**.
  - Zero-data-loss transaction commits for all `Master_Stock`, `Requisitions (RO)`, `Purchase Orders (PO)`, `Goods Received Notes (GRN)`, `Stock Issue Vouchers (SIV)`, and `Stock Adjustments (SAR)`.
- **Offline Import / Export & File System Access API**:
  - Universal browser `window.showSaveFilePicker()` / `window.showOpenFilePicker()` (with automatic fallback to `<input type="file">` / Blob downloads) for:
    - Direct export to Excel (`.xlsx` via `xlsx` library).
    - Database backup `.sqlite` / `.json` export and import.
    - PDF receipt and audit voucher generation via `jspdf` / `window.print()`.

### C. Native Desktop & Mobile PWA Installability
- **Web App Manifest (`manifest.webmanifest`)**:
  - `display: "standalone"`
  - `orientation: "any"`
  - High-res SVG and PNG icons (`192x192`, `512x512`, maskable).
  - Scope: `"/"` and `start_url: "/"`.
  - Shortcuts for quick actions ("Master Stock", "Stock Adjustment", "Requisitions").
- **In-App Custom Install Prompt**:
  - Intercept the `beforeinstallprompt` event to provide a clean "Install App" button in the UI for desktop and mobile dock icons.

---

## 2. File Tree Blueprint
```
├── public/
│   ├── favicon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── maskable-icon.png
├── src/
│   ├── components/
│   │   ├── simulator/ # ExcelSimulator, Spreadsheets, Dialogs, Vouchers
│   │   │   └── tabs/  # MasterStockTab, RequisitionTab, StockAdjustmentTab, etc.
│   │   ├── pwa/
│   │   │   ├── PWAInstallButton.tsx # Native install banner & prompt handler
│   │   │   └── OfflineStatusBadge.tsx # Visual network & sync indicator
│   ├── db/
│   │   ├── offlineStorage.ts # IndexedDB / SQLite persistence adapter
│   │   └── defaultSeeds.ts   # Default master inventory, departments, accounts
│   ├── hooks/
│   │   ├── useSqliteProcurement.ts # Hook connected to client-side offline DB
│   │   └── usePwaInstall.ts        # Hook for beforeinstallprompt & offline status
│   ├── types.ts # Procurement & inventory TypeScript definitions
│   ├── utils/
│   │   └── pwaExport.ts # Native File Export & Print Utilities
│   ├── App.tsx  # Main App with PWA provider & toast containers
│   └── main.tsx # Service Worker registration entry
├── vite.config.ts # Configured with VitePWA & Workbox
├── package.json
└── tsconfig.json
```

---

## 3. Verified Features & Workflows
1. **Master Inventory Sheet**: Real-time quantity balances, reorder level color-coding, unit thresholds, additions, and mutations.
2. **Departmental Requisition Orders (RO)**: Multi-line item requests, budget validation, and issuing status.
3. **Purchase Orders (PO) & GRN Lifecycle**: Supplier allocation, GRN variance calculation, automated batch inventory replenishment.
4. **Stock Issue Vouchers (SIV)**: Departmental deductions, requisition fulfillment, and voucher numbering.
5. **Stock Adjustment Governance**:
   - Reason coding (Shrinkage, Damage, Expiry, Audit Correction).
   - Time-limited authorized access window with locked request payloads.
   - Automatic batch closure and success confirmations upon final item reconciliation.
6. **Role-Based Access Control (RBAC)**: Superior Admin (ADM001), Store Clerks, and Department Approver profiles.
7. **100% Offline Testing**: Works seamlessly with airplane mode or offline networks.
