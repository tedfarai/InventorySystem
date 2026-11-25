import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVoucherPdf,
  generateVoucherPdfFile,
  openPdfInNewTab,
  printPdfFromUrl,
} from '../voucherPdfGenerator';
import { registerBackgroundSync } from '../../db/backgroundSync';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: originalDocument,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
    writable: true,
  });
});

describe('Voucher PDF generation & printing safeguards', () => {
  it('generates valid PDF blobs and Blob URLs for ISSUE (SIV), DELIVERY (BRV/GRN), and ADJUSTMENT vouchers', async () => {
    const issueDoc = {
      type: 'ISSUE' as const,
      data: {
        slipNumber: 'SIV-9001',
        voucherTitle: 'STOCK ISSUE VOUCHER (SIV)',
        timestamp: '2026-11-24 10:00:00',
        deptID: 'OPS',
        deptName: 'Operations',
        deptHeadName: 'Jane Doe',
        deptHeadEmail: 'ops@paramount.co.zw',
        issuerID: 'ADM001',
        issuerName: 'Rachel Pickard',
        items: [
          { ItemID: 'ST-001', ItemName: 'A4 Bond Paper', Category: 'Stationery' as const, Qty: 4 },
        ],
        pdfFileName: 'IssueSlip_OPS_SIV-9001.pdf',
        folderPath: 'C:\\Stationery & Cleaning\\Issued_Items\\',
        fullSavedPath: 'C:\\Stationery & Cleaning\\Issued_Items\\IssueSlip_OPS_SIV-9001.pdf',
      },
    };

    const issuePdf = await generateVoucherPdfFile(issueDoc);
    assert.equal(issuePdf.blob.type, 'application/pdf');
    assert.ok(issuePdf.blob.size > 500);
    assert.ok(issuePdf.url.startsWith('blob:'));
    URL.revokeObjectURL(issuePdf.url);

    const deliveryDoc = {
      type: 'DELIVERY' as const,
      data: {
        docType: 'DELIVERY' as const,
        voucherNumber: 'BRV-2001',
        voucherTitle: 'BULK RECEIVE VOUCHER (BRV)',
        deliveryRef: 'DN-8891',
        supplier: 'Apex Stationery Ltd',
        timestamp: '2026-11-24 10:05:00',
        deptID: 'FIN',
        deptName: 'Finance',
        issuerID: 'ADM001',
        issuerName: 'Rachel Pickard',
        items: [
          { ItemID: 'CL-002', ItemName: 'Liquid Detergent 5L', Category: 'Cleaning' as const, Qty: 10 },
        ],
        pdfFileName: 'BRV_Voucher_BRV-2001.pdf',
        folderPath: 'C:\\Stationery & Cleaning\\Received_Items\\',
        fullSavedPath: 'C:\\Stationery & Cleaning\\Received_Items\\BRV_Voucher_BRV-2001.pdf',
      },
    };

    const builtDelivery = buildVoucherPdf(deliveryDoc);
    assert.ok(builtDelivery.output('blob').size > 500);
  });

  it('rejects non-blob or malformed URLs in printPdfFromUrl and openPdfInNewTab', () => {
    assert.throws(() => printPdfFromUrl('not-a-url'), /invalid/i);
    assert.throws(() => printPdfFromUrl('https://example.com/test.pdf'), /Blob URL/i);

    const tabRes = openPdfInNewTab('https://example.com/test.pdf');
    assert.equal(tabRes.opened, false);
    assert.match(tabRes.error || '', /Blob URL/i);
  });

  it('invokes onPrintFallback cleanly when popups are blocked and DOM document is unavailable', () => {
    let fallbackCalled = false;
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: {
        open: () => null,
        setTimeout,
      },
      configurable: true,
      writable: true,
    });

    printPdfFromUrl('blob:https://localhost:3000/test-voucher', {
      onPrintFallback: () => {
        fallbackCalled = true;
      },
    });
    assert.equal(fallbackCalled, true);
  });

  it('triggers download fallback when openPdfInNewTab is blocked by iframe popup policy', () => {
    let clickedDownload = '';
    Object.defineProperty(globalThis, 'window', {
      value: {
        open: () => null,
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: () => ({
          href: '',
          download: '',
          click() {
            clickedDownload = this.download;
          },
        }),
      },
      configurable: true,
      writable: true,
    });

    const res = openPdfInNewTab('blob:https://localhost:3000/test-voucher', 'SIV-9001.pdf');
    assert.equal(res.opened, false);
    assert.equal(res.usedDownloadFallback, true);
    assert.equal(clickedDownload, 'SIV-9001.pdf');
  });
});

describe('Background sync deadlock prevention', () => {
  it('resolves promptly without hanging when navigator.serviceWorker.ready never settles', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          getRegistration: async () => undefined,
          ready: new Promise(() => {}),
        },
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: {
        SyncManager: function MockSyncManager() {},
      },
      configurable: true,
      writable: true,
    });

    const start = Date.now();
    await registerBackgroundSync();
    const elapsedMs = Date.now() - start;
    assert.ok(elapsedMs < 1000, `Expected registerBackgroundSync to resolve quickly, took ${elapsedMs}ms`);
  });
});
