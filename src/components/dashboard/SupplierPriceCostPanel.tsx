import React, { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, Package, ArrowUpRight, ArrowDownRight, Minus, Repeat, Sparkles } from 'lucide-react';
import type { StockItem, ReceivedDocument, CurrencyCode } from '../../types';
import {
  formatCurrency,
  formatDualCurrency,
  convertCurrency,
  getExchangeRate,
  getDashboardCurrencyMode,
  setDashboardCurrencyMode,
  DashboardCurrencyMode,
} from '../../utils/currencyUtils';

interface SupplierPriceCostPanelProps {
  stockItems: StockItem[];
  receivedDocs: ReceivedDocument[];
  initialCurrencyMode?: DashboardCurrencyMode;
}

interface SupplierStat {
  supplier: string;
  totalSpendUsd: number;
  totalSpendZwg: number;
  totalUnits: number;
  deliveryCount: number;
  avgUnitCostUsd: number;
  avgUnitCostZwg: number;
}

interface ItemCostTrend {
  itemID: string;
  itemName: string;
  category: string;
  unit: string;
  currency: CurrencyCode;
  currentUnitPrice: number;
  prevUnitPrice: number | null;
  trend: 'up' | 'down' | 'flat';
  trendPct: number | null;
  stockQty: number;
  totalValueUsd: number;
  totalValueZwg: number;
}

/**
 * SupplierPriceCostPanel
 *
 * Surfaces procurement cost intelligence and historical supplier spend across
 * Zimbabwe's dual currency economic framework (USD and ZWG).
 */
export const SupplierPriceCostPanel: React.FC<SupplierPriceCostPanelProps> = ({
  stockItems,
  receivedDocs,
  initialCurrencyMode,
}) => {
  const [currencyMode, setCurrencyMode] = useState<DashboardCurrencyMode>(() => {
    return initialCurrencyMode || getDashboardCurrencyMode();
  });

  const handleModeChange = (mode: DashboardCurrencyMode) => {
    setCurrencyMode(mode);
    setDashboardCurrencyMode(mode);
  };

  const safeStock = Array.isArray(stockItems) ? stockItems : [];
  const safeDocs = Array.isArray(receivedDocs) ? receivedDocs : [];
  const rate = getExchangeRate();

  // Build a map of ItemID → { unitPrice, currency }
  const priceMap = useMemo(() => {
    const m = new Map<string, { price: number; currency: CurrencyCode }>();
    safeStock.forEach((s) => {
      const p = Number(s.UnitPrice) || 0;
      if (p > 0) {
        m.set(s.ItemID, { price: p, currency: s.Currency || 'USD' });
      }
    });
    return m;
  }, [safeStock]);

  // Aggregate supplier spend from received docs (accounting for both USD and ZWG)
  const supplierStats = useMemo((): SupplierStat[] => {
    const map = new Map<string, SupplierStat>();

    safeDocs.forEach((doc) => {
      const supplierName = doc.supplier || doc.SupplierName || 'Unknown Supplier';
      if (!map.has(supplierName)) {
        map.set(supplierName, {
          supplier: supplierName,
          totalSpendUsd: 0,
          totalSpendZwg: 0,
          totalUnits: 0,
          deliveryCount: 0,
          avgUnitCostUsd: 0,
          avgUnitCostZwg: 0,
        });
      }
      const stat = map.get(supplierName)!;
      stat.deliveryCount += 1;

      (doc.items || []).forEach((item) => {
        const itemInfo = priceMap.get(item.ItemID);
        const unitPrice = Number(item.UnitPrice ?? (item as any)?.unitPrice ?? itemInfo?.price ?? 0);
        const itemCurr: CurrencyCode = item.Currency || (item as any)?.currency || itemInfo?.currency || 'USD';
        const qty = Number(item.Qty) || 0;

        stat.totalUnits += qty;
        const lineTotal = qty * unitPrice;

        if (itemCurr === 'USD') {
          stat.totalSpendUsd += lineTotal;
          stat.totalSpendZwg += lineTotal * rate;
        } else {
          stat.totalSpendZwg += lineTotal;
          stat.totalSpendUsd += rate > 0 ? lineTotal / rate : 0;
        }
      });
    });

    map.forEach((stat) => {
      stat.avgUnitCostUsd = stat.totalUnits > 0 ? stat.totalSpendUsd / stat.totalUnits : 0;
      stat.avgUnitCostZwg = stat.totalUnits > 0 ? stat.totalSpendZwg / stat.totalUnits : 0;
    });

    return Array.from(map.values())
      .filter((s) => s.totalSpendUsd > 0 || s.totalSpendZwg > 0)
      .sort((a, b) => b.totalSpendUsd - a.totalSpendUsd)
      .slice(0, 6);
  }, [safeDocs, priceMap, rate]);

  // Per-item cost trends: compare current UnitPrice vs first recorded delivery price
  const itemCostTrends = useMemo((): ItemCostTrend[] => {
    const itemDeliveries = new Map<string, number[]>();
    const sortedDocs = [...safeDocs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedDocs.forEach((doc) => {
      (doc.items || []).forEach((item) => {
        const price = Number(item.UnitPrice ?? (item as any)?.unitPrice ?? priceMap.get(item.ItemID)?.price ?? 0);
        if (!price || price <= 0) return;
        if (!itemDeliveries.has(item.ItemID)) itemDeliveries.set(item.ItemID, []);
        itemDeliveries.get(item.ItemID)!.push(price);
      });
    });

    return safeStock
      .filter((s) => s.UnitPrice && s.UnitPrice > 0)
      .map((s): ItemCostTrend => {
        const history = itemDeliveries.get(s.ItemID) ?? [];
        const current = s.UnitPrice!;
        const curr: CurrencyCode = s.Currency || 'USD';
        const prev = history.length >= 2 ? history[history.length - 2] : null;
        let trend: 'up' | 'down' | 'flat' = 'flat';
        let trendPct: number | null = null;

        if (prev !== null && prev > 0) {
          const delta = ((current - prev) / prev) * 100;
          trendPct = Math.round(delta * 10) / 10;
          trend = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
        }

        const qty = s.Qty ?? 0;
        const lineTotal = qty * current;
        const totalValueUsd = curr === 'USD' ? lineTotal : (rate > 0 ? lineTotal / rate : 0);
        const totalValueZwg = curr === 'ZWG' ? lineTotal : lineTotal * rate;

        return {
          itemID: s.ItemID,
          itemName: s.ItemName,
          category: s.Category,
          unit: s.Unit,
          currency: curr,
          currentUnitPrice: current,
          prevUnitPrice: prev,
          trend,
          trendPct,
          stockQty: qty,
          totalValueUsd,
          totalValueZwg,
        };
      })
      .sort((a, b) => b.totalValueUsd - a.totalValueUsd)
      .slice(0, 8);
  }, [safeStock, safeDocs, priceMap, rate]);

  // Total estimated inventory value across dual currency
  const { totalInventoryUsd, totalInventoryZwg } = useMemo(() => {
    let usd = 0;
    let zwg = 0;
    safeStock.forEach((s) => {
      const price = Number(s.UnitPrice) || 0;
      const qty = Number(s.Qty) || 0;
      const curr: CurrencyCode = s.Currency || 'USD';
      if (price > 0 && qty > 0) {
        const line = qty * price;
        if (curr === 'USD') {
          usd += line;
          zwg += line * rate;
        } else {
          zwg += line;
          usd += rate > 0 ? line / rate : 0;
        }
      }
    });
    return { totalInventoryUsd: usd, totalInventoryZwg: zwg };
  }, [safeStock, rate]);

  const itemsWithPrice = safeStock.filter((s) => s.UnitPrice && s.UnitPrice > 0).length;

  if (itemsWithPrice === 0) {
    return (
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Zimbabwe Supplier Price &amp; Procurement Cost Analytics
          </h3>
        </div>
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          <DollarSign className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p>No unit prices recorded yet.</p>
          <p className="mt-1">
            Enter unit prices in either USD or ZWG when receiving stock deliveries to unlock dual-currency procurement analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
      {/* Header & Currency View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Zimbabwe Supplier Price &amp; Cost Intelligence</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                USD &amp; ZWG
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Benchmark Rate: 1 USD = {rate.toFixed(2)} ZWG
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleModeChange('DUAL')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                currencyMode === 'DUAL'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Dual (Both)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('USD')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                currencyMode === 'USD'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('ZWG')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                currencyMode === 'ZWG'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              ZiG ZWG
            </button>
          </div>

          {/* Est. Inventory Holding Value */}
          <div className="text-right sm:pl-3 sm:border-l border-slate-200 dark:border-slate-800">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Holding Valuation
            </div>
            {currencyMode === 'USD' ? (
              <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(totalInventoryUsd, 'USD', { showCode: true })}
              </div>
            ) : currencyMode === 'ZWG' ? (
              <div className="text-sm font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                {formatCurrency(totalInventoryZwg, 'ZWG', { showCode: true })}
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(totalInventoryUsd, 'USD', { showCode: true })}
                </div>
                <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 font-mono">
                  ≈ {formatCurrency(totalInventoryZwg, 'ZWG', { showCode: true })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Suppliers by Spend */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-blue-500" />
            <span>Top Suppliers by Procurement Spend</span>
          </div>
          {supplierStats.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No supplier deliveries logged yet.</p>
          ) : (
            <div className="space-y-2.5">
              {supplierStats.map((s) => (
                <div
                  key={s.supplier}
                  className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {s.supplier}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{s.deliveryCount} deliveries</span>
                      <span>•</span>
                      <span>{s.totalUnits.toLocaleString()} units</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {currencyMode === 'USD' ? (
                      <>
                        <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(s.totalSpendUsd, 'USD', { showCode: true })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          avg {formatCurrency(s.avgUnitCostUsd, 'USD')}/unit
                        </div>
                      </>
                    ) : currencyMode === 'ZWG' ? (
                      <>
                        <div className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                          {formatCurrency(s.totalSpendZwg, 'ZWG', { showCode: true })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          avg {formatCurrency(s.avgUnitCostZwg, 'ZWG')}/unit
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(s.totalSpendUsd, 'USD', { showCode: false })}
                        </div>
                        <div className="text-[10px] font-bold font-mono text-purple-600 dark:text-purple-400">
                          ≈ {formatCurrency(s.totalSpendZwg, 'ZWG', { showCode: true })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-Item Unit Cost Trends */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
            <span>Unit Cost Intelligence &amp; Movements</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {itemCostTrends.map((item) => (
              <div
                key={item.itemID}
                className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-1 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                      {item.itemID}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.itemName}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>
                      Stock Value:{' '}
                      <strong className="text-slate-700 dark:text-slate-300 font-mono font-bold">
                        {currencyMode === 'ZWG'
                          ? formatCurrency(item.totalValueZwg, 'ZWG', { showCode: true })
                          : formatCurrency(item.totalValueUsd, 'USD', { showCode: true })}
                      </strong>
                    </span>
                    <span>({item.stockQty} {item.unit})</span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 flex items-center justify-end gap-1">
                      <span>{formatCurrency(item.currentUnitPrice, item.currency, { showCode: true })}</span>
                    </div>
                    {item.currency === 'USD' ? (
                      <div className="text-[9.5px] font-mono text-purple-600 dark:text-purple-400">
                        ≈ ZiG {(item.currentUnitPrice * rate).toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400">
                        ≈ ${(item.currentUnitPrice / rate).toFixed(2)} USD
                      </div>
                    )}
                  </div>

                  {item.trend === 'up' && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950 px-1 py-0.5 rounded">
                      <ArrowUpRight className="w-3 h-3" />
                      {item.trendPct}%
                    </span>
                  )}
                  {item.trend === 'down' && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.5 rounded">
                      <ArrowDownRight className="w-3 h-3" />
                      {Math.abs(item.trendPct!)}%
                    </span>
                  )}
                  {item.trend === 'flat' && (
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400 px-1">
                      <Minus className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
