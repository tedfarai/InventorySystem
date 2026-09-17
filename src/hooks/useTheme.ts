import { useState, useEffect } from 'react';

export interface ThemeChartPalette {
  isDark: boolean;
  // Text colors
  textMuted: string;
  textLabel: string;
  textHeading: string;
  // Axis & grid styling
  axisLine: string;
  tickLine: string;
  gridStroke: string;
  grid: string;
  axisText: string;
  text: string;
  gridOpacity: number;
  // Tooltip colors
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  // Chart series colors optimized for contrast
  pieBorder: string;
  stationery: string;
  stationeryStroke: string;
  cleaning: string;
  cleaningStroke: string;
  general: string;
  generalStroke: string;
  predictionLine: string;
  actualTotalLine: string;
  // Backgrounds & card fills
  cardBg: string;
  cardBorder: string;
}

export function getThemeChartPalette(isDark: boolean): ThemeChartPalette {
  if (isDark) {
    return {
      isDark: true,
      textMuted: '#cbd5e1',       // slate-300
      textLabel: '#e2e8f0',       // slate-200
      textHeading: '#f8fafc',     // slate-50
      axisLine: '#475569',        // slate-600
      tickLine: '#475569',        // slate-600
      gridStroke: '#334155',      // slate-700
      grid: '#334155',
      axisText: '#e2e8f0',        // slate-200
      text: '#f8fafc',
      gridOpacity: 0.42,
      tooltipBg: '#020617',       // slate-950
      tooltipBorder: '#475569',   // slate-600
      tooltipText: '#f8fafc',     // slate-50
      pieBorder: '#0f172a',       // slate-900
      stationery: '#14b8a6',      // teal-500
      stationeryStroke: '#0d9488',
      cleaning: '#0284c7',        // sky-600
      cleaningStroke: '#0369a1',
      general: '#10b981',         // emerald-500
      generalStroke: '#059669',
      predictionLine: '#818cf8',  // indigo-400
      actualTotalLine: '#10b981', // emerald-500
      cardBg: '#0f172a',          // slate-900
      cardBorder: '#334155',      // slate-700
    };
  }

  // Light mode: use darker text/border anchors to keep chart labels and axes readable against white surfaces.
  return {
    isDark: false,
    textMuted: '#475569',         // slate-600
    textLabel: '#0f172a',         // slate-900
    textHeading: '#020617',       // slate-950
    axisLine: '#334155',          // slate-700 - strong chart spine
    tickLine: '#475569',          // slate-600 - clear tick marks
    gridStroke: '#dfe7f1',        // slate-200 / light gray grid
    grid: '#dfe7f1',
    axisText: '#0f172a',          // slate-900 - crisp labels
    text: '#020617',
    gridOpacity: 0.9,
    tooltipBg: '#ffffff',         // white card surface
    tooltipBorder: '#94a3b8',     // slate-400 - visible border
    tooltipText: '#0f172a',       // slate-900
    pieBorder: '#f8fafc',         // soft separator on light surfaces
    stationery: '#0f766e',        // teal-700
    stationeryStroke: '#115e59',  // teal-800
    cleaning: '#0369a1',          // sky-700
    cleaningStroke: '#075985',    // sky-800
    general: '#047857',           // emerald-700
    generalStroke: '#065f46',     // emerald-800
    predictionLine: '#312e81',    // indigo-800
    actualTotalLine: '#065f46',   // emerald-800
    cardBg: '#ffffff',            // white
    cardBorder: '#dfe7f1',        // slate-200
  };
}

/**
 * Hook to dynamically track global theme (dark vs. light).
 * Subscribes to document.documentElement class mutations so it reacts
 * instantly when the user toggles the theme button.
 */
export function useTheme(): {
  theme: 'dark' | 'light';
  isDark: boolean;
  palette: ThemeChartPalette;
} {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const checkTheme = () => {
      if (typeof document === 'undefined') return;
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    checkTheme();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          checkTheme();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Also listen for storage events in case theme is synced across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'xl_procurement_theme') {
        if (e.newValue === 'dark' || e.newValue === 'light') {
          setTheme(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const isDark = theme === 'dark';
  const palette = getThemeChartPalette(isDark);

  return { theme, isDark, palette };
}
