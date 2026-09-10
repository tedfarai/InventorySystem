import jsPDF from 'jspdf';
import { StockItem, AdminUser } from '../types';
import { getPexGreenLogoDataUrl } from '../components/brand/brandLogoData';

export interface ReorderItemAnalysis {
  item: StockItem;
  currentQty: number;
  reorderLevel: number;
  shortageQty: number;
  recommendedOrderQty: number;
  targetRestockLevel: number;
  urgency: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW_STOCK';
  urgencyLabel: string;
}

export interface ReorderReportSummary {
  reportRef: string;
  generatedAt: string;
  totalInventoryCount: number;
  belowThresholdCount: number;
  outOfStockCount: number;
  criticalCount: number;
  lowStockCount: number;
  totalRecommendedUnits: number;
  categoryBreakdown: {
    Stationery: { count: number; recommendedUnits: number };
    Cleaning: { count: number; recommendedUnits: number };
    General: { count: number; recommendedUnits: number };
  };
  items: ReorderItemAnalysis[];
}

/**
 * Analyzes stock items and extracts all items that are at or below their safety threshold (Reorder Level).
 */
export function analyzeReorderInventory(stockItems: StockItem[]): ReorderReportSummary {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const reportRef = `ROR-${dateStr}-${timeStr}`;

  const categoryBreakdown = {
    Stationery: { count: 0, recommendedUnits: 0 },
    Cleaning: { count: 0, recommendedUnits: 0 },
    General: { count: 0, recommendedUnits: 0 },
  };

  let outOfStockCount = 0;
  let criticalCount = 0;
  let lowStockCount = 0;
  let totalRecommendedUnits = 0;

  const analyzedItems: ReorderItemAnalysis[] = [];

  stockItems.forEach((item) => {
    const currentQty = Number(item.Qty) || 0;
    const reorderLevel = Number(item.ReorderLevel) || 10;

    // Safety threshold check: item needs reorder if currentQty <= reorderLevel
    if (currentQty <= reorderLevel) {
      const shortageQty = Math.max(0, reorderLevel - currentQty);
      // Recommended Order Qty: replenish to 2x safety stock plus buffer, minimum 10 units
      const targetRestockLevel = Math.max(reorderLevel * 2, 20);
      const recommendedOrderQty = Math.max(targetRestockLevel - currentQty, reorderLevel, 10);

      let urgency: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW_STOCK' = 'LOW_STOCK';
      let urgencyLabel = 'LOW STOCK';

      if (currentQty <= 0) {
        urgency = 'OUT_OF_STOCK';
        urgencyLabel = 'OUT OF STOCK';
        outOfStockCount++;
      } else if (currentQty <= Math.ceil(reorderLevel * 0.5)) {
        urgency = 'CRITICAL';
        urgencyLabel = 'CRITICAL';
        criticalCount++;
      } else {
        lowStockCount++;
      }

      totalRecommendedUnits += recommendedOrderQty;

      const cat = item.Category || 'General';
      if (categoryBreakdown[cat]) {
        categoryBreakdown[cat].count++;
        categoryBreakdown[cat].recommendedUnits += recommendedOrderQty;
      }

      analyzedItems.push({
        item,
        currentQty,
        reorderLevel,
        shortageQty,
        recommendedOrderQty,
        targetRestockLevel,
        urgency,
        urgencyLabel,
      });
    }
  });

  // Sort by urgency (OUT_OF_STOCK first, then CRITICAL, then LOW_STOCK) and then highest shortage
  const urgencyWeight = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW_STOCK: 2 };
  analyzedItems.sort((a, b) => {
    if (urgencyWeight[a.urgency] !== urgencyWeight[b.urgency]) {
      return urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
    }
    return b.shortageQty - a.shortageQty;
  });

  return {
    reportRef,
    generatedAt: now.toLocaleString('en-GB', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }),
    totalInventoryCount: stockItems.length,
    belowThresholdCount: analyzedItems.length,
    outOfStockCount,
    criticalCount,
    lowStockCount,
    totalRecommendedUnits,
    categoryBreakdown,
    items: analyzedItems,
  };
}

/**
 * Compiles and generates a professional, high-fidelity printable PDF Reorder Summary for the Procurement Manager.
 */
export function generateReorderReportPdf(
  summary: ReorderReportSummary,
  currentUser: AdminUser | null,
  masterFolderPath: string = 'C:\\Stationery & Cleaning\\Master\\'
): { pdf: jsPDF; fileName: string } {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm
  const targetManager = 'Rachel Pickard';
  const targetRole = 'Procurement Manager / Superior Admin (ADM001)';
  const activeUser = currentUser ? `${currentUser.IssuerName} (${currentUser.IssuerID})` : `${targetManager} (ADM001)`;

  let currentPage = 1;
  let totalPages = 1; // will compute dynamically or update in footer loop

  const renderPageHeader = (pageNumber: number) => {
    // Outer Page Border
    pdf.setDrawColor(30, 41, 59); // slate-800
    pdf.setLineWidth(0.4);
    pdf.rect(margin, margin, contentWidth, pageHeight - margin * 2);

    // Top Header Container Box (Height: 34mm)
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.rect(12, 12, 186, 32, 'F');
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.4);
    pdf.rect(12, 12, 186, 32);

    // Logo on top-left
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

    // Logo Separator Line
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.4);
    pdf.line(32, 12, 32, 44);

    // Title and Subtitle
    pdf.setTextColor(15, 23, 42); // slate-900
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STOCK REORDER & SAFETY THRESHOLD AUDIT REPORT', 35, 20);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(13, 148, 136); // teal-600
    pdf.text('PARAMOUNT PROCUREMENT & INVENTORY CONTROL', 35, 26);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105); // slate-600
    pdf.text(`Report Ref: ${summary.reportRef}  |  Generated: ${summary.generatedAt}`, 35, 32);
    pdf.text(
      `Prepared for: ${targetManager} - ${targetRole}  |  Target Save: ${masterFolderPath}Reports\\`,
      35,
      38
    );
  };

  const renderPageFooter = (pageNumber: number) => {
    const footerY = pageHeight - 14;
    pdf.setDrawColor(203, 213, 225); // slate-300
    pdf.setLineWidth(0.3);
    pdf.line(14, footerY - 2, 196, footerY - 2);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      'CONFIDENTIAL — Official Procurement & Inventory Control Record | ISO-9001 Safety Stock Protocol',
      14,
      footerY + 2
    );
    pdf.text(`Page ${pageNumber}`, 188, footerY + 2, { align: 'right' });
  };

  // Draw Page 1 Header
  renderPageHeader(1);

  // Executive Summary Analytics Box (Height: 32mm)
  pdf.setFillColor(241, 245, 249); // slate-100
  pdf.setDrawColor(148, 163, 184); // slate-400
  pdf.setLineWidth(0.3);
  pdf.rect(12, 47, 186, 30, 'FD');

  // Box Title
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('EXECUTIVE REORDER METRICS & DEFICIT SUMMARY', 15, 53);

  // 4 KPI Metric Columns
  const colW = 44;
  const startX = 15;

  // Metric 1: Below Threshold
  pdf.setFillColor(254, 242, 242); // rose-50
  pdf.setDrawColor(254, 202, 202); // rose-200
  pdf.roundedRect(startX, 56, colW, 18, 1.5, 1.5, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(159, 18, 57); // rose-800
  pdf.text('BELOW THRESHOLD', startX + 3, 61);
  pdf.setFontSize(12);
  pdf.text(`${summary.belowThresholdCount}`, startX + 3, 70);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`of ${summary.totalInventoryCount} items (${Math.round((summary.belowThresholdCount / Math.max(1, summary.totalInventoryCount)) * 100)}%)`, startX + 16, 70);

  // Metric 2: Out of Stock
  const m2X = startX + colW + 3;
  pdf.setFillColor(255, 241, 242); // red-50
  pdf.setDrawColor(254, 205, 211); // red-200
  pdf.roundedRect(m2X, 56, colW, 18, 1.5, 1.5, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(190, 18, 60); // red-800
  pdf.text('OUT OF STOCK (0 QTY)', m2X + 3, 61);
  pdf.setFontSize(12);
  pdf.text(`${summary.outOfStockCount}`, m2X + 3, 70);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Immediate Replenishment`, m2X + 16, 70);

  // Metric 3: Critical Low
  const m3X = m2X + colW + 3;
  pdf.setFillColor(254, 243, 199); // amber-50
  pdf.setDrawColor(253, 230, 138); // amber-200
  pdf.roundedRect(m3X, 56, colW, 18, 1.5, 1.5, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(146, 64, 14); // amber-800
  pdf.text('CRITICAL / LOW STOCK', m3X + 3, 61);
  pdf.setFontSize(12);
  pdf.text(`${summary.criticalCount + summary.lowStockCount}`, m3X + 3, 70);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`${summary.criticalCount} Crit | ${summary.lowStockCount} Low`, m3X + 16, 70);

  // Metric 4: Total Order Units
  const m4X = m3X + colW + 3;
  pdf.setFillColor(240, 253, 250); // teal-50
  pdf.setDrawColor(153, 246, 228); // teal-200
  pdf.roundedRect(m4X, 56, colW, 18, 1.5, 1.5, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 94, 89); // teal-800
  pdf.text('RECOMMENDED ORDER', m4X + 3, 61);
  pdf.setFontSize(12);
  pdf.text(`${summary.totalRecommendedUnits.toLocaleString()}`, m4X + 3, 70);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Total Units To Restock`, m4X + 22, 70);

  // Table Headers
  const tableStartY = 81;
  let currentY = tableStartY;

  const renderTableHeader = (y: number) => {
    pdf.setFillColor(30, 41, 59); // slate-800
    pdf.rect(12, y, 186, 7, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);

    // Columns: ItemID (22), Description (58), Category (22), On-Hand (16), Safety Level (18), Deficit (16), Reorder Qty (18), Urgency (16)
    pdf.text('ITEM ID', 15, y + 5);
    pdf.text('ITEM DESCRIPTION', 38, y + 5);
    pdf.text('CATEGORY', 98, y + 5);
    pdf.text('ON-HAND', 122, y + 5, { align: 'right' });
    pdf.text('THRESHOLD', 142, y + 5, { align: 'right' });
    pdf.text('DEFICIT', 159, y + 5, { align: 'right' });
    pdf.text('ORDER QTY', 178, y + 5, { align: 'right' });
    pdf.text('STATUS', 195, y + 5, { align: 'right' });
  };

  renderTableHeader(currentY);
  currentY += 7;

  if (summary.items.length === 0) {
    // All items healthy state
    pdf.setFillColor(240, 253, 244); // emerald-50
    pdf.setDrawColor(187, 247, 208); // emerald-200
    pdf.rect(12, currentY, 186, 24, 'FD');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(22, 101, 52); // emerald-800
    pdf.text('ALL INVENTORY ITEMS ARE OPTIMAL & ABOVE SAFETY THRESHOLDS', 20, currentY + 11);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(21, 128, 61);
    pdf.text(
      `All ${summary.totalInventoryCount} stock items meet or exceed their configured safety stock requirements. No purchase order required at this time.`,
      20,
      currentY + 18
    );
    currentY += 28;
  } else {
    // Render each item row
    const rowHeight = 6.2;
    const maxTableY = 245; // Leave room for signatures and footer

    summary.items.forEach((itemAnalysis, idx) => {
      // Check for page break
      if (currentY + rowHeight > maxTableY) {
        renderPageFooter(currentPage);
        pdf.addPage();
        currentPage++;
        renderPageHeader(currentPage);
        currentY = 48;
        renderTableHeader(currentY);
        currentY += 7;
      }

      // Zebra striping
      if (idx % 2 === 0) {
        pdf.setFillColor(248, 250, 252); // slate-50
        pdf.rect(12, currentY, 186, rowHeight, 'F');
      }

      // Border line under row
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.2);
      pdf.line(12, currentY + rowHeight, 198, currentY + rowHeight);

      // Item ID
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(itemAnalysis.item.ItemID, 15, currentY + 4.4);

      // Item Name (truncated to 34 chars)
      pdf.setFont('helvetica', 'normal');
      const cleanName = itemAnalysis.item.ItemName.length > 38
        ? `${itemAnalysis.item.ItemName.substring(0, 36)}...`
        : itemAnalysis.item.ItemName;
      pdf.text(cleanName, 38, currentY + 4.4);

      // Category
      pdf.setTextColor(71, 85, 105);
      pdf.text(itemAnalysis.item.Category, 98, currentY + 4.4);

      // On-Hand Qty
      if (itemAnalysis.currentQty <= 0) {
        pdf.setTextColor(225, 29, 72); // rose-600
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'normal');
      }
      pdf.text(`${itemAnalysis.currentQty} ${itemAnalysis.item.Unit || 'Units'}`, 122, currentY + 4.4, { align: 'right' });

      // Safety Threshold
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text(`${itemAnalysis.reorderLevel}`, 142, currentY + 4.4, { align: 'right' });

      // Deficit
      pdf.setTextColor(220, 38, 38); // red-600
      pdf.setFont('helvetica', 'bold');
      pdf.text(`-${itemAnalysis.shortageQty}`, 159, currentY + 4.4, { align: 'right' });

      // Recommended Order Qty
      pdf.setTextColor(13, 148, 136); // teal-600
      pdf.text(`+${itemAnalysis.recommendedOrderQty}`, 178, currentY + 4.4, { align: 'right' });

      // Status Badge Text
      if (itemAnalysis.urgency === 'OUT_OF_STOCK') {
        pdf.setTextColor(190, 18, 60); // red-800
        pdf.setFont('helvetica', 'bold');
        pdf.text('OUT OF STOCK', 195, currentY + 4.4, { align: 'right' });
      } else if (itemAnalysis.urgency === 'CRITICAL') {
        pdf.setTextColor(180, 83, 9); // amber-700
        pdf.setFont('helvetica', 'bold');
        pdf.text('CRITICAL', 195, currentY + 4.4, { align: 'right' });
      } else {
        pdf.setTextColor(71, 85, 105);
        pdf.setFont('helvetica', 'normal');
        pdf.text('LOW STOCK', 195, currentY + 4.4, { align: 'right' });
      }

      currentY += rowHeight;
    });

    // Table Outer Border
    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.3);
    pdf.rect(12, tableStartY, 186, currentY - tableStartY);
  }

  // Check if we need extra space for Manager Sign-off section
  if (currentY + 38 > 275) {
    renderPageFooter(currentPage);
    pdf.addPage();
    currentPage++;
    renderPageHeader(currentPage);
    currentY = 48;
  } else {
    currentY += 4;
  }

  // Procurement Manager Sign-off & PO Authorization Block
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.rect(12, currentY, 186, 30, 'FD');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('PROCUREMENT MANAGER REQUISITION APPROVAL & SIGN-OFF', 15, currentY + 6);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    'I hereby authorize the purchase and replenishment of all items detailed above in accordance with ISO safety threshold policies.',
    15,
    currentY + 11
  );

  // Signature lines
  const sigY = currentY + 22;

  // Manager signature
  pdf.setDrawColor(100, 116, 139);
  pdf.setLineWidth(0.3);
  pdf.line(15, sigY, 75, sigY);
  pdf.setFontSize(6.5);
  pdf.text(`Authorized by: ${targetManager} (Procurement Mgr)`, 15, sigY + 4);

  // Date
  pdf.line(85, sigY, 130, sigY);
  pdf.text(`Authorization Date: ${new Date().toLocaleDateString('en-GB')}`, 85, sigY + 4);

  // Purchase Order Ref
  pdf.line(140, sigY, 192, sigY);
  pdf.text(`Purchase Order Reference: PO-${summary.reportRef.substring(4)}`, 140, sigY + 4);

  renderPageFooter(currentPage);

  // Total pages pass to update footers
  totalPages = currentPage;
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${p} of ${totalPages}`, 188, pageHeight - 12, { align: 'right' });
  }

  const fileName = `Reorder_Report_${summary.reportRef}.pdf`;
  return { pdf, fileName };
}
