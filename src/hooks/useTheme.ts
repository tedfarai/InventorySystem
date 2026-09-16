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
      textLabel: '#cbd5e1',       // slate-300
      textHeading: '#f8fafc',     // slate-50
      axisLine: '#334155',        // slate-700
      tickLine: '#334155',        // slate-700
      gridStroke: '#334155',      // slate-700
      grid: '#334155',
      axisText: '#cbd5e1',
      text: '#f8fafc',
      gridOpacity: 0.35,
      tooltipBg: '#020617',       // slate-950
      tooltipBorder: '#334155',   // slate-700
      tooltipText: '#f8fafc',     // slate-50
      pieBorder: '#0f172a',       // slate-900
      stationery: '#14b8a6',      // teal-500
      stationeryStroke: '#0d9488',
      cleaning: '#0284c7',        // sky-600
      cleaningStroke: '#0369a1',
      general: '#10b981',        // emerald-500
      generalStroke: '#059669',
      predictionLine: '#818cf8',  // indigo-400
      actualTotalLine: '#10b981', // emerald-500
      cardBg: '#0f172a',          // slate-900
      cardBorder: '#1e293b',      // slate-800
    };
  }

  // Light Mode: Calibrated for WCAG AA/AAA readability with deep, crisp hues
  return {
    isDark: false,
    textMuted: '#475569',         // slate-600 (high contrast on white)
    textLabel: '#1e293b',         // slate-800
    textHeading: '#0f172a',       // slate-900
    axisLine: '#64748b',          // slate-500 (clear anchor line)
    tickLine: '#94a3b8',          // slate-400
    gridStroke: '#cbd5e1',        // slate-300
    grid: '#cbd5e1',
    axisText: '#334155',          // slate-700
    text: '#0f172a',
    gridOpacity: 0.9,
    tooltipBg: '#ffffff',         // pure crisp white
    tooltipBorder: '#cbd5e1',     // slate-300
    tooltipText: '#0f172a',       // slate-900
    pieBorder: '#ffffff',         // clean white separator on light backgrounds
    stationery: '#0d9488',        // teal-600 (rich, deep teal)
    stationeryStroke: '#0f766e',  // teal-700
    cleaning: '#0284c7',          // sky-600 (vivid blue)
    cleaningStroke: '#0369a1',    // sky-700
    general: '#059669',          // emerald-600
    generalStroke: '#047857',    // emerald-700
    predictionLine: '#4338ca',    // indigo-700 (deep high-contrast indigo)
    actualTotalLine: '#047857',   // emerald-700 (deep readable green)
    cardBg: '#ffffff',            // white
    cardBorder: '#cbd5e1',        // slate-300
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
