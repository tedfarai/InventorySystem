import React from 'react';
import { Database } from 'lucide-react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic skeleton block with modern shimmer effect that adapts seamlessly
 * to both dark (slate-800/900) and light (slate-200/100) office themes.
 */
export const SkeletonBlock: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-md ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

interface MasterStockSheetSkeletonProps {
  rows?: number;
  message?: string;
}

/**
 * Skeleton Loader for the Master Stock Sheet table.
 * Mimics exact column headers, checkboxes, row badges, SKU identifiers,
 * category badges, numerical alignment, status badges, and quick action buttons.
 */
export const MasterStockSheetSkeleton: React.FC<MasterStockSheetSkeletonProps> = ({
  rows = 12,
  message = 'Loading inventory records from SQLite...',
}) => {
  const skeletonRows = Array.from({ length: rows });

  return (
    <div
      className="w-full flex flex-col font-sans space-y-2 pb-0 min-h-0 animate-in fade-in duration-300"
      role="status"
      aria-label="Loading Master Stock inventory"
    >
      {/* Top Banner / SQLite indicator strip */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
          <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-pulse" />
          <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {message}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <SkeletonBlock className="h-4 w-20 rounded" />
          <SkeletonBlock className="h-4 w-16 rounded" />
        </div>
      </div>

      {/* Filter Tabs & Search Bar Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Category Tabs Skeleton */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5">
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
          </div>

          {/* Quick Counter Pills Skeleton */}
          <div className="flex items-center space-x-2">
            <SkeletonBlock className="h-6 w-24 rounded-full" />
            <SkeletonBlock className="h-6 w-28 rounded-full" />
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 flex-1 rounded-xl" />
          <SkeletonBlock className="h-9 w-24 rounded-xl hidden sm:block" />
        </div>
      </div>

      {/* Master Stock Table Skeleton */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-[11px] text-left border-collapse font-sans">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] uppercase border-b-2 border-slate-300 dark:border-slate-700 select-none">
              <tr>
                <th className="p-2 w-10 border-r border-slate-300 dark:border-slate-700 text-center">
                  <div className="w-3.5 h-3.5 mx-auto rounded bg-slate-300 dark:bg-slate-700 animate-pulse" />
                </th>
                <th className="p-2 w-12 border-r border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold">
                  Row
                </th>
                <th className="p-2 w-28 border-r border-slate-300 dark:border-slate-700 font-bold">
                  ItemID (Col A)
                </th>
                <th className="p-2 min-w-[200px] border-r border-slate-300 dark:border-slate-700 font-bold">
                  ItemName (Col B)
                </th>
                <th className="p-2 w-28 border-r border-slate-300 dark:border-slate-700 font-bold">
                  Category (Col C)
                </th>
                <th className="p-2 w-28 border-r border-slate-300 dark:border-slate-700 text-right font-bold">
                  Available Qty (Col D)
                </th>
                <th className="p-2 w-28 border-r border-slate-300 dark:border-slate-700 text-right font-bold">
                  Reorder Level (Col E)
                </th>
                <th className="p-2 w-28 border-r border-slate-300 dark:border-slate-700 text-right font-bold whitespace-nowrap">
                  Price / Unit (Col F)
                </th>
                <th className="p-2 w-28 text-center font-bold">Stock Status</th>
                <th className="p-2 w-36 border-l border-slate-300 dark:border-slate-700 text-center font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {skeletonRows.map((_, idx) => (
                <tr
                  key={`stock-skeleton-row-${idx}`}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Selection Checkbox */}
                  <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center">
                    <SkeletonBlock className="w-3.5 h-3.5 mx-auto rounded" />
                  </td>

                  {/* Row Number */}
                  <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center">
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {idx + 2}
                    </span>
                  </td>

                  {/* Item ID / SKU */}
                  <td className="py-2 px-2.5 border-r border-slate-200 dark:border-slate-800">
                    <SkeletonBlock
                      className="h-3.5 rounded font-mono"
                      style={{ width: `${60 + (idx % 3) * 12}px` }}
                    />
                  </td>

                  {/* Item Name */}
                  <td className="py-2 px-2.5 border-r border-slate-200 dark:border-slate-800">
                    <div className="space-y-1">
                      <SkeletonBlock
                        className="h-3.5 rounded"
                        style={{ width: `${140 + (idx % 5) * 22}px` }}
                      />
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-2 px-2.5 border-r border-slate-200 dark:border-slate-800">
                    <SkeletonBlock className="h-4 w-16 rounded-full" />
                  </td>

                  {/* Available Qty */}
                  <td className="py-2 px-2.5 text-right border-r border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-end space-x-1.5">
                      <SkeletonBlock className="h-3.5 w-10 rounded" />
                      <SkeletonBlock className="h-3 w-7 rounded" />
                    </div>
                  </td>

                  {/* Reorder Level */}
                  <td className="py-2 px-2.5 text-right border-r border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-end space-x-1.5">
                      <SkeletonBlock className="h-3.5 w-8 rounded" />
                      <SkeletonBlock className="h-3 w-7 rounded" />
                    </div>
                  </td>

                  {/* Price / Unit */}
                  <td className="py-2 px-2.5 text-right border-r border-slate-200 dark:border-slate-800">
                    <SkeletonBlock className="h-3.5 w-14 ml-auto rounded" />
                  </td>

                  {/* Stock Status Badge */}
                  <td className="py-2 px-2 text-center">
                    <SkeletonBlock className="h-4 w-20 mx-auto rounded-full" />
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-2 border-l border-slate-200 dark:border-slate-800 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <SkeletonBlock className="h-5 w-11 rounded" />
                      <SkeletonBlock className="h-5 w-11 rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface AuditLogSkeletonProps {
  rows?: number;
  message?: string;
}

/**
 * Skeleton Loader for the Audit Log Analytics View.
 * Mimics header analytics banner, date range presets, KPI cards, and movement log entries.
 */
export const AuditLogSkeleton: React.FC<AuditLogSkeletonProps> = ({
  rows = 10,
  message = 'Loading transaction audit trail from SQLite...',
}) => {
  const skeletonRows = Array.from({ length: rows });

  return (
    <div
      className="space-y-6 animate-in fade-in duration-300 font-sans"
      role="status"
      aria-label="Loading Audit Logs and movement analytics"
    >
      {/* Header Banner Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-600/20 dark:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Database className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-5 w-56 rounded-md" />
              <SkeletonBlock className="h-4 w-20 rounded" />
            </div>
            <SkeletonBlock className="h-3.5 w-80 max-w-full rounded" />
          </div>
        </div>
        <SkeletonBlock className="h-9 w-36 rounded-xl" />
      </div>

      {/* Date & Filter Bar Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <SkeletonBlock className="h-7 w-20 rounded-lg" />
            <SkeletonBlock className="h-7 w-20 rounded-lg" />
            <SkeletonBlock className="h-7 w-20 rounded-lg" />
            <SkeletonBlock className="h-7 w-20 rounded-lg" />
          </div>
          <div className="flex items-center space-x-2">
            <SkeletonBlock className="h-8 w-44 rounded-xl" />
            <SkeletonBlock className="h-8 w-36 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 4-KPI Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`kpi-skeleton-${idx}`}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3.5 w-28 rounded" />
              <SkeletonBlock className="w-8 h-8 rounded-lg" />
            </div>
            <SkeletonBlock className="h-7 w-24 rounded-md" />
            <SkeletonBlock className="h-3 w-36 rounded" />
          </div>
        ))}
      </div>

      {/* Audit Log Table Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SkeletonBlock className="h-4 w-36 rounded" />
            <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400">
              {message}
            </span>
          </div>
          <SkeletonBlock className="h-7 w-28 rounded-lg" />
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-36">
                  Timestamp
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-28">
                  Type
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-44">
                  Voucher / Doc Ref
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[180px]">
                  Item Description
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right w-24">
                  Delta Qty
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[160px]">
                  Department / Notes
                </th>
                <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-36">
                  Issuer / Auditor
                </th>
                <th className="p-3 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {skeletonRows.map((_, idx) => (
                <tr
                  key={`audit-skeleton-row-${idx}`}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                    <SkeletonBlock className="h-3 w-28 rounded font-mono" />
                  </td>
                  <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                    <SkeletonBlock className="h-4 w-16 rounded font-mono" />
                  </td>
                  <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                    <SkeletonBlock className="h-3.5 w-28 rounded font-mono" />
                  </td>
                  <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                    <div className="space-y-1">
                      <SkeletonBlock
                        className="h-3.5 rounded"
                        style={{ width: `${120 + (idx % 4) * 20}px` }}
                      />
                    </div>
                  </td>
                  <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-right">
                    <SkeletonBlock className="h-3.5 w-10 ml-auto rounded font-mono" />
                  </td>
                  <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                    <SkeletonBlock
                      className="h-3 rounded"
                      style={{ width: `${100 + (idx % 3) * 25}px` }}
                    />
                  </td>
                  <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                    <SkeletonBlock className="h-3 w-24 rounded" />
                  </td>
                  <td className="p-3 text-center">
                    <SkeletonBlock className="h-6 w-20 mx-auto rounded-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
