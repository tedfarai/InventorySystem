import React, { useState } from 'react';
import { Download, FileSpreadsheet, Terminal, Copy, Check, FileCode, ShieldCheck, Sparkles, BookOpen, Printer, FileText, Bot, MessageSquare, Palette, FileType, HardDrive, Cpu, Compass } from 'lucide-react';
import { VBA_MODULES } from '../../data/vbaCodeTemplates';
import { StockItem, MovementLogEntry, AdminUser, Department } from '../../types';
import { downloadSetupGuide } from '../../utils/setupGuideGenerator';
import { generateAiMasterPrompt, downloadAiMasterPromptFile } from '../../utils/aiMasterPromptGenerator';
import { downloadStyleGuideFile } from '../../utils/styleGuideGenerator';
import { downloadSystemDesignFile, getSystemDesignMarkdown } from '../../utils/systemDesignGenerator';
import { exportAllDataToJSON } from '../../db/offlineStorage';
import { downloadJsonFile } from '../../utils/pwaExport';
import * as XLSX from 'xlsx';

interface ExportCenterProps {
  stockItems?: StockItem[];
  movementLogs?: MovementLogEntry[];
  admins?: AdminUser[];
  departments?: Department[];
}

export const ExportCenter: React.FC<ExportCenterProps> = ({
  stockItems = [],
  movementLogs = [],
  admins = [],
  departments = [],
}) => {
  const safeStockItems = Array.isArray(stockItems) ? stockItems : [];
  const safeMovementLogs = Array.isArray(movementLogs) ? movementLogs : [];
  const safeAdmins = Array.isArray(admins) ? admins : [];
  const safeDepartments = Array.isArray(departments) ? departments : [];

  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedDesignMd, setCopiedDesignMd] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [showDesignPreview, setShowDesignPreview] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);

  const handleExportOfflineJson = async () => {
    setIsExportingJson(true);
    try {
      const json = await exportAllDataToJSON();
      await downloadJsonFile(json, 'ProcureSim_Offline_Complete_Snapshot');
    } catch (err) {
      console.error('Export offline JSON failed:', err);
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleCopyAiPrompt = () => {
    navigator.clipboard.writeText(generateAiMasterPrompt());
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleCopyDesignMd = () => {
    navigator.clipboard.writeText(getSystemDesignMarkdown());
    setCopiedDesignMd(true);
    setTimeout(() => setCopiedDesignMd(false), 3000);
  };

  // Generate real pre-formatted Excel workbook using SheetJS
  const handleDownloadExcelWorkbook = () => {
    const wb = XLSX.utils.book_new();

    // 1. Master_Stock Sheet
    const stockData = safeStockItems.map((item) => ({
      ItemID: item.ItemID,
      ItemName: item.ItemName,
      Category: item.Category,
      Qty: item.Qty,
    }));
    const wsStock = XLSX.utils.json_to_sheet(stockData);
    XLSX.utils.book_append_sheet(wb, wsStock, 'Master_Stock');

    // 2. Movement_Log Sheet
    const logData = safeMovementLogs.map((log) => ({
      Timestamp: log.Timestamp,
      Type: log.Type,
      Item: log.ItemName,
      Qty: log.Qty,
      DeptID: log.DeptID,
      DeptName: log.DeptName,
      DeptHead: log.DeptHead,
      IssuerID: log.IssuerID,
    }));
    const wsLog = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(wb, wsLog, 'Movement_Log');

    // 3. Admin_Config Sheet
    const adminData = safeAdmins.map((adm) => ({
      IssuerID: adm.IssuerID,
      IssuerName: adm.IssuerName,
      Role: adm.Role,
      SecretPassword: adm.SecretPassword,
    }));
    const wsAdmin = XLSX.utils.json_to_sheet(adminData);

    // Append department lookup table to Admin_Config
    const deptData = safeDepartments.map((d) => ({
      DeptID: d.DeptID,
      DeptName: d.DeptName,
      DeptHeadName: d.DeptHeadName,
      DeptHeadEmail: d.DeptHeadEmail,
    }));

    XLSX.utils.sheet_add_json(wsAdmin, deptData, { origin: 'F1' });
    XLSX.utils.book_append_sheet(wb, wsAdmin, 'Admin_Config');

    // Download file
    XLSX.writeFile(wb, 'Stationery_&_Cleaning_System.xlsx');
  };

  // Download PowerShell Script
  const handleDownloadPowerShellScript = () => {
    const psModule = VBA_MODULES.find((m) => m.id === 'powershellSetup');
    if (!psModule) return;

    const blob = new Blob([psModule.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Setup_XLSM_Project.ps1';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download individual VBA file
  const handleDownloadVbaFile = (fileName: string, code: string) => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const psScriptCode = VBA_MODULES.find((m) => m.id === 'powershellSetup')?.code || '';

  const handleCopyPsScript = () => {
    navigator.clipboard.writeText(psScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Download className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Download & Export Center
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Download pre-formatted Excel workbooks, individual VBA module files, or run our PowerShell automated project generator.
          </p>
        </div>

        <button
          onClick={handleDownloadExcelWorkbook}
          className="flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Download Base Excel Workbook (.xlsx)</span>
        </button>
      </div>

      {/* Grid of Download Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 0: AI Master Generation Prompt (.xlsm) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Master Generation Prompt (.xlsm Specification)
                </h3>
                <span className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Copy & Paste Ready
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Copy or download the complete, all-in-one prompt that produces the entire 32-bit/64-bit Excel VBA Procurement & Inventory Control System in ChatGPT, Claude, Gemini, or GitHub Copilot.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition"
              >
                <FileCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>{showPromptPreview ? 'Hide Prompt' : 'Preview Prompt'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAiPrompt}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {copiedPrompt ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPrompt ? 'Copied Master Prompt!' : 'Copy AI Master Prompt'}</span>
              </button>

              <button
                type="button"
                onClick={() => downloadAiMasterPromptFile('md')}
                className="flex items-center space-x-1.5 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Download (.md)</span>
              </button>
            </div>
          </div>

          {/* Collapsible Prompt Preview Panel */}
          {showPromptPreview && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Full AI Master Prompt Specification (.xlsm)
                </span>
                <button
                  type="button"
                  onClick={handleCopyAiPrompt}
                  className="flex items-center space-x-1 text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPrompt ? 'Copied to Clipboard!' : 'Copy Entire Text'}</span>
                </button>
              </div>
              <div className="bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-teal-500 selection:text-white">
                {generateAiMasterPrompt()}
              </div>
            </div>
          )}
        </div>

        {/* Card 0B: Downloadable Comprehensive Setup & Security Manual */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Downloadable Local Setup & Operating Manual
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Download the complete setup guide directly to your computer. Includes Trust Center configurations, worksheet structures, VBA module setup steps, issuer credentials list, and standard operating procedures (SOP).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadSetupGuide('html')}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>HTML / Printable PDF Guide</span>
              </button>

              <button
                type="button"
                onClick={() => downloadSetupGuide('md')}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <FileCode className="w-4 h-4" />
                <span>Markdown (.md) Guide</span>
              </button>

              <button
                type="button"
                onClick={() => downloadSetupGuide('txt')}
                className="flex items-center space-x-1.5 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs transition"
              >
                <FileText className="w-4 h-4" />
                <span>Text (.txt)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 0C: PWA 100% Offline Database Snapshot (.json / IndexedDB) */}
        <div className="md:col-span-2 bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-teal-500/30 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  PWA Offline Database Snapshot (Universal JSON / IndexedDB)
                </h3>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  100% Offline Resilience
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Export complete local database state (all Master Stock items, Movement Audit Logs, Issued Documents, Goods Received Notes, Stock Adjustments, RBAC credentials, and Backup Snapshots) in universal JSON format for seamless migration or instant offline restore.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportOfflineJson}
                disabled={isExportingJson}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingJson ? 'Exporting...' : 'Export Complete Offline JSON'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card: Full System Design & Architecture Specification (DESIGN.md) */}
        <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950 text-white p-6 rounded-2xl border border-teal-500/40 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  Full System Design & Architecture Specification (DESIGN.md)
                </h3>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  All Web App Components & Logic
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Complete engineering blueprint documenting every layer of the application: PWA offline architecture, SQLite WASM schema, Excel simulation engine, multi-item procurement workflows, Two-Man Rule security, PDF generators, and desktop VBA automation modules.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDesignPreview(!showDesignPreview)}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-teal-400" />
                <span>{showDesignPreview ? 'Hide Preview' : 'Preview Design Spec'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyDesignMd}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {copiedDesignMd ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedDesignMd ? 'Copied DESIGN.md!' : 'Copy DESIGN.md'}</span>
              </button>

              <button
                type="button"
                onClick={() => downloadSystemDesignFile('md')}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download DESIGN.md</span>
              </button>
            </div>
          </div>

          {/* Collapsible Design Spec Preview Panel */}
          {showDesignPreview && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Full System Architecture & Engineering Blueprint (Markdown)
                </span>
                <button
                  type="button"
                  onClick={handleCopyDesignMd}
                  className="flex items-center space-x-1 text-xs text-teal-400 hover:underline font-medium cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedDesignMd ? 'Copied to Clipboard!' : 'Copy Entire Text'}</span>
                </button>
              </div>
              <div className="bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-teal-500 selection:text-white">
                {getSystemDesignMarkdown()}
              </div>
            </div>
          )}
        </div>

        {/* Card: UI Style Guide & Theme Design System */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Paramount UI Style Guide & Design System
                </h3>
                <span className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  1-Click Download
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Download the complete design tokens matrix, WCAG AA contrast audit, typography scales, interactive component states, and VBA color constants module (<code className="font-mono text-teal-600 dark:text-teal-400">mod_ThemeEngine.bas</code>).
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadStyleGuideFile('html')}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Interactive HTML Guide</span>
              </button>

              <button
                type="button"
                onClick={() => downloadStyleGuideFile('pdf')}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => downloadStyleGuideFile('md')}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Markdown (.md)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadStyleGuideFile('json')}
                className="flex items-center space-x-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition"
              >
                <FileCode className="w-4 h-4 text-purple-500" />
                <span>Design Tokens (.json)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 1: Automated PowerShell Builder */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold">
                Automated Windows Build
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              PowerShell Automated .xlsm Generator
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Run this script in PowerShell on Windows to automatically open Excel COM object, create <code className="font-mono">Master_Stock</code>, <code className="font-mono">Movement_Log</code>, and <code className="font-mono">Admin_Config</code> worksheets, populate data, and save as macro-enabled <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">.xlsm</code> (FileFormat 52)!
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleDownloadPowerShellScript}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow"
            >
              <Download className="w-4 h-4" />
              <span>Download Setup_XLSM_Project.ps1</span>
            </button>

            <button
              onClick={handleCopyPsScript}
              className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Script Copied to Clipboard!' : 'Copy PowerShell Script Code'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Individual VBA Module Exports */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileCode className="w-5 h-5" />
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                VBA Source Code Files
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Download Source Code Modules
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Download individual <code className="font-mono">.bas</code> and <code className="font-mono">.cls</code> files to import directly into your Visual Basic Editor (<kbd className="font-mono">Alt + F11</kbd> ➔ File ➔ Import File).
            </p>
          </div>

          <div className="space-y-1.5 pt-2 max-h-48 overflow-y-auto">
            {VBA_MODULES.map((module) => (
              <div
                key={module.id}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-mono border border-slate-200 dark:border-slate-700/80"
              >
                <div className="truncate pr-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{module.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans truncate">
                    {module.description}
                  </span>
                </div>

                <button
                  onClick={() => handleDownloadVbaFile(module.name, module.code)}
                  className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white rounded text-slate-700 dark:text-slate-200 transition shrink-0"
                  title={`Download ${module.name}`}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
