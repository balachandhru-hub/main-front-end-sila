import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  advancedRereadInvoice,
  getInvoice,
  getInvoiceExtraction,
  getInvoiceExtractionHistory,
  processInvoice,
  reprocessInvoice,
  updateInvoice,
  type ExtractionHistoryItem,
  type Invoice,
  type InvoiceExtraction,
  type InvoiceUpdateInput,
} from "../../api/operationsApi";
import InvoiceDocumentPanel from "./InvoiceDocumentPanel";
import InvoiceMatching from "./InvoiceMatching";
import {
  blank,
  errorMessage,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercent,
  statusBadgeClass,
  statusLabel,
  toNumberOrNull,
} from "./operationsFormat";
import "./Operations.css";

interface InvoiceDetailProps {
  invoiceId: string;
  onBack: () => void;
  /** Opens the goods receipt form for this invoice. */
  onCreateReceipt: (invoice: Invoice) => void;
}

interface ReviewForm {
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  supplierTaxNumber: string;
  poNumber: string;
  noPurchaseOrder: boolean;
  currency: string;
  netAmount: string;
  taxAmount: string;
  grossAmount: string;
}

type Action = "save" | "process" | "reprocess" | "reread";

const amount = (value?: number | null): string => (value === null || value === undefined ? "" : String(value));

const toForm = (invoice: Invoice, noPurchaseOrder: boolean): ReviewForm => ({
  invoiceNumber: invoice.invoiceNumber ?? "",
  invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.slice(0, 10) : "",
  supplierName: invoice.supplierName ?? "",
  supplierTaxNumber: invoice.supplierTaxNumber ?? "",
  poNumber: invoice.purchaseOrderNumber ?? "",
  noPurchaseOrder,
  currency: invoice.currency ?? "",
  netAmount: amount(invoice.netAmount),
  taxAmount: amount(invoice.taxAmount),
  grossAmount: amount(invoice.grossAmount),
});

/** Review one invoice: correct the extracted fields, match it, re-run the extraction, and receive it. */
const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId, onBack, onCreateReceipt }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [extraction, setExtraction] = useState<InvoiceExtraction | null>(null);
  const [history, setHistory] = useState<ExtractionHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [form, setForm] = useState<ReviewForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);

  const applyInvoice = (row: Invoice, noPurchaseOrder = false) => {
    setInvoice(row);
    setForm(toForm(row, noPurchaseOrder));
  };

  // Extraction details are secondary: the invoice still opens when they cannot be read.
  const loadExtraction = async () => {
    setHistoryError(null);
    const [extractionResult, historyResult] = await Promise.allSettled([
      getInvoiceExtraction(invoiceId),
      getInvoiceExtractionHistory(invoiceId),
    ]);
    setExtraction(extractionResult.status === "fulfilled" ? extractionResult.value : null);
    if (historyResult.status === "fulfilled") {
      setHistory(historyResult.value);
    } else {
      setHistory([]);
      setHistoryError(errorMessage(historyResult.reason, "Could not load the extraction history."));
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      applyInvoice(await getInvoice(invoiceId));
      await loadExtraction();
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the invoice."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [invoiceId]);

  if (loading) return <Loader size={24} message="Loading invoice..." />;
  if (error || !invoice || !form) {
    return (
      <div className="ops-section">
        <PageHeader className="pud-page-header" title="Invoice" onBack={onBack} backLabel="Back to invoices" />
        <EmptyState
          variant="error"
          title="Couldn't load the invoice"
          description={error ?? "The invoice was not returned."}
          action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
        />
      </div>
    );
  }

  const setField = <K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.invoiceNumber.trim()) {
      toastService.error("Enter the invoice number.");
      return;
    }
    const payload: InvoiceUpdateInput = {
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceDate: form.invoiceDate || null,
      supplierName: blank(form.supplierName),
      supplierTaxNumber: blank(form.supplierTaxNumber),
      poNumber: form.noPurchaseOrder ? null : blank(form.poNumber),
      currency: blank(form.currency),
      netAmount: toNumberOrNull(form.netAmount),
      taxAmount: toNumberOrNull(form.taxAmount),
      grossAmount: toNumberOrNull(form.grossAmount),
      supplierId: invoice.supplierId ?? null,
      noPurchaseOrder: form.noPurchaseOrder,
    };
    setAction("save");
    try {
      applyInvoice(await updateInvoice(invoice.id, payload), form.noPurchaseOrder);
      toastService.success("Invoice saved.");
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not save the invoice."));
    } finally {
      setAction(null);
    }
  };

  const handleProcess = async () => {
    setAction("process");
    try {
      applyInvoice(await processInvoice(invoice.id));
      await loadExtraction();
      toastService.success("Invoice processed.");
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not process the invoice."));
    } finally {
      setAction(null);
    }
  };

  const handleReprocess = async () => {
    setAction("reprocess");
    try {
      await reprocessInvoice(invoice.id);
      applyInvoice(await getInvoice(invoice.id));
      await loadExtraction();
      toastService.success("Extraction was run again.");
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not re-run the extraction."));
    } finally {
      setAction(null);
    }
  };

  const handleReread = async () => {
    setAction("reread");
    try {
      await advancedRereadInvoice(invoice.id);
      applyInvoice(await getInvoice(invoice.id));
      await loadExtraction();
      toastService.success("The document was read again. Fields corrected by hand were kept.");
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not re-read the document."));
    } finally {
      setAction(null);
    }
  };

  const busy = action !== null;
  const isService = invoice.invoiceType === "SERVICE";
  const canReceive = Boolean(invoice.purchaseOrderId) && !isService && invoice.status !== "GRN_POSTED";

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title={invoice.invoiceNumber || "Invoice"}
        description={`${invoice.supplierName || "Supplier pending"} · captured ${formatDateTime(invoice.createdAt)}`}
        meta={<span className={statusBadgeClass(invoice.status)}>{statusLabel(invoice.status)}</span>}
        onBack={onBack}
        backLabel="Back to invoices"
        actions={(
          <div className="sila-btn-group">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={handleProcess} disabled={busy}>
              {action === "process" ? "Processing..." : "Process"}
            </button>
            <button type="button" className="sila-btn sila-btn--secondary" onClick={handleReprocess} disabled={busy}>
              {action === "reprocess" ? "Running..." : "Re-run extraction"}
            </button>
            <button type="button" className="sila-btn sila-btn--secondary" onClick={handleReread} disabled={busy}>
              {action === "reread" ? "Re-reading..." : "Advanced re-read"}
            </button>
            {canReceive && (
              <button type="button" className="sila-btn sila-btn--primary" onClick={() => onCreateReceipt(invoice)} disabled={busy}>
                Create goods receipt
              </button>
            )}
          </div>
        )}
      />

      <section className="sila-card">
        <div className="sila-card-body">
          <dl className="sila-meta-grid">
            <div className="sila-meta-item"><dt className="sila-meta-label">Invoice type</dt><dd className="sila-meta-value">{statusLabel(invoice.invoiceType)}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Confidence</dt><dd className="sila-meta-value">{formatPercent(invoice.overallConfidence)}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Operating unit</dt><dd className="sila-meta-value">{invoice.operatingUnitName || "—"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Gross amount</dt><dd className="sila-meta-value">{formatMoney(invoice.grossAmount, invoice.currency)}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Purchase order</dt><dd className="sila-meta-value">{invoice.purchaseOrderNumber || "Not matched"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Last updated</dt><dd className="sila-meta-value">{formatDateTime(invoice.updatedAt)}</dd></div>
          </dl>
          {isService && <span className="sila-help">A goods receipt does not apply to a service invoice.</span>}
        </div>
      </section>

      <form className="sila-card" onSubmit={handleSave}>
        <div className="sila-card-header">
          <h2 className="sila-card-title">Invoice fields</h2>
          <span className="ops-muted">Corrections are recorded and kept when the document is read again.</span>
        </div>
        <div className="sila-card-body">
          <div className="sila-form-grid">
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-number">Invoice number<span className="sila-required">*</span></label>
              <input id="invoice-number" className="sila-input" value={form.invoiceNumber} onChange={(event) => setField("invoiceNumber", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-date">Invoice date</label>
              <input id="invoice-date" type="date" className="sila-input" value={form.invoiceDate} onChange={(event) => setField("invoiceDate", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-supplier-name">Supplier name</label>
              <input id="invoice-supplier-name" className="sila-input" value={form.supplierName} onChange={(event) => setField("supplierName", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-supplier-trn">Supplier tax number (TRN)</label>
              <input id="invoice-supplier-trn" className="sila-input" value={form.supplierTaxNumber} onChange={(event) => setField("supplierTaxNumber", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-po-number">Purchase order number</label>
              <input id="invoice-po-number" className="sila-input" value={form.noPurchaseOrder ? "" : form.poNumber} disabled={form.noPurchaseOrder} onChange={(event) => setField("poNumber", event.target.value)} />
              <label className="ops-check">
                <input type="checkbox" checked={form.noPurchaseOrder} onChange={(event) => setField("noPurchaseOrder", event.target.checked)} />
                No purchase order for this invoice
              </label>
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-currency">Currency</label>
              <input id="invoice-currency" className="sila-input" value={form.currency} onChange={(event) => setField("currency", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-net">Net amount</label>
              <input id="invoice-net" type="number" step="any" className="sila-input" value={form.netAmount} onChange={(event) => setField("netAmount", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-tax">Tax amount</label>
              <input id="invoice-tax" type="number" step="any" className="sila-input" value={form.taxAmount} onChange={(event) => setField("taxAmount", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="invoice-gross">Gross amount</label>
              <input id="invoice-gross" type="number" step="any" className="sila-input" value={form.grossAmount} onChange={(event) => setField("grossAmount", event.target.value)} />
            </div>
          </div>
        </div>
        <div className="sila-card-footer">
          <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setForm(toForm(invoice, false))} disabled={busy}>Reset</button>
          <button type="submit" className="sila-btn sila-btn--primary" disabled={busy}>
            {action === "save" ? "Saving..." : "Save invoice"}
          </button>
        </div>
      </form>

      <InvoiceMatching invoice={invoice} onChanged={(row) => applyInvoice(row, form.noPurchaseOrder)} />

      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">Extraction</h2>
          {extraction && <span className={statusBadgeClass(extraction.status)}>{statusLabel(extraction.status)}</span>}
        </div>
        <div className="sila-card-body ops-stack">
          {!extraction ? (
            <span className="sila-help">No extraction result is available for this invoice yet.</span>
          ) : (
            <>
              <dl className="sila-meta-grid">
                <div className="sila-meta-item"><dt className="sila-meta-label">Provider</dt><dd className="sila-meta-value">{extraction.provider}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">Method</dt><dd className="sila-meta-value">{statusLabel(extraction.extractionMethod)}{extraction.fallbackUsed ? " (fallback)" : ""}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">Confidence</dt><dd className="sila-meta-value">{formatPercent(extraction.confidence)}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">Completed</dt><dd className="sila-meta-value">{formatDateTime(extraction.completedAt)}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">Supplier read</dt><dd className="sila-meta-value">{extraction.header.supplierName || "—"}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">TRN read</dt><dd className="sila-meta-value">{extraction.header.supplierTrn || "—"}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">Invoice number read</dt><dd className="sila-meta-value">{extraction.header.supplierInvoiceNumber || "—"}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">Invoice date read</dt><dd className="sila-meta-value">{formatDate(extraction.header.invoiceDate)}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">PO number read</dt><dd className="sila-meta-value">{extraction.header.purchaseOrderNumber || "—"}</dd></div>
                <div className="sila-meta-item"><dt className="sila-meta-label">Net / gross read</dt><dd className="sila-meta-value">{formatMoney(extraction.header.invoiceNet, extraction.header.currency)} / {formatMoney(extraction.header.invoiceGross, extraction.header.currency)}</dd></div>
              </dl>
              {extraction.lines.length > 0 && (
                <div className="sila-table-wrap">
                  <table className="sila-table">
                    <thead>
                      <tr>
                        <th scope="col">Line</th>
                        <th scope="col">Item</th>
                        <th scope="col">Description</th>
                        <th scope="col" className="ops-num">Net</th>
                        <th scope="col" className="ops-num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraction.lines.map((line, index) => (
                        <tr key={`${line.lineItemNumber ?? "line"}-${index}`}>
                          <td>{line.lineItemNumber || index + 1}</td>
                          <td>{line.itemSkuId || "—"}</td>
                          <td>{line.itemDescription || "—"}</td>
                          <td className="ops-num">{formatMoney(line.itemNet, extraction.header.currency)}</td>
                          <td className="ops-num">{formatMoney(line.itemAmount, extraction.header.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <h3 className="sila-card-title">Extraction history</h3>
          {historyError ? (
            <span className="sila-error-text">{historyError}</span>
          ) : history.length === 0 ? (
            <span className="sila-help">No extraction run is recorded for this document.</span>
          ) : (
            <div className="sila-table-wrap">
              <table className="sila-table">
                <thead>
                  <tr>
                    <th scope="col">Run</th>
                    <th scope="col">Trigger</th>
                    <th scope="col">Provider</th>
                    <th scope="col">Method</th>
                    <th scope="col">Confidence</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((run) => (
                    <tr key={run.id}>
                      <td>{formatDateTime(run.processingCompletedAt ?? run.createdAt)}</td>
                      <td>{statusLabel(run.trigger)}</td>
                      <td>{run.provider}</td>
                      <td>{statusLabel(run.extractionMethod)}{run.fallbackUsed ? " (fallback)" : ""}</td>
                      <td>{formatPercent(run.confidence)}</td>
                      <td>{run.processingDurationMs == null ? "—" : `${(run.processingDurationMs / 1000).toFixed(1)} s`}</td>
                      <td><span className={statusBadgeClass(run.status)}>{statusLabel(run.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <InvoiceDocumentPanel documentId={invoice.documentId} />
    </div>
  );
};

export default InvoiceDetail;
