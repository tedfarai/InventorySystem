import jsPDF from 'jspdf';
import { AdjustmentDocument, IssuedDocument, ReceivedDocument } from '../types';
import { getPexGreenLogoDataUrl } from '../components/brand/brandLogoData';
import type { DisplayableDocument } from '../components/simulator/DocumentViewerModal';

export interface VoucherPdfFile {
  blob: Blob;
  url: string;
  fileName: string;
}

export function buildVoucherPdf(docObj: DisplayableDocument): jsPDF {
  const isDelivery = docObj.type === 'DELIVERY';
  const isAdjustment = docObj.type === 'ADJUSTMENT';
  const isIssue = docObj.type === 'ISSUE';
  const isIssueManager = isIssue && String((docObj.data as IssuedDocument)?.deptID || '').startsWith('MGR-');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Outer Page Border
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.5);
    pdf.rect(10, 10, 190, 277);

    // Top Header Container Cell (Height: 32mm)
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.5);
    pdf.rect(12, 12, 186, 32);

    // Official Organization Logo: PEX Green (2).png attached as-is at top-left corner
    const logoData = getPexGreenLogoDataUrl();
    try {
      pdf.addImage(logoData, 'PNG', 14.5, 14, 16, 28);
    } catch {
      pdf.setFillColor(36, 40, 45);
      pdf.rect(14.5, 14, 16, 28, 'F');
      pdf.setFillColor(198, 217, 44);
      pdf.setDrawColor(198, 217, 44);
      pdf.circle(20, 19, 2, 'F');
      pdf.setLineWidth(1.4);
      pdf.line(20, 21, 21, 29);
      pdf.line(20, 22, 16, 27);
      pdf.line(21, 29, 17, 37);
      pdf.line(21, 29, 25, 37);
      pdf.setTextColor(198, 217, 44);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('paramount', 28, 36, { angle: 90 });
    }

    // Top-Left Logo Column Vertical Separator Line
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.5);
    pdf.line(33, 12, 33, 44);

    // Document Title and Organization Headings (Top-Left Aligned Next to Logo)
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    const docTitle = isDelivery
      ? 'GOODS / ITEMS RECEIVED VOUCHER (GRN)'
      : isAdjustment
      ? 'STOCK ADJUSTMENT & PHYSICAL COUNT VOUCHER'
      : 'STATIONERY & CLEANING ITEM ISSUE SLIP';
    pdf.text(docTitle, 37, 21);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text('PARAMOUNT PROCUREMENT & INVENTORY CONTROL', 37, 27);

    // Saved Location & Reference Notice in Header
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    const saveLoc = `Save Location: ${docObj.data.fullSavedPath}`;
    const refNum = isDelivery
      ? (docObj.data as ReceivedDocument).voucherNumber
      : isAdjustment
      ? (docObj.data as AdjustmentDocument).voucherNumber
      : (docObj.data as IssuedDocument).slipNumber;
    pdf.text(`Voucher Ref: ${refNum}  |  Generated: ${docObj.data.timestamp}`, 37, 33);
    pdf.text(saveLoc.substring(0, 82), 37, 39);

    // Metadata Table Box
    pdf.setDrawColor(148, 163, 184); // slate-400
    pdf.setLineWidth(0.3);
    pdf.rect(12, 47, 186, 44);

    // Metadata Lines
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);

    if (isDelivery) {
      const delDoc = docObj.data as ReceivedDocument;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Voucher GRN Ref:', 16, 54);
      pdf.setFont('helvetica', 'normal');
      pdf.text(delDoc.voucherNumber, 62, 54);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Delivery Note Ref:', 16, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.text(delDoc.deliveryRef || 'N/A', 62, 60);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Received Timestamp:', 16, 66);
      pdf.setFont('helvetica', 'normal');
      pdf.text(delDoc.timestamp, 62, 66);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Receiving User / Issuer:', 16, 72);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${delDoc.issuerName} (${delDoc.issuerID}) - ${delDoc.issuerRole || 'Procurement Officer'}`, 62, 72);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Storage Directory:', 16, 78);
      pdf.setFont('helvetica', 'normal');
      pdf.text(delDoc.folderPath, 62, 78);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Target Worksheet:', 16, 84);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Master_Stock (Quantities Updated) & Movement_Log (Read-Only Audit Trail)', 62, 84);
    } else if (isAdjustment) {
      const adjDoc = docObj.data as AdjustmentDocument;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Adjustment Voucher Ref:', 16, 54);
      pdf.setFont('helvetica', 'normal');
      pdf.text(adjDoc.voucherNumber, 62, 54);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Count Reference / Tag:', 16, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.text(adjDoc.countRef, 62, 60);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Discrepancy Reason:', 16, 66);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${adjDoc.reasonLabel} [${adjDoc.reasonCode}]`, 62, 66);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Auditor / Controller:', 16, 72);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${adjDoc.issuerName} (${adjDoc.issuerID})`, 62, 72);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Audit Remarks / Notes:', 16, 78);
      pdf.setFont('helvetica', 'normal');
      pdf.text(adjDoc.notes ? adjDoc.notes.substring(0, 60) : 'Physical inventory discrepancy reconciled.', 62, 78);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Storage Directory:', 16, 84);
      pdf.setFont('helvetica', 'normal');
      pdf.text(adjDoc.folderPath, 62, 84);
    } else {
      const issueDoc = docObj.data as IssuedDocument;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Slip Reference:', 16, 54);
      pdf.setFont('helvetica', 'normal');
      pdf.text(issueDoc.slipNumber, 62, 54);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Issue Timestamp:', 16, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.text(issueDoc.timestamp, 62, 60);

      const isManager = String(issueDoc.deptID || '').startsWith('MGR-');
      pdf.setFont('helvetica', 'bold');
      pdf.text(isManager ? 'Requesting Entity:' : 'Target Department:', 16, 66);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${issueDoc.deptID || 'DEP'} - ${issueDoc.deptName || 'Department'}`, 62, 66);

      pdf.setFont('helvetica', 'bold');
      pdf.text(isManager ? 'Authorized Manager:' : 'Department Head:', 16, 72);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${issueDoc.deptHeadName || 'Manager'} (${issueDoc.deptHeadEmail || 'stores@paramount.co.zw'})`, 62, 72);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Authorized Issuer:', 16, 78);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${issueDoc.issuerName} (${issueDoc.issuerID})`, 62, 78);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Storage Directory:', 16, 84);
      pdf.setFont('helvetica', 'normal');
      pdf.text(issueDoc.folderPath, 62, 84);
    }

    // Items Table Header
    let y = 97;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(12, y, 186, 9, 'F');
    pdf.rect(12, y, 186, 9, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);

    if (isAdjustment) {
      pdf.text('Item Code', 15, y + 6);
      pdf.text('Item Description', 42, y + 6);
      pdf.text('System Qty', 105, y + 6);
      pdf.text('Physical Count', 132, y + 6);
      pdf.text('Variance Delta', 165, y + 6);
    } else {
      pdf.text('Item Code', 16, y + 6);
      pdf.text('Item Description', 50, y + 6);
      pdf.text('Category', 130, y + 6);
      pdf.text(isDelivery ? 'Qty Received' : 'Qty Issued', 170, y + 6);
    }

    // Items List
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    y += 9;

    if (isAdjustment) {
      const adjItems = Array.isArray((docObj.data as AdjustmentDocument).items) ? (docObj.data as AdjustmentDocument).items : [];
      adjItems.forEach((item) => {
        pdf.rect(12, y, 186, 8.5, 'S');
        pdf.text(item?.ItemID || '', 15, y + 5.5);
        pdf.text(item?.ItemName || '', 42, y + 5.5);
        pdf.text(`${item?.SystemQty || 0} ${item?.Unit || ''}`, 105, y + 5.5);
        pdf.text(`${item?.PhysicalQty || 0} ${item?.Unit || ''}`, 132, y + 5.5);
        const varStr = (item?.VarianceQty || 0) > 0 ? `+${item.VarianceQty}` : `${item?.VarianceQty || 0}`;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${varStr} ${item?.Unit || ''}`, 165, y + 5.5);
        pdf.setFont('helvetica', 'normal');
        y += 8.5;
      });
    } else {
      const itemsList = Array.isArray(docObj.data?.items) ? docObj.data.items : [];
      itemsList.forEach((item) => {
        pdf.rect(12, y, 186, 8, 'S');
        pdf.text(item?.ItemID || '', 16, y + 5.5);
        pdf.text(item?.ItemName || '', 50, y + 5.5);
        pdf.text(item?.Category || '', 130, y + 5.5);
        pdf.text(String(item?.Qty || 0), 175, y + 5.5);
        y += 8;
      });
    }

    // Bottom Signatures & Digital Stamp Section
    y += 18;

    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.4);
    pdf.rect(12, y, 88, 32);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      isDelivery
        ? 'Receiver / Inspector Signature'
        : isAdjustment
        ? 'Physical Stock Counter / Auditor'
        : 'Issuer Signature & Stamp',
      16,
      y + 6
    );

    const timeData = docObj.data;
    const digitalSig = `${timeData.timestamp}-${timeData.issuerID}`;
    pdf.setFillColor(isDelivery ? 239 : isAdjustment ? 254 : 240, isDelivery ? 246 : isAdjustment ? 243 : 253, isDelivery ? 255 : isAdjustment ? 199 : 244);
    pdf.rect(16, y + 10, 80, 14, 'F');
    pdf.setDrawColor(isDelivery ? 37 : isAdjustment ? 217 : 16, isDelivery ? 99 : isAdjustment ? 119 : 185, isDelivery ? 235 : isAdjustment ? 6 : 129);
    pdf.rect(16, y + 10, 80, 14, 'S');

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(isDelivery ? 29 : isAdjustment ? 180 : 5, isDelivery ? 78 : isAdjustment ? 83 : 150, isDelivery ? 216 : isAdjustment ? 9 : 105);
    pdf.text('DIGITAL VERIFICATION STAMP:', 18, y + 15);
    pdf.setFontSize(8);
    pdf.text(digitalSig, 18, y + 20);

    // Right Box: Verification / Approval Sign
    pdf.setDrawColor(100, 116, 139);
    pdf.rect(110, y, 88, 32);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      isDelivery
        ? 'Warehouse Master Verification'
        : isAdjustment
        ? 'Procurement Manager Signoff (ADM001)'
        : isIssueManager
        ? 'Authorized Manager Signature'
        : 'Department Head Signature',
      114,
      y + 6
    );

    pdf.setDrawColor(148, 163, 184);
    pdf.line(114, y + 22, 192, y + 22);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    const signName = isDelivery
      ? `Receiver: ${docObj.data.issuerName}`
      : isAdjustment
      ? `Approved: Rachel Pickard (Procurement Manager)`
      : `Recipient: ${(docObj.data as IssuedDocument).deptHeadName}`;
    pdf.text(signName, 114, y + 27);
    return pdf;
}


export async function generateVoucherPdfFile(document: DisplayableDocument): Promise<VoucherPdfFile> {
  await Promise.resolve();
  const pdf = buildVoucherPdf(document);
  const blob = pdf.output('blob');
  if (!(blob instanceof Blob) || blob.size === 0 || blob.type !== 'application/pdf') {
    throw new Error('Voucher PDF generation did not produce a valid application/pdf Blob.');
  }

  const url = URL.createObjectURL(blob);
  try {
    if (new URL(url).protocol !== 'blob:') {
      throw new Error('Voucher PDF preview URL is not a valid Blob URL.');
    }
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  const { type, data } = document;
  const fallbackName = type === 'DELIVERY'
    ? `Stationery_&_Cleaning_GRN_Voucher_${(data as ReceivedDocument).voucherNumber}.pdf`
    : type === 'ADJUSTMENT'
    ? `Stationery_&_Cleaning_Stock_Adjustment_${(data as AdjustmentDocument).voucherNumber}.pdf`
    : `Stationery_&_Cleaning_IssueSlip_${(data as IssuedDocument).slipNumber}.pdf`;

  return { blob, url, fileName: data.pdfFileName || fallbackName };
}

export function printPdfFromUrl(url: string): void {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Cannot print: the generated PDF URL is invalid.');
  }
  if (parsedUrl.protocol !== 'blob:') {
    throw new Error('Cannot print: the generated PDF URL is not a Blob URL.');
  }

  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    throw new Error('The PDF print window was blocked. Allow pop-ups and try again.');
  }

  let hasPrinted = false;
  const printWhenReady = () => {
    if (hasPrinted || printWindow.closed) return;
    hasPrinted = true;
    printWindow.focus();
    printWindow.print();
  };
  printWindow.addEventListener('load', printWhenReady, { once: true });
  window.setTimeout(printWhenReady, 800);
}
