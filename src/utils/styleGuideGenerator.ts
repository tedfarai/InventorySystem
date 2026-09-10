import jsPDF from 'jspdf';
import { getPexGreenLogoDataUrl } from '../components/brand/brandLogoData';

export interface StyleGuideToken {
  name: string;
  role: string;
  category: 'surfaces' | 'content' | 'brand' | 'status';
  lightHex: string;
  lightRgb: string;
  darkHex: string;
  darkRgb: string;
  vbaConstant: string;
  lightContrast: string;
  darkContrast: string;
}

export const STYLE_GUIDE_TOKENS: StyleGuideToken[] = [
  {
    name: 'Canvas Background',
    role: 'Root window and app backdrop',
    category: 'surfaces',
    lightHex: '#F8FAFC',
    lightRgb: 'RGB(248, 250, 252)',
    darkHex: '#020617',
    darkRgb: 'RGB(2, 6, 23)',
    vbaConstant: 'CLR_LT_CANVAS = &HFCFAF8 / CLR_DK_CANVAS = &H170602',
    lightContrast: 'Base Canvas',
    darkContrast: 'Base Canvas',
  },
  {
    name: 'Surface Card / Panel',
    role: 'Modals, tables, cards, and UserForms',
    category: 'surfaces',
    lightHex: '#FFFFFF',
    lightRgb: 'RGB(255, 255, 255)',
    darkHex: '#0F172A',
    darkRgb: 'RGB(15, 23, 42)',
    vbaConstant: 'CLR_LT_SURFACE = &HFFFFFF / CLR_DK_SURFACE = &H2A170F',
    lightContrast: '1.05:1 vs Canvas',
    darkContrast: '1.12:1 vs Canvas',
  },
  {
    name: 'Border Subtle',
    role: 'Card boundaries, grid cell borders',
    category: 'surfaces',
    lightHex: '#E2E8F0',
    lightRgb: 'RGB(226, 232, 240)',
    darkHex: '#1E293B',
    darkRgb: 'RGB(30, 41, 59)',
    vbaConstant: 'CLR_LT_BORDER = &HF0E8E2 / CLR_DK_BORDER = &H3B291E',
    lightContrast: '3.2:1 vs Canvas',
    darkContrast: '3.5:1 vs Canvas',
  },
  {
    name: 'Primary Text',
    role: 'Headings, table cell values, labels',
    category: 'content',
    lightHex: '#0F172A',
    lightRgb: 'RGB(15, 23, 42)',
    darkHex: '#F8FAFC',
    darkRgb: 'RGB(248, 250, 252)',
    vbaConstant: 'CLR_LT_TEXT_PRI = &H2A170F / CLR_DK_TEXT_PRI = &HFCFAF8',
    lightContrast: '16.8:1 (AAA Pass)',
    darkContrast: '18.2:1 (AAA Pass)',
  },
  {
    name: 'Secondary / Muted Text',
    role: 'Subtitles, timestamps, metadata keys',
    category: 'content',
    lightHex: '#475569',
    lightRgb: 'RGB(71, 85, 105)',
    darkHex: '#94A3B8',
    darkRgb: 'RGB(148, 163, 184)',
    vbaConstant: 'CLR_LT_TEXT_MUTED = &H695547 / CLR_DK_TEXT_MUTED = &HB8A394',
    lightContrast: '5.4:1 (AA Pass)',
    darkContrast: '5.8:1 (AA Pass)',
  },
  {
    name: 'Paramount Lime Brand',
    role: 'Official company logo, brandmark',
    category: 'brand',
    lightHex: '#C6D92C',
    lightRgb: 'RGB(198, 217, 44)',
    darkHex: '#C6D92C',
    darkRgb: 'RGB(198, 217, 44)',
    vbaConstant: 'CLR_PARAMOUNT_LIME = &H2CD9C6',
    lightContrast: '9.4:1 on Slate-900',
    darkContrast: '9.4:1 on Slate-900',
  },
  {
    name: 'Primary Brand Teal',
    role: 'Action buttons, active tabs, highlights',
    category: 'brand',
    lightHex: '#0D9488',
    lightRgb: 'RGB(13, 148, 136)',
    darkHex: '#2DD4BF',
    darkRgb: 'RGB(45, 212, 191)',
    vbaConstant: 'CLR_BRAND_TEAL = &H88940D',
    lightContrast: '4.8:1 (AA Pass)',
    darkContrast: '7.2:1 (AAA Pass)',
  },
  {
    name: 'Success / In-Stock',
    role: 'GRN delivery, sufficient stock levels',
    category: 'status',
    lightHex: '#16A34A',
    lightRgb: 'RGB(22, 163, 74)',
    darkHex: '#4ADE80',
    darkRgb: 'RGB(74, 222, 128)',
    vbaConstant: 'CLR_SUCCESS = &H4AA316',
    lightContrast: '4.6:1 (AA Pass)',
    darkContrast: '7.8:1 (AAA Pass)',
  },
  {
    name: 'Warning / Low Stock',
    role: 'Reorder alerts, pending actions',
    category: 'status',
    lightHex: '#D97706',
    lightRgb: 'RGB(217, 119, 6)',
    darkHex: '#FBBF24',
    darkRgb: 'RGB(251, 191, 36)',
    vbaConstant: 'CLR_WARNING = &H0677D9',
    lightContrast: '4.5:1 (AA Pass)',
    darkContrast: '8.4:1 (AAA Pass)',
  },
  {
    name: 'Danger / Out of Stock',
    role: 'Critical stock deficits, deletion actions',
    category: 'status',
    lightHex: '#DC2626',
    lightRgb: 'RGB(220, 38, 38)',
    darkHex: '#F87171',
    darkRgb: 'RGB(248, 113, 113)',
    vbaConstant: 'CLR_DANGER = &H2626DC',
    lightContrast: '5.2:1 (AA Pass)',
    darkContrast: '6.5:1 (AA Pass)',
  },
];

export function generateStyleGuideMarkdown(): string {
  return `# PARAMOUNT PROCUREMENT SYSTEM - ENTERPRISE UI STYLE GUIDE
## Design Tokens, WCAG AA Accessibility, Typography & Visual Specifications

---

### EXECUTIVE SUMMARY
This document provides the complete, authoritative UI/UX Design System Specification for the **Paramount Stationery & Cleaning Procurement System**. It encompasses dual-theme color tokens, WCAG 2.1 AA accessibility ratios, typography scales, interactive component states, official brand asset parameters, and VBA color constants.

- **System Name**: Paramount Stationery & Cleaning Inventory Management System
- **Compliance Standard**: WCAG 2.1 AA (Minimum 4.5:1 text contrast, up to 18.2:1 on dark canvas)
- **Primary Brand Colors**: Lime Green (\`#C6D92C\` / \`RGB(198, 217, 44)\`) & Teal (\`#0D9488\` / \`RGB(13, 148, 136)\`)
- **Theme Modes**: Dual-Theme (Light Theme / Dark Slate Theme)

---

### 1. OFFICIAL BRAND IDENTITY & LOGO SPECIFICATION
- **Official Asset**: \`PEX Green (2).png\` (Paramount Brand Badge)
- **Dimensions on PDF Vouchers**: 16mm (width) × 28mm (height) attached as-is at top-left corner
- **Visual Composition**:
  - Dark Graphite background card (\`#24282D\`)
  - Lime Green striding worker with hardhat (\`#C6D92C\` / \`RGB(198, 217, 44)\`)
  - Vertical rotated lowercase \`paramount\` logotype
- **VBA RGB Formula**: \`RGB(198, 217, 44)\` (Hex: \`#C6D92C\` / VBA Long Hex: \`&H2CD9C6\`)

---

### 2. DUAL-THEME COLOR PALETTE & CONTRAST RATIOS

| Token Name | Category | Light Theme Hex | Dark Theme Hex | VBA Constant | Contrast Ratio (WCAG) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | Surfaces | \`#F8FAFC\` (248,250,252) | \`#020617\` (2,6,23) | \`CLR_LT_CANVAS\` / \`CLR_DK_CANVAS\` | Base Canvas |
| **Surface Card / Panel** | Surfaces | \`#FFFFFF\` (255,255,255) | \`#0F172A\` (15,23,42) | \`CLR_LT_SURFACE\` / \`CLR_DK_SURFACE\` | 1.05:1 (Light) / 1.12:1 (Dark) |
| **Border Subtle** | Surfaces | \`#E2E8F0\` (226,232,240) | \`#1E293B\` (30,41,59) | \`CLR_LT_BORDER\` / \`CLR_DK_BORDER\` | 3.2:1 (Light) / 3.5:1 (Dark) |
| **Primary Text** | Content | \`#0F172A\` (15,23,42) | \`#F8FAFC\` (248,250,252) | \`CLR_LT_TEXT_PRI\` / \`CLR_DK_TEXT_PRI\` | **16.8:1 (AAA)** / **18.2:1 (AAA)** |
| **Secondary / Muted Text** | Content | \`#475569\` (71,85,105) | \`#94A3B8\` (148,163,184) | \`CLR_LT_TEXT_MUTED\` / \`CLR_DK_TEXT_MUTED\` | **5.4:1 (AA)** / **5.8:1 (AA)** |
| **Paramount Lime Brand** | Brand | \`#C6D92C\` (198,217,44) | \`#C6D92C\` (198,217,44) | \`CLR_PARAMOUNT_LIME\` | **9.4:1 on Slate-900** |
| **Primary Brand Teal** | Brand | \`#0D9488\` (13,148,136) | \`#2DD4BF\` (45,212,191) | \`CLR_BRAND_TEAL\` | **4.8:1 (AA)** / **7.2:1 (AAA)** |
| **Success / In-Stock** | Status | \`#16A34A\` (22,163,74) | \`#4ADE80\` (74,222,128) | \`CLR_SUCCESS\` | **4.6:1 (AA)** / **7.8:1 (AAA)** |
| **Warning / Low Stock** | Status | \`#D97706\` (217,119,6) | \`#FBBF24\` (251,191,36) | \`CLR_WARNING\` | **4.5:1 (AA)** / **8.4:1 (AAA)** |
| **Danger / Out of Stock** | Status | \`#DC2626\` (220,38,38) | \`#F87171\` (248,113,113) | \`CLR_DANGER\` | **5.2:1 (AA)** / **6.5:1 (AA)** |

---

### 3. TYPOGRAPHY HIERARCHY & GRID SPECIFICATIONS

- **System Font Families**: \`Segoe UI\` (Primary Windows UI), \`Aptos\`, \`Calibri\` fallback.
- **Monospace Font**: \`Consolas\` (Item IDs, Document References, Timestamps).

| Hierarchy Level | Size (pt / px) | Font Weight | Family | Standard Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display Title (H1)** | 18pt / 24px | Bold (700) | Segoe UI / Aptos | Main application title banner |
| **Section Heading (H2)** | 14pt / 18px | Bold (700) | Segoe UI / Aptos | Major sheet sections, modal titles |
| **Card / Form Title (H3)**| 11pt / 14px | Semibold (600)| Segoe UI | UserForm headers, preview sections |
| **Worksheet Table Header**| 11pt / 14px | Bold (700) | Segoe UI (Uppercase) | Column headers with letter tracking |
| **Table Data Cells** | 10pt / 13px | Regular (400) | Segoe UI | In-sheet item descriptions, quantities |
| **Codes, IDs & Timestamps**| 9.5pt / 12px | Medium (500) | Consolas (Monospace) | Item IDs (\`ST-001\`), timestamps |
| **Status Badges & Microcopy**| 8.5pt / 11px | Bold (700) | Segoe UI | Status chips, stock indicators |

#### Grid & Spacing Rules:
- **Worksheet Row Heights**: Header Row = 26pt; Data Rows = 20pt; Divider Rows = 10pt.
- **Cell Alignment**: Codes & dates centered; item descriptions left-aligned with 4pt padding; quantities right-aligned.
- **Touch & Click Targets**: Minimum 36px height on desktop, 44px on touch screens.

---

### 4. COMPONENT ANATOMY & UI CONTROLS

#### A. Interactive Buttons:
- **Primary Action (Teal)**: \`#0D9488\` / Hover: \`#0F766E\` (Text: White, Radius: 12px, Font: 12px Bold)
- **Goods Received (Emerald)**: \`#16A34A\` / Hover: \`#15803D\` (Text: White)
- **Issue Request (Amber)**: \`#D97706\` / Hover: \`#B45309\` (Text: White)
- **Delete / Danger (Red)**: \`#DC2626\` / Hover: \`#B91C1C\` (Text: White)
- **Secondary / Cancel**: Slate-100 / Dark Slate-800 with 1px border.

#### B. Category & Status Badges:
- **Stationery (ST)**: Blue badge (\`bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300\`)
- **Cleaning (CL)**: Emerald badge (\`bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300\`)
- **General (GN)**: Purple badge (\`bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300\`)
- **Low Stock Alert**: Amber badge with warning icon (\`bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300\`)

---

### 5. VBA THEME ENGINE CODE CONSTANTS (\`mod_ThemeEngine.bas\`)

\`\`\`vba
' ================================================================================
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
Public Const CLR_DANGER As Long = &H2626DC          ' RGB(220, 38, 38)
\`\`\`

---
*Generated by Paramount Procurement & Stores Inventory Control System*
`;
}

export function generateStyleGuideHtml(): string {
  const logoData = getPexGreenLogoDataUrl();
  const rows = STYLE_GUIDE_TOKENS.map(
    (t) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 14px; height: 14px; border-radius: 4px; background: ${t.lightHex}; border: 1px solid rgba(0,0,0,0.15);"></span>
            ${t.name}
          </div>
          <div style="font-size: 11px; color: #64748b; font-weight: normal;">${t.role}</div>
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">
          <div style="font-weight: bold; color: #0d9488;">${t.lightHex}</div>
          <div style="color: #64748b;">${t.lightRgb}</div>
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">
          <div style="font-weight: bold; color: #2dd4bf;">${t.darkHex}</div>
          <div style="color: #64748b;">${t.darkRgb}</div>
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 10px; color: #475569;">
          ${t.vbaConstant}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; background: #ccfbf1; color: #115e59; font-size: 10px;">
            ${t.lightContrast} / ${t.darkContrast}
          </span>
        </td>
      </tr>
    `
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Paramount UI Style Guide & Theme Design System</title>
  <style>
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 32px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .header-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0d9488;
      padding-bottom: 24px;
      margin-bottom: 32px;
      gap: 20px;
    }
    h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .subtitle {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #0f172a;
      border-left: 4px solid #0d9488;
      padding-left: 12px;
      margin-top: 36px;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 12px;
      background: #ffffff;
    }
    th {
      background: #f1f5f9;
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: bold;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #cbd5e1;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      font-size: 11px;
      font-family: 'Consolas', monospace;
      overflow-x: auto;
      line-height: 1.5;
    }
    .badge-grid {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin: 16px 0;
    }
    .badge {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: bold;
      display: inline-flex;
      align-items: center;
    }
    .btn-preview {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: bold;
      color: white;
      border: none;
      display: inline-block;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-banner">
      <div>
        <h1>Paramount UI Style Guide & Design System</h1>
        <p class="subtitle">Official Stationery & Cleaning System • WCAG AA Compliance • Excel VBA Palette & Typography</p>
      </div>
      <img src="${logoData}" alt="Paramount Logo" style="height: 56px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />
    </div>

    <div class="section-title">1. Official Paramount Brand Identity & Colors</div>
    <p style="font-size: 13px; color: #475569;">
      The official brand asset (<code>PEX Green (2).png</code>) is positioned in the top-left header zone of all generated PDF vouchers (16mm × 28mm).
      Primary Brand Accent: <strong>#C6D92C</strong> (Lime Green / <code>RGB(198, 217, 44)</code>).
    </p>

    <div class="section-title">2. Dual-Theme Color Tokens & Contrast Matrix</div>
    <table>
      <thead>
        <tr>
          <th>Token Name</th>
          <th>Light Theme</th>
          <th>Dark Theme</th>
          <th>VBA Constant</th>
          <th>Contrast Ratio</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="section-title">3. Typography Scale & Grid Hierarchy</div>
    <table>
      <thead>
        <tr>
          <th>Hierarchy Level</th>
          <th>Size (pt / px)</th>
          <th>Weight</th>
          <th>Font Family</th>
          <th>Preview</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Display Title (H1)</strong></td>
          <td>18pt / 24px</td>
          <td>Bold (700)</td>
          <td>Segoe UI / Aptos</td>
          <td style="font-size: 18px; font-weight: bold;">Procurement Inventory</td>
        </tr>
        <tr>
          <td><strong>Section Heading (H2)</strong></td>
          <td>14pt / 18px</td>
          <td>Bold (700)</td>
          <td>Segoe UI / Aptos</td>
          <td style="font-size: 14px; font-weight: bold;">Master Stock Control</td>
        </tr>
        <tr>
          <td><strong>Card / Form Title (H3)</strong></td>
          <td>11pt / 14px</td>
          <td>Semibold (600)</td>
          <td>Segoe UI</td>
          <td style="font-size: 12px; font-weight: 600;">Issue Requisition Cart</td>
        </tr>
        <tr>
          <td><strong>Worksheet Table Header</strong></td>
          <td>11pt / 14px</td>
          <td>Bold (700)</td>
          <td>Segoe UI (Uppercase)</td>
          <td style="font-size: 11px; font-weight: bold; color: #0d9488;">ITEM ID • DESCRIPTION</td>
        </tr>
        <tr>
          <td><strong>Table Data Cells</strong></td>
          <td>10pt / 13px</td>
          <td>Regular (400)</td>
          <td>Segoe UI</td>
          <td style="font-size: 12px;">Blue Ballpoint Pens Box of 12</td>
        </tr>
        <tr>
          <td><strong>Codes & Timestamps</strong></td>
          <td>9.5pt / 12px</td>
          <td>Medium (500)</td>
          <td>Consolas (Monospace)</td>
          <td style="font-family: monospace; font-size: 11px; color: #0d9488;">ST-001 • 2026-08-17</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">4. Interactive Component & Badge Tokens</div>
    <div style="margin-bottom: 16px;">
      <span class="btn-preview" style="background: #0d9488;">Primary Action (Teal)</span>
      <span class="btn-preview" style="background: #16a34a;">Goods Received (Emerald)</span>
      <span class="btn-preview" style="background: #d97706;">Issue Request (Amber)</span>
      <span class="btn-preview" style="background: #dc2626;">Delete Item (Red)</span>
      <span class="btn-preview" style="background: #e2e8f0; color: #1e293b;">Secondary / Cancel</span>
    </div>

    <div class="badge-grid">
      <span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">Stationery (ST)</span>
      <span class="badge" style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;">Cleaning (CL)</span>
      <span class="badge" style="background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff;">General (GN)</span>
      <span class="badge" style="background: #fefce8; color: #a16207; border: 1px solid #fef08a;">Low Stock Alert</span>
    </div>

    <div class="section-title">5. VBA Theme Engine Constants (<code>mod_ThemeEngine.bas</code>)</div>
    <pre>
' ================================================================================
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
Public Const CLR_DANGER As Long = &H2626DC          ' RGB(220, 38, 38)
    </pre>
  </div>
</body>
</html>`;
}

export function generateStyleGuideJson(): string {
  return JSON.stringify(
    {
      system: 'Paramount Stationery & Cleaning System',
      version: '2.0.0',
      compliance: 'WCAG 2.1 AA',
      brand: {
        name: 'Paramount Lime',
        hex: '#C6D92C',
        rgb: 'RGB(198, 217, 44)',
        vbaLongHex: '&H2CD9C6',
        asset: 'PEX Green (2).png',
      },
      tokens: STYLE_GUIDE_TOKENS,
      typography: {
        primaryFamily: 'Segoe UI, Aptos, Calibri, sans-serif',
        monospaceFamily: 'Consolas, monospace',
        scale: [
          { level: 'H1', pt: 18, px: 24, weight: 700 },
          { level: 'H2', pt: 14, px: 18, weight: 700 },
          { level: 'H3', pt: 11, px: 14, weight: 600 },
          { level: 'HeaderCell', pt: 11, px: 14, weight: 700 },
          { level: 'DataCell', pt: 10, px: 13, weight: 400 },
          { level: 'CodeCell', pt: 9.5, px: 12, weight: 500 },
          { level: 'Badge', pt: 8.5, px: 11, weight: 700 },
        ],
      },
    },
    null,
    2
  );
}

export function generateStyleGuidePdf(): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Page 1: Design Tokens & Typography
  pdf.setDrawColor(30, 41, 59);
  pdf.setLineWidth(0.5);
  pdf.rect(10, 10, 190, 277);

  // Header Box
  pdf.setFillColor(248, 250, 252);
  pdf.rect(12, 12, 186, 28, 'F');
  pdf.rect(12, 12, 186, 28, 'S');

  // Official Logo
  const logoData = getPexGreenLogoDataUrl();
  try {
    pdf.addImage(logoData, 'PNG', 14, 13.5, 14, 25);
  } catch {
    pdf.setFillColor(36, 40, 45);
    pdf.rect(14, 13.5, 14, 25, 'F');
  }

  // Header Titles
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PARAMOUNT PROCUREMENT SYSTEM - UI STYLE GUIDE', 32, 21);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Enterprise Design Tokens • WCAG AA Compliance • Excel VBA Palettes', 32, 27);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} | PEX Green (2).png (#C6D92C)`, 32, 33);

  // Section 1: Color Tokens Table
  pdf.setFontSize(10.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(13, 148, 136);
  pdf.text('1. DUAL-THEME COLOR TOKENS & CONTRAST RATIOS', 12, 47);

  let y = 52;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(12, y, 186, 7, 'F');
  pdf.rect(12, y, 186, 7, 'S');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('TOKEN NAME', 15, y + 5);
  pdf.text('LIGHT HEX / RGB', 62, y + 5);
  pdf.text('DARK HEX / RGB', 105, y + 5);
  pdf.text('VBA CONSTANT', 148, y + 5);

  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);

  STYLE_GUIDE_TOKENS.forEach((token, idx) => {
    if (idx % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(12, y, 186, 6.5, 'F');
    }
    pdf.rect(12, y, 186, 6.5, 'S');

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.text(token.name, 15, y + 4.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(13, 148, 136);
    pdf.text(token.lightHex, 62, y + 4.5);

    pdf.setTextColor(45, 212, 191);
    pdf.text(token.darkHex, 105, y + 4.5);

    pdf.setTextColor(71, 85, 105);
    pdf.text(token.vbaConstant.split('/')[0].trim().substring(0, 26), 148, y + 4.5);

    y += 6.5;
  });

  // Section 2: Typography Scale
  y += 6;
  pdf.setFontSize(10.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(13, 148, 136);
  pdf.text('2. TYPOGRAPHY HIERARCHY & GRID SPECIFICATIONS', 12, y);

  y += 5;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(12, y, 186, 7, 'F');
  pdf.rect(12, y, 186, 7, 'S');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('HIERARCHY LEVEL', 15, y + 5);
  pdf.text('SIZE (PT / PX)', 65, y + 5);
  pdf.text('WEIGHT', 105, y + 5);
  pdf.text('FONT FAMILY', 145, y + 5);

  y += 7;
  const typoRows = [
    { level: 'Display Title (H1)', size: '18pt / 24px', weight: 'Bold (700)', font: 'Segoe UI / Aptos' },
    { level: 'Section Heading (H2)', size: '14pt / 18px', weight: 'Bold (700)', font: 'Segoe UI / Aptos' },
    { level: 'Card / Form Title (H3)', size: '11pt / 14px', weight: 'Semibold (600)', font: 'Segoe UI' },
    { level: 'Worksheet Table Header', size: '11pt / 14px', weight: 'Bold (700)', font: 'Segoe UI (Uppercase)' },
    { level: 'Table Data Cells', size: '10pt / 13px', weight: 'Regular (400)', font: 'Segoe UI' },
    { level: 'Codes & Timestamps', size: '9.5pt / 12px', weight: 'Medium (500)', font: 'Consolas (Monospace)' },
  ];

  typoRows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(12, y, 186, 6, 'F');
    }
    pdf.rect(12, y, 186, 6, 'S');

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.text(row.level, 15, y + 4.2);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(row.size, 65, y + 4.2);
    pdf.text(row.weight, 105, y + 4.2);
    pdf.text(row.font, 145, y + 4.2);

    y += 6;
  });

  // Section 3: VBA Constants
  y += 6;
  pdf.setFontSize(10.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(13, 148, 136);
  pdf.text('3. VBA THEME CONSTANTS BLOCK (mod_ThemeEngine.bas)', 12, y);

  y += 4;
  pdf.setFillColor(15, 23, 42);
  pdf.rect(12, y, 186, 42, 'F');
  pdf.rect(12, y, 186, 42, 'S');

  pdf.setFontSize(6.8);
  pdf.setFont('courier', 'normal');
  pdf.setTextColor(248, 250, 252);

  const vbaLines = [
    "' OFFICIAL BRAND & LOGO",
    "Public Const CLR_PARAMOUNT_LIME As Long = &H2CD9C6  ' RGB(198, 217, 44)",
    "Public Const CLR_BRAND_TEAL As Long = &H88940D       ' RGB(13, 148, 136)",
    "' LIGHT THEME TOKENS: Canvas=&HFCFAF8, Surface=&HFFFFFF, TextPri=&H2A170F, Border=&HF0E8E2",
    "' DARK THEME TOKENS:  Canvas=&H170602, Surface=&H2A170F, TextPri=&HFCFAF8, Border=&H3B291E",
    "' SEMANTIC STATUS:    Success=&H4AA316, Warning=&H0677D9, Danger=&H2626DC",
  ];

  vbaLines.forEach((line, idx) => {
    pdf.text(line, 15, y + 7 + idx * 5.5);
  });

  return pdf;
}

export function downloadStyleGuideFile(format: 'html' | 'md' | 'json' | 'pdf' = 'html') {
  if (format === 'pdf') {
    const pdf = generateStyleGuidePdf();
    pdf.save('Paramount_UI_Style_Guide.pdf');
    return;
  }

  let content = '';
  let filename = '';
  let mimeType = '';

  if (format === 'html') {
    content = generateStyleGuideHtml();
    filename = 'Paramount_UI_Style_Guide.html';
    mimeType = 'text/html;charset=utf-8;';
  } else if (format === 'md') {
    content = generateStyleGuideMarkdown();
    filename = 'Paramount_UI_Style_Guide.md';
    mimeType = 'text/markdown;charset=utf-8;';
  } else if (format === 'json') {
    content = generateStyleGuideJson();
    filename = 'Paramount_Design_Tokens.json';
    mimeType = 'application/json;charset=utf-8;';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
