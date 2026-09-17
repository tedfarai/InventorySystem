import React from 'react';
import { Wifi, WifiOff, HardDrive, CheckCircle2, RefreshCw } from 'lucide-react';

interface OfflineStatusBadgeProps {
  isOffline: boolean;
  className?: string;
  showStorageIndicator?: boolean;
  pendingMutationsCount?: number;
  onDrainQueue?: () => void;
  syncStatus?: string;
}

export const OfflineStatusBadge: React.FC<OfflineStatusBadgeProps> = ({
  isOffline,
  className = '',
  showStorageIndicator = true,
  pendingMutationsCount = 0,
  onDrainQueue,
  syncStatus = 'CONNECTED',
}) => {
  const isDraining = syncStatus === 'DRAINING';

  return (
    <div id="network-status-badge" className={`inline-flex items-center gap-1.5 ${className}`} aria-live="polite">
      {/* Network Connectivity Status Pill */}
      {isOffline ? (
        <div
          title="App running 100% Offline with local CacheStorage & IndexedDB / SQLite persistence"
          className="network-status-pill network-status-pill--offline flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-500" />
          <span className="font-mono text-[11px]">Offline Mode</span>
        </div>
      ) : (
        <div
          title="Connected to network. All transactions sync to local IndexedDB & SQLite automatically."
          className="network-status-pill network-status-pill--online flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-mono text-[11px] hidden sm:inline">Online / PWA Ready</span>
        </div>
      )}

      {/* Persistent Sync-Queue Indicator Pill */}
      {pendingMutationsCount > 0 && (
        <button
          onClick={onDrainQueue}
          title={`${pendingMutationsCount} pending transaction(s) queued locally. Click to force replay now.`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isDraining ? 'animate-spin' : ''}`} />
          <span className="font-mono text-[11px]">
            {isDraining ? 'Replaying...' : `${pendingMutationsCount} Queued`}
          </span>
        </button>
      )}

      {/* Local Storage Indicator Pill */}
      {showStorageIndicator && (
        <div
          title="Zero-data-loss local persistence enabled (IndexedDB & SQLite WebAssembly)"
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
        >
          <HardDrive className="w-3 h-3 text-teal-500" />
          <span>Local DB</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-0.5" />
        </div>
      )}
    </div>
  );
};

