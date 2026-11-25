import { StockItem, MovementLogEntry } from '../types';
import { addDaysToIsoDate, formatLocalDateIso } from './stockForecastService';

export interface DailyCategoryMovementPoint {
  dateIso: string;
  issuedQty: number;
  receivedQty: number;
  adjustmentDelta: number;
  transactionCount: number;
}

export interface CategoryPrioritySku {
  itemID: string;
  itemName: string;
  currentQty: number;
  reorderLevel: number;
  unit: string;
  avgDailyBurn: number;
  daysUntilThreshold: number | null;
  suggestedReorderDate: string | null;
}

export type VelocityMomentum = 'Accelerating' | 'Steady' | 'Cooling' | 'Dormant';

export interface CategoryMovementPatternSummary {
  category: string;
  skuCount: number;
  totalCurrentStock: number;
  totalReorderLevel: number;
  itemsBelowThreshold: number;
  outOfStockCount: number;
  totalIssuedUnits: number;
  totalReceivedUnits: number;
  issueTransactionCount: number;
  deliveryCount: number;
  avgDailyBurnRate: number;
  recentHalfDailyBurn: number;
  priorHalfDailyBurn: number;
  velocityMomentum: VelocityMomentum;
  peakWeekday: string;
  peakSingleDayIssue: number;
  estimatedCoverDays: number | null;
  estimatedDaysUntilReorder: number | null;
  baselineOptimalReorderDate: string | null;
  recommendedBaselineQty: number;
  hasSufficientHistory: boolean;
  topPriorityItems: CategoryPrioritySku[];
  recentDailySeries: DailyCategoryMovementPoint[];
}

export interface CategoryAiForecastRecommendation {
  category: string;
  optimalReorderDate: string;
  orderWindowStartDate: string;
  urgencyLevel: 'IMMEDIATE' | 'SOON' | 'PLANNED' | 'ADEQUATE' | 'INSUFFICIENT_DATA';
  predictedNext30DayDemand: number;
  recommendedOrderQty: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  patternAnalysis: string;
  keyDrivers: string[];
  actionRecommendation: string;
}

export interface AiCategoryReorderForecastResponse {
  model: string;
  generatedAt: string;
  referenceDateIso: string;
  executiveSummary: string;
  forecastHorizonNote: string;
  categoryForecasts: CategoryAiForecastRecommendation[];
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function extractLogDateIso(timestamp?: string): string | null {
  if (!timestamp || typeof timestamp !== 'string') return null;
  const trimmed = timestamp.trim();
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatLocalDateIso(parsed);
}

function diffDaysBetweenIso(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  return Math.round((endUtc - startUtc) / 86_400_000);
}

function roundTo(val: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export interface BuildCategoryPatternsOptions {
  analysisWindowDays?: number;
  leadTimeDays?: number;
  safetyBufferDays?: number;
  referenceDateIso?: string;
}

/**
 * Aggregates SQLite/state stockItems and historical movementLogs into clean per-category
 * pattern summaries suitable for both deterministic baseline display and AI forecast prompts.
 * Pure & read-only: never mutates input arrays or historical logs.
 */
export function buildCategoryMovementPatterns(
  stockItems: StockItem[],
  movementLogs: MovementLogEntry[],
  options: BuildCategoryPatternsOptions = {}
): {
  referenceDateIso: string;
  analysisWindowDays: number;
  leadTimeDays: number;
  safetyBufferDays: number;
  categories: CategoryMovementPatternSummary[];
} {
  const safeStock = Array.isArray(stockItems) ? stockItems : [];
  const safeLogs = Array.isArray(movementLogs) ? movementLogs : [];

  const rawWindow = options.analysisWindowDays === undefined ? 60 : Number(options.analysisWindowDays);
  const analysisWindowDays = Math.max(7, Math.min(365, Math.round(Number.isFinite(rawWindow) ? rawWindow : 60)));
  const rawLead = options.leadTimeDays === undefined ? 5 : Number(options.leadTimeDays);
  const leadTimeDays = Math.max(1, Math.min(60, Math.round(Number.isFinite(rawLead) ? rawLead : 5)));
  const rawBuffer = options.safetyBufferDays === undefined ? 7 : Number(options.safetyBufferDays);
  const safetyBufferDays = Math.max(0, Math.min(60, Math.round(Number.isFinite(rawBuffer) ? rawBuffer : 7)));

  const referenceDateIso =
    options.referenceDateIso && /^\d{4}-\d{2}-\d{2}$/.test(options.referenceDateIso)
      ? options.referenceDateIso
      : formatLocalDateIso(new Date());

  const windowStartIso = addDaysToIsoDate(referenceDateIso, -(analysisWindowDays - 1));
  const halfPointIso = addDaysToIsoDate(referenceDateIso, -(Math.floor(analysisWindowDays / 2) - 1));

  // Map ItemID -> StockItem for category lookup
  const itemLookup = new Map<string, StockItem>();
  const categorySet = new Set<string>(['Stationery', 'Cleaning', 'General']);

  for (const item of safeStock) {
    if (!item || !item.ItemID) continue;
    itemLookup.set(item.ItemID, item);
    if (item.Category && typeof item.Category === 'string') {
      categorySet.add(item.Category);
    }
  }

  // Group stock items by category
  const itemsByCategory = new Map<string, StockItem[]>();
  for (const cat of categorySet) {
    itemsByCategory.set(cat, []);
  }
  for (const item of safeStock) {
    if (!item) continue;
    const cat = item.Category || 'General';
    if (!itemsByCategory.has(cat)) itemsByCategory.set(cat, []);
    itemsByCategory.get(cat)!.push(item);
  }

  // Track daily movement metrics & per-item issue totals within window
  const categoryDailyMap = new Map<string, Map<string, DailyCategoryMovementPoint>>();
  const categoryWeekdayTotals = new Map<string, number[]>();
  const categoryIssueCount = new Map<string, number>();
  const categoryDeliveryCount = new Map<string, number>();
  const categoryRecentHalfIssued = new Map<string, number>();
  const categoryPriorHalfIssued = new Map<string, number>();
  const itemIssuedInWindow = new Map<string, number>();

  for (const cat of itemsByCategory.keys()) {
    categoryDailyMap.set(cat, new Map());
    categoryWeekdayTotals.set(cat, [0, 0, 0, 0, 0, 0, 0]);
    categoryIssueCount.set(cat, 0);
    categoryDeliveryCount.set(cat, 0);
    categoryRecentHalfIssued.set(cat, 0);
    categoryPriorHalfIssued.set(cat, 0);
  }

  for (const log of safeLogs) {
    if (!log) continue;
    const dateIso = extractLogDateIso(log.Timestamp);
    if (!dateIso) continue;
    // Include logs up to referenceDateIso inside [windowStartIso, referenceDateIso]
    if (dateIso < windowStartIso || dateIso > referenceDateIso) continue;

    const item = log.ItemID ? itemLookup.get(log.ItemID) : undefined;
    const inferredCategory =
      item?.Category ||
      (log.ItemID?.startsWith('ST-')
        ? 'Stationery'
        : log.ItemID?.startsWith('CL-')
        ? 'Cleaning'
        : 'General');

    if (!categoryDailyMap.has(inferredCategory)) {
      categoryDailyMap.set(inferredCategory, new Map());
      categoryWeekdayTotals.set(inferredCategory, [0, 0, 0, 0, 0, 0, 0]);
      categoryIssueCount.set(inferredCategory, 0);
      categoryDeliveryCount.set(inferredCategory, 0);
      categoryRecentHalfIssued.set(inferredCategory, 0);
      categoryPriorHalfIssued.set(inferredCategory, 0);
    }

    const dailyMap = categoryDailyMap.get(inferredCategory)!;
    const point = dailyMap.get(dateIso) || {
      dateIso,
      issuedQty: 0,
      receivedQty: 0,
      adjustmentDelta: 0,
      transactionCount: 0,
    };

    const rawQty = Number(log.Qty) || 0;
    const absQty = Math.abs(rawQty);

    if (log.Type === 'ISSUE') {
      point.issuedQty += absQty;
      point.transactionCount += 1;
      categoryIssueCount.set(inferredCategory, (categoryIssueCount.get(inferredCategory) || 0) + 1);

      if (log.ItemID) {
        itemIssuedInWindow.set(log.ItemID, (itemIssuedInWindow.get(log.ItemID) || 0) + absQty);
      }

      const [y, m, d] = dateIso.split('-').map(Number);
      const weekdayIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const weekdayArr = categoryWeekdayTotals.get(inferredCategory)!;
      weekdayArr[weekdayIdx] += absQty;

      if (dateIso >= halfPointIso) {
        categoryRecentHalfIssued.set(
          inferredCategory,
          (categoryRecentHalfIssued.get(inferredCategory) || 0) + absQty
        );
      } else {
        categoryPriorHalfIssued.set(
          inferredCategory,
          (categoryPriorHalfIssued.get(inferredCategory) || 0) + absQty
        );
      }
    } else if (log.Type === 'DELIVERY') {
      point.receivedQty += absQty;
      point.transactionCount += 1;
      categoryDeliveryCount.set(inferredCategory, (categoryDeliveryCount.get(inferredCategory) || 0) + 1);
    } else if (log.Type === 'ADJUSTMENT') {
      point.adjustmentDelta += rawQty;
      point.transactionCount += 1;
    }

    dailyMap.set(dateIso, point);
  }

  const halfWindowDays = Math.max(1, Math.floor(analysisWindowDays / 2));
  const priorWindowDays = Math.max(1, analysisWindowDays - halfWindowDays);

  const categories: CategoryMovementPatternSummary[] = [];

  for (const [category, catItems] of itemsByCategory.entries()) {
    // Skip completely empty non-default categories
    if (catItems.length === 0 && (categoryIssueCount.get(category) || 0) === 0) {
      continue;
    }

    const totalCurrentStock = catItems.reduce((sum, it) => sum + Math.max(0, Number(it.Qty) || 0), 0);
    const totalReorderLevel = catItems.reduce((sum, it) => sum + Math.max(0, Number(it.ReorderLevel) || 0), 0);
    const itemsBelowThreshold = catItems.filter(
      (it) => (Number(it.Qty) || 0) <= (Number(it.ReorderLevel) || 0)
    ).length;
    const outOfStockCount = catItems.filter((it) => (Number(it.Qty) || 0) <= 0).length;

    const dailyMap = categoryDailyMap.get(category) || new Map<string, DailyCategoryMovementPoint>();
    const allPoints = Array.from(dailyMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));

    const totalIssuedUnits = allPoints.reduce((s, p) => s + p.issuedQty, 0);
    const totalReceivedUnits = allPoints.reduce((s, p) => s + p.receivedQty, 0);
    const issueTransactionCount = categoryIssueCount.get(category) || 0;
    const deliveryCount = categoryDeliveryCount.get(category) || 0;

    // Effective active observation span: use days from earliest log in window (minimum 7 days, capped at analysisWindowDays)
    const activeSpanDays =
      allPoints.length > 0
        ? Math.max(7, Math.min(analysisWindowDays, diffDaysBetweenIso(allPoints[0].dateIso, referenceDateIso) + 1))
        : analysisWindowDays;

    const avgDailyBurnRate = roundTo(totalIssuedUnits / activeSpanDays, 2);
    const recentHalfDailyBurn = roundTo((categoryRecentHalfIssued.get(category) || 0) / halfWindowDays, 2);
    const priorHalfDailyBurn = roundTo((categoryPriorHalfIssued.get(category) || 0) / priorWindowDays, 2);

    let velocityMomentum: VelocityMomentum = 'Dormant';
    if (totalIssuedUnits > 0) {
      if (priorHalfDailyBurn === 0 && recentHalfDailyBurn > 0) {
        velocityMomentum = 'Accelerating';
      } else if (recentHalfDailyBurn > priorHalfDailyBurn * 1.15) {
        velocityMomentum = 'Accelerating';
      } else if (recentHalfDailyBurn < priorHalfDailyBurn * 0.85) {
        velocityMomentum = 'Cooling';
      } else {
        velocityMomentum = 'Steady';
      }
    }

    const weekdayTotals = categoryWeekdayTotals.get(category) || [0, 0, 0, 0, 0, 0, 0];
    let peakWeekday = 'N/A';
    let maxWeekdayQty = 0;
    weekdayTotals.forEach((qty, idx) => {
      if (qty > maxWeekdayQty) {
        maxWeekdayQty = qty;
        peakWeekday = WEEKDAY_NAMES[idx];
      }
    });

    const peakSingleDayIssue = allPoints.reduce((max, p) => Math.max(max, p.issuedQty), 0);

    // Build top priority SKUs ranked by urgency (shortest runway to reorder threshold)
    const prioritySkus: CategoryPrioritySku[] = catItems
      .map((item) => {
        const currentQty = Math.max(0, Number(item.Qty) || 0);
        const reorderLevel = Math.max(0, Number(item.ReorderLevel) || 0);
        const itemIssued = itemIssuedInWindow.get(item.ItemID) || 0;
        const avgDailyBurn = roundTo(itemIssued / activeSpanDays, 2);

        let daysUntilThreshold: number | null = null;
        let suggestedReorderDate: string | null = null;

        if (currentQty <= reorderLevel) {
          daysUntilThreshold = 0;
          suggestedReorderDate = referenceDateIso;
        } else if (avgDailyBurn > 0) {
          const runwayAboveThreshold = Math.floor((currentQty - reorderLevel) / avgDailyBurn);
          const triggerDays = Math.max(0, runwayAboveThreshold - leadTimeDays);
          daysUntilThreshold = triggerDays;
          suggestedReorderDate = addDaysToIsoDate(referenceDateIso, triggerDays);
        }

        return {
          itemID: item.ItemID,
          itemName: item.ItemName,
          currentQty,
          reorderLevel,
          unit: item.Unit || 'Units',
          avgDailyBurn,
          daysUntilThreshold,
          suggestedReorderDate,
        };
      })
      .sort((a, b) => {
        const aDays = a.daysUntilThreshold ?? 9999;
        const bDays = b.daysUntilThreshold ?? 9999;
        if (aDays !== bDays) return aDays - bDays;
        return b.avgDailyBurn - a.avgDailyBurn;
      })
      .slice(0, 5);

    // Category-level cover & baseline reorder date
    let estimatedCoverDays: number | null = null;
    let estimatedDaysUntilReorder: number | null = null;
    let baselineOptimalReorderDate: string | null = null;

    if (itemsBelowThreshold > 0) {
      estimatedDaysUntilReorder = 0;
      baselineOptimalReorderDate = referenceDateIso;
      estimatedCoverDays = avgDailyBurnRate > 0 ? Math.floor(totalCurrentStock / avgDailyBurnRate) : 0;
    } else if (avgDailyBurnRate > 0) {
      estimatedCoverDays = Math.floor(totalCurrentStock / avgDailyBurnRate);
      const daysUntilSafetyFloor = Math.max(
        0,
        Math.floor((totalCurrentStock - totalReorderLevel) / avgDailyBurnRate)
      );
      // Optimal reorder date accounts for supplier lead time + safety buffer
      const rawLeadTrigger = Math.max(0, daysUntilSafetyFloor - (leadTimeDays + Math.round(safetyBufferDays * 0.5)));
      // Also respect earliest SKU trigger if sooner
      const earliestSkuDays = prioritySkus[0]?.daysUntilThreshold;
      estimatedDaysUntilReorder =
        earliestSkuDays !== null && earliestSkuDays !== undefined
          ? Math.min(rawLeadTrigger, earliestSkuDays)
          : rawLeadTrigger;
      baselineOptimalReorderDate = addDaysToIsoDate(referenceDateIso, estimatedDaysUntilReorder);
    }

    const target30DayBuffer = Math.ceil(avgDailyBurnRate * (30 + leadTimeDays + safetyBufferDays));
    const recommendedBaselineQty = Math.max(
      0,
      Math.max(totalReorderLevel * 2, target30DayBuffer) - totalCurrentStock
    );

    // Compact last 14 daily active points (up to 21) for AI time-series pattern recognition
    const recentDailySeries = allPoints.slice(-21);

    categories.push({
      category,
      skuCount: catItems.length,
      totalCurrentStock,
      totalReorderLevel,
      itemsBelowThreshold,
      outOfStockCount,
      totalIssuedUnits,
      totalReceivedUnits,
      issueTransactionCount,
      deliveryCount,
      avgDailyBurnRate,
      recentHalfDailyBurn,
      priorHalfDailyBurn,
      velocityMomentum,
      peakWeekday,
      peakSingleDayIssue,
      estimatedCoverDays,
      estimatedDaysUntilReorder,
      baselineOptimalReorderDate,
      recommendedBaselineQty,
      hasSufficientHistory: issueTransactionCount >= 2 && totalIssuedUnits > 0,
      topPriorityItems: prioritySkus,
      recentDailySeries,
    });
  }

  return {
    referenceDateIso,
    analysisWindowDays,
    leadTimeDays,
    safetyBufferDays,
    categories,
  };
}
