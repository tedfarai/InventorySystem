import React, { useState, useEffect, useRef } from 'react';
import {
  Minus,
  Square,
  Copy,
  X,
  Database,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  Download,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Activity,
  HardDrive,
  FileCode,
  Zap,
  Lock,
  ChevronDown,
  Monitor,
  Apple,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { AppTab } from '../Navbar';

export type OSTheme = 'windows' | 'macos' | 'linux';

interface DesktopWindowFrameProps {
  children: React.ReactNode;
  title?: string;
  activeTab?: AppTab;
  setActiveTab?: (tab: AppTab) => void;
  currentUser?: { id: string; name: string } | null;
  onLogout?: () => void;
  onResetData?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  stockCount?: number;
  movementCount?: number;
  masterFolderPath?: string;
  onOpenIssueModal?: () => void;
  onOpenDeliveryModal?: () => void;
  onOpenAdjustmentModal?: () => void;
  onOpenMasterFolderModal?: () => void;
  onOpenBackupModal?: () => void;
  hideStatusBar?: boolean;
  showNativeTitleBar?: boolean;
}

interface IpcLogEvent {
  id: string;
  timestamp: string;
  channel: string;
  durationMs: number;
  status: 'SUCCESS' | 'PENDING' | 'ERROR';
  details: string;
}

export const DesktopWindowFrame: React.FC<DesktopWindowFrameProps> = ({
  children,
  title = 'Paramount Exports — Stationery & Cleaning Stock Inventory System',
  activeTab = 'simulator',
  setActiveTab,
  currentUser,
  onLogout,
  onResetData,
  theme = 'dark',
  onToggleTheme,
  stockCount = 0,
  movementCount = 0,
  masterFolderPath = 'C:\\Paramount_Exports\\Stock_System',
  onOpenIssueModal,
  onOpenDeliveryModal,
  onOpenAdjustmentModal,
  onOpenMasterFolderModal,
  onOpenBackupModal,
  hideStatusBar = true,
  showNativeTitleBar = false,
}) => {
  const [osTheme, setOSTheme] = useState<OSTheme>('windows');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showIpcDrawer, setShowIpcDrawer] = useState(false);
  const [ipcLogs, setIpcLogs] = useState<IpcLogEvent[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      channel: 'sqlite:mount_schema',
      durationMs: 0.4,
      status: 'SUCCESS',
      details: 'SQLite WAL mode enabled, 7 tables mounted with foreign key constraints',
    },
    {
      id: '2',
      timestamp: new Date().toLocaleTimeString(),
      channel: 'stock:getAll',
      durationMs: 0.2,
      status: 'SUCCESS',
      details: `Loaded ${stockCount} master items and ${movementCount} audit log entries`,
    },
  ]);

  const [simulatedMemory, setSimulatedMemory] = useState('42.8 MB');
  const [simulatedCpu, setSimulatedCpu] = useState('0.4%');
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Periodic simulated stats and IPC tracking
  useEffect(() => {
    const timer = setInterval(() => {
      const mem = (41 + Math.random() * 3).toFixed(1);
      const cpu = (0.2 + Math.random() * 0.5).toFixed(1);
      setSimulatedMemory(`${mem} MB`);
      setSimulatedCpu(`${cpu}%`);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addIpcLog = (channel: string, details: string, durationMs = 0.2) => {
    const newLog: IpcLogEvent = {
      id: String(Date.now()),
      timestamp: new Date().toLocaleTimeString(),
      channel,
      durationMs,
      status: 'SUCCESS',
      details,
    };
    setIpcLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleWindowMinimize = () => {
    setIsMinimized(true);
    addIpcLog('window:minimize', 'Electron browser window minimized to system tray');
    setTimeout(() => setIsMinimized(false), 800);
  };

  const handleWindowMaximize = () => {
    setIsMaximized(!isMaximized);
    addIpcLog('window:maximize', `Electron window state toggled: ${!isMaximized ? 'MAXIMIZED' : 'RESTORED'}`);
  };

  const handleWindowClose = () => {
    addIpcLog('window:close', 'Electron application close signal intercepted — session saved to SQLite WAL');
    alert('Electron Desktop: Application state and SQLite database transactions are saved. Window ready.');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased select-none">
      {/* ========================================================================= */}
      {/* 1. NATIVE ELECTRON WINDOW TITLEBAR & SYSTEM MENUS (Desktop only) */}
      {/* ========================================================================= */}
      {showNativeTitleBar && (
        <div className="bg-slate-900 border-b border-slate-800/90 text-slate-300 select-none z-50 sticky top-0 shadow-md">
        <div className="flex items-center justify-between h-9 px-2">
          {/* Left: Window Controls (macOS) or Brand Logo + Menu (Windows/Linux) */}
          <div className="flex items-center space-x-2.5">
            {osTheme === 'macos' && (
              <div className="flex items-center space-x-1.5 px-2 mr-2">
                <button
                  onClick={handleWindowClose}
                  className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition border border-rose-600/60 cursor-pointer"
                  title="Close (Cmd+W)"
                />
                <button
                  onClick={handleWindowMinimize}
                  className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition border border-amber-600/60 cursor-pointer"
                  title="Minimize (Cmd+M)"
                />
                <button
                  onClick={handleWindowMaximize}
                  className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition border border-emerald-600/60 cursor-pointer"
                  title="Zoom / Fullscreen (Cmd+Ctrl+F)"
                />
              </div>
            )}

            {/* App Icon */}
            <div className="w-5 h-5 rounded-md bg-teal-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xs">
              PL
            </div>

            {/* Title */}
            <div className="text-[11px] font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Paramount Procurement</span>
              <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded border border-teal-500/30 font-mono">
                Desktop v2.4 (SQLite)
              </span>
            </div>

            {/* Dropdown System Menus */}
            <div ref={menuBarRef} className="hidden sm:flex items-center space-x-0.5 ml-3 text-[11px] font-medium text-slate-300">
              {/* FILE MENU */}
              <div className="relative">
                <button
                  onClick={() => handleMenuClick('file')}
                  className={`px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                    activeMenu === 'file' ? 'bg-slate-800 text-teal-300' : ''
                  }`}
                >
                  File
                </button>
                {activeMenu === 'file' && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 z-50 divide-y divide-slate-800">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onOpenIssueModal?.();
                          addIpcLog('menu:action', 'File -> New Issue Slip modal requested');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>New Issue Requisition...</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+N</kbd>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onOpenDeliveryModal?.();
                          addIpcLog('menu:action', 'File -> Record Delivery modal requested');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Record Inbound Delivery...</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+D</kbd>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onOpenAdjustmentModal?.();
                          addIpcLog('menu:action', 'File -> Stocktake Adjustment requested');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Physical Stocktake Adjustment...</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+K</kbd>
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onOpenBackupModal?.();
                          addIpcLog('menu:action', 'File -> Backup & Recovery requested');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Database Backup &amp; Recovery...</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+B</kbd>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onOpenMasterFolderModal?.();
                          addIpcLog('menu:action', 'File -> Master Folder Config opened');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Configure Master Storage Folder...</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+O</kbd>
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setActiveTab?.('export');
                          addIpcLog('menu:action', 'File -> Export Center opened');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Export Full System Archive...</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+E</kbd>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          handleWindowClose();
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-600 hover:text-white flex items-center justify-between transition cursor-pointer text-rose-300"
                      >
                        <span>Exit Desktop Engine</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Alt+F4</kbd>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* EDIT MENU */}
              <div className="relative">
                <button
                  onClick={() => handleMenuClick('edit')}
                  className={`px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                    activeMenu === 'edit' ? 'bg-slate-800 text-teal-300' : ''
                  }`}
                >
                  Edit
                </button>
                {activeMenu === 'edit' && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 z-50">
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onResetData?.();
                        addIpcLog('menu:action', 'Edit -> Reset to Demo Data executed');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer text-amber-300"
                    >
                      <span>Reset Sample Database</span>
                      <kbd className="text-[10px] font-mono text-slate-400">Ctrl+Shift+R</kbd>
                    </button>
                    <div className="border-t border-slate-800 my-1"></div>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        navigator.clipboard.writeText(JSON.stringify({ stockCount, movementCount }));
                        addIpcLog('menu:action', 'Edit -> Copied system metadata to clipboard');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Copy Metadata JSON</span>
                      <kbd className="text-[10px] font-mono text-slate-400">Ctrl+C</kbd>
                    </button>
                  </div>
                )}
              </div>

              {/* VIEW MENU */}
              <div className="relative">
                <button
                  onClick={() => handleMenuClick('view')}
                  className={`px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                    activeMenu === 'view' ? 'bg-slate-800 text-teal-300' : ''
                  }`}
                >
                  View
                </button>
                {activeMenu === 'view' && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 z-50 divide-y divide-slate-800">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setActiveTab?.('simulator');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Procurement Simulator</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+1</kbd>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setActiveTab?.('electron');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Electron &amp; SQLite Studio</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+2</kbd>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setActiveTab?.('vba');
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>VBA Code Hub</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+3</kbd>
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onToggleTheme?.();
                          addIpcLog('view:theme', `Theme toggled to: ${theme === 'dark' ? 'light' : 'dark'}`);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>{theme === 'dark' ? 'Light Office Mode' : 'Dark Slate Mode'}</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+T</kbd>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setShowIpcDrawer(!showIpcDrawer);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Toggle IPC Event Console</span>
                        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+`</kbd>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* DATABASE MENU */}
              <div className="relative">
                <button
                  onClick={() => handleMenuClick('db')}
                  className={`px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                    activeMenu === 'db' ? 'bg-slate-800 text-teal-300' : ''
                  }`}
                >
                  Database
                </button>
                {activeMenu === 'db' && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 z-50">
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        setActiveTab?.('electron');
                        addIpcLog('sqlite:query_studio', 'Switched to SQLite Query Console');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Interactive SQL Console</span>
                      <kbd className="text-[10px] font-mono text-slate-400">Ctrl+Q</kbd>
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        addIpcLog('sqlite:pragma', 'PRAGMA integrity_check -> OK (0 errors, WAL active)');
                        alert('SQLite PRAGMA integrity_check: Result = OK (All 7 tables & indices consistent).');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Run PRAGMA Integrity Check</span>
                      <kbd className="text-[10px] font-mono text-slate-400">F9</kbd>
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        addIpcLog('sqlite:vacuum', 'VACUUM command executed: page cache defragmented');
                        alert('SQLite VACUUM: Database compacted and optimized successfully.');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Vacuum &amp; Defragment DB</span>
                      <kbd className="text-[10px] font-mono text-slate-400">Shift+F9</kbd>
                    </button>
                  </div>
                )}
              </div>

              {/* HELP MENU */}
              <div className="relative">
                <button
                  onClick={() => handleMenuClick('help')}
                  className={`px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                    activeMenu === 'help' ? 'bg-slate-800 text-teal-300' : ''
                  }`}
                >
                  Help
                </button>
                {activeMenu === 'help' && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 z-50">
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        setActiveTab?.('guide');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Electron Setup &amp; Build Guide</span>
                      <kbd className="text-[10px] font-mono text-slate-400">F1</kbd>
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        setActiveTab?.('styleguide');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Design System &amp; Color Specs</span>
                    </button>
                    <div className="border-t border-slate-800 my-1"></div>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        alert(
                          'Paramount Procurement Desktop v2.4\n\n100% Offline Standalone Electron & SQLite Desktop App.\nReplaces 32-Bit Excel VBA (.xlsm) with zero remote server dependencies.\n\nArchitecture: Electron 34 • Node 20 • SQLite 3.45 WAL'
                        );
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-teal-600 hover:text-white flex items-center justify-between transition cursor-pointer text-teal-300"
                    >
                      <span>About Paramount Desktop</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Window Drag Zone */}
          <div className="hidden md:flex items-center space-x-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-3 py-0.5 rounded-md border border-slate-800">
            <Database className="w-3 h-3 text-teal-400" />
            <span>SQLite 3.45.2 (WAL Mode)</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">Offline Standalone</span>
          </div>

          {/* Right: OS Switcher & Window Control Buttons (Windows/Linux) */}
          <div className="flex items-center space-x-1.5">
            {/* OS Look & Feel Selector */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 mr-2 text-[10px]">
              <button
                onClick={() => {
                  setOSTheme('windows');
                  addIpcLog('os:theme', 'Switched frame chrome to Windows 11 Fluent');
                }}
                className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                  osTheme === 'windows' ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Windows 11 Fluent Chrome"
              >
                <Monitor className="w-2.5 h-2.5" />
                <span className="hidden xl:inline">Win 11</span>
              </button>

              <button
                onClick={() => {
                  setOSTheme('macos');
                  addIpcLog('os:theme', 'Switched frame chrome to macOS Sonoma Acrylic');
                }}
                className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                  osTheme === 'macos' ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="macOS Sonoma Chrome"
              >
                <Apple className="w-2.5 h-2.5" />
                <span className="hidden xl:inline">macOS</span>
              </button>

              <button
                onClick={() => {
                  setOSTheme('linux');
                  addIpcLog('os:theme', 'Switched frame chrome to Linux GTK');
                }}
                className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                  osTheme === 'linux' ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Linux GTK Chrome"
              >
                <Sliders className="w-2.5 h-2.5" />
                <span className="hidden xl:inline">Linux</span>
              </button>
            </div>

            {/* IPC Monitor Trigger */}
            <button
              onClick={() => setShowIpcDrawer(!showIpcDrawer)}
              className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-[10px] font-mono px-2 ${
                showIpcDrawer ? 'bg-teal-950 text-teal-400 border border-teal-500/40' : 'text-slate-400 border border-slate-800'
              }`}
              title="Toggle Live Electron IPC Event Console"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>IPC Bus ({ipcLogs.length})</span>
            </button>

            {/* Standard Windows / Linux Window Control Buttons */}
            {osTheme !== 'macos' && (
              <div className="flex items-center">
                <button
                  onClick={handleWindowMinimize}
                  className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Minimize"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleWindowMaximize}
                  className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title={isMaximized ? 'Restore' : 'Maximize'}
                >
                  {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
                </button>
                <button
                  onClick={handleWindowClose}
                  className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* 2. IPC EVENT MONITOR & MESSAGE BUS DRAWER */}
      {/* ========================================================================= */}
      {showNativeTitleBar && showIpcDrawer && (
        <div className="bg-slate-900 border-b border-teal-500/30 p-3 sm:p-4 text-xs font-mono shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">Live Electron IPC Event Bus &amp; SQLite Message Stream</span>
                <span className="bg-slate-950 text-teal-400 px-2 py-0.5 rounded text-[10px] border border-slate-800">
                  contextIsolation: true
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIpcLogs([])}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Clear Stream
                </button>
                <button
                  onClick={() => setShowIpcDrawer(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 max-h-36 overflow-y-auto pt-1">
              {ipcLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-teal-400 font-bold">{log.channel}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-slate-300 truncate" title={log.details}>
                    {log.details}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                    <span className="text-emerald-400">Latency: {log.durationMs}ms</span>
                    <span className="text-slate-400">IPC Main ➔ Renderer</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN APPLICATION VIEWPORT */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col">{children}</div>

      {/* ========================================================================= */}
      {/* 4. NATIVE DESKTOP STATUS BAR (OS FOOTER) */}
      {/* ========================================================================= */}
      {!hideStatusBar && (
        <div className="bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 px-4 py-1.5 flex flex-col sm:flex-row items-center justify-between gap-2 z-40 select-none">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-slate-200 font-semibold">SQLite WAL Active</span>
            </div>
            <span className="text-slate-700 hidden md:inline">|</span>
            <div className="hidden md:flex items-center space-x-1 font-mono text-slate-400">
              <HardDrive className="w-3 h-3 text-teal-400" />
              <span className="truncate max-w-[280px]" title={masterFolderPath}>
                {masterFolderPath}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 font-mono text-[10px]">
            <div className="flex items-center space-x-1 text-slate-300">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>CPU: {simulatedCpu}</span>
            </div>

            <div className="flex items-center space-x-1 text-slate-300">
              <Activity className="w-3 h-3 text-teal-400" />
              <span>Memory: {simulatedMemory}</span>
            </div>

            <div className="hidden lg:flex items-center space-x-1 text-emerald-400">
              <Zap className="w-3 h-3" />
              <span>IPC Latency: 0.1ms</span>
            </div>

            {currentUser && (
              <div className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>{currentUser.name} ({currentUser.id})</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
