import { StockItem, MovementLogEntry, ItemCategory } from '../types';

export interface MonthlyCategoryConsumption {
  month: string; // e.g. 'Apr 2026'
  monthKey: string; // e.g. '2026-04'
  Stationery: number;
  Cleaning: number;
  General: number;
  Total: number;
}

export interface ConsumptionTrendPoint {
  periodKey: string;
  label: string;
  subLabel?: string;
  periodType: 'monthly' | 'quarterly' | 'custom';
  Stationery: number;
  Cleaning: number;
  General: number;
  Total: number;

  // Previous period values for variance tracking
  prevStationery: number;
  prevCleaning: number;
  prevGeneral: number;
  prevTotal: number;

  // Percentage variances (null for baseline/first period)
  stationeryVariancePct: number | null;
  cleaningVariancePct: number | null;
  generalVariancePct: number | null;
  totalVariancePct: number | null;

  // Percentage shares of the period total
  stationerySharePct: number;
  cleaningSharePct: number;
  generalSharePct: number;

  // Count of transactions in this period
  issueCount: number;

  // Predictive Demand Overlay
  predictedStationery?: number;
  predictedCleaning?: number;
  predictedGeneral?: number;
  predictedTotal?: number;
  demandGapTotal?: number; // Actual Total - Predicted Total
  demandGapPct?: number | null; // % difference
  demandGapStationery?: number;
  demandGapCleaning?: number;
  isForecast?: boolean; // true if this point is a future projected interval
}

export interface PredictiveOverlaySummary {
  totalHistoricalActual: number;
  totalHistoricalPredicted: number;
  netDemandGap: number;
  netDemandGapPct: number | null;
  gapStatus: 'SURGE' | 'CONSERVED' | 'ALIGNED';
  nextPeriodForecastTotal: number;
  nextPeriodForecastStationery: number;
  nextPeriodForecastCleaning: number;
  forecastHorizonCount: number;
}

export interface DateRangeFilterConfig {
  viewMode: 'monthly' | 'quarterly' | 'custom';
  monthlySpan?: 6 | 12 | 'ytd';
  quarterlySpan?: 4 | 6 | 'all';
  customStartDate?: string;
  customEndDate?: string;
  customInterval?: 'auto' | 'week' | 'month';
}

export interface ItemPrediction {
  item: StockItem;
  itemID: string;
  itemName: string;
  category: ItemCategory;
  unit: string;
  currentQty: number;
  reorderLevel: number;
  
  // Historical velocity
  totalIssuedPast6Months: number;
  monthlyAverageBurn: number;
  weeklyBurnRate: number;
  issueFrequencyCount: number; // how many times requisitioned
  lowStockIncidentCount: number; // times dropped below reorder or stockout
  
  // Predictive metrics requested by user
  monthlyPredictedConsumption: number;
  quarterlyPredictedConsumption: number; // 3 months
  sixMonthPredictedConsumption: number; // 6 months
  
  // Reorder recommendations
  daysUntilStockout: number;
  suggestedReorderQty: number;
  reorderUrgency: 'CRITICAL' | 'WARNING' | 'OPTIMAL' | 'OVERSTOCKED';
  urgencyScore: number; // For sorting (higher = more urgent)
  recommendationReason: string;
}

export interface ExecutiveAnalyticsSummary {
  monthlyTrend: MonthlyCategoryConsumption[];
  itemPredictions: ItemPrediction[];
  criticalItemsCount: number;
  warningItemsCount: number;
  frequentlyLowStockItems: ItemPrediction[];
  topConsumedItems: { name: string; category: string; qty: number; unit: string }[];
  totalProjected6MonthDemand: number;
  categoryDistribution: { name: string; value: number; count: number }[];
}

/**
 * Generates continuous last 6 month keys ending at the current or latest log date
 */
export function getLastSixMonths(referenceDate?: Date): { key: string; label: string }[] {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const months: { key: string; label: string }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    months.push({ key, label });
  }
  
  return months;
}

/**
 * Calculates monthly consumption of Stationery vs Cleaning vs General over the last six months
 */
export function calculateSixMonthConsumption(
  stockItems: StockItem[],
  movementLogs: MovementLogEntry[]
): MonthlyCategoryConsumption[] {
  // Determine reference date: use latest log timestamp or current date
  let latestTimestamp = new Date();
  if (movementLogs.length > 0) {
    const dates = movementLogs
      .map((l) => (l.Timestamp ? new Date(l.Timestamp.replace(' ', 'T')).getTime() : 0))
      .filter((t) => !isNaN(t) && t > 0);
    if (dates.length > 0) {
      latestTimestamp = new Date(Math.max(...dates));
    }
  }

  const sixMonths = getLastSixMonths(latestTimestamp);
  
  // Map itemID to category
  const itemCategoryMap = new Map<string, ItemCategory>();
  stockItems.forEach((s) => {
    itemCategoryMap.set(s.ItemID, s.Category);
  });

  // Pre-seed monthly buckets
  const monthBuckets: Record<string, { Stationery: number; Cleaning: number; General: number }> = {};
  sixMonths.forEach((m) => {
    monthBuckets[m.key] = { Stationery: 0, Cleaning: 0, General: 0 };
  });

  // Tally consumption from ISSUE logs
  movementLogs.forEach((log) => {
    if (log.Type !== 'ISSUE') return;
    const qty = Math.abs(Number(log.Qty) || 0);
    if (qty === 0) return;

    let monthKey = '';
    if (log.Timestamp) {
      monthKey = log.Timestamp.substring(0, 7); // 'YYYY-MM'
    }

    // Determine category
    let category = itemCategoryMap.get(log.ItemID);
    if (!category) {
      if (log.ItemID.startsWith('ST-')) category = 'Stationery';
      else if (log.ItemID.startsWith('CL-')) category = 'Cleaning';
      else category = 'General';
    }

    if (monthBuckets[monthKey]) {
      if (category === 'Stationery') {
        monthBuckets[monthKey].Stationery += qty;
      } else if (category === 'Cleaning') {
        monthBuckets[monthKey].Cleaning += qty;
      } else {
        monthBuckets[monthKey].General += qty;
      }
    }
  });

  return sixMonths.map((m) => {
    const b = monthBuckets[m.key] || { Stationery: 0, Cleaning: 0, General: 0 };
    return {
      month: m.label,
      monthKey: m.key,
      Stationery: b.Stationery,
      Cleaning: b.Cleaning,
      General: b.General,
      Total: b.Stationery + b.Cleaning + b.General,
    };
  });
}

/**
 * Flexible consumption trend calculator supporting Monthly, Quarterly, and Custom Date Ranges
 * with exact numerical breakdown and period-over-period percentage variance.
 */
export function calculateFlexibleConsumptionTrend(
  stockItems: StockItem[],
  movementLogs: MovementLogEntry[],
  filter: DateRangeFilterConfig,
  options?: {
    includeForecastHorizon?: boolean;
  }
): {
  trendData: ConsumptionTrendPoint[];
  totalStationery: number;
  totalCleaning: number;
  totalGeneral: number;
  grandTotal: number;
  overallVariancePct: number | null;
  dateRangeDescription: string;
  filteredLogCount: number;
  deptConsumption: { name: string; qty: number }[];
  availableDateBounds: { minDate: string; maxDate: string };
  predictiveOverlaySummary: PredictiveOverlaySummary;
} {
  const safeStock = Array.isArray(stockItems) ? stockItems : [];
  const safeLogs = Array.isArray(movementLogs) ? movementLogs : [];

  // Determine latest and earliest timestamp
  let latestTimestamp = new Date();
  let earliestTimestamp = new Date();
  const validTimestamps: number[] = [];

  safeLogs.forEach((l) => {
    if (l.Timestamp) {
      const t = new Date(l.Timestamp.replace(' ', 'T')).getTime();
      if (!isNaN(t) && t > 0) validTimestamps.push(t);
    }
  });

  if (validTimestamps.length > 0) {
    latestTimestamp = new Date(Math.max(...validTimestamps));
    earliestTimestamp = new Date(Math.min(...validTimestamps));
  }

  const minDateStr = earliestTimestamp.toISOString().substring(0, 10);
  const maxDateStr = latestTimestamp.toISOString().substring(0, 10);

  // Map itemID to category
  const itemCategoryMap = new Map<string, ItemCategory>();
  safeStock.forEach((s) => {
    itemCategoryMap.set(s.ItemID, s.Category);
  });

  const getCategory = (itemID: string): ItemCategory => {
    let cat = itemCategoryMap.get(itemID);
    if (!cat) {
      if (itemID.startsWith('ST-')) cat = 'Stationery';
      else if (itemID.startsWith('CL-')) cat = 'Cleaning';
      else cat = 'General';
    }
    return cat;
  };

  interface PeriodBucketDef {
    key: string;
    label: string;
    subLabel?: string;
    startDate: Date;
    endDate: Date;
  }

  const periodBuckets: PeriodBucketDef[] = [];
  let dateRangeDescription = '';

  if (filter.viewMode === 'monthly') {
    let spanMonths = 6;
    if (filter.monthlySpan === 12) spanMonths = 12;
    else if (filter.monthlySpan === 'ytd') {
      spanMonths = Math.max(1, latestTimestamp.getMonth() + 1);
    }

    dateRangeDescription = `Monthly View (${spanMonths} Months): `;

    for (let i = spanMonths - 1; i >= 0; i--) {
      const d = new Date(latestTimestamp.getFullYear(), latestTimestamp.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      periodBuckets.push({ key, label, startDate: start, endDate: end });
    }

    if (periodBuckets.length > 0) {
      dateRangeDescription += `${periodBuckets[0].label} – ${periodBuckets[periodBuckets.length - 1].label}`;
    }
  } else if (filter.viewMode === 'quarterly') {
    let numQuarters = 4;
    if (filter.quarterlySpan === 6) numQuarters = 6;
    else if (filter.quarterlySpan === 'all') numQuarters = 8;

    dateRangeDescription = `Quarterly View (Past ${numQuarters} Quarters): `;

    const currentYear = latestTimestamp.getFullYear();
    const currentQuarter = Math.floor(latestTimestamp.getMonth() / 3) + 1; // 1 to 4

    for (let i = numQuarters - 1; i >= 0; i--) {
      let q = currentQuarter - i;
      let yr = currentYear;
      while (q <= 0) {
        q += 4;
        yr -= 1;
      }
      const startMonth = (q - 1) * 3;
      const start = new Date(yr, startMonth, 1, 0, 0, 0);
      const end = new Date(yr, startMonth + 3, 0, 23, 59, 59, 999);
      const key = `${yr}-Q${q}`;
      const label = `Q${q} ${yr}`;
      const subLabel = `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short' })}`;
      periodBuckets.push({ key, label, subLabel, startDate: start, endDate: end });
    }

    if (periodBuckets.length > 0) {
      dateRangeDescription += `${periodBuckets[0].label} – ${periodBuckets[periodBuckets.length - 1].label}`;
    }
  } else {
    // Custom Date Range
    let startD = filter.customStartDate ? new Date(filter.customStartDate + 'T00:00:00') : new Date(latestTimestamp.getTime() - 90 * 86400000);
    let endD = filter.customEndDate ? new Date(filter.customEndDate + 'T23:59:59') : new Date(latestTimestamp.getTime());

    if (isNaN(startD.getTime())) startD = new Date(latestTimestamp.getTime() - 90 * 86400000);
    if (isNaN(endD.getTime())) endD = new Date(latestTimestamp.getTime());
    if (startD > endD) {
      const tmp = startD;
      startD = endD;
      endD = tmp;
    }

    const diffDays = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
    const startStr = startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateRangeDescription = `Custom Range: ${startStr} – ${endStr} (${diffDays} days)`;

    const intervalMode = filter.customInterval || (diffDays <= 45 ? 'week' : 'month');

    if (intervalMode === 'week') {
      let cur = new Date(startD);
      let weekIdx = 1;
      while (cur <= endD) {
        const next = new Date(cur.getTime() + 6 * 86400000);
        const chunkEnd = next > endD ? new Date(endD) : next;
        chunkEnd.setHours(23, 59, 59, 999);

        const lbl = `${cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${chunkEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        const key = `W${weekIdx}-${cur.toISOString().substring(0, 10)}`;
        periodBuckets.push({ key, label: lbl, startDate: new Date(cur), endDate: chunkEnd });

        cur = new Date(chunkEnd.getTime() + 1000);
        weekIdx++;
      }
    } else {
      // Monthly buckets within custom range
      let cur = new Date(startD.getFullYear(), startD.getMonth(), 1);
      while (cur <= endD) {
        const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
        const bucketStart = cur < startD ? new Date(startD) : new Date(cur);
        const bucketEnd = monthEnd > endD ? new Date(endD) : monthEnd;

        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const label = cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        periodBuckets.push({ key, label, startDate: bucketStart, endDate: bucketEnd });

        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    }
  }

  // Pre-seed bucket counters
  const bucketCounters: Record<string, { Stationery: number; Cleaning: number; General: number; issueCount: number }> = {};
  periodBuckets.forEach((p) => {
    bucketCounters[p.key] = { Stationery: 0, Cleaning: 0, General: 0, issueCount: 0 };
  });

  const deptCounts: Record<string, number> = {};
  let filteredLogCount = 0;

  // Filter and aggregate logs
  safeLogs.forEach((log) => {
    if (log.Type !== 'ISSUE') return;
    const qty = Math.abs(Number(log.Qty) || 0);
    if (qty === 0) return;
    if (!log.Timestamp) return;

    const logTime = new Date(log.Timestamp.replace(' ', 'T')).getTime();
    if (isNaN(logTime)) return;

    // Find which bucket this log belongs to
    const targetBucket = periodBuckets.find(
      (b) => logTime >= b.startDate.getTime() && logTime <= b.endDate.getTime()
    );

    if (targetBucket) {
      filteredLogCount += 1;
      const cat = getCategory(log.ItemID);
      if (cat === 'Stationery') {
        bucketCounters[targetBucket.key].Stationery += qty;
      } else if (cat === 'Cleaning') {
        bucketCounters[targetBucket.key].Cleaning += qty;
      } else {
        bucketCounters[targetBucket.key].General += qty;
      }
      bucketCounters[targetBucket.key].issueCount += 1;

      // Track department issue
      const deptName = log.DeptName || 'General Operations';
      if (deptName && deptName !== 'N/A') {
        deptCounts[deptName] = (deptCounts[deptName] || 0) + qty;
      }
    }
  });

  // Calculate predictive baseline consumption demand per category
  const allItemPredictions = calculateAllStockPredictions(safeStock, safeLogs);
  let predStatMonthly = 0;
  let predCleanMonthly = 0;
  let predGenMonthly = 0;

  allItemPredictions.forEach((p) => {
    if (p.category === 'Stationery') predStatMonthly += p.monthlyPredictedConsumption;
    else if (p.category === 'Cleaning') predCleanMonthly += p.monthlyPredictedConsumption;
    else predGenMonthly += p.monthlyPredictedConsumption;
  });

  const predTotalMonthly = predStatMonthly + predCleanMonthly + predGenMonthly;

  // Calculate variances and shares
  const trendData: ConsumptionTrendPoint[] = [];
  let runningStationery = 0;
  let runningCleaning = 0;
  let runningGeneral = 0;

  periodBuckets.forEach((bucket, idx) => {
    const counts = bucketCounters[bucket.key] || { Stationery: 0, Cleaning: 0, General: 0, issueCount: 0 };
    const Total = counts.Stationery + counts.Cleaning + counts.General;

    runningStationery += counts.Stationery;
    runningCleaning += counts.Cleaning;
    runningGeneral += counts.General;

    const prevPoint = idx > 0 ? trendData[idx - 1] : null;
    const prevTotal = prevPoint ? prevPoint.Total : 0;
    const prevStationery = prevPoint ? prevPoint.Stationery : 0;
    const prevCleaning = prevPoint ? prevPoint.Cleaning : 0;
    const prevGeneral = prevPoint ? prevPoint.General : 0;

    let totalVariancePct: number | null = null;
    let stationeryVariancePct: number | null = null;
    let cleaningVariancePct: number | null = null;
    let generalVariancePct: number | null = null;

    if (idx > 0) {
      if (prevTotal > 0) {
        totalVariancePct = Math.round(((Total - prevTotal) / prevTotal) * 1000) / 10;
      } else {
        totalVariancePct = Total > 0 ? 100 : 0;
      }

      if (prevStationery > 0) {
        stationeryVariancePct = Math.round(((counts.Stationery - prevStationery) / prevStationery) * 1000) / 10;
      } else {
        stationeryVariancePct = counts.Stationery > 0 ? 100 : 0;
      }

      if (prevCleaning > 0) {
        cleaningVariancePct = Math.round(((counts.Cleaning - prevCleaning) / prevCleaning) * 1000) / 10;
      } else {
        cleaningVariancePct = counts.Cleaning > 0 ? 100 : 0;
      }

      if (prevGeneral > 0) {
        generalVariancePct = Math.round(((counts.General - prevGeneral) / prevGeneral) * 1000) / 10;
      } else {
        generalVariancePct = counts.General > 0 ? 100 : 0;
      }
    }

    const stationerySharePct = Total > 0 ? Math.round((counts.Stationery / Total) * 1000) / 10 : 0;
    const cleaningSharePct = Total > 0 ? Math.round((counts.Cleaning / Total) * 1000) / 10 : 0;
    const generalSharePct = Total > 0 ? Math.round((counts.General / Total) * 1000) / 10 : 0;

    // Calculate period-calibrated predictive demand baseline
    const daysInBucket = Math.max(1, Math.round((bucket.endDate.getTime() - bucket.startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const monthFraction = filter.viewMode === 'monthly' ? 1.0 : filter.viewMode === 'quarterly' ? 3.0 : (daysInBucket / 30.4375);

    const predictedStationery = Math.round(predStatMonthly * monthFraction);
    const predictedCleaning = Math.round(predCleanMonthly * monthFraction);
    const predictedGeneral = Math.round(predGenMonthly * monthFraction);
    const predictedTotal = predictedStationery + predictedCleaning + predictedGeneral;

    const demandGapTotal = Total - predictedTotal;
    const demandGapPct = predictedTotal > 0 ? Math.round(((Total - predictedTotal) / predictedTotal) * 1000) / 10 : null;
    const demandGapStationery = counts.Stationery - predictedStationery;
    const demandGapCleaning = counts.Cleaning - predictedCleaning;

    trendData.push({
      periodKey: bucket.key,
      label: bucket.label,
      subLabel: bucket.subLabel,
      periodType: filter.viewMode,
      Stationery: counts.Stationery,
      Cleaning: counts.Cleaning,
      General: counts.General,
      Total,
      prevStationery,
      prevCleaning,
      prevGeneral,
      prevTotal,
      stationeryVariancePct,
      cleaningVariancePct,
      generalVariancePct,
      totalVariancePct,
      stationerySharePct,
      cleaningSharePct,
      generalSharePct,
      issueCount: counts.issueCount,
      predictedStationery,
      predictedCleaning,
      predictedGeneral,
      predictedTotal,
      demandGapTotal,
      demandGapPct,
      demandGapStationery,
      demandGapCleaning,
      isForecast: false,
    });
  });

  // Future Forecast Horizon (Past vs Future Requirements overlay extension)
  if (options?.includeForecastHorizon) {
    if (filter.viewMode === 'monthly') {
      for (let f = 1; f <= 2; f++) {
        const nextDate = new Date(latestTimestamp.getFullYear(), latestTimestamp.getMonth() + f, 1);
        const nextMonthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
        const nextLabel = `${nextDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (Forecast)`;
        
        const forwardFactor = 1 + (f * 0.02);
        const fStat = Math.round(predStatMonthly * forwardFactor);
        const fClean = Math.round(predCleanMonthly * forwardFactor);
        const fGen = Math.round(predGenMonthly * forwardFactor);
        const fTot = fStat + fClean + fGen;

        trendData.push({
          periodKey: `forecast-${nextMonthKey}`,
          label: nextLabel,
          subLabel: `Projected Future Demand (+${f} Mo)`,
          periodType: 'monthly',
          Stationery: 0,
          Cleaning: 0,
          General: 0,
          Total: 0,
          prevStationery: 0,
          prevCleaning: 0,
          prevGeneral: 0,
          prevTotal: 0,
          stationeryVariancePct: null,
          cleaningVariancePct: null,
          generalVariancePct: null,
          totalVariancePct: null,
          stationerySharePct: fTot > 0 ? Math.round((fStat / fTot) * 1000) / 10 : 0,
          cleaningSharePct: fTot > 0 ? Math.round((fClean / fTot) * 1000) / 10 : 0,
          generalSharePct: fTot > 0 ? Math.round((fGen / fTot) * 1000) / 10 : 0,
          issueCount: 0,
          predictedStationery: fStat,
          predictedCleaning: fClean,
          predictedGeneral: fGen,
          predictedTotal: fTot,
          demandGapTotal: 0,
          demandGapPct: 0,
          demandGapStationery: 0,
          demandGapCleaning: 0,
          isForecast: true,
        });
      }
    } else if (filter.viewMode === 'quarterly') {
      const currentYear = latestTimestamp.getFullYear();
      const currentQuarter = Math.floor(latestTimestamp.getMonth() / 3) + 1;
      let nextQ = currentQuarter + 1;
      let nextYr = currentYear;
      if (nextQ > 4) {
        nextQ = 1;
        nextYr += 1;
      }
      const fStat = Math.round(predStatMonthly * 3 * 1.03);
      const fClean = Math.round(predCleanMonthly * 3 * 1.03);
      const fGen = Math.round(predGenMonthly * 3 * 1.03);
      const fTot = fStat + fClean + fGen;

      trendData.push({
        periodKey: `forecast-${nextYr}-Q${nextQ}`,
        label: `Q${nextQ} ${nextYr} (Forecast)`,
        subLabel: 'Projected Future Quarterly Requirement',
        periodType: 'quarterly',
        Stationery: 0,
        Cleaning: 0,
        General: 0,
        Total: 0,
        prevStationery: 0,
        prevCleaning: 0,
        prevGeneral: 0,
        prevTotal: 0,
        stationeryVariancePct: null,
        cleaningVariancePct: null,
        generalVariancePct: null,
        totalVariancePct: null,
        stationerySharePct: fTot > 0 ? Math.round((fStat / fTot) * 1000) / 10 : 0,
        cleaningSharePct: fTot > 0 ? Math.round((fClean / fTot) * 1000) / 10 : 0,
        generalSharePct: fTot > 0 ? Math.round((fGen / fTot) * 1000) / 10 : 0,
        issueCount: 0,
        predictedStationery: fStat,
        predictedCleaning: fClean,
        predictedGeneral: fGen,
        predictedTotal: fTot,
        demandGapTotal: 0,
        demandGapPct: 0,
        demandGapStationery: 0,
        demandGapCleaning: 0,
        isForecast: true,
      });
    }
  }

  const grandTotal = runningStationery + runningCleaning + runningGeneral;
  let overallVariancePct: number | null = null;
  const historicalOnly = trendData.filter((d) => !d.isForecast);
  if (historicalOnly.length >= 2) {
    const latest = historicalOnly[historicalOnly.length - 1];
    const prev = historicalOnly[historicalOnly.length - 2];
    if (prev.Total > 0) {
      overallVariancePct = Math.round(((latest.Total - prev.Total) / prev.Total) * 1000) / 10;
    } else if (latest.Total > 0) {
      overallVariancePct = 100;
    } else {
      overallVariancePct = 0;
    }
  }

  const deptConsumption = Object.entries(deptCounts)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);

  // Calculate overlay gap analytics summary
  const totalHistoricalActual = historicalOnly.reduce((acc, d) => acc + d.Total, 0);
  const totalHistoricalPredicted = historicalOnly.reduce((acc, d) => acc + (d.predictedTotal || 0), 0);
  const netDemandGap = totalHistoricalActual - totalHistoricalPredicted;
  const netDemandGapPct = totalHistoricalPredicted > 0
    ? Math.round(((totalHistoricalActual - totalHistoricalPredicted) / totalHistoricalPredicted) * 1000) / 10
    : null;

  let gapStatus: 'SURGE' | 'CONSERVED' | 'ALIGNED' = 'ALIGNED';
  if (netDemandGapPct !== null) {
    if (netDemandGapPct > 5) gapStatus = 'SURGE';
    else if (netDemandGapPct < -5) gapStatus = 'CONSERVED';
  }

  const predictiveOverlaySummary: PredictiveOverlaySummary = {
    totalHistoricalActual,
    totalHistoricalPredicted,
    netDemandGap,
    netDemandGapPct,
    gapStatus,
    nextPeriodForecastTotal: predTotalMonthly,
    nextPeriodForecastStationery: predStatMonthly,
    nextPeriodForecastCleaning: predCleanMonthly,
    forecastHorizonCount: trendData.filter((d) => d.isForecast).length,
  };

  return {
    trendData,
    totalStationery: runningStationery,
    totalCleaning: runningCleaning,
    totalGeneral: runningGeneral,
    grandTotal,
    overallVariancePct,
    dateRangeDescription,
    filteredLogCount,
    deptConsumption,
    availableDateBounds: { minDate: minDateStr, maxDate: maxDateStr },
    predictiveOverlaySummary,
  };
}

/**
 * Calculates predictive consumption (Monthly, Quarterly, 6-Month)
 * and intelligent reorder suggestions for ALL stock items based on velocity and thresholds.
 */
export function calculateAllStockPredictions(
  stockItems: StockItem[],
  movementLogs: MovementLogEntry[]
): ItemPrediction[] {
  // Aggregate issues by ItemID over the last 6 months
  const itemIssueStats = new Map<
    string,
    { totalQty: number; issueCount: number; monthsActive: Set<string>; recentDipsBelowReorder: number }
  >();

  const itemReorderMap = new Map<string, number>();
  stockItems.forEach((item) => {
    itemReorderMap.set(item.ItemID, Number(item.ReorderLevel) || 10);
  });

  // Track stock velocity from logs
  movementLogs.forEach((log) => {
    if (log.Type === 'ISSUE') {
      const qty = Math.abs(Number(log.Qty) || 0);
      const existing = itemIssueStats.get(log.ItemID) || {
        totalQty: 0,
        issueCount: 0,
        monthsActive: new Set<string>(),
        recentDipsBelowReorder: 0,
      };

      existing.totalQty += qty;
      existing.issueCount += 1;
      if (log.Timestamp) {
        existing.monthsActive.add(log.Timestamp.substring(0, 7));
      }
      itemIssueStats.set(log.ItemID, existing);
    } else if (log.Type === 'ADJUSTMENT' && (Number(log.Qty) || 0) < 0) {
      // Discrepancies or shrinkage also factor into depletion
      const existing = itemIssueStats.get(log.ItemID) || {
        totalQty: 0,
        issueCount: 0,
        monthsActive: new Set<string>(),
        recentDipsBelowReorder: 0,
      };
      existing.recentDipsBelowReorder += 1;
      itemIssueStats.set(log.ItemID, existing);
    }
  });

  const predictions: ItemPrediction[] = stockItems.map((item) => {
    const currentQty = Number(item.Qty) || 0;
    const reorderLevel = Number(item.ReorderLevel) || 10;
    const stats = itemIssueStats.get(item.ItemID) || {
      totalQty: 0,
      issueCount: 0,
      monthsActive: new Set<string>(),
      recentDipsBelowReorder: 0,
    };

    // Calculate baseline monthly burn rate
    // If we have 6 months of data, divide by 6. If less, use at least 1 month or default weighted baseline
    const activeMonthsCount = Math.max(stats.monthsActive.size, 1);
    let monthlyAverageBurn = stats.totalQty > 0 ? stats.totalQty / Math.min(activeMonthsCount, 6) : 0;

    // If an item hasn't been issued recently but has a reorder level, estimate minimum operational consumption
    if (monthlyAverageBurn === 0) {
      monthlyAverageBurn = Math.max(Math.round(reorderLevel * 0.4), 1);
    }

    const weeklyBurnRate = Math.round((monthlyAverageBurn / 4.33) * 10) / 10;
    const dailyBurnRate = monthlyAverageBurn / 30;

    // Predictive projections with mild safety trend factor (e.g. 1.05 buffer for peak periods)
    const trendFactor = 1.05;
    const monthlyPredictedConsumption = Math.ceil(monthlyAverageBurn * trendFactor);
    const quarterlyPredictedConsumption = Math.ceil(monthlyPredictedConsumption * 3);
    const sixMonthPredictedConsumption = Math.ceil(monthlyPredictedConsumption * 6);

    // Days until stockout at current velocity
    const daysUntilStockout = dailyBurnRate > 0 ? Math.floor(currentQty / dailyBurnRate) : 999;

    // Check frequency of low stock
    let lowStockIncidentCount = stats.recentDipsBelowReorder;
    if (currentQty <= reorderLevel) {
      lowStockIncidentCount += 1;
    }

    // Determine Suggested Reorder Quantity:
    // Economic safety model: Reorder = Target Buffer (2x Reorder Level or 2 months consumption) - Current Stock + Safety Margin
    const targetBuffer = Math.max(reorderLevel * 2, monthlyPredictedConsumption * 2);
    let suggestedReorderQty = 0;
    let reorderUrgency: ItemPrediction['reorderUrgency'] = 'OPTIMAL';
    let urgencyScore = 0;
    let recommendationReason = 'Stock balance is adequate for projected operational consumption.';

    if (currentQty <= 0) {
      reorderUrgency = 'CRITICAL';
      urgencyScore = 100;
      suggestedReorderQty = Math.max(targetBuffer, reorderLevel * 2);
      recommendationReason = 'STOCKOUT DETECTED. Immediate procurement required to avoid office work stoppage.';
    } else if (currentQty <= reorderLevel) {
      reorderUrgency = 'CRITICAL';
      urgencyScore = 80 + Math.max(0, 20 - daysUntilStockout);
      suggestedReorderQty = Math.max(targetBuffer - currentQty, reorderLevel);
      recommendationReason = `Below safety reorder threshold (${reorderLevel} ${item.Unit}). Projected stockout in ${daysUntilStockout} days.`;
    } else if (daysUntilStockout <= 30) {
      reorderUrgency = 'WARNING';
      urgencyScore = 50 + (30 - daysUntilStockout);
      suggestedReorderQty = Math.max(targetBuffer - currentQty, reorderLevel);
      recommendationReason = `High consumption velocity. Will breach safety reorder level in approx ${daysUntilStockout} days.`;
    } else if (currentQty > targetBuffer * 2 && targetBuffer > 0) {
      reorderUrgency = 'OVERSTOCKED';
      urgencyScore = -10;
      suggestedReorderQty = 0;
      recommendationReason = `Sufficient inventory on hand (${currentQty} ${item.Unit}). Exceeds 6-month projected demand.`;
    } else {
      reorderUrgency = 'OPTIMAL';
      urgencyScore = 10;
      suggestedReorderQty = 0;
      recommendationReason = `Healthy operational runway. Coverage lasts approx ${daysUntilStockout > 365 ? '1+ year' : `${daysUntilStockout} days`}.`;
    }

    // Normalize suggested reorder to integer
    suggestedReorderQty = Math.ceil(suggestedReorderQty);

    return {
      item,
      itemID: item.ItemID,
      itemName: item.ItemName,
      category: item.Category,
      unit: item.Unit || 'Units',
      currentQty,
      reorderLevel,
      totalIssuedPast6Months: stats.totalQty,
      monthlyAverageBurn: Math.round(monthlyAverageBurn * 10) / 10,
      weeklyBurnRate,
      issueFrequencyCount: stats.issueCount,
      lowStockIncidentCount,
      monthlyPredictedConsumption,
      quarterlyPredictedConsumption,
      sixMonthPredictedConsumption,
      daysUntilStockout,
      suggestedReorderQty,
      reorderUrgency,
      urgencyScore,
      recommendationReason,
    };
  });

  // Sort by urgency score descending by default
  return predictions.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

/**
 * Comprehensive analytical rollup for the Executive Dashboard
 */
export function getExecutiveAnalytics(
  stockItems: StockItem[],
  movementLogs: MovementLogEntry[]
): ExecutiveAnalyticsSummary {
  const safeStock = Array.isArray(stockItems) ? stockItems : [];
  const safeLogs = Array.isArray(movementLogs) ? movementLogs : [];

  const monthlyTrend = calculateSixMonthConsumption(safeStock, safeLogs);
  const itemPredictions = calculateAllStockPredictions(safeStock, safeLogs);

  const criticalItemsCount = itemPredictions.filter((p) => p.reorderUrgency === 'CRITICAL').length;
  const warningItemsCount = itemPredictions.filter((p) => p.reorderUrgency === 'WARNING').length;

  const frequentlyLowStockItems = itemPredictions.filter(
    (p) => p.currentQty <= p.reorderLevel || p.lowStockIncidentCount > 0 || p.daysUntilStockout <= 21
  );

  // Top consumed items overall
  const topConsumedItems = itemPredictions
    .slice()
    .sort((a, b) => b.totalIssuedPast6Months - a.totalIssuedPast6Months)
    .slice(0, 5)
    .map((p) => ({
      name: p.itemName,
      category: p.category,
      qty: p.totalIssuedPast6Months,
      unit: p.unit,
    }));

  const totalProjected6MonthDemand = itemPredictions.reduce(
    (acc, p) => acc + p.sixMonthPredictedConsumption,
    0
  );

  // Category distribution
  const catMap = { Stationery: 0, Cleaning: 0, General: 0 };
  const catCount = { Stationery: 0, Cleaning: 0, General: 0 };
  safeStock.forEach((s) => {
    const q = Number(s.Qty) || 0;
    if (s.Category === 'Stationery') {
      catMap.Stationery += q;
      catCount.Stationery += 1;
    } else if (s.Category === 'Cleaning') {
      catMap.Cleaning += q;
      catCount.Cleaning += 1;
    } else {
      catMap.General += q;
      catCount.General += 1;
    }
  });

  const categoryDistribution = [
    { name: 'Stationery', value: catMap.Stationery, count: catCount.Stationery },
    { name: 'Cleaning', value: catMap.Cleaning, count: catCount.Cleaning },
    { name: 'General', value: catMap.General, count: catCount.General },
  ];

  return {
    monthlyTrend,
    itemPredictions,
    criticalItemsCount,
    warningItemsCount,
    frequentlyLowStockItems,
    topConsumedItems,
    totalProjected6MonthDemand,
    categoryDistribution,
  };
}
