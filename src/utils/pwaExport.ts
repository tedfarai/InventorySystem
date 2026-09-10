/**
 * ===============================================================================
 * NATIVE BROWSER PWA FILE EXPORT & PRINT UTILITIES
 * Universal browser-native export, File System Access API integration,
 * Excel (.xlsx) generator, and native print dispatchers.
 * ===============================================================================
 */

import * as XLSX from 'xlsx';

/**
 * Exports tabular data to standard Microsoft Excel (.xlsx) file
 */
export function exportTableToExcel(data: any[], sheetName: string, fileName: string): void {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel limit is 31 chars for sheet name
    const cleanFileName = `${fileName.replace(/[/\\?%*:|"<>]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, cleanFileName);
  } catch (err) {
    console.error('[pwaExport] Excel export error:', err);
  }
}

/**
 * Exports multiple named sheets to a single Excel workbook
 */
export function exportMultiSheetExcel(
  sheets: { name: string; data: any[] }[],
  fileName: string
): void {
  try {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, data }) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
    });
    const cleanFileName = `${fileName.replace(/[/\\?%*:|"<>]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, cleanFileName);
  } catch (err) {
    console.error('[pwaExport] Multi-sheet Excel export error:', err);
  }
}

/**
 * Downloads a JSON string using File System Access API or Blob fallback
 */
export async function downloadJsonFile(content: string, fileName: string): Promise<void> {
  const cleanName = `${fileName.replace(/[/\\?%*:|"<>]/g, '_')}_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });

  // 1. Try modern File System Access API
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: cleanName,
        types: [
          {
            description: 'JSON Backup Document',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled
      console.warn('[pwaExport] File System Access API fallback to Blob download:', err);
    }
  }

  // 2. Universal Anchor Blob fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Downloads binary SQLite or PDF file
 */
export async function downloadBinaryFile(
  bytes: Uint8Array,
  fileName: string,
  mimeType = 'application/octet-stream'
): Promise<void> {
  const blob = new Blob([bytes], { type: mimeType });

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'Binary File',
            accept: { [mimeType]: [`.${fileName.split('.').pop()}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('[pwaExport] showSaveFilePicker fallback:', err);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Triggers standard browser print dialog for vouchers / receipts
 */
export function triggerPrintDocument(): void {
  window.print();
}

/**
 * Helper to read JSON file from HTML input
 */
export function readJsonFromFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        resolve(json);
      } catch (e) {
        reject(new Error('Invalid JSON format in uploaded file'));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}
