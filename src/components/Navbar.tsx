import React, { useState } from 'react';
import {
  LayoutGrid,
  Code2,
  BookOpen,
  Download,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Sun,
  Moon,
  Palette,
  Cpu,
  Activity,
  Keyboard,
  Menu,
  X,
  FolderOpen,
} from 'lucide-react';
import { OfflineStatusBadge } from './pwa/OfflineStatusBadge';
import { MultiUserPresenceBar } from './collaboration/MultiUserPresenceBar';
import { UserPresence, CollaborativeEvent, CloudSyncStatus } from '../types';

export type AppTab = 'simulator' | 'audit' | 'electron' | 'vba' | 'guide' | 'export' | 'styleguide' | 'dashboard';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentUser: { id: string; name: string } | null;
  onLogout: () => void;
  onResetData: () => void;
  theme: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenShortcuts?: () => void;
  onQuickIssue?: () => void;
  onQuickDelivery?: () => void;
  onQuickNewItem?: () => void;
  isOffline?: boolean;
  isInstallable?: boolean;
  isInstalled?: boolean;
  onInstallApp?: () => Promise<boolean>;
  onOpenInstallModal?: () => void;
  onOpenDocumentVault?: () => void;
  activePresences?: UserPresence[];
  liveCollabEvents?: CollaborativeEvent[];
  cloudSyncStatus?: CloudSyncStatus;
  pendingMutationsCount?: number;
  onDrainPendingMutations?: () => Promise<number>;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onResetData,
  theme,
  onToggleTheme,
  onOpenShortcuts,
  isOffline = false,
  isInstallable = false,
  isInstalled = false,
  onInstallApp,
  onOpenInstallModal,
  onOpenDocumentVault,
  activePresences = [],
  liveCollabEvents = [],
  cloudSyncStatus = 'CONNECTED',
  pendingMutationsCount = 0,
  onDrainPendingMutations,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { tab: AppTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { tab: 'simulator', label: 'Simulator', icon: LayoutGrid },
    { tab: 'audit', label: 'Audit & Analytics', icon: Activity },
    { tab: 'electron', label: 'Electron Suite', icon: Cpu },
    { tab: 'vba', label: 'VBA Code Hub', icon: Code2 },
    { tab: 'guide', label: 'Setup Guide', icon: BookOpen },
    { tab: 'styleguide', label: 'UI Style Guide', icon: Palette },
    { tab: 'export', label: 'Export', icon: Download },
  ];

  const handleTabClick = (tab: AppTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800/90 backdrop-blur sticky top-0 z-50 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center font-black text-white text-xl shadow-md border border-teal-400/50 dark:border-teal-300/40 shrink-0">
              PL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Procurement System
                </h1>
                <span className="text-[11px] bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 font-mono font-semibold hidden sm:inline-block">
                  Universal PWA • Multi-User
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Single-Source Cloud Database &amp; Local Offline Engine
                </p>
                <OfflineStatusBadge isOffline={isOffline} showStorageIndicator={false} />
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  onClick={() => handleTabClick(item.tab)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Session & Multi-User Collaboration Tools */}
          <div className="flex items-center space-x-2">
            {/* Real-time Multi-User Presence & Activity Stream */}
            <MultiUserPresenceBar
              presences={activePresences}
              currentUserId={currentUser?.id}
              syncStatus={cloudSyncStatus}
              recentEvents={liveCollabEvents}
              pendingMutationsCount={pendingMutationsCount}
              onDrainPendingMutations={onDrainPendingMutations}
              onOpenDocumentVault={onOpenDocumentVault}
              onOpenInstallModal={onOpenInstallModal}
              className="hidden sm:flex"
            />

            {/* PWA Install Button */}
            <button
              onClick={onOpenInstallModal || onInstallApp}
              title="Install Desktop PWA on Windows, Mac, or Linux"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-teal-500/30 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden xl:inline">{isInstalled ? 'Installed App' : 'Install PWA'}</span>
            </button>

            {/* Current User Pill */}
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs text-left max-w-[120px] sm:max-w-[160px] truncate">
                  <div className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">{currentUser.name}</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] truncate">ID: {currentUser.id}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="ml-1 text-[11px] text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 underline pl-1.5 border-l border-emerald-300 dark:border-emerald-800 cursor-pointer shrink-0"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Session Locked</span>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={() => onToggleTheme?.()}
              title={`Switch to ${theme === 'dark' ? 'Light Professional Office' : 'Dark Slate'} Theme`}
              className="flex items-center space-x-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition text-xs font-semibold shadow-xs cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden xl:inline">Light Office</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span className="hidden xl:inline">Dark Slate</span>
                </>
              )}
            </button>

            {/* Reset Data Button */}
            <button
              onClick={onResetData}
              title="Reset Demo Data"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {onOpenDocumentVault && (
            <button
              onClick={() => {
                onOpenDocumentVault();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
            >
              <FolderOpen className="w-4 h-4 text-teal-600" />
              <span>Central Cloud Document Vault</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  onClick={() => handleTabClick(item.tab)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end text-xs text-slate-500 px-1">
            <OfflineStatusBadge isOffline={isOffline} showStorageIndicator={false} />
          </div>
        </div>
      )}
    </header>
  );
};
