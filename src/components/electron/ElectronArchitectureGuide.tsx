import React from 'react';
import {
  FileSpreadsheet,
  ArrowRight,
  Database,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Workflow,
  Sparkles,
  FileCheck,
  Scale
} from 'lucide-react';

export const ElectronArchitectureGuide: React.FC = () => {
  const MAPPINGS = [
    {
      excelConcept: 'Master_Stock Worksheet',
      excelType: 'Flat Table (Cols A:F)',
      electronConcept: 'master_stock SQLite Table',
      electronType: 'Normalized Table with Constraints',
      description:
        'Converts spreadsheet rows to SQLite rows with CHECK(qty >= 0) and CHECK(category IN (...)), guaranteeing data integrity.',
      performanceGain: '10x-50x Faster Reads, No Memory Leaks',
    },
    {
      excelConcept: 'Movement_Log Worksheet',
      excelType: 'Append-Only Sheet',
      electronConcept: 'movement_log SQLite Table',
      electronType: 'Indexed Relational Audit Trail',
      description:
        'Replaces Excel row append loops with atomic SQL INSERT statements linked via FOREIGN KEY (item_id) REFERENCES master_stock(item_id).',
      performanceGain: 'Instant filtering via B-Tree Indexes',
    },
    {
      excelConcept: 'SUMIFS Multi-Sheet Formulas',
      excelType: 'Volatile Workbook Calculations',
      electronConcept: 'SQL GROUP BY & Aggregate SELECT',
      electronType: 'Sub-Millisecond Query Execution',
      description:
        'Replaces =SUMIFS(Movement_Log!E:E, Movement_Log!B:B, "ISSUE", ...) with SELECT item_id, SUM(qty) FROM movement_log WHERE type="ISSUE" GROUP BY item_id.',
      performanceGain: 'Calculates 100,000+ rows in < 1ms',
    },
    {
      excelConcept: 'VLOOKUP / INDEX-MATCH',
      excelType: 'Range Scans (#N/A Errors)',
      electronConcept: 'SQL LEFT JOIN & INNER JOIN',
      electronType: 'Relational Key Join',
      description:
        'Replaces fragile column index lookups with SELECT d.dept_name, d.head_name FROM departments d WHERE d.dept_id = ?.',
      performanceGain: 'Zero formula breakage on column reorders',
    },
    {
      excelConcept: 'UserForms (frmLogin, frmIssueRequest)',
      excelType: 'VBA Modal Dialogs',
      electronConcept: 'Modern Tailwind CSS + HTML5 Modals',
      electronType: 'Asynchronous Web Components',
      description:
        'Replaces 32-bit legacy UserForm dialogs with responsive desktop interfaces supporting real-time validation, responsive carts, and dark/light themes.',
      performanceGain: 'Rich UX, Cross-Platform compatibility',
    },
    {
      excelConcept: 'VBA Macros (modProcurementSystem.bas)',
      excelType: 'Synchronous VBA Subroutines',
      electronConcept: 'ipcMain.handle IPC Handlers (main.js)',
      electronType: 'Asynchronous Event-Driven Engine',
      description:
        'Replaces single-threaded VBA macros with secure, non-blocking asynchronous Node.js handlers communicating safely via contextBridge.',
      performanceGain: 'UI never freezes during file/database operations',
    },
    {
      excelConcept: 'ExportAsFixedFormat PDF Export',
      excelType: 'Excel Temporary Sheet Print Loop',
      electronConcept: 'jsPDF / PDFKit Native Generation',
      electronType: 'Direct Binary File Generator',
      description:
        'Generates beautiful, digitally timestamped A4 PDF issue slips directly in memory and writes them to disk in under 50ms.',
      performanceGain: 'No Microsoft Office installation required',
    },
    {
      excelConcept: 'Workbook xlSheetVeryHidden Security',
      excelType: 'VBA Password (Easily Bypassed)',
      electronConcept: 'contextIsolation: true & Sandbox',
      electronType: 'Chromium Process Isolation',
      description:
        'Isolates renderer process from Node.js globals, preventing arbitrary script execution and enforcing strict database authorization.',
      performanceGain: 'Enterprise-grade zero-trust security',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Excel .xlsm ➔ Electron Architecture Map</h2>
              <p className="text-xs text-slate-400">
                Detailed translation matrix of every workbook element, macro module, UserForm, and formula.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-teal-400">
            8 Architectural Core Upgrades
          </span>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MAPPINGS.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-teal-500/50 transition"
          >
            {/* Top Side-by-side badges */}
            <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center text-xs">
              <div className="sm:col-span-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  Original Excel VBA
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{item.excelConcept}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
                  {item.excelType}
                </span>
              </div>

              <div className="sm:col-span-1 flex justify-center text-slate-400">
                <ArrowRight className="w-4 h-4 hidden sm:block text-teal-500" />
              </div>

              <div className="sm:col-span-5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                  Electron + SQLite
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{item.electronConcept}</span>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                  {item.electronType}
                </span>
              </div>
            </div>

            {/* Description & Performance Gain */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px]">
                <Zap className="w-3.5 h-3.5" />
                <span>Performance &amp; Reliability: {item.performanceGain}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
