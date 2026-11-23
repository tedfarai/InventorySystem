import { MovementLogEntry, StockItem } from '../types';

export type ForecastWindowAnchor = 'today' | 'latest_activity';

export type ForecastReliabilityStatus =
  | 'RELIABLE'
  | 'FLAT_TREND'
  | 'NO_MOVEMENT'
  | 'INSUFFICIENT_HISTORY'
  | 'INVALID_INPUT'
  | 'ITEM_NOT_FOUND';

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  n: number;
  meanX: number;
  meanY: number;
}

export type TargetDateValidationErrorCode =
  | 'INVALID_DATE'
  | 'PAST_DATE'
  | 'TODAY_NOT_FUTURE';

export interface DateDifferenceResult {
  valid: boolean;
  daysFromCurrentDate: number | null;
  errorCode?: TargetDateValidationErrorCode;
  errorMessage?: string;
}

export interface TargetDateForecastResult {
  targetDateIso: string;
  formattedDate: string;
  valid: boolean;
  daysFromCurrentDate: number | null;
  errorCode?: TargetDateValidationErrorCode;
  errorMessage?: string;
  /** Unclamped linear regression stock projection on the target date (may be <= 0). */
  rawProjectedStock: number | null;
  /** Physical stock projected available on target date (floored at 0). */
  projectedAvailableStock: number | null;
  /** Projected shortage magnitude below 0 if stock depletes completely. */
  projectedDepletionDeficit: number;
  /** Effective minimum stock threshold evaluated (or null if none configured). */
  evaluatedThreshold: number | null;
  /** Estimated additional units needed if stock drops below zero or configured minimum level. */
  estimatedQtyNeeded: number | null;
  needBasis: 'DEPLETED_AND_BELOW_THRESHOLD' | 'DEPLETED_BELOW_ZERO' | 'BELOW_MINIMUM_THRESHOLD' | 'SUFFICIENT' | 'UNAVAILABLE';
  statusLabel: string;
  headlineMessage: string;
  detailMessage: string;
}

export interface ForecastSeriesPoint {
  dateIso: string;
  label: string;
  dayIndex: number;
  isForecast: boolean;
  isTargetDate?: boolean;
  historicalStock: number | null;
  regressionTrend: number;
  projectedStock: number | null;
  netDailyMovement: number | null;
  minimumThreshold: number | null;
}

export interface ForecastAssumptions {
  itemId: string;
  itemName: string;
  unit: string;
  currentDateIso: string;
  currentStock: number;
  historyDays: number;
  windowAnchor: ForecastWindowAnchor;
  windowStartDateIso: string;
  windowEndDateIso: string;
  minimumThreshold: number | null;
  thresholdSource: 'USER_DEFINED' | 'ITEM_REORDER_LEVEL' | 'MISSING';
  dailyTrend: number | null;
  rSquared: number | null;
  movementEventsInWindow: number;
  activeDaysInWindow: number;
  totalInboundUnits: number;
  totalOutboundUnits: number;
  netMovementUnits: number;
  totalLogsAllTime: number;
  latestLogDateIso: string | null;
  earliestLogDateIso: string | null;
}

export interface ItemLinearForecastReport {
  isReliable: boolean;
  status: ForecastReliabilityStatus;
  statusTitle: string;
  statusExplanation: string;
  estimateDisclaimer: string;
  warnings: string[];
  assumptions: ForecastAssumptions;
  regression: LinearRegressionResult | null;
  targetForecasts: TargetDateForecastResult[];
  chartSeries: ForecastSeriesPoint[];
}

export const ESTIMATE_DISCLAIMER =
  'Estimate only — not a guarantee. Forecast uses basic ordinary least squares (OLS) linear regression on recent movement history and assumes past daily net stock changes continue linearly without unscheduled deliveries, demand spikes, or policy changes.';

const MS_PER_DAY = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats a JS Date object into a strict local YYYY-MM-DD calendar string.
 */
export function formatLocalDateIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates that a string is a real Gregorian calendar date formatted as YYYY-MM-DD.
 * Rejects rollover dates such as 2026-02-30 or 2026-13-01.
 */
export function isValidIsoDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  const match = ISO_DATE_RE.exec(trimmed);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

/**
 * Parses a YYYY-MM-DD date string into UTC midnight milliseconds.
 */
function parseIsoDateToUtcMs(dateStr: string): number | null {
  if (!isValidIsoDate(dateStr)) return null;
  const match = ISO_DATE_RE.exec(dateStr.trim())!;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Formats a valid YYYY-MM-DD date string in human-readable UTC date form (e.g. "Dec 3, 2026").
 */
export function formatReadableIsoDate(dateStr: string): string {
  const ms = parseIsoDateToUtcMs(dateStr);
  if (ms === null) return dateStr;
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Adds an integer number of days to a valid YYYY-MM-DD date string.
 */
export function addDaysToIsoDate(dateStr: string, deltaDays: number): string {
  const ms = parseIsoDateToUtcMs(dateStr);
  if (ms === null || !Number.isFinite(deltaDays)) {
    throw new Error(`Invalid base date or day offset: ${dateStr}, ${deltaDays}`);
  }
  const shifted = new Date(ms + Math.trunc(deltaDays) * MS_PER_DAY);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates whole calendar days from currentDateIso to targetDateIso, enforcing future-date validation.
 */
export function calculateFutureDaysFromDate(
  currentDateIso: string,
  targetDateIso: string
): DateDifferenceResult {
  const currentMs = parseIsoDateToUtcMs(currentDateIso);
  if (currentMs === null) {
    return {
      valid: false,
      daysFromCurrentDate: null,
      errorCode: 'INVALID_DATE',
      errorMessage: 'Reference current date is invalid.',
    };
  }

  if (!isValidIsoDate(targetDateIso)) {
    return {
      valid: false,
      daysFromCurrentDate: null,
      errorCode: 'INVALID_DATE',
      errorMessage: `“${targetDateIso || 'Empty date'}” is not a valid calendar date (expected YYYY-MM-DD).`,
    };
  }

  const targetMs = parseIsoDateToUtcMs(targetDateIso)!;
  const diffDays = Math.round((targetMs - currentMs) / MS_PER_DAY);

  if (diffDays < 0) {
    return {
      valid: false,
      daysFromCurrentDate: diffDays,
      errorCode: 'PAST_DATE',
      errorMessage: `${formatReadableIsoDate(targetDateIso)} is ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} in the past. Select a future date.`,
    };
  }

  if (diffDays === 0) {
    return {
      valid: false,
      daysFromCurrentDate: 0,
      errorCode: 'TODAY_NOT_FUTURE',
      errorMessage: `${formatReadableIsoDate(targetDateIso)} is today. Select a future date (at least 1 day ahead).`,
    };
  }

  return {
    valid: true,
    daysFromCurrentDate: diffDays,
  };
}

/**
 * Parses a movement log Timestamp field into a YYYY-MM-DD calendar key.
 */
export function extractLogDateIso(timestamp: string | undefined | null): string | null {
  if (!timestamp || typeof timestamp !== 'string') return null;
  const trimmed = timestamp.trim();
  if (trimmed.length < 10) return null;

  const prefix = trimmed.substring(0, 10);
  if (isValidIsoDate(prefix)) return prefix;

  const parsed = new Date(trimmed.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return null;
  return formatLocalDateIso(parsed);
}

/**
 * Converts a movement log record to signed inventory delta (+ inbound, - outbound).
 */
export function extractSignedMovementQty(log: MovementLogEntry): number {
  if (!log) return 0;
  const rawQty = Number(log.Qty);
  if (!Number.isFinite(rawQty) || rawQty === 0) return 0;

  if (log.Type === 'DELIVERY') return Math.abs(rawQty);
  if (log.Type === 'ISSUE') return -Math.abs(rawQty);
  if (log.Type === 'ADJUSTMENT') return rawQty;
  return 0;
}

/**
 * Computes ordinary least squares (OLS) simple linear regression: y = intercept + slope * x.
 * Returns null if fewer than 2 points exist or x values have zero variance.
 */
export function computeLinearRegression(
  points: ReadonlyArray<{ x: number; y: number }>
): LinearRegressionResult | null {
  if (!Array.isArray(points) || points.length < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let validCount = 0;

  for (const pt of points) {
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
      return null;
    }
    sumX += pt.x;
    sumY += pt.y;
    validCount += 1;
  }

  if (validCount < 2) return null;

  const meanX = sumX / validCount;
  const meanY = sumY / validCount;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;

  for (const pt of points) {
    const dx = pt.x - meanX;
    const dy = pt.y - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const rSquared = syy === 0 ? 1 : Math.min(1, Math.max(0, (sxy * sxy) / (sxx * syy)));

  return {
    slope,
    intercept,
    rSquared,
    n: validCount,
    meanX,
    meanY,
  };
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

function formatQty(val: number): string {
  const rounded = roundTo(val, 1);
  return Number.isInteger(rounded) ? rounded.toLocaleString() : rounded.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/**
 * Evaluates projected stock & estimated additional units needed for a single future target date.
 */
export function evaluateTargetDateProjection(params: {
  currentDateIso: string;
  targetDateIso: string;
  currentStock: number;
  dailyTrend: number;
  minimumThreshold: number | null;
  unit: string;
}): TargetDateForecastResult {
  const { currentDateIso, targetDateIso, currentStock, dailyTrend, minimumThreshold, unit } = params;
  const dateDiff = calculateFutureDaysFromDate(currentDateIso, targetDateIso);
  const readableDate = formatReadableIsoDate(targetDateIso);

  if (!dateDiff.valid || dateDiff.daysFromCurrentDate === null) {
    return {
      targetDateIso,
      formattedDate: readableDate,
      valid: false,
      daysFromCurrentDate: dateDiff.daysFromCurrentDate,
      errorCode: dateDiff.errorCode,
      errorMessage: dateDiff.errorMessage,
      rawProjectedStock: null,
      projectedAvailableStock: null,
      projectedDepletionDeficit: 0,
      evaluatedThreshold: minimumThreshold,
      estimatedQtyNeeded: null,
      needBasis: 'UNAVAILABLE',
      statusLabel: dateDiff.errorCode === 'PAST_DATE' ? 'Past Date' : 'Invalid Date',
      headlineMessage: dateDiff.errorMessage || 'Target date is invalid.',
      detailMessage: 'Forecast skipped for this date until a valid future date is selected.',
    };
  }

  const daysAhead = dateDiff.daysFromCurrentDate;
  const rawProjected = roundTo(currentStock + dailyTrend * daysAhead, 2);
  const projectedAvailable = Math.max(0, roundTo(rawProjected, 1));
  const depletionDeficit = rawProjected < 0 ? roundTo(Math.abs(rawProjected), 1) : 0;

  const hasMinThreshold = minimumThreshold !== null && Number.isFinite(minimumThreshold) && minimumThreshold >= 0;
  const effectiveFloor = hasMinThreshold ? minimumThreshold! : 0;

  // Avoid floating-point edge case (e.g., 20 - 8.0000001 ceiling to 13)
  const rawShortfall = Number((effectiveFloor - rawProjected).toFixed(4));
  const estimatedQtyNeeded = rawShortfall > 0 ? Math.ceil(rawShortfall) : 0;

  const dayWord = daysAhead === 1 ? 'day' : 'days';
  let needBasis: TargetDateForecastResult['needBasis'] = 'SUFFICIENT';
  let statusLabel = 'Sufficient Stock';
  let headlineMessage = '';
  let detailMessage = '';

  if (rawProjected <= 0) {
    needBasis = hasMinThreshold && effectiveFloor > 0 ? 'DEPLETED_AND_BELOW_THRESHOLD' : 'DEPLETED_BELOW_ZERO';
    statusLabel = rawProjected < 0 ? 'Projected Stockout Deficit' : 'Projected Stockout (0)';
    headlineMessage =
      estimatedQtyNeeded > 0
        ? `In ${daysAhead} ${dayWord}, projected stock reaches 0 ${unit} (estimated deficit of ${formatQty(depletionDeficit)} ${unit}). An estimated ${estimatedQtyNeeded.toLocaleString()} additional ${unit} will be needed by ${readableDate}.`
        : `In ${daysAhead} ${dayWord}, stock is projected to reach 0 ${unit} on ${readableDate}.`;
    detailMessage =
      hasMinThreshold && effectiveFloor > 0
        ? `Includes ${formatQty(depletionDeficit)} ${unit} to cover expected depletion plus ${formatQty(effectiveFloor)} ${unit} to restore the minimum threshold.`
        : 'No minimum stock threshold is configured; replenishment estimate covers depletion back to 0 units.';
  } else if (estimatedQtyNeeded > 0) {
    needBasis = 'BELOW_MINIMUM_THRESHOLD';
    statusLabel = 'Below Minimum Level';
    headlineMessage = `In ${daysAhead} ${dayWord}, approximately ${formatQty(projectedAvailable)} ${unit} are expected to remain, and an estimated ${estimatedQtyNeeded.toLocaleString()} additional ${unit} will be needed by ${readableDate}.`;
    detailMessage = `Projected level falls ${formatQty(rawShortfall)} ${unit} below the ${formatQty(effectiveFloor)} ${unit} minimum threshold.`;
  } else {
    needBasis = 'SUFFICIENT';
    statusLabel = 'Adequate Coverage';
    headlineMessage = `In ${daysAhead} ${dayWord}, approximately ${formatQty(projectedAvailable)} ${unit} are expected to remain by ${readableDate}.`;
    detailMessage = hasMinThreshold
      ? `Projected available stock stays above the ${formatQty(effectiveFloor)} ${unit} minimum level (0 additional units needed).`
      : 'Projected stock remains above 0 (no minimum threshold configured).';
  }

  return {
    targetDateIso,
    formattedDate: readableDate,
    valid: true,
    daysFromCurrentDate: daysAhead,
    rawProjectedStock: rawProjected,
    projectedAvailableStock: projectedAvailable,
    projectedDepletionDeficit: depletionDeficit,
    evaluatedThreshold: hasMinThreshold ? effectiveFloor : null,
    estimatedQtyNeeded,
    needBasis,
    statusLabel,
    headlineMessage,
    detailMessage,
  };
}

export interface BuildLinearForecastParams {
  item: StockItem | null | undefined;
  itemMovementLogs: MovementLogEntry[];
  historyDays: number;
  targetDates: string[];
  currentDateIso?: string;
  windowAnchor?: ForecastWindowAnchor;
  /** Pass undefined to fall back to item.ReorderLevel, null to explicitly evaluate without a threshold, or >= 0 for a custom floor. */
  customMinThreshold?: number | null;
}

/**
 * Pure forecast computation using SQLite-sourced item record and movement logs.
 * Never mutates historical records and cleanly flags insufficient or missing data.
 */
export function buildItemLinearRegressionForecast(
  params: BuildLinearForecastParams
): ItemLinearForecastReport {
  const currentDateIso =
    params.currentDateIso && isValidIsoDate(params.currentDateIso)
      ? params.currentDateIso.trim()
      : formatLocalDateIso(new Date());

  const windowAnchor: ForecastWindowAnchor = params.windowAnchor || 'today';
  const rawHistoryDays = Number(params.historyDays);
  const isHistoryDaysValid =
    Number.isInteger(rawHistoryDays) && rawHistoryDays >= 2 && rawHistoryDays <= 3650;
  const safeHistoryDays = isHistoryDaysValid ? rawHistoryDays : 30;

  const item = params.item;
  const warnings: string[] = [];

  if (!item) {
    return {
      isReliable: false,
      status: 'ITEM_NOT_FOUND',
      statusTitle: 'Item Not Found',
      statusExplanation: 'Select a valid inventory item from the SQLite master stock list to run a forecast.',
      estimateDisclaimer: ESTIMATE_DISCLAIMER,
      warnings: [],
      assumptions: {
        itemId: '',
        itemName: 'None selected',
        unit: 'Units',
        currentDateIso,
        currentStock: 0,
        historyDays: safeHistoryDays,
        windowAnchor,
        windowStartDateIso: addDaysToIsoDate(currentDateIso, -(safeHistoryDays - 1)),
        windowEndDateIso: currentDateIso,
        minimumThreshold: null,
        thresholdSource: 'MISSING',
        dailyTrend: null,
        rSquared: null,
        movementEventsInWindow: 0,
        activeDaysInWindow: 0,
        totalInboundUnits: 0,
        totalOutboundUnits: 0,
        netMovementUnits: 0,
        totalLogsAllTime: 0,
        latestLogDateIso: null,
        earliestLogDateIso: null,
      },
      regression: null,
      targetForecasts: [],
      chartSeries: [],
    };
  }

  const unit = item.Unit || 'Units';
  const currentStock = Number.isFinite(Number(item.Qty)) ? Math.max(0, Number(item.Qty)) : 0;

  // Resolve minimum stock / reorder threshold
  let minimumThreshold: number | null = null;
  let thresholdSource: ForecastAssumptions['thresholdSource'] = 'MISSING';

  if (params.customMinThreshold !== undefined && params.customMinThreshold !== null) {
    if (!Number.isFinite(params.customMinThreshold) || params.customMinThreshold < 0) {
      warnings.push('Custom minimum stock threshold must be 0 or greater; ignored invalid threshold value.');
    } else {
      minimumThreshold = Number(params.customMinThreshold);
      thresholdSource = 'USER_DEFINED';
    }
  } else if (params.customMinThreshold === undefined) {
    const rawReorder = item.ReorderLevel;
    if (rawReorder !== undefined && rawReorder !== null && Number.isFinite(Number(rawReorder)) && Number(rawReorder) >= 0) {
      minimumThreshold = Number(rawReorder);
      thresholdSource = 'ITEM_REORDER_LEVEL';
    }
  }

  if (thresholdSource === 'MISSING') {
    warnings.push(
      'No minimum or reorder threshold is configured for this item. Need estimates are evaluated against 0 units (stockout prevention only).'
    );
  }

  // Filter valid logs for this item without modifying original records
  const itemLogs = (Array.isArray(params.itemMovementLogs) ? params.itemMovementLogs : [])
    .filter((l) => l && l.ItemID === item.ItemID)
    .map((l) => {
      const dateIso = extractLogDateIso(l.Timestamp);
      const signedQty = extractSignedMovementQty(l);
      return dateIso && signedQty !== 0 ? { log: l, dateIso, signedQty } : null;
    })
    .filter((entry): entry is { log: MovementLogEntry; dateIso: string; signedQty: number } => entry !== null)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const totalLogsAllTime = itemLogs.length;
  const earliestLogDateIso = totalLogsAllTime > 0 ? itemLogs[0].dateIso : null;
  const latestLogDateIso = totalLogsAllTime > 0 ? itemLogs[totalLogsAllTime - 1].dateIso : null;

  const windowEndDateIso =
    windowAnchor === 'latest_activity' && latestLogDateIso ? latestLogDateIso : currentDateIso;
  const windowStartDateIso = addDaysToIsoDate(windowEndDateIso, -(safeHistoryDays - 1));

  if (!isHistoryDaysValid) {
    return {
      isReliable: false,
      status: 'INVALID_INPUT',
      statusTitle: 'Invalid History Window',
      statusExplanation: 'Please specify a whole number of history days between 2 and 3,650.',
      estimateDisclaimer: ESTIMATE_DISCLAIMER,
      warnings,
      assumptions: {
        itemId: item.ItemID,
        itemName: item.ItemName,
        unit,
        currentDateIso,
        currentStock,
        historyDays: rawHistoryDays,
        windowAnchor,
        windowStartDateIso,
        windowEndDateIso,
        minimumThreshold,
        thresholdSource,
        dailyTrend: null,
        rSquared: null,
        movementEventsInWindow: 0,
        activeDaysInWindow: 0,
        totalInboundUnits: 0,
        totalOutboundUnits: 0,
        netMovementUnits: 0,
        totalLogsAllTime,
        latestLogDateIso,
        earliestLogDateIso,
      },
      regression: null,
      targetForecasts: [],
      chartSeries: [],
    };
  }

  // Aggregate movements per day within [windowStartDateIso, windowEndDateIso]
  const dailyNetDelta = new Map<string, number>();
  let movementEventsInWindow = 0;
  let totalInboundUnits = 0;
  let totalOutboundUnits = 0;
  let netMovementAfterWindowEnd = 0;

  for (const entry of itemLogs) {
    if (entry.dateIso > windowEndDateIso && entry.dateIso <= currentDateIso) {
      netMovementAfterWindowEnd += entry.signedQty;
      continue;
    }
    if (entry.dateIso >= windowStartDateIso && entry.dateIso <= windowEndDateIso) {
      movementEventsInWindow += 1;
      if (entry.signedQty > 0) totalInboundUnits += entry.signedQty;
      else totalOutboundUnits += Math.abs(entry.signedQty);
      dailyNetDelta.set(entry.dateIso, (dailyNetDelta.get(entry.dateIso) || 0) + entry.signedQty);
    }
  }

  const activeDaysInWindow = dailyNetDelta.size;
  const netMovementUnits = totalInboundUnits - totalOutboundUnits;

  const baseAssumptions: ForecastAssumptions = {
    itemId: item.ItemID,
    itemName: item.ItemName,
    unit,
    currentDateIso,
    currentStock,
    historyDays: safeHistoryDays,
    windowAnchor,
    windowStartDateIso,
    windowEndDateIso,
    minimumThreshold,
    thresholdSource,
    dailyTrend: null,
    rSquared: null,
    movementEventsInWindow,
    activeDaysInWindow,
    totalInboundUnits,
    totalOutboundUnits,
    netMovementUnits,
    totalLogsAllTime,
    latestLogDateIso,
    earliestLogDateIso,
  };

  if (movementEventsInWindow === 0) {
    const historyHint =
      totalLogsAllTime > 0 && latestLogDateIso
        ? ` SQLite contains ${totalLogsAllTime} older record${totalLogsAllTime === 1 ? '' : 's'} ending ${formatReadableIsoDate(latestLogDateIso)}. Expand the history window or switch the window anchor to Latest Recorded Movement.`
        : ' No stock movement records exist in SQLite for this item yet.';

    return {
      isReliable: false,
      status: 'NO_MOVEMENT',
      statusTitle: 'No Stock Movement in Selected Window',
      statusExplanation: `Cannot calculate a reliable forecast because ${item.ItemName} (${item.ItemID}) has 0 recorded movements between ${formatReadableIsoDate(windowStartDateIso)} and ${formatReadableIsoDate(windowEndDateIso)}.${historyHint}`,
      estimateDisclaimer: ESTIMATE_DISCLAIMER,
      warnings,
      assumptions: baseAssumptions,
      regression: null,
      targetForecasts: [],
      chartSeries: [],
    };
  }

  if (movementEventsInWindow < 2) {
    return {
      isReliable: false,
      status: 'INSUFFICIENT_HISTORY',
      statusTitle: 'Insufficient Movement History',
      statusExplanation: `Only 1 movement event was found for ${item.ItemName} (${item.ItemID}) during the ${safeHistoryDays}-day window (${formatReadableIsoDate(windowStartDateIso)} to ${formatReadableIsoDate(windowEndDateIso)}). At least 2 movement events are required before linear regression can estimate a reliable daily trend.`,
      estimateDisclaimer: ESTIMATE_DISCLAIMER,
      warnings,
      assumptions: baseAssumptions,
      regression: null,
      targetForecasts: [],
      chartSeries: [],
    };
  }

  // Reconstruct end-of-day stock levels backwards from current stock
  const windowDates: string[] = [];
  for (let i = 0; i < safeHistoryDays; i++) {
    windowDates.push(addDaysToIsoDate(windowStartDateIso, i));
  }

  const endOfWindowStock = currentStock - netMovementAfterWindowEnd;
  const reconstructedStock = new Array<number>(safeHistoryDays);
  reconstructedStock[safeHistoryDays - 1] = endOfWindowStock;

  for (let i = safeHistoryDays - 2; i >= 0; i--) {
    const nextDayDelta = dailyNetDelta.get(windowDates[i + 1]) || 0;
    reconstructedStock[i] = reconstructedStock[i + 1] - nextDayDelta;
  }

  const regressionPoints = reconstructedStock.map((qty, idx) => ({ x: idx, y: qty }));
  const regression = computeLinearRegression(regressionPoints);

  if (!regression) {
    return {
      isReliable: false,
      status: 'INSUFFICIENT_HISTORY',
      statusTitle: 'Unable to Fit Regression Line',
      statusExplanation: 'Not enough distinct daily stock observations exist in the selected history window to fit a linear regression line.',
      estimateDisclaimer: ESTIMATE_DISCLAIMER,
      warnings,
      assumptions: baseAssumptions,
      regression: null,
      targetForecasts: [],
      chartSeries: [],
    };
  }

  const dailyTrend = roundTo(regression.slope, 4);
  const isFlatTrend = Math.abs(dailyTrend) < 0.0005;

  if (isFlatTrend) {
    warnings.push(
      'Net daily stock trend over the selected window is approximately 0 units/day (inbound deliveries offset outbound issues). Projected stock stays close to current stock.'
    );
  }

  if (currentStock === 0 && dailyTrend <= 0) {
    warnings.push('Current on-hand stock is already 0 units and historical trend is non-positive.');
  }

  const uniqueTargetDates = Array.from(
    new Set((Array.isArray(params.targetDates) ? params.targetDates : []).map((d) => (d || '').trim()).filter(Boolean))
  );
  const targetForecasts = uniqueTargetDates.map((targetDateIso) =>
    evaluateTargetDateProjection({
      currentDateIso,
      targetDateIso,
      currentStock,
      dailyTrend: regression.slope,
      minimumThreshold,
      unit,
    })
  );

  // Build chart series: historical window + projection out to max valid target date (min 14 days)
  const validDaysAhead = targetForecasts
    .filter((f) => f.valid && f.daysFromCurrentDate !== null)
    .map((f) => f.daysFromCurrentDate!);
  const maxHorizonDays = Math.min(365, Math.max(14, ...(validDaysAhead.length > 0 ? validDaysAhead : [14])));
  const targetDateSet = new Set(targetForecasts.filter((f) => f.valid).map((f) => f.targetDateIso));

  const chartSeries: ForecastSeriesPoint[] = windowDates.map((dateIso, idx) => ({
    dateIso,
    label: formatReadableIsoDate(dateIso).replace(/,\s+\d{4}$/, ''),
    dayIndex: idx,
    isForecast: false,
    historicalStock: roundTo(reconstructedStock[idx], 1),
    regressionTrend: roundTo(regression.intercept + regression.slope * idx, 1),
    projectedStock: null,
    netDailyMovement: roundTo(dailyNetDelta.get(dateIso) || 0, 1),
    minimumThreshold,
  }));

  // Anchor day 0 of future projection to currentDateIso / currentStock
  const stepDays = maxHorizonDays > 60 ? Math.ceil(maxHorizonDays / 30) : 1;
  const futureDaysToPlot = new Set<number>();
  for (let d = 1; d <= maxHorizonDays; d += stepDays) {
    futureDaysToPlot.add(d);
  }
  for (const td of validDaysAhead) {
    if (td <= 365) futureDaysToPlot.add(td);
  }
  const sortedFutureDays = Array.from(futureDaysToPlot).sort((a, b) => a - b);

  // Connect last historical point smoothly or add currentDate anchor if window ended earlier
  if (windowEndDateIso === currentDateIso && chartSeries.length > 0) {
    chartSeries[chartSeries.length - 1].projectedStock = currentStock;
  } else {
    chartSeries.push({
      dateIso: currentDateIso,
      label: formatReadableIsoDate(currentDateIso).replace(/,\s+\d{4}$/, ''),
      dayIndex: safeHistoryDays - 1,
      isForecast: false,
      historicalStock: currentStock,
      regressionTrend: currentStock,
      projectedStock: currentStock,
      netDailyMovement: 0,
      minimumThreshold,
    });
  }

  for (const daysAhead of sortedFutureDays) {
    const fDateIso = addDaysToIsoDate(currentDateIso, daysAhead);
    const projected = Math.max(0, roundTo(currentStock + regression.slope * daysAhead, 1));
    chartSeries.push({
      dateIso: fDateIso,
      label: formatReadableIsoDate(fDateIso).replace(/,\s+\d{4}$/, ''),
      dayIndex: safeHistoryDays - 1 + daysAhead,
      isForecast: true,
      isTargetDate: targetDateSet.has(fDateIso),
      historicalStock: null,
      regressionTrend: projected,
      projectedStock: projected,
      netDailyMovement: null,
      minimumThreshold,
    });
  }

  return {
    isReliable: true,
    status: isFlatTrend ? 'FLAT_TREND' : 'RELIABLE',
    statusTitle: isFlatTrend ? 'Flat Linear Trend (0.00 units/day)' : 'Linear Regression Forecast Ready',
    statusExplanation: isFlatTrend
      ? `Based on ${movementEventsInWindow} movement events across ${activeDaysInWindow} day${activeDaysInWindow === 1 ? '' : 's'}, net stock change balances near 0 units/day.`
      : `Estimated daily stock trend of ${dailyTrend > 0 ? '+' : ''}${roundTo(dailyTrend, 2)} ${unit}/day computed via OLS linear regression across ${safeHistoryDays} days (${movementEventsInWindow} movement events).`,
    estimateDisclaimer: ESTIMATE_DISCLAIMER,
    warnings,
    assumptions: {
      ...baseAssumptions,
      dailyTrend,
      rSquared: roundTo(regression.rSquared, 3),
    },
    regression,
    targetForecasts,
    chartSeries,
  };
}
