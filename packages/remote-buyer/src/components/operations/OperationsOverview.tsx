import React, { useEffect, useState } from "react";
import { EmptyState, KpiCard, Loader, PageHeader } from "@vosox/shared-ui";
import { getGoodsReceipts, getInvoices, type GoodsReceipt, type Invoice } from "../../api/operationsApi";
import { errorMessage, formatDate, formatMoney, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface OperationsOverviewProps {
  /** Opens another operations section by its nav key (for example "opsInvoices"). */
  onNavigate?: (key: string) => void;
}

const RECENT_COUNT = 5;

/** Receiving home: counts and the latest invoices and goods receipts. */
const OperationsOverview: React.FC<OperationsOverviewProps> = ({ onNavigate }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoiceRows, receiptRows] = await Promise.all([getInvoices(), getGoodsReceipts()]);
      setInvoices(invoiceRows);
      setReceipts(receiptRows);
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the receiving overview."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader size={24} message="Loading receiving overview..." />;
  if (error) {
    return (
      <EmptyState
        variant="error"
        title="Couldn't load the receiving overview"
        description={error}
        action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
      />
    );
  }

  const countInvoices = (status: string): number => invoices.filter((invoice) => invoice.status === status).length;
  const failedInvoices = invoices.filter((invoice) => invoice.status === "FAILED" || invoice.status === "OCR_FAILED").length;
  const postedReceipts = receipts.filter((receipt) => receipt.status === "POSTED").length;
  const attentionReceipts = receipts.filter((receipt) => receipt.status === "FAILED" || receipt.status === "UNKNOWN").length;
  const open = (key: string) => (onNavigate ? () => onNavigate(key) : undefined);

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Receiving overview"
        description="Invoices captured, what is ready to receive, and the latest goods receipts."
        actions={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Refresh</button>}
      />

      <div className="sila-kpi-grid">
        <KpiCard label="Invoices" value={invoices.length} meta="Latest captured documents" onClick={open("opsInvoices")} linkText="Open invoices" />
        <KpiCard label="Needs review" value={countInvoices("REVIEW_REQUIRED")} tone="warning" meta="Extraction or matching to confirm" onClick={open("opsInvoices")} linkText="Review" />
        <KpiCard label="Ready for goods receipt" value={countInvoices("READY_FOR_GRN")} tone="primary" meta="Matched to a purchase order" onClick={open("opsInvoices")} linkText="Receive" />
        <KpiCard label="Failed invoices" value={failedInvoices} tone={failedInvoices > 0 ? "danger" : "neutral"} meta="Could not be read" />
        <KpiCard label="Goods receipts posted" value={postedReceipts} tone="success" meta={`${receipts.length} receipts in total`} onClick={open("opsGoodsReceipts")} linkText="Open goods receipts" />
        <KpiCard label="Receipts needing attention" value={attentionReceipts} tone={attentionReceipts > 0 ? "danger" : "neutral"} meta="ERP posting failed or uncertain" onClick={open("opsGoodsReceipts")} linkText="Retry" />
      </div>

      <div className="ops-columns">
        <section className="sila-card">
          <div className="sila-card-header">
            <h2 className="sila-card-title">Recent invoices</h2>
            {onNavigate && (
              <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={() => onNavigate("opsInvoices")}>View all</button>
            )}
          </div>
          <div className="sila-card-body">
            {invoices.length === 0 ? (
              <EmptyState title="No invoices yet" description="Uploaded documents show up here." />
            ) : (
              <ul className="ops-list">
                {invoices.slice(0, RECENT_COUNT).map((invoice) => (
                  <li key={invoice.id} className="ops-list-row">
                    <div>
                      <div className="sila-cell-strong">{invoice.invoiceNumber || "No invoice number"}</div>
                      <div className="sila-help">
                        {invoice.supplierName || "Supplier pending"} · {formatDate(invoice.invoiceDate ?? invoice.createdAt)} · {formatMoney(invoice.grossAmount, invoice.currency)}
                      </div>
                    </div>
                    <span className={statusBadgeClass(invoice.status)}>{statusLabel(invoice.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="sila-card">
          <div className="sila-card-header">
            <h2 className="sila-card-title">Recent goods receipts</h2>
            {onNavigate && (
              <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={() => onNavigate("opsGoodsReceipts")}>View all</button>
            )}
          </div>
          <div className="sila-card-body">
            {receipts.length === 0 ? (
              <EmptyState title="No goods receipts yet" description="Posted receipts show up here." />
            ) : (
              <ul className="ops-list">
                {receipts.slice(0, RECENT_COUNT).map((receipt) => (
                  <li key={receipt.id} className="ops-list-row">
                    <div>
                      <div className="sila-cell-strong">{receipt.grnNumber}</div>
                      <div className="sila-help">
                        {receipt.supplierName} · PO {receipt.purchaseOrderNumber} · {formatDate(receipt.receiptDate)}
                      </div>
                    </div>
                    <span className={statusBadgeClass(receipt.erpPostingStatus ?? receipt.status)}>
                      {statusLabel(receipt.erpPostingStatus ?? receipt.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default OperationsOverview;
