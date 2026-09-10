import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  FolderArchive,
  Terminal,
  ShieldCheck,
  Layers,
  Database,
  Cpu,
  Sparkles,
  ExternalLink,
  Code2
} from 'lucide-react';
import {
  ELECTRON_PACKAGE_JSON,
  ELECTRON_MAIN_JS,
  ELECTRON_PRELOAD_JS,
  ELECTRON_INDEX_HTML,
  ELECTRON_README_MD
} from '../../data/electronCodeFiles';
import { downloadElectronProjectZip } from '../../utils/electronZipGenerator';

type FileKey = 'package.json' | 'main.js' | 'preload.js' | 'index.html' | 'README.md';

interface FileInfo {
  key: FileKey;
  filename: string;
  language: string;
  description: string;
  badge: string;
  badgeColor: string;
  code: string;
}

const FILES: FileInfo[] = [
  {
    key: 'package.json',
    filename: 'package.json',
    language: 'json',
    description: 'Electron build configuration, electron-builder targets, and production sqlite3 / pdfkit dependencies.',
    badge: 'Manifest & Build Targets',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    code: ELECTRON_PACKAGE_JSON,
  },
  {
    key: 'main.js',
    filename: 'main.js',
    language: 'javascript',
    description: 'Background Node.js process: SQLite setup (db.serialize, WAL mode), IPC handlers, SUMIFS/VLOOKUP replacements, and atomic transactions.',
    badge: 'Core Engine & IPC Handlers',
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
    code: ELECTRON_MAIN_JS,
  },
  {
    key: 'preload.js',
    filename: 'preload.js',
    language: 'javascript',
    description: 'Secure contextBridge API exposing window.electronAPI with contextIsolation: true and zero Node internal leaks.',
    badge: 'Secure Preload Bridge',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    code: ELECTRON_PRELOAD_JS,
  },
  {
    key: 'index.html',
    filename: 'index.html',
    language: 'html',
    description: 'Complete modern desktop UI layout with frameless titlebar, Stock Control, Issue Requisitions, Delivery Inbound, and SQL query playground.',
    badge: 'Modern Desktop UI',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    code: ELECTRON_INDEX_HTML,
  },
  {
    key: 'README.md',
    filename: 'README.md',
    language: 'markdown',
    description: 'Complete build instructions, comparison matrices against Excel VBA, schema documentation, and setup commands.',
    badge: 'Deployment Guide',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    code: ELECTRON_README_MD,
  },
];

export const ElectronCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileKey>('main.js');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const currentFile = FILES.find((f) => f.key === selectedFile) || FILES[1];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSingleFile = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      await downloadElectronProjectZip('Paramount_Procurement_Electron_Desktop.zip');
    } catch (err) {
      console.error('Failed to download ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const lineCount = currentFile.code.split('\n').length;
  const byteSize = new Blob([currentFile.code]).size;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg font-black text-lg">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Electron &amp; SQLite Desktop Suite
                </h1>
                <span className="bg-teal-50 dark:bg-teal-950/90 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                  100% Offline Standalone
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Complete conversion of the 32-Bit Excel VBA Procurement Workbook into an offline Electron desktop application.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
              <Database className="w-3.5 h-3.5 text-teal-500 mr-1.5" /> SQLite 3 (WAL Mode)
            </span>
            <span className="inline-flex items-center text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500 mr-1.5" /> contextIsolation: true
            </span>
            <span className="inline-flex items-center text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
              <Layers className="w-3.5 h-3.5 text-blue-500 mr-1.5" /> SUMIFS &amp; VLOOKUP ➔ SQL
            </span>
          </div>
        </div>

        {/* 1-Click ZIP Download Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center justify-center space-x-2.5 px-6 py-3.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-teal-600/20 transition cursor-pointer"
          >
            <FolderArchive className="w-5 h-5" />
            <span>{isZipping ? 'Packaging Project...' : 'Download Full Electron Project (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* File Selector Tabs & Code Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-colors">
        {/* Tab Navigation Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-1.5">
            {FILES.map((file) => {
              const isActive = selectedFile === file.key;
              return (
                <button
                  key={file.key}
                  onClick={() => setSelectedFile(file.key)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <FileCode className={`w-4 h-4 ${isActive ? 'text-white' : 'text-teal-500'}`} />
                  <span>{file.filename}</span>
                </button>
              );
            })}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied File!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownloadSingleFile}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {currentFile.filename}</span>
            </button>
          </div>
        </div>

        {/* Current File Metadata Header */}
        <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${currentFile.badgeColor}`}>
              {currentFile.badge}
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-sans">{currentFile.description}</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <span>Lines: {lineCount.toLocaleString()}</span>
            <span>Size: {(byteSize / 1024).toFixed(1)} KB</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Unabridged</span>
          </div>
        </div>

        {/* Source Code Content Container */}
        <div className="relative bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[640px] p-6 selection:bg-teal-500 selection:text-white">
          <pre className="whitespace-pre">
            <code>{currentFile.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
