/**
 * ===============================================================================
 * PARAMOUNT EXPORTS — TOKENIZATION, WORD STEMMING & SEARCH TOKEN UTILITIES
 * ===============================================================================
 * Purpose:
 * 1. Tokenization: Breaks search input into individual words and alphanumeric symbols,
 *    handling special characters, slashes, and punctuation cleanly.
 * 2. Word Stemming: Applies algorithmic morphological suffix reduction to normalize
 *    inflections and plurals (e.g., "bolts" -> "bolt", "gloves" -> "glove", "cleaners" -> "cleaner").
 * 3. Exact Match Prioritization: Identifies unique SKU / part numbers for fast-path lookups.
 * 4. Highlighting Match Extraction: Extracts term variants for UI text highlighting.
 * ===============================================================================
 */

/**
 * Common English inflectional and derivational suffixes for inventory domain
 */
const STEM_RULES: Array<[RegExp, string]> = [
  // Pluralization and standard noun inflections
  [/ies$/i, 'y'],            // batteries -> battery, summaries -> summary
  [/ves$/i, 'f'],            // knives -> knif, shelves -> shelf (also handles gloves -> glove via s rule)
  [/sses$/i, 'ss'],          // glasses -> glass, scissors
  [/([a-z]{3,})xes$/i, '$1x'], // boxes -> box
  [/([a-z]{3,})ches$/i, '$1ch'], // pouches -> pouch
  [/([a-z]{3,})shes$/i, '$1sh'], // brushes -> brush
  [/([a-z]{3,})zes$/i, '$1z'], // nozzles -> nozzle
  [/([a-z]{3,})oes$/i, '$1o'], // zeroes -> zero
  [/([a-z]{3,})ers$/i, '$1er'], // cleaners -> cleaner, staplers -> stapler
  [/([a-z]{3,})ors$/i, '$1or'], // protectors -> protector
  [/([a-z]{3,})s$/i, '$1'],  // bolts -> bolt, gloves -> glove, towels -> towel, papers -> paper

  // Verbal and adjectival inflections
  [/([a-z]{3,})ing$/i, '$1'], // cleaning -> clean, printing -> print
  [/([a-z]{3,})ed$/i, '$1'],  // adjusted -> adjust, received -> receiv
  [/([a-z]{3,})able$/i, '$1'], // disposable -> dispos
  [/([a-z]{3,})ible$/i, '$1'], // reusable -> reus
  [/([a-z]{3,})ment$/i, '$1'], // adjustment -> adjust
  [/([a-z]{3,})tion$/i, '$1'], // protection -> protect, sanitation -> sanitat
];

/**
 * Stems a single word token to its root form.
 * Benefit: Matches plural and variant forms correctly, significantly boosting search recall.
 */
export function stemWord(word: string): string {
  if (!word || word.length <= 3) return word.toLowerCase();

  const lower = word.toLowerCase().trim();

  // Protect alphanumeric codes with hyphens or digits (e.g., ST-001, CL-101, 24/6)
  if (/\d/.test(lower) || /^[a-z]{1,3}-\d+$/i.test(lower)) {
    return lower;
  }

  for (const [rule, replacement] of STEM_RULES) {
    if (rule.test(lower)) {
      const stemmed = lower.replace(rule, replacement);
      if (stemmed.length >= 2) {
        return stemmed;
      }
    }
  }

  return lower;
}

/**
 * Tokenizes an input search string into cleaned individual tokens.
 * Handles mixed alphanumeric strings, dashes, slashes, and spaces gracefully.
 */
export function tokenizeQuery(query: string): string[] {
  if (!query) return [];

  // Remove leading/trailing spaces
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) return [];

  // Split on whitespace or commas while preserving hyphens within SKUs
  const rawTokens = cleaned.split(/[\s,;]+/).filter(Boolean);

  const tokens: string[] = [];

  for (const t of rawTokens) {
    // Strip surrounding quotes or parentheses
    const stripped = t.replace(/^["'([{]+|["')\]}]+$/g, '');
    if (stripped) {
      tokens.push(stripped);
    }
  }

  return tokens;
}

export interface TokenizedSearchQuery {
  rawQuery: string;
  normalizedQuery: string;
  isExactSkuCandidate: boolean;
  tokens: string[];
  stemmedTokens: string[];
  highlightTerms: string[];
}

/**
 * Full query analysis extracting tokens, stems, and fast-path exact candidate flags.
 */
export function analyzeSearchQuery(rawQuery: string): TokenizedSearchQuery {
  const normalizedQuery = (rawQuery || '').trim().toLowerCase();
  const tokens = tokenizeQuery(normalizedQuery);

  // Derive unique stems for each token
  const stemmedSet = new Set<string>();
  tokens.forEach((tok) => {
    const stem = stemWord(tok);
    if (stem && stem !== tok) {
      stemmedSet.add(stem);
    }
  });

  const stemmedTokens = Array.from(stemmedSet);

  // Check if query is an exact SKU / identifier candidate (Fast-Path)
  // Matches patterns like "ST-001", "CL-101", "GN-202", "ADM001", "GRN-123456", or exact SKU codes
  const isExactSkuCandidate =
    /^[A-Z]{1,4}-?\d{1,6}$/i.test(normalizedQuery) ||
    /^[A-Z]{2,5}\d{3,6}$/i.test(normalizedQuery);

  // Terms to highlight on the UI
  const highlightTerms = Array.from(
    new Set([
      ...tokens,
      ...stemmedTokens,
      // Add un-hyphenated variant for codes e.g. "st001"
      ...tokens.map((t) => t.replace(/[-_]/g, '')).filter((t) => t.length >= 2),
    ])
  ).filter((t) => t.length >= 2);

  return {
    rawQuery,
    normalizedQuery,
    isExactSkuCandidate,
    tokens,
    stemmedTokens,
    highlightTerms,
  };
}

/**
 * Escapes regex special characters for safe RegExp construction.
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
