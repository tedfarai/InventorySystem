import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  Columns3,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  Lock,
  Smartphone,
  Monitor,
  Tablet,
  X,
  HelpCircle,
} from 'lucide-react';

export interface ColumnVisibilityState {
  rowNumber: boolean;
  category: boolean;
  reorderLevel: boolean;
  unitPrice: boolean;
  stockStatus: boolean;
}

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibilityState = {
  rowNumber: true,
  category: true,
  reorderLevel: true,
  unitPrice: true,
  stockStatus: true,
};

export const COMPACT_COLUMN_VISIBILITY: ColumnVisibilityState = {
  rowNumber: false,
  category: true,
  reorderLevel: false,
  unitPrice: false,
  stockStatus: true,
};

export const ESSENTIAL_ONLY_COLUMN_VISIBILITY: ColumnVisibilityState = {
  rowNumber: false,
  category: false,
  reorderLevel: false,
  unitPrice: false,
  stockStatus: false,
};

const STORAGE_KEY = 'paramount_table_column_visibility';

export function loadSavedColumnVisibility(): ColumnVisibilityState {
  if (typeof window === 'undefined') return DEFAULT_COLUMN_VISIBILITY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMN_VISIBILITY;
    const parsed = JSON.parse(raw);
    return {
      rowNumber: typeof parsed.rowNumber === 'boolean' ? parsed.rowNumber : true,
      category: typeof parsed.category === 'boolean' ? parsed.category : true,
      reorderLevel: typeof parsed.reorderLevel === 'boolean' ? parsed.reorderLevel : true,
      unitPrice: typeof parsed.unitPrice === 'boolean' ? parsed.unitPrice : true,
      stockStatus: typeof parsed.stockStatus === 'boolean' ? parsed.stockStatus : true,
    };
  } catch (err) {
    console.warn('Could not read saved table column visibility:', err);
    return DEFAULT_COLUMN_VISIBILITY;
  }
}

export function saveColumnVisibility(state: ColumnVisibilityState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save table column visibility:', err);
  }
}

export function countHiddenColumns(state: ColumnVisibilityState): number {
  let count = 0;
  if (!state.rowNumber) count++;
  if (!state.category) count++;
  if (!state.reorderLevel) count++;
  if (!state.unitPrice) count++;
  if (!state.stockStatus) count++;
  return count;
}

interface TableViewOptionsMenuProps {
  visibility: ColumnVisibilityState;
  onChange: (newVisibility: ColumnVisibilityState) => void;
  className?: string;
  buttonVariant?: 'primary' | 'secondary' | 'subtle';
}

export const TableViewOptionsMenu: React.FC<TableViewOptionsMenuProps> = ({
  visibility,
  onChange,
  className = '',
  buttonVariant = 'secondary',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const hiddenCount = countHiddenColumns(visibility);
  const isAllVisible = hiddenCount === 0;
  const isCompact =
    !visibility.rowNumber &&
    visibility.category &&
    !visibility.reorderLevel &&
    !visibility.unitPrice &&
    visibility.stockStatus;
  const isEssentialOnly =
    !visibility.rowNumber &&
    !visibility.category &&
    !visibility.reorderLevel &&
    !visibility.unitPrice &&
    !visibility.stockStatus;

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleColumn = (key: keyof ColumnVisibilityState) => {
    const updated = {
      ...visibility,
      [key]: !visibility[key],
    };
    onChange(updated);
    saveColumnVisibility(updated);
  };

  const applyPreset = (preset: ColumnVisibilityState) => {
    onChange(preset);
    saveColumnVisibility(preset);
  };

  const handleReset = () => {
    applyPreset(DEFAULT_COLUMN_VISIBILITY);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        id="btn-table-view-options"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Table View Options - customize visible inventory columns"
        title="Toggle visibility of non-essential columns to keep table fully visible on smaller screens"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs select-none ${
          hiddenCount > 0
            ? 'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-600 dark:border-amber-400 shadow-sm'
            : isOpen
            ? 'bg-teal-600 text-white border-2 border-teal-700 dark:border-teal-400 shadow-sm'
            : buttonVariant === 'primary'
            ? 'bg-teal-600 hover:bg-teal-700 text-white border-2 border-teal-700'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700'
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">Table View Options</span>
        {hiddenCount > 0 ? (
          <span className="ml-0.5 px-1.5 py-0.2 bg-amber-900/30 text-white font-mono text-[10px] font-bold rounded-full">
            {hiddenCount} hidden
          </span>
        ) : (
          <span className="hidden sm:inline-block text-[10px] text-slate-400 dark:text-slate-500 font-normal">
            (All columns)
          </span>
        )}
      </button>

      {/* Options Popover Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-modal="false"
          aria-label="Table column visibility options"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl z-40 p-3 sm:p-4 text-xs font-sans animate-in fade-in zoom-in-95 duration-150 origin-top-right text-slate-800 dark:text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <Columns3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Table View Options</h4>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Toggle non-essential columns to eliminate horizontal scroll
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close options"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets Bar */}
          <div className="mb-3">
            <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Quick Presets:</span>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 normal-case font-bold cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset all
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset(DEFAULT_COLUMN_VISIBILITY)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                  isAllVisible
                    ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-700 dark:text-teal-300 font-bold shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Show all columns (default desktop display)"
              >
                <Monitor className="w-3.5 h-3.5 mb-1 text-teal-600 dark:text-teal-400" />
                <span className="text-[10.5px] leading-tight">All Columns</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Full detail</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(COMPACT_COLUMN_VISIBILITY)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                  isCompact
                    ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-700 dark:text-teal-300 font-bold shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Hide Row, Reorder Level, and Price/Unit for medium displays"
              >
                <Tablet className="w-3.5 h-3.5 mb-1 text-amber-600 dark:text-amber-400" />
                <span className="text-[10.5px] leading-tight">Compact</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Tablet friendly</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(ESSENTIAL_ONLY_COLUMN_VISIBILITY)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                  isEssentialOnly
                    ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-700 dark:text-teal-300 font-bold shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Show SKU, Name, and Qty only for mobile screens"
              >
                <Smartphone className="w-3.5 h-3.5 mb-1 text-purple-600 dark:text-purple-400" />
                <span className="text-[10.5px] leading-tight">Essential Only</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Mobile slim</span>
              </button>
            </div>
          </div>

          {/* Toggleable Non-Essential Columns */}
          <div className="space-y-1 mb-3">
            <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Non-Essential Columns:</span>
              <span className="text-[9px] font-normal lowercase text-slate-400">click to toggle</span>
            </div>

            {/* Row Number */}
            <label
              className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition select-none ${
                visibility.rowNumber
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  : 'bg-slate-100/70 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibility.rowNumber}
                  onChange={() => toggleColumn('rowNumber')}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
                <div>
                  <span className="font-semibold text-xs">Row Number (Row #)</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Numbered spreadsheet index</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">~50px</span>
            </label>

            {/* Category */}
            <label
              className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition select-none ${
                visibility.category
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  : 'bg-slate-100/70 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibility.category}
                  onChange={() => toggleColumn('category')}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
                <div>
                  <span className="font-semibold text-xs">Category (Col C)</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Stationery / Cleaning classification</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">~110px</span>
            </label>

            {/* Reorder Level */}
            <label
              className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition select-none ${
                visibility.reorderLevel
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  : 'bg-slate-100/70 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibility.reorderLevel}
                  onChange={() => toggleColumn('reorderLevel')}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
                <div>
                  <span className="font-semibold text-xs">Reorder Level (Col E)</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Minimum safety threshold</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">~110px</span>
            </label>

            {/* Unit Price */}
            <label
              className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition select-none ${
                visibility.unitPrice
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  : 'bg-slate-100/70 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibility.unitPrice}
                  onChange={() => toggleColumn('unitPrice')}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
                <div>
                  <span className="font-semibold text-xs">Price / Unit (Col F)</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Standard item unit cost</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">~115px</span>
            </label>

            {/* Stock Status */}
            <label
              className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition select-none ${
                visibility.stockStatus
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  : 'bg-slate-100/70 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibility.stockStatus}
                  onChange={() => toggleColumn('stockStatus')}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
                <div>
                  <span className="font-semibold text-xs">Stock Status</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Optimal, Low Stock, or Critical</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">~115px</span>
            </label>
          </div>

          {/* Essential Locked Columns (Informational) */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 mb-3">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Essential Columns (Always Visible)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold lowercase">locked</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>ItemID (Col A)</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>ItemName (Col B)</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Available Qty (Col D)</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Row Selection Checkbox</span>
              </div>
            </div>
          </div>

          {/* Footer / Tip */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[10.5px]">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-400" />
              Settings saved automatically
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
