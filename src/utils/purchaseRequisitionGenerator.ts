import jsPDF from 'jspdf';
import { AdminUser, CurrencyCode, ItemCategory, StockItem } from '../types';
import { getPexGreenLogoDataUrl } from '../components/brand/brandLogoData';
import { ReorderItemAnalysis } from './reorderReportPdfGenerator';
import { convertCurrency, formatCurrency, getExchangeRate } from './currencyUtils';

export interface PurchaseRequisitionLineItem {
  itemId: string;
  itemName: string;
  category: ItemCategory;
  unit: string;
  currentQty: number;
  reorderLevel: number;
  shortageQty: number;
  requestedOrderQty: number;
  urgency: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW_STOCK';
  urgencyLabel: string;
  supplier: string;
  unitPrice?: number;
  currency: CurrencyCode;
  estimatedLineTotal: number;
}

export interface PurchaseRequisitionDocument {
  reqNumber: string;
  generatedAt: string;
  isoTimestamp: string;
  requestedByName: string;
  requestedById: string;
  requestedByRole: string;
  targetApprover: string;
  priority: 'URGENT' | 'STANDARD';
  totalItemsCount: number;
  outOfStockCount: number;
  criticalCount: number;
  lowStockCount: number;
  totalRequestedUnits: number;
  estimatedUsdTotal: number;
  estimatedZwgTotal: number;
  pricedItemCount: number;
  unpricedItemCount: number;
  notes: string;
  items: PurchaseRequisitionLineItem[];
  sourceItems: StockItem[];
}

function defaultSupplierForCategory(category: ItemCategory): string {
  if (category === 'Stationery') return 'Paramount Paper & Stationery Co.';
  if (category === 'Cleaning') return 'Hygiene Supplies Direct Ltd';
  return 'Prime Commercial Merchants';
}

export function buildPurchaseRequisition(
  analyzedItems: ReorderItemAnalysis[],
  currentUser: AdminUser | null,
  customOrderQtys?: Record<string, number>,
  customNotes?: string,
  resolveSupplier?: (item: StockItem) => string
): PurchaseRequisitionDocument {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const reqNumber = `PR-${datePart}-${timePart.slice(0, 4)}${randomSuffix}`;

  const rate = getExchangeRate();
  let outOfStockCount = 0;
  let criticalCount = 0;
  let lowStockCount = 0;
  let totalRequestedUnits = 0;
  let estimatedUsdTotal = 0;
  let estimatedZwgTotal = 0;
  let pricedItemCount = 0;
  let unpricedItemCount = 0;

  const lineItems: PurchaseRequisitionLineItem[] = analyzedItems.map((entry) => {
    const rawCustomQty = customOrderQtys?.[entry.item.ItemID];
    const requestedOrderQty =
      rawCustomQty !== undefined && Number.isFinite(rawCustomQty) && rawCustomQty > 0
        ? Math.round(rawCustomQty)
        : entry.recommendedOrderQty;

    if (entry.urgency === 'OUT_OF_STOCK') outOfStockCount++;
    else if (entry.urgency === 'CRITICAL') criticalCount++;
    else lowStockCount++;

    totalRequestedUnits += requestedOrderQty;

    const unitPrice = Number(entry.item.UnitPrice) > 0 ? Number(entry.item.UnitPrice) : undefined;
    const currency: CurrencyCode = entry.item.Currency || 'USD';
    const estimatedLineTotal = unitPrice ? Math.round(unitPrice * requestedOrderQty * 100) / 100 : 0;

    if (unitPrice && unitPrice > 0) {
      pricedItemCount++;
      estimatedUsdTotal += convertCurrency(estimatedLineTotal, currency, 'USD', rate);
      estimatedZwgTotal += convertCurrency(estimatedLineTotal, currency, 'ZWG', rate);
    } else {
      unpricedItemCount++;
    }

    const supplier =
      (resolveSupplier ? resolveSupplier(entry.item) : undefined) ||
      entry.item.LastSupplier ||
      entry.item.SupplierName ||
      defaultSupplierForCategory(entry.item.Category);

    return {
      itemId: entry.item.ItemID,
      itemName: entry.item.ItemName,
      category: entry.item.Category,
      unit: entry.item.Unit || 'Units',
      currentQty: entry.currentQty,
      reorderLevel: entry.reorderLevel,
      shortageQty: entry.shortageQty,
      requestedOrderQty,
      urgency: entry.urgency,
      urgencyLabel: entry.urgencyLabel,
      supplier,
      unitPrice,
      currency,
      estimatedLineTotal,
    };
  });

  const priority: 'URGENT' | 'STANDARD' =
    outOfStockCount > 0 || criticalCount > 0 ? 'URGENT' : 'STANDARD';

  const defaultNotes =
    outOfStockCount > 0
      ? `Automated safety-threshold requisition covering ${outOfStockCount} out-of-stock SKU(s) and ${criticalCount + lowStockCount} low-stock SKU(s). Immediate procurement approval requested.`
      : `Automated replenishment requisition for ${lineItems.length} item(s) at or below configured safety reorder thresholds.`;

  return {
    reqNumber,
    generatedAt: now.toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    isoTimestamp: now.toISOString(),
    requestedByName: currentUser ? currentUser.IssuerName : 'Guest Review Session',
    requestedById: currentUser ? currentUser.IssuerID : 'GUEST',
    requestedByRole: currentUser ? currentUser.Role : 'Read-Only Observer',
    targetApprover: 'Rachel Pickard (Procurement Manager / ADM001)',
    priority,
    totalItemsCount: lineItems.length,
    outOfStockCount,
    criticalCount,
    lowStockCount,
    totalRequestedUnits,
    estimatedUsdTotal: Math.round(estimatedUsdTotal * 100) / 100,
    estimatedZwgTotal: Math.round(estimatedZwgTotal * 100) / 100,
    pricedItemCount,
    unpricedItemCount,
    notes: customNotes !== undefined && customNotes.trim() ? customNotes.trim() : defaultNotes,
    items: lineItems,
    sourceItems: analyzedItems.map((a) => a.item),
  };
}

export function generatePurchaseRequisitionPdf(
  reqDoc: PurchaseRequisitionDocument,
  masterFolderPath: string = 'C:\\Stationery & Cleaning'
): { pdf: jsPDF; fileName: string } {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let currentPage = 1;

  const renderPageHeader = () => {
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, margin, contentWidth, pageHeight - margin * 2);

    pdf.setFillColor(248, 250, 252);
    pdf.rect(12, 12, 186, 32, 'F');
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.4);
    pdf.rect(12, 12, 186, 32);

    const logoData = getPexGreenLogoDataUrl();
    try {
      pdf.addImage(logoData, 'PNG', 14.5, 14, 15, 27);
    } catch {
      pdf.setFillColor(36, 40, 45);
      pdf.rect(14.5, 14, 15, 27, 'F');
      pdf.setTextColor(198, 217, 44);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PARAMOUNT', 15.5, 28);
    }

    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.4);
    pdf.line(32, 12, 32, 44);

    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OFFICIAL PURCHASE REQUISITION (PR)', 35, 20);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(13, 148, 136);
    pdf.text('PARAMOUNT EXPORTS — PROCUREMENT & INVENTORY CONTROL', 35, 26);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Requisition Ref: ${reqDoc.reqNumber}  |  Priority: ${reqDoc.priority}  |  Date: ${reqDoc.generatedAt}`, 35, 32.5);
    pdf.text(`Target Archive: ${masterFolderPath}\\Requisitions\\${reqDoc.reqNumber}.pdf`.substring(0, 88), 35, 38.5);
  };

  const renderPageFooter = (pageNumber: number) => {
    const footerY = pageHeight - 14;
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.line(14, footerY - 2, 196, footerY - 2);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      'Paramount Exports Inventory Control — Automated Safety-Threshold Purchase Requisition',
      14,
      footerY + 2
    );
    pdf.text(`Page ${pageNumber}`, 188, footerY + 2, { align: 'right' });
  };

  renderPageHeader();

  // Metadata Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.rect(12, 47, 186, 26, 'FD');

  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Requested By:', 15, 53);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${reqDoc.requestedByName} (${reqDoc.requestedById}) — ${reqDoc.requestedByRole}`, 44, 53);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Approving Authority:', 15, 59);
  pdf.setFont('helvetica', 'normal');
  pdf.text(reqDoc.targetApprover, 48, 59);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary Metrics:', 15, 65);
  pdf.setFont('helvetica', 'normal');
  const valuationText =
    reqDoc.pricedItemCount > 0
      ? `  |  Est. Total: ${formatCurrency(reqDoc.estimatedUsdTotal, 'USD', { showCode: true })} (~${formatCurrency(reqDoc.estimatedZwgTotal, 'ZWG', { showCode: true })})`
      : '';
  pdf.text(
    `${reqDoc.totalItemsCount} SKU(s)  |  ${reqDoc.totalRequestedUnits.toLocaleString()} Total Order Units  |  ${reqDoc.outOfStockCount} Out of Stock, ${reqDoc.criticalCount} Critical${valuationText}`,
    44,
    65
  );

  // Justification Note
  pdf.setFont('helvetica', 'bold');
  pdf.text('Notes:', 15, 70.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(reqDoc.notes.substring(0, 108), 28, 70.5);

  // Table
  const tableStartY = 77;
  let currentY = tableStartY;

  const renderTableHeader = (y: number) => {
    pdf.setFillColor(30, 41, 59);
    pdf.rect(12, y, 186, 7, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('SKU', 15, y + 4.8);
    pdf.text('ITEM DESCRIPTION', 34, y + 4.8);
    pdf.text('PREFERRED SUPPLIER', 94, y + 4.8);
    pdf.text('ON-HAND / MIN', 142, y + 4.8, { align: 'right' });
    pdf.text('ORDER QTY', 164, y + 4.8, { align: 'right' });
    pdf.text('EST. COST', 194, y + 4.8, { align: 'right' });
  };

  renderTableHeader(currentY);
  currentY += 7;

  const rowHeight = 6.5;
  const maxTableY = 246;

  reqDoc.items.forEach((line, idx) => {
    if (currentY + rowHeight > maxTableY) {
      renderPageFooter(currentPage);
      pdf.addPage();
      currentPage++;
      renderPageHeader();
      currentY = 48;
      renderTableHeader(currentY);
      currentY += 7;
    }

    if (idx % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(12, currentY, 186, rowHeight, 'F');
    }

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(12, currentY + rowHeight, 198, currentY + rowHeight);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(line.itemId, 15, currentY + 4.5);

    pdf.setFont('helvetica', 'normal');
    const cleanName = line.itemName.length > 35 ? `${line.itemName.substring(0, 33)}...` : line.itemName;
    pdf.text(cleanName, 34, currentY + 4.5);

    pdf.setTextColor(71, 85, 105);
    const cleanSupplier = line.supplier.length > 26 ? `${line.supplier.substring(0, 24)}...` : line.supplier;
    pdf.text(cleanSupplier, 94, currentY + 4.5);

    if (line.currentQty <= 0) {
      pdf.setTextColor(190, 18, 60);
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'normal');
    }
    pdf.text(`${line.currentQty} / ${line.reorderLevel}`, 142, currentY + 4.5, { align: 'right' });

    pdf.setTextColor(13, 148, 136);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${line.requestedOrderQty} ${line.unit}`, 164, currentY + 4.5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);
    const costLabel =
      line.unitPrice && line.unitPrice > 0
        ? formatCurrency(line.estimatedLineTotal, line.currency, { showCode: true })
        : 'Quote Req.';
    pdf.text(costLabel, 194, currentY + 4.5, { align: 'right' });

    currentY += rowHeight;
  });

  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.rect(12, tableStartY, 186, Math.max(7, currentY - tableStartY));

  if (currentY + 40 > 275) {
    renderPageFooter(currentPage);
    pdf.addPage();
    currentPage++;
    renderPageHeader();
    currentY = 48;
  } else {
    currentY += 5;
  }

  // Authorization Sign-Off Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.rect(12, currentY, 186, 30, 'FD');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('PURCHASE REQUISITION AUTHORIZATION & PO RELEASE', 15, currentY + 6);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    'This requisition authorizes vendor quotation and purchase order issuance for replenishing stock below safety threshold.',
    15,
    currentY + 11.5
  );

  const sigY = currentY + 23;
  pdf.setDrawColor(100, 116, 139);
  pdf.line(15, sigY, 72, sigY);
  pdf.setFontSize(6.5);
  pdf.text(`Requested By: ${reqDoc.requestedByName}`, 15, sigY + 4);

  pdf.line(82, sigY, 138, sigY);
  pdf.text('Approved By: Rachel Pickard (ADM001)', 82, sigY + 4);

  pdf.line(146, sigY, 193, sigY);
  pdf.text(`Requisition Ref: ${reqDoc.reqNumber}`, 146, sigY + 4);

  renderPageFooter(currentPage);

  const totalPages = currentPage;
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${p} of ${totalPages}`, 188, pageHeight - 12, { align: 'right' });
  }

  const fileName = `Purchase_Requisition_${reqDoc.reqNumber}.pdf`;
  return { pdf, fileName };
}

export function createPurchaseRequisitionPdfBlob(
  reqDoc: PurchaseRequisitionDocument,
  masterFolderPath?: string
): { blob: Blob; url: string; fileName: string } {
  const { pdf, fileName } = generatePurchaseRequisitionPdf(reqDoc, masterFolderPath);
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  return { blob, url, fileName };
}

export function formatPurchaseRequisitionText(reqDoc: PurchaseRequisitionDocument): string {
  const lines = [
    `PARAMOUNT EXPORTS — PURCHASE REQUISITION [${reqDoc.reqNumber}]`,
    `Priority: ${reqDoc.priority} | Generated: ${reqDoc.generatedAt}`,
    `Requested By: ${reqDoc.requestedByName} (${reqDoc.requestedById})`,
    `Approver: ${reqDoc.targetApprover}`,
    `Items: ${reqDoc.totalItemsCount} | Total Order Units: ${reqDoc.totalRequestedUnits}`,
    reqDoc.pricedItemCount > 0
      ? `Estimated Valuation: ${formatCurrency(reqDoc.estimatedUsdTotal, 'USD', { showCode: true })} (~${formatCurrency(reqDoc.estimatedZwgTotal, 'ZWG', { showCode: true })})`
      : '',
    `Notes: ${reqDoc.notes}`,
    '',
    'SKU\tItem Name\tSupplier\tOn-Hand\tMin\tOrder Qty\tStatus',
    ...reqDoc.items.map(
      (i) =>
        `${i.itemId}\t${i.itemName}\t${i.supplier}\t${i.currentQty}\t${i.reorderLevel}\t${i.requestedOrderQty} ${i.unit}\t${i.urgencyLabel}`
    ),
  ].filter(Boolean);

  return lines.join('\n');
}
