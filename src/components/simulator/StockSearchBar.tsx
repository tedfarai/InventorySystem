import React, { useState } from 'react';
import {
  Search,
  X,
  Filter,
  Layers,
  Tag,
  Plus,
  AlertTriangle,
  SlidersHorizontal,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Hash,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { POPULAR_SEARCH_TAGS, StockStatusFilter } from '../../utils/searchEngine';
import { ItemCategory } from '../../types';

interface StockSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: 'All' | ItemCategory;
  onCategoryChange: (category: 'All' | ItemCategory) => void;
  stockStatusFilter?: StockStatusFilter;
  onStockStatusChange?: (status: StockStatusFilter) => void;
  skuRangeFrom?: string;
  onSkuRangeFromChange?: (from: string) => void;
  skuRangeTo?: string;
  onSkuRangeToChange?: (to: string) => void;
  onResetAllFilters?: () => void;
  totalCount: number;
  filteredCount: number;
  belowThresholdCount?: number;
  onOpenReorderReport?: () => void;
  onNewStockItem?: () => void;
  isReadOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export const StockSearchBar: React.FC<StockSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  stockStatusFilter = 'All',
  onStockStatusChange,
  skuRangeFrom = '',
  onSkuRangeFromChange,
  skuRangeTo = '',
  onSkuRangeToChange,
  onResetAllFilters,
  totalCount,
  filteredCount,
  belowThresholdCount,
  onOpenReorderReport,
  onNewStockItem,
  isReadOnly = false,
  placeholder = 'Multi-facet search: Type text, or use tags like status:low, cat:cleaning, ST-001..ST-020...',
  className = '',
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    categoryFilter !== 'All' ||
    stockStatusFilter !== 'All' ||
    Boolean(skuRangeFrom.trim()) ||
    Boolean(skuRangeTo.trim());

  const handleReset = () => {
    onSearchChange('');
    onCategoryChange('All');
    if (onStockStatusChange) onStockStatusChange('All');
    if (onSkuRangeFromChange) onSkuRangeFromChange('');
    if (onSkuRangeToChange) onSkuRangeToChange('');
    if (onResetAllFilters) onResetAllFilters();
  };

  const statusOptions: { label: string; value: StockStatusFilter; badgeColor: string }[] = [
    { label: 'All Statuses', value: 'All', badgeColor: 'bg-slate-600' },
    { label: 'Low Stock ⚠️', value: 'low_stock', badgeColor: 'bg-amber-600' },
    { label: 'Critical Low 🚨', value: 'critical', badgeColor: 'bg-rose-600' },
    { label: 'Out of Stock ⭕', value: 'out_of_stock', badgeColor: 'bg-red-700' },
    { label: 'Optimal Stock 🟢', value: 'optimal', badgeColor: 'bg-emerald-600' },
  ];

  return (
    <div
      id="stock-management-search-bar"
      className={`space-y-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-sm transition-colors ${className}`}
    >
      {/* Main Search Input & Primary Filter Controls Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        {/* Real-time search text input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            id="stock-inventory-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-14 py-2 bg-slate-50 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-teal-500 dark:focus:border-teal-400 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition shadow-xs"
          />
          {searchQuery ? (
            <button
              id="clear-stock-search-btn"
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full cursor-pointer"
              title="Clear search text (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 pointer-events-none">
              {modKey}+S
            </span>
          )}
        </div>

        {/* Category Filter Selector Buttons */}
        <div
          id="stock-category-filter-group"
          className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700 shrink-0 overflow-x-auto shadow-xs"
        >
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 px-1.5 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Category:
          </span>
          {(['All', 'Stationery', 'Cleaning', 'General'] as const).map((cat) => (
            <button
              key={cat}
              id={`filter-category-${cat.toLowerCase()}`}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                categoryFilter === cat
                  ? cat === 'Stationery'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : cat === 'Cleaning'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : cat === 'General'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Toggle Advanced Facets (SKU Range & Stock Status) */}
        <button
          id="toggle-advanced-facets-btn"
          type="button"
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition shrink-0 cursor-pointer shadow-xs ${
            isAdvancedOpen || stockStatusFilter !== 'All' || skuRangeFrom || skuRangeTo
              ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
              : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Filter simultaneously by SKU Range and Stock Status"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Multi-Facet Filter</span>
          {(stockStatusFilter !== 'All' || skuRangeFrom || skuRangeTo) && (
            <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />
          )}
          {isAdvancedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Real-time Results Counter Badge */}
        <div
          id="stock-search-results-counter"
          className="text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 whitespace-nowrap flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>
            Showing: <strong className="text-teal-600 dark:text-teal-400 font-bold">{filteredCount}</strong> of {totalCount} items
          </span>
        </div>

        {/* + New Stock Item Button (Replacing Reorder Report button per directive) */}
        {onNewStockItem && (
          <button
            id="search-bar-new-stock-btn"
            type="button"
            onClick={onNewStockItem}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold shadow-xs transition shrink-0 cursor-pointer ${
              isReadOnly
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                : 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white'
            }`}
            title={isReadOnly ? 'Log in to create and register new inventory stock items' : 'Create and register a new inventory stock item'}
          >
            {isReadOnly ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5" />}
            <span>+ New Stock Item {isReadOnly && <span className="text-[10px] opacity-80">(Log In)</span>}</span>
          </button>
        )}
      </div>

      {/* Multi-Faceted Filter Panel (Collapsible / Expandable) */}
      {isAdvancedOpen && (
        <div
          id="advanced-facets-drawer"
          className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-purple-200 dark:border-purple-900/60 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Facet 1: Stock Status Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Stock Status Facet:
              </label>
              <div className="flex flex-wrap gap-1">
                {statusOptions.map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => onStockStatusChange && onStockStatusChange(st.value)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer border ${
                      stockStatusFilter === st.value
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Facet 2: SKU Range Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Hash className="w-3 h-3 text-purple-500" />
                SKU Range Facet (Alphanumeric/Numeric):
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={skuRangeFrom}
                    onChange={(e) => onSkuRangeFromChange && onSkuRangeFromChange(e.target.value)}
                    placeholder="From (e.g. ST-001)"
                    className="w-full px-2.5 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 uppercase"
                  />
                  {skuRangeFrom && (
                    <button
                      type="button"
                      onClick={() => onSkuRangeFromChange && onSkuRangeFromChange('')}
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={skuRangeTo}
                    onChange={(e) => onSkuRangeToChange && onSkuRangeToChange(e.target.value)}
                    placeholder="To (e.g. ST-025)"
                    className="w-full px-2.5 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 uppercase"
                  />
                  {skuRangeTo && (
                    <button
                      type="button"
                      onClick={() => onSkuRangeToChange && onSkuRangeToChange('')}
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <span>Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSkuRangeFromChange) onSkuRangeFromChange('ST-001');
                    if (onSkuRangeToChange) onSkuRangeToChange('ST-025');
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  ST-001..025
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSkuRangeFromChange) onSkuRangeFromChange('CLN-001');
                    if (onSkuRangeToChange) onSkuRangeToChange('CLN-025');
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  CLN-001..025
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSkuRangeFromChange) onSkuRangeFromChange('GEN-001');
                    if (onSkuRangeToChange) onSkuRangeToChange('GEN-025');
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  GEN-001..025
                </button>
              </div>
            </div>

            {/* Facet Summary & Reset */}
            <div className="flex flex-col justify-end space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <span>Active Facets:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">
                  {[
                    categoryFilter !== 'All' ? `Cat: ${categoryFilter}` : null,
                    stockStatusFilter !== 'All' ? `Status: ${stockStatusFilter}` : null,
                    skuRangeFrom || skuRangeTo ? `SKU: ${skuRangeFrom || '*' }..${skuRangeTo || '*'}` : null,
                  ]
                    .filter(Boolean)
                    .join(' + ') || 'None (Default)'}
                </span>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center justify-center space-x-1 w-full py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Search & Facets</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Reset Bar (if applicable) */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-0.5 text-[11px]">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            Filtered results: <strong className="text-slate-700 dark:text-slate-200">{filteredCount}</strong> items matching filters
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md border border-rose-200 dark:border-rose-900/60 font-semibold cursor-pointer flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
};

