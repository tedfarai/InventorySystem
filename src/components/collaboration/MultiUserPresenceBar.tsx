/**
 * ===============================================================================
 * MULTI-USER REAL-TIME PRESENCE & LIVE COLLABORATION BAR
 * Displays active team members working simultaneously across Windows, Mac, and Linux
 * ===============================================================================
 */

import React, { useState } from 'react';
import {
  Users,
  Wifi,
  WifiOff,
  RefreshCw,
  Monitor,
  Apple,
  Terminal,
  Smartphone,
  Globe,
  Bell,
  Sparkles,
  ShieldCheck,
  FolderOpen,
  ChevronDown,
  X,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { UserPresence, CollaborativeEvent, CloudSyncStatus, PlatformType } from '../../types';

interface MultiUserPresenceBarProps {
  presences?: UserPresence[];
  currentUserId?: string;
  syncStatus: CloudSyncStatus;
  recentEvents?: CollaborativeEvent[];
  pendingMutationsCount?: number;
  onDrainPendingMutations?: () => Promise<number>;
  onOpenDocumentVault?: () => void;
  onOpenInstallModal?: () => void;
  className?: string;
}

export const MultiUserPresenceBar: React.FC<MultiUserPresenceBarProps> = ({
  presences = [],
  currentUserId,
  syncStatus,
  recentEvents = [],
  pendingMutationsCount = 0,
  onDrainPendingMutations,
  onOpenDocumentVault,
  onOpenInstallModal,
  className = '',
}) => {
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [isDraining, setIsDraining] = useState(false);

  const safePresences = Array.isArray(presences) ? presences : [];
  const safeRecentEvents = Array.isArray(recentEvents) ? recentEvents : [];

  // Platform icon helper
  const renderPlatformIcon = (platform: PlatformType, sizeClass = 'w-3 h-3') => {
    const iconWithLabel = (node: React.ReactNode, label: string) => (
      <span title={label} aria-label={label} className="inline-flex items-center justify-center">
        {node}
      </span>
    );

    switch (platform) {
      case 'Windows':
        return iconWithLabel(<Monitor className={`${sizeClass} text-blue-400`} />, 'Windows 10/11 Workstation');
      case 'macOS':
        return iconWithLabel(<Apple className={`${sizeClass} text-indigo-300`} />, 'macOS Workstation');
      case 'Linux':
        return iconWithLabel(<Terminal className={`${sizeClass} text-orange-400`} />, 'Linux Desktop');
      case 'Android':
      case 'iOS':
        return iconWithLabel(<Smartphone className={`${sizeClass} text-emerald-400`} />, 'Mobile Device');
      default:
        return iconWithLabel(<Globe className={`${sizeClass} text-slate-400`} />, 'Web Session');
    }
  };

  const handleDrainQueue = async () => {
    if (!onDrainPendingMutations || isDraining) return;
    setIsDraining(true);
    try {
      await onDrainPendingMutations();
    } finally {
      setIsDraining(false);
    }
  };

  // Sync status pill details
  const getSyncStatusBadge = () => {
    if (pendingMutationsCount > 0) {
      return (
        <button
          onClick={handleDrainQueue}
          disabled={isDraining}
          title={`${pendingMutationsCount} offline mutations queued. Click to drain queue with Last-Write-Wins resolution.`}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 text-amber-500 ${isDraining ? 'animate-spin' : ''}`} />
          <span className="font-mono font-bold">{pendingMutationsCount} Queued</span>
        </button>
      );
    }

    switch (syncStatus) {
      case 'CONNECTED':
        return (
          <div
            title="Mesh Real-Time Sync Active (LWW Conflict Resolution & IndexedDB local backup)"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono font-semibold hidden md:inline">LWW Mesh Synced</span>
          </div>
        );
      case 'DRAINING':
      case 'SYNCING':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
            <span className="font-mono text-[11px]">Syncing...</span>
          </div>
        );
      case 'OFFLINE':
      default:
        return (
          <div
            title="App running offline with zero-data-loss local persistence. Changes queued for LWW conflict-free replay."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          >
            <WifiOff className="w-3 h-3 text-amber-500" />
            <span className="font-mono text-[11px]">Offline LWW</span>
          </div>
        );
    }
  };

  const activeCount = Math.max(1, safePresences.length);

  return (
    <div className={`flex items-center gap-2 text-xs select-none ${className}`}>
      {/* Central Cloud Document Vault Trigger */}
      {onOpenDocumentVault && (
        <button
          onClick={onOpenDocumentVault}
          title="Open Shared Cloud Document Vault (Vouchers, Slips, and Master Workbooks)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span className="hidden sm:inline">Central Vault</span>
        </button>
      )}

      {/* Sync Status Badge */}
      {getSyncStatusBadge()}

      {/* Multi-User Presence Stack / Indicator */}
      <div className="relative">
        <button
          onClick={() => setShowUsersDropdown(!showUsersDropdown)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-all cursor-pointer"
        >
          <div className="flex -space-x-1.5 overflow-hidden">
            {safePresences.slice(0, 3).map((p, idx) => (
              <div
                key={p.id || idx}
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900 ${
                  p.avatarColor || 'bg-teal-600'
                }`}
                title={`${p.userName} (${p.role}) - ${p.platform}`}
              >
                {p.userName ? p.userName.charAt(0).toUpperCase() : 'U'}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-medium">
            <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{activeCount} {activeCount === 1 ? 'Online' : 'Active'}</span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          </div>
        </button>

        {/* Dropdown with active collaborators */}
        {showUsersDropdown && (
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                <Users className="w-4 h-4 text-teal-500" />
                <span>Simultaneous Users ({safePresences.length})</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono font-semibold">
                Live Collab
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Connected team members accessing the single-source inventory catalog:
            </p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {safePresences.map((p) => {
                const isMe = p.userId === currentUserId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                      isMe
                        ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60'
                        : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                          p.avatarColor || 'bg-teal-600'
                        }`}
                      >
                        {p.userName ? p.userName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1">
                          <span>{p.userName}</span>
                          {isMe && (
                            <span className="text-[9px] bg-teal-600 text-white px-1 rounded font-normal">You</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <span>{p.role}</span>
                          <span>•</span>
                          <span className="capitalize">{p.currentTab || 'Inventory'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1">
                        {renderPlatformIcon(p.platform)}
                        <span>{p.platform}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
              <span>All changes sync instantly</span>
              <button
                onClick={() => setShowUsersDropdown(false)}
                className="text-teal-600 dark:text-teal-400 font-medium hover:underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Activity Bell / Live Feed Toggle */}
      {safeRecentEvents.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowActivityDrawer(!showActivityDrawer)}
            title="Recent Live Collaborative Events"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer relative"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-500"></span>
          </button>

          {showActivityDrawer && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span>Live Activity Stream</span>
                </div>
                <button
                  onClick={() => setShowActivityDrawer(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {recentEvents.slice(0, 8).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        {evt.userName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-tight">
                      {evt.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
