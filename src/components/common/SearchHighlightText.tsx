import React from 'react';
import { analyzeSearchQuery, escapeRegExp } from '../../utils/stemmer';

interface SearchHighlightTextProps {
  text?: string | number | null;
  query?: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Renders text with real-time distinct visual highlighting of terms matched by the
 * tokenized and stemmed SQLite search engine.
 */
export const SearchHighlightText: React.FC<SearchHighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = '',
}) => {
  const strText = text !== undefined && text !== null ? String(text) : '';

  if (!strText || !query || !query.trim()) {
    return <span className={className}>{strText}</span>;
  }

  const { highlightTerms } = analyzeSearchQuery(query);

  if (highlightTerms.length === 0) {
    return <span className={className}>{strText}</span>;
  }

  // Sort terms by descending length to match longest phrases/tokens first
  const sortedTerms = [...highlightTerms].sort((a, b) => b.length - a.length);
  const regexPattern = `(${sortedTerms.map(escapeRegExp).join('|')})`;

  try {
    const regex = new RegExp(regexPattern, 'gi');
    const parts = strText.split(regex);

    return (
      <span className={className}>
        {parts.map((part, i) => {
          if (!part) return null;
          const isMatch = sortedTerms.some((term) => term.toLowerCase() === part.toLowerCase());

          if (isMatch) {
            return (
              <mark
                key={i}
                className={`bg-amber-200 text-slate-950 dark:bg-amber-400/35 dark:text-amber-200 font-extrabold px-1 py-0.5 rounded-xs transition-colors shadow-2xs ${highlightClassName}`}
                title={`Matched search term: "${part}"`}
              >
                {part}
              </mark>
            );
          }

          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </span>
    );
  } catch (e) {
    // If regex fails due to unusual edge cases, fallback cleanly to raw text
    return <span className={className}>{strText}</span>;
  }
};
