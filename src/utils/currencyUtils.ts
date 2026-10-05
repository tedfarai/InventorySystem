import { CurrencyCode } from '../types';

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
  if (isNaN(amount) || amount <= 0) return 0;
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
    totalUsdValuation,
    totalZwgValuation,
    rawUsdSpend,
    rawZwgSpend,
    usdItemCount,
    zwgItemCount,
    unpricedItemCount,
    totalItems: items.length,
  };
}
