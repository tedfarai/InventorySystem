import React, { useState } from 'react';
import { BookOpen, ShieldAlert, CheckCircle2, Lock, Terminal, FileCode, HardDrive, Download, FileText, Printer, Sparkles, Bot, Copy, Check } from 'lucide-react';
import { downloadSetupGuide } from '../../utils/setupGuideGenerator';
import { generateAiMasterPrompt, downloadAiMasterPromptFile } from '../../utils/aiMasterPromptGenerator';

export const SetupGuide: React.FC = () => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const handleCopyAiPrompt = () => {
    navigator.clipboard.writeText(generateAiMasterPrompt());
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Title & Download Banner */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-teal-600 dark:text-teal-400 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">32-Bit / 64-Bit Excel VBA Procurement System Setup & Security Guide</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Complete step-by-step instructions to assemble, configure, lock, and run the macro-enabled <code className="font-mono text-teal-700 dark:text-teal-400 font-semibold">.xlsm</code> workbook on your PC.
              </p>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              title="View or Copy Complete AI Master Prompt for generating the entire Excel VBA project"
            >
              <Bot className="w-4 h-4" />
              <span>{showPromptPreview ? 'Hide AI Prompt' : 'View AI Master Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAiPrompt}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition"
              title="Copy Complete AI Master Prompt to Clipboard"
            >
              {copiedPrompt ? <Check className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSetupGuide('html')}
              className="flex items-center space-x-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
              title="Download Printable HTML Manual (Opens in browser for printing or saving as PDF)"
            >
              <Printer className="w-4 h-4" />
              <span>Download HTML / PDF Guide</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSetupGuide('md')}
              className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              title="Download Markdown (.md) Guide file"
            >
              <FileCode className="w-4 h-4" />
              <span>Download Markdown (.md)</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSetupGuide('txt')}
              className="flex items-center space-x-1 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs transition"
              title="Download Plain Text (.txt) Guide"
            >
              <FileText className="w-4 h-4" />
              <span>Plain Text (.txt)</span>
            </button>
          </div>
        </div>

        {/* Collapsible Prompt Preview */}
        {showPromptPreview && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                AI Master Generation Prompt (.xlsm Specification)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyAiPrompt}
                  className="flex items-center space-x-1 text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPrompt ? 'Copied to Clipboard!' : 'Copy Entire Prompt'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadAiMasterPromptFile('md')}
                  className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
              </div>
            </div>
            <div className="bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-teal-500 selection:text-white">
              {generateAiMasterPrompt()}
            </div>
          </div>
        )}

        <div className="bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 p-3 rounded-xl text-xs text-teal-900 dark:text-teal-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              <strong>Local Setup Quick Start:</strong> Click <strong>"Download HTML / PDF Guide"</strong> to download the entire manual to your local computer or print it directly.
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Trust Center & Macro Settings */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Configure Excel Macro Security & Trust Settings
          </h3>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Before inserting VBA code, ensure Microsoft Excel allows macro execution and grants trust access to the Visual Basic Project Object Model.
        </p>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-700 font-mono">
          <div className="font-bold text-slate-900 dark:text-slate-100">Excel Settings Path:</div>
          <div className="text-emerald-600 dark:text-emerald-400">
            File ➔ Options ➔ Trust Center ➔ Trust Center Settings ➔ Macro Settings
          </div>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 pt-1 font-sans">
            <li>Select <strong>"Enable VBA macros (not recommended; potentially dangerous code can run)"</strong> or <strong>"Disable VBA macros with notification"</strong>.</li>
            <li>Check the box for <strong>"Trust access to the VBA project object model"</strong>.</li>
          </ul>
        </div>
      </div>

      {/* Step 2: Worksheet Architecture Setup */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Create Required Worksheets & Table Columns
          </h3>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          The workbook requires exactly three sheets with these mandatory names and column layouts:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-blue-50 dark:bg-slate-800/80 p-4 rounded-xl border border-blue-200 dark:border-slate-700">
            <div className="font-bold text-blue-700 dark:text-blue-400 text-sm mb-1">1. Master_Stock</div>
            <div className="text-slate-600 dark:text-slate-300 text-[11px] font-sans">Stores stock inventory:</div>
            <div className="mt-2 text-[10px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
              Col A: ItemID<br />
              Col B: ItemName<br />
              Col C: Category (Stationery/Cleaning)<br />
              Col D: Qty
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-slate-800/80 p-4 rounded-xl border border-emerald-200 dark:border-slate-700">
            <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mb-1">2. Movement_Log</div>
            <div className="text-slate-600 dark:text-slate-300 text-[11px] font-sans">Audit trail for transactions:</div>
            <div className="mt-2 text-[10px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
              Col A: Timestamp | Col B: Type<br />
              Col C: Item | Col D: Qty<br />
              Col E: DeptID | Col F: DeptName<br />
              Col G: DeptHead | Col H: IssuerID
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-slate-800/80 p-4 rounded-xl border border-purple-200 dark:border-slate-700">
            <div className="font-bold text-purple-700 dark:text-purple-400 text-sm mb-1">3. Admin_Config</div>
            <div className="text-slate-600 dark:text-slate-300 text-[11px] font-sans">Security & Dept lookup:</div>
            <div className="mt-2 text-[10px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
              A:D - IssuerID, Name, Role, Pass<br />
              F:I - DeptID, Name, Head, Email
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Tip: You can copy and run the <code className="font-mono text-slate-900 dark:text-slate-100 font-bold">SetupMacro.bas</code> routine from our Code Hub to build these sheets automatically!</span>
        </div>
      </div>

      {/* Step 3: Visual Basic Editor Setup & UserForm Control Inventories */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            3
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            UserForm Control Inventories & Code Handler Attachment Tutorial
          </h3>
        </div>

        {/* Tutorial on How to Attach Code Handlers */}
        <div className="bg-slate-900 text-slate-200 p-5 rounded-xl border border-slate-800 text-xs space-y-3 font-mono">
          <div className="text-emerald-400 font-bold text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span>HOW TO ATTACH CODE HANDLERS IN EXCEL VISUAL BASIC EDITOR (VBE)</span>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>Open Excel ➔ Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded border border-slate-700">Alt + F11</kbd> to launch VBE.</li>
            <li>Click <strong>Insert ➔ UserForm</strong> to create a new form canvas.</li>
            <li>Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded border border-slate-700">F4</kbd> to show the <strong>Properties Window</strong>. Change <code className="text-amber-300">(Name)</code> to match the required form (e.g., <code className="text-amber-300">frmLogin</code>).</li>
            <li>Use the <strong>Toolbox</strong> window (<code className="text-blue-300">View ➔ Toolbox</code>) to place TextBoxes, ComboBoxes, ListBoxes, Labels, and CommandButtons. Set each control's <code className="text-amber-300">(Name)</code> as listed in the inventory below.</li>
            <li><strong>Attach Handler Method 1 (Double-Click):</strong> Double-click any button or control on the UserForm canvas. Excel will automatically generate its event procedure signature (e.g., <code className="text-emerald-400">Private Sub btnLogin_Click()</code>).</li>
            <li><strong>Attach Handler Method 2 (View Code / F7):</strong> Right-click the form canvas and select <strong>View Code</strong> (or press <kbd className="px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded border border-slate-700">F7</kbd>). Copy and paste the entire code block for that form directly into the Code Window!</li>
          </ol>
        </div>

        {/* Control Inventories Table */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Required Control Inventories for UserForms:
          </h4>

          {/* Form 1: frmLogin */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>1. UserForm: <code className="text-emerald-600 dark:text-emerald-400 font-mono">frmLogin</code></span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Authentication Dialog</span>
            </div>
            <div className="p-3 text-xs overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="pb-1">Control Type</th>
                    <th className="pb-1">Control Name (Name)</th>
                    <th className="pb-1">Key Property</th>
                    <th className="pb-1">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtWorkID</td><td>Text = ""</td><td>Input Issuer Work ID (e.g. ADM001)</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtPassword</td><td>PasswordChar = "*"</td><td>Input Issuer secret password (masked)</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnLogin</td><td>Caption = "Login"</td><td>Validates credentials against Admin_Config</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnCancel</td><td>Caption = "Cancel"</td><td>Aborts login and unloads form</td></tr>
                  <tr><td className="py-1">Label</td><td className="font-bold text-purple-600 dark:text-purple-400">lblStatus</td><td>Caption = "..."</td><td>Displays feedback or error status</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form 2: frmNavigation */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>2. UserForm: <code className="text-emerald-600 dark:text-emerald-400 font-mono">frmNavigation</code></span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Main Switchboard & Welcome Hub</span>
            </div>
            <div className="p-3 text-xs overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="pb-1">Control Type</th>
                    <th className="pb-1">Control Name (Name)</th>
                    <th className="pb-1">Key Property</th>
                    <th className="pb-1">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr><td className="py-1">Label</td><td className="font-bold text-purple-600 dark:text-purple-400">lblWelcome</td><td>Caption = "Active Session: ..."</td><td>Shows logged-in issuer name, ID & role</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnStockUpdate</td><td>Caption = "Stock Delivery"</td><td>Opens frmStockDelivery (Goods Received)</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnIssueRequest</td><td>Caption = "Issue Out Request"</td><td>Opens frmIssueRequest cart form</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnEditStock</td><td>Caption = "Edit Stock Item Name"</td><td>Opens frmEditStockItem to rename items</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-blue-600 dark:text-blue-400">btnMasterStock / ✕</td><td>Caption = "Go to Master_Stock Sheet"</td><td>Closes switchboard to view Master_Stock as active sheet</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-rose-600 dark:text-rose-400">btnExit</td><td>Caption = "Exit / Logout"</td><td>Ends active session and unloads form</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form 3: frmStockDelivery */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>3. UserForm: <code className="text-emerald-600 dark:text-emerald-400 font-mono">frmStockDelivery</code></span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Goods Received / Delivery Entry</span>
            </div>
            <div className="p-3 text-xs overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="pb-1">Control Type</th>
                    <th className="pb-1">Control Name (Name)</th>
                    <th className="pb-1">Key Property</th>
                    <th className="pb-1">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr><td className="py-1">ComboBox</td><td className="font-bold text-blue-600 dark:text-blue-400">cmbItems</td><td>Style = Dropdown</td><td>Item list loaded from Master_Stock</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtQuantity</td><td>Text = ""</td><td>Quantity received from supplier</td></tr>
                  <tr><td className="py-1">CheckBox</td><td className="font-bold text-amber-600 dark:text-amber-400">chkBulkMode</td><td>Value = False</td><td>Toggle bulk shipment mode</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnSaveDelivery</td><td>Caption = "Save Delivery"</td><td>Updates Master_Stock & logs GRN-DELIVERY</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnClose</td><td>Caption = "Close"</td><td>Unloads form</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form 4: frmIssueRequest */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>4. UserForm: <code className="text-emerald-600 dark:text-emerald-400 font-mono">frmIssueRequest</code></span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Requisition Cart & Issue Out Form</span>
            </div>
            <div className="p-3 text-xs overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="pb-1">Control Type</th>
                    <th className="pb-1">Control Name (Name)</th>
                    <th className="pb-1">Key Property</th>
                    <th className="pb-1">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtDeptID</td><td>Text = ""</td><td>Input Department ID (e.g. DEPT-01)</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-amber-600 dark:text-amber-400">btnLookupDept</td><td>Caption = "Lookup"</td><td>Triggers department auto-lookup</td></tr>
                  <tr><td className="py-1">Label</td><td className="font-bold text-purple-600 dark:text-purple-400">lblDeptName / Head / Email</td><td>Caption = "-"</td><td>Auto-populated department headers</td></tr>
                  <tr><td className="py-1">ComboBox</td><td className="font-bold text-blue-600 dark:text-blue-400">cmbItems</td><td>Style = Dropdown</td><td>Inventory item picker with stock balances</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtQty</td><td>Text = ""</td><td>Requested quantity to issue</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnAddItem</td><td>Caption = "Add to Cart"</td><td>Validates stock & appends to cart queue</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-amber-600 dark:text-amber-400">btnRemoveItem / btnClearCart</td><td>Caption = "Remove / Clear"</td><td>Cart item queue management buttons</td></tr>
                  <tr><td className="py-1">ListBox</td><td className="font-bold text-purple-600 dark:text-purple-400">lstQueue</td><td>ColumnCount = 3<br />ColumnWidths = 70 pt;180 pt;50 pt</td><td>Displays requisition cart: ItemID, Name, Qty</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnConfirmIssue</td><td>Caption = "Confirm & Process"</td><td>Executes deduction, PDF generation, Outlook email</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-slate-600 dark:text-slate-400">btnClose</td><td>Caption = "Close"</td><td>Unloads form</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form 5: frmEditStockItem */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>5. UserForm: <code className="text-emerald-600 dark:text-emerald-400 font-mono">frmEditStockItem</code></span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Edit Inventory Item Details</span>
            </div>
            <div className="p-3 text-xs overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="pb-1">Control Type</th>
                    <th className="pb-1">Control Name (Name)</th>
                    <th className="pb-1">Key Property</th>
                    <th className="pb-1">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr><td className="py-1">ComboBox</td><td className="font-bold text-blue-600 dark:text-blue-400">cmbItems</td><td>Style = Dropdown</td><td>Select stock item to edit</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtNewItemName</td><td>Text = ""</td><td>Edit Item Name</td></tr>
                  <tr><td className="py-1">ComboBox</td><td className="font-bold text-blue-600 dark:text-blue-400">cmbCategory</td><td>Style = Dropdown</td><td>Edit Item Category (Stationery/Cleaning)</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtStockQty</td><td>Text = ""</td><td>Edit current stock quantity</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnSave</td><td>Caption = "Save Changes"</td><td>Updates Master_Stock sheet row</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-slate-600 dark:text-slate-400">btnClose</td><td>Caption = "Close"</td><td>Unloads form</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form 6: frmUserManagement */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>6. UserForm: <code className="text-emerald-600 dark:text-emerald-400 font-mono">frmUserManagement</code></span>
              <span className="text-[11px] font-normal text-amber-500 font-semibold">Rachel Pickard ADM001 Superior Admin CRUD</span>
            </div>
            <div className="p-3 text-xs overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="pb-1">Control Type</th>
                    <th className="pb-1">Control Name (Name)</th>
                    <th className="pb-1">Key Property</th>
                    <th className="pb-1">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr><td className="py-1">ListBox</td><td className="font-bold text-purple-600 dark:text-purple-400">lstIssuers</td><td>ColumnCount = 4</td><td>Lists active issuer accounts in Admin_Config</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtIssuerID</td><td>Text = ""</td><td>Input Issuer Work ID (e.g. ADM007)</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtIssuerName</td><td>Text = ""</td><td>Input Full Name</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtRole</td><td>Text = ""</td><td>Input Official Role</td></tr>
                  <tr><td className="py-1">TextBox</td><td className="font-bold text-blue-600 dark:text-blue-400">txtSecretPassword</td><td>PasswordChar = "*"</td><td>Input Secret Password (masked)</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-emerald-600 dark:text-emerald-400">btnAdd / btnUpdate / btnDelete</td><td>Caption = "Add / Update / Delete"</td><td>Executes account CRUD on Admin_Config!A:D</td></tr>
                  <tr><td className="py-1">CommandButton</td><td className="font-bold text-slate-600 dark:text-slate-400">btnClose</td><td>Caption = "Close"</td><td>Unloads form</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Folder Creation & Outlook Late Binding */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            4
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Automated PDF Folder Creation & Outlook Late Binding
          </h3>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p>
            The system automatically handles PDF generation and Outlook email dispatch using standard Windows VBA patterns:
          </p>
          <ul className="list-disc list-inside space-y-1 font-mono text-[11px]">
            <li><strong>Folder Handler:</strong> Uses <code className="text-emerald-600 dark:text-emerald-400">Dir(sPath, vbDirectory)</code> and <code className="text-emerald-600 dark:text-emerald-400">MkDir sPath</code> to auto-create <code className="text-amber-500">Issued_Items\</code> in the active workbook directory.</li>
            <li><strong>PDF Export:</strong> Uses Excel's built-in <code className="text-blue-600 dark:text-blue-400">ExportAsFixedFormat Type:=xlTypePDF</code>. No third-party PDF drivers required.</li>
            <li><strong>Outlook Dispatch:</strong> Uses <strong>Late Binding</strong> (<code className="text-amber-600 dark:text-amber-400">CreateObject("Outlook.Application")</code>). This avoids missing DLL reference errors across different Microsoft Office version installs.</li>
          </ul>
        </div>
      </div>

      {/* Step 5: Locking VBA Project & Saving .xlsm */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            5
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            Lock VBA Project & Save as .xlsm (FileFormat 52)
          </h3>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-xs space-y-3 border border-slate-200 dark:border-slate-700">
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">A. Lock VBA Project Code for Viewing:</span>
            <p className="text-slate-600 dark:text-slate-300">
              In VBE, go to <strong>Tools ➔ VBAProject Properties ➔ Protection tab</strong>. Check <strong>"Lock project for viewing"</strong> and enter a password. This prevents unauthorized users from inspecting or modifying the macros.
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">B. Save Workbook in Macro-Enabled Format (.xlsm):</span>
            <p className="text-slate-600 dark:text-slate-300">
              Go to <strong>File ➔ Save As</strong>. Set <em>Save as type</em> to <strong>Excel Macro-Enabled Workbook (*.xlsm)</strong> (FileFormat 52).
            </p>
          </div>
        </div>
      </div>

      {/* Step 6: Data Storage, Backup Schedule & Disaster Recovery Protocols */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
            6
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-500" />
            Workbook Data Storage, Backup Schedule & Disaster Recovery Protocols
          </h3>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            To address data loss risks, workbook corruption, hardware failure, or human error, the system incorporates an enterprise 3-tier backup automation architecture with an <strong>RPO of 0 minutes</strong> (zero data loss) and an <strong>RTO &lt; 3 minutes</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
              <div className="font-bold text-purple-900 dark:text-purple-200 text-xs">1. Transaction-Triggered Snapshots</div>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Instantly generates a point-in-time timestamped backup before any stock issue, delivery (GRN), adjustment, or configuration change executes.
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1">
              <div className="font-bold text-blue-900 dark:text-blue-200 text-xs">2. Hourly Differential & Daily Vault</div>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Automated hourly background snapshots stored in <code className="font-mono">\Backups\Hourly\</code> and full close-of-business backups saved to <code className="font-mono">\Backups\Daily\</code>.
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
              <div className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">3. Point-in-Time Disaster Recovery</div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                1-click workbook restore macro (<code className="font-mono">RestoreSnapshotPointInTime</code>) with automated pre-restore safety snapshots and emergency CSV data dumps.
              </p>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
            <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Disaster Recovery Procedure in Microsoft Excel:</div>
            <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <li>Open the backup center via VBA Macro: <code className="text-purple-600 dark:text-purple-400">LaunchBackupRecoveryCenter</code> or from the switchboard.</li>
              <li>Select desired timestamp snapshot from the vault table (e.g. <code className="text-amber-600 dark:text-amber-400">Paramount_Snap_DAILY_20260819_173000.xlsm.bak</code>).</li>
              <li>Click <strong>"Restore from Selected Snapshot"</strong>. The system generates a safety snapshot of current data before overwriting Master_Stock and Movement_Log.</li>
              <li>In catastrophic workbook corruption scenarios, copy the backup file from <code className="text-emerald-600 dark:text-emerald-400">C:\Stationery &amp; Cleaning\Backups\Daily\</code> and rename extension from <code className="text-blue-600 dark:text-blue-400">.xlsm.bak</code> to <code className="text-blue-600 dark:text-blue-400">.xlsm</code>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
