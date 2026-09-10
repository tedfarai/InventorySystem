import React, { useState, useMemo } from 'react';
import {
  Archive,
  Database,
  History,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileCode,
  Layers,
  ArrowRight,
  HardDrive,
  FileText,
  Lock,
  Sparkles,
  Info,
  Calendar,
  Zap,
  Search,
  Filter,
  Copy,
  Check,
  Eye,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  BackupSnapshot,
  BackupType,
  BackupProtocolPolicy,
  StockItem,
  MovementLogEntry,
  AdminUser,
  Department,
  Manager,
  IssuedDocument,
  ReceivedDocument,
  AdjustmentDocument,
} from '../../types';

interface BackupRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser | null;
  masterFolderPath: string;
  backupPolicy: BackupProtocolPolicy;
  backups: BackupSnapshot[];
  currentStock: StockItem[];
  currentLogs: MovementLogEntry[];
  currentAdmins: AdminUser[];
  currentDepartments: Department[];
  currentManagers: Manager[];
  currentIssuedDocs?: IssuedDocument[];
  currentReceivedDocs?: ReceivedDocument[];
  currentAdjustmentDocs?: AdjustmentDocument[];
  onCreateBackup: (type: BackupType, description: string) => BackupSnapshot;
  onRestoreBackup: (snapshot: BackupSnapshot) => void;
  onImportBackup: (importedData: any) => boolean;
}

export const BackupRecoveryModal: React.FC<BackupRecoveryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  masterFolderPath,
  backupPolicy,
  backups,
  currentStock,
  currentLogs,
  currentAdmins,
  currentDepartments,
  currentManagers,
  currentIssuedDocs = [],
  currentReceivedDocs = [],
  currentAdjustmentDocs = [],
  onCreateBackup,
  onRestoreBackup,
  onImportBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'snapshots' | 'protocols' | 'export_import'>('snapshots');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const [customDescription, setCustomDescription] = useState('');
  const [selectedSnapshotForInspect, setSelectedSnapshotForInspect] = useState<BackupSnapshot | null>(null);
  const [confirmRestoreSnapshot, setConfirmRestoreSnapshot] = useState<BackupSnapshot | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';

  // Strict Superior Super Admin Security Lockout Screen
  if (!isSuperiorAdmin) {
    return (
      <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-rose-600/80 w-full max-w-lg overflow-hidden">
          <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between border-b border-rose-700">
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="w-5 h-5" />
              <span className="font-bold text-sm">Security Clearance Required — Access Denied</span>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-rose-700 px-2 py-0.5 rounded text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-300 dark:border-rose-800 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Superior Super Admin Clearance Required
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                Viewing the detailed archive of system backups, inspecting payload states, and executing 1-click point-in-time restores is strictly restricted to <strong>Rachel Pickard (Procurement Manager / Superior Super Admin - ADM001)</strong>.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-left space-y-1.5">
              <div className="text-slate-500 text-[11px]">Active Authenticated Session:</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>{currentUser ? `${currentUser.IssuerName} (${currentUser.IssuerID})` : 'Unauthenticated Session'}</span>
                <span className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded text-[10px] font-bold">
                  Restricted Staff
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Role: {currentUser?.Role || 'Standard Staff'} • Backup Archive Permissions: DENIED
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center space-x-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow transition"
              >
                Return to Master_Stock Worksheet
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle Instant Backup Creation
  const handleCreateInstantBackup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const desc = customDescription.trim() || 'Manual On-Demand Point-in-Time Snapshot';
      const snap = onCreateBackup('MANUAL', desc);
      setSuccessMsg(`Backup snapshot created successfully: ${snap.fileName} [${snap.timestamp}]`);
      setCustomDescription('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate backup snapshot.');
    }
  };

  // Handle 1-Click Restore Execution
  const handleExecuteRestore = () => {
    if (!confirmRestoreSnapshot) return;
    setIsRestoring(true);
    setErrorMsg('');

    setTimeout(() => {
      try {
        onRestoreBackup(confirmRestoreSnapshot);
        setIsRestoring(false);
        const restoredName = confirmRestoreSnapshot.fileName;
        const restoredTime = confirmRestoreSnapshot.timestamp;
        setConfirmRestoreSnapshot(null);
        setSelectedSnapshotForInspect(null);
        setSuccessMsg(`Disaster recovery successful! Restored entire workbook to snapshot: ${restoredName} (${restoredTime})`);
        setTimeout(() => setSuccessMsg(''), 6000);
      } catch (err: any) {
        setIsRestoring(false);
        setErrorMsg(err.message || 'Failed to restore workbook snapshot.');
      }
    }, 600);
  };

  // Copy Checksum Hash
  const handleCopyChecksum = (snapId: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(snapId);
    setTimeout(() => setCopiedHashId(null), 2500);
  };

  // Download Snapshot as JSON / Backup File
  const handleDownloadSnapshot = (snap: BackupSnapshot) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snap, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${snap.fileName.replace('.xlsm.bak', '')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle File Upload Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = onImportBackup(json);
        if (success) {
          setSuccessMsg(`Successfully imported and restored external backup file "${file.name}"!`);
        } else {
          setErrorMsg('Invalid backup file structure or incompatible schema format.');
        }
      } catch (err) {
        setErrorMsg('Failed to parse backup JSON file. Ensure the file is not corrupted.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered & Sorted Backups
  const filteredBackups = useMemo(() => {
    return backups
      .filter((b) => {
        // Type filter
        if (filterType !== 'ALL' && b.type !== filterType) {
          return false;
        }

        // Date range filter
        if (dateRangeFilter === 'TODAY') {
          const todayPrefix = new Date().toISOString().substring(0, 10);
          if (!b.timestamp.startsWith(todayPrefix)) return false;
        }

        // Search query filter (matches date, time, id, description, issuer, fileName)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchDate = b.timestamp.toLowerCase().includes(query);
          const matchId = b.id.toLowerCase().includes(query);
          const matchDesc = b.description.toLowerCase().includes(query);
          const matchIssuer = (b.issuerName + ' ' + b.issuerId).toLowerCase().includes(query);
          const matchFile = b.fileName.toLowerCase().includes(query);
          const matchType = b.type.toLowerCase().includes(query);
          if (!matchDate && !matchId && !matchDesc && !matchIssuer && !matchFile && !matchType) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return b.timestamp.localeCompare(a.timestamp);
        } else {
          return a.timestamp.localeCompare(b.timestamp);
        }
      });
  }, [backups, filterType, dateRangeFilter, searchQuery, sortBy]);

  // Statistics
  const dailyCount = backups.filter((b) => b.type === 'DAILY').length;
  const hourlyCount = backups.filter((b) => b.type === 'HOURLY').length;
  const txnCount = backups.filter((b) => b.type === 'TRANSACTION').length;

  // Helper for friendly timestamp formatting
  const formatFriendlyDate = (stamp: string) => {
    try {
      const d = new Date(stamp.replace(' ', 'T'));
      if (isNaN(d.getTime())) return stamp;
      return d.toLocaleString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return stamp;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-purple-600/80 w-full max-w-6xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        {/* Superior Admin Header */}
        <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-100">
                  Data Storage, Backup & Disaster Recovery Center
                </span>
                <span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-purple-800">
                  Superior Super Admin Only (Rachel Pickard)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full granular archive of automated point-in-time backups, payload state inspector, and 1-click restore engine.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕ Close
          </button>
        </div>

        {/* Top Metric Summary Cards */}
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Total Snapshots</span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{backups.length} Archives</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Daily COB Masters</span>
            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{dailyCount} Backups (16:30)</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Hourly Differentials</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{hourlyCount} Snapshots</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Real-time Txn Logs</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{txnCount} Points</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Rolling Retention</span>
            <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{backupPolicy.retentionDays} Days Automated</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 px-5 pt-2 flex items-center justify-between">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('snapshots')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-t-2 ${
                activeTab === 'snapshots'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 border-purple-500 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
              }`}
            >
              <History className="w-4 h-4" />
              <span>1. Detailed Point-in-Time Backups & 1-Click Restore ({backups.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('protocols')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-t-2 ${
                activeTab === 'protocols'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 border-purple-500 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>2. Storage Topology & Recovery Protocols</span>
            </button>

            <button
              onClick={() => setActiveTab('export_import')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-t-2 ${
                activeTab === 'export_import'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 border-purple-500 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>3. External Export & Offline Disaster Import</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-500">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span>RPO: {backupPolicy.rpoMinutes} Min (Zero-Loss) | RTO: &lt; {backupPolicy.rtoMinutes} Min</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[72vh] overflow-y-auto space-y-5">
          {/* Notifications */}
          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: DETAILED POINT-IN-TIME BACKUPS & 1-CLICK RESTORE */}
          {activeTab === 'snapshots' && (
            <div className="space-y-5">
              {/* Manual Snapshot Creation Header */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Create Immediate Point-in-Time Snapshot
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Captures all Master_Stock, Movement_Log, Departments, Managers, and Admin_Config entries into an immutable rollback image.
                  </p>
                </div>

                <form onSubmit={handleCreateInstantBackup} className="flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Snapshot memo / description (e.g. Pre-Audit Snapshot)"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 w-64 focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Create Snapshot</span>
                  </button>
                </form>
              </div>

              {/* Advanced Search, Type Filter & Preset Bar */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Date (YYYY-MM-DD), Time, ID, Description, or Creator..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-1 shrink-0 overflow-x-auto">
                  {(['ALL', 'DAILY', 'HOURLY', 'TRANSACTION', 'MANUAL', 'PRE_RESTORE'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                        filterType === type
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {type === 'ALL'
                        ? 'All Types'
                        : type === 'DAILY'
                        ? 'Daily COB (16:30)'
                        : type === 'HOURLY'
                        ? 'Hourly Auto'
                        : type}
                    </button>
                  ))}
                </div>

                {/* Sort Toggle */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setSortBy((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-purple-500" />
                    <span>Sort: {sortBy === 'newest' ? 'Newest First' : 'Oldest First'}</span>
                  </button>
                </div>
              </div>

              {/* Detailed Backup Snapshots List / Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Snapshot Date & Time / ID</th>
                      <th className="p-3">Type & Schedule</th>
                      <th className="p-3">Description / Trigger Origin</th>
                      <th className="p-3">Itemized Dataset Records</th>
                      <th className="p-3">Archive File & Integrity Checksum</th>
                      <th className="p-3 text-right">Point-in-Time Restore Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredBackups.map((snap) => {
                      const typeBadgeColor =
                        snap.type === 'DAILY'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                          : snap.type === 'TRANSACTION'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : snap.type === 'PRE_RESTORE'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          : snap.type === 'HOURLY'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';

                      const isCopied = copiedHashId === snap.id;

                      return (
                        <tr key={snap.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          {/* Exact Date & Time */}
                          <td className="p-3 font-mono">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                              <span>{snap.timestamp}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              {formatFriendlyDate(snap.timestamp)}
                            </div>
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                              ID: {snap.id}
                            </div>
                          </td>

                          {/* Snapshot Type */}
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border inline-block ${typeBadgeColor}`}>
                              {snap.type === 'DAILY'
                                ? 'DAILY COB (16:30)'
                                : snap.type === 'HOURLY'
                                ? 'HOURLY AUTO'
                                : snap.type}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1 font-mono">
                              {snap.type === 'DAILY'
                                ? 'Full Master Image'
                                : snap.type === 'HOURLY'
                                ? 'Differential Snapshot'
                                : snap.type === 'PRE_RESTORE'
                                ? 'Pre-Rollback Guard'
                                : 'Live Transaction Point'}
                            </div>
                          </td>

                          {/* Description & Origin */}
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{snap.description}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Origin: {snap.issuerName} ({snap.issuerId})
                            </div>
                          </td>

                          {/* Itemized Counts */}
                          <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              📦 {snap.itemCount} Stock Items
                            </div>
                            <div className="text-[10px] text-slate-500">
                              📋 {snap.movementCount} Logs • 🏢 {snap.departmentCount} Depts
                            </div>
                            <div className="text-[10px] text-slate-500">
                              👥 {snap.managerCount} Managers • 👤 {snap.adminCount} Admins
                            </div>
                          </td>

                          {/* Archive File & Checksum */}
                          <td className="p-3 font-mono text-[11px]">
                            <div className="text-purple-700 dark:text-purple-400 truncate max-w-[200px] font-bold" title={snap.fileName}>
                              {snap.fileName}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                              <span>{snap.fileSizeKb} KB</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => handleCopyChecksum(snap.id, snap.checksum)}
                                className="text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center space-x-0.5"
                                title="Copy SHA-256 Checksum"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-500">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>{snap.checksum.substring(0, 14)}...</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* 1-Click Restore Action */}
                          <td className="p-3 text-right space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedSnapshotForInspect(snap)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-[11px] transition inline-flex items-center space-x-1"
                              title="Inspect Full Snapshot Dataset Payload"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadSnapshot(snap)}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-[11px] transition inline-flex items-center"
                              title="Download Backup JSON/BAK Image"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* 1-Click Restore to Date & Time Button */}
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreSnapshot(snap)}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition inline-flex items-center space-x-1.5 border border-amber-500"
                              title={`Restore Entire Workbook to this exact Date & Time: ${snap.timestamp}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>1-Click Restore</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredBackups.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic text-xs">
                          No backup snapshots found matching filter "{filterType}" and search query "{searchQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: STORAGE TOPOLOGY & RECOVERY PROTOCOLS */}
          {activeTab === 'protocols' && (
            <div className="space-y-6">
              {/* Storage Architecture Overview */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Paramount Procurement System — Storage Architecture & Directory Topology
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-purple-700 dark:text-purple-400 block mb-1">Primary Workbook (.xlsm)</span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 block">
                      {masterFolderPath}\Paramount_Stationery_Procurement.xlsm
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Houses active Master_Stock tables, Movement_Log, and Admin_Config with locked VBA Project protection.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-blue-700 dark:text-blue-400 block mb-1">Local Backup Repositories</span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 block">
                      {masterFolderPath}\Backups\Hourly\<br />
                      {masterFolderPath}\Backups\Daily\
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Isolated subdirectories maintaining 30-day automated rolling `.xlsm.bak` snapshots.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Document Storage Folders</span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 block">
                      {masterFolderPath}\Issued_Items\<br />
                      {masterFolderPath}\Received_Items\
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Auto-generated PDF issue slips, goods received notes, and physical audit certificates.
                    </p>
                  </div>
                </div>
              </div>

              {/* RPO & RTO Guarantees */}
              <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-2">
                <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Disaster Recovery Service Level Objectives (RPO / RTO)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="font-bold text-purple-700 dark:text-purple-300">RPO = 0 Minutes (Recovery Point Objective)</div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Every stock issue, receipt, and adjustment triggers an automated immutable snapshot to ensure zero transactional data loss.
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="font-bold text-purple-700 dark:text-purple-300">RTO &lt; 3 Minutes (Recovery Time Objective)</div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Superior Super Admin can restore the complete system to any point-in-time timestamp with 1 click and confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXTERNAL EXPORT & OFFLINE DISASTER IMPORT */}
          {activeTab === 'export_import' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Export Box */}
                <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Export Full Disaster Recovery Package
                      </h4>
                      <p className="text-[11px] text-slate-500">Download complete dataset bundle for offsite cold storage.</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Master Stock Items:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{currentStock.length} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Movement Log Entries:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{currentLogs.length} records</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Departments:</span>
                      <span className="font-bold">{currentDepartments.length} depts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Managers Directory:</span>
                      <span className="font-bold">{currentManagers.length} managers</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Authorized Issuers:</span>
                      <span className="font-bold">{currentAdmins.length} users</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const snap = onCreateBackup('MANUAL', 'Full System Disaster Recovery Export');
                      handleDownloadSnapshot(snap);
                      setSuccessMsg('Disaster recovery backup file downloaded successfully!');
                    }}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Master Recovery Backup (.json)</span>
                  </button>
                </div>

                {/* Full Import / Restore Box */}
                <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Upload className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Import & Reconstruct from Backup File
                      </h4>
                      <p className="text-[11px] text-slate-500">Restore workbook data from an offline JSON backup image.</p>
                    </div>
                  </div>

                  <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center space-y-3 bg-white dark:bg-slate-900">
                    <Upload className="w-8 h-8 mx-auto text-slate-400" />
                    <div>
                      <label className="cursor-pointer inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition">
                        <span>Select Backup JSON File</span>
                        <input
                          type="file"
                          accept=".json,.bak"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-500 mt-2">
                        Accepts official Paramount Backup JSON format. Automatic pre-restore snapshot is created before applying.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Granular Snapshot Payload Inspection Drawer / Modal */}
        {selectedSnapshotForInspect && (
          <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-60 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-purple-500/80 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <FileCode className="w-5 h-5 text-purple-400" />
                  <div>
                    <span className="font-bold text-xs text-slate-100">
                      Full Snapshot Payload Inspector: {selectedSnapshotForInspect.fileName}
                    </span>
                    <div className="text-[10px] font-mono text-purple-400">
                      Captured at: {selectedSnapshotForInspect.timestamp} ({selectedSnapshotForInspect.type})
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSnapshotForInspect(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl font-mono text-[11px] border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Exact Date & Time:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{selectedSnapshotForInspect.timestamp}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Classification:</span>
                    <strong className="text-purple-600 dark:text-purple-400">{selectedSnapshotForInspect.type}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Created By:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{selectedSnapshotForInspect.issuerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Checksum:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{selectedSnapshotForInspect.checksum.substring(0, 16)}...</strong>
                  </div>
                </div>

                {/* Stock Items at this Point in Time */}
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center justify-between">
                    <span>Master Stock State at {selectedSnapshotForInspect.timestamp} ({Array.isArray(selectedSnapshotForInspect.payload?.stockItems) ? selectedSnapshotForInspect.payload.stockItems.length : 0} items):</span>
                    <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                      Total Units: {(Array.isArray(selectedSnapshotForInspect.payload?.stockItems) ? selectedSnapshotForInspect.payload.stockItems : []).reduce((acc, s) => acc + (s?.Qty || 0), 0)}
                    </span>
                  </h5>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono sticky top-0">
                        <tr>
                          <th className="p-2">ItemID</th>
                          <th className="p-2">Item Name</th>
                          <th className="p-2">Category</th>
                          <th className="p-2 text-right">Physical Qty</th>
                          <th className="p-2">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {(Array.isArray(selectedSnapshotForInspect.payload?.stockItems) ? selectedSnapshotForInspect.payload.stockItems : []).map((item) => (
                          <tr key={item?.ItemID || Math.random()} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">{item?.ItemID}</td>
                            <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{item?.ItemName}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-400">{item?.Category}</td>
                            <td className="p-2 text-right font-mono font-bold text-purple-600 dark:text-purple-400">{item?.Qty}</td>
                            <td className="p-2 text-slate-500 font-mono">{item?.Unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Movement Logs Recorded up to this snapshot */}
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                    Movement Logs Snapshot ({selectedSnapshotForInspect.payload.movementLogs.length} logs):
                  </h5>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-36 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono sticky top-0">
                        <tr>
                          <th className="p-2">Timestamp</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">ItemID / Name</th>
                          <th className="p-2 text-right">Qty Change</th>
                          <th className="p-2">Document Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {selectedSnapshotForInspect.payload.movementLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="p-2 font-mono text-slate-600 dark:text-slate-400">{log.Timestamp}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                log.Type === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {log.Type}
                              </span>
                            </td>
                            <td className="p-2 font-mono">{log.ItemID} - {log.ItemName}</td>
                            <td className="p-2 text-right font-mono font-bold">
                              {log.Type === 'DELIVERY' ? `+${log.Qty}` : `-${log.Qty}`}
                            </td>
                            <td className="p-2 font-mono text-slate-500">{log.DocumentRef || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Inspector Footer Actions */}
              <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleDownloadSnapshot(selectedSnapshotForInspect)}
                  className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup JSON</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSnapshotForInspect(null)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-semibold"
                  >
                    Close Inspector
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRestoreSnapshot(selectedSnapshotForInspect);
                      setSelectedSnapshotForInspect(null);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Proceed to 1-Click Restore to {selectedSnapshotForInspect.timestamp}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1-Click Restore Point-in-Time Confirmation Modal */}
        {confirmRestoreSnapshot && (
          <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-60">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-500 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="bg-amber-600 text-white p-4 flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">1-Click Point-in-Time Restore Confirmation</span>
                  <span className="text-[11px] text-amber-100">Disaster Recovery Rollback Protocol</span>
                </div>
              </div>

              <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300">
                {/* Target Timestamp Box */}
                <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Target Rollback Date & Time:</span>
                  </div>
                  <div className="text-base font-mono font-bold text-amber-950 dark:text-amber-100 pl-6">
                    {confirmRestoreSnapshot.timestamp}
                  </div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 pl-6 font-mono">
                    {formatFriendlyDate(confirmRestoreSnapshot.timestamp)} • [{confirmRestoreSnapshot.type} Archive]
                  </div>
                </div>

                {/* State Comparison */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] uppercase tracking-wider">
                    Workbook State Comparison:
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                    <div className="space-y-1">
                      <span className="text-slate-500 block text-[10px]">Target Snapshot State:</span>
                      <div className="font-semibold text-purple-600 dark:text-purple-400">
                        📦 {confirmRestoreSnapshot.itemCount} Stock Items
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        📋 {confirmRestoreSnapshot.movementCount} Movement Logs
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        🏢 {confirmRestoreSnapshot.departmentCount} Departments
                      </div>
                    </div>

                    <div className="space-y-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                      <span className="text-slate-500 block text-[10px]">Current Live State:</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        📦 {currentStock.length} Stock Items
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        📋 {currentLogs.length} Movement Logs
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        🏢 {currentDepartments.length} Departments
                      </div>
                    </div>
                  </div>
                </div>

                {/* Safety Guarantee */}
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>Automated Safety Guarantee:</strong> An immediate <code>PRE_RESTORE</code> backup snapshot of your current workbook state will be recorded automatically before executing this rollback.
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2.5">
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => setConfirmRestoreSnapshot(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleExecuteRestore}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Rolling Back System to {confirmRestoreSnapshot.timestamp}...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Restore to {confirmRestoreSnapshot.timestamp}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
