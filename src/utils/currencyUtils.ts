import { CurrencyCode, StockItem, MovementLogEntry } from '../types';

export const DEFAULT_USD_TO_ZWG_RATE = 26.5; // Official / benchmark exchange rate: 1 USD = 26.50 ZWG

const STORAGE_KEY_EXCHANGE_RATE = 'paramount_exchange_rate_usd_zwg';
const STORAGE_KEY_ACTIVE_CURRENCY = 'paramount_dashboard_currency';

export type DashboardCurrencyMode = 'USD' | 'ZWG' | 'DUAL';

/**
 * Retrieves the current benchmark exchange rate (1 USD to ZWG)
 */
export function getExchangeRate(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EXCHANGE_RATE);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_USD_TO_ZWG_RATE;
}

/**
 * Updates the benchmark exchange rate
 */
export function setExchangeRate(rate: number): void {
  if (rate > 0) {
    try {
      localStorage.setItem(STORAGE_KEY_EXCHANGE_RATE, rate.toString());
    } catch {
      // ignore
    }
  }
}

/**
 * Retrieves user's preferred dashboard currency view ('USD' | 'ZWG' | 'DUAL')
 */
export function getDashboardCurrencyMode(): DashboardCurrencyMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_CURRENCY) as DashboardCurrencyMode;
    if (saved === 'USD' || saved === 'ZWG' || saved === 'DUAL') return saved;
  } catch {
    // ignore
  }
  return 'DUAL';
}

/**
 * Sets user's preferred dashboard currency view
 */
export function setDashboardCurrencyMode(mode: DashboardCurrencyMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_CURRENCY, mode);
  } catch {
    // ignore
  }
}

/**
 * Converts an amount from one currency to another using the exchange rate
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode = 'USD',
  to: CurrencyCode = 'USD',
  rate: number = getExchangeRate()
): number {
  if (isNaN(amount) || amount === 0) return 0;
  if (from === to) return amount;

  if (from === 'USD' && to === 'ZWG') {
    return amount * rate;
  }
  if (from === 'ZWG' && to === 'USD') {
    return rate > 0 ? amount / rate : 0;
  }
  return amount;
}

/**
 * Normalizes an amount from its source currency into the specified base currency (USD or ZWG).
 * Essential for consistent financial reporting and predictive analytics across multi-currency catalogs.
 */
export function normalizeToBaseCurrency(
  amount: number,
  fromCurrency: CurrencyCode = 'USD',
  baseCurrency: CurrencyCode = 'USD',
  rate: number = getExchangeRate()
): number {
  if (isNaN(amount) || amount === 0) return 0;
  if (fromCurrency === baseCurrency) return amount;
  return convertCurrency(amount, fromCurrency, baseCurrency, rate);
}

export interface NormalizedPricing {
  unitPrice: number;
  originalCurrency: CurrencyCode;
  baseCurrency: CurrencyCode;
  normalizedUnitPrice: number;
  totalValue: number;
  normalizedTotalValue: number;
  exchangeRate: number;
}

/**
 * Calculates normalized price and total line value normalized to a base currency
 */
export function normalizePriceAndValue(
  unitPrice: number = 0,
  qty: number = 0,
  currency: CurrencyCode = 'USD',
  baseCurrency: CurrencyCode = 'USD',
  rate: number = getExchangeRate()
): NormalizedPricing {
  const safePrice = Number(unitPrice) > 0 ? Number(unitPrice) : 0;
  const safeQty = Number(qty) || 0;
  const originalTotal = safePrice * safeQty;
  const normalizedUnit = normalizeToBaseCurrency(safePrice, currency, baseCurrency, rate);
  const normalizedTotal = normalizeToBaseCurrency(originalTotal, currency, baseCurrency, rate);

  return {
    unitPrice: safePrice,
    originalCurrency: currency,
    baseCurrency,
    normalizedUnitPrice: Math.round(normalizedUnit * 10000) / 10000,
    totalValue: Math.round(originalTotal * 100) / 100,
    normalizedTotalValue: Math.round(normalizedTotal * 100) / 100,
    exchangeRate: rate,
  };
}

/**
 * Normalizes a stock item's unit price and holding value to the specified base currency
 */
export function normalizeStockItem(
  item: StockItem,
  baseCurrency: CurrencyCode = 'USD',
  rate: number = getExchangeRate()
): StockItem & { normalizedUnitPrice: number; normalizedTotalValue: number } {
  const rawPrice = Number(item.UnitPrice) || 0;
  const curr: CurrencyCode = item.Currency || 'USD';
  const qty = Number(item.Qty) || 0;
  const pricing = normalizePriceAndValue(rawPrice, qty, curr, baseCurrency, rate);

  return {
    ...item,
    UnitPrice: rawPrice > 0 ? rawPrice : undefined,
    Currency: curr,
    BaseCurrency: baseCurrency,
    NormalizedUnitPrice: pricing.normalizedUnitPrice,
    TotalValue: pricing.totalValue,
    NormalizedTotalValue: pricing.normalizedTotalValue,
    normalizedUnitPrice: pricing.normalizedUnitPrice,
    normalizedTotalValue: pricing.normalizedTotalValue,
  };
}

/**
 * Normalizes an inventory movement entry (delivery, issue, or adjustment) to the base currency
 */
export function normalizeMovementEntry(
  entry: MovementLogEntry,
  baseCurrency: CurrencyCode = 'USD',
  rate: number = getExchangeRate()
): MovementLogEntry & { normalizedUnitPrice: number; normalizedTotalValue: number } {
  const rawPrice = Number(entry.UnitPrice) || 0;
  const curr: CurrencyCode = entry.Currency || 'USD';
  const qty = Math.abs(Number(entry.Qty) || 0);
  const pricing = normalizePriceAndValue(rawPrice, qty, curr, baseCurrency, rate);

  return {
    ...entry,
    UnitPrice: rawPrice > 0 ? rawPrice : undefined,
    Currency: curr,
    BaseCurrency: baseCurrency,
    NormalizedUnitPrice: pricing.normalizedUnitPrice,
    TotalValue: pricing.totalValue,
    NormalizedTotalValue: pricing.normalizedTotalValue,
    normalizedUnitPrice: pricing.normalizedUnitPrice,
    normalizedTotalValue: pricing.normalizedTotalValue,
  };
}

/**
 * Formats a currency amount nicely
 * e.g. formatCurrency(12.5, 'USD') -> "$12.50 USD"
 * e.g. formatCurrency(331.25, 'ZWG') -> "ZiG 331.25 ZWG"
 */
export function formatCurrency(
  amount?: number | null,
  currency: CurrencyCode = 'USD',
  options: { showCode?: boolean; decimals?: number } = {}
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return currency === 'USD' ? '$0.00' : 'ZiG 0.00';
  }

  const decimals = options.decimals !== undefined ? options.decimals : 2;
  const formattedNum = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const symbol = currency === 'USD' ? '$' : 'ZiG ';
  const code = options.showCode ? ` ${currency}` : '';

  return `${symbol}${formattedNum}${code}`;
}

/**
 * Formats an amount with its dual currency equivalent
 * e.g. "$10.00 USD (ZiG 265.00)" or "ZiG 265.00 ZWG ($10.00)"
 */
export function formatDualCurrency(
  amount?: number | null,
  baseCurrency: CurrencyCode = 'USD',
  rate: number = getExchangeRate()
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return baseCurrency === 'USD' ? '$0.00 USD (ZiG 0.00)' : 'ZiG 0.00 ZWG ($0.00)';
  }

  const otherCurrency: CurrencyCode = baseCurrency === 'USD' ? 'ZWG' : 'USD';
  const converted = convertCurrency(amount, baseCurrency, otherCurrency, rate);

  const main = formatCurrency(amount, baseCurrency, { showCode: true });
  const equiv = formatCurrency(converted, otherCurrency, { showCode: false });

  return `${main} (${equiv})`;
}

export interface CollationSummary {
  totalUsdValuation: number; // all items converted to USD
  totalZwgValuation: number; // all items converted to ZWG
  rawUsdSpend: number;       // items natively priced in USD
  rawZwgSpend: number;       // items natively priced in ZWG
  usdItemCount: number;
  zwgItemCount: number;
  unpricedItemCount: number;
  totalItems: number;
}

/**
 * Collates a financial portfolio across Zimbabwe's dual currency items
 */
export function collateDualCurrencyValuation(
  items: { Qty?: number; addQty?: number; UnitPrice?: number; unitPrice?: number; Currency?: CurrencyCode; currency?: CurrencyCode }[],
  rate: number = getExchangeRate()
): CollationSummary {
  let totalUsdValuation = 0;
  let totalZwgValuation = 0;
  let rawUsdSpend = 0;
  let rawZwgSpend = 0;
  let usdItemCount = 0;
  let zwgItemCount = 0;
  let unpricedItemCount = 0;

  items.forEach((item) => {
    const qty = Number(item.Qty ?? item.addQty ?? 0) || 0;
    const price = Number(item.UnitPrice ?? item.unitPrice ?? 0);
    const curr: CurrencyCode = item.Currency || item.currency || 'USD';

    if (!price || price <= 0 || qty <= 0) {
      unpricedItemCount++;
      return;
    }

    const lineTotal = qty * price;

    if (curr === 'USD') {
      rawUsdSpend += lineTotal;
      totalUsdValuation += lineTotal;
      totalZwgValuation += lineTotal * rate;
      usdItemCount++;
    } else {
      rawZwgSpend += lineTotal;
      totalZwgValuation += lineTotal;
      totalUsdValuation += rate > 0 ? lineTotal / rate : 0;
      zwgItemCount++;
    }
  });

  return {
    totalUsdValuation: Math.round(totalUsdValuation * 100) / 100,
    totalZwgValuation: Math.round(totalZwgValuation * 100) / 100,
    rawUsdSpend: Math.round(rawUsdSpend * 100) / 100,
    rawZwgSpend: Math.round(rawZwgSpend * 100) / 100,
    usdItemCount,
    zwgItemCount,
    unpricedItemCount,
    totalItems: items.length,
  };
}

export interface NormalizedPortfolioSummary {
  baseCurrency: CurrencyCode;
  totalNormalizedValuation: number;
  totalUsdValuation: number;
  totalZwgValuation: number;
  rawUsdTotal: number;
  rawZwgTotal: number;
  usdItemsCount: number;
  zwgItemsCount: number;
  unpricedItemsCount: number;
  totalItemsCount: number;
  exchangeRate: number;
}

/**
 * Calculates a normalized inventory portfolio normalized directly to the requested baseCurrency (USD or ZWG)
 */
export function calculateNormalizedPortfolio(
  items: { Qty?: number; addQty?: number; UnitPrice?: number; unitPrice?: number; Currency?: CurrencyCode; currency?: CurrencyCode }[],
  baseCurrency: CurrencyCode = 'USD',
  rate: number = getExchangeRate()
): NormalizedPortfolioSummary {
  const collation = collateDualCurrencyValuation(items, rate);
  const totalNormalizedValuation =
    baseCurrency === 'USD' ? collation.totalUsdValuation : collation.totalZwgValuation;

  return {
    baseCurrency,
    totalNormalizedValuation,
    totalUsdValuation: collation.totalUsdValuation,
    totalZwgValuation: collation.totalZwgValuation,
    rawUsdTotal: collation.rawUsdSpend,
    rawZwgTotal: collation.rawZwgSpend,
    usdItemsCount: collation.usdItemCount,
    zwgItemsCount: collation.zwgItemCount,
    unpricedItemsCount: collation.unpricedItemCount,
    totalItemsCount: collation.totalItems,
    exchangeRate: rate,
  };
}
