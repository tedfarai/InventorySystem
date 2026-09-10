import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Search, Check, Package, X } from 'lucide-react';
import { StockItem, ItemCategory } from '../../types';

export interface StockItemDropUpSelectProps {
  id?: string;
  stockItems: StockItem[];
  selectedItemId: string;
  onSelectItem: (item: StockItem) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  direction?: 'up' | 'down';
  label?: string;
}

/**
 * Uniform Stock Item Drop-Up selector adhering to Paramount Exports design specs.
 * Formats every item row strictly as:
 * [ItemID] ItemName — (Category | Current Qty: Qty Unit)
 */
export const StockItemDropUpSelect: React.FC<StockItemDropUpSelectProps> = ({
  id = 'stock-item-drop-up-select',
  stockItems,
  selectedItemId,
  onSelectItem,
  placeholder = '-- Click to select a stock item from Master Stock drop-up list --',
  disabled = false,
  className = '',
  direction = 'up',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ItemCategory>('All');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = stockItems.find((i) => i.ItemID === selectedItemId);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter items
  const filteredItems = stockItems.filter((item) => {
    const matchesCat = categoryFilter === 'All' || item.Category === categoryFilter;
    if (!matchesCat) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.ItemID.toLowerCase().includes(q) ||
      item.ItemName.toLowerCase().includes(q) ||
      item.Category.toLowerCase().includes(q)
    );
  });

  const handleSelect = (item: StockItem) => {
    onSelectItem(item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const formattedSelectedItem = selectedItem
    ? `[${selectedItem.ItemID}] ${selectedItem.ItemName} — (${selectedItem.Category} | Current Qty: ${selectedItem.Qty} ${selectedItem.Unit})`
    : '';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 text-left bg-white dark:bg-slate-900 border ${
          isOpen
            ? 'border-purple-600 dark:border-purple-400 ring-2 ring-purple-500/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        } rounded-xl text-xs transition flex items-center justify-between gap-2 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <div className="flex-1 truncate">
          {selectedItem ? (
            <span className="font-mono text-slate-900 dark:text-slate-100 font-medium text-xs truncate block">
              {formattedSelectedItem}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic text-xs">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 shrink-0">
          {direction === 'up' ? (
            isOpen ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronUp className="w-4 h-4" />
          ) : (
            isOpen ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Uniform Drop-Up Menu Overlay */}
      {isOpen && (
        <div
          className={`absolute z-50 w-full ${
            direction === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } max-h-72 flex flex-col bg-white dark:bg-slate-900 border-2 border-purple-500/80 dark:border-purple-400/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header with Search and Category filters */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to filter by SKU, item name or category..."
                className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-sans text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-1 text-[11px]">
              <div className="flex items-center gap-1">
                {(['All', 'Stationery', 'Cleaning', 'General'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      categoryFilter === cat
                        ? cat === 'Stationery'
                          ? 'bg-blue-600 text-white'
                          : cat === 'Cleaning'
                          ? 'bg-emerald-600 text-white'
                          : cat === 'General'
                          ? 'bg-amber-600 text-white'
                          : 'bg-purple-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {filteredItems.length} items
              </span>
            </div>
          </div>

          {/* Item List Scroll Area strictly matching attached UI */}
          <div className="overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 flex-1">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                No matching inventory items found
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.ItemID === selectedItemId;
                return (
                  <button
                    key={item.ItemID}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3 py-2 text-[12.5px] font-sans leading-relaxed transition-colors flex items-center justify-between gap-2 group cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold'
                        : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100/90 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="truncate">
                      [{item.ItemID}] {item.ItemName} — ({item.Category} | Current Qty: {item.Qty} {item.Unit})
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
