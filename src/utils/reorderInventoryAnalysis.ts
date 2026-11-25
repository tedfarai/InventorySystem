import type { StockItem } from '../types';

export interface ReorderItemAnalysis {
  item: StockItem;
  currentQty: number;
  reorderLevel: number;
  shortageQty: number;
  recommendedOrderQty: number;
  targetRestockLevel: number;
  urgency: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW_STOCK';
  urgencyLabel: string;
}

export interface ReorderReportSummary {
  reportRef: string;
  generatedAt: string;
  totalInventoryCount: number;
  belowThresholdCount: number;
  outOfStockCount: number;
  criticalCount: number;
  lowStockCount: number;
  totalRecommendedUnits: number;
  categoryBreakdown: {
    Stationery: { count: number; recommendedUnits: number };
    Cleaning: { count: number; recommendedUnits: number };
    General: { count: number; recommendedUnits: number };
  };
  items: ReorderItemAnalysis[];
}

export function analyzeReorderInventory(stockItems: StockItem[]): ReorderReportSummary {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const reportRef = `ROR-${dateStr}-${timeStr}`;
  const categoryBreakdown = {
    Stationery: { count: 0, recommendedUnits: 0 },
    Cleaning: { count: 0, recommendedUnits: 0 },
    General: { count: 0, recommendedUnits: 0 },
  };
  let outOfStockCount = 0;
  let criticalCount = 0;
  let lowStockCount = 0;
  let totalRecommendedUnits = 0;
  const analyzedItems: ReorderItemAnalysis[] = [];

  stockItems.forEach((item) => {
    const currentQty = Number(item.Qty) || 0;
    const reorderLevel = Number(item.ReorderLevel) || 10;
    if (currentQty > reorderLevel) return;

    const shortageQty = Math.max(0, reorderLevel - currentQty);
    const targetRestockLevel = Math.max(reorderLevel * 2, 20);
    const recommendedOrderQty = Math.max(targetRestockLevel - currentQty, reorderLevel, 10);
    let urgency: ReorderItemAnalysis['urgency'] = 'LOW_STOCK';
    let urgencyLabel = 'LOW STOCK';

    if (currentQty <= 0) {
      urgency = 'OUT_OF_STOCK';
      urgencyLabel = 'OUT OF STOCK';
      outOfStockCount++;
    } else if (currentQty <= Math.ceil(reorderLevel * 0.5)) {
      urgency = 'CRITICAL';
      urgencyLabel = 'CRITICAL';
      criticalCount++;
    } else {
      lowStockCount++;
    }

    totalRecommendedUnits += recommendedOrderQty;
    const category = item.Category || 'General';
    if (categoryBreakdown[category]) {
      categoryBreakdown[category].count++;
      categoryBreakdown[category].recommendedUnits += recommendedOrderQty;
    }
    analyzedItems.push({
      item,
      currentQty,
      reorderLevel,
      shortageQty,
      recommendedOrderQty,
      targetRestockLevel,
      urgency,
      urgencyLabel,
    });
  });

  const urgencyWeight = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW_STOCK: 2 };
  analyzedItems.sort((a, b) =>
    urgencyWeight[a.urgency] !== urgencyWeight[b.urgency]
      ? urgencyWeight[a.urgency] - urgencyWeight[b.urgency]
      : b.shortageQty - a.shortageQty
  );

  return {
    reportRef,
    generatedAt: now.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'medium' }),
    totalInventoryCount: stockItems.length,
    belowThresholdCount: analyzedItems.length,
    outOfStockCount,
    criticalCount,
    lowStockCount,
    totalRecommendedUnits,
    categoryBreakdown,
    items: analyzedItems,
  };
}
