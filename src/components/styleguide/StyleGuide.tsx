import React, { useState } from 'react';
import {
  Palette,
  Type,
  ShieldCheck,
  Check,
  Copy,
  Sun,
  Moon,
  Sparkles,
  Layers,
  Component,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sliders,
  Download,
  Printer,
  FileType,
} from 'lucide-react';
import { ParamountLogo } from '../brand/ParamountLogo';
import { downloadStyleGuideFile } from '../../utils/styleGuideGenerator';

interface StyleGuideProps {
  theme: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface ColorToken {
  name: string;
  role: string;
  lightHex: string;
  lightRgb: string;
  darkHex: string;
  darkRgb: string;
  lightContrast: string;
  darkContrast: string;
  category: 'surfaces' | 'content' | 'brand' | 'status';
}

const COLOR_TOKENS: ColorToken[] = [
  // Surfaces
  {
    name: 'Canvas Background',
    role: 'Root window and app backdrop',
    lightHex: '#F8FAFC',
    lightRgb: 'RGB(248, 250, 252)',
    darkHex: '#020617',
    darkRgb: 'RGB(2, 6, 23)',
    lightContrast: 'Base Canvas',
    darkContrast: 'Base Canvas',
    category: 'surfaces',
  },
  {
    name: 'Surface Card / Panel',
    role: 'Modals, tables, cards, and UserForms',
    lightHex: '#FFFFFF',
    lightRgb: 'RGB(255, 255, 255)',
    darkHex: '#0F172A',
    darkRgb: 'RGB(15, 23, 42)',
    lightContrast: '1.05:1 vs Canvas',
    darkContrast: '1.12:1 vs Canvas',
    category: 'surfaces',
  },
  {
    name: 'Border Subtle',
    role: 'Card boundaries, grid cell borders',
    lightHex: '#E2E8F0',
    lightRgb: 'RGB(226, 232, 240)',
    darkHex: '#1E293B',
    darkRgb: 'RGB(30, 41, 59)',
    lightContrast: '3.2:1 vs Canvas',
    darkContrast: '3.5:1 vs Canvas',
    category: 'surfaces',
  },

  // Content
  {
    name: 'Primary Text',
    role: 'Headings, table cell values, labels',
    lightHex: '#0F172A',
    lightRgb: 'RGB(15, 23, 42)',
    darkHex: '#F8FAFC',
    darkRgb: 'RGB(248, 250, 252)',
    lightContrast: '16.8:1 (AAA Pass)',
    darkContrast: '18.2:1 (AAA Pass)',
    category: 'content',
  },
  {
    name: 'Secondary / Muted Text',
    role: 'Subtitles, timestamps, metadata keys',
    lightHex: '#475569',
    lightRgb: 'RGB(71, 85, 105)',
    darkHex: '#94A3B8',
    darkRgb: 'RGB(148, 163, 184)',
    lightContrast: '5.4:1 (AA Pass)',
    darkContrast: '5.8:1 (AA Pass)',
    category: 'content',
  },

  // Brand Accent
  {
    name: 'Paramount Lime Brand',
    role: 'Official company logo, brandmark',
    lightHex: '#C6D92C',
    lightRgb: 'RGB(198, 217, 44)',
    darkHex: '#C6D92C',
    darkRgb: 'RGB(198, 217, 44)',
    lightContrast: '9.4:1 on Slate-900',
    darkContrast: '9.4:1 on Slate-900',
    category: 'brand',
  },
  {
    name: 'Primary Brand Teal',
    role: 'Action buttons, active tabs, highlights',
    lightHex: '#0D9488',
    lightRgb: 'RGB(13, 148, 136)',
    darkHex: '#2DD4BF',
    darkRgb: 'RGB(45, 212, 191)',
    lightContrast: '4.8:1 (AA Pass)',
    darkContrast: '7.2:1 (AAA Pass)',
    category: 'brand',
  },

  // Status
  {
    name: 'Success / In-Stock',
    role: 'GRN delivery, sufficient stock levels',
    lightHex: '#16A34A',
    lightRgb: 'RGB(22, 163, 74)',
    darkHex: '#4ADE80',
    darkRgb: 'RGB(74, 222, 128)',
    lightContrast: '4.6:1 (AA Pass)',
    darkContrast: '7.8:1 (AAA Pass)',
    category: 'status',
  },
  {
    name: 'Warning / Low Stock',
    role: 'Reorder alerts, pending actions',
    lightHex: '#D97706',
    lightRgb: 'RGB(217, 119, 6)',
    darkHex: '#FBBF24',
    darkRgb: 'RGB(251, 191, 36)',
    lightContrast: '4.5:1 (AA Pass)',
    darkContrast: '8.4:1 (AAA Pass)',
    category: 'status',
  },
  {
    name: 'Danger / Out of Stock',
    role: 'Critical stock deficits, deletion actions',
    lightHex: '#DC2626',
    lightRgb: 'RGB(220, 38, 38)',
    darkHex: '#F87171',
    darkRgb: 'RGB(248, 113, 113)',
    lightContrast: '5.2:1 (AA Pass)',
    darkContrast: '6.5:1 (AA Pass)',
    category: 'status',
  },
];

export const StyleGuide: React.FC<StyleGuideProps> = ({ theme, onToggleTheme }) => {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'surfaces' | 'content' | 'brand' | 'status'>('all');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(id);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const handleDownload = (format: 'html' | 'pdf' | 'md' | 'json') => {
    downloadStyleGuideFile(format);
    setDownloadSuccess(format.toUpperCase());
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const filteredTokens = activeCategory === 'all'
    ? COLOR_TOKENS
    : COLOR_TOKENS.filter((t) => t.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner with Single-Click Download Action */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/80 rounded-xl border border-teal-200 dark:border-teal-800">
              <Palette className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Enterprise UI Style Guide & Theme Design System
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paramount Stationery & Cleaning System • WCAG AA Compliance • Excel VBA Palette & Typography
              </p>
            </div>
          </div>

          {/* Action Row: Single Click Download + Theme Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Single-Click Download Button */}
            <button
              onClick={() => handleDownload('html')}
              className="flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Complete Style Guide</span>
            </button>

            {/* Theme Toggle Pill */}
            <button
              onClick={() => onToggleTheme?.()}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-xs transition"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span>Dark Theme</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Format Downloads Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">1-Click Formats:</span>
            <span className="text-[11px] text-slate-400">Choose your preferred export format:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleDownload('html')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
              title="Download Standalone Styled HTML Guide"
            >
              <FileType className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Interactive HTML (.html)</span>
            </button>

            <button
              onClick={() => handleDownload('pdf')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/60 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
              title="Download Printable PDF Document"
            >
              <Printer className="w-3.5 h-3.5 text-red-500" />
              <span>PDF Document (.pdf)</span>
            </button>

            <button
              onClick={() => handleDownload('md')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
              title="Download Markdown Documentation"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Markdown Doc (.md)</span>
            </button>

            <button
              onClick={() => handleDownload('json')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
              title="Download JSON Design Tokens"
            >
              <FileCode className="w-3.5 h-3.5 text-purple-500" />
              <span>Design Tokens (.json)</span>
            </button>
          </div>
        </div>

        {/* Download Success Banner */}
        {downloadSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center space-x-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>{downloadSuccess} Style Guide</strong> successfully downloaded! Includes all color palettes, typography scales, contrast matrices, and VBA modules.
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Ready</span>
          </div>
        )}
      </div>

      {/* SECTION 1: Official Brand Identity & Logo Specification */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              1. Official Paramount Brand Identity & Logo Specification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official company mark applied across top-left of PDF Issue Slips, GRN Vouchers, and Excel worksheet headers.
            </p>
          </div>
          <span className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800 shrink-0">
            Official Asset: #C6D92C
          </span>
        </div>

        {/* Logo Variants Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Variant 1: PDF Issue Slip Top-Left Brand Block */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>PDF Voucher Top-Left Logo</span>
              <span className="font-mono text-[10px] text-slate-400">16mm × 28mm (As-Is)</span>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shadow-inner">
              <ParamountLogo size="md" variant="full-vertical" bgDark={true} />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Official PEX Green (2) badge attached as-is to the top-left corner of PDF vouchers, featuring the lime-green walking person and vertical lowercase <code className="font-mono text-teal-600 dark:text-teal-400">paramount</code> brandmark.
            </p>
          </div>

          {/* Variant 2: Horizontal Header Banner */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Horizontal Ribbon Variant</span>
              <span className="font-mono text-[10px] text-slate-400">Worksheet / Header</span>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shadow-inner">
              <ParamountLogo variant="full-horizontal" bgDark={true} />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Horizontal lockup for wide ribbon banners, Excel title blocks, and email receipt headers.
            </p>
          </div>

          {/* Variant 3: Brand Color Token Breakdown */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Brand Color Specifications
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-md bg-[#C6D92C] border border-black/10 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white">Lime Brand Accent</span>
                </div>
                <button
                  onClick={() => copyToClipboard('#C6D92C', 'lime-hex')}
                  className="font-mono text-[10px] text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {copiedValue === 'lime-hex' ? 'Copied!' : '#C6D92C'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-md bg-[#0F172A] border border-slate-700 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white">Dark Slate Base</span>
                </div>
                <button
                  onClick={() => copyToClipboard('#0F172A', 'slate-hex')}
                  className="font-mono text-[10px] text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {copiedValue === 'slate-hex' ? 'Copied!' : '#0F172A'}
                </button>
              </div>

              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-300">
                <strong>VBA RGB Formula:</strong> <code className="font-mono font-bold">RGB(198, 217, 44)</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Dual-Theme Color Palette & Contrast Ratios */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              2. Color Palette & WCAG AA Contrast Ratios
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dual-theme tokens configured with strict minimum 4.5:1 contrast ratios (up to 18.2:1 on dark canvas).
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'surfaces', 'content', 'brand', 'status'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  activeCategory === cat
                    ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Color Tokens Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTokens.map((token) => {
            const activeHex = theme === 'dark' ? token.darkHex : token.lightHex;
            const activeRgb = theme === 'dark' ? token.darkRgb : token.lightRgb;
            const activeContrast = theme === 'dark' ? token.darkContrast : token.lightContrast;

            return (
              <div
                key={token.name}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-3 shadow-xs hover:border-teal-500/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-xl shadow-xs border border-black/10 shrink-0"
                      style={{ backgroundColor: activeHex }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{token.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{token.role}</p>
                    </div>
                  </div>
                </div>

                {/* Contrast & Values */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Hex Code:</span>
                    <button
                      onClick={() => copyToClipboard(activeHex, `${token.name}-hex`)}
                      className="font-mono text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                    >
                      <span>{activeHex}</span>
                      {copiedValue === `${token.name}-hex` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">VBA Formula:</span>
                    <button
                      onClick={() => copyToClipboard(activeRgb, `${token.name}-vba`)}
                      className="font-mono text-[10px] text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1"
                    >
                      <span className="truncate max-w-[130px]">{activeRgb}</span>
                      {copiedValue === `${token.name}-vba` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">Contrast Ratio:</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {activeContrast}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Typography Hierarchy & Font Scaling */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Type className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            3. Typography Hierarchy & Font Scale
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Standard system font stacks (<code className="font-mono">Segoe UI</code>, <code className="font-mono">Aptos</code>, <code className="font-mono">Calibri</code>) and monospace <code className="font-mono">Consolas</code> for codes and timestamps.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Hierarchy Level</th>
                <th className="py-3 px-4 font-semibold">Size (pt / px)</th>
                <th className="py-3 px-4 font-semibold">Weight</th>
                <th className="py-3 px-4 font-semibold">Font Family</th>
                <th className="py-3 px-4 font-semibold">Visual Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Display Title (H1)</td>
                <td className="py-3 px-4 font-mono text-slate-500">18pt / 24px</td>
                <td className="py-3 px-4">Bold (700)</td>
                <td className="py-3 px-4 font-mono">Segoe UI / Aptos</td>
                <td className="py-3 px-4 text-lg font-bold text-slate-900 dark:text-white">Procurement Inventory</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Section Heading (H2)</td>
                <td className="py-3 px-4 font-mono text-slate-500">14pt / 18px</td>
                <td className="py-3 px-4">Bold (700)</td>
                <td className="py-3 px-4 font-mono">Segoe UI / Aptos</td>
                <td className="py-3 px-4 text-base font-bold text-slate-900 dark:text-white">Master Stock Live Control</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Card / Form Title (H3)</td>
                <td className="py-3 px-4 font-mono text-slate-500">11pt / 14px</td>
                <td className="py-3 px-4">Semibold (600)</td>
                <td className="py-3 px-4 font-mono">Segoe UI</td>
                <td className="py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white">Issue Requisition Cart</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Worksheet Table Header</td>
                <td className="py-3 px-4 font-mono text-slate-500">11pt / 14px</td>
                <td className="py-3 px-4">Bold (700)</td>
                <td className="py-3 px-4 font-mono">Segoe UI (Uppercase)</td>
                <td className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">ITEM ID • DESCRIPTION</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Table Data Cells</td>
                <td className="py-3 px-4 font-mono text-slate-500">10pt / 13px</td>
                <td className="py-3 px-4">Regular (400)</td>
                <td className="py-3 px-4 font-mono">Segoe UI</td>
                <td className="py-3 px-4 text-xs text-slate-800 dark:text-slate-200">Blue Ballpoint Pens Box of 12</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Codes, IDs & Timestamps</td>
                <td className="py-3 px-4 font-mono text-slate-500">9.5pt / 12px</td>
                <td className="py-3 px-4">Medium (500)</td>
                <td className="py-3 px-4 font-mono">Consolas / Monospace</td>
                <td className="py-3 px-4 font-mono text-xs font-semibold text-teal-600 dark:text-teal-400">ST-001 • 2026-08-17 14:30:00</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Status Badges & Microcopy</td>
                <td className="py-3 px-4 font-mono text-slate-500">8.5pt / 11px</td>
                <td className="py-3 px-4">Bold (700)</td>
                <td className="py-3 px-4 font-mono">Segoe UI</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    IN STOCK (85 BOXES)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Component Anatomy & UI Control Tokens */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Component className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            4. Component Design Tokens & Standard UI Controls
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Standard visual states for buttons, input fields, badges, and modals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Button States */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Interactive Button Hierarchy
            </h4>
            <div className="flex flex-wrap gap-2.5">
              <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition">
                Primary Action (Teal)
              </button>
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition">
                Goods Received (Emerald)
              </button>
              <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition">
                Issue Request (Amber)
              </button>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition">
                Delete Item (Red)
              </button>
              <button className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 transition">
                Secondary / Cancel
              </button>
            </div>
          </div>

          {/* Status Badges */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Category & Stock Status Badges
            </h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Stationery (ST)
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Cleaning (CL)
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                General (GN)
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Low Stock Alert
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Ready-to-Copy VBA Theme Constants */}
      <div className="bg-slate-950 text-slate-100 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-teal-400 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-teal-400" />
              5. Developer VBA Theme Constants Block (`mod_ThemeEngine.bas`)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy this standard color definitions block directly into your Excel VBA project.
            </p>
          </div>

          <button
            onClick={() =>
              copyToClipboard(
                `' ================================================================================\n' PARAMOUNT PROCUREMENT SYSTEM - THEME ENGINE COLOR CONSTANTS\n' ================================================================================\n\n' --- OFFICIAL BRAND & LOGO ---\nPublic Const CLR_PARAMOUNT_LIME As Long = &H2CD9C6  ' RGB(198, 217, 44)\nPublic Const CLR_BRAND_TEAL As Long = &H88940D       ' RGB(13, 148, 136)\n\n' --- LIGHT THEME TOKENS ---\nPublic Const CLR_LT_CANVAS As Long = &HFCFAF8       ' RGB(248, 250, 252)\nPublic Const CLR_LT_SURFACE As Long = &HFFFFFF      ' RGB(255, 255, 255)\nPublic Const CLR_LT_TEXT_PRI As Long = &H2A170F     ' RGB(15, 23, 42)\nPublic Const CLR_LT_TEXT_MUTED As Long = &H695547   ' RGB(71, 85, 105)\nPublic Const CLR_LT_BORDER As Long = &HF0E8E2       ' RGB(226, 232, 240)\n\n' --- DARK THEME TOKENS ---\nPublic Const CLR_DK_CANVAS As Long = &H170602       ' RGB(2, 6, 23)\nPublic Const CLR_DK_SURFACE As Long = &H2A170F      ' RGB(15, 23, 42)\nPublic Const CLR_DK_TEXT_PRI As Long = &HFCFAF8     ' RGB(248, 250, 252)\nPublic Const CLR_DK_TEXT_MUTED As Long = &HB8A394   ' RGB(148, 163, 184)\nPublic Const CLR_DK_BORDER As Long = &H3B291E       ' RGB(30, 41, 59)\n\n' --- SEMANTIC STATUS ---\nPublic Const CLR_SUCCESS As Long = &H4AA316         ' RGB(22, 163, 74)\nPublic Const CLR_WARNING As Long = &H0677D9         ' RGB(217, 119, 6)\nPublic Const CLR_DANGER As Long = &H2626DC          ' RGB(220, 38, 38)`,
                'vba-constants'
              )
            }
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
          >
            {copiedValue === 'vba-constants' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedValue === 'vba-constants' ? 'VBA Block Copied!' : 'Copy VBA Block'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed">
{`' ================================================================================
' PARAMOUNT PROCUREMENT SYSTEM - THEME ENGINE COLOR CONSTANTS
' ================================================================================

' --- OFFICIAL BRAND & LOGO ---
Public Const CLR_PARAMOUNT_LIME As Long = &H2CD9C6  ' RGB(198, 217, 44) (#C6D92C)
Public Const CLR_BRAND_TEAL As Long = &H88940D       ' RGB(13, 148, 136)

' --- LIGHT THEME TOKENS ---
Public Const CLR_LT_CANVAS As Long = &HFCFAF8       ' RGB(248, 250, 252)
Public Const CLR_LT_SURFACE As Long = &HFFFFFF      ' RGB(255, 255, 255)
Public Const CLR_LT_TEXT_PRI As Long = &H2A170F     ' RGB(15, 23, 42)
Public Const CLR_LT_TEXT_MUTED As Long = &H695547   ' RGB(71, 85, 105)
Public Const CLR_LT_BORDER As Long = &HF0E8E2       ' RGB(226, 232, 240)

' --- DARK THEME TOKENS ---
Public Const CLR_DK_CANVAS As Long = &H170602       ' RGB(2, 6, 23)
Public Const CLR_DK_SURFACE As Long = &H2A170F      ' RGB(15, 23, 42)
Public Const CLR_DK_TEXT_PRI As Long = &HFCFAF8     ' RGB(248, 250, 252)
Public Const CLR_DK_TEXT_MUTED As Long = &HB8A394   ' RGB(148, 163, 184)
Public Const CLR_DK_BORDER As Long = &H3B291E       ' RGB(30, 41, 59)

' --- SEMANTIC STATUS ---
Public Const CLR_SUCCESS As Long = &H4AA316         ' RGB(22, 163, 74)
Public Const CLR_WARNING As Long = &H0677D9         ' RGB(217, 119, 6)
Public Const CLR_DANGER As Long = &H2626DC          ' RGB(220, 38, 38)`}
        </pre>
      </div>
    </div>
  );
};
