import jsPDF from "jspdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { fetchBuyerAsset } from "../../api/platformApi";
import { fmtINR, resolveMimeType, isPdfAttachment, base64ToUint8Array } from "./contractFormatters";
import type { RfqAssetAttachment, SignDetails } from "../ContractCreationView";

// The SILA brand blue (packages/shared-ui/src/styles/tokens.css: --sila-primary), as RGB for jsPDF/pdf-lib color setters.
export const SILA_PRIMARY_RGB: [number, number, number] = [31, 92, 196];

export interface ContractPdfLineItemRow {
  idx: number;
  material: string;
  costCenterCode: string;
  qty: number;
  uom: string;
  unitPrice: number;
  breakdownStr: string;
  subtotal: number;
}

/** Everything the executed-contract PDF needs, decoupled from ContractCreationView's internal ContractState shape. */
export interface ContractPdfInput {
  contractNumber: string;
  contractName: string;
  supplierName: string;
  rfqTitle: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  lineItemRows: ContractPdfLineItemRow[];
  buyerTcContent: string;
  buyerTermsDocs: RfqAssetAttachment[];
  supplierTermsDocs: RfqAssetAttachment[];
  buyerSignDetails: SignDetails | null;
  supplierSignDetails: SignDetails | null;
  /** Preloaded SILA logo as a PNG data URL (jsPDF's addImage needs a data URI, not a plain asset URL). */
  logoDataUrl: string | null;
}

// The signer's own browser only ever records SignDetails (name/designation/drawn image) for their own
// signature - the counterparty's side only ever gets a "signed" flag plus an uploaded e-sign asset (from
// fetchESigns/rfq-by-id), never structured details. This fetches that asset so the executed-contract PDF/print
// can still show the counterparty's actual signature instead of "Not signed".
export async function resolveEffectiveSignDetails(
  own: SignDetails | null | undefined,
  signed: boolean,
  attachment: RfqAssetAttachment | undefined,
  fallbackName: string
): Promise<SignDetails | null> {
  if (own) return own;
  if (!signed) return null;
  let drawnSignatureUrl: string | undefined;
  if (attachment?.id) {
    try {
      const asset = await fetchBuyerAsset(attachment.id);
      if ("fileBytes" in asset && asset.fileBytes) {
        const fileName = asset.fileName || attachment.fileName || attachment.assetName || "signature.png";
        const mime = resolveMimeType(asset.contentType || asset.fileType, fileName);
        drawnSignatureUrl = asset.fileBytes.startsWith("data:") ? asset.fileBytes : `data:${mime};base64,${asset.fileBytes}`;
      }
    } catch {
      // Non-fatal: falls back to a text-based "/s/ Name" mark below.
    }
  }
  return {
    signerName: fallbackName,
    signerDesignation: "Authorized Representative",
    signedAt: "",
    method: "upload",
    drawnSignatureUrl,
  };
}

// Draws the cover page(s): logo, contract meta, item table, Terms & Conditions summary and signatures. Any
// actual T&C PDF files get merged in as real pages after this by buildMergedContractPdfBytes - this only notes
// their filenames here rather than listing them as plain text.
export function buildContractCoverPdfBytes(input: ContractPdfInput): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 40) {
      doc.addPage();
      y = 48;
    }
  };

  // Header: SILA logo on the left, contract name/number to its right, with a brand-colored rule beneath.
  const logoWidth = 90;
  const logoHeight = logoWidth * (101 / 420);
  let headerTextX = marginX;
  if (input.logoDataUrl) {
    try {
      doc.addImage(input.logoDataUrl, "PNG", marginX, y - 20, logoWidth, logoHeight);
      headerTextX = marginX + logoWidth + 16;
    } catch {
      // Non-fatal: the header still renders without the logo.
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...SILA_PRIMARY_RGB);
  doc.text(input.contractName, headerTextX, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(85);
  doc.text(`Contract No. ${input.contractNumber}`, headerTextX, y);
  y = Math.max(y, 4 + logoHeight) + 14;
  doc.setDrawColor(...SILA_PRIMARY_RGB);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  doc.setLineWidth(0.75);
  y += 20;

  doc.setTextColor(30);
  [
    `RFQ Title: ${input.rfqTitle}`,
    `Supplier: ${input.supplierName}`,
    `Contract Value: ${fmtINR(input.contractValue)}`,
    `Start Date: ${input.startDate}`,
    `End Date: ${input.endDate}`,
  ].forEach((line) => {
    doc.text(line, marginX, y);
    y += 14;
  });
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...SILA_PRIMARY_RGB);
  doc.text("Selected Line Items", marginX, y);
  doc.setTextColor(30);
  y += 16;

  const columns: { label: string; width: number; align: "left" | "right" }[] = [
    { label: "#", width: 20, align: "left" },
    { label: "Material", width: 110, align: "left" },
    { label: "Cost Center / Code", width: 100, align: "left" },
    { label: "Qty", width: 30, align: "right" },
    { label: "UOM", width: 35, align: "right" },
    { label: "Unit Price", width: 60, align: "right" },
    { label: "Tax/Disc/Del", width: 70, align: "right" },
    { label: "Subtotal", width: 65, align: "right" },
  ];
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

  const drawRow = (cells: string[], isHeader: boolean) => {
    if (isHeader) {
      doc.setFillColor(238, 244, 253); // --sila-primary-soft
      doc.rect(marginX, y - 9, tableWidth, 13, "F");
    }
    doc.setFont("helvetica", isHeader ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(...(isHeader ? SILA_PRIMARY_RGB : ([30, 30, 30] as [number, number, number])));
    let x = marginX;
    cells.forEach((cell, i) => {
      const col = columns[i];
      const textX = col.align === "right" ? x + col.width - 2 : x + 2;
      doc.text(cell, textX, y, { align: col.align });
      x += col.width;
    });
    doc.setDrawColor(220);
    doc.line(marginX, y + 4, marginX + tableWidth, y + 4);
    y += 14;
  };

  ensureSpace(20);
  drawRow(columns.map((c) => c.label), true);
  doc.setTextColor(30);
  input.lineItemRows.forEach((row) => {
    ensureSpace(16);
    drawRow(
      [
        String(row.idx),
        row.material,
        row.costCenterCode,
        String(row.qty),
        row.uom,
        fmtINR(row.unitPrice),
        row.breakdownStr,
        fmtINR(row.subtotal),
      ],
      false
    );
  });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...SILA_PRIMARY_RGB);
  doc.text(`Total Contract Value: ${fmtINR(input.contractValue)}`, pageWidth - marginX, y, { align: "right" });
  doc.setTextColor(30);
  y += 26;

  // Merge both parties' Terms & Conditions when each has their own; otherwise use whichever one exists.
  const writeTcSection = (label: string, docs: RfqAssetAttachment[], text?: string) => {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...SILA_PRIMARY_RGB);
    doc.text(label, marginX, y);
    doc.setTextColor(30);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50);
    const pdfDocs = docs.filter(isPdfAttachment);
    const otherDocs = docs.filter((d) => !isPdfAttachment(d));
    const lines: string[] = docs.length > 0
      ? [
          ...(pdfDocs.length > 0
            ? [`See the attached document${pdfDocs.length > 1 ? "s" : ""} below: ${pdfDocs.map((d) => d.fileName || d.assetName || "Terms & Conditions document").join(", ")}`]
            : []),
          ...otherDocs.map((d) => `- ${d.fileName || d.assetName || "Terms & Conditions document"}`),
        ]
      : doc.splitTextToSize(text || "", pageWidth - marginX * 2);
    lines.forEach((line) => {
      ensureSpace(14);
      doc.text(line, marginX, y);
      y += 13;
    });
    doc.setTextColor(30);
    y += 8;
  };

  writeTcSection("Buyer Terms & Conditions", input.buyerTermsDocs, input.buyerTcContent);
  if (input.supplierTermsDocs.length > 0) {
    writeTcSection("Supplier Terms & Conditions", input.supplierTermsDocs);
  }

  ensureSpace(120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...SILA_PRIMARY_RGB);
  doc.text("Signatures", marginX, y);
  doc.setTextColor(30);
  y += 16;

  const signBoxWidth = (pageWidth - marginX * 2 - 20) / 2;
  const writeSignature = (label: string, details: SignDetails | null | undefined, x: number) => {
    const boxTop = y;
    doc.setDrawColor(...SILA_PRIMARY_RGB);
    doc.setLineWidth(1);
    doc.rect(x, boxTop, signBoxWidth, 90);
    doc.setLineWidth(0.75);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SILA_PRIMARY_RGB);
    doc.text(label, x + 8, boxTop + 14);
    doc.setTextColor(30);
    if (!details) {
      doc.text("Not signed", x + 8, boxTop + 40);
      return;
    }
    if (details.drawnSignatureUrl) {
      try {
        doc.addImage(details.drawnSignatureUrl, "PNG", x + 8, boxTop + 18, 100, 36);
      } catch {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(13);
        doc.text(`/s/ ${details.signerName}`, x + 8, boxTop + 40);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(13);
      doc.text(`/s/ ${details.signerName}`, x + 8, boxTop + 40);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${details.signerName} (${details.signerDesignation})`, x + 8, boxTop + 66);
    if (details.signedAt) {
      doc.setTextColor(140);
      doc.text(details.signedAt, x + 8, boxTop + 80);
    }
    doc.setTextColor(30);
  };

  writeSignature("Buyer", input.buyerSignDetails, marginX);
  writeSignature(`Supplier (${input.supplierName})`, input.supplierSignDetails, marginX + signBoxWidth + 20);

  return new Uint8Array(doc.output("arraybuffer"));
}

// Merges the cover page(s) above with the real pages of any uploaded buyer/supplier Terms & Conditions PDF -
// so the executed contract is one actual combined document, not just a page listing filenames. A non-PDF
// upload (docx/image/etc.) can't be page-merged, so it stays as a filename note on the cover page only.
async function mergeTcPdfPages(target: PDFDocument, docs: RfqAssetAttachment[], sectionTitle: string) {
  for (const attachment of docs) {
    if (!attachment.id || !isPdfAttachment(attachment)) continue;
    try {
      const asset = await fetchBuyerAsset(attachment.id);
      if (!("fileBytes" in asset) || !asset.fileBytes) continue;
      const sourceDoc = await PDFDocument.load(base64ToUint8Array(asset.fileBytes), { ignoreEncryption: true });

      const dividerPage = target.addPage();
      const font = await target.embedFont(StandardFonts.HelveticaBold);
      const [r, g, b] = SILA_PRIMARY_RGB;
      dividerPage.drawText(`${sectionTitle} — ${attachment.fileName || attachment.assetName || "Attached Document"}`, {
        x: 40,
        y: dividerPage.getHeight() - 56,
        size: 13,
        font,
        color: rgb(r / 255, g / 255, b / 255),
      });

      const copiedPages = await target.copyPages(sourceDoc, sourceDoc.getPageIndices());
      copiedPages.forEach((page) => target.addPage(page));
    } catch {
      // Non-fatal: this document's real pages just won't be merged in - its filename still shows on the cover page.
    }
  }
}

export async function buildMergedContractPdfBytes(input: ContractPdfInput): Promise<Uint8Array> {
  const coverBytes = buildContractCoverPdfBytes(input);
  const merged = await PDFDocument.load(coverBytes);
  await mergeTcPdfPages(merged, input.buyerTermsDocs, "Buyer Terms & Conditions");
  await mergeTcPdfPages(merged, input.supplierTermsDocs, "Supplier Terms & Conditions");
  return merged.save();
}
