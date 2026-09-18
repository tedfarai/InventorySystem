import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Package,
  Crown,
  Download,
  Command,
  FileSpreadsheet,
  Activity,
  Archive,
  LogIn,
} from 'lucide-react';
import { AdminUser } from '../../types';
import { OfflineStatusBadge } from '../pwa/OfflineStatusBadge';

interface StickyTopHeaderProps {
  onToggleSidebar: () => void;
  currentUser: AdminUser | null;
  onOpenLogin?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme?: () => void;
  isOffline?: boolean;
  onOpenDocumentVault?: () => void;
  onOpenShortcuts?: () => void;
  activeSheetTitle?: string;
  isInstallable?: boolean;
  onOpenInstallModal?: () => void;
  pendingMutationsCount?: number;
  onDrainQueue?: () => void;
  syncStatus?: string;
}

export const StickyTopHeader: React.FC<StickyTopHeaderProps> = ({
  onToggleSidebar,
  currentUser,
  onOpenLogin,
  theme,
  onToggleTheme,
  isOffline = false,
  onOpenDocumentVault,
  onOpenShortcuts,
  activeSheetTitle = 'Master Stock Sheet',
  isInstallable = false,
  onOpenInstallModal,
  pendingMutationsCount = 0,
  onDrainQueue,
  syncStatus = 'CONNECTED',
}) => {
  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors w-full">
      <div className="w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Left: Mobile Menu Hamburger Button & Brand Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 sm:p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200 dark:border-slate-700"
            title="Mobile Menu (Toggleable Hide/Reveal side bar)"
            aria-label="Mobile Menu (Toggleable Hide/Reveal side bar)"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
          </button>

          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white truncate leading-tight tracking-tight">
                Paramount Exports
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                  Stationery &amp; Cleaning Inventory
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Offline Status, Theme Toggle & User Avatar */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Offline Status Badge & Sync Queue */}
          <OfflineStatusBadge
            isOffline={isOffline}
            showStorageIndicator={false}
            pendingMutationsCount={pendingMutationsCount}
            onDrainQueue={onDrainQueue}
            syncStatus={syncStatus}
          />

          {/* Theme Toggle */}
          <button
            onClick={() => onToggleTheme?.()}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile Pill or Log In Button */}
          {currentUser ? (
            <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {(currentUser.IssuerName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                  <span>{currentUser.IssuerName || 'User'}</span>
                  {isSuperiorAdmin && <Crown className="w-3 h-3 text-amber-500" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.Role || currentUser.IssuerRole || 'Staff'}
                </div>
              </div>
            </div>
          ) : (
            <button
              id="btn-header-login"
              type="button"
              onClick={onOpenLogin}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0 min-h-[40px]"
              title="Log In to System"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
