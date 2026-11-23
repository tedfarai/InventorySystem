import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { ItemCategory } from '../../types';

interface CategoryOptionMeta {
  value: ItemCategory;
  label: string;
  description: string;
  dotColorClass: string;
}

const CATEGORY_OPTIONS: CategoryOptionMeta[] = [
  {
    value: 'Stationery',
    label: 'Stationery',
    description: 'Office paper, pens, files & desk supplies',
    dotColorClass: 'bg-teal-500',
  },
  {
    value: 'Cleaning',
    label: 'Cleaning',
    description: 'Sanitation, detergents & hygiene stock',
    dotColorClass: 'bg-sky-500',
  },
  {
    value: 'General',
    label: 'General',
    description: 'Packaging, utilities & shared hardware',
    dotColorClass: 'bg-emerald-500',
  },
];

interface CategoryMultiSelectDropdownProps {
  selectedCategories: ItemCategory[];
  onChange: (categories: ItemCategory[]) => void;
  categoryCounts?: Partial<Record<ItemCategory, number>>;
  totalCount?: number;
  className?: string;
}

export const CategoryMultiSelectDropdown: React.FC<CategoryMultiSelectDropdownProps> = ({
  selectedCategories,
  onChange,
  categoryCounts = {},
  totalCount,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isFiltered = selectedCategories.length > 0 && selectedCategories.length < CATEGORY_OPTIONS.length;

  const toggleCategory = (cat: ItemCategory) => {
    const exists = selectedCategories.includes(cat);
    const next = exists
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];

    // Normalizing all categories selected back to [] ("All Categories") keeps filter state unambiguous
    if (next.length === CATEGORY_OPTIONS.length) {
      onChange([]);
    } else {
      onChange(next);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const triggerLabel = (() => {
    if (selectedCategories.length === 0) return 'All Categories';
    if (selectedCategories.length === 1) return selectedCategories[0];
    if (selectedCategories.length === 2) return selectedCategories.join(', ');
    return `${selectedCategories.length} Categories`;
  })();

  const computedTotal =
    totalCount ??
    CATEGORY_OPTIONS.reduce((sum, opt) => sum + (categoryCounts[opt.value] ?? 0), 0);

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        id="btn-category-multiselect-dropdown"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter inventory by one or more product categories"
        className={`inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition cursor-pointer shadow-xs whitespace-nowrap shrink-0 min-h-[36px] ${
          isFiltered
            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 dark:border-teal-600 text-teal-800 dark:text-teal-200'
            : isOpen
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white'
            : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <Filter
            className={`w-3.5 h-3.5 shrink-0 ${
              isFiltered ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          />
          <span className="text-slate-500 dark:text-slate-400 font-medium">Category:</span>
          <span className="font-bold">{triggerLabel}</span>
          {isFiltered && (
            <span className="font-mono tabular-nums text-[10.5px] text-teal-700 dark:text-teal-300">
              ({selectedCategories.length}/{CATEGORY_OPTIONS.length})
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          id="category-multiselect-popover"
          role="listbox"
          aria-multiselectable="true"
          aria-label="Product categories filter"
          className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-40 overflow-hidden text-xs"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Filter Categories</div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                Select one or more product types
              </div>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Show All</span>
              </button>
            )}
          </div>

          {/* All Categories Option */}
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
            <button
              id="category-option-all"
              type="button"
              role="option"
              aria-selected={selectedCategories.length === 0}
              onClick={handleSelectAll}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                selectedCategories.length === 0
                  ? 'bg-teal-50/80 dark:bg-teal-950/50 text-teal-900 dark:text-teal-100'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                    selectedCategories.length === 0
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  {selectedCategories.length === 0 && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="font-bold">All Categories</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {computedTotal} items
              </span>
            </button>
          </div>

          {/* Multi-select Individual Categories */}
          <div className="p-1.5 space-y-1">
            {CATEGORY_OPTIONS.map((option) => {
              const isChecked = selectedCategories.includes(option.value);
              const count = categoryCounts[option.value] ?? 0;

              return (
                <button
                  key={option.value}
                  id={`category-option-${option.value.toLowerCase()}`}
                  type="button"
                  role="option"
                  aria-selected={isChecked}
                  onClick={() => toggleCategory(option.value)}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    isChecked
                      ? 'bg-teal-50/80 dark:bg-teal-950/50 text-slate-900 dark:text-white'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition ${
                        isChecked
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-xs">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${option.dotColorClass}`} />
                        <span>{option.label}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                        {option.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
