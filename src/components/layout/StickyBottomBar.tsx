import React from 'react';
import {
  LogOut,
  ShieldCheck,
  Crown,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminUser } from '../../types';

interface StickyBottomBarProps {
  currentUser: AdminUser | null;
  onLogout: () => void;
  totalSkuCount?: number;
  lowStockCount?: number;
  onQuickReorderReport?: () => void;
  onOpenShortcuts?: () => void;
  pendingMutationsCount?: number;
  onDrainQueue?: () => void;
  syncStatus?: string;
}

export const StickyBottomBar: React.FC<StickyBottomBarProps> = ({
  currentUser,
  onLogout,
  totalSkuCount = 0,
  lowStockCount = 0,
  onQuickReorderReport,
  onOpenShortcuts,
  pendingMutationsCount = 0,
  onDrainQueue,
  syncStatus = 'CONNECTED',
}) => {
  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';

  return (
    <footer className="sticky bottom-0 z-20 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-md transition-colors">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Current Logged In User Indicator */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser ? currentUser.IssuerName : 'Guest'}
              </span>
              {isSuperiorAdmin && (
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold">
                  <Crown className="w-2.5 h-2.5" />
                  <span>Superior</span>
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                ({currentUser?.IssuerID || 'OFFLINE'})
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 hidden xs:block truncate">
              {currentUser?.Role || 'Authorized Operator'}
            </div>
          </div>
        </div>

        {/* Center: Inventory Statistics / Alert Badges */}
        <div className="hidden md:flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
            <Package className="w-3.5 h-3.5 text-emerald-500" />
            <span>Master Catalog: <strong>{totalSkuCount}</strong> items</span>
          </div>

          {pendingMutationsCount > 0 && (
            <button
              onClick={onDrainQueue}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition"
              title="Transactions stored locally in offline sync queue. Click to trigger background replay."
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${syncStatus === 'DRAINING' ? 'animate-spin' : ''}`} />
              <span>{pendingMutationsCount} Sync Queue</span>
            </button>
          )}

          {lowStockCount > 0 && onQuickReorderReport && (
            <button
              onClick={onQuickReorderReport}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 cursor-pointer transition"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{lowStockCount} below safety threshold</span>
            </button>
          )}
        </div>

        {/* Right: Log-Out / Switch Account Button */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/80 rounded-xl font-bold text-xs transition cursor-pointer shadow-2xs min-h-[38px]"
            title="End authenticated session & switch user"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log-Out</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
