import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  PackageCheck,
  Send,
  SlidersHorizontal,
  Calendar,
  FileText,
  User,
  Building2,
  Download,
  Eye,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { MovementLogEntry, MovementType } from '../../types';

interface ModernMovementLogViewProps {
  movementLogs: MovementLogEntry[];
  onRowClick?: (log: MovementLogEntry) => void;
  onExportCsv?: () => void;
}

export const ModernMovementLogView: React.FC<ModernMovementLogViewProps> = ({
  movementLogs = [],
  onRowClick,
  onExportCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | MovementType>('ALL');

  const safeLogs = Array.isArray(movementLogs) ? movementLogs : [];

  const filteredLogs = useMemo(() => {
    return safeLogs.filter((log) => {
      if (!log) return false;
      const matchesType = typeFilter === 'ALL' || log.Type === typeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (log.ItemName || '').toLowerCase().includes(q) ||
        (log.ItemID || '').toLowerCase().includes(q) ||
        (log.DeptName || '').toLowerCase().includes(q) ||
        (log.DeptID || '').toLowerCase().includes(q) ||
        (log.IssuerID || '').toLowerCase().includes(q) ||
        (log.IssuerName && log.IssuerName.toLowerCase().includes(q)) ||
        (log.DocumentRef && log.DocumentRef.toLowerCase().includes(q)) ||
        (log.DiscrepancyReason && log.DiscrepancyReason.toLowerCase().includes(q));

      return matchesType && matchesQuery;
    });
  }, [safeLogs, searchQuery, typeFilter]);

  const typeCounts = useMemo(() => {
    return {
      ALL: safeLogs.length,
      DELIVERY: safeLogs.filter((l) => l && l.Type === 'DELIVERY').length,
      ISSUE: safeLogs.filter((l) => l && l.Type === 'ISSUE').length,
      ADJUSTMENT: safeLogs.filter((l) => l && l.Type === 'ADJUSTMENT').length,
    };
  }, [safeLogs]);

  const getTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            <PackageCheck className="w-3 h-3" /> Delivery (+)
          </span>
        );
      case 'ISSUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Send className="w-3 h-3" /> Issue (−)
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <SlidersHorizontal className="w-3 h-3" /> Adjustment (±)
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="sticky top-14 sm:top-16 z-20 bg-slate-50 dark:bg-slate-900 py-3 -mx-4 px-4 sm:mx-0 sm:px-0 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Movement Type Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['ALL', 'DELIVERY', 'ISSUE', 'ADJUSTMENT'] as const).map((t) => {
              const isActive = typeFilter === t;
              const count = typeCounts[t];
              const label =
                t === 'ALL'
                  ? 'All Movements'
                  : t === 'DELIVERY'
                  ? 'Deliveries (+)'
                  : t === 'ISSUE'
                  ? 'Issues (−)'
                  : 'Adjustments (±)';

              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU, item, dept, ref..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Table */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
                <th className="py-3 px-4 w-36">Timestamp</th>
                <th className="py-3 px-3 w-32">Type</th>
                <th className="py-3 px-3 w-28">SKU</th>
                <th className="py-3 px-3 min-w-[180px]">Item Name</th>
                <th className="py-3 px-3 text-right w-20">Qty</th>
                <th className="py-3 px-3 min-w-[150px]">Department / Destination</th>
                <th className="py-3 px-3 w-28">Issuer</th>
                <th className="py-3 px-3 w-32">Document Ref</th>
                <th className="py-3 px-4 text-right w-20">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => onRowClick && onRowClick(log)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                >
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {log.Timestamp}
                  </td>
                  <td className="py-3 px-3">{getTypeBadge(log.Type)}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {log.ItemID}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {log.ItemName}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono font-bold text-sm ${
                      log.Type === 'DELIVERY'
                        ? 'text-sky-600 dark:text-sky-400'
                        : log.Type === 'ISSUE'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {log.Type === 'DELIVERY' ? `+${log.Qty}` : log.Type === 'ISSUE' ? `−${log.Qty}` : `${log.Qty >= 0 ? '+' : ''}${log.Qty}`}
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300 truncate">
                    {log.DeptName || '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {log.IssuerID}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                    {log.DocumentRef || log.id}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRowClick) onRowClick(log);
                      }}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer"
                      title="View Official Voucher Slip"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Card List (<640px) */}
      <div className="sm:hidden space-y-2.5">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            onClick={() => onRowClick && onRowClick(log)}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              {getTypeBadge(log.Type)}
              <span className="text-[10px] font-mono text-slate-400">
                {log.Timestamp}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-900 dark:text-white mr-1.5">
                  {log.ItemID}
                </span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {log.ItemName}
                </span>
              </div>
              <div
                className={`text-base font-extrabold font-mono ${
                  log.Type === 'DELIVERY'
                    ? 'text-sky-600'
                    : log.Type === 'ISSUE'
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              >
                {log.Type === 'DELIVERY' ? `+${log.Qty}` : log.Type === 'ISSUE' ? `−${log.Qty}` : `${log.Qty >= 0 ? '+' : ''}${log.Qty}`}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span className="truncate max-w-[200px]">{log.DeptName || 'Department'}</span>
              <span className="font-mono text-[10px]">By: {log.IssuerID}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
          <p className="text-sm font-semibold">No movement records found.</p>
          <p className="text-xs mt-1">Try selecting &quot;All Movements&quot; or clearing search filter.</p>
        </div>
      )}
    </div>
  );
};
