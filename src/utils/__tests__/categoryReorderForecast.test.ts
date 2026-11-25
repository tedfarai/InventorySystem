import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StockItem, MovementLogEntry } from '../../types';
import { buildCategoryMovementPatterns } from '../categoryReorderForecast';

function makeStockItem(overrides: Partial<StockItem> = {}): StockItem {
  return {
    ItemID: 'ST-001',
    ItemName: 'A4 Bond Paper Ream (80gsm)',
    Category: 'Stationery',
    Qty: 120,
    ReorderLevel: 30,
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

describe('buildCategoryMovementPatterns', () => {
  it('groups items by category, computes burn rate, peak weekday, and lead-time optimal reorder dates without mutating inputs', () => {
    const referenceDateIso = '2026-11-24';
    const stockItems: StockItem[] = [
      makeStockItem({ ItemID: 'ST-001', ItemName: 'A4 Bond Paper', Category: 'Stationery', Qty: 100, ReorderLevel: 20 }),
      makeStockItem({ ItemID: 'CL-001', ItemName: 'Industrial Detergent', Category: 'Cleaning', Qty: 10, ReorderLevel: 15 }),
      makeStockItem({ ItemID: 'GN-001', ItemName: 'Packing Tape', Category: 'General', Qty: 60, ReorderLevel: 10 }),
    ];

    // 2026-11-23 and 2026-11-16 are Mondays (UTC day 1)
    const movementLogs: MovementLogEntry[] = [
      makeLog({ Timestamp: '2026-11-02 10:00:00', Type: 'ISSUE', ItemID: 'ST-001', Qty: 4 }),
      makeLog({ Timestamp: '2026-11-09 10:00:00', Type: 'ISSUE', ItemID: 'ST-001', Qty: 6 }),
      makeLog({ Timestamp: '2026-11-16 10:00:00', Type: 'ISSUE', ItemID: 'ST-001', Qty: 20 }),
      makeLog({ Timestamp: '2026-11-23 10:00:00', Type: 'ISSUE', ItemID: 'ST-001', Qty: 30 }),
      makeLog({ Timestamp: '2026-11-20 14:00:00', Type: 'DELIVERY', ItemID: 'ST-001', Qty: 40 }),
      makeLog({ Timestamp: '2026-11-18 11:00:00', Type: 'ISSUE', ItemID: 'CL-001', Qty: 6 }),
      makeLog({ Timestamp: '2026-11-21 11:00:00', Type: 'ISSUE', ItemID: 'CL-001', Qty: 4 }),
    ];

    const stockSnapshot = JSON.stringify(stockItems);
    const logSnapshot = JSON.stringify(movementLogs);

    const result = buildCategoryMovementPatterns(stockItems, movementLogs, {
      analysisWindowDays: 30,
      leadTimeDays: 5,
      safetyBufferDays: 4,
      referenceDateIso,
    });

    assert.equal(JSON.stringify(stockItems), stockSnapshot);
    assert.equal(JSON.stringify(movementLogs), logSnapshot);
    assert.equal(result.referenceDateIso, '2026-11-24');
    assert.equal(result.categories.length, 3);

    const stationery = result.categories.find((c) => c.category === 'Stationery')!;
    assert.ok(stationery);
    assert.equal(stationery.totalIssuedUnits, 60);
    assert.equal(stationery.totalReceivedUnits, 40);
    assert.equal(stationery.issueTransactionCount, 4);
    assert.equal(stationery.deliveryCount, 1);
    assert.equal(stationery.hasSufficientHistory, true);
    assert.equal(stationery.peakWeekday, 'Monday');
    assert.equal(stationery.peakSingleDayIssue, 30);
    assert.equal(stationery.velocityMomentum, 'Accelerating');
    assert.ok(stationery.avgDailyBurnRate > 0);
    assert.ok(stationery.baselineOptimalReorderDate);
    assert.match(stationery.baselineOptimalReorderDate!, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(stationery.topPriorityItems[0].itemID, 'ST-001');

    // Cleaning item has Qty (10) <= ReorderLevel (15), so reorder date must be referenceDateIso immediately
    const cleaning = result.categories.find((c) => c.category === 'Cleaning')!;
    assert.ok(cleaning);
    assert.equal(cleaning.itemsBelowThreshold, 1);
    assert.equal(cleaning.estimatedDaysUntilReorder, 0);
    assert.equal(cleaning.baselineOptimalReorderDate, referenceDateIso);
    assert.equal(cleaning.hasSufficientHistory, true);

    // General has zero movements -> Dormant and insufficient history
    const general = result.categories.find((c) => c.category === 'General')!;
    assert.ok(general);
    assert.equal(general.velocityMomentum, 'Dormant');
    assert.equal(general.hasSufficientHistory, false);
    assert.equal(general.baselineOptimalReorderDate, null);
  });

  it('detects cooling velocity when prior half exceeds recent half and handles empty logs safely', () => {
    const referenceDateIso = '2026-11-24';
    const stockItems: StockItem[] = [
      makeStockItem({ ItemID: 'ST-010', ItemName: 'Blue Ballpoint Pens', Category: 'Stationery', Qty: 200, ReorderLevel: 20 }),
    ];
    const movementLogs: MovementLogEntry[] = [
      makeLog({ Timestamp: '2026-11-01 09:00:00', Type: 'ISSUE', ItemID: 'ST-010', Qty: 30 }),
      makeLog({ Timestamp: '2026-11-05 09:00:00', Type: 'ISSUE', ItemID: 'ST-010', Qty: 30 }),
      makeLog({ Timestamp: '2026-11-20 09:00:00', Type: 'ISSUE', ItemID: 'ST-010', Qty: 5 }),
    ];

    const coolingRes = buildCategoryMovementPatterns(stockItems, movementLogs, {
      analysisWindowDays: 30,
      leadTimeDays: 5,
      safetyBufferDays: 7,
      referenceDateIso,
    });

    const stationery = coolingRes.categories.find((c) => c.category === 'Stationery')!;
    assert.equal(stationery.velocityMomentum, 'Cooling');
    assert.ok(stationery.priorHalfDailyBurn > stationery.recentHalfDailyBurn);

    const emptyRes = buildCategoryMovementPatterns([], [], { referenceDateIso });
    assert.equal(emptyRes.categories.length, 0);
  });

  it('filters out logs outside the requested window and flags single-transaction categories as insufficient history', () => {
    const referenceDateIso = '2026-11-24';
    const stockItems: StockItem[] = [
      makeStockItem({ ItemID: 'CL-002', ItemName: 'Surface Bleach', Category: 'Cleaning', Qty: 45, ReorderLevel: 10 }),
    ];
    const movementLogs: MovementLogEntry[] = [
      // Too old for 30-day window
      makeLog({ Timestamp: '2026-08-01 09:00:00', Type: 'ISSUE', ItemID: 'CL-002', Qty: 25 }),
      // Single transaction inside window
      makeLog({ Timestamp: '2026-11-22 09:00:00', Type: 'ISSUE', ItemID: 'CL-002', Qty: 3 }),
    ];

    const res = buildCategoryMovementPatterns(stockItems, movementLogs, {
      analysisWindowDays: 30,
      referenceDateIso,
    });

    const cleaning = res.categories.find((c) => c.category === 'Cleaning')!;
    assert.equal(cleaning.totalIssuedUnits, 3);
    assert.equal(cleaning.issueTransactionCount, 1);
    assert.equal(cleaning.hasSufficientHistory, false);
  });
});
