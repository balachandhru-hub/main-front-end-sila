import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  getInvoices,
  getOrganizationUnits,
  uploadInvoiceDocument,
  type Invoice,
  type OrganizationUnit,
} from "../../api/operationsApi";
import GoodsReceiptDetail from "./GoodsReceiptDetail";
import GoodsReceiptForm from "./GoodsReceiptForm";
import InvoiceDetail from "./InvoiceDetail";
import { blank, errorMessage, formatDate, formatMoney, statusBadgeClass, statusLabel, toNumberOrNull } from "./operationsFormat";
import "./Operations.css";

type View =
  | { name: "list" }
  | { name: "detail"; invoiceId: string }
  | { name: "receive"; invoiceId: string }
  | { name: "receipt"; invoiceId: string; goodsReceiptId: string };

interface UploadForm {
  operatingUnitId: string;
  supplierName: string;
  supplierTrn: string;
  supplierInvoiceNumber: string;
  invoiceDate: string;
  purchaseOrderNumber: string;
  noPurchaseOrder: boolean;
  invoiceGross: string;
  currency: string;
}

const EMPTY_UPLOAD: UploadForm = {
  operatingUnitId: "", supplierName: "", supplierTrn: "", supplierInvoiceNumber: "", invoiceDate: "",
  purchaseOrderNumber: "", noPurchaseOrder: false, invoiceGross: "", currency: "",
};

const INVOICE_STATUSES = ["UPLOADED", "PROCESSING", "REVIEW_REQUIRED", "PO_MATCHED", "READY_FOR_GRN", "GRN_POSTED", "OCR_FAILED", "FAILED"];

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Documents and invoices: upload a document, list the invoices, and open one to review, match and receive it. */
const OperationsInvoices: React.FC = () => {
  const [view, setView] = useState<View>({ name: "list" });
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [upload, setUpload] = useState<UploadForm>(EMPTY_UPLOAD);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getInvoices());
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load invoices."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view.name === "list") load();
  }, [view.name]);

  // Units only feed the optional "operating unit" choice of the upload form.
  useEffect(() => {
    getOrganizationUnits().then(setUnits).catch(() => setUnits([]));
  }, []);

  if (view.name === "detail") {
    return (
      <InvoiceDetail
        invoiceId={view.invoiceId}
        onBack={() => setView({ name: "list" })}
        onCreateReceipt={(invoice) => setView({ name: "receive", invoiceId: invoice.id })}
      />
    );
  }

  if (view.name === "receive") {
    return (
      <GoodsReceiptForm
        invoiceId={view.invoiceId}
        onCancel={() => setView({ name: "detail", invoiceId: view.invoiceId })}
        onPosted={(receipt) => setView({ name: "receipt", invoiceId: view.invoiceId, goodsReceiptId: receipt.id })}
      />
    );
  }

  if (view.name === "receipt") {
    return (
      <GoodsReceiptDetail
        goodsReceiptId={view.goodsReceiptId}
        onBack={() => setView({ name: "detail", invoiceId: view.invoiceId })}
      />
    );
  }

  const setUploadField = <K extends keyof UploadForm>(key: K, value: UploadForm[K]) =>
    setUpload((current) => ({ ...current, [key]: value }));

  const closeUpload = () => {
    setShowUpload(false);
    setUpload(EMPTY_UPLOAD);
    setFile(null);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toastService.error("Choose a PDF or an image of the invoice.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toastService.error("The file is larger than 20 MB.");
      return;
    }
    setUploading(true);
    try {
      const document = await uploadInvoiceDocument({
        file,
        operatingUnitId: upload.operatingUnitId || null,
        supplierName: blank(upload.supplierName),
        supplierTrn: blank(upload.supplierTrn),
        supplierInvoiceNumber: blank(upload.supplierInvoiceNumber),
        invoiceDate: upload.invoiceDate || null,
        purchaseOrderNumber: blank(upload.purchaseOrderNumber),
        noPurchaseOrder: upload.noPurchaseOrder,
        invoiceGross: toNumberOrNull(upload.invoiceGross),
        currency: blank(upload.currency),
      });
      toastService.success(document.message || "Document uploaded. Check the extracted fields.");
      closeUpload();
      if (document.invoiceId) {
        setView({ name: "detail", invoiceId: document.invoiceId });
      } else {
        await load();
      }
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not upload the document."));
    } finally {
      setUploading(false);
    }
  };

  const term = search.trim().toLowerCase();
  const visible = rows.filter((row) =>
    (!status || row.status === status) &&
    (!term || `${row.invoiceNumber} ${row.supplierName ?? ""} ${row.purchaseOrderNumber ?? ""}`.toLowerCase().includes(term)));

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Invoices and documents"
        description="Uploaded supplier invoices: extraction, review, matching and readiness for goods receipt."
        actions={!showUpload ? (
          <button type="button" className="sila-btn sila-btn--primary" onClick={() => setShowUpload(true)}>Upload document</button>
        ) : undefined}
      />

      {showUpload && (
        <form className="sila-card" onSubmit={handleUpload}>
          <div className="sila-card-header">
            <h2 className="sila-card-title">Upload an invoice document</h2>
          </div>
          <div className="sila-card-body">
            <div className="sila-form-grid">
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="invoice-upload-file">Document<span className="sila-required">*</span></label>
                <input
                  id="invoice-upload-file"
                  type="file"
                  className="sila-input"
                  accept="application/pdf,image/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <span className="sila-help">PDF or image, up to 20 MB. The fields below are optional: anything left empty is read from the document.</span>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="invoice-upload-unit">Operating unit</label>
                <select id="invoice-upload-unit" className="sila-select" value={upload.operatingUnitId} onChange={(event) => setUploadField("operatingUnitId", event.target.value)}>
                  <option value="">Not specified</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}
                </select>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="invoice-upload-supplier">Supplier name</label>
                <input id="invoice-upload-supplier" className="sila-input" value={upload.supplierName} onChange={(event) => setUploadField("supplierName", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="invoice-upload-trn">Supplier tax number (TRN)</label>
                <input id="invoice-upload-trn" className="sila-input" value={upload.supplierTrn} onChange={(event) => setUploadField("supplierTrn", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="invoice-upload-number">Invoice number</label>
                <input id="invoice-upload-number" className="sila-input" value={upload.supplierInvoiceNumber} onChange={(event) => setUploadField("supplierInvoiceNumber", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="invoice-upload-date">Invoice date</label>
                <input id="invoice-upload-date" type="date" className="sila-input" value={upload.invoiceDate} onChange={(event) => setUploadField("invoiceDate", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="invoice-upload-po">Purchase order number</label>
                <input id="invoice-upload-po" className="sila-input" value={upload.noPurchaseOrder ? "" : upload.purchaseOrderNumber} disabled={upload.noPurchaseOrder} onChange={(event) => setUploadField("purchaseOrderNumber", event.target.value)} />
                <label className="ops-check">
                  <input type="checkbox" checked={upload.noPurchaseOrder} onChange={(event) => setUploadField("noPurchaseOrder", event.target.checked)} />
                  No purchase order for this invoice
                </label>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="invoice-upload-gross">Gross amount</label>
                <input id="invoice-upload-gross" type="number" step="any" className="sila-input" value={upload.invoiceGross} onChange={(event) => setUploadField("invoiceGross", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="invoice-upload-currency">Currency</label>
                <input id="invoice-upload-currency" className="sila-input" value={upload.currency} onChange={(event) => setUploadField("currency", event.target.value)} />
              </div>
            </div>
          </div>
          <div className="sila-card-footer">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={closeUpload} disabled={uploading}>Cancel</button>
            <button type="submit" className="sila-btn sila-btn--primary" disabled={uploading || !file}>
              {uploading ? "Uploading and reading..." : "Upload"}
            </button>
          </div>
        </form>
      )}

      <section className="sila-card">
        <div className="sila-toolbar">
          <div className="sila-toolbar-group">
            <label className="sila-visually-hidden" htmlFor="invoice-search">Search invoices</label>
            <input id="invoice-search" className="sila-input" placeholder="Invoice, supplier or PO number" value={search} onChange={(event) => setSearch(event.target.value)} />
            <label className="sila-visually-hidden" htmlFor="invoice-status">Status</label>
            <select id="invoice-status" className="sila-select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {INVOICE_STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
            </select>
          </div>
          <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={load} disabled={loading}>Refresh</button>
        </div>
        {loading ? (
          <Loader size={24} message="Loading invoices..." />
        ) : error ? (
          <EmptyState
            variant="error"
            title="Couldn't load invoices"
            description={error}
            action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? "No invoices yet" : "No matching invoices"}
            description={rows.length === 0 ? "Upload a supplier invoice to start." : "Change the search or the status filter."}
          />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Invoice date</th>
                  <th scope="col">Purchase order</th>
                  <th scope="col" className="ops-num">Gross</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className="sila-row-clickable"
                    tabIndex={0}
                    onClick={() => setView({ name: "detail", invoiceId: row.id })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setView({ name: "detail", invoiceId: row.id });
                      }
                    }}
                  >
                    <td>
                      <span className="sila-cell-strong">{row.invoiceNumber || "No invoice number"}</span>
                      <div className="sila-help">Captured {formatDate(row.createdAt)}</div>
                    </td>
                    <td>
                      {row.supplierName || "Supplier pending"}
                      {!row.supplierId && <div className="sila-help">Not matched</div>}
                    </td>
                    <td>{formatDate(row.invoiceDate)}</td>
                    <td>{row.purchaseOrderNumber || "—"}{row.purchaseOrderNumber && !row.purchaseOrderId && <div className="sila-help">Not matched</div>}</td>
                    <td className="ops-num">{formatMoney(row.grossAmount, row.currency)}</td>
                    <td>{statusLabel(row.invoiceType)}</td>
                    <td><span className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default OperationsInvoices;
