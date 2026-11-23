import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StockItem, MovementLogEntry } from '../../types';
import {
  isValidIsoDate,
  addDaysToIsoDate,
  calculateFutureDaysFromDate,
  computeLinearRegression,
  evaluateTargetDateProjection,
  buildItemLinearRegressionForecast,
} from '../stockForecastService';

function makeItem(overrides: Partial<StockItem> = {}): StockItem {
  return {
    ItemID: 'ST-001',
    ItemName: 'A4 Bond Paper Ream (80gsm)',
    Category: 'Stationery',
    Qty: 100,
    ReorderLevel: 25,
    Unit: 'Reams',
    ...overrides,
  };
}

function makeLog(overrides: Partial<MovementLogEntry> = {}): MovementLogEntry {
  return {
    id: `LOG-${Math.random().toString(36).slice(2, 8)}`,
    Timestamp: '2026-11-10 09:00:00',
    Type: 'ISSUE',
    ItemID: 'ST-001',
    ItemName: 'A4 Bond Paper Ream (80gsm)',
    Qty: 5,
    DeptID: 'OPS',
    DeptName: 'Operations',
    DeptHead: 'Head',
    DeptEmail: 'ops@example.com',
    IssuerID: 'ADM001',
    IssuerName: 'Rachel Pickard',
    DocumentRef: 'SIV-100',
    IssueSlipFileName: 'SIV-100.pdf',
    Status: 'Completed',
    ...overrides,
  };
}

describe('Date validation and date-to-days calculations', () => {
  it('validates real Gregorian calendar dates and rejects invalid rollover dates', () => {
    assert.equal(isValidIsoDate('2026-11-23'), true);
    assert.equal(isValidIsoDate('2028-02-29'), true); // leap year
    assert.equal(isValidIsoDate('2026-02-29'), false); // non-leap year
    assert.equal(isValidIsoDate('2026-02-30'), false);
    assert.equal(isValidIsoDate('2026-13-01'), false);
    assert.equal(isValidIsoDate('23-11-2026'), false);
    assert.equal(isValidIsoDate(''), false);
  });

  it('calculates whole calendar days across month and year boundaries', () => {
    const res10 = calculateFutureDaysFromDate('2026-11-23', '2026-12-03');
    assert.equal(res10.valid, true);
    assert.equal(res10.daysFromCurrentDate, 10);

    const resNextYear = calculateFutureDaysFromDate('2026-12-20', '2027-01-04');
    assert.equal(resNextYear.valid, true);
    assert.equal(resNextYear.daysFromCurrentDate, 15);
  });

  it('rejects today, past dates, and malformed dates safely', () => {
    const past = calculateFutureDaysFromDate('2026-11-23', '2026-11-20');
    assert.equal(past.valid, false);
    assert.equal(past.errorCode, 'PAST_DATE');
    assert.equal(past.daysFromCurrentDate, -3);

    const today = calculateFutureDaysFromDate('2026-11-23', '2026-11-23');
    assert.equal(today.valid, false);
    assert.equal(today.errorCode, 'TODAY_NOT_FUTURE');
    assert.equal(today.daysFromCurrentDate, 0);

    const invalid = calculateFutureDaysFromDate('2026-11-23', '2026-02-30');
    assert.equal(invalid.valid, false);
    assert.equal(invalid.errorCode, 'INVALID_DATE');
    assert.equal(invalid.daysFromCurrentDate, null);
  });
});

describe('OLS Linear Regression computation', () => {
  it('computes exact slope, intercept, and R² for a steady downward linear series', () => {
    // y = 100 - 3x
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 97 },
      { x: 2, y: 94 },
      { x: 3, y: 91 },
      { x: 4, y: 88 },
    ];
    const reg = computeLinearRegression(points);
    assert.ok(reg);
    assert.ok(Math.abs(reg.slope - -3) < 1e-9);
    assert.ok(Math.abs(reg.intercept - 100) < 1e-9);
    assert.ok(Math.abs(reg.rSquared - 1) < 1e-9);
    assert.equal(reg.n, 5);
  });

  it('computes exact positive slope for a steadily growing series', () => {
    const points = [
      { x: 0, y: 10 },
      { x: 1, y: 12.5 },
      { x: 2, y: 15 },
      { x: 3, y: 17.5 },
    ];
    const reg = computeLinearRegression(points);
    assert.ok(reg);
    assert.ok(Math.abs(reg.slope - 2.5) < 1e-9);
    assert.ok(Math.abs(reg.rSquared - 1) < 1e-9);
  });

  it('returns null when fewer than 2 points exist or x has zero variance', () => {
    assert.equal(computeLinearRegression([]), null);
    assert.equal(computeLinearRegression([{ x: 0, y: 50 }]), null);
    assert.equal(
      computeLinearRegression([
        { x: 2, y: 10 },
        { x: 2, y: 20 },
      ]),
      null
    );
  });
});

describe('Projected stock vs. estimated quantity needed calculations', () => {
  it('reports adequate coverage and 0 needed when projected stock stays above threshold', () => {
    // Current 60, trend -2/day => in 10 days = 40 units remaining (threshold 25 => 0 needed)
    const res = evaluateTargetDateProjection({
      currentDateIso: '2026-11-23',
      targetDateIso: '2026-12-03',
      currentStock: 60,
      dailyTrend: -2,
      minimumThreshold: 25,
      unit: 'Reams',
    });

    assert.equal(res.valid, true);
    assert.equal(res.daysFromCurrentDate, 10);
    assert.equal(res.projectedAvailableStock, 40);
    assert.equal(res.projectedDepletionDeficit, 0);
    assert.equal(res.estimatedQtyNeeded, 0);
    assert.equal(res.needBasis, 'SUFFICIENT');
    assert.match(res.headlineMessage, /In 10 days, approximately 40 Reams are expected to remain/i);
  });

  it('distinguishes positive remaining stock from shortfall below minimum threshold', () => {
    // Current 28, trend -2/day => in 10 days = 8 remaining, below min threshold 20 => 12 needed
    const res = evaluateTargetDateProjection({
      currentDateIso: '2026-11-23',
      targetDateIso: '2026-12-03',
      currentStock: 28,
      dailyTrend: -2,
      minimumThreshold: 20,
      unit: 'Boxes',
    });

    assert.equal(res.valid, true);
    assert.equal(res.projectedAvailableStock, 8);
    assert.equal(res.projectedDepletionDeficit, 0);
    assert.equal(res.estimatedQtyNeeded, 12);
    assert.equal(res.needBasis, 'BELOW_MINIMUM_THRESHOLD');
    assert.match(
      res.headlineMessage,
      /In 10 days, approximately 8 Boxes are expected to remain, and an estimated 12 additional Boxes will be needed by Dec 3, 2026/i
    );
  });

  it('floors projected available stock at 0 and includes negative deficit + threshold in needed qty', () => {
    // Current 15, trend -2.5/day => in 10 days raw = -10, available = 0, deficit = 10, threshold 20 => 30 needed
    const res = evaluateTargetDateProjection({
      currentDateIso: '2026-11-23',
      targetDateIso: '2026-12-03',
      currentStock: 15,
      dailyTrend: -2.5,
      minimumThreshold: 20,
      unit: 'Reams',
    });

    assert.equal(res.valid, true);
    assert.equal(res.rawProjectedStock, -10);
    assert.equal(res.projectedAvailableStock, 0);
    assert.equal(res.projectedDepletionDeficit, 10);
    assert.equal(res.estimatedQtyNeeded, 30);
    assert.equal(res.needBasis, 'DEPLETED_AND_BELOW_THRESHOLD');
    assert.match(res.headlineMessage, /estimated 30 additional Reams will be needed/i);
  });

  it('handles missing minimum threshold by evaluating need strictly against 0 floor', () => {
    const res = evaluateTargetDateProjection({
      currentDateIso: '2026-11-23',
      targetDateIso: '2026-12-03',
      currentStock: 10,
      dailyTrend: -2,
      minimumThreshold: null,
      unit: 'Packs',
    });

    assert.equal(res.valid, true);
    assert.equal(res.rawProjectedStock, -10);
    assert.equal(res.projectedAvailableStock, 0);
    assert.equal(res.evaluatedThreshold, null);
    assert.equal(res.estimatedQtyNeeded, 10);
    assert.equal(res.needBasis, 'DEPLETED_BELOW_ZERO');
  });
});

describe('End-to-end item forecast & edge case handling', () => {
  it('computes multi-date regression forecast from historical logs without mutating inputs', () => {
    const today = '2026-11-23';
    const item = makeItem({ Qty: 50, ReorderLevel: 25 });
    // Regular outbound issues across the last 5 days
    const logs: MovementLogEntry[] = [
      makeLog({ Timestamp: `${addDaysToIsoDate(today, -4)} 10:00:00`, Type: 'ISSUE', Qty: 5 }),
      makeLog({ Timestamp: `${addDaysToIsoDate(today, -3)} 10:00:00`, Type: 'ISSUE', Qty: 5 }),
      makeLog({ Timestamp: `${addDaysToIsoDate(today, -2)} 10:00:00`, Type: 'ISSUE', Qty: 5 }),
      makeLog({ Timestamp: `${addDaysToIsoDate(today, -1)} 10:00:00`, Type: 'ISSUE', Qty: 5 }),
      makeLog({ Timestamp: `${today} 10:00:00`, Type: 'ISSUE', Qty: 5 }),
    ];
    const snapshot = JSON.stringify(logs);

    const report = buildItemLinearRegressionForecast({
      item,
      itemMovementLogs: logs,
      historyDays: 5,
      targetDates: [addDaysToIsoDate(today, 3), addDaysToIsoDate(today, 10)],
      currentDateIso: today,
    });

    // Ensure historical logs were never mutated
    assert.equal(JSON.stringify(logs), snapshot);

    assert.equal(report.isReliable, true);
    assert.equal(report.status, 'RELIABLE');
    assert.ok(report.regression);
    // Closing stock reconstructed over 5 days: [70, 65, 60, 55, 50] => exact slope = -5/day
    assert.ok(Math.abs(report.regression.slope - -5) < 1e-6);
    assert.equal(report.targetForecasts.length, 2);

    // +3 days: 50 - 15 = 35 remaining (above 25 min => 0 needed)
    assert.equal(report.targetForecasts[0].projectedAvailableStock, 35);
    assert.equal(report.targetForecasts[0].estimatedQtyNeeded, 0);

    // +10 days: 50 - 50 = 0 remaining (below 25 min => 25 needed)
    assert.equal(report.targetForecasts[1].projectedAvailableStock, 0);
    assert.equal(report.targetForecasts[1].estimatedQtyNeeded, 25);
  });

  it('flags NO_MOVEMENT and surfaces latest activity hint when logs predate selected window', () => {
    const today = '2026-11-23';
    const item = makeItem({ Qty: 80, ReorderLevel: 20 });
    const olderLogs: MovementLogEntry[] = [
      makeLog({ Timestamp: '2026-08-01 09:00:00', Type: 'ISSUE', Qty: 4 }),
      makeLog({ Timestamp: '2026-08-05 09:00:00', Type: 'ISSUE', Qty: 6 }),
    ];

    const todayAnchored = buildItemLinearRegressionForecast({
      item,
      itemMovementLogs: olderLogs,
      historyDays: 30,
      targetDates: ['2026-12-03'],
      currentDateIso: today,
      windowAnchor: 'today',
    });

    assert.equal(todayAnchored.isReliable, false);
    assert.equal(todayAnchored.status, 'NO_MOVEMENT');
    assert.equal(todayAnchored.assumptions.totalLogsAllTime, 2);
    assert.equal(todayAnchored.assumptions.latestLogDateIso, '2026-08-05');
    assert.match(todayAnchored.statusExplanation, /2 older records ending Aug 5, 2026/i);

    // Switching anchor to latest_activity allows forecasting on those older logs cleanly
    const latestAnchored = buildItemLinearRegressionForecast({
      item,
      itemMovementLogs: olderLogs,
      historyDays: 14,
      targetDates: ['2026-12-03'],
      currentDateIso: today,
      windowAnchor: 'latest_activity',
    });

    assert.equal(latestAnchored.isReliable, true);
    assert.equal(latestAnchored.assumptions.windowEndDateIso, '2026-08-05');
  });

  it('flags INSUFFICIENT_HISTORY when only 1 movement event falls in the window', () => {
    const today = '2026-11-23';
    const item = makeItem({ Qty: 40, ReorderLevel: 10 });
    const logs = [makeLog({ Timestamp: '2026-11-20 11:00:00', Type: 'ISSUE', Qty: 5 })];

    const report = buildItemLinearRegressionForecast({
      item,
      itemMovementLogs: logs,
      historyDays: 14,
      targetDates: ['2026-12-03'],
      currentDateIso: today,
    });

    assert.equal(report.isReliable, false);
    assert.equal(report.status, 'INSUFFICIENT_HISTORY');
    assert.match(report.statusExplanation, /Only 1 movement event was found/i);
  });

  it('emits warning when item reorder level is missing or negative and uses 0 floor', () => {
    const today = '2026-11-23';
    const item = makeItem({ Qty: 20, ReorderLevel: -1 });
    const logs = [
      makeLog({ Timestamp: '2026-11-21 10:00:00', Type: 'ISSUE', Qty: 5 }),
      makeLog({ Timestamp: '2026-11-22 10:00:00', Type: 'ISSUE', Qty: 5 }),
    ];

    const report = buildItemLinearRegressionForecast({
      item,
      itemMovementLogs: logs,
      historyDays: 7,
      targetDates: ['2026-12-03'],
      currentDateIso: today,
    });

    assert.equal(report.isReliable, true);
    assert.equal(report.assumptions.thresholdSource, 'MISSING');
    assert.equal(report.assumptions.minimumThreshold, null);
    assert.ok(report.warnings.some((w) => /No minimum or reorder threshold/i.test(w)));
  });

  it('handles mixed valid and invalid/past target dates without crashing', () => {
    const today = '2026-11-23';
    const item = makeItem({ Qty: 60, ReorderLevel: 15 });
    const logs = [
      makeLog({ Timestamp: '2026-11-20 10:00:00', Type: 'ISSUE', Qty: 4 }),
      makeLog({ Timestamp: '2026-11-22 10:00:00', Type: 'ISSUE', Qty: 4 }),
    ];

    const report = buildItemLinearRegressionForecast({
      item,
      itemMovementLogs: logs,
      historyDays: 7,
      targetDates: ['2026-11-01', '2026-02-30', '2026-12-03'],
      currentDateIso: today,
    });

    assert.equal(report.isReliable, true);
    assert.equal(report.targetForecasts.length, 3);
    assert.equal(report.targetForecasts[0].valid, false);
    assert.equal(report.targetForecasts[0].errorCode, 'PAST_DATE');
    assert.equal(report.targetForecasts[1].valid, false);
    assert.equal(report.targetForecasts[1].errorCode, 'INVALID_DATE');
    assert.equal(report.targetForecasts[2].valid, true);
    assert.equal(report.targetForecasts[2].daysFromCurrentDate, 10);
  });

  it('rejects invalid historyDays cleanly', () => {
    const report = buildItemLinearRegressionForecast({
      item: makeItem(),
      itemMovementLogs: [],
      historyDays: 1,
      targetDates: ['2026-12-03'],
      currentDateIso: '2026-11-23',
    });

    assert.equal(report.isReliable, false);
    assert.equal(report.status, 'INVALID_INPUT');
  });
});
