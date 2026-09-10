import { StockItem, ItemCategory } from '../types';
import { analyzeSearchQuery, stemWord } from './stemmer';

export type StockStatusFilter = 'All' | 'low_stock' | 'out_of_stock' | 'optimal' | 'critical';

export interface MultiFacetFilterOptions {
  category?: 'All' | ItemCategory;
  stockStatus?: StockStatusFilter;
  skuRangeFrom?: string;
  skuRangeTo?: string;
}

export interface SearchTokenResult {
  item: StockItem;
  score: number;
  matchedTokens: string[];
}

/**
 * Normalizes strings by converting to lowercase, removing extra punctuation,
 * and stripping hyphens/underscores for flexible code matching.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

export function stripCodeSeparators(text: string): string {
  return text.toLowerCase().replace(/[-_\s]/g, '');
}

/**
 * Generates an acronym or initials for a multi-word item name.
 * e.g., "First Aid Medical Kit" -> "famk" & "fk"
 */
export function getAcronyms(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= 1) return [];

  const fullAcronym = words.map((w) => w[0]).join('');
  return [fullAcronym];
}

/**
 * Checks if a search token sequentially matches characters in a target text.
 * e.g., token "clnspr" matches "Cleaner Spray"
 */
export function matchesFuzzySequence(token: string, target: string): boolean {
  if (!token || !target) return false;
  let tokenIdx = 0;
  for (let i = 0; i < target.length && tokenIdx < token.length; i++) {
    if (target[i] === token[tokenIdx]) {
      tokenIdx++;
    }
  }
  return tokenIdx === token.length;
}

/**
 * Extracts numeric code from SKU if applicable (e.g., "ST-005" -> 5, "CLN-020" -> 20)
 */
export function parseSkuNumber(sku: string): number | null {
  const match = sku.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Checks if an item's SKU falls within an alphanumeric or numeric range
 */
export function isSkuInRange(sku: string, rangeFrom?: string, rangeTo?: string): boolean {
  if (!rangeFrom && !rangeTo) return true;

  const normalizedSku = sku.toUpperCase().trim();
  const from = rangeFrom ? rangeFrom.toUpperCase().trim() : '';
  const to = rangeTo ? rangeTo.toUpperCase().trim() : '';

  // 1. Try pure prefix / numeric comparison if matching patterns (e.g. ST-001 to ST-020)
  const skuNum = parseSkuNumber(normalizedSku);
  const fromNum = from ? parseSkuNumber(from) : null;
  const toNum = to ? parseSkuNumber(to) : null;

  // If both from & to have prefixes like ST- or CLN- and match current SKU prefix
  const skuPrefix = normalizedSku.replace(/\d+.*$/, '');
  const fromPrefix = from ? from.replace(/\d+.*$/, '') : skuPrefix;
  const toPrefix = to ? to.replace(/\d+.*$/, '') : skuPrefix;

  if (
    skuNum !== null &&
    (fromNum !== null || !from) &&
    (toNum !== null || !to) &&
    (!from || skuPrefix === fromPrefix || !fromPrefix) &&
    (!to || skuPrefix === toPrefix || !toPrefix)
  ) {
    if (fromNum !== null && skuNum < fromNum) return false;
    if (toNum !== null && skuNum > toNum) return false;
    return true;
  }

  // 2. Fallback to standard lexicographical string comparison
  if (from && normalizedSku < from) return false;
  if (to && normalizedSku > to) return false;

  return true;
}

/**
 * Parses inline query facet tokens like:
 * "cat:cleaning", "status:low", "sku:st-001..st-020", "from:st-001", "to:st-050"
 */
export function parseInlineFacets(query: string): {
  cleanQuery: string;
  category?: ItemCategory;
  stockStatus?: StockStatusFilter;
  skuFrom?: string;
  skuTo?: string;
} {
  let cleanQuery = query;
  let category: ItemCategory | undefined;
  let stockStatus: StockStatusFilter | undefined;
  let skuFrom: string | undefined;
  let skuTo: string | undefined;

  // 1. category facet: cat:stationery or category:cleaning
  const catMatch = cleanQuery.match(/\b(?:cat|category):([a-zA-Z]+)\b/i);
  if (catMatch) {
    const raw = catMatch[1].toLowerCase();
    if (raw.startsWith('stat')) category = 'Stationery';
    else if (raw.startsWith('clean')) category = 'Cleaning';
    else if (raw.startsWith('gen')) category = 'General';
    cleanQuery = cleanQuery.replace(catMatch[0], ' ');
  }

  // 2. status facet: status:low or status:out or status:optimal
  const statusMatch = cleanQuery.match(/\b(?:status|state):([a-zA-Z_-]+)\b/i);
  if (statusMatch) {
    const raw = statusMatch[1].toLowerCase().replace(/[-_]/g, '');
    if (raw.includes('low') || raw.includes('reorder')) stockStatus = 'low_stock';
    else if (raw.includes('out') || raw.includes('zero') || raw.includes('oos')) stockStatus = 'out_of_stock';
    else if (raw.includes('opt') || raw.includes('good') || raw.includes('ok')) stockStatus = 'optimal';
    else if (raw.includes('crit')) stockStatus = 'critical';
    cleanQuery = cleanQuery.replace(statusMatch[0], ' ');
  }

  // 3. sku range facet: sku:st-001..st-020 or range:st-001..st-020
  const rangeMatch = cleanQuery.match(/\b(?:sku|range):([a-zA-Z0-9_-]+)\.\.([a-zA-Z0-9_-]+)\b/i);
  if (rangeMatch) {
    skuFrom = rangeMatch[1];
    skuTo = rangeMatch[2];
    cleanQuery = cleanQuery.replace(rangeMatch[0], ' ');
  }

  // 4. separate from: and to:
  const fromMatch = cleanQuery.match(/\bfrom:([a-zA-Z0-9_-]+)\b/i);
  if (fromMatch) {
    skuFrom = fromMatch[1];
    cleanQuery = cleanQuery.replace(fromMatch[0], ' ');
  }
  const toMatch = cleanQuery.match(/\bto:([a-zA-Z0-9_-]+)\b/i);
  if (toMatch) {
    skuTo = toMatch[1];
    cleanQuery = cleanQuery.replace(toMatch[0], ' ');
  }

  return {
    cleanQuery: cleanQuery.trim(),
    category,
    stockStatus,
    skuFrom,
    skuTo,
  };
}

/**
 * Dynamic Multi-token Fuzzy & Substring Indexing Search Engine for Stock Items
 * with Multi-Faceted Filtering (Category, SKU Range, Stock Status simultaneously)
 */
export function searchStockItems(
  items: StockItem[],
  query: string,
  categoryFilterOrFacets: 'All' | ItemCategory | MultiFacetFilterOptions = 'All',
  facetsArg?: MultiFacetFilterOptions
): StockItem[] {
  if (!items || items.length === 0) return [];

  // Parse options
  const facets: MultiFacetFilterOptions =
    typeof categoryFilterOrFacets === 'object'
      ? { ...categoryFilterOrFacets }
      : {
          category: categoryFilterOrFacets,
          ...(facetsArg || {}),
        };

  // Check inline facets inside the query string as well
  const parsed = parseInlineFacets(query);
  const effectiveQuery = parsed.cleanQuery;
  const effectiveCategory = parsed.category || facets.category || 'All';
  const effectiveStatus = parsed.stockStatus || facets.stockStatus || 'All';
  const effectiveSkuFrom = parsed.skuFrom || facets.skuRangeFrom;
  const effectiveSkuTo = parsed.skuTo || facets.skuRangeTo;

  // 1. Filter by Category
  let candidates = items;
  if (effectiveCategory !== 'All') {
    candidates = candidates.filter((item) => item.Category === effectiveCategory);
  }

  // 2. Filter by Stock Status
  if (effectiveStatus !== 'All') {
    candidates = candidates.filter((item) => {
      const qty = Number(item.Qty) || 0;
      const reorder = Number(item.ReorderLevel) || 10;
      const isOutOfStock = qty <= 0;
      const isCritical = qty > 0 && qty <= Math.ceil(reorder * 0.5);
      const isLowStock = qty > 0 && qty <= reorder;
      const isOptimal = qty > reorder;

      switch (effectiveStatus) {
        case 'out_of_stock':
          return isOutOfStock;
        case 'critical':
          return isCritical;
        case 'low_stock':
          return isLowStock || isOutOfStock;
        case 'optimal':
          return isOptimal;
        default:
          return true;
      }
    });
  }

  // 3. Filter by SKU Range
  if (effectiveSkuFrom || effectiveSkuTo) {
    candidates = candidates.filter((item) => isSkuInRange(item.ItemID, effectiveSkuFrom, effectiveSkuTo));
  }

  // If effective search query is empty, return facet-filtered items
  const trimmedQuery = effectiveQuery.trim();
  if (!trimmedQuery) {
    return candidates;
  }

  // -------------------------------------------------------------------------
  // c. EXACT MATCH PRIORITIZATION (FAST-PATH PRE-QUERY CHECK)
  // -------------------------------------------------------------------------
  // If the query matches an exact unique identifier (SKU), immediately return it
  const cleanId = trimmedQuery.toUpperCase();
  const cleanNorm = cleanId.replace(/[\s\-_]/g, '');
  const exactItem = candidates.find((item) => {
    const itemIdUpper = item.ItemID.toUpperCase();
    const itemIdNorm = itemIdUpper.replace(/[\s\-_]/g, '');
    return itemIdUpper === cleanId || itemIdNorm === cleanNorm;
  });
  if (exactItem) {
    return [exactItem];
  }

  // -------------------------------------------------------------------------
  // a. TOKENIZATION AND WORD STEMMING
  // -------------------------------------------------------------------------
  const { tokens, stemmedTokens } = analyzeSearchQuery(trimmedQuery);
  const rawQueryLower = trimmedQuery.toLowerCase();
  const rawQueryNoSep = stripCodeSeparators(trimmedQuery);

  const scoredItems: SearchTokenResult[] = [];

  for (const item of candidates) {
    const rawId = item.ItemID.toLowerCase();
    const idNoSep = stripCodeSeparators(item.ItemID);
    const rawName = item.ItemName.toLowerCase();
    const rawCat = item.Category.toLowerCase();
    const rawUnit = item.Unit.toLowerCase();
    const rawDesc = (item.Description || '').toLowerCase();
    const rawSupp = (item.LastSupplier || '').toLowerCase();

    const qty = Number(item.Qty) || 0;
    const reorder = Number(item.ReorderLevel) || 10;
    const isOutOfStock = qty <= 0;
    const isCritical = qty > 0 && qty <= Math.ceil(reorder * 0.5);
    const isLowStock = qty > 0 && qty <= reorder;
    const isOptimal = qty > reorder;
    const acronyms = getAcronyms(item.ItemName);

    const statusText = isOutOfStock
      ? 'out of stock zero depleted empty oos'
      : isLowStock
      ? 'low stock reorder alert critical warning'
      : 'in stock available optimal adequate healthy sufficient';

    const fullTextIndex = `${rawId} ${idNoSep} ${rawName} ${rawCat} ${rawUnit} ${rawDesc} ${rawSupp} ${statusText} ${acronyms.join(' ')}`;

    let score = 0;
    let allTokensMatch = true;
    const matchedTokens: string[] = [];

    // -----------------------------------------------------------------------
    // b. FIELD WEIGHTING & RELEVANCE SCORING
    // Tier 1 (Highest Priority): SKU and Product Name
    // -----------------------------------------------------------------------
    if (rawId === rawQueryLower || idNoSep === rawQueryNoSep) {
      score += 500;
      matchedTokens.push('Exact ItemID Match');
    } else if (rawId.startsWith(rawQueryLower) || idNoSep.startsWith(rawQueryNoSep)) {
      score += 250;
      matchedTokens.push('ItemID Prefix Match');
    } else if (rawName.startsWith(rawQueryLower)) {
      score += 200;
      matchedTokens.push('ItemName Prefix Match');
    } else if (rawName === rawQueryLower) {
      score += 350;
      matchedTokens.push('Exact ItemName Match');
    }

    // Token-by-token evaluation with stemming and tiered weights
    for (const token of tokens) {
      const tokenNoSep = stripCodeSeparators(token);
      const stem = stemWord(token);

      // Range check inside token e.g. "st-001..st-020"
      if (token.includes('..')) {
        const [tFrom, tTo] = token.split('..');
        if (isSkuInRange(item.ItemID, tFrom, tTo)) {
          score += 80;
          matchedTokens.push(`Range match: ${token}`);
          continue;
        } else {
          allTokensMatch = false;
          break;
        }
      }

      // Tier 1 (Highest Priority): SKU / ItemID
      if (rawId.includes(token) || idNoSep.includes(tokenNoSep)) {
        score += 220;
        matchedTokens.push(`SKU match: ${token}`);
      } else if (stem && stem !== token && rawId.includes(stem)) {
        score += 140;
        matchedTokens.push(`SKU stem match: ${stem}`);
      }
      // Tier 1 (Highest Priority): Product Name
      else if (rawName.includes(token)) {
        score += 170;
        matchedTokens.push(`Name match: ${token}`);
      } else if (stem && stem !== token && rawName.includes(stem)) {
        score += 110;
        matchedTokens.push(`Name stem match: ${stem}`);
      }
      // Tier 2: Category
      else if (rawCat.includes(token)) {
        score += 40;
        matchedTokens.push(`Category match: ${token}`);
      } else if (rawUnit.includes(token)) {
        score += 25;
        matchedTokens.push(`Unit match: ${token}`);
      } else if (acronyms.some((ac) => ac.includes(token))) {
        score += 45;
        matchedTokens.push(`Acronym match: ${token}`);
      }
      // Tier 3 (Lower Priority): Product Description (Matches here strictly outranked by SKU & Name)
      else if (rawDesc && rawDesc.includes(token)) {
        score += 15; // Strictly lower priority than SKU and Name
        matchedTokens.push(`Description match: ${token}`);
      } else if (rawDesc && stem && stem !== token && rawDesc.includes(stem)) {
        score += 8;
        matchedTokens.push(`Description stem match: ${stem}`);
      }
      // Tier 3: Supplier
      else if (rawSupp && rawSupp.includes(token)) {
        score += 20;
        matchedTokens.push(`Supplier match: ${token}`);
      }
      // Status shortcuts
      else if (token === 'low' || token === 'reorder') {
        if (isLowStock || isOutOfStock) {
          score += 45;
          matchedTokens.push('Low Stock Alert');
        } else {
          allTokensMatch = false;
          break;
        }
      } else if (token === 'critical') {
        if (isCritical || isOutOfStock) {
          score += 50;
          matchedTokens.push('Critical Stock Match');
        } else {
          allTokensMatch = false;
          break;
        }
      } else if (token === 'out' || token === 'oos' || token === 'zero' || token === 'depleted') {
        if (isOutOfStock) {
          score += 55;
          matchedTokens.push('Out of Stock Alert');
        } else {
          allTokensMatch = false;
          break;
        }
      } else if (token === 'optimal' || token === 'sufficient' || token === 'adequate') {
        if (isOptimal) {
          score += 35;
          matchedTokens.push('Optimal Stock Match');
        } else {
          allTokensMatch = false;
          break;
        }
      } else if (matchesFuzzySequence(tokenNoSep, stripCodeSeparators(fullTextIndex))) {
        score += 15;
        matchedTokens.push(`Fuzzy match: ${token}`);
      } else {
        allTokensMatch = false;
        break;
      }
    }

    if (allTokensMatch && score > 0) {
      scoredItems.push({
        item,
        score,
        matchedTokens,
      });
    }
  }

  // Sort by score descending (highest relevance first)
  scoredItems.sort((a, b) => b.score - a.score || a.item.ItemID.localeCompare(b.item.ItemID));

  return scoredItems.map((s) => s.item);
}

/**
 * Returns clean terms to highlight in the UI based on user search query
 */
export function getSearchHighlightTerms(query: string): string[] {
  if (!query) return [];
  const parsed = parseInlineFacets(query);
  const { highlightTerms } = analyzeSearchQuery(parsed.cleanQuery);
  return highlightTerms;
}

/**
 * Returns dynamic suggested search tags based on search context
 */
export const POPULAR_SEARCH_TAGS = [
  { label: 'Out of Stock 🚨', query: 'status:out', category: 'All' },
  { label: 'Low Stock Alert ⚠️', query: 'status:low', category: 'All' },
  { label: 'ST-001..ST-020', query: 'sku:ST-001..ST-020', category: 'Stationery' },
  { label: 'CLN-001..CLN-020', query: 'sku:CLN-001..CLN-020', category: 'Cleaning' },
  { label: 'Paper & A4', query: 'Paper A4', category: 'Stationery' },
  { label: 'Cleaners & Sprays', query: 'Cleaner Spray', category: 'Cleaning' },
  { label: 'Optimal Stock 🟢', query: 'status:optimal', category: 'All' },
] as const;

