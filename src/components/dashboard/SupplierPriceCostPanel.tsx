import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Package, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { StockItem, ReceivedDocument } from '../../types';

interface SupplierPriceCostPanelProps {
  stockItems: StockItem[];
  receivedDocs: ReceivedDocument[];
}

interface SupplierStat {
  supplier: string;
  totalSpend: number;
  totalUnits: number;
  deliveryCount: number;
  avgUnitCost: number;
}

interface ItemCostTrend {
  itemID: string;
  itemName: string;
  category: string;
  unit: string;
  currentUnitPrice: number;
  prevUnitPrice: number | null;
  trend: 'up' | 'down' | 'flat';
  trendPct: number | null;
  totalSpend: number;
}

/**
 * SupplierPriceCostPanel
 *
 * Surfaces procurement cost intelligence from UnitPrice captured at delivery time.
 * Shows: top suppliers by spend, per-item unit-cost trends, and total estimated
 * inventory value.
 */
export const SupplierPriceCostPanel: React.FC<SupplierPriceCostPanelProps> = ({
  stockItems,
  receivedDocs,
}) => {
  const safeStock = Array.isArray(stockItems) ? stockItems : [];
  const safeDocs = Array.isArray(receivedDocs) ? receivedDocs : [];

  // Build a map of ItemID → UnitPrice from stock items
  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    safeStock.forEach((s) => {
      if (s.UnitPrice && s.UnitPrice > 0) m.set(s.ItemID, s.UnitPrice);
    });
    return m;
  }, [safeStock]);

  // Aggregate supplier spend from received docs
  const supplierStats = useMemo((): SupplierStat[] => {
    const map = new Map<string, SupplierStat>();

    safeDocs.forEach((doc) => {
      const supplierName = doc.supplier || doc.SupplierName || 'Unknown Supplier';
      if (!map.has(supplierName)) {
        map.set(supplierName, {
          supplier: supplierName,
          totalSpend: 0,
          totalUnits: 0,
          deliveryCount: 0,
          avgUnitCost: 0,
        });
      }
      const stat = map.get(supplierName)!;
      stat.deliveryCount += 1;

      doc.items.forEach((item) => {
        const unitPrice = priceMap.get(item.ItemID) ?? 0;
        const qty = Number(item.Qty) || 0;
        stat.totalUnits += qty;
        stat.totalSpend += qty * unitPrice;
      });
    });

    // Calculate avg unit cost
    map.forEach((stat) => {
      stat.avgUnitCost = stat.totalUnits > 0 ? stat.totalSpend / stat.totalUnits : 0;
    });

    return Array.from(map.values())
      .filter((s) => s.totalSpend > 0)
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 6);
  }, [safeDocs, priceMap]);

  // Per-item cost trends: compare current UnitPrice vs first recorded delivery price
  const itemCostTrends = useMemo((): ItemCostTrend[] => {
    // Build per-item delivery history sorted oldest first
    const itemDeliveries = new Map<string, number[]>();
    const sortedDocs = [...safeDocs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedDocs.forEach((doc) => {
      doc.items.forEach((item) => {
        const price = priceMap.get(item.ItemID);
        if (!price) return;
        if (!itemDeliveries.has(item.ItemID)) itemDeliveries.set(item.ItemID, []);
        itemDeliveries.get(item.ItemID)!.push(price);
      });
    });

    return safeStock
      .filter((s) => s.UnitPrice && s.UnitPrice > 0)
      .map((s): ItemCostTrend => {
        const history = itemDeliveries.get(s.ItemID) ?? [];
        const current = s.UnitPrice!;
        const prev = history.length >= 2 ? history[history.length - 2] : null;
        let trend: 'up' | 'down' | 'flat' = 'flat';
        let trendPct: number | null = null;

        if (prev !== null && prev > 0) {
          const delta = ((current - prev) / prev) * 100;
          trendPct = Math.round(delta * 10) / 10;
          trend = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
        }

        const totalSpend = (s.Qty ?? 0) * current;

        return {
          itemID: s.ItemID,
          itemName: s.ItemName,
          category: s.Category,
          unit: s.Unit,
          currentUnitPrice: current,
          prevUnitPrice: prev,
          trend,
          trendPct,
          totalSpend,
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 8);
  }, [safeStock, safeDocs, priceMap]);

  // Total estimated inventory value
  const totalInventoryValue = useMemo(() => {
    return safeStock.reduce((acc, s) => {
      const price = s.UnitPrice ?? 0;
      return acc + (s.Qty ?? 0) * price;
    }, 0);
  }, [safeStock]);

  const itemsWithPrice = safeStock.filter((s) => s.UnitPrice && s.UnitPrice > 0).length;

  if (itemsWithPrice === 0) {
    return (
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Supplier Price &amp; Cost Analytics
          </h3>
        </div>
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          <DollarSign className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p>No unit prices recorded yet.</p>
          <p className="mt-1">Enter a unit price when receiving stock deliveries to unlock cost analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Supplier Price &amp; Cost Analytics
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Est. Inventory Value
          </div>
          <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            R {totalInventoryValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top Suppliers by Spend */}
        <div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Top Suppliers by Spend
          </div>
          {supplierStats.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No supplier spend data yet.</p>
          ) : (
            <div className="space-y-2">
              {supplierStats.map((s) => (
                <div key={s.supplier} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {s.supplier}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {s.deliveryCount} deliveries · {s.totalUnits} units
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      R {s.totalSpend.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      avg R {s.avgUnitCost.toFixed(2)}/unit
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-Item Unit Cost Trends */}
        <div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Unit Cost Trends
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {itemCostTrends.map((item) => (
              <div key={item.itemID} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                      {item.itemID}
                    </span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.itemName}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Stock value: R {item.totalSpend.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                    R {item.currentUnitPrice.toFixed(2)}
                  </span>
                  {item.trend === 'up' && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-500">
                      <ArrowUpRight className="w-3 h-3" />
                      {item.trendPct}%
                    </span>
                  )}
                  {item.trend === 'down' && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500">
                      <ArrowDownRight className="w-3 h-3" />
                      {Math.abs(item.trendPct!)}%
                    </span>
                  )}
                  {item.trend === 'flat' && (
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
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
