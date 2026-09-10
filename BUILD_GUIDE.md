# COMPREHENSIVE VBA CODEBASE AUDIT & BUILD GUIDE
## 32-Bit / 64-Bit Excel Macro-Enabled Procurement & Inventory Control System (`.xlsm`)

---

## 1. EXECUTIVE CODEBASE AUDIT & DEBUGGING REPORT

A rigorous software engineering audit was conducted across all VBA modules, forms, setup scripts, and event handlers. All runtime errors, missing procedures, path concatenation defects, and data inconsistencies have been identified and resolved.

### A. Path Separators & File System Concatenation (`Application.PathSeparator`)
- **Issue Identified**: Path operations were using hardcoded backslashes `\` or assuming `ThisWorkbook.Path` already ended with a trailing slash. On unsaved workbooks or varied OS/drive configurations, concatenation produced invalid paths like `C:\Users\DesktopIssued_Items` or runtime permission errors.
- **Resolution**:
  1. Implemented `GetNormalizedBasePath()` in `modProcurementSystem.bas` that inspects `ThisWorkbook.Path` (falling back to `CurDir()` if unsaved) and appends `Application.PathSeparator` dynamically.
  2. Updated `EnsureDirectoriesExist()` and `GenerateIssueSlipPDF()` to build paths using `Application.PathSeparator`.
  3. Ensured `Dir(sFolderPath, vbDirectory)` and `MkDir` accurately detect and create the `Issued_Items` directory.

### B. Missing Procedure Implementation (`CheckWorkbookStructure`)
- **Issue Identified**: `ThisWorkbook.Workbook_Open()` invoked `Call CheckWorkbookStructure`, but `CheckWorkbookStructure` was undefined in the project, causing a compile error (`Sub or Function not defined`) upon opening the workbook.
- **Resolution**:
  Implemented `Public Sub CheckWorkbookStructure()` inside `modProcurementSystem.bas`. It verifies that `Master_Stock`, `Movement_Log`, and `Admin_Config` exist. If missing, it prompts the user and automatically invokes `SetupSystemWorksheets` to rebuild the required sheet schemas.

### C. Completed UserForm Event Handlers (`frmIssueRequest`)
- **Issue Identified**: Key controls on `frmIssueRequest` lacked event code (specifically `btnAddItem_Click`, `btnRemoveItem_Click`, `btnClearCart_Click`, and `UserForm_Initialize`), rendering the requisition cart unusable.
- **Resolution**:
  1. Implemented `UserForm_Initialize()` to set `lstQueue.ColumnCount = 3`, `lstQueue.ColumnWidths = "70 pt;180 pt;50 pt"`, and populate the item selector dropdown `cmbItems`.
  2. Implemented `btnAddItem_Click()` with full real-time stock verification against `Master_Stock`. It checks available stock, handles items already in the cart queue, prevents over-issuance, and appends rows to `lstQueue`.
  3. Implemented `btnRemoveItem_Click()` and `btnClearCart_Click()` to manage cart queue items.
  4. Implemented `btnConfirmIssue_Click()` with a sequential pop-up confirmation preview, stock deduction, `Movement_Log` entry, PDF export in `Issued_Items\`, and Late Binding Outlook email dispatch.

### D. Setup Script & Data Synchronization
- **Issue Identified**: Legacy setup macros (`SetupMacro.bas`) and PowerShell scripts (`Setup_XLSM_Project.ps1`) only seeded a subset of departments (missing `DEPT-104` Operations & `DEPT-106` Sales).
- **Resolution**:
  1. Synchronized `SetupMacro.bas` and `Setup_XLSM_Project.ps1` to seed all 6 Authorized Issuers (`ADM001` - `ADM006`), all 6 Departments (`DEPT-101` - `DEPT-106`), and all 20 stationery & cleaning inventory items.

---

## 2. USERFORM CONTROL SPECIFICATIONS & EVENT MATRIX

### A. `frmLogin` (Authentication Form)
| Control Name | Type | Caption / Properties | Event Handler | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `txtWorkID` | TextBox | Default text = "" | - | User inputs Issuer Work ID (e.g. `ADM001`) |
| `txtPassword` | TextBox | `PasswordChar = "*"` | - | User inputs password (masked) |
| `lblStatus` | Label | Caption = status msg | - | Displays authentication attempt feedback |
| `btnLogin` | CommandButton | Caption = "Login" | `btnLogin_Click()` | Validates credentials against `Admin_Config!A:D` |
| `btnCancel` | CommandButton | Caption = "Cancel" | `btnCancel_Click()` | Aborts login and closes workbook access |

### B. `frmNavigation` (Main Switchboard)
| Control Name | Type | Caption / Properties | Event Handler | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `lblWelcome` | Label | Display active session | `UserForm_Initialize()` | Shows `g_CurrentIssuerName [g_CurrentIssuerID]` |
| `btnStockUpdate` | CommandButton | "Stock Delivery / Goods Received" | `btnStockUpdate_Click()` | Opens `frmStockDelivery` |
| `btnIssueRequest` | CommandButton | "Issue Out Requests" | `btnIssueRequest_Click()` | Opens `frmIssueRequest` |
| `btnExit` | CommandButton | "Exit System" | `btnExit_Click()` | Unloads form and exits session |

### C. `frmStockDelivery` (Goods Received Form)
| Control Name | Type | Caption / Properties | Event Handler | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `cmbItems` | ComboBox | Dropdown list | `UserForm_Initialize()` | Populates items from `Master_Stock` |
| `txtQuantity` | TextBox | Integer input | - | Quantity received from supplier |
| `btnSaveDelivery` | CommandButton | "Save Delivery" | `btnSaveDelivery_Click()` | Calls `ProcessStockDelivery`, updates `Master_Stock` & `Movement_Log` |
| `btnClose` | CommandButton | "Close" | `btnClose_Click()` | Unloads form |

### D. `frmIssueRequest` (Department Requisition Cart Form)
| Control Name | Type | Caption / Properties | Event Handler | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `txtDeptID` | TextBox | Input Dept ID | `txtDeptID_Change()` | Triggers `AutoLookupDepartment()` |
| `lblDeptName` | Label | Caption = Dept Name | - | Auto-filled from `Admin_Config!F:I` |
| `lblDeptHead` | Label | Caption = Dept Head | - | Auto-filled Dept Head Name |
| `lblDeptEmail` | Label | Caption = Dept Email | - | Auto-filled Dept Head Email |
| `cmbItems` | ComboBox | Dropdown list | `UserForm_Initialize()` | Pick inventory item |
| `txtQty` | TextBox | Quantity input | - | Quantity to request |
| `btnAddItem` | CommandButton | "Add to Requisition Queue" | `btnAddItem_Click()` | Validates stock and adds item to `lstQueue` |
| `btnRemoveItem` | CommandButton | "Remove Selected" | `btnRemoveItem_Click()` | Removes item from cart queue |
| `btnClearCart` | CommandButton | "Clear All" | `btnClearCart_Click()` | Clears cart queue |
| `lstQueue` | ListBox | `ColumnCount = 3`, `ColumnWidths = "70 pt;180 pt;50 pt"` | - | Displays cart: ItemID, ItemName, Qty |
| `btnConfirmIssue` | CommandButton | "Confirm & Process Issue" | `btnConfirmIssue_Click()` | Triggers preview, deducts stock, exports PDF, emails via Outlook |
| `btnClose` | CommandButton | "Close" | `btnClose_Click()` | Unloads form |

---

## 3. MANUAL STEP-BY-STEP ASSEMBLY GUIDE IN EXCEL

To manually assemble the complete macro system in Excel:

1. **Create Workbook & Enable Developer Tab**:
   - Open Microsoft Excel and create a blank workbook.
   - Go to **File > Options > Customize Ribbon** and check **Developer**.
2. **Open Visual Basic for Applications (VBE)**:
   - Press `ALT + F11` to open VBE.
3. **Insert Standard Modules**:
   - Click **Insert > Module**. Rename it `modProcurementSystem` in the Properties Window (`F4`).
   - Copy and paste code from `modProcurementSystem.bas`.
   - Click **Insert > Module**. Rename it `modSecurity`. Paste code from `modSecurity.bas`.
   - Click **Insert > Module**. Rename it `SetupMacro`. Paste code from `SetupMacro.bas`.
4. **Configure `ThisWorkbook` Class Module**:
   - Double-click `ThisWorkbook` in the VBA Project tree (`CTRL + R`).
   - Copy and paste code from `ThisWorkbook.cls`.
5. **Create UserForms**:
   - Click **Insert > UserForm**. Rename to `frmLogin`. Add controls (`txtWorkID`, `txtPassword`, `lblStatus`, `btnLogin`, `btnCancel`). Paste form code.
   - Click **Insert > UserForm**. Rename to `frmNavigation`. Add controls (`lblWelcome`, `btnStockUpdate`, `btnIssueRequest`, `btnExit`). Paste form code.
   - Click **Insert > UserForm**. Rename to `frmStockDelivery`. Add controls (`cmbItems`, `txtQuantity`, `btnSaveDelivery`, `btnClose`). Paste form code.
   - Click **Insert > UserForm**. Rename to `frmIssueRequest`. Add controls (`txtDeptID`, `lblDeptName`, `lblDeptHead`, `lblDeptEmail`, `cmbItems`, `txtQty`, `btnAddItem`, `btnRemoveItem`, `btnClearCart`, `lstQueue`, `btnConfirmIssue`, `btnClose`). Paste form code.
6. **Initialize Worksheets**:
   - Press `ALT + F8` in Excel, select `SetupSystemWorksheets`, and click **Run**.
   - This automatically creates `Master_Stock`, `Movement_Log`, and `Admin_Config` with all seed data and formatting.
7. **Save as Macro-Enabled Workbook (`.xlsm`)**:
   - Click **File > Save As**.
   - Select Save as type: **Excel Macro-Enabled Workbook (*.xlsm)** (FileFormat 52).

---

## 4. AUTOMATED ONE-CLICK POWERSHELL SETUP (WINDOWS)

For automated assembly on Windows computers:
1. Copy the contents of `Setup_XLSM_Project.ps1`.
2. Open PowerShell as Administrator.
3. Execute the script:
   ```powershell
   .\Setup_XLSM_Project.ps1
   ```
4. The script opens Excel COM automation, builds all three worksheets, populates initial inventory, issuers, and departments, and saves `Stationery_Cleaning_Procurement_System.xlsm` on your Desktop.

---

## 5. ENVIRONMENT & PLATFORM COMPATIBILITY NOTES

1. **32-Bit & 64-Bit Office Compatibility**:
   - Uses `#If VBA7` conditional compilation with `PtrSafe` for Win32 API declarations (e.g. `Sleep` API in `kernel32`).
2. **Late Binding for Outlook Integration**:
   - Uses `CreateObject("Outlook.Application")` instead of Early Binding (`Outlook.Application`).
   - **Advantage**: Eliminates "Missing Reference" DLL errors when moving the workbook across different versions of Microsoft Office.
3. **OS Constraints**:
   - Excel UserForms and COM Object automation are native to Microsoft Windows Office. On macOS, UserForms display with basic layouts and Outlook COM object automation is unavailable.

---

## 6. SECURITY HARDENING RECOMMENDATIONS

1. **Password Protection for Admin Config Sheet**:
   - Plaintext passwords in `Admin_Config` Column D should be set to `xlSheetVeryHidden` so they cannot be unhidden from the Excel right-click menu:
     ```vba
     ThisWorkbook.Sheets("Admin_Config").Visible = xlSheetVeryHidden
     ```
2. **Password Hashing (Recommended Enhancement)**:
   - Instead of storing plaintext passwords (`Superior1234`), store a SHA-256 hash or salted hash string in Column D and verify `SHA256(sInputPassword) = StoredHash`.
3. **Lock VBA Project**:
   - In VBE, go to **Tools > VBAProject Properties > Protection**.
   - Check **Lock project for viewing** and set a password to prevent unauthorized users from viewing source code or credentials.
