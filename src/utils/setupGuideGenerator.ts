export interface SetupGuideDownloadOptions {
  format: 'md' | 'html' | 'txt';
}

export function generateSetupGuideMarkdown(): string {
  return `# 32-BIT EXCEL VBA PROCUREMENT & INVENTORY CONTROL SYSTEM
## Complete Control Inventory, Full Codebase & Handler Attachment Guide

---

### EXECUTIVE OVERVIEW
This document provides complete step-by-step instructions for assembling, configuring, securing, and operating the **Macro-Enabled Excel VBA Procurement System (.xlsm)** on your local Windows workstation.

The system automates:
1. **Master Inventory Control** (\`Master_Stock\` sheet)
2. **Audit Movement Logging** (\`Movement_Log\` sheet)
3. **Issuer Authentication & Department Routing** (\`Admin_Config\` sheet)
4. **Automated PDF Requisition Generation** (stored automatically in \`Issued_Items\\\`)
5. **Preview Confirmation & Item Deletion Modal**
6. **Auto-save Workbook in .xlsm Macro-Enabled Format** (FileFormat 52)

---

### 1. COMPLETE USERFORM CONTROL INVENTORIES

#### A. \`frmLogin\` (Authentication UserForm)
| Control Type | Control Name (\`(Name)\`) | Key Property / Setting | Functional Purpose |
| :--- | :--- | :--- | :--- |
| **TextBox** | \`txtWorkID\` | \`Text = ""\` | User inputs Issuer Work ID (e.g. \`ADM001\`) |
| **TextBox** | \`txtPassword\` | \`PasswordChar = "*"\` | User inputs secret password (masked) |
| **CommandButton** | \`btnLogin\` | \`Caption = "Login"\` | Validates credentials against \`Admin_Config!A:D\` |
| **CommandButton** | \`btnCancel\` | \`Caption = "Cancel"\` | Aborts login and unloads form |
| **Label** | \`lblStatus\` | \`Caption = "Please enter Work ID and Password"\` | Displays authentication attempt feedback |
| **Label** | \`lblTitle\` | \`Caption = "Stationery & Cleaning Procurement Login"\` | Header banner |

#### B. \`frmNavigation\` (Main Switchboard UserForm)
| Control Type | Control Name (\`(Name)\`) | Key Property / Setting | Functional Purpose |
| :--- | :--- | :--- | :--- |
| **Label** | \`lblWelcome\` | \`Caption = "Active Session: ..."\` | Displays active logged-in issuer name, ID & role |
| **CommandButton** | \`btnStockUpdate\` | \`Caption = "Goods Received / Stock Delivery"\` | Opens \`frmStockDelivery\` goods receiving dialog |
| **CommandButton** | \`btnIssueRequest\` | \`Caption = "Departmental Requisitions (Issue Out)"\` | Opens \`frmIssueRequest\` requisition cart dialog |
| **CommandButton** | \`btnEditStock\` | \`Caption = "Edit Stock Item Name"\` | Opens \`frmEditStockItem\` to rename items |
| **CommandButton** | \`btnMasterStock\` | \`Caption = "Go to Master_Stock Sheet"\` | Closes switchboard to view \`Master_Stock\` directly |
| **CommandButton** | \`btnExit\` | \`Caption = "Exit / Logout"\` | Resets active session and unloads form |

#### C. \`frmStockDelivery\` (Goods Received / Stock Update Form)
| Control Type | Control Name (\`(Name)\`) | Key Property / Setting | Functional Purpose |
| :--- | :--- | :--- | :--- |
| **ComboBox** | \`cmbItems\` | \`Style = 0 (fmStyleDropDownCombo)\` | Populates items from \`Master_Stock\` |
| **TextBox** | \`txtQuantity\` | \`Text = ""\` | Input delivery quantity (positive integer) |
| **CheckBox** | \`chkBulkMode\` | \`Value = False\` | Toggle bulk shipment delivery mode |
| **CommandButton** | \`btnSaveDelivery\` | \`Caption = "Save Delivery Shipment"\` | Updates \`Master_Stock\` & appends row to \`Movement_Log\` |
| **CommandButton** | \`btnClose\` | \`Caption = "Close"\` | Unloads form |

#### D. \`frmIssueRequest\` (Requisition Cart & Issue Out Form)
| Control Type | Control Name (\`(Name)\`) | Key Property / Setting | Functional Purpose |
| :--- | :--- | :--- | :--- |
| **TextBox** | \`txtDeptID\` | \`Text = ""\` | Input Department ID (e.g. \`DEPT-01\`) |
| **CommandButton** | \`btnLookupDept\` | \`Caption = "Lookup Dept"\` | Manually triggers department lookup |
| **Label** | \`lblDeptName\` | \`Caption = "-"\` | Auto-populated department title |
| **Label** | \`lblDeptHead\` | \`Caption = "-"\` | Auto-populated department head name |
| **Label** | \`lblDeptEmail\` | \`Caption = "-"\` | Auto-populated department head email |
| **ComboBox** | \`cmbItems\` | \`Style = 0\` | Master Stock dropdown/drop-up list ('Click an item to select it') |
| **TextBox** | \`txtSearch\` | \`Text = ""\` | Search filter bar positioned below dropdown list |
| **TextBox** | \`txtQty\` | \`Text = ""\` | Input requisition quantity |
| **CommandButton** | \`btnAddItem\` | \`Caption = "Add to Cart"\` | Verifies stock & appends row to cart queue |
| **CommandButton** | \`btnRemoveItem\` | \`Caption = "Remove Selected"\` | Removes highlighted item from queue |
| **CommandButton** | \`btnClearCart\` | \`Caption = "Clear Cart"\` | Clears all items in queue |
| **ListBox** | \`lstQueue\` | \`ColumnCount = 3\`<br>\`ColumnWidths = 70 pt;180 pt;50 pt\` | Displays cart queue: Col 1: ItemID, Col 2: ItemName, Col 3: Qty |
| **CommandButton** | \`btnConfirmIssue\` | \`Caption = "Confirm & Process Issue"\` | Triggers preview confirmation, stock deduction, PDF export, and .xlsm autosave |
| **CommandButton** | \`btnClose\` | \`Caption = "Close"\` | Unloads form |

#### E. \`frmEditStockItem\` (Edit Inventory Item Details)
| Control Type | Control Name (\`(Name)\`) | Key Property / Setting | Functional Purpose |
| :--- | :--- | :--- | :--- |
| **ComboBox** | \`cmbItems\` | \`Style = 0\` | Select stock item to rename |
| **TextBox** | \`txtNewItemName\` | \`Text = ""\` | Edit item display name |
| **ComboBox** | \`cmbCategory\` | \`Style = 0\` | Select category (Stationery / Cleaning) |
| **TextBox** | \`txtStockQty\` | \`Text = ""\` | Edit current stock quantity |
| **CommandButton** | \`btnSave\` | \`Caption = "Save Changes"\` | Updates \`Master_Stock\` sheet |
| **CommandButton** | \`btnClose\` | \`Caption = "Close"\` | Unloads form |

#### F. \`frmUserManagement\` (Rachel Pickard ADM001 Superior Admin CRUD)
| Control Type | Control Name (\`(Name)\`) | Key Property / Setting | Functional Purpose |
| :--- | :--- | :--- | :--- |
| **ListBox** | \`lstIssuers\` | \`ColumnCount = 4\` | Displays accounts from \`Admin_Config!A:D\` |
| **TextBox** | \`txtIssuerID\` | \`Text = ""\` | Issuer Work ID |
| **TextBox** | \`txtIssuerName\` | \`Text = ""\` | Full Name |
| **TextBox** | \`txtRole\` | \`Text = ""\` | Official Role |
| **TextBox** | \`txtSecretPassword\` | \`PasswordChar = "*"\` | Secret Password |
| **CommandButton** | \`btnAdd / btnUpdate / btnDelete\` | \`Caption = "Add / Update / Delete"\` | Executes CRUD on \`Admin_Config\` |
| **CommandButton** | \`btnClose\` | \`Caption = "Close"\` | Unloads form |

---

### 2. STEP-BY-STEP TUTORIAL: HOW TO ATTACH CODE HANDLERS IN EXCEL VBE

Follow these exact steps to create UserForms and attach event handlers in Microsoft Excel:

#### Step 1: Open Visual Basic for Applications (VBE)
1. Open Excel on your Windows computer.
2. Press **Alt + F11** (or go to **Developer Tab ➔ Visual Basic**).

#### Step 2: Insert a New UserForm
1. In the VBE menu bar, click **Insert ➔ UserForm**.
2. If the **Properties Window** is not visible on the left, press **F4**.
3. If the **Toolbox** window is not visible, click **View ➔ Toolbox**.

#### Step 3: Set UserForm Properties
1. In the Properties window (\`F4\`), select the form.
2. Change the **\`(Name)\`** property to match your form (e.g., \`frmLogin\`).
3. Change the **\`Caption\`** property to a user-friendly title (e.g., \`Stationery & Cleaning Procurement Login\`).

#### Step 4: Draw Controls onto the UserForm Canvas
1. From the **Toolbox**, click a control icon (e.g., **TextBox**, **Label**, **CommandButton**, **ListBox**, **ComboBox**).
2. Click and drag on the UserForm canvas to draw the control.
3. Select the newly created control and update its **\`(Name)\`** in the Properties window:
   - For \`txtWorkID\`: Name = \`txtWorkID\`
   - For \`txtPassword\`: Name = \`txtPassword\`, set **\`PasswordChar\`** = \`*\`
   - For \`btnLogin\`: Name = \`btnLogin\`, Caption = \`Login\`
   - For \`btnCancel\`: Name = \`btnCancel\`, Caption = \`Cancel\`
   - For \`lstQueue\`: Name = \`lstQueue\`, set **\`ColumnCount\`** = \`3\`, set **\`ColumnWidths\`** = \`70 pt;180 pt;50 pt\`

#### Step 5: Attach Code Handlers to the UserForm
There are **two easy ways** to attach event code handlers to controls:

##### Method A: Double-Click Control (Recommended)
1. Double-click any control on the UserForm canvas (e.g., double-click \`btnLogin\`).
2. Excel VBE automatically opens the Code Window and generates the event signature:
   \`\`\`vba
   Private Sub btnLogin_Click()

   End Sub
   \`\`\`
3. Select all code inside the UserForm's code window (\`Ctrl + A\`) and replace it with the complete form code provided in our Code Hub!

##### Method B: Right-Click ➔ View Code (\`F7\`)
1. Right-click anywhere on the UserForm canvas and select **View Code** (or press **F7**).
2. At the top left dropdown of the Code Window, select the control name (e.g., \`UserForm\` or \`btnAddItem\`).
3. At the top right dropdown, select the event (e.g., \`Initialize\`, \`Click\`, or \`Change\`).
4. Paste the event code blocks.

---

### 3. AUTHORIZED ISSUER ACCOUNTS & CREDENTIALS
Configure or verify the following credentials in the \`Admin_Config\` sheet (Columns A to D):

| Issuer ID | Full Name | Official Role | Login Password | Status |
| :--- | :--- | :--- | :--- | :--- |
| **ADM001** | Rachel Pickard | Procurement Manager | \`Superior1234\` | Active |
| **ADM002** | Loveness Mawisire | Master Inventory Controller | \`Micky1234Master\` | Active |
| **ADM003** | Lyda Gurupira | Inventory Controller | \`Master1234\` | Active |
| **ADM004** | Caeser Joe | Procurement Supervisor | \`Second1234\` | Active |
| **ADM005** | Farai Mandoreba | Procurement Assistant | \`Procurement1234\` | Active |
| **ADM006** | Bianca Mpakairi | Administrator | \`Admin1234!\` | Active |
| **ADM007** | Farai Peter | Procurement Assistant | \`Assistant1234\` | Active |

---

### 4. EXCEL MACRO SECURITY & TRUST CENTER CONFIGURATION
1. Open Microsoft Excel on your PC.
2. Navigate to **File** ➔ **Options** ➔ **Trust Center** ➔ **Trust Center Settings...**
3. Select **Macro Settings** in the left menu:
   - Check **"Enable VBA macros"** OR **"Disable VBA macros with notification"**.
   - Check **"Trust access to the VBA project object model"**.
4. Click **OK** twice to save settings.

---

### 5. AUTOMATED PDF FOLDER CREATION & WORKBOOK AUTOSAVE
- **PDF Directory**: The system uses \`Dir(sPath, vbDirectory)\` and \`MkDir\` to automatically create an \`Issued_Items\\\` folder in the workbook location. Requisition vouchers are saved here in fixed PDF format using \`ExportAsFixedFormat Type:=xlTypePDF\`.
- **Autosave as .xlsm**: The system automatically saves the workbook as a macro-enabled workbook using \`SaveAs FileFormat 52\`.

---

### 6. LOCKING & SAVING THE WORKBOOK
1. In VBE, go to **Tools** ➔ **VBAProject Properties...** ➔ **Protection** tab.
2. Check **"Lock project for viewing"**.
3. Enter a strong password and confirm it.
4. Close the VBE window.
5. In Excel, click **File** ➔ **Save As**.
6. Set **Save as type** to **Excel Macro-Enabled Workbook (*.xlsm)** (FileFormat 52).
7. Save as \`Stationery_&_Cleaning_System.xlsm\`.

---
*Setup Guide Generated: ${new Date().toLocaleString()}*
`;
}

export function generateSetupGuideHTML(): string {
  const md = generateSetupGuideMarkdown();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>32-Bit Excel VBA Procurement System Setup & Security Guide</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);
      border: 1px solid #e2e8f0;
    }
    h1 { color: #0f172a; font-size: 24px; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-top: 0; }
    h2 { color: #0369a1; font-size: 18px; margin-top: 28px; }
    h3 { color: #0f172a; font-size: 15px; margin-top: 20px; }
    h4 { color: #334155; font-size: 14px; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
    th { background-color: #f1f5f9; color: #0f172a; font-weight: 700; }
    tr:nth-child(even) { background-color: #f8fafc; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #f1f5f9; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 85%; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
    .badge { display: inline-block; background: #0ea5e9; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
    .print-btn { background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; float: right; margin-bottom: 20px; }
    .print-btn:hover { background: #0369a1; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border: none; padding: 0; width: 100%; max-width: 100%; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
    <div>
      <span class="badge">VBA Manual & Setup Guide</span>
    </div>
    <h1>32-Bit Excel VBA Procurement System Setup & Security Guide</h1>
    <p><em>Comprehensive instructions for assembling, testing, locking, and operating the macro-enabled workbook.</em></p>
    <hr />
    
    <h2>1. Authorized Issuer Accounts & Login Credentials</h2>
    <table>
      <thead>
        <tr>
          <th>Issuer ID</th>
          <th>Full Name</th>
          <th>Role</th>
          <th>Password</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>ADM001</strong></td><td>Rachel Pickard</td><td>Procurement Manager</td><td><code>Superior1234</code></td><td>Active</td></tr>
        <tr><td><strong>ADM002</strong></td><td>Loveness Mawisire</td><td>Master Inventory Controller</td><td><code>Micky1234Master</code></td><td>Active</td></tr>
        <tr><td><strong>ADM003</strong></td><td>Lyda Gurupira</td><td>Inventory Controller</td><td><code>Master1234</code></td><td>Active</td></tr>
        <tr><td><strong>ADM004</strong></td><td>Caeser Joe</td><td>Procurement Supervisor</td><td><code>Second1234</code></td><td>Active</td></tr>
        <tr><td><strong>ADM005</strong></td><td>Farai Mandoreba</td><td>Procurement Assistant</td><td><code>Procurement1234</code></td><td>Active</td></tr>
        <tr><td><strong>ADM006</strong></td><td>Bianca Mpakairi</td><td>Administrator</td><td><code>Admin1234!</code></td><td>Active</td></tr>
        <tr><td><strong>ADM007</strong></td><td>Farai Peter</td><td>Procurement Assistant</td><td><code>Assistant1234</code></td><td>Active</td></tr>
      </tbody>
    </table>

    <h2>2. Excel Macro Security Configuration</h2>
    <p>Path: <strong>File ➔ Options ➔ Trust Center ➔ Trust Center Settings ➔ Macro Settings</strong></p>
    <ul>
      <li>Select <strong>"Enable VBA macros"</strong> or <strong>"Disable VBA macros with notification"</strong>.</li>
      <li>Check <strong>"Trust access to the VBA project object model"</strong>.</li>
    </ul>

    <h2>3. Required Worksheets Layout</h2>
    <ul>
      <li><strong>Master_Stock</strong>: ItemID | ItemName | Category | Qty | ReorderLevel | Unit</li>
      <li><strong>Movement_Log</strong>: Timestamp | Type | DocumentRef | ItemID | ItemName | Qty | DeptID | DeptName | DeptHead | IssuerID | Status</li>
      <li><strong>Admin_Config</strong>: Columns A:D (Issuers) & Columns F:I (Departments) - <code>xlSheetVeryHidden</code></li>
    </ul>

    <h2>4. VBA Code Modules & Assembly</h2>
    <p>Press <strong>Alt + F11</strong> in Excel to open the Visual Basic Editor. Insert components:</p>
    <ul>
      <li><code>ThisWorkbook.cls</code> class module</li>
      <li><code>modProcurementSystem.bas</code> standard module</li>
      <li><code>modSecurity.bas</code> standard module</li>
      <li><code>mod_ThemeEngine.bas</code> standard module</li>
      <li>UserForms: <code>frmLogin</code>, <code>frmNavigation</code>, <code>frmStockDelivery</code>, <code>frmIssueRequest</code>, <code>frmPreviewConfirmation</code>, <code>frmCreateStock</code>, <code>frmEditStockItem</code>, <code>frmDepartmentManager</code>, <code>frmUserManagement</code></li>
    </ul>

    <h2>5. Automated PDF Voucher Folder Creation</h2>
    <ul>
      <li>Automated Requisition Issue Slip saving to <code>Issued_Items\\</code> in the active workbook directory.</li>
      <li>Automated Goods Received Notes (GRN) saving to <code>Goods_Received_Vouchers\\</code> in the active workbook directory.</li>
      <li>Official organization brand badge (<code>PEX Green (2).png</code>) attached to top-left corner of all generated vouchers.</li>
    </ul>

    <h2>6. Locking & Saving Workbook (.xlsm)</h2>
    <p>In VBE: <strong>Tools ➔ VBAProject Properties ➔ Protection ➔ Lock project for viewing</strong>. Set password, then save as <strong>Excel Macro-Enabled Workbook (*.xlsm)</strong>.</p>

    <h2>7. Workbook Data Storage, Backup Schedule & Disaster Recovery Protocols</h2>
    <p>The system enforces a multi-tiered automated backup architecture to guarantee business continuity:</p>
    <ul>
      <li><strong>Backup Frequency:</strong> Every 60 minutes (Hourly background differential) and automatically triggered after every transaction (GRN delivery, Stock Issue, Adjustment).</li>
      <li><strong>RPO / RTO Targets:</strong> Recovery Point Objective (RPO) = 0 minutes; Recovery Time Objective (RTO) &lt; 3 minutes.</li>
      <li><strong>Storage Directory:</strong> <code>C:\Stationery &amp; Cleaning\Backups\</code> (sub-vaults: <code>\Hourly\</code>, <code>\Daily\</code>, <code>\Transactions\</code>).</li>
      <li><strong>Disaster Recovery Procedure:</strong> Run <code>RestoreSnapshotPointInTime</code> VBA routine or launch the Backup Center from the Switchboard. An automated safety snapshot is taken before active sheets are overwritten. In case of file corruption, rename <code>.xlsm.bak</code> to <code>.xlsm</code>.</li>
    </ul>
  </div>
</body>
</html>`;
}

export function downloadSetupGuide(format: 'md' | 'html' | 'txt') {
  let content = '';
  let filename = '';
  let mimeType = '';

  if (format === 'md') {
    content = generateSetupGuideMarkdown();
    filename = 'Procurement_System_Local_Setup_Guide.md';
    mimeType = 'text/markdown;charset=utf-8';
  } else if (format === 'html') {
    content = generateSetupGuideHTML();
    filename = 'Procurement_System_Local_Setup_Guide.html';
    mimeType = 'text/html;charset=utf-8';
  } else {
    content = generateSetupGuideMarkdown().replace(/[#*`_]/g, '');
    filename = 'Procurement_System_Local_Setup_Guide.txt';
    mimeType = 'text/plain;charset=utf-8';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
